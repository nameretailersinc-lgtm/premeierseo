import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/*
 * Single-admin auth. Set ADMIN_PASSWORD (required to enable /admin/) and ideally ADMIN_SESSION_SECRET.
 * The session cookie is "<expiry>.<hmac>", httpOnly + SameSite=Strict, so it can't be read by scripts
 * or sent with cross-site requests. Changing the password or secret signs every session out.
 */

export const SESSION_COOKIE = "pss_admin";
const MAX_AGE = 60 * 60 * 12; // 12 hours

function secret(): string | null {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return null;
  return process.env.ADMIN_SESSION_SECRET || createHash("sha256").update(`pss-admin:${pw}`).digest("hex");
}

export function adminEnabled(): boolean {
  return !!process.env.ADMIN_PASSWORD;
}

function sign(payload: string, key: string) {
  return createHmac("sha256", key).update(`${payload}:${process.env.ADMIN_PASSWORD}`).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function checkPassword(input: string): boolean {
  const pw = process.env.ADMIN_PASSWORD;
  return !!pw && typeof input === "string" && safeEqual(input, pw);
}

export function createSessionToken(): string {
  const key = secret()!;
  const exp = String(Math.floor(Date.now() / 1000) + MAX_AGE);
  return `${exp}.${sign(exp, key)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  const key = secret();
  if (!key || !token) return false;
  const [exp, mac] = token.split(".");
  if (!exp || !mac || !/^\d+$/.test(exp) || Number(exp) < Date.now() / 1000) return false;
  return safeEqual(mac, sign(exp, key));
}

export function sessionCookie(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production" && process.env.ADMIN_INSECURE_COOKIE !== "1",
    path: "/",
    maxAge: MAX_AGE,
  };
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value);
}

/** For admin pages: bounce to the login screen when not signed in. */
export async function requireAdminPage() {
  if (!(await isAdmin())) redirect("/admin/login/");
}

/** For admin API routes: same-origin check + session. Returns an error Response or null. */
export function requireAdminApi(req: Request): Response | null {
  const deny = (status: number, message: string) =>
    Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
  if (!adminEnabled()) return deny(503, "Admin is disabled: set ADMIN_PASSWORD on the server.");
  if (req.method !== "GET") {
    const origin = req.headers.get("origin");
    const hosts = [req.headers.get("x-forwarded-host"), req.headers.get("host")].filter(Boolean);
    try {
      if (!origin || !hosts.includes(new URL(origin).host)) return deny(403, "Cross-site request blocked.");
    } catch {
      return deny(403, "Cross-site request blocked.");
    }
  }
  const cookie = req.headers.get("cookie") || "";
  const token = cookie
    .split(/;\s*/)
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  if (!verifySessionToken(token ? decodeURIComponent(token) : undefined)) return deny(401, "Signed out. Log in again.");
  return null;
}

/* Brute-force throttle for the login endpoint: 8 failures per IP per 15 minutes. */
const fails = new Map<string, { n: number; until: number }>();
export function loginThrottled(ip: string): boolean {
  const f = fails.get(ip);
  return !!f && f.n >= 8 && f.until > Date.now();
}
export function recordLoginFailure(ip: string) {
  const f = fails.get(ip);
  const until = Date.now() + 15 * 60_000;
  fails.set(ip, { n: f && f.until > Date.now() ? f.n + 1 : 1, until });
  if (fails.size > 5000) fails.clear();
}
export function clearLoginFailures(ip: string) {
  fails.delete(ip);
}
