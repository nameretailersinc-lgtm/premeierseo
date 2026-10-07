import { errorResponse, guard, json, pickHeaders, readBody } from "@/lib/server/api";
import { USER_AGENT, safeFetch } from "@/lib/server/safe-fetch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AGENTS: Record<string, string> = {
  default: USER_AGENT,
  chrome: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36",
  mobile: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  googlebot: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
};

/**
 * POST { url, method?: "GET"|"HEAD", userAgent?: "default"|"chrome"|"mobile"|"googlebot", follow?: boolean }
 * or { urls: string[] } (bulk, max 20). Returns status, each redirect hop and response headers.
 */
export async function POST(req: Request) {
  const blocked = guard(req, 40);
  if (blocked) return blocked;
  const body = await readBody<{ url?: string; urls?: string[]; method?: "GET" | "HEAD"; userAgent?: string; follow?: boolean }>(req);
  if (!body) return json({ error: { code: "INVALID_URL", message: "Enter a web address." } }, 400);
  const method = body.method === "HEAD" ? "HEAD" : "GET";
  const ua = AGENTS[body.userAgent ?? "default"] ?? USER_AGENT;
  const check = async (url: string) => {
    try {
      const r = await safeFetch(url, { method, userAgent: ua, followRedirects: body.follow !== false, maxBytes: 3_000_000 });
      return {
        url,
        finalUrl: r.finalUrl,
        status: r.status,
        statusText: r.statusText,
        hops: r.hops.map((h) => ({ url: h.url, status: h.status, statusText: h.statusText, location: h.location, ms: h.ms, headers: pickHeaders(h.headers) })),
        headers: pickHeaders(r.headers),
        totalMs: r.totalMs,
        ttfbMs: r.ttfbMs,
        transferBytes: r.transferBytes,
        bodyBytes: r.body.length,
        tls: r.tls,
      };
    } catch (e) {
      const res = errorResponse(e);
      const data = (await res.json()) as { error: { code: string; message: string }; hops?: unknown[] };
      return { url, error: data.error, ...(data.hops ? { hops: data.hops } : {}) };
    }
  };
  if (Array.isArray(body.urls)) {
    const urls = body.urls.filter((u) => typeof u === "string" && u.trim()).slice(0, 20);
    const results = [];
    for (let i = 0; i < urls.length; i += 5) results.push(...(await Promise.all(urls.slice(i, i + 5).map(check))));
    return json({ checkedAt: new Date().toISOString(), method, results });
  }
  if (!body.url) return json({ error: { code: "INVALID_URL", message: "Enter a web address." } }, 400);
  const result = await check(body.url);
  if ("error" in result && result.error && (result.error.code === "INVALID_URL" || result.error.code === "BLOCKED_ADDRESS")) return json(result, 400);
  return json({ checkedAt: new Date().toISOString(), method, ...result });
}
