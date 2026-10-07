/*
 * International Morse code (ITU-R M.1677-1). Letters are separated by one space,
 * words by " / ". Decoding accepts ".", "-" and common look-alikes (•, ·, −, –, —, _).
 */

export const MORSE: Record<string, string> = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....", I: "..", J: ".---",
  K: "-.-", L: ".-..", M: "--", N: "-.", O: "---", P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-",
  U: "..-", V: "...-", W: ".--", X: "-..-", Y: "-.--", Z: "--..",
  "0": "-----", "1": ".----", "2": "..---", "3": "...--", "4": "....-", "5": ".....", "6": "-....", "7": "--...", "8": "---..", "9": "----.",
  ".": ".-.-.-", ",": "--..--", "?": "..--..", "'": ".----.", "!": "-.-.--", "/": "-..-.", "(": "-.--.", ")": "-.--.-",
  "&": ".-...", ":": "---...", ";": "-.-.-.", "=": "-...-", "+": ".-.-.", "-": "-....-", _: "..--.-", '"': ".-..-.", $: "...-..-", "@": ".--.-.",
};

/** Procedural signals, sent as one run without letter gaps. */
export const PROSIGNS: Record<string, { code: string; meaning: string }> = {
  SOS: { code: "...---...", meaning: "Distress signal" },
  AR: { code: ".-.-.", meaning: "End of message" },
  SK: { code: "...-.-", meaning: "End of contact" },
  BT: { code: "-...-", meaning: "Break / new paragraph" },
  KN: { code: "-.--.", meaning: "Go ahead, named station only" },
  AS: { code: ".-...", meaning: "Wait" },
};

const DECODE = new Map(Object.entries(MORSE).map(([k, v]) => [v, k]));
DECODE.set("...---...", "SOS");

const ALIASES: Record<string, string> = { "•": ".", "·": ".", "*": ".", "−": "-", "–": "-", "—": "-", _: "-" };

export interface MorseResult {
  output: string;
  unknown: string[];
}

export function textToMorse(text: string): MorseResult {
  const unknown = new Set<string>();
  const words = text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .split(/\s+/)
    .filter(Boolean);
  const out = words.map((w) => {
    // <SOS> style prosigns in angle brackets are sent as one run.
    const pro = /^<([A-Z]{2,3})>$/.exec(w);
    if (pro && PROSIGNS[pro[1]]) return PROSIGNS[pro[1]].code;
    return Array.from(w)
      .map((c) => {
        const code = MORSE[c];
        if (!code) unknown.add(c);
        return code ?? "#";
      })
      .join(" ");
  });
  return { output: out.join(" / "), unknown: [...unknown] };
}

/** Looks like Morse: only dots, dashes, separators and spaces. */
export function looksLikeMorse(s: string): boolean {
  return /[.\-•·−–—_]/.test(s) && /^[\s.\-•·*−–—_/|]+$/.test(s);
}

export function morseToText(code: string): MorseResult {
  const unknown = new Set<string>();
  const cleaned = Array.from(code, (c) => ALIASES[c] ?? c).join("");
  const words = cleaned
    .trim()
    .split(/\s*[/|]\s*|\s{3,}|\n+/)
    .filter((w) => w.trim());
  const out = words.map((w) =>
    w
      .trim()
      .split(/\s+/)
      .map((l) => {
        const t = DECODE.get(l);
        if (!t) unknown.add(l);
        return t ?? "#";
      })
      .join(""),
  );
  return { output: out.join(" "), unknown: [...unknown] };
}

export interface ToneEvent {
  on: boolean;
  /** Duration in dot units (before Farnsworth stretching of gaps). */
  units: number;
  gap?: "intra" | "letter" | "word";
}

/**
 * Timing in "dot units": dot 1, dash 3, gap inside a letter 1, between letters 3, between words 7 (PARIS standard).
 * Farnsworth: characters are sent at `charWpm`, gaps between letters and words are stretched so the overall
 * speed is `effWpm` (ARRL formula: ta = (60c − 37.2s) / (s·c) seconds of extra delay per standard word).
 */
export function morseSchedule(code: string, charWpm: number, effWpm = charWpm) {
  const dot = 1.2 / charWpm; // seconds
  const s = Math.min(effWpm, charWpm);
  const ta = s < charWpm ? (60 * charWpm - 37.2 * s) / (s * charWpm) : 0;
  const letterGap = s < charWpm ? (3 * ta) / 19 : 3 * dot;
  const wordGap = s < charWpm ? (7 * ta) / 19 : 7 * dot;
  const tones: { start: number; dur: number }[] = [];
  let t = 0;
  const words = code.trim().split(/\s*\/\s*/);
  words.forEach((w, wi) => {
    if (wi > 0) t += wordGap - dot; // the previous element already added one dot of gap
    w.split(/\s+/).forEach((letter, li) => {
      if (li > 0) t += letterGap - dot;
      for (const sym of letter) {
        if (sym !== "." && sym !== "-") continue;
        const dur = sym === "." ? dot : 3 * dot;
        tones.push({ start: t, dur });
        t += dur + dot;
      }
    });
  });
  return { tones, total: t };
}
