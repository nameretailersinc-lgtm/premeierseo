"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTool } from "./ToolContext";
import {
  Alert,
  Button,
  Checkbox,
  CopyButton,
  DownloadButton,
  Field,
  Panel,
  Segmented,
  stamp,
  useDebounced,
  usePersistentOptions,
  useSessionText,
} from "./primitives";

export type OptValue = string | number | boolean;
export type Opts = Record<string, OptValue>;

export type OptSpec =
  | { type: "checkbox"; key: string; label: string; default: boolean; help?: string; showIf?: (o: Opts) => boolean }
  | {
      type: "select";
      key: string;
      label: string;
      default: string;
      options: { value: string; label: string }[];
      help?: string;
      showIf?: (o: Opts) => boolean;
    }
  | {
      type: "segmented";
      key: string;
      label: string;
      default: string;
      options: { value: string; label: string }[];
      help?: string;
      showIf?: (o: Opts) => boolean;
    }
  | {
      type: "text";
      key: string;
      label: string;
      default: string;
      placeholder?: string;
      mono?: boolean;
      help?: string;
      showIf?: (o: Opts) => boolean;
    }
  | {
      type: "number";
      key: string;
      label: string;
      default: number;
      min?: number;
      max?: number;
      step?: number;
      help?: string;
      showIf?: (o: Opts) => boolean;
    };

export interface TransformResult {
  output: string;
  /** Short status shown under the output ("12 duplicates removed"). */
  note?: string;
  /** Validation message; output is not shown when set. */
  error?: string;
}

export interface TransformDef {
  inputLabel?: string;
  outputLabel?: string;
  placeholder?: string;
  options?: OptSpec[];
  run: (input: string, opts: Opts) => string | TransformResult | Promise<string | TransformResult>;
  sample: string;
  mono?: boolean;
  /** Process as you type (default). Set false for expensive work → shows an action button. */
  live?: boolean;
  actionLabel?: string;
  downloadName?: string;
  downloadMime?: string;
  /** Swap input and output (for reversible transforms such as encode/decode). */
  swappable?: boolean;
  /** Extra warning shown above the workspace (e.g. accessibility note for fancy text). */
  notice?: string;
  /** Don't persist input in sessionStorage (sensitive content). */
  noPersist?: boolean;
  /** Custom output renderer (rare). */
  wrap?: "soft" | "off";
}

function countLines(s: string) {
  return s ? s.split("\n").length : 0;
}

