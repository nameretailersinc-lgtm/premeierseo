"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { Alert, Button, Checkbox, DownloadButton, Field, stamp } from "../ui/primitives";

/*
 * Tally counter with several named counters. State is saved in localStorage (pss:tally:v1) on
 * this device only; the page says so. Keyboard: Space, Enter, + or ↑ count up; − or ↓ count down
 * (when focus isn't in a text field or on another button). Every change is announced politely.
 */

interface Counter {
  id: string;
  name: string;
  count: number;
}
interface TallyState {
  counters: Counter[];
  active: string;
  step: number;
  marks: boolean;
}

const KEY = "pss:tally:v1";
const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()) + String(performance.now()));
const INITIAL: TallyState = { counters: [{ id: "c1", name: "Counter 1", count: 0 }], active: "c1", step: 1, marks: false };

function load(): TallyState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as TallyState;
    if (!Array.isArray(s.counters) || !s.counters.length) return null;
    const counters = s.counters
      .filter((c) => c && typeof c.id === "string")
      .map((c) => ({ id: c.id, name: String(c.name ?? "Counter").slice(0, 60), count: Number.isFinite(c.count) ? Math.trunc(c.count) : 0 }));
    return { counters, active: counters.some((c) => c.id === s.active) ? s.active : counters[0].id, step: Math.max(1, Math.min(1000, Math.trunc(Number(s.step) || 1))), marks: Boolean(s.marks) };
  } catch {
    return null;
  }
}

function TallyGroup({ bars, full }: { bars: number; full: boolean }) {
  return (
    <svg width="34" height="28" viewBox="0 0 34 28" aria-hidden="true" className="text-ink">
      {Array.from({ length: bars }, (_, i) => (
        <line key={i} x1={5 + i * 7} y1="3" x2={5 + i * 7} y2="25" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      ))}
      {full && <line x1="1" y1="22" x2="31" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />}
    </svg>
  );
}

/** Five-bar tally groups (four strokes and a diagonal), drawn as SVG so every font shows them. */
function TallyMarks({ n }: { n: number }) {
  if (n <= 0) return <p className="text-sm text-ink-3">No marks yet.</p>;
  if (n > 500) return <p className="text-sm text-ink-3">Tally marks are shown for counts up to 500.</p>;
  const groups = Math.floor(n / 5);
  const rest = n % 5;
  return (
    <div className="flex flex-wrap gap-x-2 gap-y-1" role="img" aria-label={`${n} tally marks: ${groups} groups of five${rest ? ` and ${rest}` : ""}`}>
      {Array.from({ length: groups }, (_, i) => (
        <TallyGroup key={i} bars={4} full />
      ))}
      {rest > 0 && <TallyGroup bars={rest} full={false} />}
    </div>
  );
}

