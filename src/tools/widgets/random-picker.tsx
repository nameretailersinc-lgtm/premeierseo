"use client";

import { useId, useMemo, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { Alert, Button, Checkbox, CopyButton, Field, Panel, usePersistentOptions, useSessionText } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { randomBelow, sampleIndices } from "../lib/text/random";

/*
 * Random line picker. Uses crypto.getRandomValues through lib/text/random (rejection sampling,
 * no modulo bias). Picks without repeats by default; can remove winners for further draws.
 */

export function entriesOf(text: string, o: { dedupe: boolean; trim: boolean }) {
  let lines = text.replace(/\r\n?/g, "\n").split("\n");
  if (o.trim) lines = lines.map((l) => l.trim());
  lines = lines.filter((l) => l !== "");
  if (o.dedupe) {
    const seen = new Set<string>();
    lines = lines.filter((l) => {
      const k = l.toLocaleLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }
  return lines;
}

const SAMPLE = "Ana\nBen\nCara\nDev\nEli\nFay\nGus\nHana";

interface Draw {
  at: string;
  picks: string[];
  from: number;
}

export default function RandomPicker({ toolId }: WidgetProps) {
  const id = useId();
  const { used, announce, completed, error: trackError } = useTool();
  const [text, setText] = useSessionText(toolId);
  const [o, setO] = usePersistentOptions(toolId, { count: 1, repeats: false, dedupe: true, trim: true });
  const entries = useMemo(() => entriesOf(text, o), [text, o]);
  const [draws, setDraws] = useState<Draw[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const count = Math.max(1, Math.floor(Number(o.count) || 1));
  const last = draws[0];

  const pick = () => {
    setErr(null);
    if (!entries.length) {
      setErr("Add at least one line to pick from.");
      return;
    }
    if (!o.repeats && count > entries.length) {
      setErr(`You asked for ${count} picks but the list has only ${entries.length} entries. Lower the number or allow repeats.`);
      trackError("TOO_MANY", "pick");
      return;
    }
    try {
      const picks = o.repeats ? Array.from({ length: count }, () => entries[randomBelow(entries.length)]) : sampleIndices(entries.length, count).map((i) => entries[i]);
      const d: Draw = { at: new Date().toLocaleTimeString(), picks, from: entries.length };
      setDraws([d, ...draws].slice(0, 20));
      announce(`Picked: ${picks.join(", ")}`);
      completed("pick", { count });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't pick. Your browser may not support secure random numbers.");
      trackError("NO_CRYPTO", "pick");
    }
  };

  const removePicked = () => {
    if (!last) return;
    const gone = new Set(last.picks.map((p) => p.toLocaleLowerCase()));
    const kept = text
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .filter((l) => !gone.has(l.trim().toLocaleLowerCase()));
    setText(kept.join("\n"));
    announce(`${last.picks.length} picked ${last.picks.length === 1 ? "line" : "lines"} removed from the list`);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Panel
        as="div"
        title={<label htmlFor={`${id}-t`}>Entries (one per line)</label>}
        actions={
          <>
            <Button
              variant="ghost"
              icon="sparkles"
              onClick={() => {
                setText(SAMPLE);
                used("example");
              }}
            >
              Example
            </Button>
            <Button variant="ghost" icon="trash" disabled={!text} onClick={() => setText("")}>
              Clear
            </Button>
          </>
        }
        footer={<span>{entries.length.toLocaleString()} entries{o.dedupe ? " (duplicates ignored)" : ""}</span>}
      >
        <textarea
          id={`${id}-t`}
          className="textarea rounded-none border-0"
          style={{ ["--ta-min" as string]: "14rem", ["--ta-min-lg" as string]: "20rem" }}
          placeholder={"Paste names, entries or options\none per line"}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            used("type");
          }}
        />
      </Panel>
      <div className="grid content-start gap-3">
        <div className="panel grid gap-3 p-3 sm:p-4">
          <Field label="How many to pick" htmlFor={`${id}-n`} className="w-40">
            <input id={`${id}-n`} type="number" min={1} max={10000} className="input" value={o.count} onChange={(e) => setO({ ...o, count: Number(e.target.value) || 1 })} />
          </Field>
          <Checkbox checked={o.repeats} onChange={(v) => setO({ ...o, repeats: v })} label="Allow the same line to be picked twice" />
          <Checkbox checked={o.dedupe} onChange={(v) => setO({ ...o, dedupe: v })} label="Ignore duplicate lines" help="Each name gets one chance" />
          <Button variant="primary" size="lg" icon="refresh" onClick={pick} disabled={!entries.length}>
            {count === 1 ? "Pick a random line" : `Pick ${count} random lines`}
          </Button>
          {err && (
            <div role="alert">
              <Alert tone="danger">{err}</Alert>
            </div>
          )}
        </div>
        <Panel title={<span>Result</span>} actions={last && <CopyButton text={last.picks.join("\n")} />}>
          <div className="min-h-28 p-3 sm:p-4" aria-live="polite">
            {last ? (
              <>
                <ol className="grid gap-1">
                  {last.picks.map((p, i) => (
                    <li key={i} className="text-xl font-semibold break-words">
                      {last.picks.length > 1 && <span className="mr-2 text-base text-ink-3 tabular-nums">{i + 1}.</span>}
                      {p}
                    </li>
                  ))}
                </ol>
                <p className="mt-2 text-sm text-ink-3">
                  Picked at {last.at} from {last.from.toLocaleString()} entries{!o.repeats && last.picks.length === 1 ? `; each had a 1 in ${last.from.toLocaleString()} chance` : ""}.
                </p>
                {!o.repeats && (
                  <Button variant="ghost" icon="minus" className="mt-2" onClick={removePicked}>
                    Remove picked from the list
                  </Button>
                )}
              </>
            ) : (
              <p className="text-sm text-ink-3">Press the button to pick. Every entry has the same chance.</p>
            )}
          </div>
        </Panel>
        {draws.length > 1 && (
          <details className="panel p-3 text-sm">
            <summary className="cursor-pointer font-semibold">Earlier picks this session ({draws.length - 1})</summary>
            <ol className="mt-2 grid gap-1">
              {draws.slice(1).map((d, i) => (
                <li key={i}>
                  <span className="text-ink-3">{d.at}:</span> {d.picks.join(", ")}
                </li>
              ))}
            </ol>
          </details>
        )}
      </div>
    </div>
  );
}
