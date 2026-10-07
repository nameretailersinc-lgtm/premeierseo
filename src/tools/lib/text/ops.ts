/*
 * Text transforms for the text-ops widget (archetype A). Each op is a TransformDef: option spec,
 * a pure run() and a sample. Kept free of React so the logic can be tested with node.
 */
import type { Opts, TransformDef, TransformResult } from "../../ui/TransformTool";
import { atbash, bruteForce, caesar, railFence, rot13, rot47, vigenere } from "./ciphers";
import { DELIMITERS, parseColumnSpec, parseDelimited, quoteField } from "./csv";
import { graphemes, plural, shuffle, splitLines } from "./random";

const lines = splitLines;
const s = (v: unknown) => String(v ?? "");
const n = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
/** Lets users type \t and \n in single-line option fields. */
export const unescapeField = (v: string) => v.replace(/\\(t|n|\\)/g, (_, c: string) => (c === "t" ? "\t" : c === "n" ? "\n" : "\\"));
const escapeRe = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const MAX_OUTPUT = 5_000_000;

const SEPARATORS = [
  { value: "newline", label: "New line" },
  { value: "space", label: "Space" },
  { value: "comma", label: "Comma and space" },
  { value: "none", label: "Nothing" },
  { value: "custom", label: "Custom…" },
];
function separator(o: Opts, key = "sep", customKey = "customSep"): string {
  switch (o[key]) {
    case "newline":
      return "\n";
    case "space":
      return " ";
    case "comma":
      return ", ";
    case "none":
      return "";
    default:
      return unescapeField(s(o[customKey]));
  }
}

/* ---------- Add prefix / suffix ---------- */
const RECIPES: Record<string, (l: string, o: Opts) => string> = {
  custom: (l, o) => unescapeField(s(o.prefix)) + l + unescapeField(s(o.suffix)),
  dquote: (l) => `"${l}",`,
  squote: (l) => `'${l.replace(/'/g, "''")}',`,
  li: (l) => `<li>${l}</li>`,
  link: (l) => `<a href="${l}">${l}</a>`,
  bullet: (l) => `- ${l}`,
};

const addPrefixSuffix: TransformDef = {
  inputLabel: "Lines to change",
  outputLabel: "Lines with prefix and suffix",
  options: [
    {
      type: "select",
      key: "recipe",
      label: "Add",
      default: "custom",
      options: [
        { value: "custom", label: "My own prefix and suffix" },
        { value: "dquote", label: "Double quotes and a comma" },
        { value: "squote", label: "Single quotes and a comma (SQL)" },
        { value: "li", label: "HTML list items <li>" },
        { value: "link", label: "HTML links <a href>" },
        { value: "bullet", label: "Markdown bullets (- )" },
      ],
    },
    { type: "text", key: "prefix", label: "Prefix (start of line)", default: "", placeholder: "e.g. https://", help: "Type \\t for a tab", showIf: (o) => o.recipe === "custom" },
    { type: "text", key: "suffix", label: "Suffix (end of line)", default: "", placeholder: "e.g. ;", showIf: (o) => o.recipe === "custom" },
    { type: "checkbox", key: "skipEmpty", label: "Skip empty lines", default: true },
    { type: "checkbox", key: "trim", label: "Trim spaces at line ends first", default: true },
    { type: "checkbox", key: "lastComma", label: "No comma after the last line", default: true, showIf: (o) => o.recipe === "dquote" || o.recipe === "squote" },
  ],
  sample: "red\ngreen\n\nblue ",
  run(input, o) {
    if (o.recipe === "custom" && !o.prefix && !o.suffix) return { output: input, note: "Type a prefix or a suffix, or choose a ready-made format under Add" };
    const f = RECIPES[s(o.recipe)] ?? RECIPES.custom;
    const src = lines(input);
    let changed = 0;
    const out = src.map((l) => {
      const v = o.trim ? l.trim() : l;
      if (o.skipEmpty && !v.trim()) return v;
      changed++;
      return f(v, o);
    });
    if ((o.recipe === "dquote" || o.recipe === "squote") && o.lastComma) {
      for (let i = out.length - 1; i >= 0; i--) {
        if (out[i].endsWith(",")) {
          out[i] = out[i].slice(0, -1);
          break;
        }
      }
    }
    return { output: out.join("\n"), note: `${plural(changed, "line")} changed` };
  },
};

