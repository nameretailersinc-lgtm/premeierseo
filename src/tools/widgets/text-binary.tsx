"use client";

import { useId, useMemo, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { Alert, Button, CopyButton, DownloadButton, Field, Panel, Segmented, useDebounced, usePersistentOptions, useSessionText } from "../ui/primitives";
import type { WidgetProps } from "../types";
import {
  CONTROL_DESCRIPTIONS,
  CONTROL_NAMES,
  charLabel,
  codesToText,
  decodeBinary,
  encodeText,
  type Sep,
} from "../lib/dev/binary-text";

/*
 * Text ↔ binary engine. config.mode: "text-to-binary" | "binary-to-text" | "ascii-to-binary".
 * One widget with a direction toggle; the ASCII preset adds decimal-code input and the 0–127 table.
 */

type Dir = "encode" | "decode";
type Opts = {
  dir: Dir;
  encoding: "utf8" | "ascii";
  bits: string;
  sep: Sep;
  input: "chars" | "codes";
  charset: "utf8" | "latin1";
  show: "text" | "decimal" | "hex" | "octal";
};

const SAMPLES = { encode: "Hello", decode: "01001000 01100101 01101100 01101100 01101111" };
const hex2 = (n: number) => n.toString(16).toUpperCase().padStart(2, "0");

function AsciiTable() {
  const id = useId();
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const all = Array.from({ length: 128 }, (_, n) => n);
    const s = q.trim().toLowerCase();
    if (!s) return all;
    return all.filter((n) => {
      const ch = String.fromCharCode(n);
      const name = n < 32 || n === 127 ? `${CONTROL_NAMES[n === 127 ? 32 : n]} ${CONTROL_DESCRIPTIONS[n]}`.toLowerCase() : "";
      return (s.length === 1 && ch === q.trim()) || String(n) === s || hex2(n).toLowerCase() === s.replace(/^0x/, "") || n.toString(2).padStart(8, "0") === s || name.includes(s) || (s === "space" && n === 32);
    });
  }, [q]);
  return (
    <Panel title={<span>ASCII table (0–127)</span>}>
      <div className="p-3 sm:p-4">
        <Field label="Find a character or code" htmlFor={`${id}-q`} help="Type a character, a decimal or hex code, 8 bits, or a name such as “tab”." className="max-w-sm">
          <input id={`${id}-q`} className="input" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" spellCheck={false} />
        </Field>
      </div>
      <div className="max-h-[28rem] overflow-auto border-t border-line">
        <table className="w-full border-collapse text-sm tabular-nums">
          <thead className="sticky top-0 bg-surface">
            <tr>
              {["Dec", "Hex", "Binary (8-bit)", "Character"].map((h) => (
                <th key={h} scope="col" className="border-b border-line px-3 py-2 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((n) => (
              <tr key={n}>
                <td className="border-b border-line px-3 py-1">{n}</td>
                <td className="font-mono border-b border-line px-3 py-1">{hex2(n)}</td>
                <td className="font-mono border-b border-line px-3 py-1">{n.toString(2).padStart(8, "0")}</td>
                <td className="border-b border-line px-3 py-1">
                  {n < 32 || n === 127 ? (
                    <span>
                      <span className="font-mono font-semibold">{CONTROL_NAMES[n === 127 ? 32 : n].split(" ")[0]}</span>{" "}
                      <span className="text-ink-3">{CONTROL_DESCRIPTIONS[n]}</span>
                    </span>
                  ) : n === 32 ? (
                    <span className="text-ink-3">space</span>
                  ) : (
                    <span className="font-mono">{String.fromCharCode(n)}</span>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={4} className="px-3 py-3 text-ink-3">
                  Nothing in 0–127 matches. Characters outside ASCII are covered by the Unicode converter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export default function TextBinary({ toolId, config }: WidgetProps) {
  const { used, announce } = useTool();
  const id = useId();
  const mode = String(config?.mode ?? "text-to-binary");
  const ascii = mode === "ascii-to-binary";
  const [o, setO] = usePersistentOptions<Opts>(toolId, {
    dir: mode === "binary-to-text" ? "decode" : "encode",
    encoding: ascii ? "ascii" : "utf8",
    bits: ascii ? "8" : "auto",
    sep: "space",
    input: "chars",
    charset: "utf8",
    show: "text",
  });
  const [input, setInput] = useSessionText(toolId);
  const text = useDebounced(input, input.length > 100_000 ? 400 : 100);
  const set = <K extends keyof Opts>(k: K, v: Opts[K]) => setO({ ...o, [k]: v });

  const res = useMemo(() => {
    if (!text) return { output: "", warnings: [] as string[] };
    if (o.dir === "encode") {
      let src = text;
      if (ascii && o.input === "codes") {
        const c = codesToText(text, 127);
        if (c.error) return { output: "", error: c.error, warnings: [] };
        src = c.text!;
      }
      const bits = o.encoding === "ascii" && o.bits === "7" ? 7 : 8;
      const r = encodeText(src, { encoding: ascii ? "ascii" : o.encoding, bits, sep: o.sep });
      if (r.error) return { output: "", error: r.error, warnings: [] };
      return {
        output: r.output,
        warnings: [] as string[],
        note: `${[...src].length.toLocaleString()} characters → ${r.byteCount.toLocaleString()} ${bits === 7 ? "7-bit codes" : "bytes"} (${(r.byteCount * bits).toLocaleString()} bits)`,
        enc: r.rows,
        bitsWidth: bits,
      };
    }
    const r = decodeBinary(text, { bits: o.bits === "7" ? 7 : o.bits === "8" ? 8 : "auto", charset: o.charset });
    if (r.error) return { output: "", error: r.error, warnings: [] };
    let output = r.text;
    if (o.show === "decimal") output = r.bytes.join(" ");
    else if (o.show === "hex") output = r.bytes.map(hex2).join(" ");
    else if (o.show === "octal") output = r.bytes.map((b) => b.toString(8).padStart(3, "0")).join(" ");
    return { output, warnings: r.warnings, note: `${r.bytes.length.toLocaleString()} ${r.width === 7 ? "7-bit codes" : "bytes"} → ${[...r.text].length.toLocaleString()} characters`, dec: r.rows };
  }, [text, o, ascii]);

  const inLabel = o.dir === "encode" ? (ascii ? (o.input === "codes" ? "ASCII codes (decimal)" : "ASCII text") : "Text") : "Binary";
  const outLabel = o.dir === "encode" ? "Binary" : o.show === "text" ? "Text" : o.show === "decimal" ? "Byte values (decimal)" : o.show === "hex" ? "Byte values (hex)" : "Byte values (octal)";
  const sample = o.dir === "encode" ? (ascii && o.input === "codes" ? "72 101 108 108 111" : SAMPLES.encode) : SAMPLES.decode;

  const breakdown = "enc" in res && res.enc ? res.enc.slice(0, 300) : null;
  const decRows = "dec" in res && res.dec ? res.dec.slice(0, 600) : null;

  return (
    <div className="grid gap-4">
      <div className="panel p-3 sm:p-4">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <Segmented
            legend="Direction"
            value={o.dir}
            onChange={(v) => {
              set("dir", v);
              if (res.output && !res.error && o.show === "text") setInput(res.output);
              announce(v === "encode" ? "Converting text to binary" : "Converting binary to text");
            }}
            options={[
              { value: "encode", label: ascii ? "ASCII → Binary" : "Text → Binary" },
              { value: "decode", label: ascii ? "Binary → ASCII" : "Binary → Text" },
            ]}
          />
          {o.dir === "encode" && ascii && (
            <Segmented
              legend="Input"
              value={o.input}
              onChange={(v) => set("input", v)}
              options={[
                { value: "chars", label: "Characters" },
                { value: "codes", label: "Decimal codes" },
              ]}
            />
          )}
          {o.dir === "encode" && !ascii && (
            <Segmented
              legend="Encoding"
              value={o.encoding}
              onChange={(v) => set("encoding", v)}
              options={[
                { value: "utf8", label: "UTF-8" },
                { value: "ascii", label: "ASCII" },
              ]}
            />
          )}
          {(o.dir === "decode" || ascii || o.encoding === "ascii") && (
            <Field label={o.dir === "decode" ? "Bits per character" : "Bits per code"} htmlFor={`${id}-bits`} className="w-44">
              <select id={`${id}-bits`} className="select" value={o.dir === "encode" && o.bits === "auto" ? "8" : o.bits} onChange={(e) => set("bits", e.target.value)}>
                {o.dir === "decode" && <option value="auto">Auto-detect</option>}
                <option value="8">8 bits</option>
                <option value="7">7 bits</option>
              </select>
            </Field>
          )}
          {o.dir === "encode" && (
            <Field label="Separator" htmlFor={`${id}-sep`} className="w-40">
              <select id={`${id}-sep`} className="select" value={o.sep} onChange={(e) => set("sep", e.target.value as Sep)}>
                <option value="space">Space</option>
                <option value="none">None</option>
                <option value="comma">Comma</option>
                <option value="newline">New line</option>
              </select>
            </Field>
          )}
          {o.dir === "decode" && (
            <>
              <Field label="Character set" htmlFor={`${id}-cs`} className="w-44">
                <select id={`${id}-cs`} className="select" value={o.charset} onChange={(e) => set("charset", e.target.value as Opts["charset"])}>
                  <option value="utf8">UTF-8</option>
                  <option value="latin1">Latin-1 (8-bit)</option>
                </select>
              </Field>
              <Field label="Show" htmlFor={`${id}-show`} className="w-44">
                <select id={`${id}-show`} className="select" value={o.show} onChange={(e) => set("show", e.target.value as Opts["show"])}>
                  <option value="text">Text</option>
                  <option value="decimal">Decimal values</option>
                  <option value="hex">Hex values</option>
                  <option value="octal">Octal values</option>
                </select>
              </Field>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          as="div"
          title={<label htmlFor={`${id}-in`}>{inLabel}</label>}
          actions={
            <>
              <Button
                variant="ghost"
                icon="sparkles"
                onClick={() => {
                  setInput(sample);
                  used("example");
                }}
              >
                Example
              </Button>
              <Button variant="ghost" icon="trash" disabled={!input} onClick={() => setInput("")}>
                Clear
              </Button>
            </>
          }
          footer={<span>{input.length.toLocaleString()} characters</span>}
        >
          <textarea
            id={`${id}-in`}
            className={`textarea rounded-none border-0 ${o.dir === "decode" || o.input === "codes" ? "mono" : ""}`}
            style={{ ["--ta-min" as string]: "11rem", ["--ta-min-lg" as string]: "16rem" }}
            placeholder={o.dir === "decode" ? "Paste binary, e.g. 01001000 01101001 (spaces optional)" : ascii && o.input === "codes" ? "Type codes such as 72 101 108" : "Type or paste text"}
            value={input}
            spellCheck={false}
            aria-invalid={res.error ? true : undefined}
            onChange={(e) => {
              setInput(e.target.value);
              used("type");
            }}
            onPaste={() => used("paste")}
          />
        </Panel>
        <Panel
          as="div"
          tone="accent"
          title={<span id={`${id}-outl`}>{outLabel}</span>}
          actions={
            <>
              <CopyButton text={res.output} disabled={!res.output} variant="primary" />
              <DownloadButton data={() => res.output} filename={o.dir === "encode" ? "binary.txt" : "decoded.txt"} disabled={!res.output} />
            </>
          }
          footer={"note" in res && res.note ? <span>{res.note}</span> : undefined}
        >
          {res.error ? (
            <div className="p-3 sm:p-4" role="alert">
              <Alert tone="danger">{res.error}</Alert>
            </div>
          ) : (
            <textarea
              aria-labelledby={`${id}-outl`}
              readOnly
              className={`textarea rounded-none border-0 ${o.dir === "encode" || o.show !== "text" ? "mono" : ""}`}
              style={{ ["--ta-min" as string]: "11rem", ["--ta-min-lg" as string]: "16rem" }}
              value={res.output}
              placeholder="The result appears here."
            />
          )}
        </Panel>
      </div>
      {res.warnings.length > 0 && (
        <Alert tone="warning">
          {res.warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </Alert>
      )}

      {(breakdown?.length || decRows?.length) && !res.error ? (
        <Panel title={<span>Character-by-character breakdown</span>}>
          <div className="max-h-[26rem] overflow-auto">
            <table className="w-full border-collapse text-sm tabular-nums">
              <thead className="sticky top-0 bg-surface">
                <tr>
                  {(breakdown ? ["Character", "Code point", "Decimal", "Hex", "Binary"] : ["Binary", "Decimal", "Hex", "Character", "Note"]).map((h) => (
                    <th key={h} scope="col" className="border-b border-line px-3 py-2 text-left font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {breakdown?.map((r, i) => (
                  <tr key={i}>
                    <td className="border-b border-line px-3 py-1">{charLabel(r.char)}</td>
                    <td className="font-mono border-b border-line px-3 py-1">U+{r.codePoint.toString(16).toUpperCase().padStart(4, "0")}</td>
                    <td className="border-b border-line px-3 py-1">{r.bytes.join(" ")}</td>
                    <td className="font-mono border-b border-line px-3 py-1">{r.bytes.map(hex2).join(" ")}</td>
                    <td className="font-mono border-b border-line px-3 py-1">
                      {r.bytes.map((b) => b.toString(2).padStart("bitsWidth" in res && res.bitsWidth === 7 ? 7 : 8, "0")).join(" ")}
                    </td>
                  </tr>
                ))}
                {decRows?.map((r, i) => (
                  <tr key={i}>
                    <td className="font-mono border-b border-line px-3 py-1">{r.bits}</td>
                    <td className="border-b border-line px-3 py-1">{r.value}</td>
                    <td className="font-mono border-b border-line px-3 py-1">{hex2(r.value)}</td>
                    <td className="border-b border-line px-3 py-1">{r.char}</td>
                    <td className="border-b border-line px-3 py-1 text-ink-3">{r.note ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {((breakdown && "enc" in res && res.enc && res.enc.length > 300) || (decRows && "dec" in res && res.dec && res.dec.length > 600)) && (
            <p className="border-t border-line px-3 py-2 text-sm text-ink-3">The table shows the first {breakdown ? "300 characters" : "600 bytes"}; the result above is complete.</p>
          )}
        </Panel>
      ) : null}

      {ascii && <AsciiTable />}
    </div>
  );
}
