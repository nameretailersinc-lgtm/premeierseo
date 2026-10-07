"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useTool } from "../ui/ToolContext";
import { Alert, Button, Checkbox, CopyButton, DownloadButton, Field, Panel, Segmented, StatTile, formatBytes, useDebounced, usePersistentOptions, useSessionText } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { parseJson, pathSeg, searchJson, stats, stringifyNode, type JNode, type JsonError } from "../lib/dev/json";
import { parseCsv, readRecords, rowsToJson, toCsv, type ArrayMode } from "../lib/dev/csv";
import { discoverFeeds, parseFeed, type Feed } from "../lib/dev/feed";

/*
 * Data tools. config.mode: "viewer" (JSON viewer), "json-to-csv", "csv-to-json", "rss".
 */

const AUTO_LIMIT = 1_000_000; // characters processed as you type; larger inputs use the button

function readFileText(f: File): Promise<string> {
  return f.text();
}

function OpenFile({ accept, onText, label = "Open file" }: { accept: string; onText: (t: string, name: string) => void; label?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const { used } = useTool();
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) {
            used("file_picker");
            onText(await readFileText(f), f.name);
          }
          e.target.value = "";
        }}
      />
      <Button variant="ghost" icon="upload" onClick={() => ref.current?.click()}>
        {label}
      </Button>
    </>
  );
}

function ErrorBox({ e, onGo }: { e: JsonError; onGo?: () => void }) {
  const caretPad = " ".repeat(Math.max(0, Math.min(e.col - 1, 200)));
  const shown = e.lineText.length > 220 ? e.lineText.slice(Math.max(0, e.col - 100), e.col + 100) : e.lineText;
  const pad = e.lineText.length > 220 ? " ".repeat(Math.min(100, e.col - 1)) : caretPad;
  return (
    <div role="alert" className="grid gap-2">
      <Alert tone="danger" title={`Invalid JSON at line ${e.line}, column ${e.col}`}>
        <p>
          {e.message}
          {e.hint ? ` ${e.hint}` : ""}
        </p>
      </Alert>
      <pre className="overflow-x-auto rounded-md border border-line bg-surface-2 p-2 text-sm">
        <span className="text-ink-3">{String(e.line).padStart(4)} | </span>
        {shown}
        {"\n"}
        <span className="text-ink-3">{"     | "}</span>
        {pad}
        <span className="font-bold text-danger">^ here</span>
      </pre>
      {onGo && (
        <div>
          <Button variant="secondary" onClick={onGo}>
            Go to error
          </Button>
        </div>
      )}
    </div>
  );
}

/* ---------------- Tree ---------------- */

function preview(n: JNode): string {
  if (n.t === "obj") return `{${n.e.length} ${n.e.length === 1 ? "key" : "keys"}}`;
  if (n.t === "arr") return `[${n.v.length} ${n.v.length === 1 ? "item" : "items"}]`;
  return n.raw.length > 120 ? n.raw.slice(0, 117) + "…" : n.raw;
}

const TYPE: Record<JNode["t"], string> = { obj: "object", arr: "array", str: "string", num: "number", lit: "" };

function TreeNode({ k, node, path, depth, openDepth }: { k: ReactNode; node: JNode; path: string; depth: number; openDepth: number }) {
  const [open, setOpen] = useState(depth < openDepth);
  const [limit, setLimit] = useState(200);
  const leaf = node.t !== "obj" && node.t !== "arr";
  if (leaf)
    return (
      <li className="py-0.5 pl-5" title={path}>
        <span className="font-semibold text-ink-2">{k}</span>
        <span className="text-ink-3">: </span>
        <span className={`font-mono break-all ${node.t === "str" ? "text-success" : node.t === "num" ? "text-accent" : "text-warning"}`}>{preview(node)}</span>
        <span className="sr-only"> ({node.t === "lit" ? node.raw : TYPE[node.t]})</span>
      </li>
    );
  const entries: [ReactNode, JNode, string][] =
    node.t === "obj" ? node.e.map(([key, v]) => [key, v, path + pathSeg(key)]) : node.v.map((v, i) => [i, v, path + pathSeg(i)]);
  return (
    <li className="py-0.5">
      <details open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
        <summary className="cursor-pointer rounded-sm hover:bg-surface-2" title={path}>
          <span className="font-semibold text-ink-2">{k}</span> <span className="text-ink-3">{preview(node)}</span>
        </summary>
        {open && (
          <ul className="ml-2 border-l border-line pl-2">
            {entries.slice(0, limit).map(([key, v, p]) => (
              <TreeNode key={p} k={key} node={v} path={p} depth={depth + 1} openDepth={openDepth} />
            ))}
            {entries.length > limit && (
              <li className="py-1 pl-5">
                <Button variant="ghost" onClick={() => setLimit(limit + 500)}>
                  Show {Math.min(500, entries.length - limit)} more of {entries.length - limit}
                </Button>
              </li>
            )}
          </ul>
        )}
      </details>
    </li>
  );
}

