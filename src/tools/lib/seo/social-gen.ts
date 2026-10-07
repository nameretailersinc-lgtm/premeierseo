/* Open Graph and X (Twitter) card tag builders. Pure functions; the page examples are their real output. */
import { clean, escAttr, isAbsoluteHttpUrl, metaName, metaProp } from "./html";
import { handle } from "./meta-gen";

export const OG_TYPES = ["website", "article", "profile", "book", "video.other"] as const;
export type OgType = (typeof OG_TYPES)[number];

export interface OgInput {
  type: OgType;
  title: string;
  description: string;
  url: string;
  image: string;
  imageAlt: string;
  imageWidth: string;
  imageHeight: string;
  siteName: string;
  locale: string;
  published: string;
  modified: string;
  author: string;
  section: string;
  tags: string;
}

export const OG_DEFAULTS: OgInput = {
  type: "website",
  title: "",
  description: "",
  url: "",
  image: "",
  imageAlt: "",
  imageWidth: "",
  imageHeight: "",
  siteName: "",
  locale: "",
  published: "",
  modified: "",
  author: "",
  section: "",
  tags: "",
};

/** Accepts yyyy-mm-dd or a full ISO 8601 date-time; returns "" for anything else. */
export function isoDate(s: string): string {
  const v = clean(s);
  if (!v) return "";
  return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/.test(v) ? v : "";
}

export function buildOgTags(i: OgInput): { code: string; warnings: string[] } {
  const out: string[] = [];
  const warnings: string[] = [];
  const add = (p: string, v: string) => {
    if (clean(v)) out.push(metaProp(p, v));
  };
  add("og:type", i.type);
  add("og:title", i.title);
  add("og:description", i.description);
  add("og:url", i.url);
  add("og:image", i.image);
  add("og:image:alt", i.imageAlt);
  if (/^\d+$/.test(clean(i.imageWidth))) add("og:image:width", clean(i.imageWidth));
  if (/^\d+$/.test(clean(i.imageHeight))) add("og:image:height", clean(i.imageHeight));
  add("og:site_name", i.siteName);
  if (clean(i.locale)) {
    const loc = clean(i.locale).replace("-", "_");
    if (!/^[a-z]{2}_[A-Z]{2}$/.test(loc)) warnings.push("og:locale uses the language_TERRITORY form, such as en_US or fr_FR.");
    add("og:locale", loc);
  }
  if (i.type === "article") {
    const pub = isoDate(i.published);
    const mod = isoDate(i.modified);
    if (clean(i.published) && !pub) warnings.push("Published time must be an ISO 8601 date, such as 2026-09-12 or 2026-09-12T08:00:00Z.");
    if (clean(i.modified) && !mod) warnings.push("Modified time must be an ISO 8601 date.");
    add("article:published_time", pub);
    add("article:modified_time", mod);
    add("article:author", i.author);
    add("article:section", i.section);
    for (const t of i.tags.split(",").map((x) => clean(x)).filter(Boolean)) out.push(metaProp("article:tag", t));
  }
  if (!clean(i.title)) warnings.push("og:title is required.");
  if (!clean(i.image)) warnings.push("og:image is required by the Open Graph protocol, and links without one get a small or empty preview.");
  else if (!isAbsoluteHttpUrl(i.image)) warnings.push("og:image must be a full URL starting with https://.");
  if (clean(i.url) && !isAbsoluteHttpUrl(i.url)) warnings.push("og:url must be a full URL starting with https://.");
  if (!clean(i.url)) warnings.push("og:url is required by the protocol; use the page's canonical URL.");
  const w = Number(i.imageWidth);
  const h = Number(i.imageHeight);
  if (w && h && (w < 600 || h < 315)) warnings.push("Images smaller than 600 × 315 px are shown as a small thumbnail on Facebook.");
  return { code: out.join("\n"), warnings };
}

export type CardType = "summary_large_image" | "summary";

export interface CardInput {
  card: CardType;
  site: string;
  creator: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  /** true: the page already has og: tags, so text and image come from Open Graph. */
  hasOg: boolean;
}

export const CARD_DEFAULTS: CardInput = { card: "summary_large_image", site: "", creator: "", title: "", description: "", image: "", imageAlt: "", hasOg: false };

export function buildCardTags(i: CardInput): { code: string; warnings: string[]; fallbacks: string[] } {
  const out: string[] = [metaName("twitter:card", i.card)];
  const warnings: string[] = [];
  const fallbacks: string[] = [];
  const s = handle(i.site);
  const c = handle(i.creator);
  if (s) out.push(metaName("twitter:site", s));
  if (c) out.push(metaName("twitter:creator", c));
  if (i.hasOg) {
    fallbacks.push("twitter:title ← og:title", "twitter:description ← og:description", "twitter:image ← og:image");
    if (clean(i.imageAlt)) out.push(metaName("twitter:image:alt", i.imageAlt));
  } else {
    if (clean(i.title)) out.push(metaName("twitter:title", i.title));
    if (clean(i.description)) out.push(metaName("twitter:description", i.description));
    if (clean(i.image)) out.push(`<meta name="twitter:image" content="${escAttr(clean(i.image))}">`);
    if (clean(i.imageAlt)) out.push(metaName("twitter:image:alt", i.imageAlt));
    if (!clean(i.title)) warnings.push("twitter:title is required when the page has no og:title.");
    if (clean(i.image) && !isAbsoluteHttpUrl(i.image)) warnings.push("twitter:image must be a full URL starting with https://.");
  }
  if ([...clean(i.title)].length > 70) warnings.push("X truncates titles longer than 70 characters.");
  if ([...clean(i.description)].length > 200) warnings.push("X truncates descriptions longer than 200 characters.");
  return { code: out.join("\n"), warnings, fallbacks };
}
