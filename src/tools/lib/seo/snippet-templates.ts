/*
 * Title and meta description suggestion templates. Deterministic: the same input always gives the same list,
 * in the same order. These are fill-in-the-blank patterns, not generated text, and the page says so.
 */
import { descriptionVerdict, titleVerdict } from "./pixels";

export type PageType = "article" | "product" | "tool" | "service" | "local" | "category" | "home";

export const PAGE_TYPES: { value: PageType; label: string }[] = [
  { value: "article", label: "Article or guide" },
  { value: "product", label: "Product" },
  { value: "category", label: "Category or collection" },
  { value: "service", label: "Service" },
  { value: "local", label: "Local business" },
  { value: "tool", label: "Online tool or app" },
  { value: "home", label: "Homepage" },
];

export interface SnippetInput {
  keyword: string;
  detail: string;
  brand: string;
  location: string;
  pageType: PageType;
  cta?: string;
}

const tidy = (s: string) => s.replace(/\s+/g, " ").trim().replace(/[.!?;:,–—-]+$/, "").trim();
const cap = (s: string) => (s ? s[0].toLocaleUpperCase() + s.slice(1) : s);
const low = (s: string) => (s && !/^[A-Z]{2,}/.test(s) ? s[0].toLocaleLowerCase() + s.slice(1) : s);

const SMALL = new Set("a an and as at but by for in of on or the to vs via with".split(" "));
/** Title Case for keywords in titles; words already containing capitals (iPhone, SEO) are left alone. */
export function titleCase(s: string): string {
  return s
    .split(" ")
    .map((w, i) => (/[A-Z]/.test(w) ? w : i > 0 && SMALL.has(w) ? w : cap(w)))
    .join(" ");
}

function fill(tpl: string, v: Record<string, string>, titleCaseKeyword = false): string | null {
  let missing = false;
  const out = tpl.replace(/\{(\w+)\}/g, (_, k: string) => {
    const key = k.toLowerCase();
    let raw = v[key] ?? "";
    if (!raw) missing = true;
    if (titleCaseKeyword && key === "keyword" && k[0] === "K") raw = titleCase(raw);
    if (k === k.toUpperCase()) return cap(raw);
    return k[0] === k[0].toUpperCase() ? cap(raw) : low(raw);
  });
  return missing ? null : out.replace(/\s+/g, " ").trim();
}

const TITLE_TEMPLATES: Record<PageType, string[]> = {
  article: ["{Keyword}: {Detail}", "What Is {Keyword}? {Detail}", "{Keyword} Explained, With Examples", "{Keyword}: {Detail} | {Brand}", "A Practical Guide to {Keyword}", "{Keyword} in {Location}: {Detail}"],
  product: ["{Keyword} – {Detail} | {Brand}", "{Keyword}: {Detail}", "Buy {Keyword} | {Brand}", "{Keyword} | {Brand}", "{Keyword} in {Location} – {Detail}"],
  category: ["{Keyword} – {Detail} | {Brand}", "Shop {Keyword} | {Brand}", "{Keyword}: {Detail}", "{Keyword} | {Brand}"],
  service: ["{Keyword} – {Detail} | {Brand}", "{Keyword} in {Location} | {Brand}", "{Keyword}: {Detail}", "{Keyword} | {Brand}", "{Keyword} in {Location} – {Detail}"],
  local: ["{Keyword} in {Location} | {Brand}", "{Brand} – {Keyword} in {Location}", "{Keyword} in {Location}: {Detail}", "{Keyword} – {Detail} | {Brand}"],
  tool: ["{Keyword} – {Detail}", "{Keyword}: {Detail}", "Free {Keyword} – {Detail}", "{Keyword} Online | {Brand}", "{Keyword} – {Detail} | {Brand}"],
  home: ["{Brand} – {Detail}", "{Brand} | {Keyword}", "{Keyword} – {Detail} | {Brand}", "{Brand}: {Keyword} in {Location}"],
};

const DESC_TEMPLATES: Record<PageType, string[]> = {
  article: ["{Detail}. {Cta}.", "{Keyword}: {detail}. {Cta}.", "A guide to {keyword}: {detail}. {Cta}.", "{Detail}, with examples. {Cta} on {Brand}."],
  product: ["{Detail}. {Cta} at {Brand}.", "Shop {keyword} at {Brand}. {Detail}. {Cta}.", "{Keyword}: {detail}. {Cta}.", "{Keyword} from {Brand} – {detail}. {Cta}."],
  category: ["Browse {keyword} at {Brand}. {Detail}. {Cta}.", "{Keyword}: {detail}. {Cta}.", "{Detail}. {Cta} at {Brand}."],
  service: ["{Brand} provides {keyword}: {detail}. {Cta}.", "{Keyword} in {Location}: {detail}. {Cta}.", "{Detail}. {Cta} with {Brand}.", "Need {keyword}? {Detail}. {Cta}."],
  local: ["{Brand} offers {keyword} in {Location}. {Detail}. {Cta}.", "Looking for {keyword} in {Location}? {Detail}. {Cta}.", "{Keyword} in {Location} – {detail}. {Cta}."],
  tool: ["{Detail}. {Cta}.", "Use this {keyword} to {detail}. {Cta}.", "{Keyword}: {detail}. Free, no sign-up. {Cta}."],
  home: ["{Brand}: {detail}. {Cta}.", "{Brand} – {keyword}. {Detail}. {Cta}.", "{Detail}. {Cta} at {Brand}."],
};

export interface Suggestion {
  text: string;
  chars: number;
  px: number;
  verdict: "empty" | "short" | "good" | "long";
}

function vars(i: SnippetInput): Record<string, string> {
  return { keyword: tidy(i.keyword), detail: tidy(i.detail), brand: tidy(i.brand), location: tidy(i.location), cta: tidy(i.cta ?? "") };
}

export function titleSuggestions(i: SnippetInput): Suggestion[] {
  const v = vars(i);
  if (!v.keyword) return [];
  const seen = new Set<string>();
  const out: Suggestion[] = [];
  for (const t of TITLE_TEMPLATES[i.pageType]) {
    const s = fill(t, v, true);
    if (!s || seen.has(s.toLowerCase())) continue;
    seen.add(s.toLowerCase());
    const m = titleVerdict(s);
    out.push({ text: s, chars: m.chars, px: m.px, verdict: m.verdict });
  }
  return out;
}

export function descriptionSuggestions(i: SnippetInput): Suggestion[] {
  const v = vars(i);
  if (!v.keyword || !v.detail) return [];
  if (!v.cta) v.cta = "Find out more";
  const seen = new Set<string>();
  const out: Suggestion[] = [];
  for (const t of DESC_TEMPLATES[i.pageType]) {
    const s = fill(t, v);
    if (!s) continue;
    const clean = s.replace(/\.\s*\./g, ".").replace(/\s+([.,])/g, "$1");
    if (seen.has(clean.toLowerCase())) continue;
    seen.add(clean.toLowerCase());
    const m = descriptionVerdict(clean);
    out.push({ text: clean, chars: m.chars, px: m.px, verdict: m.verdict });
  }
  return out;
}
