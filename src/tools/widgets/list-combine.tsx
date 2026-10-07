"use client";

import { useId, useMemo, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { Alert, Button, Checkbox, CopyButton, DownloadButton, Field, Panel, Segmented, stamp, useDebounced, usePersistentOptions, useSessionText } from "../ui/primitives";
import type { WidgetProps } from "../types";
import {
  blendWords,
  combinations,
  countCombinations,
  countDistinctPermutations,
  countPermutations,
  countProduct,
  permutations,
  product,
  take,
} from "../lib/text/combinatorics";
import { graphemes } from "../lib/text/random";

/*
 * List combiner engine: blend two words, combine lists (A × B × C), combinations (nCr),
 * permutations (nPr) and line-by-line merge. Each landing page picks its modes with
 * config { modes: [...], mode }. Large outputs show their size first and need a click.
 */

type Mode = "blend" | "lists" | "combinations" | "permutations" | "merge";
const MODE_LABEL: Record<Mode, string> = {
  blend: "Blend two words",
  lists: "Combine lists",
  combinations: "Combinations",
  permutations: "Permutations",
  merge: "Merge line by line",
};
const AUTO_LIMIT = 5_000;
const HARD_LIMIT = 500_000;

interface Data {
  lists: string[];
  w1: string;
  w2: string;
  items: string;
}
const EMPTY: Data = { lists: ["", ""], w1: "", w2: "", items: "" };

const SAMPLES: Record<Mode, Partial<Data>> = {
  blend: { w1: "breakfast", w2: "lunch" },
  lists: { lists: ["buy\ncheap\nbest price", "running shoes\ntrail shoes", "online\nnear me"] },
  combinations: { items: "Ana\nBen\nCara\nDev\nEli" },
  permutations: { items: "abc" },
  merge: { lists: ["Ana\nBen\nCara", "Silva\nOkafor\nLee"] },
};

const SEPS = [
  { value: "space", label: "Space", v: " " },
  { value: "none", label: "Nothing", v: "" },
  { value: "comma", label: "Comma and space", v: ", " },
  { value: "hyphen", label: "Hyphen -", v: "-" },
  { value: "underscore", label: "Underscore _", v: "_" },
  { value: "tab", label: "Tab", v: "\t" },
  { value: "custom", label: "Custom…", v: "" },
];

interface Opts extends Record<string, unknown> {
  mode: Mode;
  sep: string;
  customSep: string;
  prefix: string;
  suffix: string;
  bothOrders: boolean;
  sort: "none" | "az" | "length";
  r: number;
  repetition: boolean;
  letters: boolean;
  unique: boolean;
  mergeMode: "pairs" | "interleave" | "join";
  uneven: "empty" | "skip" | "shortest";
  trim: boolean;
}

const splitItems = (s: string, trim: boolean) =>
  s
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => (trim ? l.trim() : l))
    .filter((l) => l !== "");

interface Plan {
  count: bigint;
  exact: boolean;
  run: () => string[];
  note?: string;
  error?: string;
}

