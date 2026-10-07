"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { Alert, Button, CopyButton, DownloadButton, Field, Panel, Segmented, StatTile, usePersistentOptions } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { UNIT_LABEL, fmtOffset, fromMs, isoInZone, parseTimestamp, readable, relative, wallToEpoch, zoneOffset, zones, type Unit } from "../lib/dev/time";

/*
 * Unix timestamp converter: live clock, timestamp → date (s/ms/µs/ns detected), date → timestamp
 * in any IANA time zone, and batch conversion. All in the browser.
 */

function useNow(active: boolean) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-2 border-b border-line py-1.5 last:border-b-0">
      <dt className="text-sm text-ink-3">{label}</dt>
      <dd className="font-mono text-sm break-all">{value}</dd>
      <CopyButton text={value} label="Copy" variant="ghost" />
    </div>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");

/** A timestamp (unit detected) or a date string → epoch ms. */
function toMs(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  const p = parseTimestamp(t, "auto");
  if (p.ms !== undefined) return p.ms;
  const d = Date.parse(t);
  return Number.isFinite(d) ? d : null;
}

function breakdown(ms: number): string {
  let s = Math.floor(Math.abs(ms) / 1000);
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  const parts = [d && `${d.toLocaleString()} day${d === 1 ? "" : "s"}`, h && `${h} hour${h === 1 ? "" : "s"}`, m && `${m} minute${m === 1 ? "" : "s"}`, `${s} second${s === 1 ? "" : "s"}`];
  return parts.filter(Boolean).join(", ");
}

function Difference() {
  const id = useId();
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const ma = toMs(a);
  const mb = toMs(b);
  const diff = ma !== null && mb !== null ? mb - ma : null;
  return (
    <Panel title={<span>Time between two timestamps</span>}>
      <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4">
        <Field label="Start" htmlFor={`${id}-a`} help="Timestamp or date, e.g. 1700000000 or 2026-01-01T00:00:00Z" error={a.trim() && ma === null ? "Not a timestamp or date." : null}>
          <input id={`${id}-a`} className="input mono" value={a} autoComplete="off" spellCheck={false} onChange={(e) => setA(e.target.value)} />
        </Field>
        <Field label="End" htmlFor={`${id}-b`} help="Leave the unit to detection: 10 digits = seconds, 13 = ms" error={b.trim() && mb === null ? "Not a timestamp or date." : null}>
          <div className="flex gap-2">
            <input id={`${id}-b`} className="input mono" value={b} autoComplete="off" spellCheck={false} onChange={(e) => setB(e.target.value)} />
            <Button variant="secondary" onClick={() => setB(String(Math.floor(Date.now() / 1000)))}>
              Now
            </Button>
          </div>
        </Field>
        <div className="min-h-20 sm:col-span-2">
          {diff !== null ? (
            <dl>
              <Row label="Difference" value={`${diff < 0 ? "−" : ""}${breakdown(diff)}`} />
              <Row label="Seconds" value={String(Math.trunc(diff / 1000))} />
              <Row label="Milliseconds" value={String(Math.round(diff))} />
              <Row label="Hours" value={(diff / 3_600_000).toFixed(4).replace(/\.?0+$/, "")} />
              <Row label="Days" value={(diff / 86_400_000).toFixed(4).replace(/\.?0+$/, "")} />
            </dl>
          ) : (
            <p className="text-sm text-ink-3">Enter two values to see the time between them. A negative result means the end is before the start.</p>
          )}
        </div>
      </div>
    </Panel>
  );
}

