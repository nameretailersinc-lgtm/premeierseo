/*
 * Find and replace with several rules applied in order. Plain text or regular expressions,
 * optional match case / whole word, and a mode that replaces the whole line around a match.
 */
import { unescapeField } from "./ops";

export interface ReplaceRule {
  find: string;
  replace: string;
}

export interface ReplaceOptions {
  matchCase: boolean;
  wholeWord: boolean;
  regex: boolean;
  /** Replace the entire line that contains a match. */
  wholeLine: boolean;
  /** Read \n and \t in plain-text find/replace fields as a line break and a tab. */
  escapes: boolean;
}

const escapeRe = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export interface ReplaceResult {
  output: string;
  counts: number[];
  error?: string;
}

export function findReplace(text: string, rules: ReplaceRule[], o: ReplaceOptions): ReplaceResult {
  let out = text.replace(/\r\n?/g, "\n");
  const counts: number[] = [];
  for (let i = 0; i < rules.length; i++) {
    const r = rules[i];
    if (!r.find) {
      counts.push(0);
      continue;
    }
    let src = o.regex ? r.find : escapeRe(o.escapes ? unescapeField(r.find) : r.find);
    if (o.wholeWord) src = `(?<![\\p{L}\\p{N}_])(?:${src})(?![\\p{L}\\p{N}_])`;
    const flags = "gmu" + (o.matchCase ? "" : "i");
    let re: RegExp;
    try {
      if (o.regex) new RegExp(r.find, "u");
      re = new RegExp(o.wholeLine ? `^[^\\n]*?(?:${src})[^\\n]*$` : src, flags);
    } catch (e) {
      return { output: "", counts, error: `Rule ${i + 1}: the regular expression isn't valid (${(e as Error).message}).` };
    }
    const replacement = o.escapes ? unescapeField(r.replace) : r.replace;
    let n = 0;
    out = out.replace(re, (...args: unknown[]) => {
      n++;
      if (!o.regex) return replacement;
      // Expand $1, $<name>, $& the way String.replace would, using the match's own groups.
      const match = args[0] as string;
      const last = args[args.length - 1];
      const groups = typeof last === "object" && last !== null ? (last as Record<string, string>) : undefined;
      const caps = args.slice(1, groups ? -3 : -2) as (string | undefined)[];
      return replacement.replace(/\$(\$|&|\d{1,2}|<([^>]+)>)/g, (tok, k: string, name?: string) => {
        if (k === "$") return "$";
        if (k === "&") return match;
        if (name !== undefined) return groups?.[name] ?? "";
        const idx = Number(k);
        return idx >= 1 && idx <= caps.length ? (caps[idx - 1] ?? "") : tok;
      });
    });
    counts.push(n);
  }
  return { output: out, counts };
}
