/*
 * Pure logic for the small SEO generators: URL slugs, hreflang annotations, canonical URLs and XML sitemaps.
 * Each function is deterministic so the page examples are real outputs.
 */
import { escAttr, escXml } from "./html";

/* ======================================================================== slugs */

export const STOP_WORDS = new Set(
  "a an and are as at be but by for from how in into is it of on or so than that the this to was what when where which who why will with your you".split(" "),
);

const SPECIAL: Record<string, string> = {
  ß: "ss", æ: "ae", Æ: "ae", ø: "o", Ø: "o", œ: "oe", Œ: "oe", đ: "d", Đ: "d", ł: "l", Ł: "l", þ: "th", Þ: "th", ð: "d", Ð: "d", ı: "i", "&": " and ", "@": " at ", "+": " plus ", "%": " percent ",
};

export interface SlugOptions {
  separator: "-" | "_";
  lowercase: boolean;
  removeStopWords: boolean;
  transliterate: boolean;
  maxLength: number;
}

export const SLUG_DEFAULTS: SlugOptions = { separator: "-", lowercase: true, removeStopWords: false, transliterate: true, maxLength: 60 };

export function slugify(title: string, o: SlugOptions = SLUG_DEFAULTS): string {
  let s = title.trim();
  if (o.transliterate) {
    s = [...s].map((c) => SPECIAL[c] ?? c).join("");
    s = s.normalize("NFKD").replace(/[̀-ͯ]/g, "");
  } else {
    s = s.replace(/[&@+%]/g, (c) => SPECIAL[c]);
  }
  s = s.replace(/['’`]/g, "");
  if (o.lowercase) s = s.toLocaleLowerCase();
  // Keep letters and digits from any script (Unicode slugs are allowed in URLs); everything else separates words.
  let words = s.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  // Letters with no Latin equivalent (Cyrillic, Greek, CJK…) are kept as they are rather than dropped.
  if (o.transliterate) words = words.map((w) => w.replace(/[^\x00-\x7F]/g, "") || w);
  if (o.removeStopWords) {
    const kept = words.filter((w) => !STOP_WORDS.has(w.toLowerCase()));
    if (kept.length) words = kept;
  }
  let out = "";
  for (const w of words) {
    const next = out ? out + o.separator + w : w;
    if (o.maxLength > 0 && [...next].length > o.maxLength) {
      if (!out) out = [...w].slice(0, o.maxLength).join("");
      break;
    }
    out = next;
  }
  return out;
}

/* ======================================================================== hreflang */

export interface HreflangRow {
  code: string;
  url: string;
}

export interface HreflangIssue {
  row: number;
  message: string;
  severity: "error" | "warning";
}

const REGION_FIX: Record<string, string> = { UK: "GB", EN: "GB", EU: "", UN: "" };

let langNames: Intl.DisplayNames | null = null;
let regionNames: Intl.DisplayNames | null = null;
function names() {
  if (!langNames) {
    try {
      langNames = new Intl.DisplayNames(["en"], { type: "language", fallback: "none" });
      regionNames = new Intl.DisplayNames(["en"], { type: "region", fallback: "none" });
    } catch {
      /* very old browsers: skip name validation */
    }
  }
  return { langNames, regionNames };
}

/** Normalizes case (en-gb → en-GB, zh-hant-tw → zh-Hant-TW) and describes the code. */
export function parseHreflang(raw: string): { code: string; label: string; error?: string } {
  const input = raw.trim();
  if (input.toLowerCase() === "x-default") return { code: "x-default", label: "Default for unmatched languages" };
  if (!input) return { code: "", label: "", error: "Enter a language code." };
  if (input.includes("_")) {
    const fixed = input.replace(/_/g, "-");
    const p = parseHreflang(fixed);
    return { ...p, error: `Use a hyphen, not an underscore: ${p.code}.` };
  }
  const parts = input.split("-");
  const lang = parts[0].toLowerCase();
  let script = "";
  let region = "";
  for (const p of parts.slice(1)) {
    if (/^[a-z]{4}$/i.test(p) && !script && !region) script = p[0].toUpperCase() + p.slice(1).toLowerCase();
    else if (/^[a-z]{2}$/i.test(p) && !region) region = p.toUpperCase();
    else if (/^\d{3}$/.test(p))
      return { code: input, label: "", error: `Google supports two-letter country codes only; region numbers such as ${p} aren't supported. Use the language alone (${lang}) or one country per code.` };
    else return { code: input, label: "", error: `“${p}” isn't a valid script or region part. Use language-REGION, e.g. en-GB.` };
  }
  const code = [lang, script, region].filter(Boolean).join("-");
  if (!/^[a-z]{2}$/.test(lang)) return { code, label: "", error: `“${parts[0]}” isn't a two-letter ISO 639-1 language code. Google expects codes such as en, fr or de.` };
  if (region && region in REGION_FIX) {
    const fix = REGION_FIX[region];
    return { code, label: "", error: fix ? `${region} isn't an ISO 3166-1 country code. Use ${lang}-${fix}.` : `${region} isn't a country code. Use a country such as ${lang}-DE, or the language alone.` };
  }
  const { langNames: ln, regionNames: rn } = names();
  const langName = ln?.of(lang);
  if (ln && (!langName || langName === lang)) return { code, label: "", error: `“${lang}” isn't a recognized language code.` };
  let regionName = "";
  if (region) {
    regionName = rn?.of(region) ?? region;
    if (rn && (!regionName || regionName === region)) return { code, label: "", error: `“${region}” isn't a recognized country code.` };
  }
  const label = `${langName ?? lang}${script ? ` (${script})` : ""}${regionName ? `, ${regionName}` : ""}`;
  return { code, label };
}

export function validateHreflang(rows: HreflangRow[]): HreflangIssue[] {
  const out: HreflangIssue[] = [];
  const seen = new Map<string, number>();
  const urls = new Map<string, number>();
  let hasDefault = false;
  rows.forEach((r, i) => {
    if (!r.code.trim() && !r.url.trim()) return;
    const p = parseHreflang(r.code);
    if (p.error) out.push({ row: i, severity: "error", message: p.error });
    if (p.code === "x-default") hasDefault = true;
    if (p.code && seen.has(p.code.toLowerCase())) out.push({ row: i, severity: "error", message: `${p.code} is listed twice (row ${(seen.get(p.code.toLowerCase()) ?? 0) + 1}). Each code may point to one URL only.` });
    seen.set(p.code.toLowerCase(), i);
    try {
      const u = new URL(r.url.trim());
      if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
    } catch {
      out.push({ row: i, severity: "error", message: "Enter an absolute URL starting with https://." });
    }
    const key = r.url.trim();
    if (key && urls.has(key) && p.code !== "x-default" && rows[urls.get(key)!] && parseHreflang(rows[urls.get(key)!].code).code !== "x-default")
      out.push({ row: i, severity: "warning", message: `Same URL as row ${urls.get(key)! + 1}. That's fine for a shared page (e.g. en and en-GB), but check it's intended.` });
    if (key && !urls.has(key)) urls.set(key, i);
  });
  const filled = rows.filter((r) => r.code.trim() || r.url.trim());
  if (filled.length && !hasDefault) out.push({ row: -1, severity: "warning", message: "No x-default. Add one for visitors whose language you don't target (often the homepage or a language picker)." });
  const regions = filled.map((r) => parseHreflang(r.code)).filter((p) => /-[A-Z]{2}$/.test(p.code));
  for (const p of regions) {
    const lang = p.code.split("-")[0];
    if (!filled.some((r) => parseHreflang(r.code).code === lang) && regions.filter((x) => x.code.startsWith(lang + "-")).length > 1) {
      out.push({ row: -1, severity: "warning", message: `Several ${lang}- regions but no plain “${lang}”. Consider one as the fallback for other ${lang} speakers.` });
      break;
    }
  }
  return out;
}

export type HreflangFormat = "html" | "sitemap" | "header";

export function buildHreflang(rows: HreflangRow[], format: HreflangFormat): string {
  const items = rows.map((r) => ({ code: parseHreflang(r.code).code, url: r.url.trim() })).filter((r) => r.code && r.url);
  if (!items.length) return "";
  if (format === "html") return items.map((r) => `<link rel="alternate" hreflang="${escAttr(r.code)}" href="${escAttr(r.url)}">`).join("\n");
  if (format === "header") return "Link: " + items.map((r) => `<${r.url}>; rel="alternate"; hreflang="${r.code}"`).join(",\n      ");
  const alts = items.map((r) => `    <xhtml:link rel="alternate" hreflang="${escXml(r.code)}" href="${escXml(r.url)}"/>`).join("\n");
  const pages = [...new Set(items.filter((r) => r.code !== "x-default").map((r) => r.url))];
  const body = pages.map((u) => `  <url>\n    <loc>${escXml(u)}</loc>\n${alts}\n  </url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${body}\n</urlset>`;
}

/* ======================================================================== canonical */

export interface CanonicalOptions {
  https: boolean;
  www: "keep" | "add" | "remove";
  trailingSlash: "keep" | "add" | "remove";
  params: "tracking" | "all" | "keep";
  keepParams: string;
  lowercasePath: boolean;
  removeIndex: boolean;
}

export const CANONICAL_DEFAULTS: CanonicalOptions = { https: true, www: "keep", trailingSlash: "keep", params: "tracking", keepParams: "", lowercasePath: false, removeIndex: true };

const TRACKING = /^(utm_[a-z_]+|gclid|gbraid|wbraid|dclid|fbclid|msclkid|mc_cid|mc_eid|_ga|_gl|igshid|yclid|twclid|ttclid|li_fat_id|ref_src|srsltid|_hsenc|_hsmi|mkt_tok)$/i;

export function canonicalize(input: string, o: CanonicalOptions = CANONICAL_DEFAULTS): { url: string; changes: string[]; error?: string } {
  const raw = input.trim();
  if (!raw) return { url: "", changes: [] };
  let u: URL;
  try {
    u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return { url: "", changes: [], error: "Not a valid URL." };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return { url: "", changes: [], error: "Only http and https URLs can be canonical." };
  const changes: string[] = [];
  if (o.https && u.protocol === "http:") {
    u.protocol = "https:";
    changes.push("http → https");
  }
  if (u.port && ((u.protocol === "https:" && u.port === "443") || (u.protocol === "http:" && u.port === "80"))) u.port = "";
  if (o.www === "add" && !u.hostname.startsWith("www.") && u.hostname.split(".").length === 2) {
    u.hostname = "www." + u.hostname;
    changes.push("added www");
  }
  if (o.www === "remove" && u.hostname.startsWith("www.")) {
    u.hostname = u.hostname.slice(4);
    changes.push("removed www");
  }
  if (u.hash) {
    u.hash = "";
    changes.push("removed #fragment");
  }
  const keep = new Set(o.keepParams.split(/[\s,]+/).map((s) => s.trim().toLowerCase()).filter(Boolean));
  const removed: string[] = [];
  for (const k of [...new Set([...u.searchParams.keys()])]) {
    const drop = o.params === "all" ? !keep.has(k.toLowerCase()) : o.params === "tracking" ? TRACKING.test(k) && !keep.has(k.toLowerCase()) : false;
    if (drop) {
      u.searchParams.delete(k);
      removed.push(k);
    }
  }
  if (removed.length) changes.push(`removed ${removed.join(", ")}`);
  if (o.removeIndex && /\/(index|default)\.(html?|php|aspx?)$/i.test(u.pathname)) {
    u.pathname = u.pathname.replace(/(index|default)\.(html?|php|aspx?)$/i, "");
    changes.push("removed index file");
  }
  if (o.lowercasePath && u.pathname !== u.pathname.toLowerCase()) {
    u.pathname = u.pathname.toLowerCase();
    changes.push("lowercased path");
  }
  const last = u.pathname.split("/").pop() ?? "";
  const isFile = /\.[a-z0-9]{1,5}$/i.test(last);
  if (o.trailingSlash === "add" && !u.pathname.endsWith("/") && !isFile) {
    u.pathname += "/";
    changes.push("added trailing slash");
  }
  if (o.trailingSlash === "remove" && u.pathname.length > 1 && u.pathname.endsWith("/")) {
    u.pathname = u.pathname.replace(/\/+$/, "");
    changes.push("removed trailing slash");
  }
  let out = u.toString();
  if (out.endsWith("?")) out = out.slice(0, -1);
  return { url: out, changes };
}

export function canonicalTag(url: string): string {
  return `<link rel="canonical" href="${escAttr(url)}">`;
}

export function canonicalHeader(url: string): string {
  return `Link: <${url}>; rel="canonical"`;
}

/* ======================================================================== XML sitemap */

export interface SitemapOptions {
  lastmod: "none" | "today" | "column";
  today: string;
  changefreq: "" | "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: string;
}

export interface SitemapResult {
  files: { name: string; xml: string; count: number }[];
  index: string | null;
  accepted: number;
  skipped: { line: number; text: string; reason: string }[];
  duplicates: number;
  hosts: string[];
}

export const SITEMAP_LIMIT = 50_000;

export function buildSitemap(text: string, o: SitemapOptions, baseUrl = "https://www.example.com/"): SitemapResult {
  const seen = new Set<string>();
  const entries: { loc: string; lastmod?: string }[] = [];
  const skipped: SitemapResult["skipped"] = [];
  let duplicates = 0;
  text.split(/\r?\n/).forEach((line, i) => {
    const t = line.trim();
    if (!t || t.startsWith("#")) return;
    const [first, second] = t.split(/[\t,; ]+/);
    let u: URL;
    try {
      u = new URL(first);
      if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error();
    } catch {
      skipped.push({ line: i + 1, text: t.slice(0, 120), reason: "Not an absolute http(s) URL" });
      return;
    }
    u.hash = "";
    const loc = u.toString();
    if (seen.has(loc)) {
      duplicates++;
      return;
    }
    seen.add(loc);
    let lastmod: string | undefined;
    if (o.lastmod === "today") lastmod = o.today;
    if (o.lastmod === "column" && second) {
      if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2}))?$/.test(second)) lastmod = second;
      else skipped.push({ line: i + 1, text: second, reason: "Date ignored (use YYYY-MM-DD); URL kept" });
    }
    entries.push({ loc, lastmod });
  });
  const hosts = [...new Set(entries.map((e) => new URL(e.loc).host))];
  const urlXml = (e: { loc: string; lastmod?: string }) =>
    [
      "  <url>",
      `    <loc>${escXml(e.loc)}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : "",
      o.changefreq ? `    <changefreq>${o.changefreq}</changefreq>` : "",
      o.priority ? `    <priority>${o.priority}</priority>` : "",
      "  </url>",
    ]
      .filter(Boolean)
      .join("\n");
  const wrap = (list: typeof entries) => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${list.map(urlXml).join("\n")}\n</urlset>\n`;
  const files: SitemapResult["files"] = [];
  if (entries.length <= SITEMAP_LIMIT) files.push({ name: "sitemap.xml", xml: wrap(entries), count: entries.length });
  else for (let i = 0; i < entries.length; i += SITEMAP_LIMIT) files.push({ name: `sitemap-${files.length + 1}.xml`, xml: wrap(entries.slice(i, i + SITEMAP_LIMIT)), count: Math.min(SITEMAP_LIMIT, entries.length - i) });
  let index: string | null = null;
  if (files.length > 1) {
    const origin = entries.length ? new URL(entries[0].loc).origin + "/" : baseUrl;
    index = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${files.map((f) => `  <sitemap>\n    <loc>${escXml(new URL(f.name, origin).toString())}</loc>${o.lastmod === "today" ? `\n    <lastmod>${o.today}</lastmod>` : ""}\n  </sitemap>`).join("\n")}\n</sitemapindex>\n`;
  }
  return { files, index, accepted: entries.length, skipped, duplicates, hosts };
}
