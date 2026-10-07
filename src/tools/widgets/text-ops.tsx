"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { TransformTool, type Opts, type TransformDef } from "../ui/TransformTool";
import { useTool } from "../ui/ToolContext";
import { Alert, Button, Checkbox, Field, Segmented, useDebounced, usePersistentOptions, useSessionText } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { TEXT_OPS } from "../lib/text/ops";
import { findReplace, type ReplaceRule } from "../lib/text/replace";
import { looksLikeMorse, MORSE, morseSchedule, morseToText, PROSIGNS, textToMorse } from "../lib/text/morse";
import { Workbench } from "../lib/text/workbench";

/*
 * Line and text transforms (archetype A). Each op is a pure function plus its options.
 * Tool registry entries select an op with config.op and may preset option values with config.
 * Ops whose controls don't fit TransformTool (rule lists, audio) have their own component below.
 */

const lines = (s: string) => s.replace(/\r\n?/g, "\n").split("\n");
const plural = (n: number, w: string) => `${n.toLocaleString()} ${w}${n === 1 ? "" : "s"}`;

export const OPS: Record<string, TransformDef> = {
  "remove-duplicate-lines": {
    inputLabel: "Text with duplicate lines",
    outputLabel: "Unique lines",
    options: [
      {
        type: "segmented",
        key: "show",
        label: "Show",
        default: "unique",
        options: [
          { value: "unique", label: "Unique lines" },
          { value: "removed", label: "Removed duplicates" },
        ],
      },
      { type: "checkbox", key: "ignoreCase", label: "Ignore case", default: false, help: "Treat “Apple” and “apple” as duplicates" },
      { type: "checkbox", key: "trim", label: "Ignore leading and trailing spaces", default: true },
      { type: "checkbox", key: "removeEmpty", label: "Remove empty lines", default: true },
      {
        type: "select",
        key: "keep",
        label: "When a line repeats, keep",
        default: "first",
        options: [
          { value: "first", label: "The first occurrence" },
          { value: "last", label: "The last occurrence" },
          { value: "none", label: "No copies (only lines that never repeat)" },
        ],
      },
    ],
    sample: "apple\nbanana\nApple\ncherry\nbanana\n\ndate\ncherry ",
    run(input: string, o: Opts) {
      const src = lines(input);
      const key = (l: string) => {
        let k = o.trim ? l.trim() : l;
        if (o.ignoreCase) k = k.toLowerCase();
        return k;
      };
      const counts = new Map<string, number>();
      for (const l of src) counts.set(key(l), (counts.get(key(l)) ?? 0) + 1);
      const seen = new Set<string>();
      let out: string[] = [];
      const iter = o.keep === "last" ? [...src].reverse() : src;
      for (const l of iter) {
        const k = key(l);
        if (o.removeEmpty && !k) continue;
        if (o.keep === "none") {
          if (counts.get(k) === 1) out.push(l);
          continue;
        }
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(l);
      }
      if (o.keep === "last") out = out.reverse();
      const removed = src.length - out.length;
      if (o.show === "removed") {
        const dupes = [...counts.entries()].filter(([k, n]) => n > 1 && (k || !o.removeEmpty));
        return {
          output: dupes.map(([k, n]) => `${k || "(empty line)"}  ×${n}`).join("\n"),
          note: `${plural(dupes.length, "line")} appeared more than once`,
        };
      }
      return { output: out.join("\n"), note: `${plural(removed, "line")} removed · ${plural(out.length, "line")} kept` };
    },
  },
  ...TEXT_OPS,
};

/* ---------- Find and replace (several rules) ---------- */

interface FindOpts extends Record<string, unknown> {
  rules: ReplaceRule[];
  matchCase: boolean;
  wholeWord: boolean;
  regex: boolean;
  wholeLine: boolean;
  escapes: boolean;
}

const FIND_DEFAULTS: FindOpts = {
  rules: [{ find: "colour", replace: "color" }],
  matchCase: false,
  wholeWord: true,
  regex: false,
  wholeLine: false,
  escapes: true,
};
const FIND_SAMPLE = "The colour of the logo and the Colour of the buttons should match.\nWatercolours are a separate topic.";