/* ---------- Line breaks ---------- */
const lineBreaks: TransformDef = {
  inputLabel: "Text with line breaks",
  outputLabel: "Result",
  options: [
    {
      type: "select",
      key: "mode",
      label: "What to do",
      default: "keep-paragraphs",
      options: [
        { value: "keep-paragraphs", label: "Remove line breaks, keep paragraphs" },
        { value: "remove-all", label: "Remove all line breaks" },
        { value: "add-chars", label: "Add a break every N characters" },
        { value: "add-words", label: "Add a break every N words" },
        { value: "add-punct", label: "Add a break after punctuation" },
      ],
    },
    {
      type: "select",
      key: "joinWith",
      label: "Replace line breaks with",
      default: "space",
      options: [
        { value: "space", label: "A space" },
        { value: "none", label: "Nothing" },
        { value: "comma", label: "Comma and space" },
        { value: "custom", label: "Custom text…" },
      ],
      showIf: (o) => o.mode === "remove-all" || o.mode === "keep-paragraphs",
    },
    { type: "text", key: "customJoin", label: "Custom text", default: " | ", showIf: (o) => (o.mode === "remove-all" || o.mode === "keep-paragraphs") && o.joinWith === "custom" },
    { type: "number", key: "every", label: "N", default: 80, min: 1, max: 10000, showIf: (o) => o.mode === "add-chars" || o.mode === "add-words" },
    { type: "checkbox", key: "keepWords", label: "Don't split words", default: true, showIf: (o) => o.mode === "add-chars" },
    { type: "text", key: "punct", label: "Break after these characters", default: ".!?", showIf: (o) => o.mode === "add-punct" },
    {
      type: "checkbox",
      key: "dehyphen",
      label: "Rejoin words split by a hyphen at line ends",
      default: false,
      help: "exam-↵ple becomes example",
      showIf: (o) => o.mode === "remove-all" || o.mode === "keep-paragraphs",
    },
    { type: "checkbox", key: "collapse", label: "Collapse repeated spaces", default: true },
  ],
  sample:
    "Text copied from a PDF often breaks in the\nmiddle of a sentence, because each line of the\npage ends with a hard line break.\n\nA blank line between blocks marks a new\nparagraph, and this tool can keep it.",
  run(input, o) {
    const text = input.replace(/\r\n?/g, "\n");
    const before = (text.match(/\n/g) ?? []).length;
    const mode = s(o.mode);
    const tidy = (v: string) => (o.collapse ? v.replace(/[^\S\n]{2,}/g, " ") : v);
    if (mode === "remove-all" || mode === "keep-paragraphs") {
      const join = o.joinWith === "space" ? " " : o.joinWith === "none" ? "" : o.joinWith === "comma" ? ", " : unescapeField(s(o.customJoin));
      const joinBlock = (b: string) => {
        let v = b;
        if (o.dehyphen) v = v.replace(/(\p{L})-\n(?=\p{Ll})/gu, "$1");
        const parts = v.split("\n").map((l) => (join === " " || join === ", " ? l.trim() : l)).filter((l) => l !== "");
        return parts.join(join);
      };
      const out =
        mode === "keep-paragraphs"
          ? text
              .split(/\n[^\S\n]*\n\s*/)
              .map((p) => tidy(joinBlock(p)))
              .filter((p) => p.trim())
              .join("\n\n")
          : tidy(joinBlock(text.replace(/\n\s*\n/g, "\n")));
      const after = (out.match(/\n/g) ?? []).length;
      return { output: out, note: `${plural(before - after, "line break")} removed` };
    }
    if (mode === "add-chars") {
      const width = Math.max(1, n(o.every, 80));
      const out = lines(text)
        .map((l) => {
          const t = tidy(l);
          if (!o.keepWords) {
            const g = graphemes(t);
            const chunks: string[] = [];
            for (let i = 0; i < g.length; i += width) chunks.push(g.slice(i, i + width).join(""));
            return chunks.join("\n");
          }
          const words = t.split(/ +/);
          const rows: string[] = [];
          let cur = "";
          for (const w of words) {
            if (!cur) cur = w;
            else if (graphemes(cur + " " + w).length <= width) cur += " " + w;
            else {
              rows.push(cur);
              cur = w;
            }
          }
          rows.push(cur);
          return rows.join("\n");
        })
        .join("\n");
      return { output: out, note: `${plural((out.match(/\n/g) ?? []).length - before, "line break")} added` };
    }
    if (mode === "add-words") {
      const every = Math.max(1, n(o.every, 10));
      const out = lines(text)
        .map((l) => {
          const words = tidy(l).trim().split(/\s+/).filter(Boolean);
          const rows: string[] = [];
          for (let i = 0; i < words.length; i += every) rows.push(words.slice(i, i + every).join(" "));
          return rows.join("\n");
        })
        .join("\n");
      return { output: out, note: `${plural((out.match(/\n/g) ?? []).length - before, "line break")} added` };
    }
    const chars = Array.from(s(o.punct) || ".!?").map(escapeRe).join("");
    const re = new RegExp(`([${chars}]+["'”’)\\]]*)[^\\S\\n]+`, "g");
    const out = tidy(text).replace(re, "$1\n");
    return { output: out, note: `${plural((out.match(/\n/g) ?? []).length - before, "line break")} added` };
  },
};

/* ---------- Text repeater ---------- */
const repeater: TransformDef = {
  inputLabel: "Text to repeat",
  outputLabel: "Repeated text",
  options: [
    { type: "number", key: "times", label: "Repeat", default: 10, min: 1, max: 100000 },
    {
      type: "segmented",
      key: "unit",
      label: "What to repeat",
      default: "all",
      options: [
        { value: "all", label: "Whole text" },
        { value: "line", label: "Each line" },
        { value: "word", label: "Each word" },
      ],
    },
    { type: "select", key: "sep", label: "Between repeats", default: "newline", options: SEPARATORS },
    { type: "text", key: "customSep", label: "Custom separator", default: " - ", help: "Type \\n for a new line", showIf: (o) => o.sep === "custom" },
    { type: "checkbox", key: "number", label: "Number each repeat (1. 2. 3.)", default: false },
  ],
  sample: "Happy birthday!",
  run(input, o) {
    const times = Math.floor(n(o.times, 1));
    if (times < 1) return { output: "", error: "Enter how many times to repeat, from 1 upwards." };
    const sep = separator(o);
    const unit = s(o.unit);
    const units = unit === "all" ? [input] : unit === "line" ? lines(input) : input.split(/(\s+)/);
    const projected = input.length * times + sep.length * times * (unit === "all" ? 1 : units.length);
    if (projected > MAX_OUTPUT)
      return {
        output: "",
        error: `That would create about ${projected.toLocaleString("en-US")} characters, more than a browser text box handles comfortably. Use fewer repeats (up to 5 million characters).`,
      };
    const rep = (t: string) => Array.from({ length: times }, (_, i) => (o.number ? `${i + 1}. ${t}` : t)).join(sep);
    let output: string;
    if (unit === "all") output = rep(input);
    else if (unit === "line") output = units.map((l) => (l.trim() ? rep(l) : l)).join("\n");
    else output = units.map((w) => (/^\s*$/.test(w) ? w : rep(w))).join("");
    return { output, note: `Repeated ${plural(times, "time")}` };
  },
};

