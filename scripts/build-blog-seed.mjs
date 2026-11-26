/*
 * Builds src/content/seed-posts.json from the Markdown articles in src/content/blog/ and checks them.
 *
 *   node --import tsx scripts/build-blog-seed.mjs          (writes the JSON and seo/blog-keyword-map.csv)
 *
 * Each article starts with a JSON block between --- lines. The build fails on a broken internal link,
 * an unknown tool id, a missing image, out-of-range metadata, duplicate titles or keywords, or a
 * target keyword that is not in the Keyword Planner research (seo/keyword-page-mapping.csv).
 * Volumes are copied per source and never added together.
 */
import { createReadStream, existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { TOOLS } from "../src/content/tools";
import { CATEGORIES } from "../src/content/categories";
import { LIMITS, emptySeo, plainText } from "../src/lib/blog-types";
import retired from "../src/content/legacy-blog.json";

const DIR = "src/content/blog";
/** Date the replacement articles were written. Change a post's own `updated` when you edit it. */
const WRITTEN = "2026-11-26T00:00:00.000Z";
const problems = [];

const files = readdirSync(DIR).filter((f) => f.endsWith(".md")).sort();
const articles = files.map((file) => {
  const raw = readFileSync(`${DIR}/${file}`, "utf8").replace(/\r\n/g, "\n");
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw);
  if (!m) throw new Error(`${file}: missing front matter`);
  return { slug: file.slice(0, -3), meta: JSON.parse(m[1]), content: m[2].trim() };
});

const paths = new Set([
  "/", "/tools/", "/blog/", "/privacy-policy/", "/contact/",
  ...TOOLS.filter((t) => t.indexable).map((t) => t.path),
  ...CATEGORIES.map((c) => c.path),
  ...articles.map((a) => `/blog/${a.slug}/`),
]);
const toolIds = new Set(TOOLS.filter((t) => t.indexable).map((t) => t.id));

/* Keyword evidence: normalized keyword -> ["source:volume", …] for the keywords the articles target. */
const wanted = new Map(articles.flatMap((a) => [a.meta.focusKeyword, ...a.meta.secondaryKeywords].map((k) => [k, new Map()])));
function csvCells(line) {
  const out = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') (cell += '"'), i++;
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") out.push(cell), (cell = "");
    else cell += ch;
  }
  out.push(cell);
  return out;
}
let header;
for await (const line of createInterface({ input: createReadStream("seo/keyword-page-mapping.csv", "utf8"), crlfDelay: Infinity })) {
  const cells = csvCells(line.replace(/^﻿/, ""));
  if (!header) {
    header = Object.fromEntries(cells.map((c, i) => [c, i]));
    continue;
  }
  const k = cells[header.normalized_keyword];
  const source = cells[header.source_dataset];
  if (wanted.has(k) && !wanted.get(k).has(source)) wanted.get(k).set(source, cells[header.average_monthly_searches]);
}

const seen = { title: new Set(), metaTitle: new Set(), metaDescription: new Set(), focus: new Set() };
const within = (slug, label, value, [lo, hi]) => {
  if (value.length < lo || value.length > hi) problems.push(`${slug}: ${label} is ${value.length} characters (want ${lo}–${hi})`);
};