export default function TallyCounter() {
  const id = useId();
  const { used, announce } = useTool();
  const [s, setS] = useState<TallyState>(INITIAL);
  const [loaded, setLoaded] = useState(false);
  const [undo, setUndo] = useState<{ label: string; state: TallyState } | null>(null);
  const [saveErr, setSaveErr] = useState(false);
  const stateRef = useRef(s);
  useEffect(() => {
    stateRef.current = s;
  }, [s]);

  useEffect(() => {
    const saved = load();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restore saved counters after mount (SSR renders the default)
    if (saved) setS(saved);
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- storage failure is only known after trying to save
      setSaveErr(true);
    }
  }, [s, loaded]);
  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 10_000);
    return () => clearTimeout(t);
  }, [undo]);

  const active = s.counters.find((c) => c.id === s.active) ?? s.counters[0];
  const total = s.counters.reduce((a, c) => a + c.count, 0);

  const change = useCallback(
    (delta: number, counterId?: string) => {
      const cur = stateRef.current;
      const cid = counterId ?? cur.active;
      const target = cur.counters.find((c) => c.id === cid);
      if (!target) return;
      const next = target.count + delta * cur.step;
      const ns = { ...cur, active: cid, counters: cur.counters.map((c) => (c.id === cid ? { ...c, count: next } : c)) };
      stateRef.current = ns;
      setS(ns);
      announce(`${target.name}: ${next}`);
      used(delta > 0 ? "increment" : "decrement");
    },
    [announce, used],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.closest("input, textarea, select, [contenteditable='true']") || t.isContentEditable)) return;
      // Space and Enter belong to a focused button or link (they activate it); other keys still count.
      if (t && t.closest("button, a, summary") && (e.key === " " || e.key === "Enter")) return;
      if (e.key === " " || e.key === "Enter" || e.key === "+" || e.key === "=" || e.key === "ArrowUp") {
        e.preventDefault();
        change(1);
      } else if (e.key === "-" || e.key === "ArrowDown") {
        e.preventDefault();
        change(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [change]);

  const reset = (which: "active" | "all") => {
    setUndo({ label: which === "all" ? "All counters reset" : `${active.name} reset`, state: s });
    setS({ ...s, counters: s.counters.map((c) => (which === "all" || c.id === active.id ? { ...c, count: 0 } : c)) });
    announce(which === "all" ? "All counters reset to 0. Undo is available for 10 seconds." : `${active.name} reset to 0. Undo is available for 10 seconds.`);
  };
  const addCounter = () => {
    if (s.counters.length >= 20) return;
    const c = { id: newId(), name: `Counter ${s.counters.length + 1}`, count: 0 };
    setS({ ...s, counters: [...s.counters, c], active: c.id });
    announce(`${c.name} added and selected`);
  };
  const removeCounter = (cid: string) => {
    if (s.counters.length < 2) return;
    const gone = s.counters.find((c) => c.id === cid);
    const counters = s.counters.filter((c) => c.id !== cid);
    setUndo({ label: `${gone?.name ?? "Counter"} removed`, state: s });
    setS({ ...s, counters, active: s.active === cid ? counters[0].id : s.active });
    announce(`${gone?.name ?? "Counter"} removed. Undo is available for 10 seconds.`);
  };
  const csv = () => "Counter,Count\n" + s.counters.map((c) => `"${c.name.replace(/"/g, '""')}",${c.count}`).join("\n") + `\n"Total",${total}\n`;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="grid content-start gap-3">
        <div className="panel grid gap-3 p-3 sm:p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold">{active.name}</h2>
            <span className="text-sm text-ink-3">
              Step {s.step} · {s.counters.length > 1 ? `total of all counters ${total.toLocaleString("en-US")}` : "1 counter"}
            </span>
          </div>
          <p className="text-center text-7xl font-semibold tabular-nums sm:text-8xl">
            {active.count.toLocaleString("en-US")}
          </p>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2.2fr)] gap-3">
            <button type="button" className="btn btn-secondary min-h-[120px] text-3xl" aria-label={`Count down ${active.name} by ${s.step}`} onClick={() => change(-1)}>
              −{s.step}
            </button>
            <button type="button" className="btn btn-primary min-h-[120px] text-4xl" aria-label={`Count up ${active.name} by ${s.step}`} onClick={() => change(1)}>
              +{s.step}
            </button>
          </div>
          <p className="text-center text-sm text-ink-3">
            Keyboard: <kbd className="kbd">Space</kbd>, <kbd className="kbd">Enter</kbd> or <kbd className="kbd">+</kbd> counts up; <kbd className="kbd">−</kbd> or{" "}
            <kbd className="kbd">↓</kbd> counts down.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button icon="rotate-ccw" onClick={() => reset("active")} disabled={active.count === 0}>
              Reset to 0
            </Button>
            {s.counters.length > 1 && (
              <Button variant="ghost" icon="rotate-ccw" onClick={() => reset("all")} disabled={s.counters.every((c) => c.count === 0)}>
                Reset all
              </Button>
            )}
            {undo && (
              <span className="flex items-center gap-2 text-sm">
                {undo.label}.
                <button
                  type="button"
                  className="font-semibold text-accent underline"
                  onClick={() => {
                    setS(undo.state);
                    setUndo(null);
                    announce("Undone");
                  }}
                >
                  Undo
                </button>
              </span>
            )}
          </div>
          {s.marks && (
            <div className="border-t border-line pt-3">
              <TallyMarks n={active.count} />
            </div>
          )}
        </div>
        <Alert tone="info">
          Counts are saved automatically in this browser on this device (local storage). They aren&apos;t sent to us. Clearing site data or using a private
          window removes them; use <strong>Download CSV</strong> to keep a record.
        </Alert>
        {saveErr && (
          <div role="alert">
            <Alert tone="warning">This browser blocked saving, so the counts will be lost when you close the page.</Alert>
          </div>
        )}
      </div>

      <div className="grid content-start gap-3">
        <div className="panel p-3">
          <p className="text-sm font-semibold">Counters</p>
          <ul className="mt-2 grid gap-2">
            {s.counters.map((c, i) => (
              <li key={c.id} className={`grid gap-1.5 rounded-md border p-2 ${c.id === active.id ? "border-accent" : "border-line"}`}>
                <div className="flex items-center gap-2">
                  <label htmlFor={`${id}-n${i}`} className="sr-only">
                    Name of counter {i + 1}
                  </label>
                  <input
                    id={`${id}-n${i}`}
                    className="input min-w-0 flex-1"
                    value={c.name}
                    maxLength={60}
                    onChange={(e) => setS({ ...s, counters: s.counters.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x)) })}
                  />
                  <span className="min-w-12 text-right text-lg font-semibold tabular-nums">{c.count.toLocaleString("en-US")}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button variant={c.id === active.id ? "primary" : "secondary"} aria-pressed={c.id === active.id} onClick={() => setS({ ...s, active: c.id })}>
                    {c.id === active.id ? "Selected" : "Select"}
                  </Button>
                  <Button aria-label={`Count up ${c.name}`} icon="plus" onClick={() => change(1, c.id)} />
                  <Button aria-label={`Count down ${c.name}`} icon="minus" onClick={() => change(-1, c.id)} />
                  {s.counters.length > 1 && (
                    <Button variant="ghost" icon="trash" aria-label={`Remove ${c.name}`} onClick={() => removeCounter(c.id)}>
                      Remove
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <Button className="mt-2" icon="plus" onClick={addCounter} disabled={s.counters.length >= 20}>
            Add counter
          </Button>
        </div>
        <div className="panel grid gap-2 p-3">
          <Field label="Step (amount per tap)" htmlFor={`${id}-step`} className="w-40">
            <input
              id={`${id}-step`}
              type="number"
              min={1}
              max={1000}
              className="input"
              value={s.step}
              onChange={(e) => setS({ ...s, step: Math.max(1, Math.min(1000, Math.trunc(Number(e.target.value) || 1))) })}
            />
          </Field>
          <Checkbox checked={s.marks} onChange={(v) => setS({ ...s, marks: v })} label="Show tally marks" />
          <div>
            <DownloadButton data={csv} filename={() => `tally-${stamp()}.csv`} mime="text/csv;charset=utf-8" label="Download CSV" />
          </div>
        </div>
      </div>
    </div>
  );
}
