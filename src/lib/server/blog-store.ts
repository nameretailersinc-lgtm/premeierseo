import "server-only";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getTool } from "@/content/tools";
import {
  LIMITS,
  SCHEMA_TYPES,
  emptySeo,
  slugifyPost,
  type BlogFaq,
  type BlogImage,
  type BlogPost,
  type BlogSeo,
  type SchemaType,
} from "@/lib/blog-types";

/*
 * File-backed blog store: DATA_DIR/posts.json plus DATA_DIR/uploads/ for images.
 * In Docker, DATA_DIR (/app/data) is a named volume so posts survive rebuilds and deploys.
 * Writes are serialised in-process and replace the file atomically (write temp + rename).
 */

export const DATA_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.BLOG_DATA_DIR || path.join(process.cwd(), "data"));
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const FILE = path.join(DATA_DIR, "posts.json");

let cache: { mtime: number; posts: BlogPost[] } | null = null;
let queue: Promise<unknown> = Promise.resolve();

async function readAll(): Promise<BlogPost[]> {
  try {
    const st = await fs.stat(FILE);
    if (cache && cache.mtime === st.mtimeMs) return cache.posts;
    const raw = JSON.parse(await fs.readFile(FILE, "utf8")) as { posts?: unknown[] };
    const posts = (raw.posts ?? []).map((p) => normalize(p as Partial<BlogPost>));
    cache = { mtime: st.mtimeMs, posts };
    return posts;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}

async function writeAll(posts: BlogPost[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${FILE}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify({ version: 1, posts }, null, 2), "utf8");
  await fs.rename(tmp, FILE);
  cache = null;
}

function locked<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

/* ---------- reads ---------- */

const byDateDesc = (a: BlogPost, b: BlogPost) => (b.datePublished || b.createdAt).localeCompare(a.datePublished || a.createdAt);

export async function listAllPosts(): Promise<BlogPost[]> {
  return [...(await readAll())].sort((a, b) => b.dateModified.localeCompare(a.dateModified));
}

/** Published posts whose publish date has arrived (a future date acts as scheduling). */
export async function listPublishedPosts(): Promise<BlogPost[]> {
  const now = new Date().toISOString();
  return (await readAll()).filter((p) => p.status === "published" && p.datePublished <= now).sort(byDateDesc);
}

export async function getPostById(id: string): Promise<BlogPost | undefined> {
  return (await readAll()).find((p) => p.id === id);
}

export async function getPublishedPost(slug: string): Promise<BlogPost | undefined> {
  return (await listPublishedPosts()).find((p) => p.slug === slug);
}

/* ---------- writes ---------- */

export class ValidationError extends Error {}

export function savePost(input: Partial<BlogPost>, id?: string): Promise<BlogPost> {
  return locked(async () => {
    const posts = [...(await readAll())];
    const idx = id ? posts.findIndex((p) => p.id === id) : -1;
    if (id && idx < 0) throw new ValidationError("Post not found.");
    const prev = idx >= 0 ? posts[idx] : undefined;
    const post = normalize(input, prev);
    if (!post.title) throw new ValidationError("Title is required.");
    if (!post.slug) throw new ValidationError("Slug is required.");
    if (posts.some((p) => p.slug === post.slug && p.id !== post.id)) throw new ValidationError(`Another post already uses the slug “${post.slug}”.`);
    if (post.status === "published" && !post.content.trim()) throw new ValidationError("Write some content before publishing.");
    if (idx >= 0) posts[idx] = post;
    else posts.push(post);
    await writeAll(posts);
    return post;
  });
}

export function deletePost(id: string): Promise<BlogPost | undefined> {
  return locked(async () => {
    const posts = [...(await readAll())];
    const idx = posts.findIndex((p) => p.id === id);
    if (idx < 0) return undefined;
    const [gone] = posts.splice(idx, 1);
    await writeAll(posts);
    return gone;
  });
}

/* ---------- input normalisation (never trust the client) ---------- */

const str = (v: unknown, max = 500) => (typeof v === "string" ? v.replace(/\u0000/g, "").trim().slice(0, max) : "");
const bool = (v: unknown) => v === true;
const list = (v: unknown, max = 20, each = 60) =>
  [...new Set((Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : []).map((x) => str(x, each)).filter(Boolean))].slice(0, max);

function safeUrl(v: unknown, allowRelative = true): string {
  const s = str(v, 1000);
  if (!s) return "";
  if (allowRelative && s.startsWith("/") && !s.startsWith("//")) return s;
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : "";
  } catch {
    return "";
  }
}

