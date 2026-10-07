/*
 * Client for our own /api/* routes (docs/dev/tool-authoring-guide.md §5).
 * Every failure is classified so the UI can tell three things apart:
 *  - "target":   the site itself failed (DNS, timeout, TLS, loop). That IS a result about the site.
 *  - "checker":  our server failed (5xx or unreachable). Not a result about the site.
 *  - "input":    the address was rejected (400).
 *  - "rate":     too many checks (429).
 *  - "provider": a third-party service we call (PageSpeed Insights, ipinfo) failed or is rate-limited.
 */

export type ApiErrorKind = "target" | "checker" | "input" | "rate" | "provider";

export interface ApiError {
  kind: ApiErrorKind;
  code: string;
  message: string;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

const PROVIDER_CODES = new Set(["QUOTA", "PSI_ERROR", "PSI_UNAVAILABLE"]);

function classify(status: number, data: unknown): ApiError | null {
  const err = (data as { error?: { code?: string; message?: string } } | null)?.error;
  if (status === 429) return { kind: "rate", code: err?.code ?? "RATE_LIMITED", message: err?.message ?? "Too many checks in a short time. Please wait a minute and try again." };
  if (status === 400) return { kind: "input", code: err?.code ?? "INVALID_URL", message: err?.message ?? "That address can't be checked." };
  if (status === 403) return { kind: "checker", code: err?.code ?? "FORBIDDEN", message: err?.message ?? "The request was refused." };
  if (status >= 500 || data === null) return { kind: "checker", code: err?.code ?? "CHECKER_UNAVAILABLE", message: err?.message ?? "Our checker failed. Please try again in a moment." };
  if (err) {
    const code = err.code ?? "ERROR";
    return { kind: PROVIDER_CODES.has(code) ? "provider" : "target", code, message: err.message ?? "The check failed." };
  }
  return null;
}

async function request<T>(path: string, init: RequestInit): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(path, { ...init, cache: "no-store" });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    return { ok: false, error: { kind: "checker", code: "NETWORK", message: "Couldn't reach our checker. Check your internet connection and try again." } };
  }
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  const error = classify(res.status, data);
  if (error) return { ok: false, error };
  return { ok: true, data: data as T };
}

export function postJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<ApiResult<T>> {
  return request<T>(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal });
}

export function getJson<T>(path: string, signal?: AbortSignal): Promise<ApiResult<T>> {
  return request<T>(path, { method: "GET", signal });
}

/* ---------- Response shapes (mirrors src/app/api/*) ---------- */

export interface Hop {
  url: string;
  status: number;
  statusText?: string;
  location?: string;
  ms?: number;
  headers?: Record<string, string>;
}

export interface TlsInfo {
  protocol?: string;
  validTo?: string;
  issuer?: string;
  subject?: string;
  authorized: boolean;
}

export interface PageFacts {
  lang: string | null;
  charset: string | null;
  title: string | null;
  titleCount: number;
  metaDescription: string | null;
  metaDescriptionCount: number;
  metaKeywords: string | null;
  robots: string | null;
  googlebot: string | null;
  canonical: string[];
  viewport: string | null;
  favicon: string | null;
  hreflang: { lang: string; href: string }[];
  og: Record<string, string>;
  twitter: Record<string, string>;
  headings: { level: number; text: string }[];
  links: { total: number; internal: number; external: number; nofollow: number; empty: number };
  anchors: { href: string; text: string; rel: string }[];
  images: { total: number; missingAlt: number; missingSize: number };
  jsonLd: { raw: string; types: string[]; valid: boolean; error?: string }[];
  microdataTypes: string[];
  wordCount: number;
  text: string;
  scripts: number;
  stylesheets: number;
  iframes: number;
  hasAmp: boolean;
}

export interface InspectResult {
  checkedAt: string;
  requestedUrl: string;
  finalUrl: string;
  status: number;
  statusText: string;
  hops: Hop[];
  headers: Record<string, string>;
  contentType: string;
  htmlBytes: number;
  transferBytes: number;
  truncated: boolean;
  totalMs: number;
  ttfbMs: number;
  tls?: TlsInfo;
  facts: PageFacts | null;
}

export interface HttpResult {
  url: string;
  finalUrl: string;
  status: number;
  statusText: string;
  hops: Hop[];
  headers: Record<string, string>;
  totalMs: number;
  ttfbMs: number;
  transferBytes: number;
  bodyBytes: number;
  tls?: TlsInfo;
}

export interface HttpSingle extends Partial<HttpResult> {
  checkedAt: string;
  method: "GET" | "HEAD";
  url: string;
  error?: { code: string; message: string };
}

export interface HttpBulk {
  checkedAt: string;
  method: "GET" | "HEAD";
  results: (Partial<HttpResult> & { url: string; error?: { code: string; message: string } })[];
}

export interface FetchTextResult {
  checkedAt: string;
  requestedUrl: string;
  finalUrl: string;
  status: number;
  hops: Hop[];
  contentType: string;
  truncated: boolean;
  text: string;
}

export interface PsiAudit {
  title: string;
  displayValue?: string;
  score: number | null;
  numericValue?: number;
}

export interface PsiField {
  overall: string | null;
  lcp: { p75: number; category: string } | null;
  inp: { p75: number; category: string } | null;
  cls: { p75: number; category: string } | null;
  fcp: { p75: number; category: string } | null;
  ttfb: { p75: number; category: string } | null;
}

export interface PsiResult {
  checkedAt: string;
  url: string;
  finalUrl: string;
  strategy: "mobile" | "desktop";
  lighthouseVersion?: string;
  scores: Record<string, number>;
  lab: Record<"fcp" | "lcp" | "tbt" | "cls" | "si" | "tti", PsiAudit | null>;
  field: PsiField | null;
  originField: PsiField | null;
  pageWeight: PsiAudit | null;
  requests: number | null;
  viewport: PsiAudit | null;
  fontSize: PsiAudit | null;
  tapTargets: PsiAudit | null;
  opportunities: { id: string; title: string; displayValue?: string; savingsMs: number }[];
  screenshot: string | null;
}

export interface IpGeo {
  ip: string;
  country: string | null;
  countryCode: string | null;
  continent: string | null;
  asn: string | null;
  asName: string | null;
  asDomain: string | null;
  provider: string;
}

export interface MyIpResult {
  ip: string | null;
  version: 4 | 6 | null;
  edge: { country: string | null; region: string | null; city: string | null };
  geo: IpGeo | null;
  providerConfigured: boolean;
}

export interface IpLookupResult {
  ip: string;
  geo?: IpGeo | null;
  private?: boolean;
  message?: string;
  providerConfigured?: boolean;
}

/* ---------- Small helpers shared by URL tools ---------- */

/** Add https:// when the user typed a bare domain, so links and labels read correctly. Validation happens server-side. */
export function displayUrl(input: string): string {
  const s = input.trim();
  if (!s) return s;
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`;
}

export function formatCheckedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "medium" });
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/** Split a pasted list into URLs: one per line (commas and spaces also separate). */
export function parseUrlList(text: string, max: number): { urls: string[]; dropped: number } {
  const all = [...new Set(text.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean))];
  return { urls: all.slice(0, max), dropped: Math.max(0, all.length - max) };
}

export function csvCell(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}
