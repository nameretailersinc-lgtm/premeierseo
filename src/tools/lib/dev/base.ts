/*
 * Number-base engine: binary, octal, decimal and hexadecimal with BigInt integers,
 * exact fractions (rational arithmetic) and optional fixed-width two's complement.
 * Pure functions, no DOM; used by the number-base widget and tested with tsx.
 * BigInt literals need ES2020, so constants are built with BigInt(n).
 */

export type Base = 2 | 8 | 10 | 16;

export const BASE_NAME: Record<Base, string> = { 2: "binary", 8: "octal", 10: "decimal", 16: "hexadecimal" };

const B0 = BigInt(0);
const B1 = BigInt(1);
const DIGITS = "0123456789ABCDEF";

/** Exact value: sign × (int + num/den). den is a power of the source base (or 1). */
export interface Value {
  neg: boolean;
  int: bigint;
  num: bigint;
  den: bigint;
}

export interface ParseResult {
  value?: Value;
  error?: string;
  /** Cleaned digits as typed (no prefix, sign, spaces). */
  digits?: string;
}

const PREFIX: Record<Base, RegExp> = { 2: /^0b/i, 8: /^0o/i, 10: /^$/, 16: /^(0x|#)/i };

export function validDigit(ch: string, base: Base): boolean {
  const d = DIGITS.indexOf(ch.toUpperCase());
  return d >= 0 && d < base;
}

/** Parse a number typed in `base`. Accepts a leading minus, 0b/0o/0x prefixes, spaces, underscores and one point. */
export function parseNumber(raw: string, base: Base): ParseResult {
  let s = raw.trim().replace(/[\s_]/g, "");
  if (base === 10) s = s.replace(/,(?=\d{3}(\D|$))/g, "");
  if (!s) return {};
  let neg = false;
  if (s[0] === "-" || s[0] === "+") {
    neg = s[0] === "-";
    s = s.slice(1);
  }
  if (base !== 10) s = s.replace(PREFIX[base], "");
  if (!s) return { error: "Type at least one digit." };
  const parts = s.split(".");
  if (parts.length > 2) return { error: "A number can contain only one point." };
  const [ip, fp = ""] = parts;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === ".") continue;
    if (!validDigit(ch, base)) {
      const allowed = base === 2 ? "0 and 1" : base === 8 ? "the digits 0–7" : base === 10 ? "the digits 0–9" : "0–9 and A–F";
      return { error: `“${ch}” isn't a ${BASE_NAME[base]} digit. Only ${allowed} are allowed.` };
    }
  }
  const b = BigInt(base);
  const int = ip ? digitsToBig(ip, base) : B0;
  const num = fp ? digitsToBig(fp, base) : B0;
  const den = fp ? b ** BigInt(fp.length) : B1;
  return { value: { neg: neg && (int !== B0 || num !== B0), int, num, den }, digits: (ip || "0") + (fp ? "." + fp : "") };
}

function digitsToBig(d: string, base: Base): bigint {
  if (base === 10) return BigInt(d);
  const prefix = base === 2 ? "0b" : base === 8 ? "0o" : "0x";
  return BigInt(prefix + d);
}

export interface FormatResult {
  text: string;
  /** Fraction was cut off (non-terminating in the target base). */
  truncated: boolean;
}

/** Format a value in `base`, with up to maxFrac fractional digits. */
export function formatValue(v: Value, base: Base, maxFrac = 32): FormatResult {
  const intStr = v.int.toString(base).toUpperCase();
  let frac = "";
  let truncated = false;
  if (v.num !== B0) {
    const b = BigInt(base);
    let n = v.num;
    while (n !== B0 && frac.length < maxFrac) {
      n *= b;
      const d = n / v.den;
      frac += DIGITS[Number(d)];
      n %= v.den;
    }
    truncated = n !== B0;
  }
  return { text: (v.neg ? "-" : "") + intStr + (frac ? "." + frac : ""), truncated };
}

export function isZero(v: Value) {
  return v.int === B0 && v.num === B0;
}

/** Integer value as a signed BigInt (fraction must be zero). */
export function toBig(v: Value): bigint {
  return v.neg ? -v.int : v.int;
}

export function fromBig(n: bigint): Value {
  return { neg: n < B0, int: n < B0 ? -n : n, num: B0, den: B1 };
}

