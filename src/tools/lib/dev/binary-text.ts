/*
 * Text ↔ binary engine. Encoding uses UTF-8 bytes (or 7/8-bit ASCII); decoding is tolerant of
 * spaces, commas, new lines, missing separators and 7-bit groups. Pure functions.
 */

export type Sep = "space" | "none" | "comma" | "newline";
export const SEP: Record<Sep, string> = { space: " ", none: "", comma: ", ", newline: "\n" };

export interface CharRow {
  char: string;
  codePoint: number;
  bytes: number[];
}

export interface EncodeResult {
  output: string;
  rows: CharRow[];
  error?: string;
  byteCount: number;
}

const enc = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;

export function charLabel(ch: string): string {
  const cp = ch.codePointAt(0) ?? 0;
  if (cp < 32 || cp === 127) return CONTROL_NAMES[cp === 127 ? 32 : cp] ?? "control";
  if (ch === " ") return "space";
  return ch;
}

export const CONTROL_NAMES = [
  "NUL", "SOH", "STX", "ETX", "EOT", "ENQ", "ACK", "BEL", "BS", "TAB", "LF (new line)", "VT", "FF", "CR (carriage return)", "SO", "SI",
  "DLE", "DC1", "DC2", "DC3", "DC4", "NAK", "SYN", "ETB", "CAN", "EM", "SUB", "ESC", "FS", "GS", "RS", "US", "DEL",
];

export const CONTROL_DESCRIPTIONS: Record<number, string> = {
  0: "Null", 1: "Start of heading", 2: "Start of text", 3: "End of text", 4: "End of transmission", 5: "Enquiry", 6: "Acknowledge", 7: "Bell",
  8: "Backspace", 9: "Horizontal tab", 10: "Line feed (new line)", 11: "Vertical tab", 12: "Form feed", 13: "Carriage return", 14: "Shift out", 15: "Shift in",
  16: "Data link escape", 17: "Device control 1 (XON)", 18: "Device control 2", 19: "Device control 3 (XOFF)", 20: "Device control 4", 21: "Negative acknowledge",
  22: "Synchronous idle", 23: "End of transmission block", 24: "Cancel", 25: "End of medium", 26: "Substitute", 27: "Escape", 28: "File separator",
  29: "Group separator", 30: "Record separator", 31: "Unit separator", 127: "Delete",
};

export function utf8Bytes(ch: string): number[] {
  if (enc) return Array.from(enc.encode(ch));
  return Array.from(Buffer.from(ch, "utf8"));
}

/** Encode text to binary. `encoding` "ascii" rejects characters above 127; bits 7 or 8 (ASCII only). */
export function encodeText(text: string, opts: { encoding: "utf8" | "ascii"; bits: 7 | 8; sep: Sep; prefix?: boolean }): EncodeResult {
  const rows: CharRow[] = [];
  const out: string[] = [];
  const bad: string[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    let bytes: number[];
    if (opts.encoding === "ascii") {
      if (cp > 127) {
        if (!bad.includes(ch) && bad.length < 5) bad.push(ch);
        continue;
      }
      bytes = [cp];
    } else bytes = utf8Bytes(ch);
    rows.push({ char: ch, codePoint: cp, bytes });
    const width = opts.encoding === "ascii" ? opts.bits : 8;
    for (const b of bytes) out.push((opts.prefix ? "0b" : "") + b.toString(2).padStart(width, "0"));
  }
  if (bad.length)
    return {
      output: "",
      rows: [],
      byteCount: 0,
      error: `${bad.map((c) => `“${c}”`).join(", ")} ${bad.length === 1 ? "isn't an ASCII character" : "aren't ASCII characters"} (ASCII covers codes 0–127). Switch Encoding to UTF-8 to convert ${bad.length === 1 ? "it" : "them"}.`,
    };
  return { output: out.join(SEP[opts.sep]), rows, byteCount: out.length };
}

export interface ByteRow {
  bits: string;
  value: number;
  char: string;
  /** Index of the character this byte starts (UTF-8 multi-byte sequences span several rows). */
  note?: string;
}

export interface DecodeResult {
  text: string;
  bytes: number[];
  rows: ByteRow[];
  groupsBits: string[];
  warnings: string[];
  error?: string;
  width: number;
}

/**
 * Split binary input into byte groups. Separators (spaces, commas, new lines, tabs, "|", "-")
 * define groups; a run without separators is split every `width` bits.
 */
