/*
 * Money and percentage formulas used by the calculator widget and quoted on the tool pages.
 * Pure functions: no rounding happens here except where a formula requires it; widgets round
 * only for display (Intl.NumberFormat), so totals stay consistent.
 */

/** Parse a user-typed number: accepts "1,234.5", "1 234.5", "12%". Returns NaN for empty/invalid. */
export function parseNum(raw: string | number | null | undefined): number {
  if (typeof raw === "number") return raw;
  if (raw == null) return NaN;
  const s = String(raw).trim().replace(/[\s,_%]/g, "").replace(/^\+/, "");
  if (!s || !/^-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)) return NaN;
  return Number(s);
}

export const ok = (...n: number[]) => n.every((x) => Number.isFinite(x));

/* ---------------- Percentages ---------------- */

/** X% of Y = X / 100 × Y */
export const percentOf = (x: number, y: number) => (x / 100) * y;
/** X is what % of Y = X / Y × 100 */
export const whatPercent = (x: number, y: number) => (y === 0 ? NaN : (x / y) * 100);
/** % change from A to B = (B − A) / |A| × 100 */
export const percentChange = (a: number, b: number) => (a === 0 ? NaN : ((b - a) / Math.abs(a)) * 100);
/** % difference = |A − B| / ((A + B) / 2) × 100 (symmetric, no "from" value) */
export const percentDifference = (a: number, b: number) => {
  const mean = (Math.abs(a) + Math.abs(b)) / 2;
  return mean === 0 ? NaN : (Math.abs(a - b) / mean) * 100;
};
/** Y increased (or decreased, with negative pct) by X% = Y × (1 + X/100) */
export const applyPercent = (y: number, pct: number) => y * (1 + pct / 100);
/** Reverse: the original value before an X% change produced Y = Y / (1 + X/100) */
export const reversePercent = (y: number, pct: number) => (pct === -100 ? NaN : y / (1 + pct / 100));

/* ---------------- Discounts ---------------- */

export function salePrice(price: number, pctOff: number) {
  const saving = (price * pctOff) / 100;
  return { saving, final: price - saving };
}

/** Percent off between an original and a sale price. */
export const percentOff = (original: number, sale: number) => (original === 0 ? NaN : ((original - sale) / original) * 100);

/** Successive discounts (20% then 10%): price × (1 − a)(1 − b)…; effective % = 1 − product. */
export function stackedDiscount(price: number, pcts: number[]) {
  let factor = 1;
  const steps: { pct: number; before: number; after: number }[] = [];
  let cur = price;
  for (const p of pcts) {
    const next = cur * (1 - p / 100);
    steps.push({ pct: p, before: cur, after: next });
    cur = next;
    factor *= 1 - p / 100;
  }
  return { final: cur, saving: price - cur, effectivePct: (1 - factor) * 100, steps };
}

/* ---------------- GST / VAT ---------------- */

/** Add tax to a net price: tax = net × r/100; gross = net + tax. */
export function addTax(net: number, rate: number) {
  const tax = (net * rate) / 100;
  return { net, tax, gross: net + tax };
}

/** Remove tax from a tax-inclusive price: net = gross × 100 / (100 + r); tax = gross − net. */
export function removeTax(gross: number, rate: number) {
  const net = (gross * 100) / (100 + rate);
  return { net, tax: gross - net, gross };
}

/* ---------------- Loans (reducing balance) ---------------- */

/**
 * EMI = P × r × (1 + r)^n / ((1 + r)^n − 1), r = annual rate / 12 / 100, n = months.
 * With r = 0 the EMI is simply P / n.
 */
export function emi(principal: number, annualRatePct: number, months: number): number {
  if (!(principal > 0) || !(months >= 1) || annualRatePct < 0) return NaN;
  const r = annualRatePct / 12 / 100;
  if (r === 0) return principal / months;
  const f = Math.pow(1 + r, months);
  return (principal * r * f) / (f - 1);
}

export interface AmortRow {
  month: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}

/** Month-by-month schedule. Interest = balance × r; principal = EMI − interest. Last row absorbs rounding drift. */
export function amortization(principal: number, annualRatePct: number, months: number): AmortRow[] {
  const e = emi(principal, annualRatePct, months);
  if (!Number.isFinite(e)) return [];
  const r = annualRatePct / 12 / 100;
  const rows: AmortRow[] = [];
  let bal = principal;
  for (let m = 1; m <= months; m++) {
    const interest = bal * r;
    let princ = e - interest;
    let pay = e;
    if (m === months) {
      princ = bal;
      pay = bal + interest;
    }
    bal = Math.max(0, bal - princ);
    rows.push({ month: m, payment: pay, interest, principal: princ, balance: m === months ? 0 : bal });
  }
  return rows;
}

export function loanTotals(principal: number, annualRatePct: number, months: number) {
  const rows = amortization(principal, annualRatePct, months);
  const total = rows.reduce((s, r) => s + r.payment, 0);
  return { emi: emi(principal, annualRatePct, months), total, interest: total - principal, rows };
}

/* ---------------- AdSense estimates ---------------- */

/** RPM method: earnings = page views / 1000 × page RPM. */
export const earningsFromRpm = (views: number, rpm: number) => (views / 1000) * rpm;
/** CTR × CPC method: earnings = page views × CTR/100 × CPC (ignores impression-based revenue). */
export const earningsFromCtrCpc = (views: number, ctrPct: number, cpc: number) => views * (ctrPct / 100) * cpc;
/** Implied page RPM from CTR and CPC = CTR/100 × CPC × 1000. */
export const rpmFromCtrCpc = (ctrPct: number, cpc: number) => (ctrPct / 100) * cpc * 1000;

/* ---------------- Formatting ---------------- */

export const CURRENCIES = ["USD", "EUR", "GBP", "INR", "PKR", "AUD", "CAD", "NZD", "SGD", "AED", "SAR", "ZAR", "NGN", "BDT", "JPY", "MYR", "PHP"] as const;

/** Best-guess currency from a BCP 47 locale's region (falls back to USD). */
export function currencyForLocale(locale: string | undefined): string {
  const region = (locale ?? "").split(/[-_]/)[1]?.toUpperCase() ?? "";
  const map: Record<string, string> = {
    US: "USD", GB: "GBP", IN: "INR", PK: "PKR", AU: "AUD", CA: "CAD", NZ: "NZD", SG: "SGD", AE: "AED", SA: "SAR",
    ZA: "ZAR", NG: "NGN", BD: "BDT", JP: "JPY", MY: "MYR", PH: "PHP", IE: "EUR", DE: "EUR", FR: "EUR", ES: "EUR",
    IT: "EUR", NL: "EUR", BE: "EUR", AT: "EUR", PT: "EUR", FI: "EUR", GR: "EUR",
  };
  return map[region] ?? "USD";
}

export function fmtMoney(n: number, currency: string, digits = 2): string {
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
  } catch {
    return `${n.toFixed(digits)} ${currency}`;
  }
}

export function fmtNum(n: number, maxDigits = 2, minDigits = 0): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: maxDigits, minimumFractionDigits: minDigits }).format(n);
}

/** Plain number for formulas (no grouping ambiguity across locales): up to `d` decimals, trailing zeros removed. */
export function plain(n: number, d = 2): string {
  if (!Number.isFinite(n)) return "—";
  return String(Number(n.toFixed(d)));
}