export default function UnixTime({ toolId }: WidgetProps) {
  const id = useId();
  const { used, completed } = useTool();
  const [paused, setPaused] = useState(false);
  const now = useNow(!paused);
  const [o, setO] = usePersistentOptions(toolId, { unit: "auto", zone: "", batchUnit: "auto" });
  const [localZone, setLocalZone] = useState("UTC");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the visitor's zone is only known in the browser
    setLocalZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  }, []);
  const zone = o.zone || localZone;
  const allZones = useMemo(() => zones(), []);

  /* timestamp → date */
  const [ts, setTs] = useState("");
  const parsed = useMemo(() => parseTimestamp(ts, o.unit as Unit | "auto"), [ts, o.unit]);

  /* date → timestamp */
  const [date, setDate] = useState("");
  const [time, setTime] = useState("12:00:00");
  const toEpoch = useMemo(() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    const t = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(time || "00:00");
    if (!m || !t) return null;
    return wallToEpoch(Number(m[1]), Number(m[2]), Number(m[3]), Number(t[1]), Number(t[2]), Number(t[3] ?? 0), zone);
  }, [date, time, zone]);

  /* batch */
  const [batch, setBatch] = useState("");
  const batchOut = useMemo(() => {
    if (!batch.trim()) return "";
    return batch
      .split(/\r?\n/)
      .map((line) => {
        const v = line.trim();
        if (!v) return "";
        const p = parseTimestamp(v, o.batchUnit as Unit | "auto");
        if (p.ms !== undefined) return `${v}\t${isoInZone(p.ms, "UTC")}\t${isoInZone(p.ms, zone)}`;
        const d = Date.parse(v);
        if (Number.isFinite(d)) return `${v}\t${Math.floor(d / 1000)}\t${d}`;
        return `${v}\tnot a timestamp or date`;
      })
      .join("\n");
  }, [batch, o.batchUnit, zone]);

  useEffect(() => {
    if (parsed.ms !== undefined) completed("view");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed.ms]);

  const fillNowDate = () => {
    const n = Date.now();
    const off = zoneOffset(n, zone);
    const d = new Date(n + off * 60000);
    setDate(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`);
    setTime(`${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`);
  };

  return (
    <div className="grid gap-4">
      <Panel
        title={<span>Current Unix time</span>}
        actions={
          <Button variant="ghost" icon={paused ? "play" : "clock"} onClick={() => setPaused(!paused)}>
            {paused ? "Resume clock" : "Pause clock"}
          </Button>
        }
      >
        <div className="grid gap-3 p-3 sm:grid-cols-3 sm:p-4">
          <div className="grid gap-1">
            <StatTile label="Seconds" value={now === null ? "—" : Math.floor(now / 1000)} />
            <CopyButton text={() => String(Math.floor(Date.now() / 1000))} label="Copy seconds" />
          </div>
          <div className="grid gap-1">
            <StatTile label="Milliseconds" value={now === null ? "—" : now} />
            <CopyButton text={() => String(Date.now())} label="Copy ms" />
          </div>
          <div className="grid gap-1">
            <StatTile label="UTC" value={now === null ? "—" : new Date(now).toISOString().slice(11, 19)} sub={now === null ? "" : new Date(now).toISOString().slice(0, 10)} />
            <CopyButton text={() => new Date().toISOString()} label="Copy ISO 8601" />
          </div>
        </div>
      </Panel>

      <div className="panel p-3 sm:p-4">
        <Field label="Time zone" htmlFor={`${id}-z`} help={`Used for “Your zone” results and date → timestamp. Your browser reports ${localZone}.`} className="max-w-md">
          <select id={`${id}-z`} className="select" value={zone} onChange={(e) => setO({ ...o, zone: e.target.value === localZone ? "" : e.target.value })}>
            {allZones.map((z) => (
              <option key={z} value={z}>
                {z.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={<span>Timestamp → date</span>}>
          <div className="grid gap-3 p-3 sm:p-4">
            <Field
              label="Unix timestamp"
              htmlFor={`${id}-ts`}
              error={parsed.error ?? null}
              help={parsed.unit && o.unit === "auto" ? `Read as ${UNIT_LABEL[parsed.unit]} (${ts.replace(/\D/g, "").length} digits)` : "Seconds, milliseconds, microseconds or nanoseconds"}
            >
              <div className="flex gap-2">
                <input
                  id={`${id}-ts`}
                  className="input mono"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="1700000000"
                  value={ts}
                  aria-invalid={parsed.error ? true : undefined}
                  onChange={(e) => {
                    setTs(e.target.value);
                    used("type");
                  }}
                />
                <Button variant="secondary" onClick={() => setTs(String(Math.floor(Date.now() / 1000)))}>
                  Now
                </Button>
              </div>
            </Field>
            <Segmented
              legend="Unit"
              value={o.unit}
              onChange={(v) => setO({ ...o, unit: v })}
              options={[
                { value: "auto", label: "Detect" },
                { value: "s", label: "s" },
                { value: "ms", label: "ms" },
                { value: "us", label: "µs" },
                { value: "ns", label: "ns" },
              ]}
            />
            <div className="min-h-56">
              {parsed.ms !== undefined ? (
                <dl>
                  <Row label="UTC" value={isoInZone(parsed.ms, "UTC")} />
                  <Row label={`Your zone (${zone})`} value={isoInZone(parsed.ms, zone)} />
                  <Row label="Readable" value={readable(parsed.ms, zone)} />
                  <Row label="RFC 7231 / HTTP" value={new Date(Math.floor(parsed.ms)).toUTCString()} />
                  <Row label="Relative" value={relative(parsed.ms, now ?? parsed.ms)} />
                  <Row label="Seconds" value={fromMs(parsed.ms, "s")} />
                  <Row label="Milliseconds" value={fromMs(parsed.ms, "ms")} />
                </dl>
              ) : (
                <p className="text-sm text-ink-3">Type a timestamp or press Now. 10 digits are seconds, 13 are milliseconds.</p>
              )}
            </div>
          </div>
        </Panel>

        <Panel title={<span>Date → timestamp</span>}>
          <div className="grid gap-3 p-3 sm:p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Date" htmlFor={`${id}-d`}>
                <input id={`${id}-d`} type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label="Time" htmlFor={`${id}-t`} help="24-hour clock">
                <input id={`${id}-t`} type="time" step={1} className="input" value={time} onChange={(e) => setTime(e.target.value)} />
              </Field>
            </div>
            <p className="text-sm text-ink-2">
              Interpreted in <span className="font-semibold">{zone}</span>
              {toEpoch ? ` (UTC${fmtOffset(zoneOffset(toEpoch.ms, zone))} on that date)` : ""}.
            </p>
            <div>
              <Button variant="secondary" onClick={fillNowDate}>
                Use current date and time
              </Button>
            </div>
            <div className="min-h-40">
              {toEpoch ? (
                <>
                  {toEpoch.note && <Alert tone="warning">{toEpoch.note}</Alert>}
                  <dl>
                    <Row label="Seconds" value={fromMs(toEpoch.ms, "s")} />
                    <Row label="Milliseconds" value={fromMs(toEpoch.ms, "ms")} />
                    <Row label="ISO 8601 (UTC)" value={isoInZone(toEpoch.ms, "UTC")} />
                    <Row label="ISO 8601 (zone)" value={isoInZone(toEpoch.ms, zone)} />
                  </dl>
                </>
              ) : (
                <p className="text-sm text-ink-3">Pick a date to get its Unix timestamp.</p>
              )}
            </div>
          </div>
        </Panel>
      </div>

      <Difference />

      <Panel
        title={<label htmlFor={`${id}-b`}>Batch convert</label>}
        actions={
          <>
            <CopyButton text={batchOut} disabled={!batchOut} />
            <DownloadButton data={() => "input\tutc\t" + zone + "\n" + batchOut} filename="timestamps.tsv" mime="text/tab-separated-values" disabled={!batchOut} />
          </>
        }
      >
        <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4">
          <div className="grid gap-2">
            <textarea
              id={`${id}-b`}
              className="textarea mono"
              style={{ ["--ta-min" as string]: "10rem" }}
              placeholder={"One per line:\n1700000000\n1700000000000\n2026-10-05T12:00:00Z"}
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              spellCheck={false}
            />
            <Segmented
              legend="Timestamp unit"
              value={o.batchUnit}
              onChange={(v) => setO({ ...o, batchUnit: v })}
              options={[
                { value: "auto", label: "Detect per line" },
                { value: "s", label: "s" },
                { value: "ms", label: "ms" },
              ]}
            />
          </div>
          <div className="grid content-start gap-1">
            <span className="text-sm font-semibold" id={`${id}-bo`}>
              Result (input, UTC, {zone}; dates give seconds and ms)
            </span>
            <textarea aria-labelledby={`${id}-bo`} readOnly wrap="off" className="textarea mono" style={{ ["--ta-min" as string]: "10rem" }} value={batchOut} />
          </div>
        </div>
      </Panel>
    </div>
  );
}