/* ---------------- JSON viewer ---------------- */

const JSON_SAMPLE = `{"name":"Ada Lovelace","born":1815,"languages":["English","French"],"id":12345678901234567890,"address":{"city":"London","postcode":null},"active":true}`;

function JsonViewer({ toolId }: { toolId: string }) {
  const id = useId();
  const { used, announce, completed, error: track } = useTool();
  const [text, setText] = useSessionText(toolId);
  const [o, setO] = usePersistentOptions(toolId, { indent: "2", sort: "none", view: "format" });
  const [manual, setManual] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [treeKey, setTreeKey] = useState(0);
  const [openDepth, setOpenDepth] = useState(2);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const big = text.length > AUTO_LIMIT;
  const debounced = useDebounced(text, text.length > 200_000 ? 500 : 200);
  const source = big ? manual : debounced;

  const parsed = useMemo(() => (source && source.trim() ? parseJson(source) : null), [source]);
  const out = useMemo(() => {
    if (!parsed?.ok) return "";
    const indent = o.view === "minify" ? "" : o.indent === "tab" ? "\t" : " ".repeat(Number(o.indent));
    return stringifyNode(parsed.node, { indent, sortKeys: o.sort as "none" });
  }, [parsed, o.indent, o.sort, o.view]);
  const st = useMemo(() => (parsed?.ok ? stats(parsed.node) : null), [parsed]);
  const hits = useMemo(() => (parsed?.ok && q.trim() ? searchJson(parsed.node, q.trim()) : null), [parsed, q]);

  useEffect(() => {
    if (!parsed) return;
    if (parsed.ok) {
      announce("Valid JSON");
      completed("view");
    } else {
      announce(`Invalid JSON at line ${parsed.error.line}`);
      track("INVALID_JSON", "process");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed]);

  const sortedNode = useMemo(() => {
    if (!parsed?.ok) return null;
    if (o.sort === "none") return parsed.node;
    const re = parseJson(stringifyNode(parsed.node, { indent: "", sortKeys: o.sort as "asc" }));
    return re.ok ? re.node : parsed.node;
  }, [parsed, o.sort]);

  const goTo = () => {
    if (!parsed || parsed.ok || !taRef.current) return;
    taRef.current.focus();
    taRef.current.setSelectionRange(parsed.error.pos, parsed.error.pos + 1);
  };

  return (
    <div className="grid gap-4">
      <div className="panel p-3 sm:p-4">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <Segmented
            legend="View"
            value={o.view}
            onChange={(v) => setO({ ...o, view: v })}
            options={[
              { value: "format", label: "Formatted" },
              { value: "tree", label: "Tree" },
              { value: "minify", label: "Minified" },
            ]}
          />
          <Field label="Indent" htmlFor={`${id}-ind`} className="w-36">
            <select id={`${id}-ind`} className="select" value={o.indent} onChange={(e) => setO({ ...o, indent: e.target.value })}>
              <option value="2">2 spaces</option>
              <option value="4">4 spaces</option>
              <option value="tab">Tabs</option>
            </select>
          </Field>
          <Field label="Sort keys" htmlFor={`${id}-sort`} className="w-40">
            <select id={`${id}-sort`} className="select" value={o.sort} onChange={(e) => setO({ ...o, sort: e.target.value })}>
              <option value="none">Original order</option>
              <option value="asc">A → Z</option>
              <option value="desc">Z → A</option>
            </select>
          </Field>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          as="div"
          title={<label htmlFor={`${id}-in`}>JSON</label>}
          actions={
            <>
              <Button
                variant="ghost"
                icon="sparkles"
                onClick={() => {
                  setText(JSON_SAMPLE);
                  setManual(JSON_SAMPLE);
                  used("example");
                }}
              >
                Example
              </Button>
              <OpenFile
                accept=".json,.geojson,.jsonld,application/json,text/plain"
                onText={(t) => {
                  setText(t);
                  setManual(t);
                  announce("File loaded");
                }}
              />
              <Button variant="ghost" icon="trash" disabled={!text} onClick={() => setText("")}>
                Clear
              </Button>
            </>
          }
          footer={<span>{formatBytes(text.length)} · {text ? text.split("\n").length.toLocaleString() : 0} lines</span>}
        >
          <textarea
            id={`${id}-in`}
            ref={taRef}
            className="textarea mono rounded-none border-0"
            style={{ ["--ta-min" as string]: "14rem", ["--ta-min-lg" as string]: "26rem" }}
            wrap="off"
            spellCheck={false}
            placeholder={'Paste JSON, e.g. {"name": "Ada", "born": 1815}'}
            value={text}
            aria-invalid={parsed && !parsed.ok ? true : undefined}
            onChange={(e) => {
              setText(e.target.value);
              used("type");
            }}
            onPaste={() => used("paste")}
          />
          {big && (
            <div className="border-t border-line p-3 sm:p-4">
              <Button variant="primary" size="md" icon="play" onClick={() => setManual(text)}>
                Format and validate
              </Button>
              <span className="ml-3 text-sm text-ink-3">Large input: processing starts when you press the button.</span>
            </div>
          )}
        </Panel>

        <Panel
          tone="accent"
          title={<span id={`${id}-outl`}>{o.view === "tree" ? "Tree" : o.view === "minify" ? "Minified JSON" : "Formatted JSON"}</span>}
          actions={
            <>
              <CopyButton text={out} disabled={!out} variant="primary" />
              <DownloadButton data={() => out} filename={o.view === "minify" ? "data.min.json" : "data.json"} mime="application/json" disabled={!out} />
            </>
          }
          footer={
            st ? (
              <>
                <span className="font-semibold text-success">Valid JSON</span>
                <span>
                  {st.objects.toLocaleString()} objects · {st.arrays.toLocaleString()} arrays · {st.values.toLocaleString()} values · depth {st.depth}
                </span>
                {out && <span>{formatBytes(new TextEncoder().encode(out).length)}</span>}
              </>
            ) : undefined
          }
        >
          {parsed && !parsed.ok ? (
            <div className="p-3 sm:p-4">
              <ErrorBox e={parsed.error} onGo={goTo} />
            </div>
          ) : o.view === "tree" ? (
            <div className="grid gap-2 p-3 sm:p-4">
              {sortedNode ? (
                <>
                  <div className="flex flex-wrap items-end gap-2">
                    <Field label="Search keys and values" htmlFor={`${id}-q`} className="w-full sm:w-64">
                      <input id={`${id}-q`} className="input" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
                    </Field>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setOpenDepth(99);
                        setTreeKey(treeKey + 1);
                      }}
                    >
                      Expand all
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setOpenDepth(1);
                        setTreeKey(treeKey + 1);
                      }}
                    >
                      Collapse all
                    </Button>
                  </div>
                  {hits && (
                    <div className="max-h-48 overflow-auto rounded-md border border-line p-2 text-sm">
                      <p className="font-semibold">
                        {hits.total.toLocaleString()} match{hits.total === 1 ? "" : "es"}
                        {hits.total > hits.hits.length ? ` (first ${hits.hits.length} shown)` : ""}
                      </p>
                      <ul>
                        {hits.hits.map((h) => (
                          <li key={h.path} className="font-mono break-all">
                            {h.path} <span className="text-ink-3">= {h.preview}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <ul key={treeKey} className="max-h-[32rem] overflow-auto font-mono text-sm" aria-label="JSON tree">
                    <TreeNode k="$" node={sortedNode} path="$" depth={0} openDepth={openDepth} />
                  </ul>
                </>
              ) : (
                <p className="min-h-48 text-sm text-ink-3">The tree appears here.</p>
              )}
            </div>
          ) : (
            <textarea
              aria-labelledby={`${id}-outl`}
              readOnly
              wrap="off"
              className="textarea mono rounded-none border-0"
              style={{ ["--ta-min" as string]: "14rem", ["--ta-min-lg" as string]: "26rem" }}
              value={out.length > 3_000_000 ? out.slice(0, 3_000_000) + "\n… (truncated in this view; Copy and Download include everything)" : out}
              placeholder="Formatted JSON appears here."
            />
          )}
        </Panel>
      </div>
      {parsed?.ok && parsed.duplicates.length > 0 && (
        <Alert tone="warning" title="Duplicate keys">
          The same key appears twice in one object: {parsed.duplicates.slice(0, 5).map((d) => `“${d}”`).join(", ")}. Most parsers keep only the last value, so the earlier one is lost.
        </Alert>
      )}
    </div>
  );
}

/* ---------------- Table preview ---------------- */

function TablePreview({ columns, rows, total }: { columns: string[]; rows: (string | number | boolean | null | undefined)[][]; total: number }) {
  if (!columns.length) return null;
  return (
    <Panel title={<span>Table preview</span>}>
      <div className="max-h-[24rem] overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-surface">
            <tr>
              {columns.map((c, i) => (
                <th key={i} scope="col" className="border-b border-line px-2 py-1.5 text-left font-semibold whitespace-nowrap">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {columns.map((_, j) => (
                  <td key={j} className="max-w-64 truncate border-b border-line px-2 py-1" title={r[j] === null || r[j] === undefined ? "" : String(r[j])}>
                    {r[j] === null ? <span className="text-ink-3">null</span> : r[j] === undefined ? "" : String(r[j])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-line px-3 py-2 text-sm text-ink-3">
        {total > rows.length ? `First ${rows.length} of ${total.toLocaleString()} rows` : `${total.toLocaleString()} row${total === 1 ? "" : "s"}`} · {columns.length} column
        {columns.length === 1 ? "" : "s"}
      </p>
    </Panel>
  );
}

/* ---------------- JSON → CSV ---------------- */

const DELIMS = [
  { value: ",", label: "Comma (,)" },
  { value: ";", label: "Semicolon (;)" },
  { value: "\t", label: "Tab" },
  { value: "|", label: "Pipe (|)" },
];

const JSON_CSV_SAMPLE = `[
  {"id": 1, "name": "Ada", "address": {"city": "London", "zip": "N1"}, "tags": ["math", "code"], "active": true},
  {"id": 2, "name": "Grace", "address": {"city": "New York"}, "tags": [], "active": false, "note": "Said \\"hello\\", then left"}
]`;

function JsonToCsv({ toolId }: { toolId: string }) {
  const id = useId();
  const { used } = useTool();
  const [text, setText] = useSessionText(toolId);
  const [o, setO] = usePersistentOptions(toolId, { delimiter: ",", arrays: "join", header: true, bom: true, safe: false });
  const d = useDebounced(text, text.length > 200_000 ? 500 : 200);
  const res = useMemo(() => {
    if (!d.trim()) return null;
    const r = readRecords(d);
    if (r.error) return { error: r.error };
    const c = toCsv(r.records!, { delimiter: o.delimiter, arrays: o.arrays as ArrayMode, header: o.header, safeFormulas: o.safe });
    return { ...c, shape: r.shape, count: r.records!.length };
  }, [d, o]);

  return (
    <div className="grid gap-4">
      <div className="panel p-3 sm:p-4">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <Field label="Delimiter" htmlFor={`${id}-d`} className="w-40">
            <select id={`${id}-d`} className="select" value={o.delimiter} onChange={(e) => setO({ ...o, delimiter: e.target.value })}>
              {DELIMS.map((x) => (
                <option key={x.label} value={x.value}>
                  {x.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Arrays inside records" htmlFor={`${id}-a`} className="w-60">
            <select id={`${id}-a`} className="select" value={o.arrays} onChange={(e) => setO({ ...o, arrays: e.target.value })}>
              <option value="join">Join values with “; ”</option>
              <option value="index">One column per item (tags.0)</option>
              <option value="json">Keep as JSON text</option>
            </select>
          </Field>
          <Checkbox checked={o.header} onChange={(v) => setO({ ...o, header: v })} label="Header row" />
          <Checkbox checked={o.bom} onChange={(v) => setO({ ...o, bom: v })} label="Excel-friendly download" help="Adds a UTF-8 byte order mark" />
          <Checkbox checked={o.safe} onChange={(v) => setO({ ...o, safe: v })} label="Neutralize formulas" help="Prefix cells starting with = + - @" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          as="div"
          title={<label htmlFor={`${id}-in`}>JSON</label>}
          actions={
            <>
              <Button
                variant="ghost"
                icon="sparkles"
                onClick={() => {
                  setText(JSON_CSV_SAMPLE);
                  used("example");
                }}
              >
                Example
              </Button>
              <OpenFile accept=".json,.jsonl,.ndjson,application/json,text/plain" onText={(t) => setText(t)} />
              <Button variant="ghost" icon="trash" disabled={!text} onClick={() => setText("")}>
                Clear
              </Button>
            </>
          }
          footer={<span>{formatBytes(text.length)}</span>}
        >
          <textarea
            id={`${id}-in`}
            className="textarea mono rounded-none border-0"
            style={{ ["--ta-min" as string]: "14rem", ["--ta-min-lg" as string]: "20rem" }}
            wrap="off"
            spellCheck={false}
            placeholder={'[{"name": "Ada", "city": "London"}, …] or one JSON object per line'}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              used("type");
            }}
          />
        </Panel>
        <Panel
          title={<span id={`${id}-outl`}>CSV</span>}
          actions={
            <>
              <CopyButton text={res && "csv" in res ? (res.csv ?? "") : ""} disabled={!res || !("csv" in res)} variant="primary" />
              <DownloadButton
                data={() => new Blob([(o.bom ? "﻿" : "") + (res && "csv" in res ? res.csv : "")], { type: "text/csv;charset=utf-8" })}
                filename={o.delimiter === "\t" ? "data.tsv" : "data.csv"}
                disabled={!res || !("csv" in res)}
              />
            </>
          }
          footer={
            res && "csv" in res ? (
              <span>
                {res.count.toLocaleString()} records → {res.columns.length} columns
                {res.shape === "jsonl" ? " · read as JSON Lines" : res.shape?.startsWith("object.") ? ` · used the “${res.shape.slice(7)}” array` : ""}
              </span>
            ) : undefined
          }
        >
          {res && "error" in res && res.error ? (
            <div className="p-3 sm:p-4">
              <ErrorBox e={res.error} />
            </div>
          ) : (
            <textarea
              aria-labelledby={`${id}-outl`}
              readOnly
              wrap="off"
              className="textarea mono rounded-none border-0"
              style={{ ["--ta-min" as string]: "14rem", ["--ta-min-lg" as string]: "20rem" }}
              value={res && "csv" in res ? (res.csv ?? "") : ""}
              placeholder="CSV appears here."
            />
          )}
        </Panel>
      </div>
      {res && "csv" in res && res.rows && (
        <TablePreview columns={res.columns} rows={res.rows.slice(0, 50).map((r) => res.columns.map((c) => r[c]))} total={res.rows.length} />
      )}
    </div>
  );
}

/* ---------------- CSV → JSON ---------------- */

const CSV_SAMPLE = `id;name;address.city;active;score;zip
1;Ada;London;true;98.5;01234
2;"Grace; Admiral";New York;false;;10001`;

function CsvToJson({ toolId }: { toolId: string }) {
  const id = useId();
  const { used, error: track } = useTool();
  const [text, setText] = useSessionText(toolId);
  const [o, setO] = usePersistentOptions(toolId, { delimiter: "", header: true, types: true, empty: "string", nest: false, shape: "objects", indent: "2" });
  const d = useDebounced(text, text.length > 200_000 ? 500 : 200);
  const [result, setRes] = useState<{ json: string; count: number; columns: string[]; textColumns: string[]; rows: string[][]; delimiter: string; errors: string[] } | null>(null);
  const [error, setErr] = useState<string | null>(null);
  const res = d.trim() ? result : null;
  const err = d.trim() ? error : null;

  useEffect(() => {
    let alive = true;
    if (!d.trim()) return;
    parseCsv(d, o.delimiter)
      .then((p) => {
        if (!alive) return;
        const j = rowsToJson(p.rows, {
          delimiter: o.delimiter,
          header: o.header,
          types: o.types,
          empty: o.empty as "string",
          nest: o.nest,
          shape: o.shape as "objects",
          indent: o.indent === "0" ? "" : o.indent === "tab" ? "\t" : " ".repeat(Number(o.indent)),
        });
        setRes({ ...j, rows: p.rows, delimiter: p.delimiter, errors: p.errors });
        setErr(null);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : "The CSV couldn't be read.");
        track("PARSE_FAILED", "process");
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, o]);

  const delimName = (x: string) => DELIMS.find((y) => y.value === x)?.label ?? JSON.stringify(x);

  return (
    <div className="grid gap-4">
      <div className="panel p-3 sm:p-4">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <Field label="Delimiter" htmlFor={`${id}-d`} className="w-40">
            <select id={`${id}-d`} className="select" value={o.delimiter} onChange={(e) => setO({ ...o, delimiter: e.target.value })}>
              <option value="">Detect</option>
              {DELIMS.map((x) => (
                <option key={x.label} value={x.value}>
                  {x.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Output" htmlFor={`${id}-s`} className="w-56">
            <select id={`${id}-s`} className="select" value={o.shape} onChange={(e) => setO({ ...o, shape: e.target.value })}>
              <option value="objects">Array of objects</option>
              <option value="arrays">Array of arrays</option>
              <option value="jsonl">JSON Lines (one per line)</option>
            </select>
          </Field>
          <Field label="Empty cells" htmlFor={`${id}-e`} className="w-44">
            <select id={`${id}-e`} className="select" value={o.empty} onChange={(e) => setO({ ...o, empty: e.target.value })}>
              <option value="string">Empty string (&quot;&quot;)</option>
              <option value="null">null</option>
              <option value="omit">Leave the key out</option>
            </select>
          </Field>
          <Field label="Indent" htmlFor={`${id}-i`} className="w-36">
            <select id={`${id}-i`} className="select" value={o.indent} onChange={(e) => setO({ ...o, indent: e.target.value })}>
              <option value="2">2 spaces</option>
              <option value="4">4 spaces</option>
              <option value="tab">Tabs</option>
              <option value="0">Minified</option>
            </select>
          </Field>
          <Checkbox checked={o.header} onChange={(v) => setO({ ...o, header: v })} label="First row is headers" />
          <Checkbox checked={o.types} onChange={(v) => setO({ ...o, types: v })} label="Detect numbers and true/false" help="Leading zeros stay text" />
          <Checkbox checked={o.nest} onChange={(v) => setO({ ...o, nest: v })} label="Nest dot.path headers" help="address.city → {address:{city}}" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          as="div"
          title={<label htmlFor={`${id}-in`}>CSV</label>}
          actions={
            <>
              <Button
                variant="ghost"
                icon="sparkles"
                onClick={() => {
                  setText(CSV_SAMPLE);
                  used("example");
                }}
              >
                Example
              </Button>
              <OpenFile accept=".csv,.tsv,.txt,text/csv,text/plain" onText={(t) => setText(t)} />
              <Button variant="ghost" icon="trash" disabled={!text} onClick={() => setText("")}>
                Clear
              </Button>
            </>
          }
          footer={res ? <span>Delimiter: {delimName(res.delimiter)}{!o.delimiter ? " (detected)" : ""}</span> : undefined}
        >
          <textarea
            id={`${id}-in`}
            className="textarea mono rounded-none border-0"
            style={{ ["--ta-min" as string]: "14rem", ["--ta-min-lg" as string]: "20rem" }}
            wrap="off"
            spellCheck={false}
            placeholder={"name,city\nAda,London"}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              used("type");
            }}
          />
        </Panel>
        <Panel
          title={<span id={`${id}-outl`}>JSON</span>}
          actions={
            <>
              <CopyButton text={res?.json ?? ""} disabled={!res?.json} variant="primary" />
              <DownloadButton data={() => res?.json ?? ""} filename={o.shape === "jsonl" ? "data.jsonl" : "data.json"} mime="application/json" disabled={!res?.json} />
            </>
          }
          footer={
            res ? (
              <>
                <span>
                  {res.count.toLocaleString()} rows → {o.shape === "arrays" ? "arrays" : "objects"}
                </span>
                {res.textColumns.length > 0 && <span>Kept as text (leading zeros): {res.textColumns.slice(0, 5).join(", ")}</span>}
              </>
            ) : undefined
          }
        >
          {err ? (
            <div className="p-3 sm:p-4" role="alert">
              <Alert tone="danger">{err}</Alert>
            </div>
          ) : (
            <textarea
              aria-labelledby={`${id}-outl`}
              readOnly
              wrap="off"
              className="textarea mono rounded-none border-0"
              style={{ ["--ta-min" as string]: "14rem", ["--ta-min-lg" as string]: "20rem" }}
              value={res?.json ?? ""}
              placeholder="JSON appears here."
            />
          )}
        </Panel>
      </div>
      {res && res.errors.length > 0 && (
        <Alert tone="warning" title="Rows that may be malformed">
          {res.errors.map((e) => (
            <p key={e}>{e}</p>
          ))}
        </Alert>
      )}
      {res && res.rows.length > 0 && (
        <TablePreview
          columns={o.header ? res.columns : res.columns}
          rows={(o.header ? res.rows.slice(1) : res.rows).slice(0, 50)}
          total={o.header ? res.rows.length - 1 : res.rows.length}
        />
      )}
    </div>
  );
}

/* ---------------- RSS feed parser ---------------- */

interface Fetched {
  finalUrl: string;
  status: number;
  contentType: string;
  truncated: boolean;
  checkedAt: string;
}

function itemsToCsv(feed: Feed): string {
  const rows = feed.items.map((i) => ({
    title: i.title,
    link: i.link,
    date: i.date ?? i.dateRaw,
    author: i.author,
    categories: i.categories.join("; "),
    summary: i.summary,
    guid: i.guid,
    enclosure: i.enclosure?.url ?? "",
    image: i.image,
  }));
  return toCsv(rows, { delimiter: ",", header: true, arrays: "join" }).csv;
}

function RssParser({ toolId }: { toolId: string }) {
  const id = useId();
  const { used, announce, completed, error: track } = useTool();
  const [mode, setMode] = useState<"url" | "xml">("url");
  const [url, setUrl] = useState("");
  const [xml, setXml] = useSessionText(toolId);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fetched, setFetched] = useState<Fetched | null>(null);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [found, setFound] = useState<{ href: string; title: string }[]>([]);
  const [o, setO] = usePersistentOptions(toolId, { sort: "feed", max: "25" });

  const parse = (text: string, base?: string) => {
    const r = parseFeed(text, new DOMParser());
    if (r.error) {
      const disc = base && /<html|<!doctype html/i.test(text.slice(0, 2000)) ? discoverFeeds(text, base) : [];
      setFound(disc);
      setErr(
        r.error +
          (disc.length
            ? " The page links to the feed(s) below."
            : base && /HTML page/.test(r.error)
              ? " Look for an RSS link on the site, or try adding /feed/ or /rss.xml to the address."
              : ""),
      );
      setFeed(null);
      track("PARSE_FAILED", "process");
      return;
    }
    setErr(null);
    setFound([]);
    setFeed(r.feed!);
    announce(`${r.feed!.items.length} items found`);
    completed("view");
  };

  const load = async (target: string) => {
    if (!target.trim()) return;
    setBusy(true);
    setErr(null);
    setFeed(null);
    setFound([]);
    used("url");
    try {
      const r = await fetch("/api/fetch-text", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: target.trim(), kind: "feed" }) });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j || j.error) {
        setErr(j?.error?.message ?? (r.status >= 500 ? "Our server couldn't fetch the feed right now. Please try again in a minute." : "The feed couldn't be loaded."));
        setFetched(null);
        track(j?.error?.code ?? `HTTP_${r.status}`, "fetch");
        return;
      }
      setFetched({ finalUrl: j.finalUrl, status: j.status, contentType: j.contentType, truncated: j.truncated, checkedAt: j.checkedAt });
      if (j.status >= 400) {
        setErr(`The server answered ${j.status} for this address, so there is no feed to read.`);
        return;
      }
      parse(j.text, j.finalUrl);
    } catch {
      setErr("The request failed. Check your connection and try again.");
      track("NETWORK", "fetch");
    } finally {
      setBusy(false);
    }
  };

  const items = useMemo(() => {
    if (!feed) return [];
    let list = [...feed.items];
    if (o.sort === "new") list.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
    if (o.sort === "old") list.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
    if (o.sort === "title") list.sort((a, b) => a.title.localeCompare(b.title));
    if (o.max !== "all") list = list.slice(0, Number(o.max));
    return list;
  }, [feed, o]);

  return (
    <div className="grid gap-4">
      <Segmented
        legend="Source"
        value={mode}
        onChange={setMode}
        options={[
          { value: "url", label: "Feed URL" },
          { value: "xml", label: "Paste XML" },
        ]}
      />
      {mode === "url" ? (
        <form
          className="panel grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void load(url);
          }}
        >
          <Field label="Feed or website address" htmlFor={`${id}-u`} help="We fetch it from our server; your browser doesn't contact the site.">
            <input id={`${id}-u`} type="url" inputMode="url" className="input" placeholder="https://example.com/feed/" value={url} onChange={(e) => setUrl(e.target.value)} autoComplete="url" />
          </Field>
          <Button type="submit" variant="primary" size="md" icon="play" busy={busy} disabled={!url.trim() || busy} className="min-w-36 sm:mb-6">
            {busy ? "Loading…" : "Load feed"}
          </Button>
        </form>
      ) : (
        <Panel
          as="div"
          title={<label htmlFor={`${id}-x`}>RSS or Atom XML</label>}
          actions={
            <>
              <OpenFile accept=".xml,.rss,.atom,application/xml,text/xml" onText={(t) => setXml(t)} />
              <Button variant="primary" icon="play" disabled={!xml.trim()} onClick={() => {
                setFetched(null);
                parse(xml);
              }}>
                Parse feed
              </Button>
            </>
          }
        >
          <textarea
            id={`${id}-x`}
            className="textarea mono rounded-none border-0"
            wrap="off"
            spellCheck={false}
            style={{ ["--ta-min" as string]: "12rem" }}
            placeholder={'<?xml version="1.0"?>\n<rss version="2.0">…'}
            value={xml}
            onChange={(e) => {
              setXml(e.target.value);
              used("paste");
            }}
          />
        </Panel>
      )}

      {fetched && (
        <p className="text-sm text-ink-3">
          Checked {new Date(fetched.checkedAt).toLocaleString()} from our server · HTTP {fetched.status} · {fetched.contentType || "no content type"} ·{" "}
          <span className="break-all">{fetched.finalUrl}</span>
          {fetched.truncated ? " · the feed was larger than 3 MB and was cut off" : ""}
        </p>
      )}
      {err && (
        <div role="alert" className="grid gap-2">
          <Alert tone="danger">{err}</Alert>
          {found.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {found.map((f) => (
                <Button
                  key={f.href}
                  variant="secondary"
                  onClick={() => {
                    setUrl(f.href);
                    void load(f.href);
                  }}
                >
                  Load {f.title || f.href}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {feed && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile label="Items" value={feed.items.length.toLocaleString()} />
            <StatTile label="Format" value={feed.format} />
            <StatTile label="Newest item" value={feed.items.reduce((m, i) => (i.date && i.date > m ? i.date : m), "").slice(0, 10) || "—"} />
          </div>
          <Panel
            title={<span>{feed.title || "Untitled feed"}</span>}
            actions={
              <>
                <CopyButton text={() => JSON.stringify(feed, null, 2)} label="Copy JSON" />
                <DownloadButton data={() => JSON.stringify(feed, null, 2)} filename="feed.json" mime="application/json" label="JSON" />
                <DownloadButton data={() => new Blob(["﻿" + itemsToCsv(feed)], { type: "text/csv;charset=utf-8" })} filename="feed.csv" label="CSV" />
              </>
            }
          >
            <div className="grid gap-3 border-b border-line p-3 sm:p-4">
              {feed.description && <p className="text-sm text-ink-2">{feed.description}</p>}
              <p className="text-sm text-ink-3">
                {[feed.link, feed.language && `Language: ${feed.language}`, feed.updated && `Updated: ${feed.updated}`, feed.generator && `Generator: ${feed.generator}`].filter(Boolean).join(" · ")}
              </p>
              <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
                <Field label="Sort" htmlFor={`${id}-so`} className="w-44">
                  <select id={`${id}-so`} className="select" value={o.sort} onChange={(e) => setO({ ...o, sort: e.target.value })}>
                    <option value="feed">Feed order</option>
                    <option value="new">Newest first</option>
                    <option value="old">Oldest first</option>
                    <option value="title">Title A–Z</option>
                  </select>
                </Field>
                <Field label="Show" htmlFor={`${id}-mx`} className="w-36">
                  <select id={`${id}-mx`} className="select" value={o.max} onChange={(e) => setO({ ...o, max: e.target.value })}>
                    <option value="10">10 items</option>
                    <option value="25">25 items</option>
                    <option value="50">50 items</option>
                    <option value="all">All items</option>
                  </select>
                </Field>
              </div>
            </div>
            {items.length ? (
              <ol className="divide-y divide-line">
                {items.map((it, i) => (
                  <li key={it.guid || it.link || i} className="grid gap-1 p-3 sm:p-4">
                    <p className="font-semibold">
                      {it.link && /^https?:/i.test(it.link) ? (
                        <a href={it.link} target="_blank" rel="noopener nofollow noreferrer" className="text-accent underline">
                          {it.title || "(no title)"}
                        </a>
                      ) : (
                        it.title || "(no title)"
                      )}
                    </p>
                    <p className="text-sm text-ink-3">
                      {[it.date ? new Date(it.date).toLocaleString() : it.dateRaw, it.author, it.categories.join(", ")].filter(Boolean).join(" · ")}
                    </p>
                    {it.summary && <p className="text-sm text-ink-2">{it.summary}</p>}
                    {it.enclosure?.url && (
                      <p className="text-sm break-all">
                        Attachment: {it.enclosure.type || "file"}
                        {it.enclosure.length && Number(it.enclosure.length) > 0 ? `, ${formatBytes(Number(it.enclosure.length))}` : ""} · <span className="font-mono">{it.enclosure.url}</span>
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="p-3 text-sm text-ink-3 sm:p-4">The feed is valid but has no items.</p>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

export default function JsonViewerWidget({ toolId, config }: WidgetProps) {
  const mode = String(config?.mode ?? "viewer");
  if (mode === "json-to-csv") return <JsonToCsv toolId={toolId} />;
  if (mode === "csv-to-json") return <CsvToJson toolId={toolId} />;
  if (mode === "rss") return <RssParser toolId={toolId} />;
  return <JsonViewer toolId={toolId} />;
}
