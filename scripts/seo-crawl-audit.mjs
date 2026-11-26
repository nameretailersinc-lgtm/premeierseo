/*
 * Crawls a running production build and checks what a search engine would see.
 *
 *   npm run build && npm run start -- --port 3300
 *   node scripts/seo-crawl-audit.mjs http://localhost:3300
 *
 * Writes seo/crawl-audit.json and seo/crawl-audit.md. Exit code 1 when an error is found.
 * It reads only the local server; canonical URLs are compared with the production origin.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { createRequire } from "node:module";
import { parse } from "node-html-parser";

/* Rough desktop snippet widths (Arial). Google chooses what it shows, so these are editorial hints only. */
const canvas = createRequire(import.meta.url)("@napi-rs/canvas").createCanvas(10, 10).getContext("2d");
const textWidth = (s, px) => ((canvas.font = `${px}px Arial`), canvas.measureText(s).width);
const LIMIT = { title: [20, 600], description: [14, 920] };

const BASE = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const ORIGIN = "https://premierseoservices.com";
const errors = [];
const warnings = [];
const err = (url, msg) => errors.push({ url, msg });
const warn = (url, msg) => warnings.push({ url, msg });

const get = async (path, redirect = "manual") => {
  const res = await fetch(BASE + path, { redirect, headers: { "user-agent": "pss-crawl-audit" } });
  return { status: res.status, headers: res.headers, body: await res.text() };
};

async function pool(items, size, fn) {
  const queue = [...items];
  await Promise.all(Array.from({ length: size }, async () => { while (queue.length) await fn(queue.shift()); }));
}

const toPath = (href, from) => {
  try {
    const u = new URL(href, ORIGIN + from);
    return u.origin === ORIGIN || u.origin === BASE ? u.pathname + u.search : null;
  } catch {
    return null;
  }
};

const sitemap = await get("/sitemap.xml");
if (sitemap.status !== 200) throw new Error(`sitemap.xml returned ${sitemap.status}`);
const locs = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((l) => !/\.(png|jpe?g|webp)$/i.test(l));
const sitemapPaths = locs.map((l) => {
  if (!l.startsWith(ORIGIN + "/")) err(l, "sitemap URL is not on the production origin");
  return l.slice(ORIGIN.length);
});
if (new Set(sitemapPaths).size !== sitemapPaths.length) err("/sitemap.xml", "duplicate URLs in sitemap");

const pages = new Map();
const images = new Map();
const scripts = new Map();

