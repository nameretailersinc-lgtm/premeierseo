"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { Alert, Button, CopyButton, DownloadButton, Field, Panel, StatTile, useDebounced, useSessionText } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { postJson, type InspectResult } from "../lib/seo/api";
import { SCHEMA_EXAMPLES, SCHEMA_TYPES, buildSchema, missingRequired, toScript, type FieldSpec, type RepeatValues, type SchemaType, type Values } from "../lib/seo/schema-gen";
import { countFindings, extractBlocks, validateJsonLd, type BlockReport, type Finding } from "../lib/seo/schema-validate";
import { ApiErrorAlert, CheckedAt, ModeTabs, StatusCode, StatusIcon, UrlForm, useRunner } from "../lib/seo/ui";

/* config.mode: "generate" (schema markup generator) | "validate" (schema markup validator) */

const VALIDATOR_KEY = "pss:input:schema-markup-validator";

/* ---------- Generator ---------- */
function FieldInput({ f, id, value, onChange }: { f: FieldSpec; id: string; value: string; onChange: (v: string) => void }) {
  const label = (
    <>
      {f.label}
      {f.required ? <span className="ml-1 text-xs font-normal text-danger">required</span> : f.recommended ? <span className="ml-1 text-xs font-normal text-ink-3">recommended</span> : null}
    </>
  );
  const common = { id, value, onChange: (e: { target: { value: string } }) => onChange(e.target.value) };
  return (
    <Field label={label} htmlFor={id} help={f.help} className={f.kind === "textarea" || f.kind === "lines" ? "sm:col-span-2" : ""}>
      {f.kind === "select" ? (
        <select {...common} className="select">
          <option value="">—</option>
          {f.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : f.kind === "textarea" || f.kind === "lines" ? (
        <textarea {...common} className={`textarea ${f.kind === "lines" ? "mono" : ""}`} style={{ ["--ta-min" as string]: "4.5rem", ["--ta-min-lg" as string]: "4.5rem" }} spellCheck={f.kind !== "lines"} placeholder={f.placeholder} />
      ) : (
        <input
          {...common}
          className="input"
          type={f.kind === "date" ? "date" : "text"}
          inputMode={f.kind === "url" ? "url" : f.kind === "number" ? "decimal" : undefined}
          autoCapitalize={f.kind === "url" ? "off" : undefined}
          spellCheck={f.kind === "url" ? false : undefined}
          placeholder={f.placeholder ?? (f.kind === "datetime" ? "2026-09-12 or 2026-09-12T09:00+01:00" : f.kind === "url" ? "https://" : undefined)}
        />
      )}
    </Field>
  );
}

function Generator() {
  const id = useId();
  const { used, announce } = useTool();
  const [type, setType] = useState<SchemaType>("Article");
  const [values, setValues] = useState<Partial<Record<SchemaType, Values>>>({});
  const [repeats, setRepeats] = useState<Partial<Record<SchemaType, RepeatValues>>>({});
  const spec = SCHEMA_TYPES.find((t) => t.id === type)!;
  const x = values[type] ?? {};
  const r: RepeatValues = useMemo(() => {
    const cur = repeats[type] ?? {};
    const out: RepeatValues = {};
    for (const rep of spec.repeats ?? []) out[rep.key] = cur[rep.key] ?? Array.from({ length: Math.max(rep.min, 1) }, () => ({}));
    return out;
  }, [repeats, type, spec]);
  const dx = useDebounced(x, 120);
  const dr = useDebounced(r, 120);
  const obj = useMemo(() => buildSchema(type, dx, dr), [type, dx, dr]);
  const code = toScript(obj);
  const missing = missingRequired(spec, dx, dr);
  const setField = (k: string, val: string) => {
    setValues({ ...values, [type]: { ...x, [k]: val } });
    used("type");
  };
  const setRow = (key: string, i: number, k: string, val: string) => {
    const rows = r[key].map((row, j) => (j === i ? { ...row, [k]: val } : row));
    setRepeats({ ...repeats, [type]: { ...r, [key]: rows } });
    used("type");
  };
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Panel
        title="Structured data details"
        actions={
          <>
            <Button
              variant="ghost"
              icon="sparkles"
              onClick={() => {
                const ex = SCHEMA_EXAMPLES[type];
                if (ex) {
                  setValues({ ...values, [type]: ex.values });
                  if (ex.repeats) setRepeats({ ...repeats, [type]: ex.repeats });
                }
                used("example");
              }}
            >
              Example
            </Button>
            <Button
              variant="ghost"
              icon="trash"
              onClick={() => {
                setValues({ ...values, [type]: {} });
                setRepeats({ ...repeats, [type]: {} });
              }}
            >
              Clear
            </Button>
          </>
        }
      >
        <div className="grid gap-4 p-3 sm:p-4">
          <Field label="Schema type" htmlFor={`${id}-type`}>
            <select id={`${id}-type`} className="select" value={type} onChange={(e) => setType(e.target.value as SchemaType)}>
              {SCHEMA_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label} ({t.id})
                </option>
              ))}
            </select>
          </Field>
          {spec.note && <Alert tone="info">{spec.note}</Alert>}
          {spec.fields.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {spec.fields.map((f) => (
                <FieldInput key={`${type}-${f.key}`} f={f} id={`${id}-${type}-${f.key}`} value={x[f.key] ?? ""} onChange={(val) => setField(f.key, val)} />
              ))}
            </div>
          )}
          {spec.repeats?.map((rep) => (
            <fieldset key={rep.key} className="grid gap-3">
              <legend className="field-label">{rep.label}</legend>
              {r[rep.key].map((row, i) => (
                <div key={i} className="grid gap-3 rounded-md border border-line p-3 sm:grid-cols-2">
                  <p className="text-sm font-semibold text-ink-2 sm:col-span-2">
                    {rep.itemLabel} {i + 1}
                  </p>
                  {rep.fields.map((f) => (
                    <FieldInput key={f.key} f={f} id={`${id}-${rep.key}-${i}-${f.key}`} value={row[f.key] ?? ""} onChange={(val) => setRow(rep.key, i, f.key, val)} />
                  ))}
                  <div className="flex flex-wrap gap-1.5 sm:col-span-2">
                    <Button
                      variant="ghost"
                      icon="arrow-up"
                      disabled={i === 0}
                      onClick={() => {
                        const rows = [...r[rep.key]];
                        [rows[i - 1], rows[i]] = [rows[i], rows[i - 1]];
                        setRepeats({ ...repeats, [type]: { ...r, [rep.key]: rows } });
                      }}
                    >
                      Move up
                    </Button>
                    <Button
                      variant="ghost"
                      icon="trash"
                      disabled={r[rep.key].length <= 1}
                      onClick={() => {
                        setRepeats({ ...repeats, [type]: { ...r, [rep.key]: r[rep.key].filter((_, j) => j !== i) } });
                        announce(`${rep.itemLabel} ${i + 1} removed.`);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              <div>
                <Button icon="plus" onClick={() => setRepeats({ ...repeats, [type]: { ...r, [rep.key]: [...r[rep.key], {}] } })}>
                  Add {rep.itemLabel.toLowerCase()}
                </Button>
              </div>
            </fieldset>
          ))}
        </div>
      </Panel>
      <div className="grid gap-4 lg:sticky lg:top-4">
        <Panel
          title="JSON-LD"
          actions={
            <>
              <CopyButton text={code} />
              <DownloadButton data={code} filename={`${type.toLowerCase()}-schema.html`} mime="text/html;charset=utf-8" />
            </>
          }
          footer={<span>Paste into the page&apos;s &lt;head&gt; or &lt;body&gt;.</span>}
        >
          <pre className="max-h-[36rem] min-h-40 overflow-auto p-3 font-mono text-sm whitespace-pre sm:p-4">{code}</pre>
        </Panel>
        {missing.length > 0 && (
          <Alert tone="warning" title="Required for rich results">
            Still missing: {missing.join(", ")}.
          </Alert>
        )}
        <div className="flex flex-wrap gap-2">
          <Link
            className="btn btn-secondary btn-sm"
            href="/schema-markup-validator/"
            onClick={() => {
              try {
                sessionStorage.setItem(VALIDATOR_KEY, code);
              } catch {
                /* ignore */
              }
            }}
          >
            Check it in the schema validator
          </Link>
          <a className="btn btn-ghost btn-sm" href="https://search.google.com/test/rich-results" target="_blank" rel="noopener noreferrer">
            Google Rich Results Test
          </a>
        </div>
      </div>
    </div>
  );
}

/* ---------- Validator ---------- */
function codeExcerpt(raw: string, line: number, startLine: number, col: number) {
  const lines = raw.split("\n");
  const idx = line - startLine;
  const from = Math.max(0, idx - 2);
  return lines.slice(from, idx + 2).map((l, k) => ({ n: from + k + startLine, text: l, mark: from + k === idx ? col : 0 }));
}

function FindingRow({ f }: { f: Finding }) {
  return (
    <li className="flex gap-2 py-1.5 text-sm">
      <StatusIcon status={f.severity === "error" ? "fail" : f.severity === "warning" ? "warn" : "info"} />
      <span className="min-w-0">{f.message}</span>
    </li>
  );
}

function Results({ blocks, microdata }: { blocks: BlockReport[]; microdata?: string[] }) {
  const c = countFindings(blocks);
  if (!blocks.length)
    return (
      <Alert tone="warning" role="status" title="No JSON-LD found">
        {microdata?.length ? `The page uses microdata (${microdata.join(", ")}), which this tool doesn't validate. Use the Schema.org validator for microdata.` : 'Paste JSON-LD (starting with {) or HTML that contains <script type="application/ld+json">.'}
      </Alert>
    );
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Errors" value={c.errors} />
        <StatTile label="Warnings" value={c.warnings} />
        <StatTile label="Notes" value={c.infos} />
      </div>
      {blocks.map((b) => (
        <Panel key={b.index} title={`Block ${b.index + 1}${b.syntax ? " · invalid JSON" : ` · ${[...new Set(b.nodes.filter((n) => !n.path.includes(" › ")).flatMap((n) => n.types))].join(", ") || "no @type"}`}`} actions={<CopyButton text={b.raw} label="Copy JSON" />}>
          <div className="grid gap-3 p-3 sm:p-4">
            {b.syntax ? (
              <>
                <Alert tone="danger" title={`Syntax error at line ${b.syntax.line}, column ${b.syntax.col}`}>
                  {b.syntax.message} Nothing in this block can be read until it&apos;s fixed.
                </Alert>
                <pre className="overflow-auto rounded-md border border-line bg-surface-2 p-2 font-mono text-xs">
                  {codeExcerpt(b.raw, b.syntax.line, b.startLine, b.syntax.col).map((l) => (
                    <span key={l.n} className={`block ${l.mark ? "text-danger" : "text-ink-2"}`}>
                      <span className="inline-block w-10 pr-2 text-right text-ink-3 select-none">{l.n}</span>
                      {l.text}
                      {l.mark ? (
                        <span className="block" aria-hidden="true">
                          <span className="inline-block w-10" />
                          {" ".repeat(Math.max(0, l.mark - 1))}^
                        </span>
                      ) : null}
                    </span>
                  ))}
                </pre>
              </>
            ) : (
              <>
                {b.findings.length > 0 && (
                  <ul className="divide-y divide-line">
                    {b.findings.map((f, i) => (
                      <FindingRow key={i} f={f} />
                    ))}
                  </ul>
                )}
                {b.nodes.map((n) => (
                  <div key={n.path} className="rounded-md border border-line px-3 py-2">
                    <p className="font-mono text-xs font-semibold text-ink-2">{n.path}</p>
                    {n.findings.length ? (
                      <ul className="divide-y divide-line">
                        {n.findings.map((f, i) => (
                          <FindingRow key={i} f={f} />
                        ))}
                      </ul>
                    ) : (
                      <p className="flex gap-2 py-1.5 text-sm">
                        <StatusIcon status="pass" /> No issues found by our checks.
                      </p>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </Panel>
      ))}
    </div>
  );
}

const SAMPLE = `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "product",
  "name": "Stone-ground rye flour, 1 kg",
  "offers": {
    "@type": "Offer",
    "price": "£4.50",
    "priceCurrency": "GBP",
  }
}
</script>`;

function Validator({ toolId }: { toolId: string }) {
  const id = useId();
  const { used } = useTool();
  const [mode, setMode] = useState<"paste" | "url">("paste");
  const [text, setText] = useSessionText(toolId);
  const deb = useDebounced(text, 250);
  const pasted = useMemo(() => extractBlocks(deb).map((b, i) => validateJsonLd(b.raw, i, b.startLine)), [deb]);
  const runner = useRunner<InspectResult>();
  const urlBlocks = useMemo(() => (runner.data?.facts ? runner.data.facts.jsonLd.map((j, i) => validateJsonLd(j.raw, i, 1)) : []), [runner.data]);
  return (
    <div className="grid gap-4">
      <ModeTabs
        label="What to validate"
        value={mode}
        onChange={setMode}
        options={[
          { value: "paste", label: "Paste code" },
          { value: "url", label: "Check a URL" },
        ]}
      />
      {mode === "paste" ? (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <Panel
            title={<label htmlFor={`${id}-t`}>JSON-LD or HTML</label>}
            actions={
              <>
                <Button variant="ghost" icon="sparkles" onClick={() => (setText(SAMPLE), used("example"))}>
                  Example
                </Button>
                <Button variant="ghost" icon="trash" disabled={!text} onClick={() => setText("")}>
                  Clear
                </Button>
              </>
            }
          >
            <textarea
              id={`${id}-t`}
              className="textarea mono rounded-none border-0"
              style={{ ["--ta-min" as string]: "16rem", ["--ta-min-lg" as string]: "24rem" }}
              spellCheck={false}
              value={text}
              placeholder={'{\n  "@context": "https://schema.org",\n  "@type": "Article",\n  …\n}'}
              onChange={(e) => (setText(e.target.value), used("type"))}
            />
          </Panel>
          <div className="min-h-40">{deb.trim() ? <Results blocks={pasted} /> : <p className="text-sm text-ink-3">Paste JSON-LD or a page&apos;s HTML. Results update as you type; nothing is uploaded.</p>}</div>
        </div>
      ) : (
        <div className="grid gap-4">
          <Panel>
            <div className="p-3 sm:p-4">
              <UrlForm buttonLabel="Validate page" busy={runner.busy} onSubmit={(u) => void runner.run(() => postJson<InspectResult>("/api/inspect", { url: u }), (d) => `${d.facts?.jsonLd.length ?? 0} JSON-LD blocks found.`)} help="We fetch the page from our server and read the JSON-LD in its HTML. Markup injected by JavaScript (for example by Google Tag Manager) isn't seen." />
            </div>
          </Panel>
          {runner.error && <ApiErrorAlert error={runner.error} />}
          {runner.data && (
            <div className="grid gap-4">
              <CheckedAt iso={runner.data.checkedAt}>
                <span className="inline-flex items-center gap-1.5">
                  <StatusCode code={runner.data.status} /> {runner.data.finalUrl}
                </span>
                <a className="text-accent underline" href={`https://search.google.com/test/rich-results?url=${encodeURIComponent(runner.data.finalUrl)}`} target="_blank" rel="noopener noreferrer">
                  Test this URL in Google&apos;s Rich Results Test
                </a>
              </CheckedAt>
              {runner.data.facts ? (
                <Results blocks={urlBlocks} microdata={runner.data.facts.microdataTypes} />
              ) : (
                <Alert tone="danger" role="alert" title={`No HTML to check (status ${runner.data.status})`}>
                  The address returned {runner.data.status >= 400 ? "an error" : `“${runner.data.contentType || "unknown"}” content`}, so there is no markup to validate.
                </Alert>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SchemaMarkup({ toolId, config }: WidgetProps) {
  return config?.mode === "validate" ? <Validator toolId={toolId} /> : <Generator />;
}