function planFor(d: Data, o: Opts, sep: string): Plan | null {
  const t = o.trim;
  if (o.mode === "lists") {
    const lists = d.lists.map((l) => splitItems(l, t)).filter((l) => l.length);
    if (lists.length < 2) return null;
    const both = o.bothOrders && lists.length === 2;
    const count = countProduct(lists) * BigInt(both ? 2 : 1);
    return {
      count,
      exact: true,
      run: () => {
        const rows = take(product(lists), HARD_LIMIT).map((p) => o.prefix + p.join(sep) + o.suffix);
        if (both) rows.push(...take(product([lists[1], lists[0]]), HARD_LIMIT).map((p) => o.prefix + p.join(sep) + o.suffix));
        return rows;
      },
    };
  }
  if (o.mode === "combinations") {
    const items = splitItems(d.items, t);
    const r = Math.floor(Number(o.r) || 0);
    if (!items.length) return null;
    if (r < 1) return { count: BigInt(0), exact: true, run: () => [], error: "Enter a group size of 1 or more." };
    if (!o.repetition && r > items.length) return { count: BigInt(0), exact: true, run: () => [], error: `You can't choose ${r} from ${items.length} items without repetition.` };
    return { count: countCombinations(items.length, r, o.repetition), exact: true, run: () => take(combinations(items, r, o.repetition), HARD_LIMIT).map((c) => c.join(sep)) };
  }
  if (o.mode === "permutations") {
    const items = o.letters ? graphemes(d.items.replace(/\s+/g, "")) : splitItems(d.items, t);
    if (!items.length) return null;
    const r = Number(o.r) ? Math.floor(Number(o.r)) : items.length;
    if (r < 1) return { count: BigInt(0), exact: true, run: () => [], error: "Enter a length of 1 or more." };
    if (!o.repetition && r > items.length) return { count: BigInt(0), exact: true, run: () => [], error: `You can't arrange ${r} of ${items.length} items without repetition.` };
    const hasDupes = new Set(items).size < items.length;
    const full = countPermutations(items.length, r, o.repetition);
    const count = o.unique && hasDupes && !o.repetition && r === items.length ? countDistinctPermutations(items) : full;
    const exact = !(o.unique && hasDupes && (o.repetition || r !== items.length));
    return {
      count: o.unique && o.repetition ? countPermutations(new Set(items).size, r, true) : count,
      exact: exact || (o.unique && o.repetition),
      run: () => {
        const src = o.unique && o.repetition ? [...new Set(items)] : items;
        const gen = permutations(src, r, o.repetition);
        if (!o.unique || !hasDupes || o.repetition) return take(gen, HARD_LIMIT).map((p) => p.join(sep));
        const seen = new Set<string>();
        for (const p of gen) {
          const k = p.join(sep);
          seen.add(k);
          if (seen.size >= HARD_LIMIT) break;
        }
        return [...seen];
      },
      note: hasDupes && !o.unique ? "Your items repeat, so some arrangements are identical; tick “Unique results only” to drop them." : undefined,
    };
  }
  if (o.mode === "merge") {
    const lists = d.lists.map((l) => splitItems(l, t));
    const used = lists.filter((l) => l.length);
    if (!used.length) return null;
    if (o.mergeMode === "join") {
      const all = used.flat();
      return { count: BigInt(1), exact: true, run: () => [all.join(sep)], note: `${all.length.toLocaleString()} lines joined into one` };
    }
    const max = Math.max(...used.map((l) => l.length));
    const min = Math.min(...used.map((l) => l.length));
    const rows = o.uneven === "shortest" ? min : max;
    return {
      count: BigInt(o.mergeMode === "interleave" ? used.reduce((a, l) => a + Math.min(l.length, rows), 0) : rows),
      exact: true,
      run: () => {
        const out: string[] = [];
        for (let i = 0; i < rows; i++) {
          const cells = used.map((l) => (i < l.length ? l[i] : null));
          if (o.mergeMode === "interleave") cells.forEach((c) => c !== null && out.push(c));
          else {
            const vals = o.uneven === "skip" ? cells.filter((c): c is string => c !== null) : cells.map((c) => c ?? "");
            out.push(vals.join(sep));
          }
        }
        return out;
      },
      note: min !== max ? `Lists have different lengths (${used.map((l) => l.length).join(", ")} lines)` : undefined,
    };
  }
  return null;
}

function ListArea({ id, label, value, onChange, onRemove }: { id: string; label: string; value: string; onChange: (v: string) => void; onRemove?: () => void }) {
  return (
    <Panel
      as="div"
      title={<label htmlFor={id}>{label}</label>}
      actions={
        onRemove && (
          <Button variant="ghost" icon="trash" onClick={onRemove} aria-label={`Remove ${label}`}>
            Remove
          </Button>
        )
      }
      footer={<span>{splitItems(value, true).length.toLocaleString()} items</span>}
    >
      <textarea
        id={id}
        className="textarea rounded-none border-0"
        style={{ ["--ta-min" as string]: "9rem" }}
        placeholder="One item per line"
        value={value}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
      />
    </Panel>
  );
}

