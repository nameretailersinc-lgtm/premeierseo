import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import { analyticsParams } from "../src/lib/analytics";
import { analyzeHtml } from "../src/lib/server/analyze-html";
import { guard, readBody } from "../src/lib/server/api";
import { decodeResponseBody, isBlockedIp, normalizeUserUrl } from "../src/lib/server/safe-fetch";
import { POST } from "../src/app/api/report/route";
import sitemap from "../src/app/sitemap";
import { TOOLS } from "../src/content/tools";
import { absUrl } from "../src/lib/site";
import { existsSync } from "node:fs";
import retiredPosts from "../src/content/legacy-blog.json";
import seedPosts from "../src/content/seed-posts.json";
import urlRules from "../src/seo/migration.json";
import { llmsText } from "../src/lib/server/llms";
import { getPublishedPost, listPublishedPosts, migrateArticles } from "../src/lib/server/blog-store";
import { blogPostGraph, toolGraph } from "../src/lib/schema";
import type { Db } from "mongodb";

async function main() {
  const facts = analyzeHtml('<html><head><title>Example</title><link rel="icon" href="http://["></head><body><h1>Heading</h1><script src="/app.js"></script><script type="application/ld+json">{"@type":"WebPage"}</script><p>Useful text</p></body></html>', "https://example.com/");
  assert.equal(facts.scripts, 1);
  assert.equal(facts.jsonLd[0].valid, true);
  assert.equal(facts.favicon, null);
  assert.equal(facts.title, "Example");
  for (const value of [null, [], 42, "text"]) assert.equal(await readBody(new Request("https://example.com", { method: "POST", body: JSON.stringify(value) })), null);
  assert.equal(await readBody(new Request("https://example.com", { method: "POST", body: JSON.stringify({ text: "ééé" }) }), 12), null);
  assert.equal(guard(new Request("https://example.com", { headers: { host: "example.com", origin: "null" } }))?.status, 403);
  for (const ip of ["127.0.0.1", "10.0.0.1", "169.254.169.254", "::1", "fc00::1", "::ffff:127.0.0.1"]) assert.equal(isBlockedIp(ip), true, ip);
  assert.equal(isBlockedIp("8.8.8.8"), false);
  // The size cap applies to decompressed bytes: a tiny gzip body must not expand past it.
  const bomb = gzipSync(Buffer.alloc(200_000, "a"));
  assert.ok(bomb.length < 1_000);
  await assert.rejects(decodeResponseBody(bomb, "gzip", 10_000), (e: { code?: string }) => e.code === "TOO_LARGE");
  assert.equal((await decodeResponseBody(gzipSync("<p>ok</p>"), "gzip", 10_000)).toString(), "<p>ok</p>");
  await assert.rejects(decodeResponseBody(Buffer.from("not gzip"), "gzip", 10_000), (e: { code?: string }) => e.code === "CONNECTION_FAILED");
  // Analytics keeps only listed operational keys and drops values that look like URLs or addresses.
  assert.deepEqual(analyticsParams({ tool_id: "qr-code-generator", filename: "cv.pdf", to: "https://private.example/x", action: "a@b.com", results_count: 3 }), { tool_id: "qr-code-generator", results_count: 3 });
  for (const url of ["http://127.0.0.1", "http://169.254.169.254/", "https://example.com:8080", "https://user:pass@example.com", "ftp://example.com"]) assert.throws(() => normalizeUserUrl(url));
  for (const body of [{ kind: "contact", message: 12 }, { kind: "invalid", message: "test" }, { kind: "contact", message: "" }]) {
    assert.equal((await POST(new Request("https://example.com/api/report", { method: "POST", body: JSON.stringify(body) }))).status, 400);
  }
  const entries = await sitemap();
  const urls = new Set(entries.map((entry) => entry.url));
  assert.equal(urls.size, entries.length);
  for (const tool of TOOLS) assert.equal(urls.has(absUrl(tool.path)), tool.indexable, tool.path);
  assert.equal(seedPosts.length, 13);
  for (const article of seedPosts) {
    assert.equal(urls.has(absUrl(`/blog/${article.slug}/`)), true, article.slug);
    const served = await getPublishedPost(article.slug);
    assert.equal(served?.seo.noindex, false, article.slug);
    assert.ok(served?.content.includes("](/blog-images/"), `${article.slug}: image in the article`);
    assert.ok(existsSync(`public${served!.featuredImage!.src}`), `${article.slug}: cover file`);
  }
  // Every replaced guide URL still answers: a new article, a 301 to a real replacement, or an explicit 410.
  const redirects = urlRules.redirects as Record<string, string>;
  for (const old of retiredPosts) {
    const path = `/blog/${old.slug}/`;
    if (seedPosts.some((p) => p.slug === old.slug)) {
      assert.ok(!redirects[path] && !urlRules.gone.includes(path), `${path} is live and must not be redirected`);
      continue;
    }
    assert.equal(urls.has(absUrl(path)), false, path);
    const target = redirects[path];
    if (target) assert.ok(urls.has(absUrl(target)) && !redirects[target], `${path} must redirect once, to a live URL: ${target}`);
    else assert.ok(urlRules.gone.includes(path), `${path} needs a redirect or a 410`);
  }
  const index = await llmsText();
  const full = await llmsText(true);
  for (const tool of TOOLS) assert.equal(index.includes(`](${absUrl(tool.path)})`), tool.indexable, tool.path);
  for (const article of seedPosts) assert.ok(full.includes(article.content), article.slug);
  assert.ok(!index.includes("/admin/"));
  const tool = TOOLS.find((t) => t.indexable && t.faq.length)!;
  const page = toolGraph(tool, []).find((n) => n["@type"] === "WebPage")!;
  assert.equal((page.hasPart as unknown[]).length, tool.faq.length);
  const sample = (await listPublishedPosts())[0];
  assert.deepEqual(blogPostGraph(sample, []).find((n) => n["@type"] === "WebPage")!.mainEntity, { "@id": `${absUrl(`/blog/${sample.slug}/`)}#article` });

  // The database migration, against an in-memory stand-in for the two collections it touches.
  type Doc = Record<string, unknown> & { _id: string; slug: string };
  const fakeDb = (initial: Doc[], markers: string[]) => {
    const docs = new Map(initial.map((d) => [d.slug, d]));
    const done = new Set(markers);
    const col = {
      findOne: async ({ slug }: { slug: string }) => docs.get(slug) ?? null,
      updateOne: async (filter: { slug?: string; _id?: string }, update: { $set?: Record<string, unknown>; $setOnInsert?: Doc }) => {
        const doc = [...docs.values()].find((d) => (filter._id ? d._id === filter._id : d.slug === filter.slug));
        if (doc && update.$set) Object.assign(doc, update.$set);
        else if (!doc && update.$setOnInsert) docs.set(update.$setOnInsert.slug, update.$setOnInsert);
      },
    };
    const db = { collection: () => ({ findOne: async ({ _id }: { _id: string }) => (done.has(_id) ? { _id } : null), updateOne: async ({ _id }: { _id: string }) => void done.add(_id) }) };
    return { docs, done, run: () => migrateArticles(db as unknown as Db as never, col as never) };
  };
  const stored = (slug: string, change: Record<string, unknown> = {}): Doc => {
    const { id, ...rest } = structuredClone(retiredPosts.find((p) => p.slug === slug)!);
    return { ...rest, _id: id, ...change };
  };

  const fresh = fakeDb([], []);
  await fresh.run();
  assert.equal(fresh.docs.size, 13);
  assert.ok([...fresh.docs.values()].every((d) => d.status === "published"));

  const live = fakeDb([
    stored("reduce-pdf-file-size"),
    stored("reduce-photo-size-in-kb", { content: "Editor content", dateModified: "2026-11-01T00:00:00.000Z" }),
    stored("hreflang-guide"),
    stored("canonical-tags-explained", { dateModified: "2026-11-02T00:00:00.000Z" }),
    // jpg-vs-png-vs-webp was deleted in /admin/ after the earlier import, so it is absent here.
  ], ["restore-published-guides-v1"]);
  await live.run();
  const article = seedPosts.find((p) => p.slug === "reduce-pdf-file-size")!;
  assert.equal(live.docs.get("reduce-pdf-file-size")!.content, article.content, "an untouched guide is replaced");
  assert.equal(live.docs.get("reduce-pdf-file-size")!._id, "legacy-reduce-pdf-file-size", "and keeps its database id");
  assert.equal(live.docs.get("reduce-photo-size-in-kb")!.content, "Editor content", "edited guides are left alone");
  assert.equal(live.docs.get("hreflang-guide")!.status, "draft", "an untouched retired guide becomes a draft, not deleted");
  assert.equal(live.docs.get("canonical-tags-explained")!.status, "published", "an edited retired guide keeps its status");
  assert.equal(live.docs.has("jpg-vs-png-vs-webp"), false, "a deleted guide URL is not brought back");
  assert.ok(live.docs.has("how-to-fix-invalid-json"), "new articles are added");
  live.docs.get("how-to-fix-invalid-json")!.content = "Edited after launch";
  await live.run();
  assert.equal(live.docs.get("how-to-fix-invalid-json")!.content, "Edited after launch", "the migration runs once");
  console.log(`SEO regression checks passed; ${entries.length} unique sitemap URLs.`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
