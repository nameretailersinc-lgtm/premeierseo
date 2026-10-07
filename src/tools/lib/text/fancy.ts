/*
 * Unicode "fancy text" styles. Every style is a deterministic character mapping (or a reordering),
 * so the same input always gives the same output. Styles report letters they could not convert.
 */
import { graphemes, splitLines } from "./random";

export interface FancyStyle {
  id: string;
  label: string;
  /** Short note shown under the style (where it breaks, what it does). */
  note?: string;
  convert: (s: string) => string;
  /** Letters/digits with no styled form in this style (left unchanged). */
  missing?: (s: string) => string[];
}

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";

/** Build a mapper for the Mathematical Alphanumeric Symbols block (with the Letterlike exceptions). */
function mathAlpha(upper: number, lower: number, digits: number | null, exceptions: Record<string, string> = {}) {
  const map = new Map<string, string>();
  for (let i = 0; i < 26; i++) {
    map.set(UPPER[i], exceptions[UPPER[i]] ?? String.fromCodePoint(upper + i));
    map.set(LOWER[i], exceptions[LOWER[i]] ?? String.fromCodePoint(lower + i));
  }
  if (digits !== null) for (let i = 0; i < 10; i++) map.set(String(i), String.fromCodePoint(digits + i));
  return map;
}

function fromPairs(from: string, to: string[]): Map<string, string> {
  const m = new Map<string, string>();
  Array.from(from).forEach((c, i) => to[i] && m.set(c, to[i]));
  return m;
}

const mapChars = (m: Map<string, string>) => (s: string) => Array.from(s.normalize("NFC"), (c) => m.get(c) ?? c).join("");
const missingIn =
  (m: Map<string, string>, scope = /[A-Za-z0-9]/) =>
  (s: string) =>
    [...new Set(Array.from(s).filter((c) => scope.test(c) && !m.has(c)))].sort();

export const MAPS = {
  boldSerif: mathAlpha(0x1d400, 0x1d41a, 0x1d7ce),
  italicSerif: mathAlpha(0x1d434, 0x1d44e, null, { h: "ℎ" }),
  boldItalicSerif: mathAlpha(0x1d468, 0x1d482, null),
  sans: mathAlpha(0x1d5a0, 0x1d5ba, 0x1d7e2),
  boldSans: mathAlpha(0x1d5d4, 0x1d5ee, 0x1d7ec),
  italicSans: mathAlpha(0x1d608, 0x1d622, null),
  boldItalicSans: mathAlpha(0x1d63c, 0x1d656, null),
  script: mathAlpha(0x1d49c, 0x1d4b6, null, {
    B: "ℬ", E: "ℰ", F: "ℱ", H: "ℋ", I: "ℐ", L: "ℒ", M: "ℳ", R: "ℛ", e: "ℯ", g: "ℊ", o: "ℴ",
  }),
  boldScript: mathAlpha(0x1d4d0, 0x1d4ea, null),
  fraktur: mathAlpha(0x1d504, 0x1d51e, null, { C: "ℭ", H: "ℌ", I: "ℑ", R: "ℜ", Z: "ℨ" }),
  boldFraktur: mathAlpha(0x1d56c, 0x1d586, null),
  doubleStruck: mathAlpha(0x1d538, 0x1d552, 0x1d7d8, {
    C: "ℂ", H: "ℍ", N: "ℕ", P: "ℙ", Q: "ℚ", R: "ℝ", Z: "ℤ",
  }),
  monospace: mathAlpha(0x1d670, 0x1d68a, 0x1d7f6),
};

const circled = new Map<string, string>();
for (let i = 0; i < 26; i++) {
  circled.set(UPPER[i], String.fromCodePoint(0x24b6 + i));
  circled.set(LOWER[i], String.fromCodePoint(0x24d0 + i));
}
circled.set("0", "⓪");
for (let i = 1; i < 10; i++) circled.set(String(i), String.fromCodePoint(0x2460 + i - 1));

const squared = new Map<string, string>();
for (let i = 0; i < 26; i++) {
  squared.set(UPPER[i], String.fromCodePoint(0x1f130 + i));
  squared.set(LOWER[i], String.fromCodePoint(0x1f130 + i));
}

const fullwidth = new Map<string, string>();
for (let c = 0x21; c <= 0x7e; c++) fullwidth.set(String.fromCharCode(c), String.fromCharCode(c + 0xfee0));
fullwidth.set(" ", "\u3000");

// Small capitals. There is no small-capital Q or X in Unicode: ǫ is the usual stand-in for q; x stays x.
export const SMALL_CAPS = fromPairs(LOWER, "ᴀ ʙ ᴄ ᴅ ᴇ ꜰ ɢ ʜ ɪ ᴊ ᴋ ʟ ᴍ ɴ ᴏ ᴘ ǫ ʀ ꜱ ᴛ ᴜ ᴠ ᴡ x ʏ ᴢ".split(" "));