export function TransformTool({ def, toolId, presets }: { def: TransformDef; toolId: string; presets?: Opts }) {
  const { used, announce, error: trackError } = useTool();
  const baseId = useId();
  const defaults = useMemo(() => {
    const d: Opts = {};
    def.options?.forEach((o) => (d[o.key] = o.default));
    return { ...d, ...presets };
  }, [def, presets]);
  const [opts, setOpts, resetOpts] = usePersistentOptions<Opts>(toolId, defaults);
  const [input, setInput] = useSessionText(toolId, "", !def.noPersist);
  const [result, setResult] = useState<TransformResult>({ output: "" });
  const [busy, setBusy] = useState(false);
  const [undo, setUndo] = useState<string | null>(null);
  const live = def.live !== false;
  const debounced = useDebounced(input, input.length > 50_000 ? 400 : 120);

  // Each run gets a sequence number so a slow async run that finishes late can't overwrite a newer result.
  const runSeq = useRef(0);
  const run = async (text: string) => {
    const seq = ++runSeq.current;
    if (!text) {
      setResult({ output: "" });
      return;
    }
    try {
      setBusy(true);
      const r = await def.run(text, opts);
      if (seq !== runSeq.current) return;
      const res = typeof r === "string" ? { output: r } : r;
      setResult(res);
      if (res.error) trackError("INVALID_INPUT", "process");
    } catch (e) {
      if (seq !== runSeq.current) return;
      setResult({ output: "", error: e instanceof Error ? e.message : "Something went wrong while processing the text." });
      trackError("PROCESS_FAILED", "process");
    } finally {
      if (seq === runSeq.current) setBusy(false);
    }
  };

  useEffect(() => {
    if (live) void run(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, opts, live]);

  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 10_000);
    return () => clearTimeout(t);
  }, [undo]);

  const setOpt = (k: string, v: OptValue) => setOpts({ ...opts, [k]: v });
  const inId = `${baseId}-in`;
  const outId = `${baseId}-out`;
  const outHeading = `${baseId}-outh`;
  const visibleOptions = def.options?.filter((o) => !o.showIf || o.showIf(opts)) ?? [];
  const optsChanged = JSON.stringify(opts) !== JSON.stringify(defaults);

  return (
    <div className="grid gap-4">
      {def.notice && <Alert tone="info">{def.notice}</Alert>}
      {visibleOptions.length > 0 && (
        <Panel
          as="div"
          icon="sparkles"
          title="Options"
          actions={
            optsChanged ? (
              <Button variant="ghost" icon="rotate-ccw" onClick={resetOpts}>
                Reset
              </Button>
            ) : undefined
          }
        >
          <div className="flex flex-wrap items-end gap-x-6 gap-y-4 p-3 sm:p-4">
            {visibleOptions.map((o) => {
              const id = `${baseId}-${o.key}`;
              if (o.type === "checkbox")
                return (
                  <Checkbox key={o.key} checked={Boolean(opts[o.key])} onChange={(v) => setOpt(o.key, v)} label={o.label} help={o.help} />
                );
              if (o.type === "segmented")
                return (
                  <Segmented
                    key={o.key}
                    legend={o.label}
                    value={String(opts[o.key])}
                    onChange={(v) => setOpt(o.key, v)}
                    options={o.options}
                  />
                );
              if (o.type === "select")
                return (
                  <Field key={o.key} label={o.label} htmlFor={id} help={o.help} className="w-full sm:w-56">
                    <select id={id} className="select" value={String(opts[o.key])} onChange={(e) => setOpt(o.key, e.target.value)}>
                      {o.options.map((x) => (
                        <option key={x.value} value={x.value}>
                          {x.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                );
              if (o.type === "number")
                return (
                  <Field key={o.key} label={o.label} htmlFor={id} help={o.help} className="w-32">
                    <input
                      id={id}
                      type="number"
                      inputMode="numeric"
                      className="input"
                      min={o.min}
                      max={o.max}
                      step={o.step ?? 1}
                      value={Number(opts[o.key])}
                      onChange={(e) => setOpt(o.key, e.target.value === "" ? o.default : Number(e.target.value))}
                    />
                  </Field>
                );
              return (
                <Field key={o.key} label={o.label} htmlFor={id} help={o.help} className="w-full sm:w-64">
                  <input
                    id={id}
                    type="text"
                    className={`input ${o.mono ? "mono" : ""}`}
                    placeholder={o.placeholder}
                    value={String(opts[o.key])}
                    spellCheck={false}
                    onChange={(e) => setOpt(o.key, e.target.value)}
                  />
                </Field>
              );
            })}
          </div>
        </Panel>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          as="div"
          icon="pen"
          title={<label htmlFor={inId}>{def.inputLabel ?? "Your text"}</label>}
          actions={
            <>
              <Button
                variant="ghost"
                icon="sparkles"
                onClick={() => {
                  if (input && input !== def.sample) setUndo(input);
                  setInput(def.sample);
                  used("example");
                  if (!live) void run(def.sample);
                }}
              >
                Example
              </Button>
              <Button
                variant="ghost"
                icon="trash"
                disabled={!input}
                onClick={() => {
                  setUndo(input);
                  setInput("");
                  setResult({ output: "" });
                  announce("Cleared");
                }}
              >
                Clear
              </Button>
            </>
          }
          footer={
            <>
              <span>{input.length.toLocaleString()} characters</span>
              <span>{countLines(input).toLocaleString()} lines</span>
              {undo !== null && (
                <button
                  type="button"
                  className="font-semibold text-accent underline"
                  onClick={() => {
                    setInput(undo);
                    setUndo(null);
                  }}
                >
                  Undo
                </button>
              )}
            </>
          }
        >
          <textarea
            id={inId}
            className={`textarea rounded-none border-0 ${def.mono ? "mono" : ""}`}
            style={{ ["--ta-min" as string]: "12.5rem", ["--ta-min-lg" as string]: "20rem" }}
            placeholder={def.placeholder ?? "Paste or type text here"}
            value={input}
            spellCheck={!def.mono}
            autoCapitalize="off"
            autoCorrect="off"
            wrap={def.wrap ?? "soft"}
            onChange={(e) => {
              setInput(e.target.value);
              used("type");
            }}
            onPaste={() => used("paste")}
            onKeyDown={(e) => {
              if (!live && (e.ctrlKey || e.metaKey) && e.key === "Enter") void run(input);
            }}
          />
        </Panel>

        <Panel
          titleId={outHeading}
          icon="circle-check"
          tone="accent"
          title={<span id={outId}>{def.outputLabel ?? "Result"}</span>}
          actions={
            <>
              {def.swappable && (
                <Button
                  variant="ghost"
                  icon="arrow-left-right"
                  disabled={!result.output}
                  onClick={() => {
                    setInput(result.output);
                    announce("Result moved to input");
                  }}
                >
                  Use as input
                </Button>
              )}
              {!def.swappable && (
                <Button
                  variant="ghost"
                  icon="arrow-left-right"
                  disabled={!result.output}
                  aria-label="Use output as input"
                  onClick={() => setInput(result.output)}
                >
                  Reuse
                </Button>
              )}
              <CopyButton text={result.output} disabled={!result.output} variant="primary" />
              <DownloadButton
                data={() => result.output}
                filename={() => def.downloadName ?? `${toolId}-${stamp()}.txt`}
                mime={def.downloadMime}
                disabled={!result.output}
              />
            </>
          }
          footer={
            result.note || result.output ? (
              <>
                {result.note && <span>{result.note}</span>}
                {result.output && <span>{result.output.length.toLocaleString()} characters</span>}
              </>
            ) : undefined
          }
        >
          {!live && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-surface-2 p-3 sm:p-4">
              <Button
                variant="primary"
                size="lg"
                icon="play"
                busy={busy}
                disabled={!input}
                onClick={() => run(input)}
                className="w-full sm:w-auto sm:min-w-44"
              >
                {busy ? "Working…" : (def.actionLabel ?? "Convert")}
              </Button>
              <span className="hidden text-sm text-ink-3 lg:inline">
                or press <kbd className="kbd">Ctrl</kbd> + <kbd className="kbd">Enter</kbd>
              </span>
            </div>
          )}
          {result.error ? (
            <div className="p-3 sm:p-4" role="alert">
              <Alert tone="danger">{result.error}</Alert>
            </div>
          ) : (
            <textarea
              aria-labelledby={outId}
              readOnly
              className={`textarea rounded-none border-0 ${def.mono ? "mono" : ""}`}
              style={{ ["--ta-min" as string]: "12.5rem", ["--ta-min-lg" as string]: "20rem" }}
              value={result.output}
              placeholder={input ? "" : live ? "Your result appears here as you type." : "Your result appears here once you run the tool."}
              wrap={def.wrap ?? "soft"}
            />
          )}
        </Panel>
      </div>
    </div>
  );
}