/* ---------- Two's complement ---------- */

export function twosRange(width: number): [bigint, bigint] {
  const half = B1 << BigInt(width - 1);
  return [-half, half - B1];
}

/** Bit pattern (width bits) for a signed integer, or an error if it doesn't fit. */
export function toTwos(n: bigint, width: number): { bits?: string; error?: string } {
  const [min, max] = twosRange(width);
  if (n < min || n > max) return { error: `${n.toString()} doesn't fit in ${width} bits (range ${min.toString()} to ${max.toString()}).` };
  const mod = B1 << BigInt(width);
  const u = n < B0 ? mod + n : n;
  return { bits: u.toString(2).padStart(width, "0") };
}

/** Read an unsigned pattern of `width` bits as a signed two's complement integer. */
export function fromTwos(u: bigint, width: number): { value?: bigint; error?: string } {
  const mod = B1 << BigInt(width);
  if (u >= mod) return { error: `The value needs more than ${width} bits. Choose a wider bit width.` };
  const signBit = B1 << BigInt(width - 1);
  return { value: u >= signBit ? u - mod : u };
}

/* ---------- Grouping ---------- */

/** Insert a space every `size` digits from the right of the integer part (and from the left of the fraction). */
export function group(text: string, size: number): string {
  if (!size) return text;
  const neg = text.startsWith("-");
  const t = neg ? text.slice(1) : text;
  const [ip, fp] = t.split(".");
  const gi: string[] = [];
  for (let i = ip.length; i > 0; i -= size) gi.unshift(ip.slice(Math.max(0, i - size), i));
  const gf: string[] = [];
  if (fp) for (let i = 0; i < fp.length; i += size) gf.push(fp.slice(i, i + size));
  return (neg ? "-" : "") + gi.join(" ") + (fp ? "." + gf.join(" ") : "");
}

/** Pad the integer part with leading zeros to a multiple of `size` digits. */
export function padTo(text: string, size: number): string {
  const neg = text.startsWith("-");
  const t = neg ? text.slice(1) : text;
  const [ip, fp] = t.split(".");
  const len = Math.ceil(ip.length / size) * size;
  return (neg ? "-" : "") + ip.padStart(len, "0") + (fp !== undefined ? "." + fp : "");
}

/* ---------- Step-by-step working ---------- */

export interface StepTable {
  caption: string;
  head: string[];
  rows: string[][];
}

export interface Steps {
  method: string;
  intro: string;
  tables: StepTable[];
  result: string;
}

const MAX_STEP_DIGITS = 64;
const sup = (n: number) => {
  const map = "⁰¹²³⁴⁵⁶⁷⁸⁹";
  return (n < 0 ? "⁻" : "") + String(Math.abs(n)).split("").map((d) => map[Number(d)]).join("");
};

function digitValue(ch: string) {
  return DIGITS.indexOf(ch.toUpperCase());
}

