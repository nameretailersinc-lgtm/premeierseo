"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { useTool } from "../ui/ToolContext";
import { Alert, Button, Checkbox, CopyButton, DownloadButton, Field, Panel, Segmented, stamp, useDebounced, usePersistentOptions, useSessionText } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { numberList, randomNumbers, type ListFilter, type ListKind, type SortOrder } from "../lib/text/numbers";
import { buildPool, entropyBits, randomStrings, shuffleText, MAX_STRING_COUNT, MAX_STRING_LENGTH, type ShuffleMode } from "../lib/text/strings";
import { lorem, type LoremUnit } from "../lib/text/lorem";
import { plural } from "../lib/text/random";

/*
 * Generators without text input: random numbers, random strings (+ shuffle my text),
 * number lists and lorem ipsum. config.mode selects one: "number" | "string" | "list" | "lorem".
 * Randomness: crypto.getRandomValues through lib/text/random (never Math.random).
 */

const SEPS: Record<string, string> = { newline: "\n", comma: ", ", space: " ", tab: "\t" };
const SEP_OPTIONS = [
  { value: "newline", label: "New line" },
  { value: "comma", label: "Comma" },
  { value: "space", label: "Space" },
  { value: "tab", label: "Tab" },
];
const num = (v: string | number) => (String(v).trim() === "" ? NaN : Number(v));

function Output({
  title,
  value,
  note,
  filename,
  empty,
  big,
}: {
  title: string;
  value: string;
  note?: ReactNode;
  filename: string;
  empty: string;
  big?: boolean;
}) {
  const id = useId();
  return (
    <Panel
      tone="accent"
      icon="circle-check"
      title={<span id={id}>{title}</span>}
      actions={
        <>
          <CopyButton text={value} disabled={!value} variant="primary" />
          <DownloadButton data={() => value} filename={filename} disabled={!value} />
        </>
      }
      footer={note ? <span>{note}</span> : undefined}
    >
      {big && value ? (
        <p className="flex min-h-48 items-center justify-center p-4 text-center text-6xl font-semibold break-all tabular-nums" aria-labelledby={id}>
          {value}
        </p>
      ) : (
        <textarea
          aria-labelledby={id}
          readOnly
          className="textarea mono rounded-none border-0"
          style={{ ["--ta-min" as string]: "12rem", ["--ta-min-lg" as string]: "16rem" }}
          value={value}
          placeholder={empty}
        />
      )}
    </Panel>
  );
}

function ErrorBox({ msg }: { msg: string | null | undefined }) {
  if (!msg) return null;
  return (
    <div role="alert">
      <Alert tone="danger">{msg}</Alert>
    </div>
  );
}

/* ---------- Random numbers ---------- */

const NUM_DEFAULTS = { min: "1", max: "100", count: "1", unique: true, decimals: 0, sort: "none" as SortOrder, sep: "newline" };
const NUM_PRESETS: { label: string; min: string; max: string; count: string; unique: boolean; sort: SortOrder }[] = [
  { label: "1 to 10", min: "1", max: "10", count: "1", unique: true, sort: "none" },
  { label: "1 to 100", min: "1", max: "100", count: "1", unique: true, sort: "none" },
  { label: "Roll a die (1–6)", min: "1", max: "6", count: "1", unique: false, sort: "none" },
  { label: "Lottery: 6 of 1–49", min: "1", max: "49", count: "6", unique: true, sort: "asc" },
];

