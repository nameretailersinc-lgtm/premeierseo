/*
 * Spelling engine shared by the Web Worker and the main-thread fallback.
 * Dictionary: Hunspell en-US (dictionary-en, from SCOWL), self-hosted at /vendor/dictionaries/
 * and read with nspell. Nothing is sent anywhere: the dictionary is downloaded once (≈ 550 KB)
 * and the text never leaves the browser.
 */
import type NSpellType from "nspell";

export const DICT_AFF = "/vendor/dictionaries/en-US.aff";
export const DICT_DIC = "/vendor/dictionaries/en-US.dic";

type NSpell = InstanceType<typeof NSpellType>;

let speller: NSpell | null = null;
let loading: Promise<NSpell> | null = null;

export function loadSpeller(): Promise<NSpell> {
  if (speller) return Promise.resolve(speller);
  if (loading) return loading;
  loading = (async () => {
    const [aff, dic, mod] = await Promise.all([
      fetch(DICT_AFF).then((r) => {
        if (!r.ok) throw new Error(`Dictionary download failed (${r.status}).`);
        return r.text();
      }),
      fetch(DICT_DIC).then((r) => {
        if (!r.ok) throw new Error(`Dictionary download failed (${r.status}).`);
        return r.text();
      }),
      import("nspell"),
    ]);
    const factory = ((mod as unknown as { default?: typeof NSpellType }).default ?? mod) as unknown as (aff: string, dic: string) => NSpell;
    speller = factory(aff, dic);
    return speller;
  })();
  loading.catch(() => {
    loading = null;
  });
  return loading;
}

/*
 * British → American respelling rules. A word that fails the US dictionary is accepted as British
 * when one of these standard changes produces a US dictionary word (colour → color, organise →
 * organize, centre → center, travelled → traveled, defence → defense, catalogue → catalog).
 */
const UK_RULES: [RegExp, string][] = [
  [/our/, "or"],
  [/is(e|es|ed|ing|ation|ations|er|ers)$/, "iz$1"],
  [/ys(e|es|ed|ing|er|ers)$/, "yz$1"],
  [/tre(s|d)?$/, "ter$1"],
  [/bre(s)?$/, "ber$1"],
  [/ogue(s)?$/, "og$1"],
  [/ence(s)?$/, "ense$1"],
  [/ll(ed|ing|er|ers|ery)$/, "l$1"],
  [/ae/, "e"],
  [/oe/, "e"],
  [/mme(s)?$/, "m$1"],
  [/ey$/, "ay"],
];

export function britishVariants(word: string): string[] {
  const out = new Set<string>();
  for (const [re, rep] of UK_RULES) if (re.test(word)) out.add(word.replace(re, rep));
  // Two changes at once (e.g. "colourised" → "colorized").
  for (const v of [...out]) for (const [re, rep] of UK_RULES) if (re.test(v)) out.add(v.replace(re, rep));
  out.delete(word);
  return [...out];
}

export function isCorrect(sp: NSpell, word: string, british: boolean): boolean {
  if (sp.correct(word)) return true;
  if (british) {
    const lower = word.toLowerCase();
    return britishVariants(lower).some((v) => sp.correct(v) || sp.correct(v[0].toUpperCase() + v.slice(1)));
  }
  return false;
}

/** Returns the words (from a list of distinct words) that are not in the dictionary. */
export async function checkWords(words: string[], british: boolean, yieldEvery = 0): Promise<string[]> {
  const sp = await loadSpeller();
  const bad: string[] = [];
  for (let i = 0; i < words.length; i++) {
    if (!isCorrect(sp, words[i], british)) bad.push(words[i]);
    if (yieldEvery && i % yieldEvery === yieldEvery - 1) await new Promise((r) => setTimeout(r, 0));
  }
  return bad;
}

export async function suggestWord(word: string): Promise<string[]> {
  const sp = await loadSpeller();
  return sp.suggest(word).slice(0, 6);
}
