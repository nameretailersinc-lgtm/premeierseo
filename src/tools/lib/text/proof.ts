/*
 * Rule-based proofreading checks (punctuation, a small grammar rule set, style hints).
 * Every rule is listed in RULES with what it looks for, so the page can show exactly what is and
 * isn't checked. Hints are heuristics that are often but not always right; they are labelled.
 * Spelling issues come from the Hunspell dictionary (spell-client) and are merged by the widget.
 */
import { passiveHints, sentences, words } from "./prose";
import { WORDY } from "./plain-english";

export type IssueCategory = "spelling" | "grammar" | "punctuation" | "style";
export type PunctGroup = "commas" | "apostrophes" | "spacing" | "quotes" | "endings";

export interface Issue {
  rule: string;
  category: IssueCategory;
  start: number;
  end: number;
  message: string;
  replacements: string[];
  /** Heuristic: often right, sometimes wrong. */
  hint?: boolean;
}

export interface RuleInfo {
  id: string;
  name: string;
  category: IssueCategory;
  group?: PunctGroup;
  hint?: boolean;
  /** Safe to apply without reading (only spacing fixes). */
  autofix?: boolean;
  description: string;
}

export const RULES: RuleInfo[] = [
  { id: "double-space", name: "Double spaces", category: "punctuation", group: "spacing", autofix: true, description: "Two or more spaces between words or after punctuation." },
  { id: "space-before", name: "Space before punctuation", category: "punctuation", group: "spacing", autofix: true, description: "A space before , . ; : ! or ? (“word ,” → “word,”)." },
  { id: "space-after", name: "Missing space after punctuation", category: "punctuation", group: "spacing", description: "A letter straight after , ; ! ? or a full stop that ends a word (“end.Next”). Numbers, URLs and abbreviations such as U.S. are skipped." },
  { id: "bracket-space", name: "Space inside brackets", category: "punctuation", group: "spacing", hint: true, description: "A space after ( or before ) (“( text )”)." },
  { id: "repeated-punct", name: "Repeated punctuation", category: "punctuation", group: "endings", description: "Doubled commas, semicolons or colons, two full stops, or !!/?? (fine in chat, not in formal writing)." },
  { id: "capital-start", name: "Capital letter after a sentence ends", category: "punctuation", group: "endings", description: "A lowercase word after . ! or ?, or at the start of a paragraph. Abbreviations (e.g., etc., Mr.) and ellipses are skipped." },
  { id: "end-punct", name: "Missing end punctuation", category: "punctuation", group: "endings", hint: true, description: "A paragraph of 12 or more words that doesn't end with . ! ? or a closing quote." },
  { id: "lowercase-i", name: "Lowercase “i”", category: "grammar", group: "endings", description: "The pronoun I written as i (including i'm, i've, i'll, i'd)." },
  { id: "brackets", name: "Unmatched brackets", category: "punctuation", group: "quotes", description: "An opening ( [ { without a closing one in the same paragraph, or the reverse. Smileys and list markers like 1) are skipped." },
  { id: "quotes", name: "Unmatched quotation marks", category: "punctuation", group: "quotes", description: "An odd number of straight double quotes in a paragraph, or curly “ and ” that don't pair up." },
  { id: "comma-splice", name: "Possible comma splice", category: "punctuation", group: "commas", hint: true, description: "A comma followed by a pronoun and a verb (“It's late, we should go”), which often joins two sentences that need a full stop, semicolon or conjunction." },
  { id: "however", name: "“However” joining two sentences", category: "punctuation", group: "commas", hint: true, description: "“, however” in the middle of a sentence without a comma after it; when it joins two sentences it needs a semicolon before it." },
  { id: "intro-comma", name: "Comma after an introductory word", category: "punctuation", group: "commas", hint: true, description: "A sentence starting with However, Therefore, Moreover, Furthermore, Nevertheless, Consequently, Meanwhile, Unfortunately or Fortunately without a comma after it." },
  { id: "its", name: "its / it's", category: "grammar", group: "apostrophes", description: "“its” before words that need “it is/has” (its a, its been, its not) and “it's own” (should be “its own”)." },
  { id: "plural-apostrophe", name: "Apostrophe in a plural", category: "punctuation", group: "apostrophes", hint: true, description: "Decades and numbers with 's (1990's → 1990s)." },
  { id: "lets", name: "lets / let's", category: "grammar", group: "apostrophes", description: "“lets go”, “lets see” and similar suggestions, which need “let's”." },
  { id: "your", name: "your / you're", category: "grammar", group: "apostrophes", description: "“your welcome” (always “you're welcome”); “your going”, “your right” and similar are flagged as hints." },
  { id: "a-an", name: "a / an", category: "grammar", description: "“a” before a vowel sound or “an” before a consonant sound, judged from spelling with exceptions (an hour, a university, a one-off)." },
  { id: "repeated-word", name: "Repeated word", category: "grammar", description: "The same word twice in a row (“the the”). “had had” and “that that” are flagged as hints because they can be correct." },
  { id: "have-of", name: "could of / should of", category: "grammar", description: "could of, should of, would of, must of, might of → have." },
  { id: "than-then", name: "than / then", category: "grammar", description: "“then” after a comparative (more then, better then, rather then)." },
  { id: "there-their", name: "there / their", category: "grammar", description: "“their is/are/was/were” → “there”." },
  { id: "agreement", name: "Subject–verb agreement", category: "grammar", description: "he/she/it don't, you/we/they was, he/she/it have (outside questions)." },
  { id: "common-errors", name: "Common word errors", category: "grammar", description: "alot → a lot, irregardless → regardless, could care less (hint), less + plural count nouns (hint)." },
  { id: "wordy", name: "Wordy phrase", category: "style", hint: true, description: "Phrases with a shorter equivalent (in order to → to, due to the fact that → because), from the same list as the sentence rewriter." },
  { id: "passive", name: "Passive voice", category: "style", hint: true, description: "A form of “be” followed by a past participle (was written, are made). Passive isn't wrong; the hint helps you check who does what." },
  { id: "long-sentence", name: "Long sentence", category: "style", hint: true, description: "Sentences longer than 30 words, which are harder to follow." },
];

