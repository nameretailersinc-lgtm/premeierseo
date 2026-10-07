"use client";

import { useDeferredValue, useId, useMemo } from "react";
import { useTool } from "../ui/ToolContext";
import { Button, Field, Panel, Segmented, StatTile, usePersistentOptions, useSessionText } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { charStats } from "../lib/text/charcount";

/*
 * Reading and speaking time. Defaults: 238 wpm silent reading of non-fiction and 183 wpm reading
 * aloud (Brysbaert 2019), 140 wpm presentation pace. Text or a typed word count.
 */

export function formatDuration(words: number, wpm: number): string {
  if (!words || !wpm) return "0 sec";
  const total = Math.round((words / wpm) * 60);
  if (total < 60) return `${Math.max(1, total)} sec`;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h) return `${h} h ${m} min`;
  return s ? `${m} min ${s} sec` : `${m} min`;
}

const SAMPLE =
  "Reading time is the number of words divided by a reading speed. Adults reading non-fiction in English silently manage about 238 words per minute on average, and about 183 words per minute when reading aloud. A talk or presentation is slower again, because speakers pause, stress words and give the audience time to follow.";

export default function ReadingTime({ toolId }: WidgetProps) {
  const id = useId();
  const { used } = useTool();
  const [o, setO] = usePersistentOptions(toolId, { source: "text", count: 1000, read: 238, speak: 140, target: 5 });
  const [text, setText] = useSessionText(toolId);
  const d = useDeferredValue(text);
  const textWords = useMemo(() => charStats(d).words, [d]);
  const words = o.source === "text" ? textWords : Math.max(0, Math.floor(Number(o.count) || 0));
  const target = Math.max(0, Number(o.target) || 0);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="grid content-start gap-4">
        <Segmented
          legend="Measure"
          value={o.source}
          onChange={(v) => setO({ ...o, source: v })}
          options={[
            { value: "text", label: "Paste text" },
            { value: "count", label: "Enter a word count" },
          ]}
        />
        {o.source === "text" ? (
          <Panel
            as="div"
            title={<label htmlFor={`${id}-t`}>Your text</label>}
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
            footer={<span>{textWords.toLocaleString()} words</span>}
          >
            <textarea
              id={`${id}-t`}
              className="textarea rounded-none border-0"
              style={{ ["--ta-min" as string]: "12rem", ["--ta-min-lg" as string]: "18rem" }}
              placeholder="Paste your article, script or email"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                used("type");
              }}
            />
          </Panel>
        ) : (
          <Field label="Number of words" htmlFor={`${id}-n`} className="w-48">
            <input
              id={`${id}-n`}
              type="number"
              min={0}
              inputMode="numeric"
              className="input"
              value={o.count}
              onChange={(e) => {
                setO({ ...o, count: Number(e.target.value) || 0 });
                used("count");
              }}
            />
          </Field>
        )}
        <div className="panel grid gap-4 p-3 sm:grid-cols-2 sm:p-4">
          <div>
            <label htmlFor={`${id}-r`} className="field-label">
              Reading speed: <span className="tabular-nums">{o.read}</span> words per minute
            </label>
            <input id={`${id}-r`} type="range" min={100} max={500} step={2} value={o.read} aria-valuetext={`${o.read} words per minute`} onChange={(e) => setO({ ...o, read: Number(e.target.value) })} className="w-full" />
            <p className="field-help">238 is the average for silent reading of non-fiction</p>
          </div>
          <div>
            <label htmlFor={`${id}-s`} className="field-label">
              Speaking pace: <span className="tabular-nums">{o.speak}</span> words per minute
            </label>
            <input id={`${id}-s`} type="range" min={80} max={220} step={2} value={o.speak} aria-valuetext={`${o.speak} words per minute`} onChange={(e) => setO({ ...o, speak: Number(e.target.value) })} className="w-full" />
            <p className="field-help">130–150 suits a presentation or speech</p>
          </div>
        </div>
      </div>
      <div className="grid content-start gap-3" aria-live="polite">
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Reading time" value={formatDuration(words, o.read)} sub={`silent, ${o.read} wpm`} />
          <StatTile label="Speaking time" value={formatDuration(words, o.speak)} sub={`${o.speak} wpm`} />
          <StatTile label="Reading aloud" value={formatDuration(words, 183)} sub="183 wpm average" />
          <StatTile label="Words" value={words.toLocaleString()} />
        </div>
        <div className="panel grid gap-2 p-3">
          <p className="text-sm font-semibold">Words for a set time</p>
          <Field label="Minutes" htmlFor={`${id}-m`} className="w-32">
            <input id={`${id}-m`} type="number" min={0} step={0.5} className="input" value={o.target} onChange={(e) => setO({ ...o, target: Number(e.target.value) || 0 })} />
          </Field>
          <p className="text-sm tabular-nums">
            Speaking: about <strong>{Math.round(target * o.speak).toLocaleString()}</strong> words
          </p>
          <p className="text-sm tabular-nums">
            Silent reading: about <strong>{Math.round(target * o.read).toLocaleString()}</strong> words
          </p>
        </div>
      </div>
    </div>
  );
}