// Superscript (modifier letters). No superscript q exists in widely supported fonts.
const SUPER_LOWER = fromPairs(LOWER, "ᵃ ᵇ ᶜ ᵈ ᵉ ᶠ ᵍ ʰ ⁱ ʲ ᵏ ˡ ᵐ ⁿ ᵒ ᵖ _ ʳ ˢ ᵗ ᵘ ᵛ ʷ ˣ ʸ ᶻ".split(" ").map((x) => (x === "_" ? "" : x)));
const SUPER_UPPER = fromPairs("ABDEGHIJKLMNOPRTUVW", "ᴬ ᴮ ᴰ ᴱ ᴳ ᴴ ᴵ ᴶ ᴷ ᴸ ᴹ ᴺ ᴼ ᴾ ᴿ ᵀ ᵁ ⱽ ᵂ".split(" "));
const SUPER_OTHER = fromPairs("0123456789+-=()", "⁰ ¹ ² ³ ⁴ ⁵ ⁶ ⁷ ⁸ ⁹ ⁺ ⁻ ⁼ ⁽ ⁾".split(" "));
const SUPER = new Map<string, string>([...SUPER_OTHER, ...SUPER_LOWER, ...SUPER_UPPER]);
// Capitals without a superscript capital fall back to the small superscript letter.
for (const c of UPPER) if (!SUPER.has(c) && SUPER_LOWER.has(c.toLowerCase())) SUPER.set(c, SUPER_LOWER.get(c.toLowerCase())!);

// Subscript: Unicode only has subscript forms for some letters.
const SUB = fromPairs("aehijklmnoprstuvx0123456789+-=()", "ₐ ₑ ₕ ᵢ ⱼ ₖ ₗ ₘ ₙ ₒ ₚ ᵣ ₛ ₜ ᵤ ᵥ ₓ ₀ ₁ ₂ ₃ ₄ ₅ ₆ ₇ ₈ ₉ ₊ ₋ ₌ ₍ ₎".split(" "));
for (const c of UPPER) if (SUB.has(c.toLowerCase())) SUB.set(c, SUB.get(c.toLowerCase())!);

// Upside-down look-alikes (rotated 180°).
export const FLIP = new Map<string, string>([
  ...fromPairs(LOWER, "ɐ q ɔ p ǝ ɟ ƃ ɥ ᴉ ɾ ʞ l ɯ u o d b ɹ s ʇ n ʌ ʍ x ʎ z".split(" ")),
  ...fromPairs(UPPER, "∀ ꓭ Ɔ ꓷ Ǝ Ⅎ ⅁ H I ſ ꓘ ˥ W N O Ԁ Ό ꓤ S ꓕ ∩ Λ M X ⅄ Z".split(" ")),
  ...fromPairs("0123456789", "0 Ɩ ᄅ Ɛ ㄣ ϛ 9 ㄥ 8 6".split(" ")),
  ...fromPairs(".,'\"!?()[]{}<>&_;", "˙ ' , „ ¡ ¿ ) ( ] [ } { > < ⅋ ‾ ؛".split(" ")),
]);

// Horizontal mirror look-alikes; letters that are symmetric or have no mirrored form stay as they are.
const MIRROR = new Map<string, string>([
  ...fromPairs("abcdegkpqrst", "ɒ d ɔ b ɘ ϱ ʞ q p ɿ ꙅ ƚ".split(" ")),
  ...fromPairs("BCDEFJKLNPRSZ", "ᙠ Ɔ ᗡ Ǝ ꟻ Ⴑ ꓘ ⅃ И ꟼ Я Ꙅ Ƹ".split(" ")),
  ...fromPairs("?()[]{}<>", "⸮ ) ( ] [ } { > <".split(" ")),
]);

const reverseGraphemes = (s: string) => graphemes(s).reverse().join("");
const eachLine = (f: (l: string) => string) => (s: string) => splitLines(s).map(f).join("\n");
const combining = (mark: string) => (s: string) => graphemes(s).map((g) => (/\s/.test(g) ? g : g + mark)).join("");

