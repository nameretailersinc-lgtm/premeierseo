/*
 * Random strings and text shuffling (random-string-generator).
 * Every character is drawn with crypto.getRandomValues via ./random (rejection sampling, no modulo bias).
 */
import { graphemes, randomBelow, shuffle, splitLines } from "./random";

export const CHARSETS = {
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lower: "abcdefghijklmnopqrstuvwxyz",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.?/~",
  hex: "0123456789abcdef",
} as const;

/** Characters that are easy to confuse when read or typed: I l 1 | O 0 o. */
export const SIMILAR = "Il1|O0o";

export const MAX_STRING_LENGTH = 1024;
export const MAX_STRING_COUNT = 1000;

export interface RandomStringOptions {
  length: number;
  count: number;
  upper: boolean;
  lower: boolean;
  digits: boolean;
  symbols: boolean;
  /** Extra characters added to the pool (deduplicated). */
  custom: string;
  excludeSimilar: boolean;
  /** No string appears twice in the batch. */
  unique: boolean;
}

export function buildPool(o: Pick<RandomStringOptions, "upper" | "lower" | "digits" | "symbols" | "custom" | "excludeSimilar">): string[] {
  let s = "";
  if (o.upper) s += CHARSETS.upper;
  if (o.lower) s += CHARSETS.lower;
  if (o.digits) s += CHARSETS.digits;
  if (o.symbols) s += CHARSETS.symbols;
  s += o.custom ?? "";
  let pool = [...new Set(graphemes(s).filter((c) => !/^\s$/.test(c)))];
  if (o.excludeSimilar) pool = pool.filter((c) => !SIMILAR.includes(c));
  return pool;
}

/** Bits of entropy for one string: length × log2(pool size). */
export function entropyBits(length: number, poolSize: number): number {
  return poolSize > 1 ? length * Math.log2(poolSize) : 0;
}

export function randomStrings(o: RandomStringOptions): { values: string[]; pool: number; error?: string } {
  const pool = buildPool(o);
  const length = Math.floor(o.length);
  const count = Math.floor(o.count);
  if (!pool.length) return { values: [], pool: 0, error: "Choose at least one character set or type your own characters." };
  if (!(length >= 1 && length <= MAX_STRING_LENGTH)) return { values: [], pool: pool.length, error: `Length must be between 1 and ${MAX_STRING_LENGTH}.` };
  if (!(count >= 1 && count <= MAX_STRING_COUNT)) return { values: [], pool: pool.length, error: `Quantity must be between 1 and ${MAX_STRING_COUNT}.` };
  const combos = pool.length ** length;
  if (o.unique && combos < count) {
    return { values: [], pool: pool.length, error: `Only ${combos.toLocaleString("en-US")} different strings of that length exist with these characters. Lower the quantity or allow repeats.` };
  }
  const one = () => {
    let s = "";
    for (let i = 0; i < length; i++) s += pool[randomBelow(pool.length)];
    return s;
  };
  const values: string[] = [];
  const seen = new Set<string>();
  let guard = 0;
  while (values.length < count) {
    const s = one();
    if (o.unique) {
      if (seen.has(s)) {
        if (++guard > count * 50) break;
        continue;
      }
      seen.add(s);
    }
    values.push(s);
  }
  return { values, pool: pool.length };
}

/* ---------- Shuffle my text (string randomizer) ---------- */

export type ShuffleMode = "characters" | "letters-in-words" | "words";

export interface ShuffleOptions {
  mode: ShuffleMode;
  /** Shuffle each line separately (line breaks stay where they are). */
  perLine: boolean;
  /** Keep spaces where they are when shuffling all characters. */
  keepSpaces: boolean;
}

function shuffleChunk(text: string, o: ShuffleOptions): string {
  if (o.mode === "words") {
    const words = text.split(/\s+/).filter(Boolean);
    return shuffle(words).join(" ");
  }
  if (o.mode === "letters-in-words") {
    return text.replace(/[\p{L}\p{N}'’]+/gu, (w) => shuffle(graphemes(w)).join(""));
  }
  const chars = graphemes(text);
  if (!o.keepSpaces) return shuffle(chars.filter((c) => c !== "\n")).join("");
  const movable = chars.filter((c) => !/^\s$/.test(c));
  const mixed = shuffle(movable);
  let k = 0;
  return chars.map((c) => (/^\s$/.test(c) ? c : mixed[k++])).join("");
}

export function shuffleText(text: string, o: ShuffleOptions): string {
  if (o.perLine) return splitLines(text).map((l) => shuffleChunk(l, o)).join("\n");
  return shuffleChunk(text.replace(/\r\n?/g, "\n"), o);
}