/* ---------- Column extractor ---------- */
const DELIM_OPTIONS = [
  { value: "comma", label: "Comma (CSV)" },
  { value: "tab", label: "Tab (TSV)" },
  { value: "semicolon", label: "Semicolon" },
  { value: "pipe", label: "Pipe |" },
  { value: "whitespace", label: "Spaces" },
  { value: "custom", label: "Custom…" },
];

const columnExtractor: TransformDef = {
  inputLabel: "Delimited text (CSV, TSV…)",
  outputLabel: "Extracted columns",
  mono: true,
  wrap: "off",
  options: [
    { type: "select", key: "delim", label: "Delimiter", default: "comma", options: DELIM_OPTIONS },
    { type: "text", key: "customDelim", label: "Custom delimiter", default: "::", mono: true, showIf: (o) => o.delim === "custom" },
    { type: "text", key: "cols", label: "Columns", default: "2", placeholder: "e.g. 2 or 1,3 or 2-4", help: "Numbers start at 1; order sets the output order" },
    { type: "checkbox", key: "header", label: "First row is a header", default: true, help: "Lets you type column names" },
    { type: "checkbox", key: "keepHeader", label: "Include the header in the result", default: true, showIf: (o) => Boolean(o.header) },
    {
      type: "select",
      key: "outDelim",
      label: "Output delimiter",
      default: "same",
      options: [
        { value: "same", label: "Same as input" },
        { value: "comma", label: "Comma" },
        { value: "tab", label: "Tab" },
        { value: "semicolon", label: "Semicolon" },
        { value: "pipe", label: "Pipe |" },
        { value: "space", label: "Space" },
      ],
    },
    { type: "checkbox", key: "trim", label: "Trim spaces around values", default: true },
    { type: "checkbox", key: "skipEmpty", label: "Skip empty rows", default: true },
  ],
  sample: 'name,email,city\nAna Silva,ana@example.com,Lisbon\n"Lee, Min",min@example.com,Seoul\nTom Berg,tom@example.com,"Oslo, Norway"',
  run(input, o) {
    const delim = o.delim === "custom" ? unescapeField(s(o.customDelim)) : o.delim === "whitespace" ? "whitespace" : DELIMITERS[s(o.delim)];
    if (!delim) return { output: "", error: "Enter a custom delimiter." };
    let rows = parseDelimited(input, delim);
    if (o.skipEmpty) rows = rows.filter((r) => r.some((c) => c.trim()));
    if (!rows.length) return { output: "" };
    const width = Math.max(...rows.map((r) => r.length));
    const header = o.header ? rows[0] : null;
    const spec = parseColumnSpec(s(o.cols), header, width);
    if ("error" in spec) return { output: "", error: spec.error };
    const outDelim = o.outDelim === "same" ? (delim === "whitespace" ? " " : delim) : o.outDelim === "space" ? " " : DELIMITERS[s(o.outDelim)];
    const body = header && !o.keepHeader ? rows.slice(1) : rows;
    const out = body.map((r) =>
      spec.cols
        .map((c) => {
          const v = r[c] ?? "";
          return quoteField(o.trim ? v.trim() : v, outDelim);
        })
        .join(outDelim),
    );
    const missing = spec.cols.filter((c) => c >= width);
    return {
      output: out.join("\n"),
      note:
        `${plural(spec.cols.length, "column")} from ${plural(body.length, "row")}` +
        (missing.length ? ` · column ${missing.map((c) => c + 1).join(", ")} doesn't exist (left empty)` : ""),
    };
  },
};

/* ---------- Remove duplicate words ---------- */
const PUNCT_EDGE = /^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu;

const duplicateWords: TransformDef = {
  inputLabel: "Text with repeated words",
  outputLabel: "Text without duplicate words",
  options: [
    {
      type: "segmented",
      key: "scope",
      label: "Remove",
      default: "all",
      options: [
        { value: "all", label: "Every repeat" },
        { value: "doubled", label: "Only doubled words (the the)" },
      ],
    },
    { type: "checkbox", key: "ignoreCase", label: "Ignore case", default: true, help: "“SEO” and “seo” count as the same word" },
    { type: "checkbox", key: "punctPart", label: "Punctuation is part of the word", default: false, help: "When ticked, “end.” and “end” are different" },
  ],
  sample: "The the quick brown fox jumps over the lazy dog.\nseo, tools, SEO, free tools, free",
  run(input, o) {
    const tokens = input.replace(/\r\n?/g, "\n").split(/(\s+)/);
    const key = (w: string) => {
      let k = o.punctPart ? w : w.replace(PUNCT_EDGE, "");
      if (o.ignoreCase) k = k.toLocaleLowerCase();
      return k;
    };
    const seen = new Set<string>();
    const out: string[] = [];
    let pendingWs: string[] = [];
    let prevKey: string | null = null;
    let prevEndsPunct = false;
    let removed = 0;
    let removedSinceKept = false;
    for (const t of tokens) {
      if (t === "") continue;
      if (/^\s+$/.test(t)) {
        pendingWs.push(t);
        continue;
      }
      const k = key(t);
      const dup = k !== "" && (o.scope === "doubled" ? k === prevKey && !prevEndsPunct && !pendingWs.some((w) => w.includes("\n")) : seen.has(k));
      if (dup) {
        removed++;
        removedSinceKept = true;
        continue;
      }
      removedSinceKept = false;
      if (out.length) out.push(pendingWs.find((w) => w.includes("\n")) ?? pendingWs[0] ?? " ");
      else if (pendingWs.length) out.push(pendingWs[0]);
      pendingWs = [];
      out.push(t);
      if (k) seen.add(k);
      prevKey = k;
      prevEndsPunct = !o.punctPart && /[\p{P}]$/u.test(t);
    }
    if (pendingWs.length) out.push(removedSinceKept ? (pendingWs.find((w) => w.includes("\n")) ?? "") : pendingWs.join(""));
    return { output: out.join(""), note: `${plural(removed, "repeated word")} removed` };
  },
};