export const STYLES: FancyStyle[] = [
  { id: "bold-serif", label: "Bold (serif)", convert: mapChars(MAPS.boldSerif), missing: missingIn(MAPS.boldSerif) },
  { id: "bold-sans", label: "Bold (sans-serif)", convert: mapChars(MAPS.boldSans), missing: missingIn(MAPS.boldSans) },
  { id: "italic", label: "Italic (serif)", convert: mapChars(MAPS.italicSerif), missing: missingIn(MAPS.italicSerif, /[A-Za-z]/) },
  { id: "bold-italic", label: "Bold italic (serif)", convert: mapChars(MAPS.boldItalicSerif), missing: missingIn(MAPS.boldItalicSerif, /[A-Za-z]/) },
  { id: "italic-sans", label: "Italic (sans-serif)", convert: mapChars(MAPS.italicSans), missing: missingIn(MAPS.italicSans, /[A-Za-z]/) },
  { id: "bold-italic-sans", label: "Bold italic (sans-serif)", convert: mapChars(MAPS.boldItalicSans), missing: missingIn(MAPS.boldItalicSans, /[A-Za-z]/) },
  {
    id: "superscript",
    label: "Tiny text (superscript)",
    note: "Capitals without a superscript form use the small letter.",
    convert: mapChars(SUPER),
    missing: missingIn(SUPER),
  },
  { id: "subscript", label: "Subscript", note: "Unicode has subscript forms for only 17 letters.", convert: mapChars(SUB), missing: missingIn(SUB) },
  {
    id: "small-caps",
    label: "Small caps (capitals kept)",
    convert: mapChars(SMALL_CAPS),
    missing: (s) => [...new Set(Array.from(s).filter((c) => c === "x" || c === "q"))],
  },
  {
    id: "small-caps-all",
    label: "All small caps",
    convert: (s) => mapChars(SMALL_CAPS)(s.toLowerCase()),
    missing: (s) => [...new Set(Array.from(s.toLowerCase()).filter((c) => c === "x" || c === "q"))],
  },
  {
    id: "upside-down",
    label: "Upside down (flipped and reversed)",
    note: "Read it by turning the screen round.",
    convert: eachLine((l) => reverseGraphemes(mapChars(FLIP)(l))),
    missing: missingIn(FLIP),
  },
  { id: "flipped", label: "Flipped only (original order)", convert: mapChars(FLIP), missing: missingIn(FLIP) },
  {
    id: "mirror",
    label: "Mirrored",
    note: "Letters with no mirrored look-alike stay the same.",
    convert: eachLine((l) => reverseGraphemes(mapChars(MIRROR)(l))),
  },
  { id: "reverse", label: "Reversed text", convert: eachLine(reverseGraphemes) },
  {
    id: "reverse-words",
    label: "Reversed word order",
    convert: eachLine((l) => l.split(/(\s+)/).reverse().join("")),
  },
  {
    id: "reverse-each-word",
    label: "Each word reversed",
    convert: (s) => s.split(/(\s+)/).map((w) => (/\s/.test(w) ? w : reverseGraphemes(w))).join(""),
  },
  { id: "reverse-lines", label: "Reversed line order", convert: (s) => splitLines(s).reverse().join("\n") },
  { id: "script", label: "Script", convert: mapChars(MAPS.script), missing: missingIn(MAPS.script, /[A-Za-z]/) },
  { id: "bold-script", label: "Bold script", convert: mapChars(MAPS.boldScript), missing: missingIn(MAPS.boldScript, /[A-Za-z]/) },
  { id: "fraktur", label: "Fraktur (gothic)", convert: mapChars(MAPS.fraktur), missing: missingIn(MAPS.fraktur, /[A-Za-z]/) },
  { id: "bold-fraktur", label: "Bold Fraktur", convert: mapChars(MAPS.boldFraktur), missing: missingIn(MAPS.boldFraktur, /[A-Za-z]/) },
  { id: "double-struck", label: "Double-struck", convert: mapChars(MAPS.doubleStruck), missing: missingIn(MAPS.doubleStruck) },
  { id: "monospace", label: "Monospace", convert: mapChars(MAPS.monospace), missing: missingIn(MAPS.monospace) },
  { id: "circled", label: "Circled", convert: mapChars(circled), missing: missingIn(circled) },
  { id: "squared", label: "Squared", note: "Capital letters only.", convert: mapChars(squared), missing: missingIn(squared, /[A-Za-z]/) },
  { id: "fullwidth", label: "Full width", convert: mapChars(fullwidth) },
  { id: "strikethrough", label: "Strikethrough", note: "Adds U+0336 after each character.", convert: combining("\u0336") },
  { id: "underline", label: "Underlined", note: "Adds U+0332 after each character.", convert: combining("\u0332") },
];

export const STYLE_BY_ID = new Map(STYLES.map((s) => [s.id, s]));

/** Order styles so the landing page's own styles come first. */
export function orderedStyles(primary: string[]): FancyStyle[] {
  const first = primary.map((id) => STYLE_BY_ID.get(id)).filter((s): s is FancyStyle => Boolean(s));
  return [...first, ...STYLES.filter((s) => !primary.includes(s.id))];
}

/** True if the text reads the same backwards, ignoring case, spaces, punctuation and accents. */
export function isPalindrome(s: string): boolean | null {
  const t = s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  if (t.length < 2) return null;
  return t === Array.from(t).reverse().join("");
}

/** Undo upside-down text: map flipped look-alikes back and restore the reading order of each line. */
const UNFLIP = new Map<string, string>();
for (const [k, v] of FLIP) if (k !== v && !UNFLIP.has(v)) UNFLIP.set(v, k);

export function unflip(s: string): string {
  return splitLines(s)
    .map((l) => graphemes(l).reverse().map((g) => UNFLIP.get(g) ?? g).join(""))
    .join("\n");
}

/** True if the text contains characters that only appear in upside-down text. */
export function looksFlipped(s: string): boolean {
  let hits = 0;
  for (const c of Array.from(s)) if (UNFLIP.has(c) && !/[a-z0-9]/i.test(c)) hits++;
  return hits >= 2;
}
