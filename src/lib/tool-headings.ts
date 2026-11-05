/**
 * Section headings derived from a tool's name. Names are written as titles ("Word Counter",
 * "Remove Duplicate Lines", "Is It Down? Website Down Checker"), so a single template reads
 * badly for some of them. These helpers pick wording that stays natural for each kind of name.
 */

/** Words that stay capitalised mid-sentence even though they match the Title Case pattern. */
const PROPER_NOUNS = new Set(["Unicode", "Facebook", "Twitter", "Caesar", "Google"]);

/** "Word Counter" → "word counter"; keeps acronyms and codes (PDF, JPG, 50KB, ROT13, .htaccess) and proper nouns. */
export function lcFirst(s: string) {
  return s
    .split(" ")
    .map((w) => (!PROPER_NOUNS.has(w) && /^[A-Z][a-z]+(-[A-Z][a-z]+)*$/.test(w) ? w.toLowerCase() : w))
    .join(" ");
}

const ACTION_VERB = /^(Add|Remove|Find|Sort|Number|Join|Compress|Reduce|Convert|Merge|Split|Rotate|Crop|Resize)\s/;
const NOUN_ENDING = /(Generator|Converter|Checker|Calculator|Tool|Editor|Extractor|Tester|Counter|Picker|Combiner|Scrambler|Translator|Formatter|Minifier|Viewer|Parser|Lookup|Test|Repeater)$/;

/** Names that are actions ("Remove Duplicate Lines") rather than things ("Word Counter"). */
function isAction(name: string) {
  return ACTION_VERB.test(name) && !NOUN_ENDING.test(name);
}

/** Names phrased as a question can't follow "the", so fall back to a neutral phrase. */
function isQuestion(name: string) {
  return name.includes("?");
}

export function howToHeading(name: string) {
  if (isQuestion(name)) return "How to use this tool";
  return isAction(name) ? `How to ${lcFirst(name)}` : `How to use the ${lcFirst(name)}`;
}

export function questionsHeading(name: string) {
  if (isQuestion(name)) return "Questions about this tool";
  return isAction(name) ? `Questions about how to ${lcFirst(name)}` : `Questions about the ${lcFirst(name)}`;
}
