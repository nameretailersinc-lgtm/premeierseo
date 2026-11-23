import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/server/admin-auth";

export async function POST() {
  const res = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  res.cookies.set({ name: SESSION_COOKIE, value: "", path: "/", maxAge: 0 });
  return res;
}