function image(v: unknown): BlogImage | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const src = safeUrl(o.src);
  if (!src) return null;
  const num = (n: unknown) => (typeof n === "number" && Number.isFinite(n) && n > 0 && n < 20000 ? Math.round(n) : undefined);
  return { src, alt: str(o.alt, 200), caption: str(o.caption, 300) || undefined, width: num(o.width), height: num(o.height) };
}

function isoDate(v: unknown, fallback: string): string {
  const s = str(v, 40);
  if (!s) return fallback;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? fallback : d.toISOString();
}

function normalize(input: Partial<BlogPost>, prev?: BlogPost): BlogPost {
  const now = new Date().toISOString();
  const seoIn = (input.seo ?? {}) as Partial<BlogSeo>;
  const seo: BlogSeo = {
    ...emptySeo(),
    metaTitle: str(seoIn.metaTitle, 120),
    metaDescription: str(seoIn.metaDescription, 320),
    focusKeyword: str(seoIn.focusKeyword, 80),
    secondaryKeywords: list(seoIn.secondaryKeywords, 15, 80),
    canonicalUrl: safeUrl(seoIn.canonicalUrl, false),
    noindex: bool(seoIn.noindex),
    nofollow: bool(seoIn.nofollow),
    ogTitle: str(seoIn.ogTitle, 150),
    ogDescription: str(seoIn.ogDescription, 320),
    ogImage: image(seoIn.ogImage),
    twitterTitle: str(seoIn.twitterTitle, 150),
    twitterDescription: str(seoIn.twitterDescription, 320),
    schemaType: SCHEMA_TYPES.includes(seoIn.schemaType as SchemaType) ? (seoIn.schemaType as SchemaType) : "BlogPosting",
  };
  const faqs: BlogFaq[] = (Array.isArray(input.faqs) ? input.faqs : [])
    .map((f) => ({ q: str((f as BlogFaq)?.q, 300), a: str((f as BlogFaq)?.a, 3000) }))
    .filter((f) => f.q && f.a)
    .slice(0, 30);
  const title = str(input.title, 200);
  const status = input.status === "published" ? "published" : "draft";
  const createdAt = prev?.createdAt ?? isoDate(input.createdAt, now);
  // First publish stamps the date unless the editor chose one.
  const pubFallback = prev?.datePublished || (status === "published" ? now : "");
  const datePublished = input.datePublished ? isoDate(input.datePublished, pubFallback) : pubFallback;
  return {
    id: prev?.id ?? (str(input.id, 64) || randomUUID()),
    slug: slugifyPost(str(input.slug, 200) || title),
    status,
    title,
    excerpt: str(input.excerpt, LIMITS.excerpt + 200),
    content: typeof input.content === "string" ? input.content.replace(/\u0000/g, "").slice(0, 200_000) : "",
    category: str(input.category, 60) || "General",
    tags: list(input.tags, 20, 40),
    authorName: str(input.authorName, 80),
    authorUrl: safeUrl(input.authorUrl),
    featuredImage: image(input.featuredImage),
    seo,
    faqs,
    relatedTools: list(input.relatedTools, 8, 80).filter((id) => getTool(id)?.indexable),
    datePublished,
    // Stored records keep their own modified date when loaded; saves stamp "now".
    dateModified: prev ? now : isoDate(input.dateModified, now),
    createdAt,
  };
}