const posts = articles.map(({ slug, meta, content }) => {
  within(slug, "title", meta.title, LIMITS.title);
  within(slug, "meta title", meta.metaTitle, LIMITS.metaTitle);
  within(slug, "meta description", meta.metaDescription, LIMITS.metaDescription);
  within(slug, "excerpt", meta.excerpt, [1, LIMITS.excerpt]);
  if (slug.length > LIMITS.slug) problems.push(`${slug}: slug too long`);
  for (const [key, value] of [["title", meta.title], ["metaTitle", meta.metaTitle], ["metaDescription", meta.metaDescription], ["focus", meta.focusKeyword]]) {
    if (seen[key].has(value)) problems.push(`${slug}: duplicate ${key}`);
    seen[key].add(value);
  }
  // An article must not use a tool page's primary name as its headline.
  const clash = TOOLS.find((t) => [t.h1, t.name].some((n) => n.toLowerCase() === meta.title.toLowerCase()));
  if (clash) problems.push(`${slug}: title repeats the tool page ${clash.path}`);
  for (const [, href] of content.matchAll(/(?<!!)\[[^\]]+\]\((\/[^)\s]*)\)/g)) {
    if (!paths.has(href.split("#")[0])) problems.push(`${slug}: broken internal link ${href}`);
  }
  const images = [...content.matchAll(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)];
  if (!images.length) problems.push(`${slug}: no image in the article`);
  for (const [, alt, src] of images) {
    if (alt.length < 20) problems.push(`${slug}: image alt text is too short`);
    if (!existsSync(`public${src}`)) problems.push(`${slug}: missing image public${src}`);
  }
  const cover = `/blog-images/${slug}.jpg`;
  if (!existsSync(`public${cover}`)) problems.push(`${slug}: missing cover public${cover}`);
  for (const id of meta.relatedTools) if (!toolIds.has(id)) problems.push(`${slug}: unknown tool id ${id}`);
  if (!content.match(/\]\(\/(?!blog\/|blog-images\/)[a-z0-9-]+\/\)/)) problems.push(`${slug}: no link to a tool page`);
  for (const k of [meta.focusKeyword, ...meta.secondaryKeywords]) {
    if (!wanted.get(k)?.size) problems.push(`${slug}: keyword "${k}" is not in the research data`);
  }
  const previous = retired.find((p) => p.slug === slug);
  return {
    id: `article-${slug}`,
    slug,
    status: "published",
    title: meta.title,
    excerpt: meta.excerpt,
    content,
    category: meta.category,
    tags: meta.tags,
    authorName: "",
    authorUrl: "",
    featuredImage: { src: cover, alt: meta.coverAlt, width: 1200, height: 630 },
    seo: { ...emptySeo(), metaTitle: meta.metaTitle, metaDescription: meta.metaDescription, focusKeyword: meta.focusKeyword, secondaryKeywords: meta.secondaryKeywords },
    faqs: meta.faqs,
    relatedTools: meta.relatedTools,
    // A rewritten article keeps the URL's original publish date; its modified date is when it was rewritten.
    datePublished: previous?.datePublished ?? WRITTEN,
    dateModified: meta.updated ?? WRITTEN,
    createdAt: previous?.createdAt ?? WRITTEN,
  };
});

/* Every article needs at least one link from another article (the blog index links all of them too). */
for (const post of posts) {
  if (!posts.some((p) => p !== post && p.content.includes(`](/blog/${post.slug}/)`))) {
    console.log(`note: no other article links to ${post.slug}`);
  }
}

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
writeFileSync("src/content/seed-posts.json", JSON.stringify(posts, null, 2) + "\n");

const quote = (v) => `"${String(v).replace(/"/g, '""')}"`;
const rows = [["article_url", "role", "keyword", "volume_by_source (not summed)", "cover_image", "linked_tools"]];
for (const p of posts) {
  for (const [role, k] of [["focus", p.seo.focusKeyword], ...p.seo.secondaryKeywords.map((k) => ["secondary", k])]) {
    rows.push([`/blog/${p.slug}/`, role, k, [...wanted.get(k)].map(([s, v]) => `${s}: ${v}`).join("; "), p.featuredImage.src, p.relatedTools.join(" ")]);
  }
}
writeFileSync("seo/blog-keyword-map.csv", "﻿" + rows.map((r) => r.map(quote).join(",")).join("\r\n") + "\r\n");
console.log(`${posts.length} articles written to src/content/seed-posts.json`);
for (const p of posts) console.log(`  ${String(plainText(p.content).split(" ").length).padStart(4)} words  /blog/${p.slug}/`);
