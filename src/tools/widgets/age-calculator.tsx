"use client";

/*
 * Age engine for /age-calculator/ (config.mode "age") and /chronological-age-calculator/
 * (config.mode "chronological": birth date → test date as years;months;days, with the
 * 30-day borrowing method, rounding rules and adjusted age for prematurity).
 * Date maths: src/tools/lib/calc/dates.ts (UTC, no time-zone or DST drift).
 */
import { useEffect, useId, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { Button, Checkbox, CopyButton, Panel, Segmented, StatTile, usePersistentOptions } from "../ui/primitives";
import type { WidgetProps } from "../types";
import {
  compare,
  diffBorrow30,
  diffCalendar,
  dueDateFrom,
  fmtSemicolon,
  nextBirthday,
  parseISODate,
  roundAge,
  toISO,
  todayLocal,
  totals,
  weekday,
  type AgeParts,
  type Rounding,
  type YMD,
} from "../lib/calc/dates";
import { fmtNum, parseNum } from "../lib/calc/money";
import { BigResult, Formula, NumInput, ResultRows, useAnnounceResult } from "../lib/calc/ui";

const DASH = "—";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const longDate = (v: YMD) => `${v.d} ${MONTHS[v.m - 1]} ${v.y}`;
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const words = (a: AgeParts) => `${plural(a.years, "year")}, ${plural(a.months, "month")}, ${plural(a.days, "day")}`;

function DateField({ id, label, value, onChange, help, action }: { id: string; label: string; value: string; onChange: (v: string) => void; help?: string; action?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="flex items-end justify-between gap-2">
        <label htmlFor={id} className="field-label">
          {label}
        </label>
        {action}
      </div>
      <input id={id} type="date" className="input" value={value} min="1000-01-01" max="9999-12-31" onChange={(e) => onChange(e.target.value)} />
      {help && <p className="field-help">{help}</p>}
    </div>
  );
}

function useToday(): [string, (v: string) => void] {
  const [v, setV] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- today's date is only known in the browser
    setV(toISO(todayLocal()));
  }, []);
  return [v, setV];
}

/* =============================== Everyday age =============================== */

function EverydayAge() {
  const id = useId();
  const { used, announce, completed } = useTool();
  const [dob, setDob] = useState("");
  const [on, setOn] = useToday();
  const b = parseISODate(dob);
  const t = parseISODate(on);
  const valid = b && t && compare(b, t) <= 0;
  const age = valid ? diffCalendar(b, t) : null;
  const tot = valid ? totals(b, t) : null;
  const nb = valid ? nextBirthday(b, t) : null;
  const summary = age ? words(age) : null;
  useAnnounceResult(summary ? `Age ${summary}` : null, announce, completed);
  const leapBaby = b && b.m === 2 && b.d === 29;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Panel
        title="Dates"
        actions={
          <>
            <Button
              variant="ghost"
              icon="sparkles"
              onClick={() => {
                used("example");
                setDob("1990-05-15");
                setOn("2026-10-05");
              }}
            >
              Example
            </Button>
            <Button
              variant="ghost"
              icon="rotate-ccw"
              onClick={() => {
                setDob("");
                setOn(toISO(todayLocal()));
              }}
            >
              Reset
            </Button>
          </>
        }
      >
        <div className="grid gap-4 p-3 sm:p-4">
          <DateField
            id={`${id}-dob`}
            label="Date of birth"
            value={dob}
            onChange={(v) => {
              setDob(v);
              used("type");
            }}
          />
          <DateField
            id={`${id}-on`}
            label="Age on"
            value={on}
            onChange={setOn}
            help="Today by default. Pick any past or future date, or a second person's date of birth to get an age difference."
            action={
              <button type="button" className="mb-1.5 text-sm font-semibold text-accent underline" onClick={() => setOn(toISO(todayLocal()))}>
                Today
              </button>
            }
          />
          {b && t && compare(b, t) > 0 && <p className="text-sm text-danger">The date of birth is after the “Age on” date. Swap them or change one.</p>}
        </div>
      </Panel>
      <Panel title="Age" actions={<CopyButton text={summary ? `Age on ${on}: ${summary}` : ""} disabled={!summary} label="Copy result" />}>
        <div className="grid min-h-64 content-start gap-4 p-3 sm:p-4">
          <BigResult label={t ? `Age on ${longDate(t)}` : "Age"} value={age ? words(age) : DASH} />
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Total months" value={tot ? fmtNum(tot.months, 0) : DASH} />
            <StatTile label="Total weeks" value={tot ? fmtNum(tot.weeks, 0) : DASH} sub={tot ? `and ${plural(tot.weekDays, "day")}` : undefined} />
            <StatTile label="Total days" value={tot ? fmtNum(tot.days, 0) : DASH} />
            <StatTile label="Total hours (approx.)" value={tot ? fmtNum(tot.hours, 0) : DASH} sub="days × 24" />
          </div>
          <ResultRows
            rows={[
              ["Born on a", b ? weekday(b) : DASH],
              ["Next birthday", nb ? `${weekday(nb.date)}, ${longDate(nb.date)}` : DASH],
              ["Days until then", nb ? (nb.daysUntil === 0 ? "Today. Happy birthday!" : fmtNum(nb.daysUntil, 0)) : DASH],
              ["Turning", nb ? String(nb.turning) : DASH],
            ]}
          />
          {leapBaby && <p className="text-sm text-ink-3">Born on 29 February: in years without that date, this calculator counts the birthday on 28 February.</p>}
          <Formula
            title="Method"
            lines={
              age && b && t
                ? [
                    `Whole months from ${toISO(b)} to ${toISO(t)}: ${age.totalMonths} (= ${age.years} years ${age.months} months)`,
                    `Then days from the last monthly anniversary: ${age.days}`,
                    `Total days = ${fmtNum(tot!.days, 0)} (calendar days, leap days included)`,
                  ]
                : []
            }
          />
        </div>
      </Panel>
    </div>
  );
}