function FindReplace({ toolId }: { toolId: string }) {
  const id = useId();
  const { announce } = useTool();
  const [input, setInput] = useSessionText(toolId);
  const [o, setO, reset] = usePersistentOptions<FindOpts>(toolId, FIND_DEFAULTS);
  const text = useDebounced(input, input.length > 50_000 ? 400 : 120);
  const rules = Array.isArray(o.rules) && o.rules.length ? o.rules : FIND_DEFAULTS.rules;
  const res = useMemo(() => (text ? findReplace(text, rules, o) : { output: "", counts: [] as number[] }), [text, rules, o]);
  const total = res.counts.reduce((a, b) => a + b, 0);
  const setRule = (i: number, patch: Partial<ReplaceRule>) => setO({ ...o, rules: rules.map((r, k) => (k === i ? { ...r, ...patch } : r)) });
  const firstFind = useRef<HTMLInputElement>(null);

  return (
    <Workbench
      toolId={toolId}
      input={input}
      setInput={setInput}
      sample={FIND_SAMPLE}
      output={res.output}
      error={res.error}
      inputLabel="Text to search"
      outputLabel="Text after replacing"
      note={text ? `${plural(total, "replacement")}${rules.length > 1 ? ` (${res.counts.map((c, i) => `rule ${i + 1}: ${c}`).join(", ")})` : ""}` : undefined}
      options={
        <div className="grid gap-4">
          <fieldset className="grid gap-3">
            <legend className="field-label">Replacement rules (applied top to bottom)</legend>
            {rules.map((r, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
                <Field label={rules.length > 1 ? `Find (rule ${i + 1})` : "Find"} htmlFor={`${id}-f${i}`}>
                  <input
                    id={`${id}-f${i}`}
                    ref={i === 0 ? firstFind : undefined}
                    className={`input ${o.regex ? "mono" : ""}`}
                    value={r.find}
                    spellCheck={false}
                    onChange={(e) => setRule(i, { find: e.target.value })}
                  />
                </Field>
                <Field label={rules.length > 1 ? `Replace with (rule ${i + 1})` : "Replace with"} htmlFor={`${id}-r${i}`}>
                  <input
                    id={`${id}-r${i}`}
                    className={`input ${o.regex ? "mono" : ""}`}
                    value={r.replace}
                    spellCheck={false}
                    placeholder="(leave empty to delete)"
                    onChange={(e) => setRule(i, { replace: e.target.value })}
                  />
                </Field>
                <Button
                  variant="ghost"
                  icon="trash"
                  disabled={rules.length < 2}
                  aria-label={`Remove rule ${i + 1}`}
                  onClick={() => {
                    setO({ ...o, rules: rules.filter((_, k) => k !== i) });
                    announce(`Rule ${i + 1} removed`);
                  }}
                >
                  Remove
                </Button>
              </div>
            ))}
            <div>
              <Button
                icon="plus"
                disabled={rules.length >= 20}
                onClick={() => {
                  setO({ ...o, rules: [...rules, { find: "", replace: "" }] });
                  announce(`Rule ${rules.length + 1} added`);
                }}
              >
                Add rule
              </Button>
            </div>
          </fieldset>
          <div className="flex flex-wrap items-end gap-x-6 gap-y-1">
            <Checkbox checked={o.matchCase} onChange={(v) => setO({ ...o, matchCase: v })} label="Match case" />
            <Checkbox checked={o.wholeWord} onChange={(v) => setO({ ...o, wholeWord: v })} label="Whole words only" />
            <Checkbox checked={o.regex} onChange={(v) => setO({ ...o, regex: v })} label="Regular expressions" help="$1 inserts a captured group" />
            <Checkbox checked={o.wholeLine} onChange={(v) => setO({ ...o, wholeLine: v })} label="Replace the whole line" help="Lines that contain a match become the replacement" />
            <Checkbox checked={o.escapes} onChange={(v) => setO({ ...o, escapes: v })} label="Read \n and \t as line break and tab" />
            {JSON.stringify(o) !== JSON.stringify(FIND_DEFAULTS) && (
              <Button variant="ghost" icon="rotate-ccw" onClick={reset}>
                Reset options
              </Button>
            )}
          </div>
        </div>
      }
    />
  );
}

/* ---------- Morse code ---------- */

interface MorseOpts extends Record<string, unknown> {
  dir: "auto" | "to-morse" | "to-text";
  wpm: number;
  eff: number;
  freq: number;
}

const MORSE_DEFAULTS: MorseOpts = { dir: "auto", wpm: 20, eff: 20, freq: 600 };

