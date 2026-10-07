import { guard, json, readBody } from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * POST { kind: "problem" | "contact", tool?, reason?, message, email?, website (honeypot) }
 * Forwards to REPORT_WEBHOOK_URL (e.g. a Slack/Discord/Make/Zapier webhook or email relay) when configured.
 * Nothing is stored on our side. Without a webhook the endpoint says so, and the form shows the email address.
 */
export async function POST(req: Request) {
  const blocked = guard(req, 5);
  if (blocked) return blocked;
  const body = await readBody<{ kind?: string; tool?: string; reason?: string; message?: string; email?: string; website?: string; topic?: string; name?: string }>(req, 10_000);
  if (!body) return json({ error: { code: "INVALID", message: "Please fill in the form." } }, 400);
  if (body.website) return json({ ok: true }); // honeypot: silently accept bots
  const message = (body.message ?? "").trim().slice(0, 4000);
  const email = (body.email ?? "").trim().slice(0, 200);
  if (!message && body.kind !== "problem") return json({ error: { code: "INVALID", message: "Please write a message." } }, 400);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: { code: "INVALID_EMAIL", message: "That email address doesn't look right." } }, 400);
  const hook = process.env.REPORT_WEBHOOK_URL;
  if (!hook) {
    return json({ error: { code: "NOT_CONFIGURED", message: "The form isn't connected yet. Please email info@premierseoservices.com instead." } }, 503);
  }
  const payload = {
    text: [
      `New ${body.kind === "problem" ? "tool problem report" : "contact message"}`,
      body.tool ? `Tool: ${String(body.tool).slice(0, 100)}` : "",
      body.reason ? `Reason: ${String(body.reason).slice(0, 100)}` : "",
      body.topic ? `Topic: ${String(body.topic).slice(0, 100)}` : "",
      body.name ? `Name: ${String(body.name).slice(0, 100)}` : "",
      email ? `Reply to: ${email}` : "No reply address",
      "",
      message,
    ]
      .filter((l) => l !== "")
      .join("\n"),
  };
  try {
    const r = await fetch(hook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(String(r.status));
    return json({ ok: true });
  } catch {
    return json({ error: { code: "SEND_FAILED", message: "We couldn't send your message. Please email info@premierseoservices.com." } }, 502);
  }
}
