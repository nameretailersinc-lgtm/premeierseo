/*
 * Character counting the way different platforms count.
 * - Characters: user-perceived characters (grapheme clusters), so 👍🏽 and é count once.
 * - UTF-16 code units: what JavaScript and most web text boxes count; most emoji count 2.
 * - X (Twitter): weighted count following the open-source twitter-text library (v3 config).
 * - SMS: GSM 03.38 7-bit alphabet or UCS-2, split into segments.
 */
import { graphemes } from "./random";

export function utf8Bytes(s: string): number {
  return new TextEncoder().encode(s).length;
}

/* twitter-text v3: code points in these ranges weigh 1, everything else 2; emoji 2; links 23. */
const X_RANGES: [number, number][] = [
  [0, 4351],
  [8192, 8205],
  [8208, 8223],
  [8242, 8247],
];
const URL_RE = /\bhttps?:\/\/[^\s]+|\bwww\.[^\s]+\.[a-z]{2,}[^\s]*/gi;
const EMOJI = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;

export function xLength(text: string): number {
  let weight = 0;
  const rest = text.normalize("NFC").replace(URL_RE, () => {
    weight += 23;
    return "";
  });
  for (const g of graphemes(rest)) {
    if (EMOJI.test(g)) {
      weight += 2;
      continue;
    }
    for (const ch of Array.from(g)) {
      const cp = ch.codePointAt(0)!;
      weight += X_RANGES.some(([a, b]) => cp >= a && cp <= b) ? 1 : 2;
    }
  }
  return weight;
}

const GSM_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXT = "^{}\\[~]|€\f";
const BASIC = new Set(Array.from(GSM_BASIC));
const EXT = new Set(Array.from(GSM_EXT));

export interface SmsInfo {
  encoding: "GSM-7" | "UCS-2";
  /** Septets for GSM-7 (extension characters take 2), UTF-16 code units for UCS-2. */
  units: number;
  segments: number;
  perSegment: number;
  /** Characters that forced UCS-2 (first eight). */
  nonGsm: string[];
}

/** Greedy packing: a character that needs 2 units is never split across two segments. */
function pack(sizes: number[], cap: number): number {
  let segs = 1;
  let used = 0;
  for (const s of sizes) {
    if (used + s > cap) {
      segs++;
      used = 0;
    }
    used += s;
  }
  return segs;
}

export function smsInfo(text: string): SmsInfo {
  const chars = Array.from(text.replace(/\r\n?/g, "\n"));
  if (!chars.length) return { encoding: "GSM-7", units: 0, segments: 0, perSegment: 160, nonGsm: [] };
  const nonGsm = [...new Set(chars.filter((c) => !BASIC.has(c) && !EXT.has(c)))];
  if (!nonGsm.length) {
    const sizes = chars.map((c) => (EXT.has(c) ? 2 : 1));
    const units = sizes.reduce((a, b) => a + b, 0);
    if (units <= 160) return { encoding: "GSM-7", units, segments: 1, perSegment: 160, nonGsm };
    return { encoding: "GSM-7", units, segments: pack(sizes, 153), perSegment: 153, nonGsm };
  }
  const sizes = chars.map((c) => (c.codePointAt(0)! > 0xffff ? 2 : 1));
  const units = sizes.reduce((a, b) => a + b, 0);
  const shown = nonGsm.slice(0, 8);
  if (units <= 70) return { encoding: "UCS-2", units, segments: 1, perSegment: 70, nonGsm: shown };
  return { encoding: "UCS-2", units, segments: pack(sizes, 67), perSegment: 67, nonGsm: shown };
}

export interface CharStats {
  chars: number;
  noSpaces: number;
  codeUnits: number;
  codePoints: number;
  bytes: number;
  words: number;
  lines: number;
  spaces: number;
}

export function charStats(text: string): CharStats {
  const g = graphemes(text);
  const spaces = g.filter((c) => /^\s+$/u.test(c)).length;
  return {
    chars: g.length,
    noSpaces: g.length - spaces,
    codeUnits: text.length,
    codePoints: Array.from(text).length,
    bytes: utf8Bytes(text),
    words: (text.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) ?? []).length,
    lines: text ? text.split(/\r\n?|\n/).length : 0,
    spaces,
  };
}
