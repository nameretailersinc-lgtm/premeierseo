/** Brand and entity constants. Every place that names the site imports from here. */
export const SITE = {
  name: "Premier SEO Services",
  origin: "https://premierseoservices.com",
  email: "info@premierseoservices.com",
  foundingYear: "2025",
  locale: "en_US",
  language: "en",
  description:
    "Free online tools for text, SEO, images, PDFs, code and everyday calculations. Most tools run in your browser.",
} as const;

/** Absolute canonical URL for a site path. Always lowercase with a trailing slash for pages. */
export function absUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  const isFile = /\.[a-z0-9]{2,5}$/i.test(p);
  const withSlash = isFile || p.endsWith("/") ? p : `${p}/`;
  return `${SITE.origin}${withSlash}`;
}

/** Content dates are real edit dates, not build dates. */
export const CONTENT_LAST_REVIEWED = "2026-09-30";
