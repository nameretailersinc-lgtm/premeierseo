import { errorResponse, guard, json, readBody } from "@/lib/server/api";
import { normalizeUserUrl, safeFetch } from "@/lib/server/safe-fetch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST { url, kind: "robots" | "feed" | "sitemap" }
 * Returns the raw text of a robots.txt file (resolved from the site's origin), an RSS/Atom feed or an XML sitemap.
 * Parsing happens in the browser.
 */
export async function POST(req: Request) {
  const blocked = guard(req);
  if (blocked) return blocked;
  const body = await readBody<{ url?: string; kind?: string }>(req);
  if (!body?.url) return json({ error: { code: "INVALID_URL", message: "Enter a web address." } }, 400);
  try {
    let target = normalizeUserUrl(body.url);
    if (body.kind === "robots") target = new URL("/robots.txt", target.origin);
    const r = await safeFetch(target, {
      maxBytes: body.kind === "robots" ? 600_000 : 3_000_000,
      accept: body.kind === "robots" ? "text/plain,*/*;q=0.5" : "application/rss+xml,application/atom+xml,application/xml,text/xml;q=0.9,*/*;q=0.5",
    });
    return json({
      checkedAt: new Date().toISOString(),
      requestedUrl: target.toString(),
      finalUrl: r.finalUrl,
      status: r.status,
      hops: r.hops.map((h) => ({ url: h.url, status: h.status, location: h.location })),
      contentType: r.headers["content-type"] || "",
      truncated: r.truncated,
      text: r.body.toString("utf8"),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
