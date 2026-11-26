import assert from "node:assert/strict";
import { analyzeHtml } from "../src/lib/server/analyze-html";
import { guard, readBody } from "../src/lib/server/api";
import { isBlockedIp, normalizeUserUrl } from "../src/lib/server/safe-fetch";
import { POST } from "../src/app/api/report/route";
import sitemap from "../src/app/sitemap";
import { TOOLS } from "../src/content/tools";
import { absUrl } from "../src/lib/site";
import legacyPosts from "../src/content/legacy-blog.json";
import { llmsText } from "../src/lib/server/llms";
import { getPublishedPost, listPublishedPosts, deletePost } from "../src/lib/server/blog-store";
import { __setTestDb } from "../src/lib/server/mongo";
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
  for (const url of ["http://127.0.0.1", "http://169.254.169.254/", "https://example.com:8080", "https://user:pass@example.com", "ftp://example.com"]) assert.throws(() => normalizeUserUrl(url));
  for (const body of [{ kind: "contact", message: 12 }, { kind: "invalid", message: "test" }, { kind: "contact", message: "" }]) {
    assert.equal((await POST(new Request("https://example.com/api/report", { method: "POST", body: JSON.stringify(body) }))).status, 400);
  }
  const entries = await sitemap();
  const urls = new Set(entries.map((entry) => entry.url));
  assert.equal(urls.size, entries.length);
  for (const tool of TOOLS) assert.equal(urls.has(absUrl(tool.path)), tool.indexable, tool.path);
  assert.equal(legacyPosts.length, 18);
  for (const original of legacyPosts) {
    assert.equal(urls.has(absUrl(`/blog/${original.slug}/`)), true, original.slug);
    const restored = await getPublishedPost(original.slug);
    assert.equal(restored?.dateModified, original.dateModified);
    assert.ok(restored?.content.includes("## "));
  }
  const index = await llmsText();
  const full = await llmsText(true);
  for (const tool of TOOLS) assert.equal(index.includes(`](${absUrl(tool.path)})`), tool.indexable, tool.path);
  for (const original of legacyPosts) assert.ok(full.includes(original.content), original.slug);
  assert.ok(!index.includes("/admin/"));
  const tool = TOOLS.find((t) => t.indexable && t.faq.length)!;
  const page = toolGraph(tool, []).find((n) => n["@type"] === "WebPage")!;
  assert.equal((page.hasPart as unknown[]).length, tool.faq.length);
  const article = (await listPublishedPosts())[0];
  assert.deepEqual(blogPostGraph(article, []).find((n) => n["@type"] === "WebPage")!.mainEntity, { "@id": `${absUrl(`/blog/${article.slug}/`)}#article` });

  // Exercise the actual migration with an existing editor-owned draft of one old slug.
  const existing = { ...structuredClone(legacyPosts[0]), id: undefined, _id: "editor-owned", status: "draft", content: "Editor content" };
  const docs = new Map<string, Record<string, unknown>>([[existing.slug, existing]]);
  let marked = false;
  const collection = {
    createIndex: async () => "index",
    bulkWrite: async (operations: { updateOne: { filter: { slug: string }; update: { $setOnInsert: Record<string, unknown> } } }[]) => {
      for (const { updateOne: op } of operations) if (!docs.has(op.filter.slug)) docs.set(op.filter.slug, op.update.$setOnInsert);
    },
    find: (query: { status?: string }) => ({ sort: () => ({ toArray: async () => [...docs.values()].filter((p) => !query.status || p.status === query.status) }) }),
    findOne: async ({ slug, status }: { slug: string; status?: string }) => {
      const doc = docs.get(slug);
      return doc && (!status || doc.status === status) ? doc : null;
    },
    findOneAndDelete: async ({ _id }: { _id: string }) => {
      const doc = [...docs.values()].find((p) => p._id === _id);
      if (doc) docs.delete(String(doc.slug));
      return doc ?? null;
    },
  };
  __setTestDb({ collection: (name: string) => name === "blog_migrations"
    ? { findOne: async () => marked ? { _id: "restore-published-guides-v1" } : null, updateOne: async () => { marked = true; } }
    : collection } as unknown as Db);
  try {
    await getPublishedPost(legacyPosts[1].slug);
    assert.equal(docs.size, 18);
    assert.equal(docs.get(existing.slug)?.content, "Editor content");
    assert.equal(docs.get(existing.slug)?.status, "draft");
    assert.equal(marked, true);
    assert.equal(await getPublishedPost(existing.slug), undefined);
    assert.ok(!(await llmsText(true)).includes("Editor content"), "Drafts must stay out of AI discovery");
    await deletePost(legacyPosts[1].id);
    assert.equal(await getPublishedPost(legacyPosts[1].slug), undefined, "Deleted guides must not reappear");
  } finally { __setTestDb(undefined); }
  console.log(`SEO regression checks passed; ${entries.length} unique sitemap URLs.`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
