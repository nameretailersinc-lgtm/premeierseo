/*
 * Calendar arithmetic for age calculators. Dates are plain {y, m, d} (m = 1–12) handled in UTC,
 * so daylight-saving changes and time zones never shift a day.
 *
 * Two methods for years/months/days:
 *  - calendar (anniversary) method: count whole months from the birth date (a day that doesn't
 *    exist in the target month, e.g. 31st or 29 Feb, falls on that month's last day), then days.
 *  - 30-day borrowing: the hand method printed in many test manuals: subtract year/month/day
 *    columns; if days are negative borrow one month as 30 days; if months are negative borrow
 *    one year as 12 months.
 */

export interface YMD {
  y: number;
  m: number;
  d: number;
}

export function parseISODate(s: string): YMD | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const v = { y: +m[1], m: +m[2], d: +m[3] };
  if (v.m < 1 || v.m > 12 || v.d < 1 || v.d > daysInMonth(v.y, v.m) || v.y < 1) return null;
  return v;
}

export const toISO = (v: YMD) => `${String(v.y).padStart(4, "0")}-${String(v.m).padStart(2, "0")}-${String(v.d).padStart(2, "0")}`;

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** Days since 1970-01-01 (UTC). */
export function dayNumber(v: YMD): number {
  const t = new Date(0);
  t.setUTCFullYear(v.y, v.m - 1, v.d);
  t.setUTCHours(0, 0, 0, 0);
  return Math.round(t.getTime() / 86_400_000);
}

export function fromDayNumber(n: number): YMD {
  const t = new Date(n * 86_400_000);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

export const addDays = (v: YMD, n: number) => fromDayNumber(dayNumber(v) + n);

export function compare(a: YMD, b: YMD): number {
  return dayNumber(a) - dayNumber(b);
}

/** Add whole months; a day past the end of the target month is clamped to its last day. */
export function addMonthsClamped(v: YMD, k: number): YMD {
  const idx = v.y * 12 + (v.m - 1) + k;
  const y = Math.floor(idx / 12);
  const m = (idx % 12) + 1;
  return { y, m, d: Math.min(v.d, daysInMonth(y, m)) };
}

export interface AgeParts {
  years: number;
  months: number;
  days: number;
}

/** Calendar (anniversary) method. Requires from ≤ to. */
export function diffCalendar(from: YMD, to: YMD): AgeParts & { totalMonths: number } {
  let tm = (to.y - from.y) * 12 + (to.m - from.m);
  if (compare(addMonthsClamped(from, tm), to) > 0) tm--;
  const anchor = addMonthsClamped(from, tm);
  const days = dayNumber(to) - dayNumber(anchor);
  return { years: Math.floor(tm / 12), months: tm % 12, days, totalMonths: tm };
}

/** Test-manual hand method: borrow 30 days / 12 months. Requires from ≤ to. */
export function diffBorrow30(from: YMD, to: YMD): AgeParts {
  let y = to.y - from.y;
  let m = to.m - from.m;
  let d = to.d - from.d;
  if (d < 0) {
    d += 30;
    m -= 1;
  }
  if (m < 0) {
    m += 12;
    y -= 1;
  }
  return { years: y, months: m, days: d };
}

export type Rounding = "none" | "half15" | "half16" | "truncate";

/**
 * Round an age to whole months as some manuals require.
 *  - half15: 15 days or more rounds up to the next month; - half16: 16 days or more rounds up.
 *  - truncate: days are dropped.
 */
export function roundAge(a: AgeParts, rule: Rounding): AgeParts {
  if (rule === "none") return a;
  let { years, months } = a;
  const up = (rule === "half15" && a.days >= 15) || (rule === "half16" && a.days >= 16);
  if (up) months += 1;
  if (months >= 12) {
    years += 1;
    months -= 12;
  }
  return { years, months, days: 0 };
}

/** Next birthday on or after `today` (29 Feb birthdays fall on 28 Feb in common years). */
export function nextBirthday(birth: YMD, today: YMD) {
  let y = today.y;
  const on = (yr: number): YMD => ({ y: yr, m: birth.m, d: Math.min(birth.d, daysInMonth(yr, birth.m)) });
  let next = on(y);
  if (compare(next, today) < 0) next = on(++y);
  return { date: next, daysUntil: dayNumber(next) - dayNumber(today), turning: next.y - birth.y };
}

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export function weekday(v: YMD): string {
  return WEEKDAYS[new Date(Date.UTC(v.y, v.m - 1, v.d)).getUTCDay()];
}

export function totals(from: YMD, to: YMD) {
  const days = dayNumber(to) - dayNumber(from);
  const cal = diffCalendar(from, to);
  return { days, weeks: Math.floor(days / 7), weekDays: days % 7, months: cal.totalMonths, hours: days * 24 };
}

/**
 * Adjusted (corrected) age for a baby born before 40 weeks' gestation: age counted from the
 * due date, i.e. chronological age minus the weeks (and days) born early.
 */
export function dueDateFrom(birth: YMD, gestWeeks: number, gestDays = 0): YMD {
  const early = (40 * 7 - (gestWeeks * 7 + gestDays));
  return addDays(birth, early);
}

export const fmtSemicolon = (a: AgeParts, withDays = true) => (withDays ? `${a.years};${a.months};${a.days}` : `${a.years};${a.months}`);

export function todayLocal(): YMD {
  const t = new Date();
  return { y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() };
}
