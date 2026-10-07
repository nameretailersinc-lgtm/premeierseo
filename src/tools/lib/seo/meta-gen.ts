/* Builds <head> tags for the meta tag generator. Pure function so the page example is the real output. */
import { clean, escAttr, escText, isAbsoluteHttpUrl, metaName, metaProp } from "./html";

export interface MetaInput {
  title: string;
  description: string;
  canonical: string;
  index: boolean;
  follow: boolean;
  largeImagePreview: boolean;
  viewport: boolean;
  charset: boolean;
  og: boolean;
  ogType: "website" | "article";
  image: string;
  siteName: string;
  twitter: boolean;
  twitterCard: "summary" | "summary_large_image";
  twitterSite: string;
  themeColor: string;
  legacy: boolean;
  keywords: string;
  revisitAfter: string;
}

export const META_DEFAULTS: MetaInput = {
  title: "",
  description: "",
  canonical: "",
  index: true,
  follow: true,
  largeImagePreview: false,
  viewport: true,
  charset: true,
  og: true,
  ogType: "website",
  image: "",
  siteName: "",
  twitter: true,
  twitterCard: "summary_large_image",
  twitterSite: "",
  themeColor: "",
  legacy: false,
  keywords: "",
  revisitAfter: "",
};

export function handle(s: string): string {
  const h = clean(s).replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//i, "").replace(/^@+/, "").replace(/\/.*$/, "");
  return h ? `@${h}` : "";
}

export function buildMetaTags(i: MetaInput): { code: string; warnings: string[] } {
  const out: string[] = [];
  const warnings: string[] = [];
  const title = clean(i.title);
  const desc = clean(i.description);
  if (i.charset) out.push('<meta charset="utf-8">');
  if (i.viewport) out.push('<meta name="viewport" content="width=device-width, initial-scale=1">');
  if (title) out.push(`<title>${escText(title)}</title>`);
  if (desc) out.push(metaName("description", desc));
  const robots = [i.index ? "" : "noindex", i.follow ? "" : "nofollow", i.largeImagePreview && i.index ? "max-image-preview:large" : ""].filter(Boolean);
  if (robots.length) out.push(metaName("robots", robots.join(", ")));
  const canonical = clean(i.canonical);
  if (canonical) {
    if (!isAbsoluteHttpUrl(canonical)) warnings.push("The canonical URL should be absolute, starting with https://.");
    out.push(`<link rel="canonical" href="${escAttr(canonical)}">`);
  }
  if (!i.index && canonical) warnings.push("noindex together with a canonical sends mixed signals. Use one or the other.");
  if (i.og) {
    if (title) out.push(metaProp("og:title", title));
    if (desc) out.push(metaProp("og:description", desc));
    out.push(metaProp("og:type", i.ogType));
    if (canonical) out.push(metaProp("og:url", canonical));
    if (clean(i.image)) {
      if (!isAbsoluteHttpUrl(i.image)) warnings.push("og:image must be a full URL starting with https://.");
      out.push(metaProp("og:image", i.image));
    }
    if (clean(i.siteName)) out.push(metaProp("og:site_name", i.siteName));
  }
  if (i.twitter) {
    out.push(metaName("twitter:card", i.twitterCard));
    const h = handle(i.twitterSite);
    if (h) out.push(metaName("twitter:site", h));
    if (!i.og) {
      if (title) out.push(metaName("twitter:title", title));
      if (desc) out.push(metaName("twitter:description", desc));
      if (clean(i.image)) out.push(metaName("twitter:image", i.image));
    }
  }
  if (clean(i.themeColor)) out.push(metaName("theme-color", i.themeColor));
  if (i.legacy) {
    const legacy: string[] = [];
    if (clean(i.keywords)) legacy.push(metaName("keywords", i.keywords));
    if (clean(i.revisitAfter)) legacy.push(metaName("revisit-after", i.revisitAfter));
    if (legacy.length) out.push("<!-- Legacy tags: ignored by Google -->", ...legacy);
  }
  if (!title) warnings.push("Add a title: it's the one tag every page needs.");
  return { code: out.join("\n"), warnings };
}