async function inspect(path) {
  const r = await get(path);
  if (r.status !== 200) return err(path, `sitemap URL returned ${r.status}`);
  const doc = parse(r.body, { blockTextElements: { script: true, style: true } });
  const meta = (sel) => doc.querySelector(sel)?.getAttribute("content")?.trim() ?? "";
  const title = doc.querySelector("title")?.text.trim() ?? "";
  const description = meta('meta[name="description"]');
  const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "";
  const robots = meta('meta[name="robots"]');
  const h1 = doc.querySelectorAll("h1").map((h) => h.text.replace(/\s+/g, " ").trim());

  if (!title) err(path, "missing <title>");
  if (!description) err(path, "missing meta description");
  if (canonical !== ORIGIN + path) err(path, `canonical is "${canonical}"`);
  if (/noindex/i.test(robots) || /noindex/i.test(r.headers.get("x-robots-tag") ?? "")) err(path, "noindex page listed in sitemap");
  if (h1.length !== 1) err(path, `${h1.length} h1 elements`);
  if (doc.querySelector("html")?.getAttribute("lang") !== "en") err(path, 'html lang is not "en"');
  if (!meta('meta[name="viewport"]')) err(path, "missing viewport meta");
  if (!meta('meta[property="og:title"]') || !meta('meta[property="og:image"]')) err(path, "missing Open Graph title or image");
  if (doc.querySelector('meta[name="keywords"]')) warn(path, "meta keywords tag present");
  if (title.length > 65) warn(path, `title is ${title.length} characters`);
  if (description.length > 170) warn(path, `description is ${description.length} characters`);
  if (description && description.length < 70) warn(path, `description is only ${description.length} characters`);

  const types = [];
  for (const s of doc.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      // rawText: browsers and crawlers do not decode HTML entities inside <script>.
      const data = JSON.parse(s.rawText);
      for (const node of data["@graph"] ?? [data]) {
        types.push(String(node["@type"]));
        if (node.aggregateRating || node.review) err(path, "structured data contains ratings or reviews");
        if (node["@type"] === "BreadcrumbList" && !node.itemListElement?.length) err(path, "empty breadcrumb list");
      }
    } catch (e) {
      err(path, `invalid JSON-LD: ${e.message}`);
    }
  }
  if (!types.length) err(path, "no structured data");

  for (const img of doc.querySelectorAll("img")) {
    const local = toPath(img.getAttribute("src") ?? "", path);
    if (local && !local.startsWith("data:")) images.set(local, [...(images.get(local) ?? []), path]);
    if (img.getAttribute("alt") === undefined) warn(path, `image without alt: ${img.getAttribute("src")}`);
  }

  const links = new Set();
  for (const a of doc.querySelectorAll("a[href]")) {
    const href = a.getAttribute("href");
    if (/^(#|mailto:|tel:|javascript:|data:)/i.test(href)) continue;
    const p = toPath(href, path);
    if (p) links.add(p.split("#")[0]);
  }
  const js = doc.querySelectorAll("script[src]").map((s) => toPath(s.getAttribute("src"), path)).filter((p) => p?.includes("/_next/"));
  for (const src of js) scripts.set(src, null);
  pages.set(path, { title, description, h1: h1[0] ?? "", types: [...new Set(types)], links: [...links], js });
}

await pool(sitemapPaths, 8, inspect);

for (const field of ["title", "description", "h1"]) {
  const seen = new Map();
  for (const [path, p] of pages) seen.set(p[field], [...(seen.get(p[field]) ?? []), path]);
  for (const [value, paths] of seen) if (paths.length > 1) err(paths.join(" "), `duplicate ${field}: "${value}"`);
}

/* Every internal link target must answer 200 directly. */
const targets = new Map();
for (const [from, p] of pages) for (const to of p.links) targets.set(to, [...(targets.get(to) ?? []), from]);
const linkedNotInSitemap = [];
await pool([...targets.keys()], 8, async (to) => {
  if (pages.has(to)) return;
  const r = await get(to);
  const from = targets.get(to).slice(0, 3).join(", ");
  if (r.status >= 400) err(to, `broken internal link (${r.status}), linked from ${from}`);
  else if (r.status >= 300) err(to, `internal link redirects (${r.status} to ${r.headers.get("location")}), linked from ${from}`);
  else linkedNotInSitemap.push(to);
});

/* Every image on the crawled pages, and each blog post's social image, must load. */
await pool([...images.keys()], 8, async (src) => {
  const res = await fetch(BASE + src, { redirect: "manual" });
  await res.arrayBuffer();
  if (res.status !== 200 || !/^image\//.test(res.headers.get("content-type") ?? "")) err(src, `image returned ${res.status}, used on ${images.get(src)[0]}`);
});
const articlePaths = sitemapPaths.filter((p) => /^\/blog\/(?!page\/)[^/]+\/$/.test(p));
for (const path of articlePaths) {
  const shown = [...images].filter(([src, from]) => src.startsWith("/blog-images/") && from.includes(path)).length;
  if (shown < 2) err(path, `article shows ${shown} of its 2 images`);
}

/* Earlier guide URLs: each is a live article, one 301 to a live page, or a 410. */
const retired = JSON.parse(readFileSync("src/content/legacy-blog.json", "utf8"));
const retiredResults = { rewritten: 0, redirected: 0, gone: 0 };
for (const { slug } of retired) {
  const path = `/blog/${slug}/`;
  const r = await get(path);
  if (r.status === 200) retiredResults.rewritten++;
  else if (r.status === 410) retiredResults.gone++;
  else if (r.status === 301) {
    const to = new URL(r.headers.get("location"), BASE).pathname;
    if ((await get(to)).status !== 200) err(path, `redirects to ${to}, which is not a 200`);
    else retiredResults.redirected++;
  } else err(path, `earlier guide URL returns ${r.status}`);
}

/* Orphans and click depth from the homepage. */
const inbound = new Map(sitemapPaths.map((p) => [p, 0]));
for (const [from, p] of pages) for (const to of p.links) if (to !== from && inbound.has(to)) inbound.set(to, inbound.get(to) + 1);
for (const [path, n] of inbound) if (!n && path !== "/") err(path, "orphan: no internal links point to this sitemap URL");

const depth = new Map([["/", 0]]);
for (const queue = ["/"]; queue.length; ) {
  const at = queue.shift();
  for (const to of pages.get(at)?.links ?? []) {
    if (pages.has(to) && !depth.has(to)) {
      depth.set(to, depth.get(at) + 1);
      queue.push(to);
    }
  }
}
for (const path of pages.keys()) {
  if (!depth.has(path)) err(path, "not reachable from the homepage by links");
  else if (depth.get(path) > 3) warn(path, `click depth ${depth.get(path)}`);
}

/* Routing behaviour. */
const expect = async (path, status, location) => {
  const r = await get(path);
  if (r.status !== status) return err(path, `expected ${status}, got ${r.status}`);
  if (location && !(r.headers.get("location") ?? "").endsWith(location)) err(path, `redirects to ${r.headers.get("location")}, expected ${location}`);
};
await expect("/this-page-does-not-exist/", 404);
await expect("/merge-pdf", 301, "/merge-pdf/");
await expect("/Merge-PDF/", 301, "/merge-pdf/");
const robotsTxt = await get("/robots.txt");
if (!robotsTxt.body.includes(`Sitemap: ${ORIGIN}/sitemap.xml`)) err("/robots.txt", "sitemap line missing");
for (const path of ["/backlink-checker/", "/sentence-rewriter/", "/cross-browser-tester/"]) {
  const r = await get(path);
  if (r.status === 200 && !/<meta name="robots" content="[^"]*noindex/i.test(r.body)) err(path, "limited tool is not marked noindex");
  if (sitemapPaths.includes(path)) err(path, "limited tool is listed in the sitemap");
}

/* Script weight referenced by each page's HTML (lazy chunks are loaded later and are not counted). */
await pool([...scripts.keys()], 8, async (src) => {
  const res = await fetch(BASE + src);
  const bytes = Buffer.from(await res.arrayBuffer());
  if (!res.ok) err(src, `script returned ${res.status}`);
  scripts.set(src, { raw: bytes.length, gzip: gzipSync(bytes).length, text: bytes.toString("utf8") });
});
const weight = (path) => {
  const list = pages.get(path)?.js ?? [];
  return {
    files: list.length,
    rawKB: Math.round(list.reduce((n, s) => n + (scripts.get(s)?.raw ?? 0), 0) / 1024),
    gzipKB: Math.round(list.reduce((n, s) => n + (scripts.get(s)?.gzip ?? 0), 0) / 1024),
  };
};
/* Strings that only appear inside the heavy processing libraries themselves. */
const HEAVY = { "pdf-lib": "Failed to parse invalid PDF object", "pdf.js": "InvalidPDFException", heic2any: "libheif", mammoth: "mc:AlternateContent", "qrcode-generator": "code length overflow" };
const heavyOnLoad = {};
for (const [path, p] of pages) {
  for (const [lib, marker] of Object.entries(HEAVY)) {
    if (p.js.some((s) => scripts.get(s)?.text.includes(marker))) (heavyOnLoad[lib] ??= []).push(path);
  }
}
const sample = ["/", "/tools/", "/pdf-tools/", "/word-counter/", "/image-compressor/", "/merge-pdf/", "/qr-code-generator/", "/json-viewer/", "/age-calculator/", "/apy-calculator/"].filter((p) => pages.has(p));

const wide = Object.fromEntries(
  Object.entries(LIMIT).map(([field, [size, max]]) => [field, [...pages].filter(([, p]) => textWidth(p[field], size) > max).map(([path, p]) => ({ path, px: Math.round(textWidth(p[field], size)) }))]),
);
const depthCounts = {};
for (const d of depth.values()) depthCounts[d] = (depthCounts[d] ?? 0) + 1;
const report = {
  checkedAt: new Date().toISOString(),
  base: BASE,
  sitemapUrls: sitemapPaths.length,
  pagesInspected: pages.size,
  internalLinkTargets: targets.size,
  linkedNotInSitemap: linkedNotInSitemap.sort(),
  clickDepth: depthCounts,
  imagesChecked: images.size,
  blogArticles: articlePaths.length,
  earlierGuideUrls: retiredResults,
  estimatedSnippetOverflow: wide,
  scriptWeight: Object.fromEntries(sample.map((p) => [p, weight(p)])),
  heavyLibrariesInInitialScripts: heavyOnLoad,
  errors,
  warnings,
};
writeFileSync("seo/crawl-audit.json", JSON.stringify(report, null, 2) + "\n");
const list = (rows) => (rows.length ? rows.map((r) => `- \`${r.url}\`: ${r.msg}`).join("\n") : "None.");
writeFileSync(
  "seo/crawl-audit.md",
  `# Crawl audit of the production build

Run: ${report.checkedAt}. Reproduce with \`node scripts/seo-crawl-audit.mjs <server>\` against \`next start\`.

| Check | Result |
| --- | --- |
| Sitemap URLs | ${report.sitemapUrls} |
| Pages inspected (200) | ${report.pagesInspected} |
| Distinct internal link targets | ${report.internalLinkTargets} |
| Click depth from the homepage | ${Object.entries(depthCounts).map(([d, n]) => `${d}: ${n}`).join(", ")} |
| Blog articles in the sitemap | ${articlePaths.length} |
| Distinct images that were loaded | ${images.size} |
| Earlier guide URLs | ${retiredResults.rewritten} rewritten in place, ${retiredResults.redirected} redirected (301), ${retiredResults.gone} removed (410) |
| Errors | ${errors.length} |
| Warnings | ${warnings.length} |

## JavaScript referenced by the HTML

Gzip sizes are computed locally; production compression may differ. This is a lab measure of transfer weight, not Core Web Vitals.

| Page | Files | Raw KB | Gzip KB |
| --- | --- | --- | --- |
${sample.map((p) => `| \`${p}\` | ${weight(p).files} | ${weight(p).rawKB} | ${weight(p).gzipKB} |`).join("\n")}