export default function ListCombine({ toolId, config }: WidgetProps) {
  const id = useId();
  const { used, announce, completed } = useTool();
  const modes = (Array.isArray(config?.modes) ? config.modes : ["lists"]).filter((m): m is Mode => m in MODE_LABEL);
  const first: Mode = modes.includes(config?.mode as Mode) ? (config?.mode as Mode) : modes[0];
  const [o, setO, resetO] = usePersistentOptions<Opts>(toolId, {
    mode: first,
    sep: first === "merge" ? "space" : first === "combinations" || first === "permutations" ? "comma" : "space",
    customSep: " + ",
    prefix: "",
    suffix: "",
    bothOrders: false,
    sort: "none",
    r: first === "permutations" ? 0 : 2,
    repetition: false,
    letters: first === "permutations",
    unique: true,
    mergeMode: "pairs",
    uneven: "empty",
    trim: true,
  });
  const mode: Mode = modes.includes(o.mode) ? o.mode : first;
  const [raw, setRaw] = useSessionText(toolId, "");
  const data: Data = useMemo(() => {
    try {
      return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Data>) } : EMPTY;
    } catch {
      return EMPTY;
    }
  }, [raw]);
  const setData = (patch: Partial<Data>) => {
    setRaw(JSON.stringify({ ...data, ...patch }));
    used("type");
  };
  const d = useDebounced(data, 150);
  const sepDef = SEPS.find((s) => s.value === o.sep) ?? SEPS[0];
  const sep = o.sep === "custom" ? o.customSep.replace(/\\t/g, "\t").replace(/\\n/g, "\n") : o.mode === "permutations" && o.letters && o.sep === "comma" ? "" : sepDef.v;
  const optsKey = JSON.stringify({ ...o, mode });
  const plan = useMemo(() => {
    const opts = JSON.parse(optsKey) as Opts;
    return opts.mode === "blend" ? null : planFor(d, opts, sep);
  }, [d, optsKey, sep]);
  const planKey = JSON.stringify([d, optsKey, sep]);
  const [forced, setForced] = useState<string | null>(null);
  const tooBig = plan ? plan.count > BigInt(HARD_LIMIT) : false;
  const needsClick = plan ? plan.count > BigInt(AUTO_LIMIT) && !tooBig && forced !== planKey : false;
  const rows = useMemo(() => {
    if (!plan || plan.error || tooBig || needsClick) return [];
    const r = plan.run();
    if (o.sort === "az") r.sort((a, b) => a.localeCompare(b));
    else if (o.sort === "length") r.sort((a, b) => a.length - b.length || a.localeCompare(b));
    return r;
  }, [plan, tooBig, needsClick, o.sort]);
  const output = rows.join("\n");

  const isBlend = mode === "blend";
  const w1 = d.w1;
  const w2 = d.w2;
  const bothOrders = o.bothOrders;
  const blends = useMemo(() => {
    if (!isBlend) return [];
    const a = blendWords(w1, w2);
    const b = bothOrders ? blendWords(w2, w1) : [];
    const seen = new Set<string>();
    return [...a, ...b]
      .sort((x, y) => y.score - x.score)
      .filter((x) => !seen.has(x.word) && seen.add(x.word))
      .slice(0, 40);
  }, [isBlend, w1, w2, bothOrders]);
  const blendText = blends.map((b) => b.word).join("\n");

  const loadSample = () => {
    setRaw(JSON.stringify({ ...data, ...SAMPLES[mode] }));
    used("example");
  };
  const showSep = mode !== "blend";
  const lists = data.lists.length >= 2 ? data.lists : ["", ""];
  const set = (patch: Partial<Opts>) => setO({ ...o, ...patch });

  return (
    <div className="grid gap-4">
      {modes.length > 1 && (
        <Segmented legend="Mode" value={mode} onChange={(v) => set({ mode: v as Mode })} options={modes.map((m) => ({ value: m, label: MODE_LABEL[m] }))} />
      )}

      {mode === "blend" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First word" htmlFor={`${id}-w1`}>
            <input id={`${id}-w1`} className="input" value={data.w1} placeholder="e.g. breakfast" onChange={(e) => setData({ w1: e.target.value })} />
          </Field>
          <Field label="Second word" htmlFor={`${id}-w2`}>
            <input id={`${id}-w2`} className="input" value={data.w2} placeholder="e.g. lunch" onChange={(e) => setData({ w2: e.target.value })} />
          </Field>
        </div>
      ) : mode === "combinations" || mode === "permutations" ? (
        <ListArea
          id={`${id}-items`}
          label={mode === "permutations" && o.letters ? "Letters or digits to arrange" : "Items (one per line)"}
          value={data.items}
          onChange={(v) => setData({ items: v })}
        />
      ) : (
        <div className={`grid gap-4 ${lists.length > 2 ? "lg:grid-cols-3" : "sm:grid-cols-2"}`}>
          {lists.map((l, i) => (
            <ListArea
              key={i}
              id={`${id}-l${i}`}
              label={`List ${String.fromCharCode(65 + i)}`}
              value={l}
              onChange={(v) => setData({ lists: lists.map((x, k) => (k === i ? v : x)) })}
              onRemove={lists.length > 2 ? () => setData({ lists: lists.filter((_, k) => k !== i) }) : undefined}
            />
          ))}
        </div>
      )}

      <div className="panel p-3 sm:p-4">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <Button variant="ghost" icon="sparkles" onClick={loadSample}>
            Example
          </Button>
          {(mode === "lists" || mode === "merge") && (
            <Button icon="plus" disabled={lists.length >= 5} onClick={() => setData({ lists: [...lists, ""] })}>
              Add list
            </Button>
          )}
          {mode === "permutations" && (
            <Segmented
              legend="Items are"
              value={o.letters ? "letters" : "lines"}
              onChange={(v) => set({ letters: v === "letters" })}
              options={[
                { value: "letters", label: "Letters of a word" },
                { value: "lines", label: "Lines" },
              ]}
            />
          )}
          {mode === "merge" && (
            <Segmented
              legend="Merge"
              value={o.mergeMode}
              onChange={(v) => set({ mergeMode: v })}
              options={[
                { value: "pairs", label: "Line by line" },
                { value: "interleave", label: "Interleave" },
                { value: "join", label: "Join all into one line" },
              ]}
            />
          )}
          {(mode === "combinations" || mode === "permutations") && (
            <Field label={mode === "combinations" ? "Group size (r)" : "Length (blank = all)"} htmlFor={`${id}-r`} className="w-40">
              <input
                id={`${id}-r`}
                type="number"
                min={mode === "combinations" ? 1 : 0}
                className="input"
                value={o.r || ""}
                onChange={(e) => set({ r: Number(e.target.value) || 0 })}
              />
            </Field>
          )}
          {showSep && (
            <Field label={mode === "merge" && o.mergeMode === "interleave" ? "Separator (not used)" : "Separator"} htmlFor={`${id}-sep`} className="w-44">
              <select id={`${id}-sep`} className="select" value={o.sep} onChange={(e) => set({ sep: e.target.value })} disabled={mode === "merge" && o.mergeMode === "interleave"}>
                {SEPS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.value === "comma" && mode === "permutations" && o.letters ? "Nothing (letters)" : s.label}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {showSep && o.sep === "custom" && (
            <Field label="Custom separator" htmlFor={`${id}-cs`} className="w-36">
              <input id={`${id}-cs`} className="input" value={o.customSep} onChange={(e) => set({ customSep: e.target.value })} />
            </Field>
          )}
          {mode === "lists" && (
            <>
              <Field label="Prefix" htmlFor={`${id}-pre`} className="w-32">
                <input id={`${id}-pre`} className="input" value={o.prefix} onChange={(e) => set({ prefix: e.target.value })} />
              </Field>
              <Field label="Suffix" htmlFor={`${id}-suf`} className="w-32">
                <input id={`${id}-suf`} className="input" value={o.suffix} onChange={(e) => set({ suffix: e.target.value })} />
              </Field>
            </>
          )}
          {mode === "merge" && o.mergeMode !== "join" && (
            <Field label="Lists of different lengths" htmlFor={`${id}-un`} className="w-56">
              <select id={`${id}-un`} className="select" value={o.uneven} onChange={(e) => set({ uneven: e.target.value as Opts["uneven"] })}>
                <option value="empty">Keep going, leave gaps empty</option>
                <option value="skip">Keep going, skip missing items</option>
                <option value="shortest">Stop at the shortest list</option>
              </select>
            </Field>
          )}
          {(mode === "lists" || mode === "combinations" || mode === "permutations") && (
            <Field label="Sort results" htmlFor={`${id}-sort`} className="w-40">
              <select id={`${id}-sort`} className="select" value={o.sort} onChange={(e) => set({ sort: e.target.value as Opts["sort"] })}>
                <option value="none">As generated</option>
                <option value="az">A → Z</option>
                <option value="length">By length</option>
              </select>
            </Field>
          )}
          {(mode === "lists" || mode === "blend") && (
            <Checkbox checked={o.bothOrders} onChange={(v) => set({ bothOrders: v })} label={mode === "blend" ? "Also try the second word first" : "Both orders (A + B and B + A)"} help={mode === "lists" ? "Two lists only" : undefined} />
          )}
          {(mode === "combinations" || mode === "permutations") && <Checkbox checked={o.repetition} onChange={(v) => set({ repetition: v })} label="Allow repetition" />}
          {mode === "permutations" && <Checkbox checked={o.unique} onChange={(v) => set({ unique: v })} label="Unique results only" help="Matters when items repeat" />}
          <Button variant="ghost" icon="rotate-ccw" onClick={resetO}>
            Reset options
          </Button>
        </div>
      </div>

      {mode === "blend" ? (
        <Panel
          title={<span>Word blends</span>}
          actions={
            <>
              <CopyButton text={blendText} disabled={!blendText} variant="primary" label="Copy all" />
              <DownloadButton data={() => blendText} filename={() => `word-blends-${stamp()}.txt`} disabled={!blendText} />
            </>
          }
          footer={blends.length ? <span>{blends.length} ideas, most natural first</span> : undefined}
        >
          {blends.length ? (
            <ul className="grid min-h-40 gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
              {blends.map((b) => (
                <li key={b.word} className="flex items-baseline justify-between gap-3 border-b border-line px-3 py-2 sm:px-4">
                  <span className="text-lg font-semibold">{b.word}</span>
                  <span className="text-xs text-ink-3">{b.how}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="min-h-40 p-4 text-sm text-ink-3">{d.w1 && d.w2 ? "No natural blends found for these words. Try other words or tick “Also try the second word first”." : "Type two words to see blends."}</p>
          )}
        </Panel>
      ) : (
        <Panel
          title={<span id={`${id}-outl`}>Result</span>}
          actions={
            <>
              <CopyButton text={output} disabled={!output} variant="primary" />
              <DownloadButton data={() => output} filename={() => `${toolId}-${stamp()}.txt`} disabled={!output} />
            </>
          }
          footer={
            plan && !plan.error ? (
              <>
                <span>
                  {plan.exact ? "" : "up to "}
                  {plan.count.toLocaleString("en-US")} {mode === "merge" && o.mergeMode === "join" ? "line" : plan.count === BigInt(1) ? "result" : "results"}
                  {rows.length && BigInt(rows.length) !== plan.count ? ` · ${rows.length.toLocaleString()} shown` : ""}
                </span>
                {plan.note && <span>{plan.note}</span>}
              </>
            ) : undefined
          }
        >
          {plan?.error ? (
            <div className="p-3 sm:p-4" role="alert">
              <Alert tone="danger">{plan.error}</Alert>
            </div>
          ) : tooBig ? (
            <div className="p-3 sm:p-4" role="alert">
              <Alert tone="warning">
                This would create {plan!.count.toLocaleString("en-US")} results, more than a browser can list ({HARD_LIMIT.toLocaleString()} is the maximum here). Use fewer items or a smaller size.
              </Alert>
            </div>
          ) : needsClick ? (
            <div className="grid gap-3 p-3 sm:p-4">
              <Alert tone="warning">This will create {plan!.count.toLocaleString("en-US")} lines. Large lists can take a moment and are easier to download than to copy.</Alert>
              <div>
                <Button
                  variant="primary"
                  size="md"
                  icon="play"
                  onClick={() => {
                    setForced(planKey);
                    completed("generate", { count: Number(plan!.count) });
                    announce(`Generated ${plan!.count.toLocaleString("en-US")} lines`);
                  }}
                >
                  Generate {plan!.count.toLocaleString("en-US")} lines
                </Button>
              </div>
            </div>
          ) : (
            <textarea
              aria-labelledby={`${id}-outl`}
              readOnly
              className="textarea rounded-none border-0"
              style={{ ["--ta-min" as string]: "12rem", ["--ta-min-lg" as string]: "16rem" }}
              value={output}
              placeholder="The result appears here."
              wrap="off"
            />
          )}
        </Panel>
      )}
    </div>
  );
}