/* ---------- Empty lines ---------- */
const emptyLines: TransformDef = {
  inputLabel: "Text with blank lines",
  outputLabel: "Text without empty lines",
  options: [
    {
      type: "segmented",
      key: "mode",
      label: "Blank lines",
      default: "remove",
      options: [
        { value: "remove", label: "Remove all" },
        { value: "collapse", label: "Keep one between blocks" },
      ],
    },
    { type: "checkbox", key: "whitespace", label: "Count lines with only spaces or tabs as empty", default: true },
    { type: "checkbox", key: "trimEnds", label: "Remove trailing spaces from every line", default: false },
  ],
  sample: "Name,Score\n\nAna,12\n   \nLee,9\n\n\n\nTom,15\n",
  run(input, o) {
    const src = lines(input);
    const isEmpty = (l: string) => (o.whitespace ? l.trim() === "" : l === "");
    const out: string[] = [];
    let removed = 0;
    for (const raw of src) {
      const l = o.trimEnds ? raw.replace(/[ \t]+$/, "") : raw;
      if (isEmpty(l)) {
        if (o.mode === "collapse" && out.length && out[out.length - 1] !== "") out.push("");
        else removed++;
        continue;
      }
      out.push(l);
    }
    while (out.length && out[out.length - 1] === "") {
      out.pop();
      removed++;
    }
    return { output: out.join("\n"), note: `${plural(removed, "empty line")} removed` };
  },
};

/* ---------- Extra spaces ---------- */
const SPECIAL_SPACES = /[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]/g;

const extraSpaces: TransformDef = {
  inputLabel: "Text with extra spaces",
  outputLabel: "Cleaned text",
  options: [
    { type: "checkbox", key: "collapse", label: "Replace repeated spaces with one", default: true },
    { type: "checkbox", key: "trim", label: "Trim spaces at the start and end of lines", default: true },
    {
      type: "select",
      key: "tabs",
      label: "Tabs",
      default: "space",
      options: [
        { value: "space", label: "Convert to a single space" },
        { value: "keep", label: "Keep tabs" },
        { value: "remove", label: "Remove tabs" },
      ],
    },
    { type: "checkbox", key: "special", label: "Convert non-breaking and other special spaces", default: true },
    { type: "checkbox", key: "beforePunct", label: "Remove spaces before , . ; : ! ?", default: false },
    { type: "checkbox", key: "all", label: "Remove every space", default: false, help: "Line breaks are kept" },
  ],
  sample: "  This   sentence has\tdouble  spaces ,\u00a0a tab and   trailing spaces.   \n   Second line .",
  run(input, o) {
    let t = input.replace(/\r\n?/g, "\n");
    const count = (v: string) => (v.match(/[^\S\n]/g) ?? []).length;
    const before = count(t);
    if (o.special) t = t.replace(SPECIAL_SPACES, " ");
    if (o.tabs === "space") t = t.replace(/\t/g, " ");
    else if (o.tabs === "remove") t = t.replace(/\t/g, "");
    if (o.all) t = t.replace(o.tabs === "keep" ? /[^\S\n\t]/g : /[^\S\n]/g, "");
    else {
      if (o.collapse) t = t.replace(o.tabs === "keep" ? / {2,}/g : /[^\S\n]{2,}/g, " ");
      if (o.trim) t = t.replace(/^[^\S\n]+|[^\S\n]+$/gm, "");
      if (o.beforePunct) t = t.replace(/[^\S\n]+([,.;:!?])/g, "$1");
    }
    return { output: t, note: `${plural(before - count(t), "space")} removed` };
  },
};

/* ---------- Accents ---------- */
const SPECIAL_LETTERS: Record<string, string> = {
  ß: "ss", ẞ: "SS", æ: "ae", Æ: "AE", œ: "oe", Œ: "OE", ø: "o", Ø: "O", ł: "l", Ł: "L", đ: "d", Đ: "D",
  ð: "d", Ð: "D", þ: "th", Þ: "Th", ı: "i", ħ: "h", Ħ: "H", ŧ: "t", Ŧ: "T", ŋ: "n", Ŋ: "N", ĸ: "k",
};
const GERMAN: Record<string, string> = { ä: "ae", ö: "oe", ü: "ue", Ä: "Ae", Ö: "Oe", Ü: "Ue" };

export function removeAccents(input: string, o: { special: boolean; german: boolean; compat: boolean }): { text: string; changed: number } {
  let changed = 0;
  const chars = Array.from(input.normalize("NFC"));
  // A two-letter replacement for a capital follows the next letter: "Æble" → "Aeble", "ÆRØ" → "AERO".
  const fit = (r: string, i: number) => {
    if (r.length < 2 || !/\p{Lu}/u.test(r[0])) return r;
    const next = chars[i + 1] ?? "";
    return /\p{Lu}/u.test(next) ? r.toUpperCase() : r[0] + r.slice(1).toLowerCase();
  };
  const out = chars.map((c, i) => {
    if (o.german && GERMAN[c]) {
      changed++;
      return fit(GERMAN[c], i);
    }
    if (o.special && SPECIAL_LETTERS[c]) {
      changed++;
      return fit(SPECIAL_LETTERS[c], i);
    }
    const d = c.normalize(o.compat ? "NFKD" : "NFD").replace(/\p{M}/gu, "");
    if (d !== c) changed++;
    return d;
  }).join("");
  return { text: out, changed };
}

