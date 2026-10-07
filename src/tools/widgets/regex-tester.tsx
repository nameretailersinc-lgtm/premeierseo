"use client";

import { Fragment, useEffect, useId, useRef, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { Alert, Button, Checkbox, CopyButton, Field, Panel, useDebounced, useSessionText } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { LIBRARY, WORKER_SOURCE, runRegex, type RxResult } from "../lib/dev/regex";

/*
 * JavaScript regex tester. Matching runs in a Web Worker so a catastrophic pattern can be
 * stopped after a time limit instead of freezing the page; without workers it falls back to
 * the main thread with a smaller input limit.
 */

const FLAGS = [
  { f: "g", label: "g", help: "Global: find every match" },
  { f: "i", label: "i", help: "Ignore case" },
  { f: "m", label: "m", help: "Multiline: ^ and $ match at line breaks" },
  { f: "s", label: "s", help: "Dot matches new lines" },
  { f: "u", label: "u", help: "Unicode: code points, \\p{…}" },
  { f: "y", label: "y", help: "Sticky: match only at lastIndex" },
];
const TIME_LIMIT = 2000;
const SHOW_LIMIT = 1000;

type State = { status: "idle" | "running" | "done" | "timeout"; result?: RxResult };

function useRegexRunner() {
  const worker = useRef<Worker | null>(null);
  const seq = useRef(0);
  const [state, setState] = useState<State>({ status: "idle" });
  const kill = () => {
    worker.current?.terminate();
    worker.current = null;
  };
  useEffect(() => kill, []);
  const run = (pattern: string, flags: string, text: string, replace: string | null) => {
    const id = ++seq.current;
    if (!pattern) {
      setState({ status: "idle" });
      return;
    }
    if (!worker.current) {
      try {
        const url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: "text/javascript" }));
        worker.current = new Worker(url);
        URL.revokeObjectURL(url);
      } catch {
        worker.current = null;
      }
    }
    const w = worker.current;
    if (!w) {
      // Fallback: main thread with a cap on input size.
      const r = runRegex(pattern, flags, text.slice(0, 200_000), replace, SHOW_LIMIT);
      setState({ status: "done", result: r });
      return;
    }
    setState((s) => ({ ...s, status: "running" }));
    const timer = setTimeout(() => {
      if (seq.current !== id) return;
      kill();
      setState({ status: "timeout" });
    }, TIME_LIMIT);
    w.onmessage = (e: MessageEvent<{ id: number; result: RxResult }>) => {
      if (e.data.id !== seq.current) return;
      clearTimeout(timer);
      setState({ status: "done", result: e.data.result });
    };
    w.postMessage({ id, pattern, flags, text, replace, limit: SHOW_LIMIT });
  };
  return { state, run };
}

function Highlighted({ text, result }: { text: string; result: RxResult }) {
  const parts: React.ReactNode[] = [];
  let pos = 0;
  const shown = text.length > 300_000 ? text.slice(0, 300_000) : text;
  result.matches.forEach((m, i) => {
    if (m.index > shown.length) return;
    if (m.index > pos) parts.push(shown.slice(pos, m.index));
    if (m.end === m.index) {
      parts.push(
        <span key={`z${i}`} className="mx-px inline-block h-4 w-0.5 translate-y-0.5 bg-accent" aria-label={`empty match ${i + 1}`} title={`Match ${i + 1} (empty)`} />,
      );
    } else {
      parts.push(
        <mark key={i} className={`underline decoration-2 underline-offset-2 ${i % 2 ? "decoration-dotted" : ""}`} title={`Match ${i + 1}`}>
          <span className="sr-only">[match {i + 1}: </span>
          {shown.slice(m.index, m.end)}
          <span className="sr-only">]</span>
        </mark>,
      );
    }
    pos = Math.max(pos, m.end);
  });
  if (pos < shown.length) parts.push(shown.slice(pos));
  return <>{parts}</>;
}

