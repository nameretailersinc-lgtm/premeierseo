/*
 * Case conversions. Unicode-aware (toLocaleUpperCase handles é → É, ß → SS).
 */

export type CaseMode = "lower" | "upper" | "title" | "sentence" | "capitalize" | "alternating" | "inverse" | "camel" | "pascal" | "snake" | "kebab" | "constant";

/** Words kept lowercase in title case unless first or last (AP/Chicago-style short words). */
export const SMALL_WORDS = new Set(
  "a an and as at but by for from in into nor of on onto or over per so the to up via vs with yet".split(" "),
);

const WORD = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;

function capFirst(w: string) {
  const chars = Array.from(w);
  return chars.length ? chars[0].toLocaleUpperCase() + chars.slice(1).join("") : w;
}

/** Title case: capitalize every word except short function words (unless first/last or after a colon). */
export function titleCase(s: string): string {
  return s
    .split("\n")
    .map((line) => {
      const lower = line.toLocaleLowerCase();
      const matches = [...lower.matchAll(WORD)];
      let out = "";
      let pos = 0;
      const origOf = (m: RegExpMatchArray) => line.slice(m.index ?? 0, (m.index ?? 0) + m[0].length);
      const isCaps = matches.map((m) => /^[\p{Lu}\p{N}]+$/u.test(origOf(m)) && /\p{Lu}/u.test(origOf(m)));
      // A run of 3+ all-caps words is shouting (caps lock), not a series of acronyms.
      const inCapsRun = isCaps.map((c, i) => {
        if (!c) return false;
        let a = i;
        let b = i;
        while (a > 0 && isCaps[a - 1]) a--;
        while (b < isCaps.length - 1 && isCaps[b + 1]) b++;
        return b - a + 1 >= 3;
      });
      matches.forEach((m, i) => {
        const idx = m.index ?? 0;
        const before = lower.slice(pos, idx);
        const w = m[0];
        const afterColon = /[:—–?!.]\s*$/.test(out + before);
        const first = i === 0 || afterColon;
        const after = lower.slice(idx + w.length, matches[i + 1]?.index ?? lower.length);
        const last = i === matches.length - 1 || /[:—–?!.]/.test(after);
        // Keep words that were all caps in the original and look like acronyms (2–5 letters): NASA, SEO.
        const orig = origOf(m);
        const acronym = isCaps[i] && !inCapsRun[i] && /^[\p{Lu}\p{N}]{2,5}$/u.test(orig);
        const word = acronym ? orig : !first && !last && SMALL_WORDS.has(w) ? w : capFirst(w);
        out += before + word;
        pos = idx + w.length;
      });
      return out + lower.slice(pos);
    })
    .join("\n");
}

/** Sentence case: lowercase everything, then capitalize the first letter of each sentence and the pronoun "I". */
export function sentenceCase(s: string): string {
  const lower = s.toLocaleLowerCase();
  let out = lower.replace(/(^|[.!?]["'’”)\]]*\s+|\n\s*)(\p{Ll})/gu, (_, pre: string, ch: string) => pre + ch.toLocaleUpperCase());
  out = out.replace(/(^|[^\p{L}\p{N}.])i(?=[\s,;:!?'’]|\.(?!\p{L})|$)/gu, "$1I");
  return out;
}

function words(s: string): string[] {
  return (
    s
      .replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, "$1 $2")
      .replace(/(\p{Lu})(\p{Lu}\p{Ll})/gu, "$1 $2")
      .match(/[\p{L}\p{N}]+/gu) ?? []
  );
}

export function convertCase(s: string, mode: CaseMode): string {
  switch (mode) {
    case "lower":
      return s.toLocaleLowerCase();
    case "upper":
      return s.toLocaleUpperCase();
    case "title":
      return titleCase(s);
    case "sentence":
      return sentenceCase(s);
    case "capitalize":
      return s.toLocaleLowerCase().replace(WORD, (w) => capFirst(w));
    case "alternating": {
      let i = 0;
      return Array.from(s, (c) => {
        if (!/\p{L}/u.test(c)) return c;
        return i++ % 2 === 0 ? c.toLocaleLowerCase() : c.toLocaleUpperCase();
      }).join("");
    }
    case "inverse":
      return Array.from(s, (c) => {
        const u = c.toLocaleUpperCase();
        return c === u ? c.toLocaleLowerCase() : u;
      }).join("");
    case "camel":
    case "pascal":
    case "snake":
    case "kebab":
    case "constant":
      return s
        .split("\n")
        .map((line) => {
          const w = words(line).map((x) => x.toLocaleLowerCase());
          if (mode === "snake") return w.join("_");
          if (mode === "kebab") return w.join("-");
          if (mode === "constant") return w.join("_").toLocaleUpperCase();
          const joined = w.map(capFirst).join("");
          return mode === "pascal" ? joined : joined.replace(/^./u, (c) => c.toLocaleLowerCase());
        })
        .join("\n");
  }
}
