/*
 * Plain-text search used by the notepad and text editor find bars (no regex: what you type is what is found).
 */

export interface FindOptions {
  matchCase: boolean;
  wholeWord: boolean;
}

const escapeRe = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function findRegex(query: string, o: FindOptions): RegExp | null {
  if (!query) return null;
  let src = escapeRe(query);
  if (o.wholeWord) src = `(?<![\\p{L}\\p{N}_])${src}(?![\\p{L}\\p{N}_])`;
  return new RegExp(src, "gu" + (o.matchCase ? "" : "i"));
}

/** Start offsets (UTF-16) of every match. */
export function findAll(text: string, query: string, o: FindOptions): number[] {
  const re = findRegex(query, o);
  if (!re) return [];
  const out: number[] = [];
  for (const m of text.matchAll(re)) out.push(m.index ?? 0);
  return out;
}

/** Index of the first match at or after `from`, wrapping to the start. -1 if none. */
export function nextMatch(matches: number[], from: number): number {
  if (!matches.length) return -1;
  const i = matches.findIndex((m) => m >= from);
  return i === -1 ? 0 : i;
}

export function replaceAllText(text: string, query: string, replacement: string, o: FindOptions): { text: string; count: number } {
  const re = findRegex(query, o);
  if (!re) return { text, count: 0 };
  let count = 0;
  const out = text.replace(re, () => {
    count++;
    return replacement;
  });
  return { text: out, count };
}

export function wordCount(text: string): number {
  return (text.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) ?? []).length;
}
