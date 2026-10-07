/*
 * Classic ciphers for puzzles and learning. None of these are secure encryption.
 */

const A = 65;
const a = 97;

export function caesar(text: string, shift: number): string {
  const k = ((shift % 26) + 26) % 26;
  return text.replace(/[A-Za-z]/g, (c) => {
    const base = c <= "Z" ? A : a;
    return String.fromCharCode(((c.charCodeAt(0) - base + k) % 26) + base);
  });
}

export const rot13 = (s: string) => caesar(s, 13);

/** ROT5 rotates digits only. */
export const rot5 = (s: string) => s.replace(/[0-9]/g, (d) => String((Number(d) + 5) % 10));

/** ROT47 rotates the 94 printable ASCII characters from ! (33) to ~ (126). */
export function rot47(s: string): string {
  return s.replace(/[!-~]/g, (c) => String.fromCharCode(33 + ((c.charCodeAt(0) - 33 + 47) % 94)));
}

export function atbash(s: string): string {
  return s.replace(/[A-Za-z]/g, (c) => {
    const base = c <= "Z" ? A : a;
    return String.fromCharCode(base + 25 - (c.charCodeAt(0) - base));
  });
}

/** Vigenère: the key advances only on letters; non-letters pass through unchanged. */
export function vigenere(text: string, key: string, decode = false): string {
  const shifts = Array.from(key.toUpperCase().replace(/[^A-Z]/g, ""), (c) => c.charCodeAt(0) - A);
  if (!shifts.length) throw new Error("Enter a key made of letters (A–Z) for the Vigenère cipher.");
  let i = 0;
  return text.replace(/[A-Za-z]/g, (c) => {
    const s = shifts[i++ % shifts.length] * (decode ? -1 : 1);
    return caesar(c, s);
  });
}

// English letter frequencies (%), used to rank brute-force candidates.
const FREQ = [8.2, 1.5, 2.8, 4.3, 12.7, 2.2, 2.0, 6.1, 7.0, 0.15, 0.77, 4.0, 2.4, 6.7, 7.5, 1.9, 0.095, 6.0, 6.3, 9.1, 2.8, 0.98, 2.4, 0.15, 2.0, 0.074];
const LOGF = FREQ.map((f) => Math.log(f / 100));
const COMMON = new Set(
  "the be to of and a in that have i it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like time no just him know take people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us is are was were has had".split(" "),
);

/** Average log-probability per letter under English letter frequencies, plus a bonus for common English words. Higher = more English-like. */
export function englishScore(s: string): number {
  let sum = 0;
  let n = 0;
  for (const c of s.toUpperCase()) {
    const i = c.charCodeAt(0) - A;
    if (i >= 0 && i < 26) {
      sum += LOGF[i];
      n++;
    }
  }
  if (!n) return -Infinity;
  const words = s.toLowerCase().match(/[a-z]+/g) ?? [];
  const common = words.filter((w) => COMMON.has(w)).length;
  return sum / n + (words.length ? (common / words.length) * 2 : 0);
}

/** Every Caesar shift 1–25 as decodes (shift back by k), with the most English-like marked. */
export function bruteForce(text: string) {
  const rows = Array.from({ length: 25 }, (_, i) => {
    const k = i + 1;
    const out = caesar(text, -k);
    return { shift: k, text: out, score: englishScore(out) };
  });
  const best = rows.reduce((b, r) => (r.score > b.score ? r : b), rows[0]);
  return { rows, best: Number.isFinite(best.score) ? best.shift : null };
}

/** Rail fence (zigzag) transposition over all characters, including spaces. */
export function railFence(text: string, rails: number, decode = false): string {
  const chars = Array.from(text);
  const r = Math.max(2, Math.floor(rails));
  if (r >= chars.length) return text;
  const cycle = 2 * (r - 1);
  const railOf = (i: number) => {
    const m = i % cycle;
    return m < r ? m : cycle - m;
  };
  const order = chars.map((_, i) => i).sort((x, y) => railOf(x) - railOf(y) || x - y);
  if (!decode) return order.map((i) => chars[i]).join("");
  const out = new Array<string>(chars.length);
  order.forEach((pos, k) => (out[pos] = chars[k]));
  return out.join("");
}