export const RULE_BY_ID = new Map(RULES.map((r) => [r.id, r]));

const MASK_RE = /\bhttps?:\/\/\S+|\bwww\.\S+|[\w.+-]+@[\w-]+\.[\w.-]+|\b[\w-]+\.(?:com|org|net|io|dev|co|uk|gov|edu|html?|php|js|css|txt|pdf|png|jpe?g)\b\S*|`[^`\n]*`/gi;
const mask = (t: string) => t.replace(MASK_RE, (m) => "\u0001".repeat(m.length));

const ABBREV = new Set("mr mrs ms dr prof sr jr st vs etc e.g i.e cf al fig no vol approx inc ltd co corp jan feb mar apr jun jul aug sep sept oct nov dec a.m p.m u.s u.k ph.d".split(" "));
const capFirst = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
const keepCase = (orig: string, rep: string) => (orig && /^\p{Lu}/u.test(orig) ? capFirst(rep) : rep);

/* a / an exceptions (by sound, not spelling). */
const AN_CONSONANT_START = /^(?:hour|honest|honor|honour|heir|herb(?!al)|homage)/i;
const A_VOWEL_START = /^(?:uni(?!nt|mp|nh|nst|nd|nf|nl|nk|nv|nc|ns)|use|usu|ura|uro|ure|uti|euro|eu|ewe|one|once|ubiq|ufo|ukr|ute)/i;

function aAnIssue(article: string, next: string): string | null {
  const w = next.replace(/^["“‘'(]/, "");
  if (!/^\p{L}/u.test(w)) return null;
  if (/^\p{Lu}{2,}/u.test(w)) return null; // acronyms: a NASA / an FBI — judged by letter names, skipped
  const vowelLetter = /^[aeiou]/i.test(w);
  let vowelSound = vowelLetter;
  if (vowelLetter && A_VOWEL_START.test(w)) vowelSound = false;
  if (!vowelLetter && AN_CONSONANT_START.test(w)) vowelSound = true;
  const isAn = article.toLowerCase() === "an";
  if (isAn && !vowelSound) return keepCase(article, "a");
  if (!isAn && vowelSound) return keepCase(article, "an");
  return null;
}

function push(out: Issue[], rule: string, start: number, end: number, message: string, replacements: string[] = []) {
  const info = RULE_BY_ID.get(rule)!;
  out.push({ rule, category: info.category, start, end, message, replacements, hint: info.hint });
}

export interface CheckOptions {
  categories: IssueCategory[];
  /** Only rules in these punctuation groups (punctuation checker). Omit for every rule in the categories. */
  groups?: PunctGroup[];
}

export function checkText(text: string, o: CheckOptions): Issue[] {
  const t = mask(text);
  const out: Issue[] = [];
  const want = (rule: string) => {
    const r = RULE_BY_ID.get(rule)!;
    if (!o.categories.includes(r.category)) return false;
    if (o.groups) return Boolean(r.group && o.groups.includes(r.group));
    return true;
  };
  let m: RegExpExecArray | null;
  const all = (re: RegExp, fn: (m: RegExpExecArray) => void) => {
    re.lastIndex = 0;
    while ((m = re.exec(t))) {
      fn(m);
      if (m[0] === "") re.lastIndex++;
    }
  };

  /* ---- spacing ---- */
  if (want("double-space"))
    all(/(?<=[^\s\u0001]) {2,}(?=[^\s])/g, (m) => push(out, "double-space", m.index, m.index + m[0].length, "Two or more spaces in a row. Use one.", [" "]));
  if (want("space-before"))
    all(/(?<=[\p{L}\p{N}"”')\]]) +([,;:!?]|\.(?!\.)(?=\s|$))/gu, (m) =>
      push(out, "space-before", m.index, m.index + m[0].length, `Remove the space before “${m[1]}”.`, [m[1]]),
    );
  if (want("space-after")) {
    all(/([,;!?])(?=[\p{L}])/gu, (m) => {
      if (m[1] === "?" && /[!?]/.test(t[m.index - 1] ?? "")) return;
      push(out, "space-after", m.index, m.index + 1, `Add a space after “${m[1]}”.`, [`${m[1]} `]);
    });
    all(/(?<=\b\p{Ll}{2,})\.(?=\p{Lu}\p{Ll})/gu, (m) => push(out, "space-after", m.index, m.index + 1, "Add a space after the full stop.", [". "]));
  }
  if (want("bracket-space"))
    all(/\((?=[ ]+\S)[ ]+|(?<=\S)[ ]+\)/g, (m) =>
      push(out, "bracket-space", m.index, m.index + m[0].length, "Brackets don't normally have spaces inside them.", [m[0].trim()]),
    );

  /* ---- repeated punctuation ---- */
  if (want("repeated-punct")) {
    all(/([,;:])\1+/g, (m) => push(out, "repeated-punct", m.index, m.index + m[0].length, `“${m[1]}” is repeated.`, [m[1]]));
    all(/(?<!\.)\.\.(?!\.)/g, (m) => push(out, "repeated-punct", m.index, m.index + 2, "Two full stops. Use one, or three for an ellipsis.", [".", "..."]));
    all(/[!?]{2,}/g, (m) => {
      if (m[0] === "?!" || m[0] === "!?") return;
      push(out, "repeated-punct", m.index, m.index + m[0].length, "Repeated ! or ? reads as informal. Use one in formal writing.", [m[0][0]]);
    });
  }

  /* ---- capitals ---- */
  if (want("capital-start")) {
    all(/([.!?])(["”’')\]]?)(\s+)(\p{Ll}[\p{L}'’-]*)/gu, (m) => {
      const word = m[4];
      if (/\p{Lu}/u.test(word.slice(1))) return; // iPhone, eBay
      if (m[1] === "." && t[m.index - 1] === ".") return; // ellipsis
      const before = t.slice(Math.max(0, m.index - 10), m.index);
      const tok = (before.match(/([\p{L}.]+)$/u)?.[1] ?? "").toLowerCase();
      if (m[1] === "." && (ABBREV.has(tok) || ABBREV.has(tok.replace(/\.$/, "")) || /^\p{L}$/u.test(tok) || /\./.test(tok))) return;
      if (m[1] === "." && /\d$/.test(before)) return; // "p. 4. see" style references
      const s = m.index + m[1].length + m[2].length + m[3].length;
      push(out, "capital-start", s, s + word.length, "Start a new sentence with a capital letter.", [capFirst(word)]);
    });
    all(/(?:^|\n[ \t]*\n)[ \t]*(\p{Ll}[\p{L}'’-]*)(?=[^\n]*(?:\s+\S+){5})/gu, (m) => {
      const word = m[1];
      if (/\p{Lu}/u.test(word.slice(1)) || word === "i") return;
      const s = m.index + m[0].length - word.length;
      push(out, "capital-start", s, s + word.length, "Start the paragraph with a capital letter.", [capFirst(word)]);
    });
  }
  if (want("lowercase-i"))
    all(/(?<![\p{L}\p{N}'’\-\u0001.])i(?=(?:['’](?:m|ve|ll|d))?(?![\p{L}\p{N}'’\-]))/gu, (m) => {
      if (/[.]/.test(t[m.index + 1] ?? "")) return; // "i.e."
      push(out, "lowercase-i", m.index, m.index + 1, "The pronoun I is always a capital letter.", ["I"]);
    });

  /* ---- paragraphs: brackets, quotes, end punctuation ---- */
  const paraRe = /[^\n]+(?:\n(?![ \t]*\n)[^\n]*)*/g;
  for (const pm of t.matchAll(paraRe)) {
    const p = pm[0];
    const base = pm.index ?? 0;
    if (want("brackets")) {
      const stack: { ch: string; i: number }[] = [];
      const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
      for (let i = 0; i < p.length; i++) {
        const ch = p[i];
        if (ch === "(" || ch === "[" || ch === "{") stack.push({ ch, i });
        else if (ch === ")" || ch === "]" || ch === "}") {
          if (ch === ")" && /[:;=8]-?$/.test(p.slice(Math.max(0, i - 2), i))) continue; // :) ;-)
          if (ch === ")" && /(?:^|\n)[ \t]*[\p{L}\p{N}]{1,3}$/u.test(p.slice(0, i))) continue; // 1) a) list markers
          if (stack.length && stack[stack.length - 1].ch === pairs[ch]) stack.pop();
          else push(out, "brackets", base + i, base + i + 1, `This “${ch}” has no matching “${pairs[ch]}”.`);
        }
      }
      for (const s of stack) push(out, "brackets", base + s.i, base + s.i + 1, `This “${s.ch}” is never closed.`);
    }
    if (want("quotes")) {
      const straight = [...p.matchAll(/"/g)].map((x) => x.index ?? 0);
      if (straight.length % 2 === 1) {
        const i = straight[straight.length - 1];
        push(out, "quotes", base + i, base + i + 1, "Odd number of double quotes in this paragraph: one is never closed.");
      }
      let depth = 0;
      let lastOpen = -1;
      for (let i = 0; i < p.length; i++) {
        if (p[i] === "“") {
          if (depth > 0) push(out, "quotes", base + lastOpen, base + lastOpen + 1, "“ opened again before the earlier quotation was closed.");
          depth = 1;
          lastOpen = i;
        } else if (p[i] === "”") {
          if (depth === 0) push(out, "quotes", base + i, base + i + 1, "Closing ” without an opening “.");
          depth = 0;
        }
      }
      if (depth > 0) push(out, "quotes", base + lastOpen, base + lastOpen + 1, "This “ is never closed.");
    }
    if (want("end-punct")) {
      const trimmed = p.trimEnd();
      if (words(trimmed).length >= 12 && /\p{L}/u.test(trimmed) && !/[.!?:;"”’')\]…\u0001]$/u.test(trimmed) && !/^\s*[-*•\d]/.test(trimmed)) {
        const e = base + trimmed.length;
        push(out, "end-punct", e - 1, e, "This paragraph doesn't end with a full stop, question mark or exclamation mark.");
      }
    }
  }

  /* ---- commas ---- */
  if (want("comma-splice")) {
    for (const s of sentences(t)) {
      const re = /, (I|you|he|she|it|we|they|this|there)\s+(am|is|are|was|were|has|have|had|will|would|can|could|should|do|does|did|isn't|wasn't|aren't|weren't|don't|doesn't|didn't|won't|can't|needs?|wants?|seems?|looks?|feels?|makes?|goes|went|got|gets|know|knows|think|thinks)\b/gi;
      for (const mm of s.text.matchAll(re)) {
        const before = s.text.slice(0, mm.index ?? 0).toLowerCase();
        if (/\b(if|when|whenever|because|although|though|while|since|after|before|unless|as|whereas|once|until|so that|even if|whether|where)\b/.test(before)) continue;
        if (/\b(said|says|asked|told|thought|replied)$/.test(before.trim())) continue;
        const st = s.start + (mm.index ?? 0);
        push(out, "comma-splice", st, st + 1, "Possible comma splice: if both sides are complete sentences, use a full stop or semicolon, or add and/but/so after the comma.", [".", ";", ", and"]);
      }
    }
  }
  if (want("however"))
    all(/, however (?!,)(?=\p{L})/gu, (m) =>
      push(out, "however", m.index, m.index + 10, "If “however” joins two complete sentences, use a semicolon before it and a comma after it.", ["; however,"]),
    );
  if (want("intro-comma"))
    for (const s of sentences(t)) {
      const mm = s.text.match(/^(However|Therefore|Moreover|Furthermore|Nevertheless|Nonetheless|Consequently|Meanwhile|Unfortunately|Fortunately)\s+(?=[\p{L}])/u);
      if (mm) push(out, "intro-comma", s.start, s.start + mm[1].length, `Add a comma after “${mm[1]}” at the start of a sentence.`, [`${mm[1]},`]);
    }

  /* ---- apostrophes ---- */
  if (want("its")) {
    all(/\b(its)\s+(?=(a|an|the|been|not|going|being|very|so|too|just|also|really|still|time|true|important|easy|hard|okay|ok|clear|possible|likely|my|your|our|their|raining|getting|almost)\b)/gi, (m) =>
      push(out, "its", m.index, m.index + 3, "“its” means “belonging to it”. For “it is” or “it has”, write “it's”.", [keepCase(m[1], "it's")]),
    );
    all(/\b(it['’]s)\s+own\b/gi, (m) => push(out, "its", m.index, m.index + m[1].length, "“it's” means “it is”. For possession write “its own”.", [keepCase(m[1], "its")]));
  }
  if (want("plural-apostrophe"))
    all(/\b(\d{2,4})['’]s\b/g, (m) => push(out, "plural-apostrophe", m.index, m.index + m[0].length, "Plurals of numbers and decades don't need an apostrophe.", [`${m[1]}s`]));
  if (want("lets"))
    all(/\b(lets)\s+(?=(go|see|start|try|make|get|do|talk|take|look|begin|hope|say|meet|find|move|keep|play|eat|work|be|not|discuss|review|check|dive|stop|face|focus)\b)/gi, (m) =>
      push(out, "lets", m.index, m.index + 4, "For a suggestion (let us), write “let's”.", [keepCase(m[1], "let's")]),
    );
  if (want("your"))
    all(/\b(your)\s+(welcome|going|doing|being|getting|making|right|not|so|too|very|always|never)\b/gi, (m) => {
      const sure = m[2].toLowerCase() === "welcome";
      out.push({
        rule: "your",
        category: "grammar",
        start: m.index,
        end: m.index + 4,
        message: sure ? "“your” is possessive. Write “you're welcome”." : "If you mean “you are”, write “you're”.",
        replacements: [keepCase(m[1], "you're")],
        hint: !sure,
      });
    });

  /* ---- grammar ---- */
  if (want("a-an"))
    all(/\b(a|an)\s+([\p{L}"“‘'(][\p{L}'’-]*)/giu, (m) => {
      const fix = aAnIssue(m[1], m[2]);
      if (fix) push(out, "a-an", m.index, m.index + m[1].length, fix.toLowerCase() === "an" ? `Use “an” before a vowel sound (“an ${m[2]}”).` : `Use “a” before a consonant sound (“a ${m[2]}”).`, [fix]);
    });
  if (want("repeated-word"))
    all(/\b([\p{L}']+)\s+\1\b/giu, (m) => {
      const w = m[1].toLowerCase();
      if (!/\p{L}/u.test(w) || ["bye", "ha", "no", "so", "very", "really", "many", "knock", "tut", "chop", "bora", "pom"].includes(w)) return;
      const hint = w === "had" || w === "that" || w === "is";
      out.push({ rule: "repeated-word", category: "grammar", start: m.index, end: m.index + m[0].length, message: hint ? `“${m[1]} ${m[1]}” can be correct; check the sentence.` : `“${m[1]}” is repeated.`, replacements: [m[1]], hint });
    });
  if (want("have-of"))
    all(/\b(could|should|would|must|might)\s+(of)\b/gi, (m) => {
      const s = m.index + m[0].length - 2;
      push(out, "have-of", s, s + 2, `“${m[1]} of” is a mishearing of “${m[1]}'ve”. Write “${m[1]} have”.`, ["have"]);
    });
  if (want("than-then"))
    all(/\b(more|less|better|worse|rather|other|greater|fewer|bigger|smaller|faster|slower|higher|lower|larger|older|younger|cheaper|easier|harder|longer|shorter)\s+(then)\b/gi, (m) => {
      const s = m.index + m[0].length - 4;
      push(out, "than-then", s, s + 4, "Use “than” for comparisons; “then” is about time.", [keepCase(m[2], "than")]);
    });
  if (want("there-their"))
    all(/\b(their)\s+(is|are|was|were)\b/gi, (m) => push(out, "there-their", m.index, m.index + 5, "“their” means “belonging to them”. For “there is/are”, write “there”.", [keepCase(m[1], "there")]));
  if (want("agreement")) {
    all(/\b(he|she|it)\s+(don't|dont)\b/gi, (m) => {
      const s = m.index + m[1].length + 1;
      push(out, "agreement", s, s + m[2].length, `With “${m[1]}”, use “doesn't”.`, ["doesn't"]);
    });
    all(/\b(you|we|they)\s+(was)\b/gi, (m) => {
      const s = m.index + m[0].length - 3;
      push(out, "agreement", s, s + 3, `With “${m[1]}”, use “were”.`, ["were"]);
    });
    all(/(?<!\b(?:does|did|do|will|would|can|could|should|might|may|must|to|let|make|help|why|how|where|when|if)\s)\b(he|she|it)\s+(have)\b(?!\s+to\b)/gi, (m) => {
      const s = m.index + m[0].length - 4;
      push(out, "agreement", s, s + 4, `With “${m[1]}”, use “has”.`, ["has"]);
    });
  }
  if (want("common-errors")) {
    all(/\balot\b/gi, (m) => push(out, "common-errors", m.index, m.index + 4, "“a lot” is two words.", [keepCase(m[0], "a lot")]));
    all(/\birregardless\b/gi, (m) => push(out, "common-errors", m.index, m.index + m[0].length, "Use “regardless”; “irregardless” is non-standard.", [keepCase(m[0], "regardless")]));
    all(/\bcould care less\b/gi, (m) =>
      out.push({ rule: "common-errors", category: "grammar", start: m.index, end: m.index + m[0].length, message: "The standard idiom is “couldn't care less”.", replacements: ["couldn't care less"], hint: true }),
    );
    all(/\b(less)\s+(people|items|words|mistakes|errors|cars|calories|students|employees|users|things|times|days|hours|books|options)\b/gi, (m) =>
      out.push({ rule: "common-errors", category: "grammar", start: m.index, end: m.index + 4, message: "Use “fewer” with things you can count.", replacements: [keepCase(m[1], "fewer")], hint: true }),
    );
  }

  /* ---- style ---- */
  if (want("wordy"))
    for (const w of WORDY) {
      w.re.lastIndex = 0;
      for (const mm of t.matchAll(w.re)) {
        const rep = w.replacement ? keepCase(mm[0], w.replacement) : "";
        push(out, "wordy", mm.index ?? 0, (mm.index ?? 0) + mm[0].length, w.replacement ? `Shorter: “${w.replacement}”.` : "Usually adds nothing; consider deleting it.", w.replacement ? [rep] : [""]);
      }
    }
  if (want("passive")) for (const p of passiveHints(t)) push(out, "passive", p.start, p.end, "Possible passive voice. Consider saying who does the action.");
  if (want("long-sentence"))
    for (const s of sentences(t)) {
      const n = words(s.text).length;
      if (n > 30) push(out, "long-sentence", s.start, s.end, `Long sentence (${n} words). Consider splitting it.`);
    }

  // Sort and drop exact duplicates (same rule, same span).
  const seen = new Set<string>();
  return out
    .filter((i) => {
      const k = `${i.rule}:${i.start}:${i.end}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => a.start - b.start || a.end - b.end);
}

/** Apply one replacement to the text. */
export function applyFix(text: string, issue: Pick<Issue, "start" | "end">, replacement: string): string {
  const rep = replacement;
  let end = issue.end;
  // Deleting a phrase: also remove one adjacent space, and capitalise the next word at a sentence start.
  if (rep === "") {
    if (text[end] === " ") end++;
    const atStart = issue.start === 0 || /[.!?]\s*$|\n\s*$/.test(text.slice(0, issue.start));
    if (atStart) {
      const rest = text.slice(end);
      return text.slice(0, issue.start) + rest.charAt(0).toUpperCase() + rest.slice(1);
    }
  }
  return text.slice(0, issue.start) + rep + text.slice(end);
}

/** Apply every safe (autofix) spacing fix at once, right to left so offsets stay valid. */
export function applySafeFixes(text: string, issues: Issue[]): { text: string; count: number } {
  const safe = issues.filter((i) => RULE_BY_ID.get(i.rule)?.autofix && i.replacements.length).sort((a, b) => b.start - a.start);
  let out = text;
  let lastStart = Infinity;
  let count = 0;
  for (const i of safe) {
    if (i.end > lastStart) continue; // overlapping
    out = out.slice(0, i.start) + i.replacements[0] + out.slice(i.end);
    lastStart = i.start;
    count++;
  }
  return { text: out, count };
}
