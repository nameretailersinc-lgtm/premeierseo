import net from "node:net";
import { guard, json, readBody } from "@/lib/server/api";
import { clientIp, isBlockedIp } from "@/lib/server/safe-fetch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * GET  → the visitor's own public IP (from proxy headers) plus country/region from the hosting edge when available.
 * POST { ip } → geolocation via ipinfo.io, only if IPINFO_TOKEN is configured (provider is named on the tool page).
 */

async function lookup(ip: string) {
  const token = process.env.IPINFO_TOKEN;
  if (!token) return null;
  const res = await fetch(`https://api.ipinfo.io/lite/${encodeURIComponent(ip)}?token=${token}`, {
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const d = (await res.json()) as Record<string, string>;
  return {
    ip: d.ip,
    country: d.country ?? null,
    countryCode: d.country_code ?? null,
    continent: d.continent ?? null,
    asn: d.asn ?? null,
    asName: d.as_name ?? null,
    asDomain: d.as_domain ?? null,
    provider: "ipinfo.io",
  };
}

export async function GET(req: Request) {
  const blocked = guard(req, 60);
  if (blocked) return blocked;
  const ip = clientIp(req);
  const h = req.headers;
  const edge = {
    country: h.get("x-vercel-ip-country") || h.get("cf-ipcountry") || null,
    region: h.get("x-vercel-ip-country-region") || null,
    city: h.get("x-vercel-ip-city") ? decodeURIComponent(h.get("x-vercel-ip-city")!) : null,
  };
  const version = net.isIPv6(ip) ? 6 : net.isIPv4(ip) ? 4 : null;
  const geo = version && !isBlockedIp(ip) ? await lookup(ip).catch(() => null) : null;
  return json({ ip: version ? ip : null, version, edge, geo, providerConfigured: Boolean(process.env.IPINFO_TOKEN) });
}

export async function POST(req: Request) {
  const blocked = guard(req, 30);
  if (blocked) return blocked;
  const body = await readBody<{ ip?: string }>(req);
  const ip = (body?.ip ?? "").trim();
  if (!net.isIP(ip)) return json({ error: { code: "INVALID_IP", message: "Enter a valid IPv4 or IPv6 address." } }, 400);
  if (isBlockedIp(ip))
    return json({ ip, private: true, message: "This is a private, local or reserved address. It isn't routed on the public internet, so it has no public location." });
  if (!process.env.IPINFO_TOKEN)
    return json({ ip, geo: null, providerConfigured: false, message: "Location lookup isn't configured on this server." });
  const geo = await lookup(ip).catch(() => null);
  return json({ ip, geo, providerConfigured: true });
}
