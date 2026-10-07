/*
 * Regular-expression runner (ECMAScript flavour). runRegex is self-contained so its source can
 * also run inside a Web Worker, where a runaway pattern can be stopped without freezing the page.
 */

export interface RxMatch {
  index: number;
  end: number;
  text: string;
  groups: (string | null)[];
  named: Record<string, string | null> | null;
}

export interface RxResult {
  matches: RxMatch[];
  total: number;
  replaced: string | null;
  error: string | null;
  /** Name of each capture group in order (null for unnamed groups). */
  groupNames: (string | null)[];
  ms: number;
}

/* Self-contained: no references to anything outside this function. */
export function runRegex(pattern: string, flags: string, text: string, replace: string | null, limit: number): RxResult {
  const t0 = Date.now();
  const out = { matches: [] as RxMatch[], total: 0, replaced: null as string | null, error: null as string | null, groupNames: [] as (string | null)[], ms: 0 };
  let re: RegExp;
  try {
    re = new RegExp(pattern, flags);
  } catch (e) {
    out.error = e instanceof Error ? e.message.replace(/^Invalid regular expression: /, "") : String(e);
    return out;
  }
  // Map capture groups to names by scanning the pattern: skip escapes and character classes,
  // ignore (?: (?= (?! (?<= (?<! groups.
  let inClass = false;
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === "\\") {
      i++;
      continue;
    }
    if (inClass) {
      if (ch === "]") inClass = false;
      continue;
    }
    if (ch === "[") {
      inClass = true;
      continue;
    }
    if (ch !== "(") continue;
    if (pattern[i + 1] !== "?") {
      out.groupNames.push(null);
      continue;
    }
    if (pattern[i + 2] === "<" && pattern[i + 3] !== "=" && pattern[i + 3] !== "!") {
      const end = pattern.indexOf(">", i + 3);
      out.groupNames.push(end > 0 ? pattern.slice(i + 3, end) : null);
    }
  }
  const global = flags.indexOf("g") >= 0 || flags.indexOf("y") >= 0;
  const runner = global ? re : new RegExp(pattern, flags + "g");
  runner.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = runner.exec(text))) {
    out.total++;
    if (out.matches.length < limit) {
      const named: Record<string, string | null> | null = m.groups ? {} : null;
      if (m.groups && named) for (const k of Object.keys(m.groups)) named[k] = m.groups[k] ?? null;
      out.matches.push({ index: m.index, end: m.index + m[0].length, text: m[0], groups: m.slice(1).map((g) => (g === undefined ? null : g)), named });
    }
    if (!global) break;
    if (m[0] === "") runner.lastIndex += flags.indexOf("u") >= 0 || flags.indexOf("v") >= 0 ? (text.codePointAt(runner.lastIndex) ?? 0) > 0xffff ? 2 : 1 : 1;
    if (out.total >= 100000) break;
  }
  if (replace !== null) {
    try {
      // A fresh RegExp: the loop above moved lastIndex, which a sticky (y) replace would start from.
      out.replaced = text.replace(new RegExp(pattern, flags), replace);
    } catch (e) {
      out.error = e instanceof Error ? e.message : String(e);
    }
  }
  out.ms = Date.now() - t0;
  return out;
}

export const WORKER_SOURCE = `var run = ${runRegex.toString()};
self.onmessage = function (e) {
  var d = e.data;
  try { self.postMessage({ id: d.id, result: run(d.pattern, d.flags, d.text, d.replace, d.limit) }); }
  catch (err) { self.postMessage({ id: d.id, result: { matches: [], total: 0, replaced: null, error: String(err && err.message || err), groupNames: [], ms: 0 } }); }
};`;

export interface LibraryPattern {
  name: string;
  pattern: string;
  flags: string;
  sample: string;
  note: string;
}

export const LIBRARY: LibraryPattern[] = [
  {
    name: "Email address (simple)",
    pattern: String.raw`[\w.+-]+@[\w-]+(?:\.[\w-]+)+`,
    flags: "g",
    sample: "Contact ada@example.com or sales.team+uk@mail.example.co.uk today.",
    note: "Catches everyday addresses. Full RFC 5322 validation isn't practical with a regex; send a confirmation email instead.",
  },
  {
    name: "URL (http/https)",
    pattern: String.raw`https?:\/\/[^\s/$.?#][^\s"'<>]*`,
    flags: "gi",
    sample: "Docs at https://example.com/docs?page=2#intro and http://localhost:3000.",
    note: "Stops at whitespace and quotes. Trailing punctuation such as a full stop may be included.",
  },
  {
    name: "IPv4 address",
    pattern: String.raw`\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b`,
    flags: "g",
    sample: "Server 192.168.1.20 responded; 256.1.1.1 is not valid.",
    note: "Each part is limited to 0–255.",
  },
  {
    name: "ISO date (YYYY-MM-DD)",
    pattern: String.raw`\b(?<year>\d{4})-(?<month>0[1-9]|1[0-2])-(?<day>0[1-9]|[12]\d|3[01])\b`,
    flags: "g",
    sample: "Released 2026-09-30, patched 2026-10-05.",
    note: "Named groups year, month and day. Doesn't check that 31 February doesn't exist.",
  },
  {
    name: "Hex color",
    pattern: String.raw`#(?:[0-9a-fA-F]{3,4}){1,2}\b`,
    flags: "g",
    sample: "color: #ff5722; background: #FFF; border-color: #11223344;",
    note: "Matches 3, 4, 6 and 8-digit CSS hex colors.",
  },
  {
    name: "UUID",
    pattern: String.raw`\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b`,
    flags: "gi",
    sample: "id=123e4567-e89b-12d3-a456-426614174000",
    note: "Checks the version (1–8) and RFC variant digits.",
  },
  {
    name: "Phone number (North American)",
    pattern: String.raw`(?:\+1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b`,
    flags: "g",
    sample: "Call (555) 123-4567 or +1 555.987.6543.",
    note: "Phone formats vary by country; adapt the pattern to the numbers you expect.",
  },
  {
    name: "Leading or trailing spaces",
    pattern: String.raw`^[ \t]+|[ \t]+$`,
    flags: "gm",
    sample: "  indented line\nline with trailing spaces   \nclean line",
    note: "Use with an empty replacement to trim every line (the m flag makes ^ and $ work per line).",
  },
  {
    name: "Duplicate words",
    pattern: String.raw`\b(\w+)\s+\1\b`,
    flags: "gi",
    sample: "This is is a test of the the pattern.",
    note: "\\1 refers back to the first group. Replace with $1 to remove the repeat.",
  },
  {
    name: "HTML tag",
    pattern: String.raw`<\/?([a-z][a-z0-9-]*)\b[^>]*>`,
    flags: "gi",
    sample: '<p class="lead">Hello <a href="/">home</a></p>',
    note: "Fine for quick searches; don't use regular expressions to parse whole HTML documents.",
  },
];
