import "server-only";
import { FetchError, clientIp, rateLimit } from "./safe-fetch";

/** Shared helpers for /api route handlers: JSON body parsing, rate limit, error mapping. */

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}

export async function readBody<T>(req: Request, maxBytes = 20_000): Promise<T | null> {
  const len = Number(req.headers.get("content-length") || 0);
  if (len > maxBytes) return null;
  try {
    const text = await req.text();
    if (text.length > maxBytes) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function guard(req: Request, limit = 30): Response | null {
  if (!rateLimit(clientIp(req), limit)) {
    return json({ error: { code: "RATE_LIMITED", message: "Too many checks in a short time. Please wait a minute and try again." } }, 429);
  }
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin && host && new URL(origin).host !== host) {
    return json({ error: { code: "FORBIDDEN", message: "Cross-site requests are not allowed." } }, 403);
  }
  return null;
}

export function errorResponse(e: unknown) {
  if (e instanceof FetchError) {
    // Target-side problems are results about the site, not our failures: 200 with an error payload.
    return json(
      { error: { code: e.code, message: e.message }, ...(e.hops?.length ? { hops: e.hops } : {}) },
      e.code === "INVALID_URL" || e.code === "BLOCKED_ADDRESS" ? 400 : 200,
    );
  }
  console.error("[api]", e);
  return json({ error: { code: "CHECKER_UNAVAILABLE", message: "Our checker failed. Please try again in a moment." } }, 500);
}

export function pickHeaders(h: Record<string, string>) {
  const keep = [
    "content-type",
    "content-length",
    "content-encoding",
    "cache-control",
    "last-modified",
    "etag",
    "server",
    "x-robots-tag",
    "location",
    "strict-transport-security",
    "content-security-policy",
    "x-frame-options",
    "x-content-type-options",
    "referrer-policy",
    "link",
    "vary",
    "age",
    "via",
    "x-cache",
    "cf-cache-status",
  ];
  const out: Record<string, string> = {};
  for (const k of keep) if (h[k]) out[k] = h[k].slice(0, 1000);
  return out;
}
