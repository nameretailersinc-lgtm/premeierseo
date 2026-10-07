/*
 * Counting and listing combinations, permutations and cross products, plus word blending.
 * Counts use BigInt so the size warning is exact even when the result is astronomically large.
 */

const B = (n: number) => BigInt(n);

export function factorial(n: number): bigint {
  let r = B(1);
  for (let i = 2; i <= n; i++) r *= B(i);
  return r;
}

/** n choose r. */
export function nCr(n: number, r: number): bigint {
  if (r < 0 || r > n) return B(0);
  r = Math.min(r, n - r);
  let num = B(1);
  let den = B(1);
  for (let i = 0; i < r; i++) {
    num *= B(n - i);
    den *= B(i + 1);
  }
  return num / den;
}

/** n!/(n−r)! */
export function nPr(n: number, r: number): bigint {
  if (r < 0 || r > n) return B(0);
  let v = B(1);
  for (let i = 0; i < r; i++) v *= B(n - i);
  return v;
}

export function countCombinations(n: number, r: number, repetition: boolean): bigint {
  return repetition ? (n === 0 ? B(0) : nCr(n + r - 1, r)) : nCr(n, r);
}

export function countPermutations(n: number, r: number, repetition: boolean): bigint {
  return repetition ? B(n) ** B(r) : nPr(n, r);
}

/** Number of distinct full-length arrangements of a multiset: n! / (k1! k2! …). */
export function countDistinctPermutations(items: string[]): bigint {
  const counts = new Map<string, number>();
  items.forEach((x) => counts.set(x, (counts.get(x) ?? 0) + 1));
  let d = B(1);
  counts.forEach((k) => (d *= factorial(k)));
  return factorial(items.length) / d;
}

export function countProduct(lists: string[][]): bigint {
  return lists.reduce((acc, l) => acc * B(l.length), B(1));
}

/** Cross product (A × B × …) in order: first list varies slowest. */
export function* product(lists: string[][]): Generator<string[]> {
  if (!lists.length || lists.some((l) => !l.length)) return;
  const idx = new Array(lists.length).fill(0);
  for (;;) {
    yield idx.map((j, i) => lists[i][j]);
    let k = lists.length - 1;
    while (k >= 0 && ++idx[k] === lists[k].length) idx[k--] = 0;
    if (k < 0) return;
  }
}

/** Combinations of r items (indices ascending, so each set appears once). */
export function* combinations(items: string[], r: number, repetition = false): Generator<string[]> {
  const n = items.length;
  if (r < 1 || n === 0 || (!repetition && r > n)) return;
  const idx = repetition ? new Array(r).fill(0) : Array.from({ length: r }, (_, i) => i);
  for (;;) {
    yield idx.map((i) => items[i]);
    let k = r - 1;
    if (repetition) {
      while (k >= 0 && idx[k] === n - 1) k--;
      if (k < 0) return;
      const v = idx[k] + 1;
      for (let j = k; j < r; j++) idx[j] = v;
    } else {
      while (k >= 0 && idx[k] === n - r + k) k--;
      if (k < 0) return;
      idx[k]++;
      for (let j = k + 1; j < r; j++) idx[j] = idx[j - 1] + 1;
    }
  }
}

/** Permutations of r items, lexicographic by position. */
export function* permutations(items: string[], r: number, repetition = false): Generator<string[]> {
  const n = items.length;
  if (r < 1 || n === 0 || (!repetition && r > n)) return;
  if (repetition) {
    yield* product(Array.from({ length: r }, () => items));
    return;
  }
  const used = new Array(n).fill(false);
  const cur: string[] = [];
  function* rec(): Generator<string[]> {
    if (cur.length === r) {
      yield [...cur];
      return;
    }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      used[i] = true;
      cur.push(items[i]);
      yield* rec();
      cur.pop();
      used[i] = false;
    }
  }
  yield* rec();
}

/** Take up to `max` values from a generator. */
export function take<T>(gen: Iterable<T>, max: number): T[] {
  const out: T[] = [];
  for (const v of gen) {
    if (out.length >= max) break;
    out.push(v);
  }
  return out;
}

/* ---------- Word blending (portmanteaus) ---------- */

const VOWEL = /[aeiouy]/i;

function firstVowel(w: string, from = 0) {
  for (let i = from; i < w.length; i++) if (VOWEL.test(w[i]) && !(i === 0 && w[i].toLowerCase() === "y")) return i;
  return -1;
}

export interface Blend {
  word: string;
  how: string;
  score: number;
}

/**
 * Blend two words into new ones. Methods, best first:
 * 1. Overlap: the end of word 1 and a later part of word 2 share letters ("smoke" + "fog" → "smog").
 * 2. Onset + rhyme: the first sound of word 1 and word 2 from its first vowel ("breakfast" + "lunch" → "brunch").
 * 3. Plain splice: the first part of word 1 plus the last part of word 2.
 */
export function blendWords(w1: string, w2: string): Blend[] {
  const a = w1.trim().toLowerCase();
  const b = w2.trim().toLowerCase();
  if (!a || !b) return [];
  const out = new Map<string, Blend>();
  const add = (word: string, how: string, score: number) => {
    if (word.length < 3 || !VOWEL.test(word) || word === a || word === b || a.startsWith(word) || b.endsWith(word) && word.length === b.length) return;
    const prev = out.get(word);
    if (!prev || prev.score < score) out.set(word, { word, how, score });
  };
  const target = (a.length + b.length) / 2;
  const lenPenalty = (w: string) => Math.abs(w.length - target) * 0.3;

  // 1. Shared letters at the join.
  for (let i = 1; i < a.length; i++) {
    for (let j = 1; j < b.length; j++) {
      let k = 0;
      while (i + k <= a.length && j - 1 + k < b.length && k < 4 && a[i - 1 + k] === b[j - 1 + k]) k++;
      if (k >= 1 && a[i - 1] === b[j - 1]) {
        const word = a.slice(0, i) + b.slice(j);
        add(word, `${a.slice(0, i)} + ${b.slice(j)} (shared “${a[i - 1]}”)`, 6 + k * 2 - lenPenalty(word));
      }
    }
  }
  // 2. Onset of word 1 + rhyme of word 2 (and longer first parts ending before a vowel).
  const v2 = firstVowel(b);
  if (v2 >= 0) {
    const rhyme = b.slice(v2);
    for (let i = 1; i < a.length; i++) {
      const head = a.slice(0, i);
      const endsBeforeVowel = VOWEL.test(a[i] ?? "") && !VOWEL.test(a[i - 1]);
      if (!endsBeforeVowel) continue;
      const word = head + rhyme;
      add(word, `${head} + ${rhyme}`, (i === firstVowel(a) ? 7 : 4) - lenPenalty(word));
    }
  }
  // 3. Plain splices at syllable-ish boundaries (after a vowel in word 1, before a consonant+vowel in word 2).
  for (let i = 2; i < a.length; i++) {
    for (let j = 1; j < b.length - 1; j++) {
      const word = a.slice(0, i) + b.slice(j);
      const natural = VOWEL.test(a[i - 1]) !== VOWEL.test(b[j]);
      if (!natural) continue;
      add(word, `${a.slice(0, i)} + ${b.slice(j)}`, 2 - lenPenalty(word));
    }
  }
  return [...out.values()].sort((x, y) => y.score - x.score || x.word.length - y.word.length || x.word.localeCompare(y.word));
}
