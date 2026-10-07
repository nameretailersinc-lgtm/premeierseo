/*
 * Unix time helpers. Unit detection by magnitude, time-zone conversion with Intl
 * (IANA zones, daylight saving included), and wall-clock time → epoch for any zone.
 */

export type Unit = "s" | "ms" | "us" | "ns";
export const UNIT_LABEL: Record<Unit, string> = { s: "seconds", ms: "milliseconds", us: "microseconds", ns: "nanoseconds" };
const PER_MS: Record<Unit, number> = { s: 1 / 1000, ms: 1, us: 1000, ns: 1_000_000 };

export interface ParsedTs {
  ms?: number;
  unit?: Unit;
  error?: string;
}

/** Guess the unit from the number of integer digits: ≤11 seconds, 12–14 ms, 15–17 µs, 18+ ns. */
export function detectUnit(intDigits: number): Unit {
  if (intDigits <= 11) return "s";
  if (intDigits <= 14) return "ms";
  if (intDigits <= 17) return "us";
  return "ns";
}

export function parseTimestamp(input: string, unit: Unit | "auto"): ParsedTs {
  const s = input.trim().replace(/[_,\s]/g, "");
  if (!s) return {};
  if (!/^-?\d+(\.\d+)?$/.test(s)) return { error: `“${input.trim()}” isn't a number. A Unix timestamp is a count of seconds (or milliseconds) such as 1700000000.` };
  const intDigits = s.replace(/^-/, "").split(".")[0].replace(/^0+(?=\d)/, "").length;
  const u = unit === "auto" ? detectUnit(intDigits) : unit;
  let ms: number;
  if (u === "us" || u === "ns") {
    // Keep precision for long integers.
    const [ip] = s.split(".");
    const big = BigInt(ip);
    ms = Number(big / BigInt(PER_MS[u])) + Number(big % BigInt(PER_MS[u])) / PER_MS[u];
  } else ms = Number(s) / PER_MS[u];
  if (!Number.isFinite(ms) || Math.abs(ms) > 8.64e15) return { error: "That timestamp is outside the range JavaScript dates can show (about ±275,000 years from 1970)." };
  return { ms, unit: u };
}

export function fromMs(ms: number, unit: Unit): string {
  if (unit === "s") return String(Math.floor(ms / 1000));
  if (unit === "ms") return String(Math.floor(ms));
  if (unit === "us") return (BigInt(Math.floor(ms)) * BigInt(1000)).toString();
  return (BigInt(Math.floor(ms)) * BigInt(1_000_000)).toString();
}

/** Offset of `tz` from UTC at instant `ms`, in minutes (e.g. +330 for Asia/Kolkata). */
export function zoneOffset(ms: number, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p: Record<string, number> = {};
  for (const x of dtf.formatToParts(new Date(ms))) if (x.type !== "literal") p[x.type] = Number(x.value);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour === 24 ? 0 : p.hour, p.minute, p.second);
  return Math.round((asUtc - (ms - (((ms % 1000) + 1000) % 1000))) / 60000);
}

export function fmtOffset(min: number): string {
  const sign = min < 0 ? "-" : "+";
  const a = Math.abs(min);
  return `${sign}${String(Math.floor(a / 60)).padStart(2, "0")}:${String(a % 60).padStart(2, "0")}`;
}

/** ISO 8601 with the zone's offset, e.g. 2023-11-14T22:13:20+00:00. */
export function isoInZone(msIn: number, tz: string): string {
  const ms = Math.floor(msIn);
  const off = zoneOffset(ms, tz);
  const d = new Date(ms + off * 60000);
  const frac = ms % 1000 ? "." + String(((ms % 1000) + 1000) % 1000).padStart(3, "0") : "";
  return d.toISOString().slice(0, 19) + frac + (off === 0 && tz === "UTC" ? "Z" : fmtOffset(off));
}

export function readable(ms: number, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZoneName: "short",
  }).format(new Date(ms));
}

/**
 * Wall-clock time in `tz` → epoch ms. Handles daylight-saving changes: a time skipped by the
 * spring-forward gap is moved forward; a repeated time in the autumn uses the earlier instant.
 */
export function wallToEpoch(y: number, mo: number, d: number, h: number, mi: number, s: number, tz: string): { ms: number; note?: string } {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  const o1 = zoneOffset(guess, tz);
  let t = guess - o1 * 60000;
  const o2 = zoneOffset(t, tz);
  if (o2 !== o1) t = guess - o2 * 60000;
  const o3 = zoneOffset(t, tz);
  let note: string | undefined;
  // Check that the result really shows the requested wall time.
  const back = new Date(t + o3 * 60000);
  if (back.getUTCHours() !== h || back.getUTCMinutes() !== mi) note = `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")} doesn't exist on that day in ${tz} (clocks go forward), so the next valid time was used.`;
  else {
    for (const alt of [t - 3600_000, t + 3600_000]) {
      const altOff = zoneOffset(alt, tz);
      const altBack = new Date(alt + altOff * 60000);
      if (altBack.getUTCHours() === h && altBack.getUTCMinutes() === mi && altOff !== o3) {
        t = Math.min(t, alt);
        note = `That time happens twice in ${tz} (clocks go back); the first occurrence is used.`;
      }
    }
  }
  return { ms: t, note };
}

export function relative(ms: number, now: number): string {
  const diff = ms - now;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 365.2425 * 864e5],
    ["month", 30.436875 * 864e5],
    ["week", 7 * 864e5],
    ["day", 864e5],
    ["hour", 36e5],
    ["minute", 6e4],
    ["second", 1e3],
  ];
  for (const [u, size] of units) if (abs >= size || u === "second") return rtf.format(Math.round(diff / size), u);
  return "now";
}

export function zones(): string[] {
  try {
    const list = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone");
    if (list?.length) return list.includes("UTC") ? list : ["UTC", ...list];
  } catch {
    /* fall back */
  }
  return ["UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Kolkata", "Asia/Karachi", "Asia/Dubai", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney"];
}
