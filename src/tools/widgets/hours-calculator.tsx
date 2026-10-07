"use client";

/*
 * Time-card calculator: one row per shift (start, end, unpaid break), overnight shifts
 * handled automatically, totals in h:mm and decimal hours, optional pay at an hourly rate,
 * and a stand-alone h:mm ↔ decimal converter. Logic: src/tools/lib/calc/hours.ts.
 */
import { useId, useRef, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { Button, CopyButton, DownloadButton, Panel, StatTile, usePersistentOptions } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { decimalHours, hhmm, parseDuration, parseTime, shiftMinutes } from "../lib/calc/hours";
import { fmtMoney, fmtNum, parseNum, plain } from "../lib/calc/money";
import { CurrencySelect, Formula, NumInput, useAnnounceResult, useCurrencyCode } from "../lib/calc/ui";

interface Row {
  id: number;
  label: string;
  start: string;
  end: string;
  brk: string;
}

const DASH = "—";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function HoursCalculator({ toolId }: WidgetProps) {
  const id = useId();
  const { used, announce, completed } = useTool();
  const [opts, setOpts] = usePersistentOptions(toolId, { currency: "" });
  const cur = useCurrencyCode(opts.currency);
  const nextId = useRef(2);
  const [rows, setRows] = useState<Row[]>([{ id: 1, label: "Monday", start: "", end: "", brk: "" }]);
  const [rate, setRate] = useState("");
  const [conv, setConv] = useState("");

  const results = rows.map((r) => shiftMinutes(parseTime(r.start), parseTime(r.end), r.brk.trim() ? parseNum(r.brk) : 0));
  const filled = results.filter((r) => Number.isFinite(r.minutes));
  const total = filled.reduce((s, r) => s + r.minutes, 0);
  const has = filled.length > 0;
  const R = parseNum(rate);
  const pay = has && Number.isFinite(R) && R >= 0 ? decimalHours(total) * R : NaN;
  useAnnounceResult(has ? `Total ${hhmm(total)}, ${plain(decimalHours(total))} hours` : null, announce, completed);

  const update = (rid: number, patch: Partial<Row>) => {
    setRows((rs) => rs.map((r) => (r.id === rid ? { ...r, ...patch } : r)));
    used("type");
  };
  const addRow = () =>
    setRows((rs) => {
      const last = rs[rs.length - 1];
      const label = DAYS[(DAYS.indexOf(last?.label ?? "") + 1) % 7] ?? `Shift ${rs.length + 1}`;
      return [...rs, { id: nextId.current++, label, start: last?.start ?? "", end: last?.end ?? "", brk: last?.brk ?? "" }];
    });

  const convMin = parseDuration(conv);
  const summary = has
    ? [
        ...rows.map((r, i) => (Number.isFinite(results[i].minutes) ? `${r.label}: ${r.start}–${r.end}${r.brk.trim() ? `, break ${r.brk} min` : ""} = ${hhmm(results[i].minutes)} (${plain(decimalHours(results[i].minutes))} h)` : "")).filter(Boolean),
        `Total: ${hhmm(total)} (${plain(decimalHours(total))} h)`,
        Number.isFinite(pay) ? `Pay at ${fmtMoney(R, cur)}/h: ${fmtMoney(pay, cur)}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    : "";
  const csv = () =>
    [
      "Label,Start,End,Break (min),Worked (h:mm),Worked (decimal)",
      ...rows.map((r, i) => [r.label.replace(/,/g, " "), r.start, r.end, r.brk || "0", hhmm(results[i].minutes), Number.isFinite(results[i].minutes) ? plain(decimalHours(results[i].minutes)) : ""].join(",")),
      `Total,,,,${hhmm(total)},${plain(decimalHours(total))}`,
    ].join("\n");

  return (
    <div className="grid gap-4">
      <Panel
        title="Shifts"
        actions={
          <>
            <Button
              variant="ghost"
              icon="sparkles"
              onClick={() => {
                used("example");
                nextId.current = 4;
                setRows([
                  { id: 1, label: "Monday", start: "08:00", end: "17:30", brk: "30" },
                  { id: 2, label: "Tuesday", start: "09:15", end: "17:00", brk: "45" },
                  { id: 3, label: "Wednesday", start: "22:00", end: "06:30", brk: "30" },
                ]);
              }}
            >
              Example
            </Button>
            <Button
              variant="ghost"
              icon="rotate-ccw"
              onClick={() => {
                nextId.current = 2;
                setRows([{ id: 1, label: "Monday", start: "", end: "", brk: "" }]);
                setRate("");
              }}
            >
              Reset
            </Button>
          </>
        }
        footer={
          <>
            <span>
              Total: <strong className="text-ink">{has ? hhmm(total) : DASH}</strong>
            </span>
            <span>
              Decimal: <strong className="text-ink">{has ? `${plain(decimalHours(total))} h` : DASH}</strong>
            </span>
          </>
        }
      >
        <div className="grid gap-3 p-3 sm:p-4">
          {rows.map((r, i) => {
            const res = results[i];
            return (
              <fieldset key={r.id} className="grid gap-3 rounded-md border border-line p-3 sm:grid-cols-[1.2fr_1fr_1fr_0.9fr_auto] sm:items-end">
                <legend className="sr-only">Shift {i + 1}</legend>
                <div>
                  <label htmlFor={`${id}-l${r.id}`} className="field-label">
                    Label
                  </label>
                  <input id={`${id}-l${r.id}`} className="input" value={r.label} onChange={(e) => update(r.id, { label: e.target.value })} />
                </div>
                <div>
                  <label htmlFor={`${id}-s${r.id}`} className="field-label">
                    Start
                  </label>
                  <input id={`${id}-s${r.id}`} type="time" className="input" value={r.start} onChange={(e) => update(r.id, { start: e.target.value })} />
                </div>
                <div>
                  <label htmlFor={`${id}-e${r.id}`} className="field-label">
                    End
                  </label>
                  <input id={`${id}-e${r.id}`} type="time" className="input" value={r.end} onChange={(e) => update(r.id, { end: e.target.value })} />
                </div>
                <div>
                  <label htmlFor={`${id}-b${r.id}`} className="field-label">
                    Break (min)
                  </label>
                  <NumInput id={`${id}-b${r.id}`} value={r.brk} onChange={(v) => update(r.id, { brk: v })} placeholder="0" />
                </div>
                <Button variant="ghost" icon="trash" aria-label={`Remove ${r.label || `shift ${i + 1}`}`} disabled={rows.length === 1} onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}>
                  <span className="sm:sr-only">Remove</span>
                </Button>
                <p className="text-sm text-ink-2 tabular-nums sm:col-span-5" aria-live="off">
                  {res.error ? (
                    <span className="text-danger">{res.error}</span>
                  ) : Number.isFinite(res.minutes) ? (
                    <>
                      Worked <strong className="text-ink">{hhmm(res.minutes)}</strong> = {plain(decimalHours(res.minutes))} h
                      {res.overnight && <span className="ml-2 chip min-h-0 py-0.5">Overnight: ends next day</span>}
                    </>
                  ) : (
                    <span className="text-ink-3">Enter a start and end time.</span>
                  )}
                </p>
              </fieldset>
            );
          })}
          <div className="flex flex-wrap gap-2">
            <Button icon="plus" onClick={addRow}>
              Add shift
            </Button>
            <CopyButton text={summary} disabled={!summary} label="Copy totals" />
            <DownloadButton data={csv} filename="hours.csv" mime="text/csv;charset=utf-8" label="Download CSV" disabled={!has} />
          </div>
        </div>
      </Panel>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Panel title="Total and pay">
          <div className="grid min-h-48 content-start gap-4 p-3 sm:p-4">
            <div className="grid grid-cols-2 gap-3">
              <StatTile label="Total (h:mm)" value={has ? hhmm(total) : DASH} />
              <StatTile label="Decimal hours" value={has ? fmtNum(decimalHours(total), 2) : DASH} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor={`${id}-rate`} className="field-label">
                  Hourly rate (optional)
                </label>
                <NumInput id={`${id}-rate`} value={rate} onChange={setRate} />
              </div>
              <CurrencySelect id={`${id}-cur`} value={opts.currency} onChange={(v) => setOpts((o) => ({ ...o, currency: v }))} />
            </div>
            <p className="text-lg font-semibold tabular-nums">Pay: {Number.isFinite(pay) ? fmtMoney(pay, cur) : DASH}</p>
            <Formula
              lines={
                has
                  ? [
                      "Worked = End − Start − Break (add 24 h if End is before Start)",
                      `Decimal hours = minutes ÷ 60 = ${fmtNum(total, 0)} ÷ 60 = ${plain(decimalHours(total))}`,
                      Number.isFinite(pay) ? `Pay = ${plain(decimalHours(total))} × ${plain(R)} = ${plain(pay)}` : "",
                    ]
                  : []
              }
            />
          </div>
        </Panel>
        <Panel title={<label htmlFor={`${id}-conv`}>Convert hours and minutes ↔ decimal</label>}>
          <div className="grid min-h-48 content-start gap-3 p-3 sm:p-4">
            <input
              id={`${id}-conv`}
              className="input"
              value={conv}
              placeholder="7:45, 7.75 or 7h 45m"
              onChange={(e) => setConv(e.target.value)}
              aria-describedby={`${id}-conv-out`}
            />
            <p id={`${id}-conv-out`} className="text-lg font-semibold tabular-nums">
              {Number.isFinite(convMin) ? `${hhmm(convMin)} = ${plain(decimalHours(convMin), 4)} hours = ${fmtNum(convMin, 2)} minutes` : DASH}
            </p>
            <p className="field-help">Type h:mm to get decimal hours, or a decimal (such as 7.75) to get h:mm. 15 minutes = 0.25 h, 30 = 0.5 h, 45 = 0.75 h.</p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
