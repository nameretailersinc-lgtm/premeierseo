/*
 * Check digits and test numbers: Luhn (ISO/IEC 7812-1 Annex B) for card numbers, and the
 * GS1 mod-10 check digit used by EAN-13, EAN-8, UPC-A and ITF-14 (GTIN).
 */
import { randomBelow } from "../text/random";

/* ---------------- Luhn ---------------- */

/** Luhn checksum of a digit string: valid when the result is 0. */
export function luhnSum(digits: string): number {
  let sum = 0;
  let dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10;
}

export function luhnValid(num: string): boolean {
  const d = num.replace(/[\s-]/g, "");
  return /^\d{2,}$/.test(d) && luhnSum(d) === 0;
}

/** The digit to append so that `partial + digit` passes Luhn. */
export function luhnCheckDigit(partial: string): number {
  return (10 - luhnSum(partial + "0")) % 10;
}

export interface Network {
  id: string;
  name: string;
  /** Prefix ranges as [from, to] strings of equal length. */
  prefixes: [string, string][];
  length: number;
  group: number[];
}

export const NETWORKS: Network[] = [
  { id: "visa", name: "Visa", prefixes: [["4", "4"]], length: 16, group: [4, 4, 4, 4] },
  { id: "mastercard", name: "Mastercard", prefixes: [["51", "55"], ["2221", "2720"]], length: 16, group: [4, 4, 4, 4] },
  { id: "amex", name: "American Express", prefixes: [["34", "34"], ["37", "37"]], length: 15, group: [4, 6, 5] },
  { id: "discover", name: "Discover", prefixes: [["6011", "6011"], ["644", "649"], ["65", "65"]], length: 16, group: [4, 4, 4, 4] },
  { id: "jcb", name: "JCB", prefixes: [["3528", "3589"]], length: 16, group: [4, 4, 4, 4] },
  { id: "diners", name: "Diners Club International", prefixes: [["36", "36"]], length: 14, group: [4, 6, 4] },
  { id: "unionpay", name: "UnionPay", prefixes: [["62", "62"]], length: 16, group: [4, 4, 4, 4] },
];

function pickPrefix(n: Network): string {
  const [from, to] = n.prefixes[randomBelow(n.prefixes.length)];
  const v = Number(from) + randomBelow(Number(to) - Number(from) + 1);
  return String(v).padStart(from.length, "0");
}

/** Random digits after a network prefix, completed with a Luhn check digit. */
export function testCardNumber(n: Network): string {
  let s = pickPrefix(n);
  while (s.length < n.length - 1) s += String(randomBelow(10));
  return s + luhnCheckDigit(s);
}

export function groupDigits(num: string, group: number[]): string {
  const out: string[] = [];
  let i = 0;
  for (const g of group) {
    if (i >= num.length) break;
    out.push(num.slice(i, i + g));
    i += g;
  }
  if (i < num.length) out.push(num.slice(i));
  return out.join(" ");
}

/** Which network a number's prefix and length belong to (first match). */
export function detectNetwork(num: string): Network | undefined {
  const d = num.replace(/\D/g, "");
  return NETWORKS.find((n) =>
    n.prefixes.some(([from, to]) => {
      const p = d.slice(0, from.length);
      return p.length === from.length && Number(p) >= Number(from) && Number(p) <= Number(to);
    }),
  );
}

/* ---------------- GS1 (EAN / UPC / ITF-14) ---------------- */

/** GS1 mod-10 check digit for the data digits (weights 3,1,3,1… from the right). */
export function gs1CheckDigit(data: string): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const d = data.charCodeAt(data.length - 1 - i) - 48;
    sum += d * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

export type BarcodeFormat = "CODE128" | "EAN13" | "UPC" | "EAN8" | "ITF14" | "CODE39";

export const BARCODE_FORMATS: { id: BarcodeFormat; label: string; digits?: number; hint: string }[] = [
  { id: "CODE128", label: "Code 128", hint: "Letters, digits and symbols (ASCII). Shipping, inventory and asset labels." },
  { id: "EAN13", label: "EAN-13", digits: 13, hint: "12 digits; the 13th (check digit) is added for you. Retail products worldwide." },
  { id: "UPC", label: "UPC-A", digits: 12, hint: "11 digits; the 12th (check digit) is added for you. Retail products in the US and Canada." },
  { id: "EAN8", label: "EAN-8", digits: 8, hint: "7 digits; the 8th (check digit) is added for you. Small retail packs." },
  { id: "ITF14", label: "ITF-14", digits: 14, hint: "13 digits; the 14th (check digit) is added for you. Outer cartons and cases." },
  { id: "CODE39", label: "Code 39", hint: "A–Z, 0–9, space and - . $ / + %. Older industrial and ID systems." },
];

export interface BarcodeCheck {
  ok: boolean;
  value: string;
  error?: string;
  /** For GS1 formats: the check digit and how it was computed. */
  check?: { digit: number; added: boolean; data: string };
}

/** Validate/complete an input for a format. GS1 formats get their check digit added or verified. */
export function prepareBarcode(format: BarcodeFormat, raw: string): BarcodeCheck {
  const input = raw.trim();
  if (!input) return { ok: false, value: "", error: "Enter a value." };
  const spec = BARCODE_FORMATS.find((f) => f.id === format)!;
  if (spec.digits) {
    const d = input.replace(/[\s-]/g, "");
    if (!/^\d+$/.test(d)) return { ok: false, value: d, error: `${spec.label} uses digits only.` };
    const n = spec.digits;
    if (d.length === n - 1) {
      const digit = gs1CheckDigit(d);
      return { ok: true, value: d + digit, check: { digit, added: true, data: d } };
    }
    if (d.length === n) {
      const data = d.slice(0, -1);
      const digit = gs1CheckDigit(data);
      if (digit !== Number(d[n - 1])) return { ok: false, value: d, error: `The check digit should be ${digit}, not ${d[n - 1]}. Enter the first ${n - 1} digits to have it added.`, check: { digit, added: false, data } };
      return { ok: true, value: d, check: { digit, added: false, data } };
    }
    return { ok: false, value: d, error: `${spec.label} needs ${n - 1} digits (or ${n} with the check digit). You entered ${d.length}.` };
  }
  if (format === "CODE39") {
    const v = input.toUpperCase();
    if (!/^[0-9A-Z \-.$/+%]+$/.test(v)) return { ok: false, value: v, error: "Code 39 supports A–Z, 0–9, space and - . $ / + % only." };
    return { ok: true, value: v };
  }
  // CODE128: printable ASCII
  if (!/^[\x20-\x7E]+$/.test(input)) return { ok: false, value: input, error: "Code 128 supports standard ASCII characters (no accents or emoji)." };
  if (input.length > 80) return { ok: false, value: input, error: "Keep Code 128 values under 80 characters so the barcode stays scannable." };
  return { ok: true, value: input };
}

/** Weighted sum used by the GS1 check digit (for showing the working). */
export function gs1WeightedSum(data: string): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += (data.charCodeAt(data.length - 1 - i) - 48) * (i % 2 === 0 ? 3 : 1);
  return sum;
}