/** Explain converting `digits` (as typed, in base `from`) to base `to`. Unsigned magnitude only. */
export function explain(digits: string, from: Base, to: Base, v: Value): Steps | null {
  if (from === to) return null;
  const [ip, fp = ""] = digits.split(".");
  if (ip.length + fp.length > MAX_STEP_DIGITS) return null;
  const target = formatValue({ ...v, neg: false }, to).text;
  const bitsPer: Partial<Record<Base, number>> = { 2: 1, 8: 3, 16: 4 };

  // Binary ↔ octal/hex: grouping bits (or expanding digits).
  if (from === 2 && (to === 8 || to === 16)) {
    const size = bitsPer[to]!;
    const intPadded = ip.padStart(Math.ceil(ip.length / size) * size, "0");
    const fracPadded = fp ? fp.padEnd(Math.ceil(fp.length / size) * size, "0") : "";
    const rows: string[][] = [];
    for (let i = 0; i < intPadded.length; i += size) {
      const g = intPadded.slice(i, i + size);
      rows.push([g, DIGITS[parseInt(g, 2)]]);
    }
    const tables: StepTable[] = [{ caption: `Integer part in groups of ${size} bits`, head: ["Bits", to === 8 ? "Octal digit" : "Hex digit"], rows }];
    if (fracPadded) {
      const fr: string[][] = [];
      for (let i = 0; i < fracPadded.length; i += size) {
        const g = fracPadded.slice(i, i + size);
        fr.push([g, DIGITS[parseInt(g, 2)]]);
      }
      tables.push({ caption: `Fraction in groups of ${size} bits (padded on the right)`, head: ["Bits", to === 8 ? "Octal digit" : "Hex digit"], rows: fr });
    }
    const padNote = intPadded.length > ip.length ? ` Pad on the left with zeros so the length is a multiple of ${size}: ${intPadded}.` : "";
    return {
      method: `Group the bits in ${size === 3 ? "threes" : "fours"}`,
      intro: `Each ${to === 8 ? "octal" : "hex"} digit stands for exactly ${size} bits. Split the binary number into groups of ${size} starting from the right.${padNote}`,
      tables,
      result: `${digits}₂ = ${target}${to === 8 ? "₈" : "₁₆"}`,
    };
  }
  if ((from === 8 || from === 16) && to === 2) {
    const size = bitsPer[from]!;
    const rows = ip.split("").map((ch) => [ch.toUpperCase(), digitValue(ch).toString(2).padStart(size, "0")]);
    const tables: StepTable[] = [{ caption: "Integer part", head: [from === 8 ? "Octal digit" : "Hex digit", `${size} bits`], rows }];
    if (fp) tables.push({ caption: "Fraction", head: [from === 8 ? "Octal digit" : "Hex digit", `${size} bits`], rows: fp.split("").map((ch) => [ch.toUpperCase(), digitValue(ch).toString(2).padStart(size, "0")]) });
    return {
      method: `Replace each digit with ${size} bits`,
      intro: `Write every ${from === 8 ? "octal" : "hex"} digit as a ${size}-bit binary group, then join the groups. Leading zeros of the first group can be dropped.`,
      tables,
      result: `${digits.toUpperCase()}${from === 8 ? "₈" : "₁₆"} = ${target}₂`,
    };
  }
  // Octal ↔ hex: go through binary.
  if ((from === 8 && to === 16) || (from === 16 && to === 8)) {
    const bin = formatValue({ ...v, neg: false }, 2).text;
    const a = explain(digits, from, 2, v)!;
    const b = explain(bin, 2, to, v)!;
    return {
      method: "Convert through binary",
      intro: `Octal and hex digits both map to fixed groups of bits (3 and 4), so the quickest route is ${BASE_NAME[from]} → binary → ${BASE_NAME[to]}.`,
      tables: [...a.tables.map((t) => ({ ...t, caption: `Step 1 · ${t.caption}` })), ...b.tables.map((t) => ({ ...t, caption: `Step 2 · ${t.caption}` }))],
      result: `${digits.toUpperCase()}${from === 8 ? "₈" : "₁₆"} = ${bin}₂ = ${target}${to === 8 ? "₈" : "₁₆"}`,
    };
  }
  // Any base → decimal: positional sum.
  if (to === 10) {
    const rows: string[][] = [];
    const terms: string[] = [];
    const n = ip.length;
    for (let i = 0; i < n; i++) {
      const ch = ip[i];
      const p = n - 1 - i;
      const dv = digitValue(ch);
      const place = BigInt(from) ** BigInt(p);
      const val = BigInt(dv) * place;
      rows.push([ch.toUpperCase(), `${from}${sup(p)} = ${place.toString()}`, val.toString()]);
      if (dv) terms.push(val.toString());
    }
    for (let i = 0; i < fp.length; i++) {
      const ch = fp[i];
      const dv = digitValue(ch);
      const den = BigInt(from) ** BigInt(i + 1);
      const placeTxt = formatValue({ neg: false, int: B0, num: B1, den }, 10).text;
      const valTxt = formatValue({ neg: false, int: B0, num: BigInt(dv), den }, 10).text;
      rows.push([ch.toUpperCase(), `${from}${sup(-(i + 1))} = ${placeTxt}`, valTxt]);
      if (dv) terms.push(valTxt);
    }
    return {
      method: `Multiply each digit by its place value`,
      intro: `Each position is worth ${from} times the one to its right. Multiply every digit by its power of ${from}, then add the results.`,
      tables: [{ caption: "Place values", head: ["Digit", "Place value", "Digit × place"], rows }],
      result: `${terms.length ? terms.join(" + ") : "0"} = ${target}`,
    };
  }
  // Decimal (or octal/hex → other handled above) → base: repeated division + fraction multiplication.
  if (from === 10) {
    const b = BigInt(to);
    const rows: string[][] = [];
    let q = v.int;
    if (q === B0) rows.push(["0", "0", "0"]);
    let guard = 0;
    while (q > B0 && guard++ < 400) {
      const nq = q / b;
      const r = q % b;
      rows.push([`${q.toString()} ÷ ${to}`, nq.toString(), `${r.toString()}${to === 16 && r > BigInt(9) ? ` (${DIGITS[Number(r)]})` : ""}`]);
      q = nq;
    }
    const tables: StepTable[] = [{ caption: "Integer part: divide by " + to + " until the quotient is 0", head: ["Division", "Quotient", "Remainder"], rows }];
    if (v.num !== B0) {
      const fr: string[][] = [];
      let n = v.num;
      let k = 0;
      while (n !== B0 && k < 16) {
        const before = formatValue({ neg: false, int: B0, num: n, den: v.den }, 10).text;
        n *= b;
        const d = n / v.den;
        n %= v.den;
        const after = formatValue({ neg: false, int: d, num: n, den: v.den }, 10).text;
        fr.push([`${before} × ${to}`, after, DIGITS[Number(d)]]);
        k++;
      }
      tables.push({
        caption: `Fraction: multiply by ${to} and take the whole-number part${n !== B0 ? " (stopped after 16 digits; it doesn't end)" : ""}`,
        head: ["Multiplication", "Result", "Digit"],
        rows: fr,
      });
    }
    return {
      method: `Divide by ${to} and read the remainders`,
      intro: `Divide the number by ${to} repeatedly and write down each remainder. The ${BASE_NAME[to]} result is the remainders read from the last one to the first.${v.num !== B0 ? ` For the part after the point, multiply by ${to} instead and read the whole-number parts from the top down.` : ""}`,
      tables,
      result: `${digits} = ${target}${to === 2 ? "₂" : to === 8 ? "₈" : "₁₆"}`,
    };
  }
  return null;
}