Processing libraries found in initial scripts: ${Object.keys(heavyOnLoad).length ? Object.entries(heavyOnLoad).map(([k, v]) => `${k} (${v.length} pages)`).join(", ") : "none of pdf-lib, PDF.js, heic2any, mammoth or qrcode-generator (checked by library-specific strings)"}.

## Estimated snippet widths

Measured in Arial at 20 px (titles, about 600 px) and 14 px (descriptions, about 920 px over two lines). Text past these widths is likely to be cut on desktop. Google may rewrite either field.

- Titles estimated over 600 px: ${wide.title.length}${wide.title.length ? ` (${wide.title.slice(0, 15).map((w) => `\`${w.path}\``).join(", ")})` : ""}
- Descriptions estimated over 920 px: ${wide.description.length}${wide.description.length ? ` (${wide.description.slice(0, 15).map((w) => `\`${w.path}\``).join(", ")})` : ""}

## Linked pages that are not in the sitemap

${linkedNotInSitemap.map((p) => `- \`${p}\``).join("\n") || "None."}

## Errors

${list(errors)}

## Warnings

${list(warnings)}
`,
);
console.log(`${pages.size}/${sitemapPaths.length} pages, ${errors.length} errors, ${warnings.length} warnings`);
for (const e of errors.slice(0, 40)) console.log("ERROR", e.url, "-", e.msg);
process.exit(errors.length ? 1 : 0);
