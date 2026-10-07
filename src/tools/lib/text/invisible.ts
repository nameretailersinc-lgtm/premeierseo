/*
 * Invisible and blank-looking characters: the ones people copy on purpose, and the hidden
 * ones that sneak into pasted text. Notes describe behavior honestly; apps change their rules.
 */

export interface InvisibleChar {
  cp: number;
  name: string;
  /** Short label for the picker. */
  label: string;
  width: "zero" | "space";
  note: string;
}

/** Characters offered for copying, most useful first. */
export const BLANKS: InvisibleChar[] = [
  {
    cp: 0x3164,
    name: "HANGUL FILLER",
    label: "Hangul filler (U+3164)",
    width: "space",
    note: "Looks like a wide blank. The usual choice for blank names and messages, because many apps don't treat it as a space and so don't trim it.",
  },
  {
    cp: 0x2800,
    name: "BRAILLE PATTERN BLANK",
    label: "Braille blank (U+2800)",
    width: "space",
    note: "A Braille cell with no dots. Shows as a space-sized gap and is often accepted in chats and bios where spaces are trimmed.",
  },
  {
    cp: 0x200b,
    name: "ZERO WIDTH SPACE",
    label: "Zero-width space (U+200B)",
    width: "zero",
    note: "Takes up no room at all. Useful for allowing a line break inside long words; many apps strip it from names and empty messages.",
  },
  {
    cp: 0x00a0,
    name: "NO-BREAK SPACE",
    label: "No-break space (U+00A0)",
    width: "space",
    note: "An ordinary-width space that never breaks a line. Most apps treat it as whitespace, so it rarely works on its own as a blank name.",
  },
  {
    cp: 0x2060,
    name: "WORD JOINER",
    label: "Word joiner (U+2060)",
    width: "zero",
    note: "Zero width and prevents a line break. Useful inside text; usually rejected as a name on its own.",
  },
  {
    cp: 0xffa0,
    name: "HALFWIDTH HANGUL FILLER",
    label: "Half-width Hangul filler (U+FFA0)",
    width: "space",
    note: "A narrower relative of U+3164. Worth trying when the full-width filler is blocked.",
  },
];

const HIDDEN_NAMES: Record<number, string> = {
  0x00a0: "No-break space",
  0x00ad: "Soft hyphen",
  0x034f: "Combining grapheme joiner",
  0x061c: "Arabic letter mark",
  0x115f: "Hangul choseong filler",
  0x1160: "Hangul jungseong filler",
  0x17b4: "Khmer vowel inherent AQ",
  0x17b5: "Khmer vowel inherent AA",
  0x180e: "Mongolian vowel separator",
  0x200b: "Zero-width space",
  0x200c: "Zero-width non-joiner",
  0x200d: "Zero-width joiner",
  0x200e: "Left-to-right mark",
  0x200f: "Right-to-left mark",
  0x202a: "Left-to-right embedding",
  0x202b: "Right-to-left embedding",
  0x202c: "Pop directional formatting",
  0x202d: "Left-to-right override",
  0x202e: "Right-to-left override",
  0x202f: "Narrow no-break space",
  0x2060: "Word joiner",
  0x2061: "Function application",
  0x2062: "Invisible times",
  0x2063: "Invisible separator",
  0x2064: "Invisible plus",
  0x2066: "Left-to-right isolate",
  0x2067: "Right-to-left isolate",
  0x2068: "First strong isolate",
  0x2069: "Pop directional isolate",
  0x2800: "Braille pattern blank",
  0x3164: "Hangul filler",
  0xfeff: "Byte order mark (zero-width no-break space)",
  0xffa0: "Half-width Hangul filler",
};

export function hiddenName(cp: number): string | null {
  if (HIDDEN_NAMES[cp]) return HIDDEN_NAMES[cp];
  if (cp >= 0xe0000 && cp <= 0xe007f) return "Tag character (can carry hidden text)";
  if (cp >= 0x206a && cp <= 0x206f) return "Deprecated format character";
  return null;
}

export const hex = (cp: number) => "U+" + cp.toString(16).toUpperCase().padStart(4, "0");

export interface HiddenFound {
  cp: number;
  name: string;
  count: number;
  /** 1-based line numbers where it appears (first five). */
  lines: number[];
}

export interface HiddenOptions {
  /** Treat no-break spaces as hidden characters (they are replaced by normal spaces). */
  includeNbsp: boolean;
  /** Leave a zero-width joiner alone when it sits between two emoji (it is part of the emoji). */
  keepEmojiJoiners: boolean;
}

const PICTO = /\p{Extended_Pictographic}/u;

function isEmojiJoiner(chars: string[], i: number) {
  return chars[i] === "\u200d" && PICTO.test(chars[i - 1] ?? "") && PICTO.test(chars[i + 1] ?? "");
}

export function findHidden(text: string, opts: HiddenOptions): HiddenFound[] {
  const found = new Map<number, HiddenFound>();
  const chars = Array.from(text);
  let line = 1;
  chars.forEach((c, i) => {
    if (c === "\n") line++;
    const cp = c.codePointAt(0)!;
    if ((cp === 0xa0 || cp === 0x202f) && !opts.includeNbsp) return;
    const name = hiddenName(cp);
    if (!name) return;
    if (opts.keepEmojiJoiners && isEmojiJoiner(chars, i)) return;
    const f = found.get(cp) ?? { cp, name, count: 0, lines: [] };
    f.count++;
    if (f.lines.length < 5 && !f.lines.includes(line)) f.lines.push(line);
    found.set(cp, f);
  });
  return [...found.values()].sort((a, b) => b.count - a.count);
}

/** Remove hidden characters; no-break spaces become normal spaces (when included). */
export function removeHidden(text: string, opts: HiddenOptions): string {
  const chars = Array.from(text);
  return chars
    .map((c, i) => {
      const cp = c.codePointAt(0)!;
      if (cp === 0xa0 || cp === 0x202f) return opts.includeNbsp ? " " : c;
      if (!hiddenName(cp)) return c;
      if (opts.keepEmojiJoiners && isEmojiJoiner(chars, i)) return c;
      return "";
    })
    .join("");
}
