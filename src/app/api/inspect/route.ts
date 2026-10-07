import { analyzeHtml } from "@/lib/server/analyze-html";
import { errorResponse, guard, json, pickHeaders, readBody } from "@/lib/server/api";
import { safeFetch } from "@/lib/server/safe-fetch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST { url, includeText?: boolean, includeAnchors?: boolean }
 * Fetches a page from our server and returns the redirect chain, response facts and parsed HTML facts.
 * Used by: meta tags analyzer, OG checker, heading extractor, SEO checklist, keyword density (URL mode),
 * page size checker, backlink verifier.
 */
export async function POST(req: Request) {
  const blocked = guard(req);
  if (blocked) return blocked;
  const body = await readBody<{ url?: string; includeText?: boolean; includeAnchors?: boolean }>(req);
  if (!body?.url) return json({ error: { code: "INVALID_URL", message: "Enter a web address." } }, 400);
  try {
    const r = await safeFetch(body.url);
    const type = r.headers["content-type"] || "";
    const isHtml = /html|xml/i.test(type) || /^\s*</.test(r.body.subarray(0, 200).toString("utf8"));
    const facts = isHtml && r.status < 400 ? analyzeHtml(r.body.toString("utf8"), r.finalUrl) : null;
    if (facts && !body.includeText) facts.text = "";
    if (facts && !body.includeAnchors) facts.anchors = [];
    return json({
      checkedAt: new Date().toISOString(),
      requestedUrl: r.requestedUrl,
      finalUrl: r.finalUrl,
      status: r.status,
      statusText: r.statusText,
      hops: r.hops.map((h) => ({ url: h.url, status: h.status, statusText: h.statusText, location: h.location, ms: h.ms })),
      headers: pickHeaders(r.headers),
      contentType: type,
      htmlBytes: r.body.length,
      transferBytes: r.transferBytes,
      truncated: r.truncated,
      totalMs: r.totalMs,
      ttfbMs: r.ttfbMs,
      tls: r.tls,
      facts,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
