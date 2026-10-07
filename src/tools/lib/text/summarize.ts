/*
 * Extractive summarizer: picks existing sentences, never writes new ones.
 * Score = (sum of the document frequencies of the sentence's distinct content words, each divided
 * by the highest frequency) ÷ √(number of content words), × 1.2 for the first sentence of the text
 * and × 1.1 for the first sentence of a paragraph. Very short sentences (< 5 words) score 0.
 * The top sentences are returned in their original order; near-duplicates (≥ 60% shared content
 * words) of an already picked sentence are skipped.
 */
import { paragraphs, sentences, STOPWORDS, words, type Span } from "./prose";

export interface ScoredSentence extends Span {
  index: number;
  score: number;
  picked: boolean;
}

export interface SummaryResult {
  sentences: ScoredSentence[];
  picked: ScoredSentence[];
  keyTerms: { term: string; count: number }[];
}

const stem = (w: string) => {
  let s = w.toLowerCase().replace(/’/g, "'").replace(/'s$/, "");
  if (s.length > 4 && s.endsWith("ies")) s = s.slice(0, -3) + "y";
  else if (s.length > 3 && s.endsWith("es") && /(?:ss|sh|ch|x|z)es$/.test(s)) s = s.slice(0, -2);
  else if (s.length > 3 && s.endsWith("s") && !s.endsWith("ss") && !s.endsWith("us") && !s.endsWith("is")) s = s.slice(0, -1);
  return s;
};

function contentWords(t: string): string[] {
  return words(t)
    .map((w) => w.toLowerCase())
    .filter((w) => w.length > 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w))
    .map(stem);
}

export function summarize(text: string, count: number): SummaryResult {
  const sents = sentences(text);
  const paraStarts = new Set(paragraphs(text).map((p) => p.start));
  const bags = sents.map((s) => contentWords(s.text));
  const freq = new Map<string, number>();
  for (const b of bags) for (const w of b) freq.set(w, (freq.get(w) ?? 0) + 1);
  const max = Math.max(1, ...freq.values());

  const scored: ScoredSentence[] = sents.map((s, i) => {
    const distinct = [...new Set(bags[i])];
    let score = 0;
    if (words(s.text).length >= 5 && distinct.length) {
      score = distinct.reduce((a, w) => a + (freq.get(w) ?? 0) / max, 0) / Math.sqrt(distinct.length);
      if (i === 0) score *= 1.2;
      else if (paraStarts.has(s.start)) score *= 1.1;
    }
    return { ...s, index: i, score, picked: false };
  });

  const want = Math.max(1, Math.min(count, scored.length));
  const order = [...scored].sort((a, b) => b.score - a.score || a.index - b.index);
  const chosen: ScoredSentence[] = [];
  const chosenBags: Set<string>[] = [];
  for (const s of order) {
    if (chosen.length >= want) break;
    if (s.score <= 0 && chosen.length) break;
    const bag = new Set(bags[s.index]);
    const dup = chosenBags.some((c) => {
      const shared = [...bag].filter((w) => c.has(w)).length;
      return shared / Math.max(1, Math.min(bag.size, c.size)) >= 0.6;
    });
    if (dup && bag.size > 2) continue;
    s.picked = true;
    chosen.push(s);
    chosenBags.push(bag);
  }
  chosen.sort((a, b) => a.index - b.index);

  // Key terms: most frequent content words, shown in their most common surface form.
  const surface = new Map<string, Map<string, number>>();
  for (const w of words(text)) {
    const lw = w.toLowerCase();
    if (lw.length <= 2 || STOPWORDS.has(lw) || /^\d+$/.test(lw)) continue;
    const k = stem(lw);
    const m = surface.get(k) ?? new Map<string, number>();
    m.set(lw, (m.get(lw) ?? 0) + 1);
    surface.set(k, m);
  }
  const keyTerms = [...freq.entries()]
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([k, n]) => ({ term: [...(surface.get(k)?.entries() ?? [])].sort((a, b) => b[1] - a[1])[0]?.[0] ?? k, count: n }));

  return { sentences: scored, picked: chosen, keyTerms };
}

export type SummaryFormat = "paragraph" | "bullets" | "tldr";

export function formatSummary(r: SummaryResult, f: SummaryFormat): string {
  if (!r.picked.length) return "";
  if (f === "tldr") {
    const best = [...r.picked].sort((a, b) => b.score - a.score)[0];
    return `TL;DR: ${best.text}`;
  }
  if (f === "bullets") return r.picked.map((s) => `• ${s.text}`).join("\n");
  return r.picked.map((s) => s.text).join(" ");
}
