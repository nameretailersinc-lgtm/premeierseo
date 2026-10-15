import assert from "node:assert/strict";
import { analyzeHtml } from "../src/lib/server/analyze-html";
import { guard, readBody } from "../src/lib/server/api";
import { isBlockedIp, normalizeUserUrl } from "../src/lib/server/safe-fetch";
import { POST } from "../src/app/api/report/route";
import sitemap from "../src/app/sitemap";
import { TOOLS } from "../src/content/tools";
import { GUIDES } from "../src/content/guides";
import { absUrl } from "../src/lib/site";

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
  const entries = sitemap();
  const urls = new Set(entries.map((entry) => entry.url));
  assert.equal(urls.size, entries.length);
  for (const tool of TOOLS) assert.equal(urls.has(absUrl(tool.path)), tool.indexable, tool.path);
  for (const guide of GUIDES) assert.equal(urls.has(absUrl(guide.path)), true, guide.path);
  console.log(`SEO regression checks passed; ${entries.length} unique sitemap URLs.`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