/** Steps for writing a negative number in two's complement. */
export function explainTwos(n: bigint, width: number): Steps | null {
  if (n >= B0) return null;
  const mag = (-n).toString(2).padStart(width, "0");
  const inv = mag
    .split("")
    .map((c) => (c === "0" ? "1" : "0"))
    .join("");
  const res = toTwos(n, width).bits ?? "";
  return {
    method: "Two's complement",
    intro: `To write ${n.toString()} in ${width} bits: write ${(-n).toString()} in binary, flip every bit, then add 1.`,
    tables: [
      {
        caption: "Working",
        head: ["Step", "Bits"],
        rows: [
          [`${(-n).toString()} in ${width} bits`, mag],
          ["Flip every bit", inv],
          ["Add 1", res],
        ],
      },
    ],
    result: `${n.toString()} = ${res} (${width}-bit two's complement)`,
  };
}

/** Steps for reading a two's complement bit pattern whose top bit is 1. */
export function explainTwosRead(bits: string): Steps | null {
  if (bits.length > MAX_STEP_DIGITS || bits[0] !== "1") return null;
  const w = bits.length;
  const rows: string[][] = [];
  const terms: string[] = [];
  let total = B0;
  for (let i = 0; i < w; i++) {
    const p = w - 1 - i;
    const place = (B1 << BigInt(p)) * (i === 0 ? -B1 : B1);
    const val = bits[i] === "1" ? place : B0;
    total += val;
    rows.push([bits[i], `${i === 0 ? "−" : ""}2${sup(p)} = ${place.toString()}`, val.toString()]);
    if (bits[i] === "1") terms.push(val < B0 ? `(${val.toString()})` : val.toString());
  }
  return {
    method: "Two's complement: the top bit counts as negative",
    intro: `In ${w}-bit two's complement the leftmost bit is worth −2${sup(w - 1)} instead of +2${sup(w - 1)}. Add the place values as usual.`,
    tables: [{ caption: "Place values", head: ["Bit", "Place value", "Bit × place"], rows }],
    result: `${terms.join(" + ")} = ${total.toString()}`,
  };
}