const accents: TransformDef = {
  inputLabel: "Text with accents",
  outputLabel: "Text without accents",
  options: [
    { type: "checkbox", key: "special", label: "Convert special letters (ß → ss, æ → ae, ø → o, ł → l)", default: true },
    { type: "checkbox", key: "german", label: "German style umlauts (ä → ae, ö → oe, ü → ue)", default: false },
    { type: "checkbox", key: "compat", label: "Also convert ligatures and look-alikes (ﬁ → fi, ² → 2)", default: false },
  ],
  sample: "Crème brûlée at the Café Müller in São Paulo, Łódź and Ærøskøbing. Straße – naïve – ﬁancé",
  run(input, o) {
    const r = removeAccents(input, { special: Boolean(o.special), german: Boolean(o.german), compat: Boolean(o.compat) });
    return { output: r.text, note: `${plural(r.changed, "character")} changed` };
  },
};

/* ---------- Filter lines ---------- */
export function buildMatcher(terms: string[], o: { regex: boolean; matchCase: boolean; wholeWord: boolean }): RegExp[] {
  return terms.map((t) => {
    let src = o.regex ? t : escapeRe(t);
    if (o.wholeWord) src = `(?<![\\p{L}\\p{N}_])(?:${src})(?![\\p{L}\\p{N}_])`;
    return new RegExp(src, o.matchCase ? "u" : "iu");
  });
}

/** Split "a, b, c" into terms; "\," keeps a literal comma. */
export function splitTerms(v: string): string[] {
  return v
    .split(/(?<!\\),/)
    .map((t) => t.replace(/\\,/g, ",").trim())
    .filter(Boolean);
}

const filterLines: TransformDef = {
  inputLabel: "Lines to filter",
  outputLabel: "Filtered lines",
  options: [
    {
      type: "segmented",
      key: "action",
      label: "Lines that match",
      default: "remove",
      options: [
        { value: "remove", label: "Remove them" },
        { value: "keep", label: "Keep only them" },
      ],
    },
    { type: "text", key: "terms", label: "Words or phrases", default: "error", placeholder: "e.g. error, warning", help: "Separate several with commas" },
    {
      type: "segmented",
      key: "logic",
      label: "A line matches if it contains",
      default: "any",
      options: [
        { value: "any", label: "Any of them" },
        { value: "all", label: "All of them" },
      ],
    },
    { type: "checkbox", key: "matchCase", label: "Match case", default: false },
    { type: "checkbox", key: "wholeWord", label: "Whole words only", default: false },
    { type: "checkbox", key: "regex", label: "Regular expressions", default: false },
    {
      type: "segmented",
      key: "show",
      label: "Show",
      default: "result",
      options: [
        { value: "result", label: "Result" },
        { value: "removed", label: "Removed lines" },
      ],
    },
  ],
  sample: "10:01 INFO server started\n10:02 WARNING disk 85% full\n10:03 ERROR could not reach database\n10:04 INFO request served in 120 ms\n10:05 error retrying connection",
  run(input, o) {
    const terms = splitTerms(s(o.terms));
    if (!terms.length) return { output: input, note: "Type a word or phrase to filter by" };
    let res: RegExp[];
    try {
      res = buildMatcher(terms, { regex: Boolean(o.regex), matchCase: Boolean(o.matchCase), wholeWord: Boolean(o.wholeWord) });
    } catch (e) {
      return { output: "", error: `That regular expression isn't valid: ${(e as Error).message}` };
    }
    const src = lines(input);
    const matches = (l: string) => (o.logic === "all" ? res.every((r) => r.test(l)) : res.some((r) => r.test(l)));
    const kept: string[] = [];
    const dropped: string[] = [];
    for (const l of src) ((o.action === "keep") === matches(l) ? kept : dropped).push(l);
    if (o.show === "removed") return { output: dropped.join("\n"), note: `${plural(dropped.length, "line")} removed` };
    return { output: kept.join("\n"), note: `${plural(dropped.length, "line")} removed · ${plural(kept.length, "line")} kept` };
  },
};

