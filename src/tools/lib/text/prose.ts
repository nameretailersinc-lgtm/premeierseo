/*
 * Prose analysis shared by the essay checker, proofreader, summarizer and rewriter:
 * sentence and paragraph splitting with offsets, syllable estimates, Flesch Reading Ease and
 * Flesch–Kincaid grade, passive-voice hints and transition words. Pure functions.
 */

export interface Span {
  text: string;
  start: number;
  end: number;
}

export const WORD_RE = /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu;

export function words(text: string): string[] {
  return text.match(WORD_RE) ?? [];
}

/** Abbreviations that end with a full stop but don't end a sentence. */
const ABBREV = new Set(
  "mr mrs ms dr prof sr jr st vs etc e.g i.e cf al fig figs no nos p pp vol approx dept est inc ltd co corp jan feb mar apr jun jul aug sep sept oct nov dec mt ft rev gen col capt lt sgt u.s u.k a.m p.m ph.d".split(" "),
);

/** Paragraphs: blocks separated by a blank line. */
export function paragraphs(text: string): Span[] {
  const out: Span[] = [];
  const re = /[^\n]+(?:\n(?![ \t]*\n)[^\n]*)*/g;
  for (const m of text.matchAll(re)) {
    const t = m[0];
    if (!t.trim()) continue;
    const lead = t.length - t.trimStart().length;
    out.push({ text: t.trim(), start: (m.index ?? 0) + lead, end: (m.index ?? 0) + lead + t.trim().length });
  }
  return out;
}

