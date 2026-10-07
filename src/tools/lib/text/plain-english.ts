/*
 * Plain-English rewriting: a curated list of wordy phrases and formal words with shorter,
 * plainer equivalents (based on the US Federal Plain Language Guidelines and the Plain English
 * Campaign's A–Z of alternative words). Deterministic: the same input always gives the same output.
 * It does not paraphrase or understand meaning; every change is listed so it can be reviewed.
 */
import { passiveHints, sentences, words, type Span } from "./prose";

export interface Replacement {
  phrase: string;
  /** "" = delete the phrase. */
  replacement: string;
  re: RegExp;
}

const build = (pairs: [string, string][]): Replacement[] =>
  pairs.map(([phrase, replacement]) => ({
    phrase,
    replacement,
    re: new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+")}\\b${replacement === "" ? ",?" : ""}`, "gi"),
  }));

/** Wordy phrases → concise equivalents. Also used by the proofreader's style hints. */
export const WORDY: Replacement[] = build([
  ["due to the fact that", "because"],
  ["owing to the fact that", "because"],
  ["in light of the fact that", "because"],
  ["in view of the fact that", "because"],
  ["on account of the fact that", "because"],
  ["for the reason that", "because"],
  ["despite the fact that", "although"],
  ["in spite of the fact that", "although"],
  ["regardless of the fact that", "although"],
  ["was aware of the fact that", "knew"],
  ["at this point in time", "now"],
  ["at this moment in time", "now"],
  ["at the present time", "now"],
  ["in the near future", "soon"],
  ["at an early date", "soon"],
  ["in the event that", "if"],
  ["until such time as", "until"],
  ["prior to", "before"],
  ["subsequent to", "after"],
  ["in order to", "to"],
  ["in order for", "for"],
  ["in an effort to", "to"],
  ["for the purpose of", "for"],
  ["with regard to", "about"],
  ["with reference to", "about"],
  ["in regard to", "about"],
  ["in relation to", "about"],
  ["pertaining to", "about"],
  ["as to whether", "whether"],
  ["the majority of", "most"],
  ["a majority of", "most"],
  ["a large number of", "many"],
  ["a great deal of", "much"],
  ["a small number of", "a few"],
  ["on a daily basis", "daily"],
  ["on a weekly basis", "weekly"],
  ["on a monthly basis", "monthly"],
  ["on a regular basis", "regularly"],
  ["in a timely manner", "promptly"],
  ["at all times", "always"],
  ["has the ability to", "can"],
  ["have the ability to", "can"],
  ["is able to", "can"],
  ["are able to", "can"],
  ["is in a position to", "can"],
  ["has a tendency to", "tends to"],
  ["have a tendency to", "tend to"],
  ["make a decision", "decide"],
  ["makes a decision", "decides"],
  ["made a decision", "decided"],
  ["take into consideration", "consider"],
  ["give consideration to", "consider"],
  ["conduct an investigation", "investigate"],
  ["reach a conclusion", "conclude"],
  ["come to the realization that", "realize that"],
  ["provide assistance to", "help"],
  ["is in need of", "needs"],
  ["are in need of", "need"],
  ["make use of", "use"],
  ["makes use of", "uses"],
  ["made use of", "used"],
  ["make reference to", "refer to"],
  ["put an end to", "end"],
  ["is dependent on", "depends on"],
  ["is dependent upon", "depends on"],
  ["are dependent on", "depend on"],
  ["is indicative of", "indicates"],
  ["is reflective of", "reflects"],
  ["in close proximity to", "near"],
  ["in the vicinity of", "near"],
  ["in the course of", "during"],
  ["during the course of", "during"],
  ["by means of", "by"],
  ["by virtue of", "by"],
  ["with the exception of", "except"],
  ["in excess of", "more than"],
  ["in the amount of", "for"],
  ["along the lines of", "like"],
  ["as a matter of fact", "in fact"],
  ["for all intents and purposes", "in effect"],
  ["first and foremost", "first"],
  ["each and every", "every"],
  ["end result", "result"],
  ["final outcome", "outcome"],
  ["past history", "history"],
  ["future plans", "plans"],
  ["advance planning", "planning"],
  ["basic fundamentals", "fundamentals"],
  ["absolutely essential", "essential"],
  ["completely eliminate", "eliminate"],
  ["unexpected surprise", "surprise"],
  ["free gift", "gift"],
  ["period of time", "period"],
  ["in the process of", ""],
  ["it is important to note that", ""],
  ["it should be noted that", ""],
  ["it is worth noting that", ""],
  ["please be advised that", ""],
  ["needless to say", ""],
]);