/* ---------- Punctuation ---------- */
const punctuation: TransformDef = {
  inputLabel: "Text with punctuation",
  outputLabel: "Text without punctuation",
  options: [
    {
      type: "select",
      key: "what",
      label: "Characters to remove",
      default: "punct",
      options: [
        { value: "punct", label: "All punctuation" },
        { value: "punct-symbols", label: "Punctuation and symbols ($ % + © …)" },
        { value: "custom", label: "Only the characters I list" },
      ],
    },
    { type: "text", key: "custom", label: "Remove these characters", default: ".,;:!?", mono: true, showIf: (o) => o.what === "custom" },
    { type: "checkbox", key: "apostrophes", label: "Keep apostrophes inside words (don't)", default: true, showIf: (o) => o.what !== "custom" },
    { type: "checkbox", key: "hyphens", label: "Keep hyphens inside words (well-known)", default: true, showIf: (o) => o.what !== "custom" },
    { type: "checkbox", key: "numbers", label: "Keep . and , inside numbers (29.99, 1,000)", default: true, showIf: (o) => o.what !== "custom" },
    { type: "checkbox", key: "emoji", label: "Remove emoji too", default: false },
    { type: "text", key: "keep", label: "Always keep", default: "", placeholder: "e.g. @#", mono: true, showIf: (o) => o.what !== "custom" },
    {
      type: "select",
      key: "replace",
      label: "Replace with",
      default: "none",
      options: [
        { value: "none", label: "Nothing" },
        { value: "space", label: "A space" },
      ],
    },
    { type: "checkbox", key: "collapse", label: "Tidy up spaces afterwards", default: true },
  ],
  sample: "Hello, world! Don't panic — it's a well-known trick (really?). Price: $29.99 & 50% off… #deal 🎉",
  run(input, o) {
    const keep = new Set(Array.from(s(o.keep)));
    const custom = new Set(Array.from(s(o.custom)));
    const rep = o.replace === "space" ? " " : "";
    const chars = graphemes(input);
    let removed = 0;
    const isEmoji = (g: string) => /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(g);
    const out = chars.map((g, i) => {
      if (isEmoji(g)) {
        if (o.emoji) {
          removed++;
          return rep;
        }
        return g;
      }
      let hit: boolean;
      if (o.what === "custom") hit = custom.has(g);
      else {
        if (keep.has(g)) return g;
        hit = o.what === "punct-symbols" ? /^[\p{P}\p{S}]$/u.test(g) : /^\p{P}$/u.test(g);
        const inWord = /[\p{L}\p{N}]/u.test(chars[i - 1] ?? "") && /[\p{L}\p{N}]/u.test(chars[i + 1] ?? "");
        if (hit && inWord && o.apostrophes && /^['’]$/.test(g)) hit = false;
        if (hit && inWord && o.hyphens && /^[-‐]$/.test(g)) hit = false;
        if (hit && o.numbers && /^[.,]$/.test(g) && /\p{N}/u.test(chars[i - 1] ?? "") && /\p{N}/u.test(chars[i + 1] ?? "")) hit = false;
      }
      if (!hit) return g;
      removed++;
      return rep;
    });
    let t = out.join("");
    if (o.collapse) t = t.replace(/[^\S\n]{2,}/g, " ").replace(/^[^\S\n]+|[^\S\n]+$/gm, "");
    return { output: t, note: `${plural(removed, "character")} removed` };
  },
};

/* ---------- Sort lines ---------- */
export function sortLines(input: string, o: Opts): { out: string[]; removed: number } {
  let src = lines(input);
  let removed = 0;
  if (o.removeEmpty) {
    const before = src.length;
    src = src.filter((l) => l.trim());
    removed += before - src.length;
  }
  const keyOf = (l: string) => {
    const t = l.trim();
    return o.lastWord ? (t.split(/\s+/).pop() ?? t) : t;
  };
  if (o.unique) {
    const seen = new Set<string>();
    const before = src.length;
    src = src.filter((l) => {
      const k = o.caseSensitive ? l.trim() : l.trim().toLocaleLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    removed += before - src.length;
  }
  const order = s(o.order);
  const natural = order === "natural" || order === "natural-desc";
  const coll = new Intl.Collator(undefined, { numeric: natural, sensitivity: "variant" });
  const cmp = o.caseSensitive && !natural ? (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0) : (a: string, b: string) => coll.compare(a, b);
  const by = (a: string, b: string) => cmp(keyOf(a), keyOf(b)) || cmp(a, b);
  let out: string[];
  switch (order) {
    case "desc":
    case "natural-desc":
      out = [...src].sort((a, b) => by(b, a));
      break;
    case "length":
      out = [...src].sort((a, b) => graphemes(a).length - graphemes(b).length || by(a, b));
      break;
    case "length-desc":
      out = [...src].sort((a, b) => graphemes(b).length - graphemes(a).length || by(a, b));
      break;
    case "shuffle":
      out = shuffle(src);
      break;
    case "reverse":
      out = [...src].reverse();
      break;
    default:
      out = [...src].sort(by);
  }
  return { out, removed };
}

const sort: TransformDef = {
  inputLabel: "List to sort (one item per line)",
  outputLabel: "Sorted list",
  options: [
    {
      type: "select",
      key: "order",
      label: "Order",
      default: "asc",
      options: [
        { value: "asc", label: "A → Z (alphabetical)" },
        { value: "desc", label: "Z → A (reverse alphabetical)" },
        { value: "natural", label: "Natural: 2 before 10" },
        { value: "natural-desc", label: "Natural, reversed" },
        { value: "length", label: "Shortest line first" },
        { value: "length-desc", label: "Longest line first" },
        { value: "shuffle", label: "Random shuffle" },
        { value: "reverse", label: "Reverse the current order" },
      ],
    },
    { type: "checkbox", key: "caseSensitive", label: "Case-sensitive (capitals first)", default: false },
    { type: "checkbox", key: "lastWord", label: "Sort by the last word (surnames)", default: false },
    { type: "checkbox", key: "unique", label: "Remove duplicates", default: false },
    { type: "checkbox", key: "removeEmpty", label: "Remove empty lines", default: true },
  ],
  sample: "item 10\nbanana\nItem 2\napple\n\nCherry\nitem 1",
  run(input, o) {
    const { out, removed } = sortLines(input, o);
    const note = o.order === "shuffle" ? "Shuffled with your browser's secure random generator; edit or change an option to shuffle again" : `${plural(out.length, "line")} sorted`;
    return { output: out.join("\n"), note: removed ? `${note} · ${plural(removed, "line")} removed` : note };
  },
};

/* ---------- Disemvowel ---------- */
const disemvowel: TransformDef = {
  inputLabel: "Text",
  outputLabel: "Text without vowels",
  options: [
    { type: "checkbox", key: "y", label: "Treat y as a vowel", default: false },
    { type: "checkbox", key: "keepFirst", label: "Keep a vowel that starts a word", default: false, help: "“apple” → “appl” → “ppl” without it" },
    { type: "checkbox", key: "spaces", label: "Remove spaces too (puzzle style)", default: false },
  ],
  sample: "Every vowel in this sentence will disappear, except at the start of a word if you choose.",
  run(input, o) {
    const vowels = o.y ? "aeiouy" : "aeiou";
    let removed = 0;
    const g = graphemes(input);
    let out = g
      .map((c, i) => {
        const base = c.normalize("NFD").charAt(0).toLowerCase();
        if (!vowels.includes(base)) return c;
        if (o.keepFirst && !/\p{L}/u.test(g[i - 1] ?? "")) return c;
        removed++;
        return "";
      })
      .join("");
    out = o.spaces ? out.replace(/[^\S\n]+/g, "") : out.replace(/ {2,}/g, " ").replace(/^ +| +$/gm, "");
    return { output: out, note: `${plural(removed, "vowel")} removed` };
  },
};

/* ---------- Number each line ---------- */
const NUMBERING_RE = /^\s*(?:\d+\s*[-–:]\s+|[([]?\d+[.):\]]?\s+)/;

const numberLines: TransformDef = {
  inputLabel: "Lines to number",
  outputLabel: "Numbered lines",
  options: [
    {
      type: "segmented",
      key: "mode",
      label: "Action",
      default: "add",
      options: [
        { value: "add", label: "Add numbers" },
        { value: "remove", label: "Remove numbers" },
      ],
    },
    { type: "number", key: "start", label: "Start at", default: 1, showIf: (o) => o.mode === "add" },
    { type: "number", key: "step", label: "Step", default: 1, showIf: (o) => o.mode === "add" },
    { type: "text", key: "sep", label: "After the number", default: ". ", mono: true, help: "Type \\t for a tab", showIf: (o) => o.mode === "add" },
    { type: "text", key: "prefix", label: "Before the number", default: "", mono: true, showIf: (o) => o.mode === "add" },
    {
      type: "select",
      key: "pad",
      label: "Padding",
      default: "none",
      options: [
        { value: "none", label: "None (1, 2 … 10)" },
        { value: "zeros", label: "Zeros (01, 02 … 10)" },
        { value: "spaces", label: "Spaces (right-aligned)" },
      ],
      showIf: (o) => o.mode === "add",
    },
    {
      type: "select",
      key: "empty",
      label: "Empty lines",
      default: "skip",
      options: [
        { value: "skip", label: "Leave without a number" },
        { value: "number", label: "Number them too" },
        { value: "remove", label: "Remove them" },
      ],
      showIf: (o) => o.mode === "add",
    },
  ],
  sample: "Preheat the oven to 200 °C.\nSlice the potatoes.\n\nToss with oil and salt.\nRoast for 35 minutes.",
  run(input, o) {
    const src = lines(input);
    if (o.mode === "remove") {
      let count = 0;
      const out = src.map((l) => {
        const r = l.replace(NUMBERING_RE, "");
        if (r !== l) count++;
        return r;
      });
      return { output: out.join("\n"), note: `Numbers removed from ${plural(count, "line")}` };
    }
    const start = n(o.start, 1);
    const step = n(o.step, 1) || 1;
    const rows = o.empty === "remove" ? src.filter((l) => l.trim()) : src;
    const total = o.empty === "number" ? rows.length : rows.filter((l) => l.trim()).length;
    const last = start + step * Math.max(0, total - 1);
    const width = Math.max(String(Math.abs(start)).length, String(Math.abs(last)).length);
    const sep = unescapeField(s(o.sep));
    const prefix = unescapeField(s(o.prefix));
    let k = 0;
    const out = rows.map((l) => {
      if (!l.trim() && o.empty !== "number") return l;
      const v = start + step * k++;
      const abs = String(Math.abs(v));
      const padded = o.pad === "zeros" ? abs.padStart(width, "0") : o.pad === "spaces" ? abs.padStart(width, " ") : abs;
      return `${prefix}${v < 0 ? "-" : ""}${padded}${sep}${l}`;
    });
    return { output: out.join("\n"), note: `${plural(k, "line")} numbered` };
  },
};

/* ---------- Classic ciphers ---------- */
const SELF_INVERSE = new Set(["rot13", "rot47", "atbash"]);

export function runCipher(input: string, o: Opts): TransformResult {
  const c = s(o.cipher);
  const decode = o.direction === "decode";
  switch (c) {
    case "rot13":
      return { output: rot13(input), note: "ROT13 is its own inverse: run it again to get the original back" };
    case "rot47":
      return { output: rot47(input), note: "ROT47 shifts every printable ASCII character by 47; run it again to undo" };
    case "atbash":
      return { output: atbash(input), note: "Atbash swaps A↔Z, B↔Y …; run it again to undo" };
    case "vigenere":
      if (!/[a-z]/i.test(s(o.key))) return { output: "", error: "Enter a keyword made of letters (A–Z) for the Vigenère cipher." };
      return { output: vigenere(input, s(o.key), decode), note: `${decode ? "Decoded" : "Encoded"} with key “${s(o.key).toUpperCase().replace(/[^A-Z]/g, "")}”` };
    case "railfence": {
      const rails = Math.max(2, Math.min(20, Math.floor(n(o.rails, 3))));
      return { output: railFence(input, rails, decode), note: `${decode ? "Decoded" : "Encoded"} with ${rails} rails (spaces count as characters)` };
    }
    case "brute": {
      const { rows, best } = bruteForce(input);
      const clip = (t: string) => {
        const one = t.replace(/\s+/g, " ").trim();
        return one.length > 160 ? one.slice(0, 160) + "…" : one;
      };
      const out = rows.map((r) => `Shift ${String(r.shift).padStart(2, " ")}: ${clip(r.text)}${r.shift === best ? "   ← most likely" : ""}`);
      return {
        output: out.join("\n"),
        note: best ? `Most English-like: shift ${best} (decoded by moving letters back ${best}). Check the list for very short messages.` : "No letters to decode",
      };
    }
    default: {
      const shift = Math.trunc(n(o.shift, 3));
      return { output: caesar(input, decode ? -shift : shift), note: `${decode ? "Decoded" : "Encoded"} with shift ${shift}` };
    }
  }
}

const cipher: TransformDef = {
  inputLabel: "Text to encode or decode",
  outputLabel: "Result",
  swappable: true,
  options: [
    {
      type: "select",
      key: "cipher",
      label: "Cipher",
      default: "caesar",
      options: [
        { value: "caesar", label: "Caesar (choose the shift)" },
        { value: "brute", label: "Crack Caesar: show all 25 shifts" },
        { value: "rot13", label: "ROT13" },
        { value: "rot47", label: "ROT47 (letters, digits, symbols)" },
        { value: "atbash", label: "Atbash (A↔Z)" },
        { value: "vigenere", label: "Vigenère (keyword)" },
        { value: "railfence", label: "Rail fence (zigzag)" },
      ],
    },
    {
      type: "segmented",
      key: "direction",
      label: "Direction",
      default: "decode",
      options: [
        { value: "decode", label: "Decode" },
        { value: "encode", label: "Encode" },
      ],
      showIf: (o) => !SELF_INVERSE.has(s(o.cipher)) && o.cipher !== "brute",
    },
    { type: "number", key: "shift", label: "Shift", default: 3, min: -25, max: 25, showIf: (o) => o.cipher === "caesar" },
    { type: "text", key: "key", label: "Keyword", default: "LEMON", showIf: (o) => o.cipher === "vigenere" },
    { type: "number", key: "rails", label: "Rails", default: 3, min: 2, max: 20, showIf: (o) => o.cipher === "railfence" },
  ],
  sample: "Wkh txlfn eurzq ira mxpsv ryhu wkh odcb grj.",
  run: runCipher,
};

/* ---------- Word scrambler ---------- */
function scrambleWord(w: string, middle: boolean, mustChange: boolean): string {
  const g = graphemes(w);
  const lo = middle ? 1 : 0;
  const hi = middle ? g.length - 1 : g.length;
  if (hi - lo < 2) return w;
  const inner = g.slice(lo, hi);
  const canChange = new Set(inner.map((c) => c.toLowerCase())).size > 1;
  for (let tries = 0; tries < 20; tries++) {
    const mixed = shuffle(inner);
    const out = [...g.slice(0, lo), ...mixed, ...g.slice(hi)].join("");
    if (!mustChange || !canChange || out.toLowerCase() !== w.toLowerCase()) return out;
  }
  return w;
}

export function scramble(input: string, o: Opts): TransformResult {
  const mode = s(o.mode);
  const must = Boolean(o.mustChange);
  const src = lines(input);
  if (mode === "letters" || mode === "middle")
    return { output: input.replace(/\p{L}+/gu, (w) => scrambleWord(w, mode === "middle", must)), note: "Punctuation and spaces stay where they were" };
  if (mode === "words")
    return {
      output: src.map((l) => shuffle(l.split(/\s+/).filter(Boolean)).join(" ")).join("\n"),
      note: "Word order shuffled within each line",
    };
  if (mode === "lines") return { output: shuffle(src).join("\n"), note: `${plural(src.length, "line")} shuffled` };
  if (mode === "chars")
    return {
      output: src
        .map((l) => {
          const g = graphemes(l);
          if (!o.keepSpaces) return shuffle(g).join("");
          const letters = shuffle(g.filter((c) => !/^\s$/.test(c)));
          let k = 0;
          return g.map((c) => (/^\s$/.test(c) ? c : letters[k++])).join("");
        })
        .join("\n"),
      note: "Characters shuffled within each line",
    };
  // Puzzle: one scrambled word per line, then the answers.
  const words = input.split(/[\s,;]+/).filter((w) => /\p{L}/u.test(w));
  if (!words.length) return { output: "", error: "Type the words for the puzzle, one per line." };
  const width = String(words.length).length;
  const puzzle = words.map((w, i) => `${String(i + 1).padStart(width, " ")}. ${scrambleWord(w.toLocaleUpperCase(), false, true)}   ____________`);
  const answers = words.map((w, i) => `${i + 1}. ${w}`);
  return { output: `${puzzle.join("\n")}\n\nAnswers\n${answers.join("\n")}`, note: `${plural(words.length, "word")} in the puzzle` };
}

const scrambler: TransformDef = {
  inputLabel: "Text or words to scramble",
  outputLabel: "Scrambled text",
  live: false,
  actionLabel: "Scramble",
  options: [
    {
      type: "select",
      key: "mode",
      label: "Scramble",
      default: "letters",
      options: [
        { value: "letters", label: "Letters in each word" },
        { value: "middle", label: "Middle letters (keep first and last)" },
        { value: "words", label: "Word order in each line" },
        { value: "lines", label: "Line order" },
        { value: "chars", label: "All characters in each line" },
        { value: "puzzle", label: "Word jumble puzzle with answers" },
      ],
    },
    {
      type: "checkbox",
      key: "mustChange",
      label: "Make every word different from the original",
      default: true,
      showIf: (o) => o.mode === "letters" || o.mode === "middle",
    },
    { type: "checkbox", key: "keepSpaces", label: "Keep spaces in place", default: true, showIf: (o) => o.mode === "chars" },
  ],
  sample: "According to research, people can still read words when the middle letters are scrambled.",
  run: scramble,
};

export const TEXT_OPS: Record<string, TransformDef> = {
  "add-prefix-suffix": addPrefixSuffix,
  "line-breaks": lineBreaks,
  repeat: repeater,
  "extract-columns": columnExtractor,
  "remove-duplicate-words": duplicateWords,
  "remove-empty-lines": emptyLines,
  "remove-extra-spaces": extraSpaces,
  "remove-accents": accents,
  "filter-lines": filterLines,
  "remove-punctuation": punctuation,
  "sort-lines": sort,
  disemvowel,
  "number-lines": numberLines,
  cipher,
  scramble: scrambler,
};
