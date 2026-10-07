"use client";

import { useDeferredValue, useEffect, useId, useMemo, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { Button, CopyButton, Field, Panel, StatTile, usePersistentOptions, useSessionText } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { charStats, smsInfo, xLength } from "../lib/text/charcount";

/*
 * Character counter with platform limits. Each limit is counted the way that platform counts
 * (see lib/text/charcount). Limits as checked on 2026-09-30; they are shown on the page.
 */

interface Limit {
  id: string;
  label: string;
  max: number;
  unit: string;
  count: (t: string, s: ReturnType<typeof charStats>) => number;
  note: string;
}

const LIMITS: Limit[] = [
  { id: "x", label: "X (Twitter) post", max: 280, unit: "weighted", count: (t) => xLength(t), note: "Links count 23, emoji and CJK characters 2" },
  { id: "title", label: "Title tag (guide)", max: 60, unit: "characters", count: (_, s) => s.chars, note: "Google cuts titles by width (about 600 px), not by count" },
  { id: "meta", label: "Meta description (guide)", max: 155, unit: "characters", count: (_, s) => s.chars, note: "Snippets are cut to fit the screen width" },
  { id: "instagram", label: "Instagram caption", max: 2200, unit: "UTF-16 units", count: (_, s) => s.codeUnits, note: "Most emoji count 2" },
  { id: "linkedin", label: "LinkedIn post", max: 3000, unit: "UTF-16 units", count: (_, s) => s.codeUnits, note: "Most emoji count 2" },
];

function Meter({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const over = value > max;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
      <div className={`h-full ${over ? "bg-danger" : pct > 90 ? "bg-warning" : "bg-accent"}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Row({ label, value, max, unit, note }: { label: string; value: number; max: number; unit: string; note: string }) {
  const left = max - value;
  return (
    <li className="grid gap-1.5 border-b border-line px-3 py-2.5 last:border-b-0 sm:px-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="font-semibold">{label}</span>
        <span className="tabular-nums">
          {value.toLocaleString()} / {max.toLocaleString()}{" "}
          <span className={left < 0 ? "font-semibold text-danger" : "text-ink-3"}>
            {left < 0 ? `${(-left).toLocaleString()} over` : `${left.toLocaleString()} left`}
          </span>
        </span>
      </div>
      <Meter value={value} max={max} />
      <span className="text-xs text-ink-3">
        Counted as {unit}. {note}
      </span>
    </li>
  );
}

const SAMPLE = "Big news! Our café opens on Monday at 9:00 👋🏽 First coffee is free. Details: https://example.com/opening-week";

export default function CharacterCounter({ toolId }: WidgetProps) {
  const id = useId();
  const { used, completed } = useTool();
  const [text, setText] = useSessionText(toolId);
  const [o, setO] = usePersistentOptions(toolId, { custom: 100 });
  const d = useDeferredValue(text);
  const s = useMemo(() => charStats(d), [d]);
  const sms = useMemo(() => smsInfo(d), [d]);
  const x = useMemo(() => xLength(d), [d]);
  const [announced, setAnnounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      setAnnounced(d ? `${s.chars} characters, ${s.noSpaces} without spaces` : "");
      if (d) completed("view");
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s]);

  const custom = Math.max(1, Math.floor(Number(o.custom) || 1));

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="grid content-start gap-4">
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
              <CopyButton text={text} disabled={!text} />
            </>
          }
        >
          <textarea
            id={`${id}-t`}
            className="textarea rounded-none border-0"
            style={{ ["--ta-min" as string]: "12rem", ["--ta-min-lg" as string]: "18rem" }}
            placeholder="Type or paste your text here"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              used("type");
            }}
            onPaste={() => used("paste")}
          />
        </Panel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Characters" value={s.chars.toLocaleString()} emphasis />
          <StatTile label="Without spaces" value={s.noSpaces.toLocaleString()} />
          <StatTile label="Words" value={s.words.toLocaleString()} />
          <StatTile label="Lines" value={s.lines.toLocaleString()} />
          <StatTile label="Spaces" value={s.spaces.toLocaleString()} />
          <StatTile label="UTF-8 bytes" value={s.bytes.toLocaleString()} />
          <StatTile label="UTF-16 units" value={s.codeUnits.toLocaleString()} sub="JavaScript length" />
          <StatTile label="Code points" value={s.codePoints.toLocaleString()} />
        </div>
      </div>
      <div className="grid content-start gap-3">
        <Panel title={<span>Platform limits</span>}>
          <ul>
            {LIMITS.map((l) => (
              <Row key={l.id} label={l.label} value={l.id === "x" ? x : l.count(d, s)} max={l.max} unit={l.unit} note={l.note} />
            ))}
            <li className="grid gap-1.5 border-b border-line px-3 py-2.5 sm:px-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="font-semibold">SMS</span>
                <span className="tabular-nums">
                  {sms.segments.toLocaleString()} {sms.segments === 1 ? "message" : "messages"}
                </span>
              </div>
              <Meter value={sms.units} max={sms.segments > 1 ? sms.segments * sms.perSegment : sms.perSegment} />
              <span className="text-xs text-ink-3">
                {sms.encoding}: {sms.units.toLocaleString()} {sms.encoding === "GSM-7" ? "characters" : "units"}, {sms.perSegment} per message
                {sms.encoding === "UCS-2" && sms.nonGsm.length > 0 && <> because of {sms.nonGsm.join(" ")}</>}
              </span>
            </li>
            <li className="grid gap-2 px-3 py-2.5 sm:px-4">
              <Field label="Your own limit (characters)" htmlFor={`${id}-c`}>
                <input id={`${id}-c`} type="number" min={1} className="input" value={o.custom} onChange={(e) => setO({ custom: Number(e.target.value) || 1 })} />
              </Field>
              <Meter value={s.chars} max={custom} />
              <span className={`text-sm tabular-nums ${s.chars > custom ? "font-semibold text-danger" : "text-ink-3"}`}>
                {s.chars > custom ? `${(s.chars - custom).toLocaleString()} over` : `${(custom - s.chars).toLocaleString()} left`}
              </span>
            </li>
          </ul>
        </Panel>
        <p className="text-xs text-ink-3">Limits as checked on 30 September 2026. Platforms change them; check the platform if you are right at the limit.</p>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {announced}
      </p>
    </div>
  );
}