export default function RegexTester({ toolId }: WidgetProps) {
  const id = useId();
  const { used, completed, announce } = useTool();
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState("g");
  const [text, setText] = useSessionText(toolId);
  const [replace, setReplace] = useState("");
  const [useReplace, setUseReplace] = useState(false);
  const { state, run } = useRegexRunner();
  const dp = useDebounced(pattern, 150);
  const dt = useDebounced(text, text.length > 100_000 ? 400 : 150);
  const dr = useDebounced(replace, 150);

  useEffect(() => {
    run(dp, flags, dt, useReplace ? dr : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dp, flags, dt, dr, useReplace]);

  const r = state.result;
  useEffect(() => {
    if (state.status === "done" && r && !r.error && dp) {
      announce(`${r.total} match${r.total === 1 ? "" : "es"}`);
      completed("view");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r]);

  const toggle = (f: string) => setFlags((cur) => (cur.includes(f) ? cur.replace(f, "") : [...(cur + f)].sort((a, b) => "dgimsuvy".indexOf(a) - "dgimsuvy".indexOf(b)).join("")));
  const groupCount = r?.matches[0]?.groups.length ?? 0;

  return (
    <div className="grid gap-4">
      <Panel title={<span>Regular expression</span>}>
        <div className="grid gap-3 p-3 sm:p-4">
          <Field label="Pattern" htmlFor={`${id}-p`} error={state.status === "done" && r?.error ? r.error : null} help="JavaScript (ECMAScript) syntax, without the surrounding slashes">
            <div className="flex items-center gap-1 font-mono">
              <span aria-hidden="true" className="text-lg text-ink-3">
                /
              </span>
              <input
                id={`${id}-p`}
                className="input mono"
                value={pattern}
                spellCheck={false}
                autoComplete="off"
                autoCapitalize="off"
                placeholder="\b\w+@\w+\.\w+\b"
                aria-invalid={r?.error ? true : undefined}
                onChange={(e) => {
                  setPattern(e.target.value);
                  used("type");
                }}
              />
              <span aria-hidden="true" className="text-lg text-ink-3">
                /{flags}
              </span>
            </div>
          </Field>
          <fieldset>
            <legend className="field-label">Flags</legend>
            <div className="flex flex-wrap gap-x-5">
              {FLAGS.map((x) => (
                <Checkbox
                  key={x.f}
                  checked={flags.includes(x.f)}
                  onChange={() => toggle(x.f)}
                  label={
                    <>
                      <code className="font-semibold">{x.label}</code> <span className="text-sm text-ink-3">{x.help}</span>
                    </>
                  }
                />
              ))}
            </div>
          </fieldset>
          <Field label="Pattern library" htmlFor={`${id}-lib`} className="max-w-md">
            <select
              id={`${id}-lib`}
              className="select"
              value=""
              onChange={(e) => {
                const l = LIBRARY[Number(e.target.value)];
                if (!l) return;
                setPattern(l.pattern);
                setFlags(l.flags);
                setText(l.sample);
                used("example");
                announce(`Loaded ${l.name}`);
              }}
            >
              <option value="">Load a common pattern…</option>
              {LIBRARY.map((l, i) => (
                <option key={l.name} value={i}>
                  {l.name}
                </option>
              ))}
            </select>
          </Field>
          {LIBRARY.find((l) => l.pattern === pattern) && <p className="text-sm text-ink-3">{LIBRARY.find((l) => l.pattern === pattern)!.note}</p>}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          as="div"
          title={<label htmlFor={`${id}-t`}>Test text</label>}
          actions={
            <Button variant="ghost" icon="trash" disabled={!text} onClick={() => setText("")}>
              Clear
            </Button>
          }
        >
          <textarea
            id={`${id}-t`}
            className="textarea mono rounded-none border-0"
            spellCheck={false}
            style={{ ["--ta-min" as string]: "12rem", ["--ta-min-lg" as string]: "18rem" }}
            placeholder="Paste the text to search"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              used("type");
            }}
          />
        </Panel>
        <Panel
          title={<span>Matches</span>}
          footer={
            state.status === "done" && r && !r.error && pattern ? (
              <>
                <span className="font-semibold text-ink">
                  {r.total.toLocaleString()} match{r.total === 1 ? "" : "es"}
                </span>
                {r.total > r.matches.length && <span>first {r.matches.length.toLocaleString()} highlighted</span>}
                <span>{r.ms} ms</span>
              </>
            ) : undefined
          }
        >
          <div className="min-h-48 p-3 sm:p-4">
            {state.status === "timeout" ? (
              <Alert tone="danger" role="alert" title="Stopped after 2 seconds">
                The pattern took too long, which usually means catastrophic backtracking: nested quantifiers such as <code>(a+)+</code> or <code>(.*)*</code> that can match the same text
                in exponentially many ways. Make the inner part more specific.
              </Alert>
            ) : r && !r.error && pattern ? (
              <pre className="max-h-[22rem] overflow-auto text-sm leading-relaxed break-words whitespace-pre-wrap">
                <Highlighted text={dt} result={r} />
              </pre>
            ) : (
              <p className="text-sm text-ink-3">Matches are underlined and highlighted here. Each match is also listed in the table below.</p>
            )}
          </div>
        </Panel>
      </div>

      <Panel title={<span>Replace</span>}>
        <div className="grid gap-3 p-3 sm:p-4">
          <Checkbox checked={useReplace} onChange={setUseReplace} label="Show a replace preview" />
          {useReplace && (
            <>
              <Field label="Replace with" htmlFor={`${id}-r`} help="$1, $2 … for groups, $<name> for named groups, $& for the whole match, $$ for a dollar sign">
                <input id={`${id}-r`} className="input mono" value={replace} spellCheck={false} onChange={(e) => setReplace(e.target.value)} />
              </Field>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold" id={`${id}-rl`}>
                  Result{!flags.includes("g") ? " (without g, only the first match is replaced)" : ""}
                </span>
                <CopyButton text={r?.replaced ?? ""} disabled={!r?.replaced} />
              </div>
              <textarea aria-labelledby={`${id}-rl`} readOnly className="textarea mono" style={{ ["--ta-min" as string]: "8rem" }} value={r?.replaced ?? ""} />
            </>
          )}
        </div>
      </Panel>

      {r && !r.error && r.matches.length > 0 && pattern && (
        <Panel title={<span>Match details</span>}>
          <div className="max-h-[24rem] overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-surface">
                <tr>
                  <th scope="col" className="border-b border-line px-2 py-1.5 text-left font-semibold">
                    #
                  </th>
                  <th scope="col" className="border-b border-line px-2 py-1.5 text-left font-semibold">
                    Position
                  </th>
                  <th scope="col" className="border-b border-line px-2 py-1.5 text-left font-semibold">
                    Match
                  </th>
                  {Array.from({ length: groupCount }, (_, g) => {
                    const name = r.groupNames[g];
                    return (
                      <th key={g} scope="col" className="border-b border-line px-2 py-1.5 text-left font-semibold">
                        Group {g + 1}
                        {name && r.matches[0].named && name in r.matches[0].named ? ` (${name})` : ""}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {r.matches.slice(0, 500).map((m, i) => (
                  <tr key={i}>
                    <td className="border-b border-line px-2 py-1 tabular-nums">{i + 1}</td>
                    <td className="border-b border-line px-2 py-1 tabular-nums">
                      {m.index}–{m.end}
                    </td>
                    <td className="border-b border-line px-2 py-1 font-mono break-all">{m.text === "" ? <span className="text-ink-3">(empty)</span> : m.text}</td>
                    {m.groups.map((g, k) => (
                      <td key={k} className="border-b border-line px-2 py-1 font-mono break-all">
                        {g === null ? <span className="text-ink-3">(no match)</span> : g === "" ? <span className="text-ink-3">(empty)</span> : <Fragment>{g}</Fragment>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {r.matches.length > 500 && <p className="border-t border-line px-3 py-2 text-sm text-ink-3">The table lists the first 500 matches.</p>}
        </Panel>
      )}
    </div>
  );
}
