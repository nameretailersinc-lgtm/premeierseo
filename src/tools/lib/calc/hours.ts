/*
 * Time-card arithmetic. Times are minutes after midnight. An end time earlier than (or equal to)
 * the start time is treated as the next day (overnight shift) when `overnight` is "auto".
 */

/** Parse "9", "9:30", "09:30", "9.30", "930", "9:30 pm", "21:30". Returns minutes after midnight or NaN. */
export function parseTime(raw: string): number {
  const s = raw.trim().toLowerCase().replace(/\s+/g, "");
  if (!s) return NaN;
  const m = /^(\d{1,2})(?:[:.h]?(\d{2}))?(am|pm|a|p)?$/.exec(s);
  if (!m) return NaN;
  let h = +m[1];
  const min = m[2] ? +m[2] : 0;
  const ap = m[3];
  if (min > 59) return NaN;
  if (ap) {
    if (h < 1 || h > 12) return NaN;
    if (ap.startsWith("a")) h = h === 12 ? 0 : h;
    else h = h === 12 ? 12 : h + 12;
  } else if (h > 24 || (h === 24 && min > 0)) return NaN;
  return h * 60 + min;
}

export interface ShiftResult {
  /** Worked minutes after the break. */
  minutes: number;
  /** Span from start to end before breaks. */
  span: number;
  overnight: boolean;
  error?: string;
}

export function shiftMinutes(start: number, end: number, breakMin: number): ShiftResult {
  if (!Number.isFinite(start) || !Number.isFinite(end)) return { minutes: NaN, span: NaN, overnight: false };
  let span = end - start;
  let overnight = false;
  if (span <= 0) {
    span += 24 * 60;
    overnight = true;
  }
  if (start === end) return { minutes: NaN, span: 0, overnight: false, error: "Start and end are the same time." };
  const br = Number.isFinite(breakMin) && breakMin > 0 ? breakMin : 0;
  if (br >= span) return { minutes: NaN, span, overnight, error: "The break is as long as the shift." };
  return { minutes: span - br, span, overnight };
}

/** 465 → "7:45" */
export function hhmm(min: number): string {
  if (!Number.isFinite(min)) return "—";
  const sign = min < 0 ? "-" : "";
  const a = Math.round(Math.abs(min));
  return `${sign}${Math.floor(a / 60)}:${String(a % 60).padStart(2, "0")}`;
}

/** 465 → 7.75 */
export const decimalHours = (min: number) => min / 60;

/** "7:45" or "7.75" or "7h 45m" → minutes */
export function parseDuration(raw: string): number {
  const s = raw.trim().toLowerCase();
  if (!s) return NaN;
  let m = /^(\d+):(\d{1,2})$/.exec(s);
  if (m) return +m[2] < 60 ? +m[1] * 60 + +m[2] : NaN;
  m = /^(?:(\d+(?:\.\d+)?)\s*h(?:ours?|rs?)?)?\s*(?:(\d+)\s*m(?:in(?:utes?)?)?)?$/.exec(s);
  if (m && (m[1] || m[2])) return (m[1] ? +m[1] * 60 : 0) + (m[2] ? +m[2] : 0);
  if (/^\d*\.?\d+$/.test(s)) return Number(s) * 60;
  return NaN;
}

/** Minutes after midnight → "08:00" */
export function clock(min: number): string {
  const v = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
}