/** Formal words → everyday words (each verb form listed so tense is kept). */
export const SIMPLER: Replacement[] = build([
  ["utilize", "use"],
  ["utilizes", "uses"],
  ["utilized", "used"],
  ["utilizing", "using"],
  ["utilise", "use"],
  ["utilises", "uses"],
  ["utilised", "used"],
  ["utilising", "using"],
  ["utilization", "use"],
  ["commence", "start"],
  ["commences", "starts"],
  ["commenced", "started"],
  ["commencing", "starting"],
  ["facilitate", "help"],
  ["facilitates", "helps"],
  ["facilitated", "helped"],
  ["facilitating", "helping"],
  ["terminate", "end"],
  ["terminates", "ends"],
  ["terminated", "ended"],
  ["assist", "help"],
  ["assists", "helps"],
  ["assisted", "helped"],
  ["assisting", "helping"],
  ["assistance", "help"],
  ["obtain", "get"],
  ["obtains", "gets"],
  ["demonstrate", "show"],
  ["demonstrates", "shows"],
  ["demonstrated", "showed"],
  ["modify", "change"],
  ["modifies", "changes"],
  ["modified", "changed"],
  ["initiate", "start"],
  ["initiates", "starts"],
  ["initiated", "started"],
  ["anticipate", "expect"],
  ["anticipates", "expects"],
  ["anticipated", "expected"],
  ["ascertain", "find out"],
  ["expedite", "speed up"],
  ["endeavor to", "try to"],
  ["endeavour to", "try to"],
  ["numerous", "many"],
  ["approximately", "about"],
  ["sufficient", "enough"],
  ["additional", "more"],
  ["regarding", "about"],
  ["subsequently", "later"],
  ["in lieu of", "instead of"],
  ["individuals", "people"],
  ["methodology", "method"],
  ["remuneration", "pay"],
]);

/** Intensifiers and fillers that rarely add meaning (optional, off by default). */
export const FILLERS: Replacement[] = build(
  ["very", "really", "quite", "basically", "actually", "literally", "totally", "definitely", "certainly", "simply"].map((w) => [w, ""] as [string, string]),
);

export interface Change {
  start: number;
  end: number;
  from: string;
  to: string;
  kind: "wordy" | "simpler" | "filler";
}

export interface RewriteOptions {
  wordy: boolean;
  simpler: boolean;
  fillers: boolean;
}

export interface RewriteResult {
  output: string;
  changes: Change[];
  longSentences: Span[];
  passive: Span[];
}

const capFirst = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

export function rewrite(text: string, o: RewriteOptions): RewriteResult {
  const found: Change[] = [];
  const lists: [Replacement[], Change["kind"]][] = [];
  if (o.wordy) lists.push([WORDY, "wordy"]);
  if (o.simpler) lists.push([SIMPLER, "simpler"]);
  if (o.fillers) lists.push([FILLERS, "filler"]);
  for (const [list, kind] of lists)
    for (const r of list)
      for (const m of text.matchAll(r.re)) {
        const from = m[0];
        const to = r.replacement && /^\p{Lu}/u.test(from) ? capFirst(r.replacement) : r.replacement;
        found.push({ start: m.index ?? 0, end: (m.index ?? 0) + from.length, from, to, kind });
      }
  // Longest match wins where matches overlap.
  found.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
  const changes: Change[] = [];
  let last = -1;
  for (const c of found) {
    if (c.start < last) continue;
    changes.push(c);
    last = c.end;
  }
  let out = "";
  let pos = 0;
  for (const c of changes) {
    out += text.slice(pos, c.start);
    let end = c.end;
    if (c.to === "") {
      // Deleting: drop one following space and capitalise the next word at a sentence start.
      if (text[end] === " ") end++;
      const atStart = /(^|[.!?]\s+|\n\s*)$/.test(out);
      if (atStart && end < text.length) {
        out += text[end].toUpperCase();
        end++;
      }
      // Avoid a double space when the phrase was mid-sentence.
      if (out.endsWith(" ") && text[end] === " ") end++;
    } else out += c.to;
    pos = end;
  }
  out += text.slice(pos);
  const longSentences = sentences(text).filter((s) => words(s.text).length > 25);
  return { output: out, changes, longSentences, passive: passiveHints(text) };
}