/** Sentences with offsets. Splits after . ! ? (plus closing quotes/brackets) followed by space and a capital, digit or quote, and at line breaks inside a paragraph when the line ends with terminal punctuation or is short (a heading). */
export function sentences(text: string): Span[] {
  const out: Span[] = [];
  let start = 0;
  const push = (end: number) => {
    const raw = text.slice(start, end);
    const t = raw.trim();
    if (t && /[\p{L}\p{N}]/u.test(t)) {
      const lead = raw.length - raw.trimStart().length;
      out.push({ text: t, start: start + lead, end: start + lead + t.length });
    }
    start = end;
  };
  const n = text.length;
  for (let i = 0; i < n; i++) {
    const c = text[i];
    if (c === "\n") {
      // Blank line = paragraph break; single line break ends a sentence only after terminal punctuation or a short heading-like line.
      const line = text.slice(start, i).trim();
      if (text[i + 1] === "\n" || /[.!?:"”')\]]$/.test(line) || (line && words(line).length <= 8 && !/[,;]$/.test(line))) push(i);
      continue;
    }
    if (c !== "." && c !== "!" && c !== "?") continue;
    let j = i + 1;
    while (j < n && /[.!?]/.test(text[j])) j++;
    while (j < n && /["”’')\]]/.test(text[j])) j++;
    if (j < n && !/\s/.test(text[j])) continue;
    if (c === ".") {
      const before = text.slice(Math.max(0, i - 12), i);
      const tok = (before.match(/([\p{L}.]+)$/u)?.[1] ?? "").toLowerCase();
      if (ABBREV.has(tok) || ABBREV.has(tok.replace(/\.$/, ""))) continue;
      if (/^\p{Lu}$/u.test(tok)) continue; // initials: "J. Smith"
      if (/\d$/.test(before) && /^\s*\d/.test(text.slice(j))) continue; // 3. 5 (list numbers) handled by space; decimals have no space
    }
    // Next non-space character should look like a sentence start.
    let k = j;
    while (k < n && text[k] === " ") k++;
    if (k < n && text[k] !== "\n" && /\p{Ll}/u.test(text[k])) continue;
    push(j);
    i = j - 1;
  }
  push(n);
  return out;
}

/* ---------- Syllables ---------- */

const SYLLABLE_EXCEPTIONS: Record<string, number> = {
  the: 1, every: 3, everything: 4, everyone: 4, business: 2, area: 3, idea: 3, being: 2, create: 2, created: 3, creates: 2, creating: 3,
  people: 2, science: 2, quiet: 2, poem: 2, poet: 2, lion: 2, real: 1, really: 3, video: 3, radio: 3, piano: 3, iron: 2, chocolate: 3,
  different: 3, family: 3, interest: 3, interesting: 4, camera: 3, several: 3, general: 3, evening: 2, actually: 4, usually: 4, naturally: 4,
  maybe: 2, someone: 2, sometimes: 2, something: 2, anyone: 3, everywhere: 3, therefore: 2, whether: 2, ocean: 2, social: 2, special: 2,
  are: 1, were: 1, where: 1, there: 1, here: 1, more: 1, fire: 1, hour: 1, our: 1, your: 1, one: 1, once: 1, done: 1, gone: 1, give: 1, live: 1,
  have: 1, love: 1, move: 1, above: 2, whole: 1, simile: 3, recipe: 3, apostrophe: 4, cafe: 2, naive: 2, period: 3, variety: 4, society: 4,
};

/** Estimated syllables in an English word (spelling rules plus a small exception list). */
export function syllables(word: string): number {
  let w = word.toLowerCase().replace(/[’']/g, "").replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (SYLLABLE_EXCEPTIONS[w]) return SYLLABLE_EXCEPTIONS[w];
  if (w.length <= 3) return 1;
  // Plurals and possessives of exception words.
  if (w.endsWith("s") && SYLLABLE_EXCEPTIONS[w.slice(0, -1)]) return SYLLABLE_EXCEPTIONS[w.slice(0, -1)];
  w = w.replace(/(?:[^laeiouyscgzxh]es|[^laeiouy]e)$/, (m) => m[0]); // silent final e / es (make, makes; not "le" in table, not houses)
  w = w.replace(/([^aeiouytd])ed$/, "$1"); // jumped → jump; wanted keeps its syllable
  w = w.replace(/^y/, "");
  let n = (w.match(/[aeiouy]+/g) ?? []).length;
  // Vowel pairs that are usually two syllables.
  n += (w.match(/[^cgst]ia|io(?!n|us|r)|eo|[^gq]ua|uo|iet|ii|[aeiou]ing|[aeiou]y[aeiou]|uity|ier\b|iest\b|ism\b/g) ?? []).length;
  return Math.max(1, n);
}

/* ---------- Readability ---------- */

export interface Readability {
  words: number;
  sentences: number;
  syllables: number;
  /** Flesch (1948): 206.835 − 1.015 × (words/sentences) − 84.6 × (syllables/words). */
  fre: number;
  /** Kincaid et al. (1975): 0.39 × (words/sentences) + 11.8 × (syllables/words) − 15.59. */
  fkgl: number;
  wordsPerSentence: number;
  syllablesPerWord: number;
}

export function readability(text: string, sentenceCount?: number): Readability | null {
  const w = words(text).filter((x) => /\p{L}/u.test(x));
  const s = sentenceCount ?? sentences(text).length;
  if (!w.length || !s) return null;
  const syl = w.reduce((a, x) => a + syllables(x), 0);
  const wps = w.length / s;
  const spw = syl / w.length;
  return {
    words: w.length,
    sentences: s,
    syllables: syl,
    fre: 206.835 - 1.015 * wps - 84.6 * spw,
    fkgl: 0.39 * wps + 11.8 * spw - 15.59,
    wordsPerSentence: wps,
    syllablesPerWord: spw,
  };
}

export function freBand(fre: number): string {
  if (fre >= 90) return "Very easy (about age 11)";
  if (fre >= 80) return "Easy";
  if (fre >= 70) return "Fairly easy";
  if (fre >= 60) return "Plain English (ages 13–15)";
  if (fre >= 50) return "Fairly difficult";
  if (fre >= 30) return "Difficult (college level)";
  return "Very difficult (graduate level)";
}

/* ---------- Passive voice (hint) ---------- */

const IRREGULAR_PARTICIPLES =
  "known written done made given taken seen built found held kept left lost paid put said sent set shown sold told thought understood won begun broken chosen driven eaten fallen forgotten hidden ridden risen shaken spoken stolen sworn thrown woken worn bought brought caught taught fought sought meant read led fed bred spent lent bent hit cut shut hurt cost let quit split spread born borne bound drawn grown blown flown overcome undertaken withdrawn forbidden forgiven".split(" ");
const NOT_PASSIVE_ADJ = new Set("tired interested excited bored worried pleased surprised married used supposed concerned scared involved related based located dedicated determined prepared satisfied disappointed amazed confused annoyed relieved".split(" "));

const PASSIVE_RE = new RegExp(
  String.raw`\b(am|is|are|was|were|be|been|being|is not|was not|were not|are not|isn't|wasn't|weren't|aren't)\s+(?:(?:\w+ly)\s+)?(\w+ed|${IRREGULAR_PARTICIPLES.join("|")})\b`,
  "gi",
);

/** Likely passive constructions: a form of "be" followed by a past participle. Hints only. */
export function passiveHints(text: string): Span[] {
  const out: Span[] = [];
  for (const m of text.matchAll(PASSIVE_RE)) {
    if (NOT_PASSIVE_ADJ.has(m[2].toLowerCase())) continue;
    out.push({ text: m[0], start: m.index ?? 0, end: (m.index ?? 0) + m[0].length });
  }
  return out;
}

/* ---------- Transitions ---------- */

export const TRANSITIONS = [
  "however", "therefore", "moreover", "furthermore", "in addition", "additionally", "consequently", "as a result", "for example", "for instance",
  "in contrast", "on the other hand", "similarly", "likewise", "nevertheless", "nonetheless", "meanwhile", "finally", "first", "firstly", "second",
  "secondly", "third", "thirdly", "next", "then", "in conclusion", "to conclude", "in summary", "overall", "thus", "hence", "instead", "although",
  "because", "since", "despite", "in fact", "indeed", "specifically", "in particular", "notably", "subsequently", "ultimately", "accordingly",
];
const TRANSITION_RE = new RegExp(`\\b(?:${TRANSITIONS.map((t) => t.replace(/ /g, "\\s+")).join("|")})\\b`, "gi");

export function transitionsIn(text: string): string[] {
  return (text.match(TRANSITION_RE) ?? []).map((t) => t.toLowerCase().replace(/\s+/g, " "));
}

/* ---------- Word frequency ---------- */

export const STOPWORDS = new Set(
  "a about above after again against all also am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers herself him himself his how i if in into is it its itself just me more most my myself no nor not now of off on once only or other our ours ourselves out over own same she should so some such than that the their theirs them themselves then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your yours yourself yourselves s t don't it's i'm we're they're can't won't isn't aren't wasn't weren't i've you've we've let's one two may might must shall us".split(
    " ",
  ),
);

export function topWords(text: string, n = 10): { word: string; count: number }[] {
  const freq = new Map<string, number>();
  for (const w of words(text)) {
    const k = w.toLowerCase().replace(/’/g, "'");
    if (STOPWORDS.has(k) || k.length < 3 || /^\d+$/.test(k)) continue;
    freq.set(k, (freq.get(k) ?? 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([word, count]) => ({ word, count }));
}