function MorseTool({ toolId }: { toolId: string }) {
  const id = useId();
  const { announce, completed, error: trackError } = useTool();
  const [input, setInput] = useSessionText(toolId);
  const [o, setO] = usePersistentOptions<MorseOpts>(toolId, MORSE_DEFAULTS);
  const text = useDebounced(input, 120);
  const toMorse = o.dir === "to-morse" || (o.dir === "auto" && !looksLikeMorse(text));
  const res = useMemo(() => (toMorse ? textToMorse(text) : morseToText(text)), [text, toMorse]);
  const code = toMorse ? res.output : text;
  const [playing, setPlaying] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const ctx = ctxRef.current;
    ctxRef.current = null;
    if (ctx) void ctx.close().catch(() => {});
    setPlaying(false);
  };
  useEffect(() => () => stop(), []); // stop audio when leaving the page

  const play = () => {
    stop();
    setAudioError(null);
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) {
      setAudioError("This browser can't play audio generated on the page (no Web Audio support).");
      trackError("NO_WEB_AUDIO", "play");
      return;
    }
    const wpm = Math.min(40, Math.max(5, Number(o.wpm) || 20));
    const eff = Math.min(wpm, Math.max(3, Number(o.eff) || wpm));
    const { tones, total } = morseSchedule(code.replace(/[^.\-/\s]/g, " "), wpm, eff);
    if (!tones.length) return;
    const ctx = new AC();
    ctxRef.current = ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = Math.min(1000, Math.max(300, Number(o.freq) || 600));
    gain.gain.value = 0;
    osc.connect(gain).connect(ctx.destination);
    const t0 = ctx.currentTime + 0.1;
    const ramp = 0.004;
    for (const t of tones) {
      gain.gain.setValueAtTime(0, t0 + t.start);
      gain.gain.linearRampToValueAtTime(0.5, t0 + t.start + ramp);
      gain.gain.setValueAtTime(0.5, t0 + t.start + t.dur - ramp);
      gain.gain.linearRampToValueAtTime(0, t0 + t.start + t.dur);
    }
    osc.start(t0);
    osc.stop(t0 + total + 0.1);
    setPlaying(true);
    announce(`Playing Morse code, about ${Math.ceil(total)} seconds`);
    completed("play");
    timer.current = setTimeout(stop, (total + 0.3) * 1000);
  };

  const note = text
    ? res.unknown.length
      ? `${toMorse ? "No Morse code for" : "Unknown code"}: ${res.unknown.slice(0, 8).join("  ")} (shown as #)`
      : toMorse
        ? "Letters separated by spaces, words by /"
        : "Decoded from International Morse code"
    : undefined;

  return (
    <Workbench
      toolId={toolId}
      input={input}
      setInput={setInput}
      sample="SOS. Help is on the way!"
      output={res.output}
      note={note}
      mono={!toMorse}
      inputLabel={toMorse ? "Text (or Morse code to decode)" : "Morse code"}
      outputLabel={toMorse ? "Morse code" : "Decoded text"}
      options={
        <Segmented
          legend="Translate"
          value={o.dir}
          onChange={(v) => setO({ ...o, dir: v })}
          options={[
            { value: "auto", label: "Detect automatically" },
            { value: "to-morse", label: "Text → Morse" },
            { value: "to-text", label: "Morse → text" },
          ]}
        />
      }
      below={
        <div className="grid gap-4">
          <div className="panel p-3 sm:p-4">
            <p className="text-sm font-semibold">Listen</p>
            <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-3">
              <Field label="Character speed (WPM)" htmlFor={`${id}-wpm`} className="w-40">
                <input id={`${id}-wpm`} type="number" className="input" min={5} max={40} value={o.wpm} onChange={(e) => setO({ ...o, wpm: Number(e.target.value) || 20 })} />
              </Field>
              <Field label="Overall speed (Farnsworth)" htmlFor={`${id}-eff`} className="w-48" help="Lower than character speed adds longer gaps">
                <input id={`${id}-eff`} type="number" className="input" min={3} max={40} value={o.eff} onChange={(e) => setO({ ...o, eff: Number(e.target.value) || 20 })} />
              </Field>
              <Field label="Tone (Hz)" htmlFor={`${id}-hz`} className="w-32">
                <input id={`${id}-hz`} type="number" className="input" min={300} max={1000} step={50} value={o.freq} onChange={(e) => setO({ ...o, freq: Number(e.target.value) || 600 })} />
              </Field>
              <div className="flex gap-2">
                <Button variant="primary" size="md" icon="play" disabled={!/[.-]/.test(code)} onClick={play}>
                  {playing ? "Restart" : "Play"}
                </Button>
                <Button size="md" icon="x" disabled={!playing} onClick={stop}>
                  Stop
                </Button>
              </div>
            </div>
            {audioError && (
              <div className="mt-3" role="alert">
                <Alert tone="danger">{audioError}</Alert>
              </div>
            )}
          </div>
          <details className="panel p-3 sm:p-4">
            <summary className="cursor-pointer text-sm font-semibold">International Morse code chart</summary>
            <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3 lg:grid-cols-4">
              {Object.entries(MORSE).map(([k, v]) => (
                <li key={k} className="flex justify-between gap-3 border-b border-line py-1">
                  <span className="font-semibold">{k}</span>
                  <span className="font-mono tracking-widest">{v}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm font-semibold">Prosigns (sent without letter gaps)</p>
            <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
              {Object.entries(PROSIGNS).map(([k, v]) => (
                <li key={k} className="flex justify-between gap-3 border-b border-line py-1">
                  <span>
                    <span className="font-semibold">{k}</span> – {v.meaning}
                  </span>
                  <span className="font-mono tracking-widest">{v.code}</span>
                </li>
              ))}
            </ul>
          </details>
        </div>
      }
    />
  );
}

export default function TextOps({ toolId, config }: WidgetProps) {
  const op = String(config?.op ?? "");
  if (op === "find-replace") return <FindReplace toolId={toolId} />;
  if (op === "morse") return <MorseTool toolId={toolId} />;
  const def = OPS[op];
  if (!def) return <p role="alert">Unknown text operation: {op}</p>;
  const presets: Opts = {};
  if (config) for (const [k, v] of Object.entries(config)) if (k !== "op" && (typeof v === "string" || typeof v === "number" || typeof v === "boolean")) presets[k] = v;
  return <TransformTool def={def} toolId={toolId} presets={presets} />;
}
