"use client";

import { useDeferredValue, useEffect, useId, useMemo, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { Button, CopyButton, Panel, StatTile, useSessionText } from "../ui/primitives";
import type { WidgetProps } from "../types";

/* Counting rules (documented on the page):
   - word: a run of letters/digits, allowing internal apostrophes and hyphens ("don't", "well-known" = 1 word)
   - sentence: ends at . ! ? (one or more) followed by whitespace or end of text
   - paragraph: blocks separated by one or more blank lines
   - reading time: words ÷ wpm (default 238, Brysbaert 2019), speaking time: words ÷ 140 */

const WORD_RE = /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu;
const STOP = new Set(
  "a an and are as at be but by for from has have he her his i if in into is it its me my no not of on or our she so than that the their them then there these they this to too us was we were what when which who will with you your".split(" "),
);

export function analyze(text: string) {
  const words = text.match(WORD_RE) ?? [];
  const chars = [...text].length;
  const noSpaces = [...text.replace(/\s/g, "")].length;
  const sentences = (text.match(/[^.!?]*[\p{L}\p{N}][^.!?]*(?:[.!?]+(?=\s|$)|$)/gu) ?? []).filter((s) => s.trim()).length;
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim()).length;
  const freq = new Map<string, number>();
  for (const w of words) {
    const k = w.toLowerCase();
    if (STOP.has(k) || k.length < 3) continue;
    freq.set(k, (freq.get(k) ?? 0) + 1);
  }
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 10);
  return { words: words.length, chars, noSpaces, sentences, paragraphs, top };
}

function minutes(words: number, wpm: number) {
  if (!words) return "0 min";
  const m = words / wpm;
  if (m < 1) return `${Math.max(1, Math.round(m * 60))} sec`;
  const whole = Math.floor(m);
  const s = Math.round((m - whole) * 60);
  return s ? `${whole} min ${s} sec` : `${whole} min`;
}

export default function WordCounter({ toolId }: WidgetProps) {
  const { used, completed } = useTool();
  const id = useId();
  const [text, setText] = useSessionText(toolId);
  const [wpm, setWpm] = useState(238);
  const deferred = useDeferredValue(text);
  const stats = useMemo(() => analyze(deferred), [deferred]);
  const [announced, setAnnounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      setAnnounced(text ? `${stats.words} words, ${stats.chars} characters` : "");
      if (text) completed("view");
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <Panel
        as="div"
        title={<label htmlFor={`${id}-t`}>Your text</label>}
        actions={
          <>
            <Button
              variant="ghost"
              icon="sparkles"
              onClick={() => {
                setText(
                  "Well-known tools save time. Try it: paste this sentence!\n\nA second paragraph starts after a blank line. It has two sentences.",
                );
                used("example");
              }}
            >
              Example
            </Button>
            <Button variant="ghost" icon="trash" disabled={!text} onClick={() => setText("")}>
              Clear
            </Button>
            <CopyButton text={text} disabled={!text} />
          </>
        }
      >
        <textarea
          id={`${id}-t`}
          className="textarea rounded-none border-0"
          style={{ ["--ta-min" as string]: "14rem", ["--ta-min-lg" as string]: "22rem" }}
          placeholder="Start typing or paste your text here"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            used("type");
          }}
          onPaste={() => used("paste")}
        />
      </Panel>
      <div className="grid content-start gap-3">
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Words" value={stats.words.toLocaleString()} emphasis />
          <StatTile label="Characters" value={stats.chars.toLocaleString()} />
          <StatTile label="Without spaces" value={stats.noSpaces.toLocaleString()} />
          <StatTile label="Sentences" value={stats.sentences.toLocaleString()} />
          <StatTile label="Paragraphs" value={stats.paragraphs.toLocaleString()} />
          <StatTile label="Speaking time" value={minutes(stats.words, 140)} sub="at 140 wpm" />
        </div>
        <div className="panel p-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-semibold">Reading time</p>
            <p className="text-lg font-semibold tabular-nums">{minutes(stats.words, wpm)}</p>
          </div>
          <label htmlFor={`${id}-wpm`} className="mt-2 block text-sm text-ink-3">
            Reading speed: <span className="tabular-nums">{wpm}</span> words per minute
          </label>
          <input
            id={`${id}-wpm`}
            type="range"
            min={100}
            max={400}
            step={2}
            value={wpm}
            aria-valuetext={`${wpm} words per minute`}
            onChange={(e) => setWpm(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="panel min-h-48 p-3">
          <p className="text-sm font-semibold">Most-used words</p>
          {stats.top.length ? (
            <ol className="mt-2 grid gap-1 text-sm">
              {stats.top.map(([w, n]) => (
                <li key={w} className="flex justify-between gap-2">
                  <span className="truncate">{w}</span>
                  <span className="text-ink-3 tabular-nums">
                    {n} · {((n / stats.words) * 100).toFixed(1)}%
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-sm text-ink-3">Common words such as “the” and “and” are left out. Start typing to see the list.</p>
          )}
        </div>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {announced}
      </p>
    </div>
  );
}