export function splitBinary(input: string, bitsOpt: "auto" | 7 | 8): { groups: string[]; width: number; warnings: string[]; error?: string } {
  const warnings: string[] = [];
  const cleaned = input.replace(/0b(?=[01])/gi, " ").trim();
  if (!cleaned) return { groups: [], width: 8, warnings };
  const badMatch = /[^01\s,;|\-_/]/.exec(cleaned);
  if (badMatch) {
    const pos = badMatch.index;
    return {
      groups: [],
      width: 8,
      warnings,
      error: `“${badMatch[0]}” at position ${pos + 1} isn't a binary digit. Binary uses only 0 and 1; spaces, commas and new lines between bytes are fine.`,
    };
  }
  const tokens = cleaned.split(/[\s,;|\-_/]+/).filter(Boolean);
  let width: number;
  if (bitsOpt === "auto") {
    if (tokens.length > 1 && tokens.every((t) => t.length === 7)) width = 7;
    else if (tokens.length === 1 && tokens[0].length % 8 !== 0 && tokens[0].length % 7 === 0) width = 7;
    else width = 8;
  } else width = bitsOpt;
  const groups: string[] = [];
  for (const t of tokens) {
    if (t.length <= width) {
      groups.push(t.padStart(width, "0"));
      continue;
    }
    if (t.length % width === 0) {
      for (let i = 0; i < t.length; i += width) groups.push(t.slice(i, i + width));
      continue;
    }
    // Continuous run that isn't a whole number of bytes: split and pad the last group.
    const extra = t.length % width;
    for (let i = 0; i + width <= t.length; i += width) groups.push(t.slice(i, i + width));
    warnings.push(`${t.length} bits isn't a multiple of ${width}. The last ${extra} bit${extra === 1 ? "" : "s"} (${t.slice(t.length - extra)}) didn't make a full byte and ${extra === 1 ? "was" : "were"} ignored.`);
  }
  const shortGroups = tokens.filter((t) => t.length < width).length;
  if (shortGroups && tokens.length > 1) warnings.push(`${shortGroups} group${shortGroups === 1 ? " was" : "s were"} shorter than ${width} bits and padded with leading zeros.`);
  if (width === 7 && bitsOpt === "auto") warnings.push("Read as 7-bit ASCII because every group has 7 bits.");
  return { groups, width, warnings };
}

export function decodeBinary(input: string, opts: { bits: "auto" | 7 | 8; charset: "utf8" | "latin1" }): DecodeResult {
  const { groups, width, warnings, error } = splitBinary(input, opts.bits);
  if (error) return { text: "", bytes: [], rows: [], groupsBits: [], warnings, error, width };
  const bytes = groups.map((g) => parseInt(g, 2));
  let text = "";
  const rows: ByteRow[] = [];
  if (opts.charset === "latin1" || width === 7) {
    text = bytes.map((b) => String.fromCharCode(b)).join("");
    bytes.forEach((b, i) => rows.push({ bits: groups[i], value: b, char: charLabel(String.fromCharCode(b)) }));
  } else {
    // Walk UTF-8 sequences so each byte row can say which character it belongs to.
    let i = 0;
    let invalid = 0;
    while (i < bytes.length) {
      const b = bytes[i];
      const len = b < 0x80 ? 1 : b >= 0xc2 && b < 0xe0 ? 2 : b >= 0xe0 && b < 0xf0 ? 3 : b >= 0xf0 && b < 0xf5 ? 4 : 0;
      const seq = len ? bytes.slice(i, i + len) : [];
      const ok = len > 0 && seq.length === len && seq.slice(1).every((x) => (x & 0xc0) === 0x80);
      if (!ok) {
        invalid++;
        text += "�";
        rows.push({ bits: groups[i], value: b, char: "�", note: "not valid UTF-8 here" });
        i++;
        continue;
      }
      let cp: number;
      if (len === 1) cp = b;
      else if (len === 2) cp = ((b & 0x1f) << 6) | (seq[1] & 0x3f);
      else if (len === 3) cp = ((b & 0x0f) << 12) | ((seq[1] & 0x3f) << 6) | (seq[2] & 0x3f);
      else cp = ((b & 0x07) << 18) | ((seq[1] & 0x3f) << 12) | ((seq[2] & 0x3f) << 6) | (seq[3] & 0x3f);
      const ch = String.fromCodePoint(cp);
      text += ch;
      seq.forEach((x, k) =>
        rows.push({
          bits: groups[i + k],
          value: x,
          char: k === 0 ? charLabel(ch) : "",
          note: len > 1 ? (k === 0 ? `byte 1 of ${len} (U+${cp.toString(16).toUpperCase().padStart(4, "0")})` : `byte ${k + 1} of ${len}`) : undefined,
        }),
      );
      i += len;
    }
    if (invalid) warnings.push(`${invalid} byte${invalid === 1 ? " isn't" : "s aren't"} valid UTF-8 and ${invalid === 1 ? "is" : "are"} shown as �. If this is extended ASCII, set Character set to Latin-1.`);
  }
  return { text, bytes, rows, groupsBits: groups, warnings, width };
}

/** Parse decimal ASCII codes ("72 101 108") into text; rejects values above 255 (or 127 in 7-bit mode). */
export function codesToText(input: string, max: number): { text?: string; error?: string } {
  const toks = input.split(/[\s,;]+/).filter(Boolean);
  const chars: string[] = [];
  for (const t of toks) {
    if (!/^\d+$/.test(t)) return { error: `“${t}” isn't a decimal code. Enter numbers such as 72 101 108 separated by spaces or commas.` };
    const n = Number(t);
    if (n > max) return { error: `${n} is outside the ASCII range (0–${max}).` };
    chars.push(String.fromCharCode(n));
  }
  return { text: chars.join("") };
}
