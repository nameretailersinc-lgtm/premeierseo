/*
 * Spell-check client. Runs nspell in a Web Worker; if workers are unavailable or the worker fails
 * to start, falls back to the main thread and checks in chunks so the page stays responsive.
 * Also extracts checkable words with their positions from text.
 */

type Pending = { resolve: (v: unknown) => void; reject: (e: unknown) => void };

class WorkerUnavailable extends Error {}

let worker: Worker | null = null;
let broken = false;
let seq = 0;
const pending = new Map<number, Pending>();

function getWorker(): Worker | null {
  if (broken || typeof Worker === "undefined") return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL("./spell.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<{ id: number; ok: boolean; result?: unknown; error?: string }>) => {
      const p = pending.get(e.data.id);
      if (!p) return;
      pending.delete(e.data.id);
      if (e.data.ok) p.resolve(e.data.result);
      else p.reject(new Error(e.data.error ?? "Spell checker error"));
    };
    worker.onerror = () => {
      broken = true;
      worker?.terminate();
      worker = null;
      const all = [...pending.values()];
      pending.clear();
      all.forEach((p) => p.reject(new WorkerUnavailable()));
    };
    return worker;
  } catch {
    broken = true;
    return null;
  }
}

function call<T>(msg: Record<string, unknown>): Promise<T> {
  const w = getWorker();
  if (!w) return Promise.reject(new WorkerUnavailable());
  const id = ++seq;
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
    w.postMessage({ ...msg, id });
  });
}

async function viaFallback<T>(fn: (core: typeof import("./spell-core")) => Promise<T>): Promise<T> {
  return fn(await import("./spell-core"));
}

/** Downloads the dictionary and prepares the checker. Safe to call repeatedly. */
export async function initSpeller(): Promise<void> {
  try {
    await call({ op: "init" });
  } catch (e) {
    if (!(e instanceof WorkerUnavailable)) throw e;
    await viaFallback((c) => c.loadSpeller());
  }
}

/** Distinct words in → misspelled words out. */
export async function findMisspelled(words: string[], british: boolean): Promise<Set<string>> {
  if (!words.length) return new Set();
  try {
    return new Set(await call<string[]>({ op: "check", words, british }));
  } catch (e) {
    if (!(e instanceof WorkerUnavailable)) throw e;
    return new Set(await viaFallback((c) => c.checkWords(words, british, 400)));
  }
}

export async function suggestions(word: string): Promise<string[]> {
  try {
    return await call<string[]>({ op: "suggest", word });
  } catch (e) {
    if (!(e instanceof WorkerUnavailable)) throw e;
    return viaFallback((c) => c.suggestWord(word));
  }
}

/* ---------- Tokenizing ---------- */

export interface WordToken {
  word: string;
  start: number;
  end: number;
}

export interface TokenOptions {
  ignoreCaps: boolean;
}

const MASK_RE = /\bhttps?:\/\/\S+|\bwww\.\S+|[\w.+-]+@[\w-]+\.[\w.-]+|\b[\w-]+\.(?:com|org|net|io|dev|co|uk|gov|edu)\b\S*|`[^`\n]*`|#[\w-]+|@\w+/gi;

/** Words to spell-check, with offsets. Skips URLs, emails, code spans, hashtags, numbers and words with digits. */
export function spellTokens(text: string, o: TokenOptions): WordToken[] {
  const masked = text.replace(MASK_RE, (m) => " ".repeat(m.length));
  const out: WordToken[] = [];
  const re = /[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}]+)*/gu;
  for (const m of masked.matchAll(re)) {
    let w = m[0];
    const start = m.index ?? 0;
    if (/\p{N}/u.test(w)) continue;
    if (w.length < 2 && w !== "a" && w !== "I" && w !== "A") continue;
    const bare = w.replace(/['’]s$/, "");
    if (o.ignoreCaps && bare.length > 1 && bare === bare.toUpperCase() && /\p{Lu}/u.test(bare)) continue;
    w = w.replace(/’/g, "'");
    // A trailing possessive on a capitalised word (James') or a quote mark isn't part of the word.
    out.push({ word: w.replace(/'$/, ""), start, end: start + m[0].length - (w.endsWith("'") ? 1 : 0) });
  }
  return out;
}
