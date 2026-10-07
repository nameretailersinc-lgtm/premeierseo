/*
 * Cryptographically secure randomness helpers (crypto.getRandomValues).
 * Math.random is never used: every pick, shuffle and number is uniform and unpredictable.
 */

function cryptoObj(): Crypto {
  if (typeof globalThis.crypto?.getRandomValues !== "function") throw new Error("This browser has no secure random number generator (Web Crypto).");
  return globalThis.crypto;
}

/** Uniform integer in [0, n) by rejection sampling (no modulo bias). Supports n up to 2^53. */
export function randomBelow(n: number): number {
  if (!Number.isFinite(n) || n < 1) throw new Error("Range must contain at least one value.");
  if (n === 1) return 0;
  const c = cryptoObj();
  if (n <= 0x1_0000_0000) {
    const buf = new Uint32Array(1);
    const limit = Math.floor(0x1_0000_0000 / n) * n;
    for (;;) {
      c.getRandomValues(buf);
      if (buf[0] < limit) return buf[0] % n;
    }
  }
  // 53-bit path for large ranges: build a 53-bit integer from two 32-bit words.
  const buf = new Uint32Array(2);
  const max = 2 ** 53;
  const limit = Math.floor(max / n) * n;
  for (;;) {
    c.getRandomValues(buf);
    const v = (buf[0] & 0x1f_ffff) * 0x1_0000_0000 + buf[1];
    if (v < limit) return v % n;
  }
}

/** Uniform integer in [min, max] inclusive. */
export function randomInt(min: number, max: number): number {
  return min + randomBelow(max - min + 1);
}

/** Fisher–Yates shuffle (returns a new array). */
export function shuffle<T>(items: readonly T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomBelow(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** k distinct indices from [0, n) in random order (partial Fisher–Yates; sparse for huge n). */
export function sampleIndices(n: number, k: number): number[] {
  if (k > n) throw new Error("Cannot pick more unique values than the range contains.");
  const swapped = new Map<number, number>();
  const out: number[] = [];
  for (let i = 0; i < k; i++) {
    const j = i + randomBelow(n - i);
    const vi = swapped.get(i) ?? i;
    const vj = swapped.get(j) ?? j;
    out.push(vj);
    swapped.set(j, vi);
  }
  return out;
}

export function randomBytes(n: number): Uint8Array {
  const b = new Uint8Array(n);
  cryptoObj().getRandomValues(b);
  return b;
}

/** Split text into user-perceived characters (grapheme clusters) so emoji and accents stay intact. */
export function graphemes(s: string): string[] {
  const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: { granularity: string }) => { segment(s: string): Iterable<{ segment: string }> } }).Segmenter;
  if (Seg) return Array.from(new Seg(undefined, { granularity: "grapheme" }).segment(s), (x) => x.segment);
  // Fallback: code points, keeping combining marks, variation selectors and ZWJ sequences attached.
  const out: string[] = [];
  for (const ch of Array.from(s)) {
    if (out.length && (/^[\p{M}\u200d\ufe0e\ufe0f\u{1F3FB}-\u{1F3FF}]$/u.test(ch) || out[out.length - 1].endsWith("\u200d"))) out[out.length - 1] += ch;
    else out.push(ch);
  }
  return out;
}

export const normalizeNewlines = (s: string) => s.replace(/\r\n?/g, "\n");
export const splitLines = (s: string) => normalizeNewlines(s).split("\n");
export const plural = (n: number, w: string, pl?: string) => `${n.toLocaleString("en-US")} ${n === 1 ? w : (pl ?? w + "s")}`;
