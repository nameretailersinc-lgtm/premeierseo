import "server-only";
import { randomUUID } from "node:crypto";
import { GridFSBucket, type Collection } from "mongodb";
import { getTool } from "@/content/tools";
import retiredPosts from "@/content/legacy-blog.json";
import seedPosts from "@/content/seed-posts.json";
import { getDb, mongoConfigured } from "./mongo";
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
 * MongoDB blog store.
 *   posts:        collection "blog_posts" (_id = post id, unique index on slug)
 *   images:       GridFS bucket "blog_images" (filename = "uploads/YYYY/MM/name.ext", served by /media/…)
 * The bundled articles (seed-posts.json, built from src/content/blog/*.md) are served without MongoDB.
 * With MongoDB configured, a one-time migration publishes them and retires the earlier guides.
 */

type PostDoc = Omit<BlogPost, "id"> & { _id: string };

const toPost = ({ _id, ...rest }: PostDoc): BlogPost => normalize({ ...rest, id: _id } as Partial<BlogPost>);
const toDoc = ({ id, ...rest }: BlogPost): PostDoc => ({ _id: id, ...rest });

let indexes: Promise<unknown> | null = null;
let migration: Promise<void> | null = null;
const originals = seedPosts as BlogPost[];
/** The guides these articles replaced. Kept only to recognise untouched copies in the database. */
const retired = retiredPosts as BlogPost[];

/**
 * Publishes the replacement articles once. An earlier guide is replaced or moved to draft only when
 * it is still exactly as shipped (same content and modified date). Anything edited in /admin/ is left
 * alone, a guide deleted there is not brought back, and nothing is deleted from the database.
 * Old URLs without a new article are redirected or marked gone in src/seo/migration.json.
 */
export async function migrateArticles(db: Awaited<ReturnType<typeof getDb>>, col: Collection<PostDoc>): Promise<void> {
  const migrations = db.collection<{ _id: string; completedAt: Date }>("blog_migrations");
  const id = "keyword-articles-v2";
  if (await migrations.findOne({ _id: id })) return;
  const importedEarlier = Boolean(await migrations.findOne({ _id: "restore-published-guides-v1" }));
  const untouched = (doc: PostDoc, was: BlogPost) => doc.content === was.content && doc.dateModified === was.dateModified;

  for (const post of originals) {
    const was = retired.find((p) => p.slug === post.slug);
    const existing = await col.findOne({ slug: post.slug });
    if (!existing) {
      if (was && importedEarlier) continue;
      await col.updateOne({ slug: post.slug }, { $setOnInsert: toDoc(post) }, { upsert: true });
    } else if (was && untouched(existing, was)) {
      const { _id, ...rest } = { ...toDoc(post), _id: existing._id };
      await col.updateOne({ _id }, { $set: rest });
    }
  }
  for (const was of retired) {
    if (originals.some((p) => p.slug === was.slug)) continue;
    const existing = await col.findOne({ slug: was.slug });
    if (existing && untouched(existing, was)) await col.updateOne({ _id: existing._id }, { $set: { status: "draft" } });
  }
  await migrations.updateOne({ _id: id }, { $set: { completedAt: new Date() } }, { upsert: true });
}

async function posts(): Promise<Collection<PostDoc>> {
  const db = await getDb();
  const col = db.collection<PostDoc>("blog_posts");
  indexes ??= Promise.all([
    col.createIndex({ slug: 1 }, { unique: true, name: "slug_unique" }),
    col.createIndex({ status: 1, datePublished: -1 }, { name: "published_by_date" }),
    col.createIndex({ dateModified: -1 }, { name: "modified" }),
  ]).catch((e) => {
    indexes = null;
    throw e;
  });
  await indexes;
  migration ??= migrateArticles(db, col).catch((e) => { migration = null; throw e; });
  await migration;
  return col;
}

export class ValidationError extends Error {}

function requireDb() {
  if (!mongoConfigured()) throw new ValidationError("Blog storage is not configured: set MONGODB_URI on the server.");
}

/* ---------- reads ---------- */

export async function listAllPosts(): Promise<BlogPost[]> {
  if (!mongoConfigured()) return structuredClone(originals);
  return (await (await posts()).find({}).sort({ dateModified: -1 }).toArray()).map(toPost);
}

/** Published posts whose publish date has arrived (a future date acts as scheduling). */
export async function listPublishedPosts(): Promise<BlogPost[]> {
  if (!mongoConfigured()) return structuredClone(originals).sort((a, b) => b.datePublished.localeCompare(a.datePublished));
  const now = new Date().toISOString();
  const docs = await (await posts())
    .find({ status: "published", datePublished: { $lte: now, $ne: "" } })
    .sort({ datePublished: -1 })
    .toArray();
  return docs.map(toPost);
}

export async function getPostById(id: string): Promise<BlogPost | undefined> {
  if (!mongoConfigured()) return structuredClone(originals.find((p) => p.id === id));
  const doc = await (await posts()).findOne({ _id: String(id) });
  return doc ? toPost(doc) : undefined;
}

export async function getPublishedPost(slug: string): Promise<BlogPost | undefined> {
  if (!/^[a-z0-9-]{1,100}$/.test(slug)) return undefined;
  if (!mongoConfigured()) return structuredClone(originals.find((p) => p.slug === slug));
  const doc = await (await posts()).findOne({ slug, status: "published" });
  if (!doc) return undefined;
  const p = toPost(doc);
  return p.datePublished && p.datePublished <= new Date().toISOString() ? p : undefined;
}

/* ---------- writes ---------- */

export async function savePost(input: Partial<BlogPost>, id?: string): Promise<BlogPost> {
  requireDb();
  const col = await posts();
  const prevDoc = id ? await col.findOne({ _id: String(id) }) : null;
  if (id && !prevDoc) throw new ValidationError("Post not found.");
  const post = normalize(input, prevDoc ? toPost(prevDoc) : undefined);
  if (!post.title) throw new ValidationError("Title is required.");
  if (!post.slug) throw new ValidationError("Slug is required.");
  if (post.status === "published" && !post.content.trim()) throw new ValidationError("Write some content before publishing.");
  const clash = await col.findOne({ slug: post.slug, _id: { $ne: post.id } }, { projection: { _id: 1 } });
  if (clash) throw new ValidationError(`Another post already uses the slug “${post.slug}”.`);
  try {
    await col.replaceOne({ _id: post.id }, toDoc(post), { upsert: true });
  } catch (e) {
    if ((e as { code?: number }).code === 11000) throw new ValidationError(`Another post already uses the slug “${post.slug}”.`);
    throw e;
  }
  return post;
}

export async function deletePost(id: string): Promise<BlogPost | undefined> {
  requireDb();
  const doc = await (await posts()).findOneAndDelete({ _id: String(id) });
  return doc ? toPost(doc) : undefined;
}

/* ---------- images (GridFS) ---------- */

async function bucket() {
  return new GridFSBucket(await getDb(), { bucketName: "blog_images" });
}

export async function saveImage(filename: string, data: Buffer, meta: { mime: string; width?: number; height?: number }) {
  requireDb();
  const b = await bucket();
  await new Promise<void>((resolve, reject) => {
    const up = b.openUploadStream(filename, { metadata: { contentType: meta.mime, width: meta.width, height: meta.height } });
    up.once("finish", () => resolve());
    up.once("error", reject);
    up.end(data);
  });
}

export async function readImage(filename: string): Promise<{ data: Buffer; mime: string } | null> {
  if (!mongoConfigured()) return null;
  const b = await bucket();
  const [file] = await b.find({ filename }).sort({ uploadDate: -1 }).limit(1).toArray();
  if (!file) return null;
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    b.openDownloadStream(file._id)
      .on("data", (c: Buffer) => chunks.push(c))
      .once("end", () => resolve())
      .once("error", reject);
  });
  return { data: Buffer.concat(chunks), mime: String((file.metadata as { contentType?: string } | undefined)?.contentType || "application/octet-stream") };
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
