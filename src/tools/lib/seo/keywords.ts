/*
 * Keyword density (word and phrase frequency) and keyword idea expansion.
 * Density = (occurrences × words in the phrase) ÷ total words × 100, i.e. the share of the text the phrase makes up.
 * Ideas are built from fixed modifier lists: no search data is fetched or estimated.
 */

export const STOP_WORDS_EN = new Set(
  (
    "a about above after again against all am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers herself him himself his how i if in into is it its itself just me more most my myself no nor not now of off on once only or other our ours ourselves out over own same she should so some such than that the their theirs them themselves then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your yours yourself yourselves " +
    "it's don't can't won't isn't aren't i'm you're we're they're that's there's"
  ).split(/\s+/),
);

const WORD_RE = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

export function words(text: string): string[] {
  return (text.match(WORD_RE) ?? []).map((w) => w.toLocaleLowerCase().replace(/’/g, "'"));
}

/** Text split at sentence ends, so phrases don't run across sentences. */
function segments(text: string): string[][] {
  return text
    .split(/[.!?;:()\[\]{}"“”\n]+/)
    .map((s) => words(s))
    .filter((s) => s.length);
}

export interface DensityOptions {
  n: 1 | 2 | 3;
  excludeStopWords: boolean;
  minCount: number;
  minLength: number;
}

export interface DensityRow {
  phrase: string;
  count: number;
  density: number;
}

export function density(text: string, o: DensityOptions): { total: number; unique: number; rows: DensityRow[] } {
  const total = words(text).length;
  const counts = new Map<string, number>();
  for (const seg of segments(text)) {
    for (let i = 0; i + o.n <= seg.length; i++) {
      const gram = seg.slice(i, i + o.n);
      if (o.n === 1 && gram[0].length < o.minLength) continue;
      if (o.excludeStopWords) {
        if (o.n === 1 && STOP_WORDS_EN.has(gram[0])) continue;
        if (o.n > 1 && (STOP_WORDS_EN.has(gram[0]) || STOP_WORDS_EN.has(gram[gram.length - 1]))) continue;
      }
      if (gram.every((g) => /^\d+$/.test(g))) continue;
      const k = gram.join(" ");
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  const rows = [...counts.entries()]
    .filter(([, c]) => c >= o.minCount)
    .map(([phrase, count]) => ({ phrase, count, density: total ? (count * o.n * 100) / total : 0 }))
    .sort((a, b) => b.count - a.count || a.phrase.localeCompare(b.phrase));
  return { total, unique: counts.size, rows };
}

/** Occurrences of specific phrases (whole words, case-insensitive). */
export function countPhrase(text: string, phrase: string): number {
  const target = words(phrase);
  if (!target.length) return 0;
  let n = 0;
  for (const seg of segments(text))
    for (let i = 0; i + target.length <= seg.length; i++) if (target.every((t, j) => seg[i + j] === t)) n++;
  return n;
}

/* ---------------------------------------------------------------- keyword ideas */

export type IdeaGroup = "Questions" | "Prepositions" | "Comparisons" | "Buying" | "Learning" | "Local" | "A–Z";

export const IDEA_GROUPS: IdeaGroup[] = ["Questions", "Prepositions", "Comparisons", "Buying", "Learning", "Local", "A–Z"];

const TEMPLATES: Record<Exclude<IdeaGroup, "A–Z">, string[]> = {
  Questions: [
    "what is {s}",
    "what is {s} used for",
    "how does {s} work",
    "how to use {s}",
    "how to choose {s}",
    "how much does {s} cost",
    "why use {s}",
    "when to use {s}",
    "where to buy {s}",
    "who needs {s}",
    "which {s} is best",
    "is {s} worth it",
    "can you {s}",
    "do i need {s}",
  ],
  Prepositions: ["{s} for beginners", "{s} for small business", "{s} for kids", "{s} with {c}", "{s} without {c}", "{s} at home", "{s} online", "{s} from scratch", "{s} like {c}", "{s} to {c}", "{s} near me"],
  Comparisons: ["{s} vs {c}", "{s} or {c}", "{s} versus {c}", "difference between {s} and {c}", "{s} alternatives", "{s} alternative", "{s} compared", "{s} vs"],
  Buying: ["best {s}", "cheap {s}", "affordable {s}", "free {s}", "{s} price", "{s} cost", "{s} reviews", "buy {s}", "{s} deals", "{s} discount", "{s} sale", "top rated {s}"],
  Learning: ["{s} guide", "{s} tutorial", "{s} examples", "{s} ideas", "{s} tips", "{s} checklist", "{s} template", "{s} meaning", "{s} definition", "{s} benefits", "{s} mistakes", "{s} step by step", "{s} explained"],
  Local: ["{s} near me", "{s} in {l}", "best {s} in {l}", "{s} near {l}", "{s} {l}", "{l} {s}", "cheap {s} in {l}", "{s} open now"],
};

const AZ: Record<string, string[]> = {
  a: ["apps", "accessories"], b: ["benefits", "brands"], c: ["course", "calculator"], d: ["diy", "dimensions"], e: ["examples", "equipment"], f: ["free", "faq"], g: ["guide", "generator"], h: ["history", "hacks"], i: ["ideas", "images"], j: ["jobs", "jar"],
  k: ["kit", "kids"], l: ["list", "login"], m: ["mistakes", "maintenance"], n: ["near me", "names"], o: ["online", "options"], p: ["price", "pdf"], q: ["questions", "quiz"], r: ["reviews", "recipe"], s: ["software", "service"], t: ["tips", "tools"],
  u: ["uses", "uk"], v: ["video", "vs"], w: ["worksheet", "website"], x: ["xl"], y: ["youtube", "yearly cost"], z: ["zone", "zero"],
};

export interface Idea {
  keyword: string;
  group: IdeaGroup;
  modifier: string;
}

export function expandIdeas(seedRaw: string, opts: { compare?: string; location?: string; groups?: IdeaGroup[] } = {}): Idea[] {
  const seed = seedRaw.trim().toLowerCase().replace(/\s+/g, " ");
  if (!seed) return [];
  const c = (opts.compare ?? "").trim().toLowerCase();
  const l = (opts.location ?? "").trim();
  const groups = opts.groups ?? IDEA_GROUPS;
  const out: Idea[] = [];
  const seen = new Set<string>();
  const push = (keyword: string, group: IdeaGroup, modifier: string) => {
    const k = keyword.replace(/\s+/g, " ").trim();
    if (!k || seen.has(k)) return;
    seen.add(k);
    out.push({ keyword: k, group, modifier });
  };
  for (const g of groups) {
    if (g === "A–Z") {
      for (const [letter, mods] of Object.entries(AZ)) for (const m of mods) push(`${seed} ${m}`, g, letter.toUpperCase());
      continue;
    }
    for (const t of TEMPLATES[g]) {
      if (t.includes("{c}") && !c) continue;
      if (t.includes("{l}") && !l) continue;
      push(t.replace("{s}", seed).replace("{c}", c).replace("{l}", l.toLowerCase()), g, t.replace("{s}", "…").replace("{c}", c ? "[compare]" : "").replace("{l}", "[location]"));
    }
  }
  return out;
}
