/*
 * Password and passphrase generation with crypto.getRandomValues (via randomBelow: rejection
 * sampling, no modulo bias). Entropy = length × log2(pool size) for random passwords and
 * words × log2(list size) for passphrases, i.e. the strength against an attacker who knows
 * exactly how the password was generated.
 */
import { randomBelow } from "../text/random";
import { WORDS } from "./wordlist";

export const SETS = {
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lower: "abcdefghijklmnopqrstuvwxyz",
  digits: "0123456789",
  symbols: "!#$%&()*+,-./:;<=>?@[]^_{|}~",
} as const;

export type SetName = keyof typeof SETS;

/** Characters that are easy to confuse in many fonts. */
export const AMBIGUOUS = "Il1|O0o";

export interface PasswordOptions {
  length: number;
  sets: Record<SetName, boolean>;
  excludeAmbiguous: boolean;
  /** Require at least one character from every chosen set. */
  requireEach: boolean;
}

export function poolFor(o: Pick<PasswordOptions, "sets" | "excludeAmbiguous">): { pool: string; groups: string[] } {
  const groups = (Object.keys(SETS) as SetName[])
    .filter((k) => o.sets[k])
    .map((k) => (o.excludeAmbiguous ? [...SETS[k]].filter((c) => !AMBIGUOUS.includes(c)).join("") : SETS[k]));
  return { pool: groups.join(""), groups };
}

export function generatePassword(o: PasswordOptions): string {
  const { pool, groups } = poolFor(o);
  if (!pool) throw new Error("Choose at least one character set.");
  const len = Math.max(1, Math.min(256, Math.floor(o.length)));
  // Rejection: draw uniformly from the pool until every required group is present (keeps the
  // result uniform over all passwords that satisfy the rule).
  for (let attempt = 0; attempt < 10_000; attempt++) {
    let s = "";
    for (let i = 0; i < len; i++) s += pool[randomBelow(pool.length)];
    if (!o.requireEach || len < groups.length || groups.every((g) => [...s].some((c) => g.includes(c)))) return s;
  }
  throw new Error("Could not satisfy the character rules. Increase the length.");
}

export const entropyBits = (poolSize: number, length: number) => (poolSize > 1 ? length * Math.log2(poolSize) : 0);

export function strengthLabel(bits: number): { label: string; tone: "danger" | "warning" | "success" } {
  if (bits < 50) return { label: "Weak", tone: "danger" };
  if (bits < 70) return { label: "Fair", tone: "warning" };
  if (bits < 100) return { label: "Strong", tone: "success" };
  return { label: "Very strong", tone: "success" };
}

export interface PassphraseOptions {
  words: number;
  separator: string;
  capitalize: boolean;
  addNumber: boolean;
}

export function generatePassphrase(o: PassphraseOptions): { text: string; bits: number } {
  const n = Math.max(2, Math.min(20, Math.floor(o.words)));
  const parts: string[] = [];
  for (let i = 0; i < n; i++) {
    const w = WORDS[randomBelow(WORDS.length)];
    parts.push(o.capitalize ? w[0].toUpperCase() + w.slice(1) : w);
  }
  let bits = n * Math.log2(WORDS.length);
  if (o.addNumber) {
    const i = randomBelow(n);
    parts[i] = parts[i] + String(randomBelow(10));
    bits += Math.log2(10) + Math.log2(n);
  }
  return { text: parts.join(o.separator), bits };
}
