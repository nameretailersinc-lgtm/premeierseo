/*
 * Pixel-width estimates for search snippets.
 * Character widths are Arial/Helvetica advance widths (units per 1000 em, from the standard Helvetica AFM metrics,
 * which Arial matches). Google renders result titles in Arial-like fonts at about 20 px and snippets at 13–14 px.
 * Google doesn't publish truncation limits; the limits below are the benchmarks most snippet tools use.
 * Results are estimates: real truncation depends on the device, the font that is actually used and on Google rewriting.
 */

const W: Record<string, number> = {
  " ": 278, "!": 278, '"': 355, "#": 556, $: 556, "%": 889, "&": 667, "'": 191, "(": 333, ")": 333, "*": 389, "+": 584,
  ",": 278, "-": 333, ".": 278, "/": 278, ":": 278, ";": 278, "<": 584, "=": 584, ">": 584, "?": 556, "@": 1015,
  A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278, J: 500, K: 667, L: 556, M: 833, N: 722, O: 778,
  P: 667, Q: 778, R: 722, S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
  "[": 278, "\\": 278, "]": 278, "^": 469, _: 556, "`": 333,
  a: 556, b: 556, c: 500, d: 556, e: 556, f: 278, g: 556, h: 556, i: 222, j: 222, k: 500, l: 222, m: 833, n: 556, o: 556,
  p: 556, q: 556, r: 333, s: 500, t: 278, u: 556, v: 500, w: 722, x: 500, y: 500, z: 500,
  "{": 334, "|": 260, "}": 334, "~": 584,
  "–": 556, "—": 1000, "‘": 222, "’": 222, "“": 333, "”": 333, "…": 1000, "•": 350, "·": 278, "©": 737, "®": 737, "™": 1000,
  "€": 556, "£": 556, "¥": 556, "×": 584,
};
for (const d of "0123456789") W[d] = 556;

function charUnits(ch: string): number {
  const w = W[ch];
  if (w !== undefined) return w;
  const cp = ch.codePointAt(0) ?? 0;
  // CJK, Hangul, full-width forms: one em.
  if ((cp >= 0x2e80 && cp <= 0x9fff) || (cp >= 0xac00 && cp <= 0xd7af) || (cp >= 0xff00 && cp <= 0xffef)) return 1000;
  // Emoji and pictographs
  if (cp >= 0x1f300) return 1000;
  // Accented Latin: width of the base letter
  const base = ch.normalize("NFD")[0];
  if (base !== ch && W[base] !== undefined) return W[base];
  return 556;
}

/** Estimated rendered width in CSS pixels. */
export function textWidth(text: string, fontPx: number): number {
  let units = 0;
  for (const ch of text) units += charUnits(ch);
  return Math.round((units * fontPx) / 1000);
}

/** Cut text to fit maxPx (including a trailing " ..."), at a word boundary when possible. */
export function truncateToWidth(text: string, fontPx: number, maxPx: number): { text: string; truncated: boolean } {
  const clean = text.replace(/\s+/g, " ").trim();
  if (textWidth(clean, fontPx) <= maxPx) return { text: clean, truncated: false };
  const ellipsis = " ...";
  const budget = maxPx - textWidth(ellipsis, fontPx);
  let units = 0;
  let cut = 0;
  const chars = [...clean];
  for (let i = 0; i < chars.length; i++) {
    units += charUnits(chars[i]);
    if ((units * fontPx) / 1000 > budget) break;
    cut = i + 1;
  }
  let out = chars.slice(0, cut).join("");
  const lastSpace = out.lastIndexOf(" ");
  if (lastSpace > out.length * 0.6) out = out.slice(0, lastSpace);
  return { text: out.replace(/[\s,;:–-]+$/, "") + ellipsis, truncated: true };
}

/** Benchmarks used across the snippet tools. */
export const SNIPPET = {
  titleFontPx: 20,
  titleMaxPx: 600,
  descFontPx: 13,
  descMaxDesktopPx: 920,
  descMaxMobilePx: 680,
} as const;

export type LengthVerdict = "empty" | "short" | "good" | "long";

export function titleVerdict(title: string): { px: number; chars: number; verdict: LengthVerdict } {
  const t = title.replace(/\s+/g, " ").trim();
  const px = textWidth(t, SNIPPET.titleFontPx);
  const chars = [...t].length;
  const verdict: LengthVerdict = !chars ? "empty" : px > SNIPPET.titleMaxPx ? "long" : chars < 30 ? "short" : "good";
  return { px, chars, verdict };
}

export function descriptionVerdict(desc: string): { px: number; chars: number; verdict: LengthVerdict; mobileCut: boolean } {
  const t = desc.replace(/\s+/g, " ").trim();
  const px = textWidth(t, SNIPPET.descFontPx);
  const chars = [...t].length;
  const verdict: LengthVerdict = !chars ? "empty" : px > SNIPPET.descMaxDesktopPx ? "long" : chars < 70 ? "short" : "good";
  return { px, chars, verdict, mobileCut: px > SNIPPET.descMaxMobilePx };
}
