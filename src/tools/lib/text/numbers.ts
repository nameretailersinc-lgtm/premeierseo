/*
 * Number generators for the random-generators widget.
 *   randomNumbers  → uniform random integers or decimals (crypto.getRandomValues via ./random)
 *   numberList     → deterministic sequences: start/end/step, primes, Fibonacci, with padding
 * Pure functions (no React) so they can be tested with node.
 */
import { randomBelow, sampleIndices } from "./random";

export const MAX_RANDOM_COUNT = 10_000;
export const MAX_LIST_ITEMS = 100_000;

export type SortOrder = "none" | "asc" | "desc";

export interface RandomNumberOptions {
  min: number;
  max: number;
  count: number;
  unique: boolean;
  /** Digits after the decimal point (0 = integers). */
  decimals: number;
  sort: SortOrder;
}

export interface RandomNumberResult {
  values: string[];
  /** How many distinct values the range contains at this precision. */
  possible: number;
  error?: string;
}

/**
 * Draws `count` numbers uniformly from the grid min, min + 10^-d, …, max.
 * Integers and decimals use the same path: scale to integers, draw with rejection sampling, scale back.
 */
export function randomNumbers(o: RandomNumberOptions): RandomNumberResult {
  const d = Math.min(10, Math.max(0, Math.floor(o.decimals)));
  const count = Math.floor(o.count);
  if (!Number.isFinite(o.min) || !Number.isFinite(o.max)) return { values: [], possible: 0, error: "Enter a minimum and a maximum." };
  if (!Number.isFinite(count) || count < 1) return { values: [], possible: 0, error: "Generate at least 1 number." };
  if (count > MAX_RANDOM_COUNT) return { values: [], possible: 0, error: `Generate at most ${MAX_RANDOM_COUNT.toLocaleString("en-US")} numbers at a time.` };
  const scale = 10 ** d;
  let lo = Math.round(o.min * scale);
  let hi = Math.round(o.max * scale);
  if (lo > hi) [lo, hi] = [hi, lo];
  const possible = hi - lo + 1;
  if (!Number.isSafeInteger(lo) || !Number.isSafeInteger(hi) || possible > 2 ** 53) {
    return { values: [], possible: 0, error: "The range is too large at this precision. Use a smaller range or fewer decimal places." };
  }
  if (o.unique && count > possible) {
    return {
      values: [],
      possible,
      error: `The range contains only ${possible.toLocaleString("en-US")} different ${d ? "values at this precision" : "whole numbers"}, so ${count.toLocaleString("en-US")} unique numbers are impossible. Widen the range, add decimal places or allow repeats.`,
    };
  }
  const ints = o.unique ? sampleIndices(possible, count).map((i) => lo + i) : Array.from({ length: count }, () => lo + randomBelow(possible));
  if (o.sort === "asc") ints.sort((a, b) => a - b);
  if (o.sort === "desc") ints.sort((a, b) => b - a);
  return { values: ints.map((v) => formatScaled(v, d)), possible };
}

/** Formats an integer that represents v / 10^d without floating-point noise (e.g. 30 with d=1 → "3.0"). */
export function formatScaled(v: number, d: number): string {
  if (!d) return String(v);
  const neg = v < 0;
  const s = String(Math.abs(v)).padStart(d + 1, "0");
  return `${neg ? "-" : ""}${s.slice(0, -d)}.${s.slice(-d)}`;
}

/* ---------- Number list ---------- */

export type ListKind = "sequence" | "primes" | "fibonacci";
export type ListFilter = "all" | "even" | "odd";

export interface NumberListOptions {
  kind: ListKind;
  start: number;
  end: number;
  /** Size of each step (sign is ignored: the direction follows start → end). */
  step: number;
  filter: ListFilter;
  /** Minimum digits; shorter numbers get leading zeros (0 = off). */
  pad: number;
  prefix: string;
  suffix: string;
  separator: string;
  reverse: boolean;
}

export interface NumberListResult {
  output: string;
  count: number;
  error?: string;
}

const decimalsOf = (n: number) => {
  const s = String(n);
  if (s.includes("e-")) return Number(s.split("e-")[1]);
  return s.includes(".") ? s.split(".")[1].length : 0;
};

function isPrime(n: number): boolean {
  if (n < 2 || !Number.isInteger(n)) return false;
  if (n % 2 === 0) return n === 2;
  if (n % 3 === 0) return n === 3;
  for (let i = 5; i * i <= n; i += 6) if (n % i === 0 || n % (i + 2) === 0) return false;
  return true;
}

function padNumber(s: string, width: number): string {
  if (width <= 0) return s;
  const neg = s.startsWith("-");
  const body = neg ? s.slice(1) : s;
  const [int, frac] = body.split(".");
  const padded = int.padStart(width, "0") + (frac !== undefined ? "." + frac : "");
  return (neg ? "-" : "") + padded;
}

export function numberList(o: NumberListOptions): NumberListResult {
  const { start, end } = o;
  if (!Number.isFinite(start) || !Number.isFinite(end)) return { output: "", count: 0, error: "Enter a start and an end number." };
  const values: string[] = [];
  const tooMany = () => ({ output: "", count: 0, error: `That list would have more than ${MAX_LIST_ITEMS.toLocaleString("en-US")} numbers. Narrow the range or use a bigger step.` });

  if (o.kind === "sequence") {
    const step = Math.abs(o.step);
    if (!Number.isFinite(step) || step === 0) return { output: "", count: 0, error: "The step must be a number other than 0." };
    const d = Math.min(10, Math.max(decimalsOf(start), decimalsOf(step)));
    const scale = 10 ** d;
    const a = Math.round(start * scale);
    const b = Math.round(end * scale);
    const st = Math.round(step * scale);
    const dir = b >= a ? 1 : -1;
    const n = Math.floor(Math.abs(b - a) / st) + 1;
    if (n > MAX_LIST_ITEMS * 2) return tooMany();
    for (let i = 0; i < n; i++) {
      const v = a + dir * i * st;
      if (o.filter !== "all") {
        if (d && v % scale !== 0) continue; // decimals are neither even nor odd
        const k = v / scale;
        if (o.filter === "even" ? k % 2 !== 0 : Math.abs(k % 2) !== 1) continue;
      }
      values.push(formatScaled(v, d));
      if (values.length > MAX_LIST_ITEMS) return tooMany();
    }
  } else if (o.kind === "primes") {
    const lo = Math.ceil(Math.min(start, end));
    const hi = Math.floor(Math.max(start, end));
    if (hi - lo > 10_000_000) return { output: "", count: 0, error: "For primes, keep the range within 10,000,000 numbers." };
    for (let v = Math.max(2, lo); v <= hi; v++) {
      if (isPrime(v)) values.push(String(v));
      if (values.length > MAX_LIST_ITEMS) return tooMany();
    }
    if (end < start) values.reverse();
  } else {
    // Fibonacci terms (0, 1, 1, 2, 3, 5 …) whose value lies between start and end.
    const lo = Math.min(start, end);
    const hi = Math.max(start, end);
    let x = 0;
    let y = 1;
    while (x <= hi && Number.isSafeInteger(x)) {
      if (x >= lo) values.push(String(x));
      [x, y] = [y, x + y];
    }
    if (end < start) values.reverse();
  }

  if (o.reverse) values.reverse();
  const width = Math.min(30, Math.max(0, Math.floor(o.pad)));
  const out = values.map((v) => o.prefix + padNumber(v, width) + o.suffix);
  return { output: out.join(o.separator), count: out.length };
}
