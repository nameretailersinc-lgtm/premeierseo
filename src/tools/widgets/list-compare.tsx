"use client";

import { useId, useMemo } from "react";
import { useTool } from "../ui/ToolContext";
import { Button, Checkbox, CopyButton, DownloadButton, Field, Panel, Segmented, stamp, useDebounced, usePersistentOptions, useSessionText } from "../ui/primitives";
import type { WidgetProps } from "../types";

/*
 * Compare two lists: items in both, only in A, only in B, and the union.
 * Each result keeps the order and spelling of the first list it comes from.
 */

export interface CompareOptions {
  ignoreCase: boolean;
  trim: boolean;
  split: "lines" | "commas" | "any";
}

export function splitList(s: string, o: CompareOptions): string[] {
  const parts = o.split === "commas" ? s.split(/[,;\r\n]+/) : o.split === "any" ? s.split(/[\s,;]+/) : s.split(/\r\n?|\n/);
  return parts.map((p) => (o.trim || o.split !== "lines" ? p.trim() : p)).filter((p) => p !== "");
}

export function compareLists(a: string, b: string, o: CompareOptions) {
  const key = (s: string) => (o.ignoreCase ? s.toLocaleLowerCase() : s);
  const A = splitList(a, o);
  const B = splitList(b, o);
  const uniq = (list: string[]) => {
    const m = new Map<string, string>();
    for (const x of list) if (!m.has(key(x))) m.set(key(x), x);
    return m;
  };
  const ua = uniq(A);
  const ub = uniq(B);
  const both = [...ua.entries()].filter(([k]) => ub.has(k)).map(([, v]) => v);
  const onlyA = [...ua.entries()].filter(([k]) => !ub.has(k)).map(([, v]) => v);
  const onlyB = [...ub.entries()].filter(([k]) => !ua.has(k)).map(([, v]) => v);
  const union = [...ua.values(), ...onlyB];
  return { both, onlyA, onlyB, union, sizeA: A.length, sizeB: B.length, uniqueA: ua.size, uniqueB: ub.size };
}

const SAMPLE_A = "ana@example.com\nben@example.com\ncara@example.com\nDev@Example.com\nben@example.com";
const SAMPLE_B = "dev@example.com\neli@example.com\nana@example.com\nfay@example.com";

type View = "both" | "onlyA" | "onlyB" | "union";

export default function ListCompare({ toolId }: WidgetProps) {
  const id = useId();
  const { used, announce } = useTool();
  const [o, setO] = usePersistentOptions(toolId, { ignoreCase: true, trim: true, split: "lines" as CompareOptions["split"], view: "both" as View });
  const [a, setA] = useSessionText(`${toolId}-a`);
  const [b, setB] = useSessionText(`${toolId}-b`);
  const da = useDebounced(a, 150);
  const db = useDebounced(b, 150);
  const r = useMemo(() => compareLists(da, db, o), [da, db, o]);
  const views: { value: View; label: string; list: string[] }[] = [
    { value: "both", label: `In both (${r.both.length})`, list: r.both },
    { value: "onlyA", label: `Only in A (${r.onlyA.length})`, list: r.onlyA },
    { value: "onlyB", label: `Only in B (${r.onlyB.length})`, list: r.onlyB },
    { value: "union", label: `All unique (${r.union.length})`, list: r.union },
  ];
  const current = views.find((v) => v.value === o.view) ?? views[0];
  const output = current.list.join("\n");
  const hasInput = Boolean(da.trim() || db.trim());

  const area = (key: "a" | "b", value: string, set: (v: string) => void, label: string, count: number, unique: number) => (
    <Panel
      as="div"
      title={<label htmlFor={`${id}-${key}`}>{label}</label>}
      footer={
        <span>
          {count.toLocaleString()} items{unique !== count ? ` · ${unique.toLocaleString()} unique` : ""}
        </span>
      }
    >
      <textarea
        id={`${id}-${key}`}
        className="textarea rounded-none border-0"
        style={{ ["--ta-min" as string]: "10rem", ["--ta-min-lg" as string]: "14rem" }}
        placeholder="One item per line"
        spellCheck={false}
        value={value}
        onChange={(e) => {
          set(e.target.value);
          used("type");
        }}
      />
    </Panel>
  );

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {area("a", a, setA, "List A", r.sizeA, r.uniqueA)}
        {area("b", b, setB, "List B", r.sizeB, r.uniqueB)}
      </div>
      <div className="panel p-3 sm:p-4">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <Button
            variant="ghost"
            icon="sparkles"
            onClick={() => {
              setA(SAMPLE_A);
              setB(SAMPLE_B);
              used("example");
            }}
          >
            Example
          </Button>
          <Button
            variant="ghost"
            icon="arrow-left-right"
            disabled={!a && !b}
            onClick={() => {
              setA(b);
              setB(a);
              announce("Lists swapped");
            }}
          >
            Swap lists
          </Button>
          <Button
            variant="ghost"
            icon="trash"
            disabled={!a && !b}
            onClick={() => {
              setA("");
              setB("");
              announce("Cleared");
            }}
          >
            Clear
          </Button>
          <Field label="Items are separated by" htmlFor={`${id}-split`} className="w-48">
            <select id={`${id}-split`} className="select" value={o.split} onChange={(e) => setO({ ...o, split: e.target.value as CompareOptions["split"] })}>
              <option value="lines">New lines</option>
              <option value="commas">Commas or new lines</option>
              <option value="any">Any space, comma or line</option>
            </select>
          </Field>
          <Checkbox checked={o.ignoreCase} onChange={(v) => setO({ ...o, ignoreCase: v })} label="Ignore case" />
          <Checkbox checked={o.trim} onChange={(v) => setO({ ...o, trim: v })} label="Ignore spaces around items" />
        </div>
      </div>
      <Panel
        title={<span id={`${id}-out`}>Result</span>}
        actions={
          <>
            <CopyButton text={output} disabled={!output} variant="primary" />
            <DownloadButton data={() => output} filename={() => `${o.view}-${stamp()}.txt`} disabled={!output} />
          </>
        }
        footer={hasInput ? <span>{current.list.length.toLocaleString()} items</span> : undefined}
      >
        <div className="border-b border-line p-3 sm:p-4">
          <Segmented legend="Show" value={o.view} onChange={(v) => setO({ ...o, view: v })} options={views.map(({ value, label }) => ({ value, label }))} />
        </div>
        <textarea
          aria-labelledby={`${id}-out`}
          readOnly
          className="textarea rounded-none border-0"
          style={{ ["--ta-min" as string]: "10rem" }}
          value={output}
          placeholder={hasInput ? "No items in this group." : "Paste two lists to compare them."}
        />
      </Panel>
    </div>
  );
}
