/**
 * Blog post model shared by the admin editor (client) and the public blog pages (server).
 * Posts are written from /admin/ and stored in MongoDB by src/lib/server/blog-store.ts.
 */

export type PostStatus = "draft" | "published";
export type SchemaType = "BlogPosting" | "Article" | "NewsArticle" | "TechArticle";

export interface BlogImage {
  /** Site path (e.g. /media/uploads/abc.webp) or absolute URL. */
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface BlogFaq {
  q: string;
  a: string;
}

export interface BlogSeo {
  /** <title>. Falls back to the post title. */
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  secondaryKeywords: string[];
  /** Absolute URL when this post is a copy of a page elsewhere; empty = self-canonical. */
  canonicalUrl: string;
  noindex: boolean;
  nofollow: boolean;
  ogTitle: string;
  ogDescription: string;
  /** Social share image; falls back to the featured image, then a generated card. */
  ogImage: BlogImage | null;
  twitterTitle: string;
  twitterDescription: string;
  schemaType: SchemaType;
}

export interface BlogPost {
  id: string;
  slug: string;
  status: PostStatus;
  /** Visible H1. */
  title: string;
  /** Short summary shown on cards and in the "In short" box. */
  excerpt: string;
  /** Markdown body: ## / ### headings, lists, tables, > quotes, ``` code, ![alt](src "caption") images, [links](url). */
  content: string;
  category: string;
  tags: string[];
  authorName: string;
  authorUrl: string;
  featuredImage: BlogImage | null;
  seo: BlogSeo;
  faqs: BlogFaq[];
  /** Tool ids shown in the "Tools used in this post" sidebar. */
  relatedTools: string[];
  /** ISO date-time. Set on first publish; editable. */
  datePublished: string;
  dateModified: string;
  createdAt: string;
}

export const LIMITS = {
  title: [20, 70],
  metaTitle: [30, 60],
  metaDescription: [120, 160],
  slug: 75,
  excerpt: 300,
  ogTitle: 95,
  ogDescription: 200,
  imageBytes: 5 * 1024 * 1024,
} as const;

export const SCHEMA_TYPES: SchemaType[] = ["BlogPosting", "Article", "NewsArticle", "TechArticle"];

export function emptySeo(): BlogSeo {
  return {
    metaTitle: "",
    metaDescription: "",
    focusKeyword: "",
    secondaryKeywords: [],
    canonicalUrl: "",
    noindex: false,
    nofollow: false,
    ogTitle: "",
    ogDescription: "",
    ogImage: null,
    twitterTitle: "",
    twitterDescription: "",
    schemaType: "BlogPosting",
  };
}

export function slugifyPost(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, LIMITS.slug)
    .replace(/-+$/g, "");
}

