import { NextResponse } from "next/server";
import { adminEnabled, checkPassword, clearLoginFailures, createSessionToken, loginThrottled, recordLoginFailure, sessionCookie } from "@/lib/server/admin-auth";
import { clientIp } from "@/lib/server/safe-fetch";

const H = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

export async function POST(req: Request) {
  if (!adminEnabled()) return NextResponse.json({ error: "Admin is disabled: set ADMIN_PASSWORD on the server." }, { status: 503, headers: H });
  const ip = clientIp(req);
  if (loginThrottled(ip)) return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429, headers: H });
  let password = "";
  try {
    const body = (await req.json()) as { password?: unknown };
    password = typeof body.password === "string" ? body.password.slice(0, 500) : "";
  } catch {}
  if (!checkPassword(password)) {
    recordLoginFailure(ip);
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ error: "Wrong password." }, { status: 401, headers: H });
  }
  clearLoginFailures(ip);
  const res = NextResponse.json({ ok: true }, { headers: H });
  res.cookies.set(sessionCookie(createSessionToken()));
  return res;
}