/* =============================== Chronological age (testing) =============================== */

function Chronological({ toolId }: { toolId: string }) {
  const id = useId();
  const { used, announce, completed } = useTool();
  const [opts, setOpts] = usePersistentOptions(toolId, { method: "borrow30" as "borrow30" | "calendar", rounding: "none" as Rounding });
  const [dob, setDob] = useState("");
  const [test, setTest] = useToday();
  const [prem, setPrem] = useState(false);
  const [gw, setGw] = useState("");
  const [gd, setGd] = useState("");
  const b = parseISODate(dob);
  const t = parseISODate(test);
  const valid = b && t && compare(b, t) <= 0;
  const diff = (from: YMD, to: YMD): AgeParts => (opts.method === "borrow30" ? diffBorrow30(from, to) : diffCalendar(from, to));
  const age = valid ? diff(b, t) : null;
  const rounded = age && opts.rounding !== "none" ? roundAge(age, opts.rounding) : null;

  const W = parseNum(gw);
  const Dd = gd.trim() ? parseNum(gd) : 0;
  const gestOk = Number.isFinite(W) && Number.isFinite(Dd) && W >= 22 && W <= 42 && Dd >= 0 && Dd <= 6;
  const due = prem && valid && gestOk && W < 40 ? dueDateFrom(b, W, Dd) : null;
  const adjusted = due && t && compare(due, t) <= 0 ? diff(due, t) : null;

  const main = age ? fmtSemicolon(age) : DASH;
  useAnnounceResult(age ? `Chronological age ${words(age)}` : null, announce, completed);

  // Worked subtraction for the 30-day method.
  let worked: string[] = [];
  if (age && b && t) {
    if (opts.method === "borrow30") {
      let ty = t.y;
      let tm = t.m;
      let td = t.d;
      worked = [`Test date   ${ty} y  ${tm} m  ${td} d`, `Birth date  ${b.y} y  ${b.m} m  ${b.d} d`];
      if (td < b.d) {
        td += 30;
        tm -= 1;
        worked.push(`Days: ${t.d} < ${b.d}, so borrow 1 month = 30 days → ${td} d, ${tm} m`);
      }
      if (tm < b.m) {
        tm += 12;
        ty -= 1;
        worked.push(`Months: ${tm - 12} < ${b.m}, so borrow 1 year = 12 months → ${tm} m, ${ty} y`);
      }
      worked.push(`Result: ${ty} − ${b.y} = ${age.years} y;  ${tm} − ${b.m} = ${age.months} m;  ${td} − ${b.d} = ${age.days} d  →  ${fmtSemicolon(age)}`);
    } else {
      const ca = diffCalendar(b, t);
      worked = [`Whole months from birth to test date: ${ca.totalMonths} = ${ca.years} y ${ca.months} m`, `Days since the last monthly anniversary: ${ca.days}`, `Result: ${fmtSemicolon(age)}`];
    }
  }

  const copy = age
    ? [
        `Chronological age: ${fmtSemicolon(age)} (${words(age)})`,
        rounded ? `Rounded: ${fmtSemicolon(rounded, false)}` : "",
        adjusted ? `Adjusted for prematurity: ${fmtSemicolon(adjusted)}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Panel
        title="Dates"
        actions={
          <>
            <Button
              variant="ghost"
              icon="sparkles"
              onClick={() => {
                used("example");
                setDob("2018-06-23");
                setTest("2026-10-05");
              }}
            >
              Example
            </Button>
            <Button
              variant="ghost"
              icon="rotate-ccw"
              onClick={() => {
                setDob("");
                setTest(toISO(todayLocal()));
                setPrem(false);
                setGw("");
                setGd("");
              }}
            >
              Reset
            </Button>
          </>
        }
      >
        <div className="grid gap-4 p-3 sm:p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <DateField
              id={`${id}-dob`}
              label="Birth date"
              value={dob}
              onChange={(v) => {
                setDob(v);
                used("type");
              }}
            />
            <DateField id={`${id}-test`} label="Test date" value={test} onChange={setTest} help="Today by default." />
          </div>
          <Segmented
            legend="Method"
            value={opts.method}
            onChange={(v) => setOpts((o) => ({ ...o, method: v }))}
            options={[
              { value: "borrow30", label: "Borrow 30 days (hand method)" },
              { value: "calendar", label: "Calendar months" },
            ]}
          />
          <div>
            <label htmlFor={`${id}-round`} className="field-label">
              Rounding
            </label>
            <select id={`${id}-round`} className="select" value={opts.rounding} onChange={(e) => setOpts((o) => ({ ...o, rounding: e.target.value as Rounding }))}>
              <option value="none">Don&apos;t round (report days)</option>
              <option value="half16">Round up to the next month at 16 days or more</option>
              <option value="half15">Round up to the next month at 15 days or more</option>
              <option value="truncate">Drop the days (never round up)</option>
            </select>
            <p className="field-help">Follow the rule in your test&apos;s manual. Most current norms tables use years and months without rounding up.</p>
          </div>
          <Checkbox checked={prem} onChange={setPrem} label="Also calculate adjusted age for prematurity" help="Born before 37 weeks. Usually applied up to age 2 (24 months)." />
          {prem && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor={`${id}-gw`} className="field-label">
                  Gestational age at birth (weeks)
                </label>
                <NumInput id={`${id}-gw`} value={gw} onChange={setGw} suffix="weeks" />
              </div>
              <div>
                <label htmlFor={`${id}-gd`} className="field-label">
                  Plus days (optional)
                </label>
                <NumInput id={`${id}-gd`} value={gd} onChange={setGd} suffix="days" />
              </div>
              {gw.trim() && !gestOk && <p className="text-sm text-danger sm:col-span-2">Enter 22 to 42 weeks and 0 to 6 days.</p>}
            </div>
          )}
          {b && t && compare(b, t) > 0 && <p className="text-sm text-danger">The birth date is after the test date.</p>}
        </div>
      </Panel>
      <Panel title="Chronological age" actions={<CopyButton text={copy} disabled={!copy} label="Copy result" />}>
        <div className="grid min-h-64 content-start gap-4 p-3 sm:p-4">
          <BigResult label="Years;months;days" value={main} sub={age ? words(age) : null} />
          <ResultRows
            rows={[
              ["Total months", age ? String(age.years * 12 + age.months) : DASH],
              ...(opts.rounding !== "none" ? ([["Rounded (years;months)", rounded ? fmtSemicolon(rounded, false) : DASH]] as [string, string][]) : []),
              ...(prem
                ? ([
                    ["Due date (40 weeks)", due ? longDate(due) : DASH],
                    ["Weeks born early", gestOk && W < 40 ? `${fmtNum(40 - W - Dd / 7, 1)}` : DASH],
                    ["Adjusted (corrected) age", adjusted ? `${fmtSemicolon(adjusted)}` : due ? "Test date is before the due date" : DASH],
                  ] as [string, string][])
                : []),
            ]}
          />
          <Formula title="Worked calculation" lines={worked} />
        </div>
      </Panel>
    </div>
  );
}

export default function AgeCalculator({ toolId, config }: WidgetProps) {
  return config?.mode === "chronological" ? <Chronological toolId={toolId} /> : <EverydayAge />;
}