/** Heading text → anchor id (matches the ids the Markdown renderer gives ## headings). */
export function headingId(s: string): string {
  return s
    .toLowerCase()
    .replace(/[`*_[\]()]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Strip markdown to plain text (for word counts, keyword checks and fallbacks). */
export function plainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s*\|?[\s:|-]+\|?\s*$/gm, " ")
    .replace(/[#*`>|_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function wordCount(md: string): number {
  return plainText(md).split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/** 238 wpm: average adult silent reading rate for non-fiction (Brysbaert 2019). */
export function readingMinutes(md: string): number {
  return Math.max(1, Math.ceil(wordCount(md) / 238));
}

export function headingsOf(md: string): { level: 2 | 3; text: string; id: string }[] {
  const out: { level: 2 | 3; text: string; id: string }[] = [];
  let inCode = false;
  for (const line of md.replace(/\r\n/g, "\n").split("\n")) {
    if (line.startsWith("```")) inCode = !inCode;
    if (inCode) continue;
    const m = /^(#{2,3})\s+(.+?)\s*#*$/.exec(line);
    if (m) out.push({ level: m[1].length as 2 | 3, text: m[2], id: headingId(m[2]) });
  }
  return out;
}

export function imagesOf(md: string): { alt: string; src: string }[] {
  return [...md.matchAll(/!\[([^\]]*)\]\(([^)\s]+)/g)].map((m) => ({ alt: m[1], src: m[2] }));
}

export function postPath(slug: string): string {
  return `/blog/${slug}/`;
}

export function effectiveMetaTitle(p: Pick<BlogPost, "title" | "seo">): string {
  return (p.seo.metaTitle || p.title).trim();
}

export function effectiveDescription(p: Pick<BlogPost, "excerpt" | "content" | "seo">): string {
  const d = p.seo.metaDescription || p.excerpt || plainText(p.content).slice(0, 155);
  return d.trim();
}

export interface SeoCheck {
  id: string;
  label: string;
  status: "good" | "warn" | "bad";
}

/** Live on-page checks for the editor. Rules follow common on-page practice, not a ranking formula. */
export function seoChecks(p: BlogPost): SeoCheck[] {
  const kw = p.seo.focusKeyword.trim().toLowerCase();
  const title = effectiveMetaTitle(p);
  const desc = effectiveDescription(p);
  const text = plainText(p.content).toLowerCase();
  const words = wordCount(p.content);
  const heads = headingsOf(p.content);
  const imgs = imagesOf(p.content);
  const first = text.split(/\s+/).slice(0, 100).join(" ");
  const links = [...p.content.matchAll(/(?<!!)\[[^\]]+\]\(([^)\s]+)/g)].map((m) => m[1]);
  const internal = links.filter((h) => h.startsWith("/") || h.includes("premierseoservices.com"));
  const external = links.filter((h) => /^https?:\/\//.test(h) && !h.includes("premierseoservices.com"));
  const between = (n: number, [a, b]: readonly [number, number]) => n >= a && n <= b;
  const c: SeoCheck[] = [];
  const add = (id: string, ok: boolean | "warn", label: string) => c.push({ id, label, status: ok === true ? "good" : ok === "warn" ? "warn" : "bad" });

  add("kw", !!kw, kw ? `Focus keyword set: “${p.seo.focusKeyword}”` : "Set a focus keyword");
  add("title-len", between(title.length, LIMITS.metaTitle) || (title.length > 0 && title.length <= 65 ? "warn" : false), `SEO title is ${title.length} characters (aim for 30–60)`);
  add("desc-len", between(desc.length, LIMITS.metaDescription) || (desc.length >= 70 ? "warn" : false), `Meta description is ${desc.length} characters (aim for 120–160)`);
  if (kw) {
    add("kw-title", title.toLowerCase().includes(kw), "Focus keyword in SEO title");
    add("kw-desc", desc.toLowerCase().includes(kw), "Focus keyword in meta description");
    add("kw-slug", p.slug.includes(slugifyPost(kw)) || "warn", "Focus keyword in URL slug");
    add("kw-h1", p.title.toLowerCase().includes(kw) || "warn", "Focus keyword in H1 title");
    add("kw-intro", first.includes(kw) || "warn", "Focus keyword in the first 100 words");
    add("kw-heading", heads.some((h) => h.text.toLowerCase().includes(kw)) || "warn", "Focus keyword in at least one subheading");
    const hits = text.split(kw).length - 1;
    const density = words ? (hits * kw.split(/\s+/).length * 100) / words : 0;
    add("kw-density", density >= 0.5 && density <= 2.5 ? true : hits > 0 ? "warn" : false, `Keyword density ${density.toFixed(1)}% (${hits}×; aim for 0.5–2.5%)`);
  }
  add("slug", p.slug.length > 0 && p.slug.length <= 60 ? true : p.slug.length > 0 ? "warn" : false, `URL slug is ${p.slug.length} characters${p.slug.length > 60 ? " (shorter is better)" : ""}`);
  add("words", words >= 600 || (words >= 300 ? "warn" : false), `${words} words of content (600+ recommended)`);
  add("headings", heads.filter((h) => h.level === 2).length >= 2 || (heads.length ? "warn" : false), `${heads.length} subheadings (use ## for sections)`);
  add("featured", !!p.featuredImage?.src, p.featuredImage?.src ? "Featured image set" : "Add a featured image");
  add("featured-alt", !p.featuredImage?.src || !!p.featuredImage.alt.trim(), "Featured image has alt text");
  add("img-alt", imgs.every((i) => i.alt.trim()), imgs.length ? `${imgs.filter((i) => i.alt.trim()).length}/${imgs.length} body images have alt text` : "No body images (optional)");
  add("internal", internal.length > 0 || "warn", `${internal.length} internal links`);
  add("external", external.length > 0 || "warn", `${external.length} outbound links to sources`);
  add("excerpt", !!p.excerpt.trim() || "warn", "Excerpt / summary written");
  add("index", !p.seo.noindex || "warn", p.seo.noindex ? "Post is set to noindex" : "Post is indexable");
  return c;
}

export function seoScore(checks: SeoCheck[]): number {
  if (!checks.length) return 0;
  const pts = checks.reduce((n, c) => n + (c.status === "good" ? 1 : c.status === "warn" ? 0.5 : 0), 0);
  return Math.round((pts / checks.length) * 100);
}