function NumberGen({ toolId }: { toolId: string }) {
  const id = useId();
  const { used, announce, completed, error: trackError } = useTool();
  const [o, setO, reset] = usePersistentOptions(toolId, NUM_DEFAULTS);
  const [out, setOut] = useState<{ values: string[]; at: string; range: string; possible: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const generate = (opts = o) => {
    used("generate");
    try {
      const r = randomNumbers({ min: num(opts.min), max: num(opts.max), count: num(opts.count), unique: opts.unique, decimals: Number(opts.decimals), sort: opts.sort });
      if (r.error) {
        setErr(r.error);
        trackError("INVALID_RANGE", "generate");
        return;
      }
      setErr(null);
      setOut({ values: r.values, at: new Date().toLocaleTimeString(), range: `${opts.min} to ${opts.max}`, possible: r.possible });
      announce(r.values.length === 1 ? `Your number is ${r.values[0]}` : `${r.values.length} numbers generated`);
      completed("generate", { count: r.values.length });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't generate numbers in this browser.");
      trackError("NO_CRYPTO", "generate");
    }
  };

  const value = out ? out.values.join(SEPS[o.sep] ?? "\n") : "";
  return (
    <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <div className="panel grid content-start gap-4 p-3 sm:p-4">
        <div>
          <p className="field-label">Quick picks</p>
          <div className="flex flex-wrap gap-1.5">
            {NUM_PRESETS.map((p) => (
              <Button
                key={p.label}
                onClick={() => {
                  const next = { ...o, min: p.min, max: p.max, count: p.count, unique: p.unique, sort: p.sort, decimals: 0 };
                  setO(next);
                  generate(next);
                }}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Minimum" htmlFor={`${id}-min`}>
            <input id={`${id}-min`} className="input" inputMode="decimal" value={o.min} onChange={(e) => setO({ ...o, min: e.target.value })} />
          </Field>
          <Field label="Maximum" htmlFor={`${id}-max`}>
            <input id={`${id}-max`} className="input" inputMode="decimal" value={o.max} onChange={(e) => setO({ ...o, max: e.target.value })} />
          </Field>
          <Field label="How many numbers" htmlFor={`${id}-n`}>
            <input id={`${id}-n`} type="number" min={1} max={10000} className="input" value={o.count} onChange={(e) => setO({ ...o, count: e.target.value })} />
          </Field>
          <Field label="Decimal places" htmlFor={`${id}-d`}>
            <select id={`${id}-d`} className="select" value={o.decimals} onChange={(e) => setO({ ...o, decimals: Number(e.target.value) })}>
              {[0, 1, 2, 3, 4, 5, 6, 8, 10].map((d) => (
                <option key={d} value={d}>
                  {d === 0 ? "None (whole numbers)" : d}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Checkbox checked={o.unique} onChange={(v) => setO({ ...o, unique: v })} label="No repeats (unique numbers)" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sort" htmlFor={`${id}-s`}>
            <select id={`${id}-s`} className="select" value={o.sort} onChange={(e) => setO({ ...o, sort: e.target.value as SortOrder })}>
              <option value="none">In the order drawn</option>
              <option value="asc">Smallest first</option>
              <option value="desc">Largest first</option>
            </select>
          </Field>
          <Field label="Separate with" htmlFor={`${id}-sep`}>
            <select id={`${id}-sep`} className="select" value={o.sep} onChange={(e) => setO({ ...o, sep: e.target.value })}>
              {SEP_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="lg" icon="refresh" onClick={() => generate()}>
            Generate
          </Button>
          {JSON.stringify(o) !== JSON.stringify(NUM_DEFAULTS) && (
            <Button variant="ghost" icon="rotate-ccw" onClick={reset}>
              Reset options
            </Button>
          )}
        </div>
        <ErrorBox msg={err} />
      </div>
      <Output
        title="Result"
        value={value}
        big={out?.values.length === 1}
        filename={`random-numbers-${stamp()}.txt`}
        empty="Press Generate. Each value in the range has the same chance."
        note={out && `${plural(out.values.length, "number")} from ${out.range} (${out.possible.toLocaleString("en-US")} possible values) · generated at ${out.at}`}
      />
    </div>
  );
}

/* ---------- Random strings + shuffle my text ---------- */

const STR_DEFAULTS = {
  tab: "generate" as "generate" | "shuffle",
  length: "16",
  count: "5",
  upper: true,
  lower: true,
  digits: true,
  symbols: false,
  custom: "",
  excludeSimilar: false,
  unique: true,
  sep: "newline",
  shuffleMode: "characters" as ShuffleMode,
  perLine: false,
  keepSpaces: true,
};
const STR_PRESETS = [
  { label: "Alphanumeric", upper: true, lower: true, digits: true, symbols: false, custom: "" },
  { label: "Hex", upper: false, lower: false, digits: false, symbols: false, custom: "0123456789abcdef" },
  { label: "Letters only", upper: true, lower: true, digits: false, symbols: false, custom: "" },
  { label: "Digits only", upper: false, lower: false, digits: true, symbols: false, custom: "" },
  { label: "All printable", upper: true, lower: true, digits: true, symbols: true, custom: "" },
];

function StringGen({ toolId }: { toolId: string }) {
  const id = useId();
  const { used, announce, completed, error: trackError } = useTool();
  const [o, setO, reset] = usePersistentOptions(toolId, STR_DEFAULTS);
  const [text, setText] = useSessionText(toolId);
  const [values, setValues] = useState<string[]>([]);
  const [shuffled, setShuffled] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const pool = useMemo(() => buildPool(o), [o]);
  const bits = entropyBits(num(o.length) || 0, pool.length);

  const generate = () => {
    used("generate");
    try {
      const r = randomStrings({ ...o, length: num(o.length), count: num(o.count) });
      if (r.error) {
        setErr(r.error);
        trackError("INVALID_OPTIONS", "generate");
        return;
      }
      setErr(null);
      setValues(r.values);
      announce(`${plural(r.values.length, "string")} generated`);
      completed("generate", { count: r.values.length });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't generate strings in this browser.");
      trackError("NO_CRYPTO", "generate");
    }
  };
  const doShuffle = () => {
    if (!text.trim()) {
      setErr("Type or paste some text to shuffle.");
      return;
    }
    try {
      setErr(null);
      setShuffled(shuffleText(text, { mode: o.shuffleMode, perLine: o.perLine, keepSpaces: o.keepSpaces }));
      announce("Text shuffled");
      completed("shuffle");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't shuffle the text.");
    }
  };

  return (
    <div className="grid gap-4">
      <Segmented
        legend="Mode"
        hideLegend
        value={o.tab}
        onChange={(v) => {
          setO({ ...o, tab: v });
          setErr(null);
        }}
        options={[
          { value: "generate", label: "Generate random strings" },
          { value: "shuffle", label: "Shuffle my text" },
        ]}
      />
      {o.tab === "generate" ? (
        <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <div className="panel grid content-start gap-4 p-3 sm:p-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Length" htmlFor={`${id}-len`} help={`1–${MAX_STRING_LENGTH} characters`}>
                <input id={`${id}-len`} type="number" min={1} max={MAX_STRING_LENGTH} className="input" value={o.length} onChange={(e) => setO({ ...o, length: e.target.value })} />
              </Field>
              <Field label="How many strings" htmlFor={`${id}-cnt`} help={`Up to ${MAX_STRING_COUNT}`}>
                <input id={`${id}-cnt`} type="number" min={1} max={MAX_STRING_COUNT} className="input" value={o.count} onChange={(e) => setO({ ...o, count: e.target.value })} />
              </Field>
            </div>
            <div>
              <p className="field-label">Presets</p>
              <div className="flex flex-wrap gap-1.5">
                {STR_PRESETS.map((p) => (
                  <Button key={p.label} onClick={() => setO({ ...o, upper: p.upper, lower: p.lower, digits: p.digits, symbols: p.symbols, custom: p.custom })}>
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>
            <fieldset className="grid">
              <legend className="field-label">Characters to use</legend>
              <Checkbox checked={o.upper} onChange={(v) => setO({ ...o, upper: v })} label="Uppercase A–Z" />
              <Checkbox checked={o.lower} onChange={(v) => setO({ ...o, lower: v })} label="Lowercase a–z" />
              <Checkbox checked={o.digits} onChange={(v) => setO({ ...o, digits: v })} label="Digits 0–9" />
              <Checkbox checked={o.symbols} onChange={(v) => setO({ ...o, symbols: v })} label="Symbols" help="! @ # $ % ^ & * ( ) - _ = + [ ] { } ; : , . ? / ~" />
            </fieldset>
            <Field label="Also use these characters" htmlFor={`${id}-cus`} help="Duplicates and spaces are ignored">
              <input id={`${id}-cus`} className="input mono" value={o.custom} spellCheck={false} placeholder="e.g. abcdef0123456789" onChange={(e) => setO({ ...o, custom: e.target.value })} />
            </Field>
            <Checkbox checked={o.excludeSimilar} onChange={(v) => setO({ ...o, excludeSimilar: v })} label="Exclude look-alike characters" help="Removes I l 1 | O 0 o" />
            <Checkbox checked={o.unique} onChange={(v) => setO({ ...o, unique: v })} label="No duplicate strings" />
            <Field label="Separate strings with" htmlFor={`${id}-sep`} className="w-48">
              <select id={`${id}-sep`} className="select" value={o.sep} onChange={(e) => setO({ ...o, sep: e.target.value })}>
                {SEP_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <p className="text-sm text-ink-3">
              Pool: {plural(pool.length, "character")} · about {Math.floor(bits)} bits of randomness per string
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" size="lg" icon="refresh" onClick={generate}>
                Generate
              </Button>
              {JSON.stringify(o) !== JSON.stringify({ ...STR_DEFAULTS, tab: o.tab }) && (
                <Button variant="ghost" icon="rotate-ccw" onClick={reset}>
                  Reset options
                </Button>
              )}
            </div>
            <ErrorBox msg={err} />
          </div>
          <Output
            title="Random strings"
            value={values.join(SEPS[o.sep] ?? "\n")}
            filename={`random-strings-${stamp()}.txt`}
            empty="Press Generate."
            note={values.length ? `${plural(values.length, "string")} of ${plural(values[0].length, "character")}` : undefined}
          />
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="panel flex flex-wrap items-end gap-x-6 gap-y-3 p-3 sm:p-4">
            <Segmented
              legend="Shuffle"
              value={o.shuffleMode}
              onChange={(v) => setO({ ...o, shuffleMode: v })}
              options={[
                { value: "characters", label: "All characters" },
                { value: "letters-in-words", label: "Letters inside each word" },
                { value: "words", label: "Word order" },
              ]}
            />
            <Checkbox checked={o.perLine} onChange={(v) => setO({ ...o, perLine: v })} label="Shuffle each line separately" />
            {o.shuffleMode === "characters" && <Checkbox checked={o.keepSpaces} onChange={(v) => setO({ ...o, keepSpaces: v })} label="Keep spaces in place" />}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel
              as="div"
              title={<label htmlFor={`${id}-txt`}>Text to shuffle</label>}
              actions={
                <>
                  <Button
                    variant="ghost"
                    icon="sparkles"
                    onClick={() => {
                      setText("The quick brown fox jumps over the lazy dog.\nPack my box with five dozen liquor jugs.");
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
            >
              <textarea
                id={`${id}-txt`}
                className="textarea rounded-none border-0"
                style={{ ["--ta-min" as string]: "12rem", ["--ta-min-lg" as string]: "16rem" }}
                value={text}
                placeholder="Type or paste text"
                onChange={(e) => {
                  setText(e.target.value);
                  used("type");
                }}
              />
            </Panel>
            <div className="grid content-start gap-3">
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" size="lg" icon="shuffle" onClick={doShuffle}>
                  {shuffled ? "Shuffle again" : "Shuffle text"}
                </Button>
              </div>
              <ErrorBox msg={err} />
              <Output title="Shuffled text" value={shuffled} filename={`shuffled-${stamp()}.txt`} empty="The shuffled text appears here." />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Number list ---------- */

const LIST_DEFAULTS = {
  kind: "sequence" as ListKind,
  start: "1",
  end: "100",
  step: "1",
  filter: "all" as ListFilter,
  pad: "0",
  prefix: "",
  suffix: "",
  sep: "newline",
  customSep: " | ",
  reverse: false,
};

function ListGen({ toolId }: { toolId: string }) {
  const id = useId();
  const { used } = useTool();
  const [o, setO, reset] = usePersistentOptions(toolId, LIST_DEFAULTS);
  const d = useDebounced(o, 150);
  const res = useMemo(
    () =>
      numberList({
        kind: d.kind,
        start: num(d.start),
        end: num(d.end),
        step: num(d.step),
        filter: d.filter,
        pad: num(d.pad) || 0,
        prefix: d.prefix,
        suffix: d.suffix,
        separator: d.sep === "custom" ? d.customSep.replace(/\\n/g, "\n").replace(/\\t/g, "\t") : (SEPS[d.sep] ?? "\n"),
        reverse: d.reverse,
      }),
    [d],
  );
  const set = (patch: Partial<typeof LIST_DEFAULTS>) => {
    setO({ ...o, ...patch });
    used("options");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <div className="panel grid content-start gap-4 p-3 sm:p-4">
        <Segmented
          legend="Numbers"
          value={o.kind}
          onChange={(v) => set({ kind: v })}
          options={[
            { value: "sequence", label: "Sequence" },
            { value: "primes", label: "Primes" },
            { value: "fibonacci", label: "Fibonacci" },
          ]}
        />
        <div className="grid grid-cols-3 gap-3">
          <Field label="Start" htmlFor={`${id}-a`}>
            <input id={`${id}-a`} className="input" inputMode="decimal" value={o.start} onChange={(e) => set({ start: e.target.value })} />
          </Field>
          <Field label="End" htmlFor={`${id}-b`}>
            <input id={`${id}-b`} className="input" inputMode="decimal" value={o.end} onChange={(e) => set({ end: e.target.value })} />
          </Field>
          {o.kind === "sequence" && (
            <Field label="Step" htmlFor={`${id}-st`}>
              <input id={`${id}-st`} className="input" inputMode="decimal" value={o.step} onChange={(e) => set({ step: e.target.value })} />
            </Field>
          )}
        </div>
        {o.kind === "sequence" && (
          <Field label="Include" htmlFor={`${id}-f`} className="w-56">
            <select id={`${id}-f`} className="select" value={o.filter} onChange={(e) => set({ filter: e.target.value as ListFilter })}>
              <option value="all">Every number in the sequence</option>
              <option value="even">Even numbers only</option>
              <option value="odd">Odd numbers only</option>
            </select>
          </Field>
        )}
        <div className="grid grid-cols-3 gap-3">
          <Field label="Min. digits" htmlFor={`${id}-pad`} help="Leading zeros">
            <input id={`${id}-pad`} type="number" min={0} max={30} className="input" value={o.pad} onChange={(e) => set({ pad: e.target.value })} />
          </Field>
          <Field label="Prefix" htmlFor={`${id}-pre`}>
            <input id={`${id}-pre`} className="input" value={o.prefix} placeholder="e.g. #" onChange={(e) => set({ prefix: e.target.value })} />
          </Field>
          <Field label="Suffix" htmlFor={`${id}-suf`}>
            <input id={`${id}-suf`} className="input" value={o.suffix} placeholder="e.g. ." onChange={(e) => set({ suffix: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Separate with" htmlFor={`${id}-sep`}>
            <select id={`${id}-sep`} className="select" value={o.sep} onChange={(e) => set({ sep: e.target.value })}>
              {[...SEP_OPTIONS, { value: "custom", label: "Custom…" }].map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          {o.sep === "custom" && (
            <Field label="Custom separator" htmlFor={`${id}-cs`} help="\n = new line, \t = tab">
              <input id={`${id}-cs`} className="input mono" value={o.customSep} onChange={(e) => set({ customSep: e.target.value })} />
            </Field>
          )}
        </div>
        <Checkbox checked={o.reverse} onChange={(v) => set({ reverse: v })} label="Reverse the order" />
        {JSON.stringify(o) !== JSON.stringify(LIST_DEFAULTS) && (
          <div>
            <Button variant="ghost" icon="rotate-ccw" onClick={reset}>
              Reset options
            </Button>
          </div>
        )}
      </div>
      <div className="grid content-start gap-3">
        <ErrorBox msg={res.error} />
        <Output title="Number list" value={res.error ? "" : res.output} filename={`numbers-${stamp()}.txt`} empty="Set a start and an end." note={res.error ? undefined : plural(res.count, "number")} />
      </div>
    </div>
  );
}

/* ---------- Lorem ipsum ---------- */

const LOREM_DEFAULTS = { unit: "paragraphs" as LoremUnit, count: "3", startWithLorem: true, html: false };
const LOREM_MAX: Record<LoremUnit, number> = { paragraphs: 100, sentences: 500, words: 10000, list: 500 };

function LoremGen({ toolId }: { toolId: string }) {
  const id = useId();
  const { used, announce, completed } = useTool();
  const [o, setO, reset] = usePersistentOptions(toolId, LOREM_DEFAULTS);
  const [text, setText] = useState("");
  const d = useDebounced(o, 200);

  const generate = (announceIt: boolean) => {
    const count = Math.max(1, Math.min(LOREM_MAX[d.unit], Math.floor(num(d.count) || 1)));
    const t = lorem({ unit: d.unit, count, startWithLorem: d.startWithLorem, html: d.html });
    setText(t);
    if (announceIt) {
      announce("New placeholder text generated");
      completed("generate");
    }
  };
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- random text must be generated on the client only (SSR shows the empty state)
    generate(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d]);

  const words = text ? text.replace(/<[^>]+>/g, " ").split(/\s+/).filter((w) => /[a-z]/i.test(w)).length : 0;
  return (
    <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <div className="panel grid content-start gap-4 p-3 sm:p-4">
        <Segmented
          legend="Generate"
          value={o.unit}
          onChange={(v) => {
            setO({ ...o, unit: v, count: v === "words" ? "50" : v === "paragraphs" ? "3" : "5" });
            used("options");
          }}
          options={[
            { value: "paragraphs", label: "Paragraphs" },
            { value: "sentences", label: "Sentences" },
            { value: "words", label: "Words" },
            { value: "list", label: "List items" },
          ]}
        />
        <Field label={`How many ${o.unit === "list" ? "list items" : o.unit}`} htmlFor={`${id}-n`} help={`1 to ${LOREM_MAX[o.unit].toLocaleString("en-US")}`} className="w-48">
          <input id={`${id}-n`} type="number" min={1} max={LOREM_MAX[o.unit]} className="input" value={o.count} onChange={(e) => setO({ ...o, count: e.target.value })} />
        </Field>
        <Checkbox checked={o.startWithLorem} onChange={(v) => setO({ ...o, startWithLorem: v })} label="Start with “Lorem ipsum dolor sit amet…”" />
        <Checkbox checked={o.html} onChange={(v) => setO({ ...o, html: v })} label={o.unit === "list" ? "Output HTML (<ul> and <li> tags)" : "Output HTML (<p> tags)"} />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            size="lg"
            icon="refresh"
            onClick={() => {
              used("generate");
              generate(true);
            }}
          >
            Generate new text
          </Button>
          {JSON.stringify(o) !== JSON.stringify(LOREM_DEFAULTS) && (
            <Button variant="ghost" icon="rotate-ccw" onClick={reset}>
              Reset options
            </Button>
          )}
        </div>
      </div>
      <Output
        title={o.html ? "Placeholder HTML" : "Placeholder text"}
        value={text}
        filename={o.html ? `lorem-ipsum-${stamp()}.html` : `lorem-ipsum-${stamp()}.txt`}
        empty="Generating…"
        note={text ? `${plural(words, "word")} · ${text.length.toLocaleString("en-US")} characters` : undefined}
      />
    </div>
  );
}

export default function RandomGenerators({ toolId, config }: WidgetProps) {
  const mode = String(config?.mode ?? "number");
  if (mode === "string") return <StringGen toolId={toolId} />;
  if (mode === "list") return <ListGen toolId={toolId} />;
  if (mode === "lorem") return <LoremGen toolId={toolId} />;
  return <NumberGen toolId={toolId} />;
}
