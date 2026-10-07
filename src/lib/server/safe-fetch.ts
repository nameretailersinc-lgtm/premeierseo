import "server-only";
import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import zlib from "node:zlib";

/*
 * SSRF-safe HTTP client for the URL-checking tools.
 * - http/https only, default ports 80/443 only
 * - every address is validated at CONNECT time via a custom `lookup` (defeats DNS rebinding)
 * - rejects private, loopback, link-local, CGNAT, multicast, reserved and documentation ranges (IPv4 + IPv6)
 * - redirects are followed manually (max 10), each hop re-validated and recorded
 * - hard timeout per request and a response-size cap; bodies are never stored
 */

export const USER_AGENT =
  "Mozilla/5.0 (compatible; PremierSEOServicesBot/1.0; +https://premierseoservices.com/about-us/)";

export class FetchError extends Error {
  constructor(
    public code:
      | "INVALID_URL"
      | "BLOCKED_ADDRESS"
      | "DNS_FAILED"
      | "TIMEOUT"
      | "CONNECTION_FAILED"
      | "TOO_MANY_REDIRECTS"
      | "TOO_LARGE"
      | "TLS_ERROR",
    message: string,
    /** Hops completed before the error (e.g. a redirect loop), so callers can still show the chain. */
    public hops?: { url: string; status: number; statusText: string; location?: string; ms: number }[],
  ) {
    super(message);
  }
}

function ipv4ToInt(ip: string) {
  return ip.split(".").reduce((a, o) => (a << 8) + Number(o), 0) >>> 0;
}
const V4_BLOCKS: [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

export function isBlockedIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const n = ipv4ToInt(ip);
    return V4_BLOCKS.some(([base, bits]) => {
      const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
      return (n & mask) === (ipv4ToInt(base) & mask);
    });
  }
  if (net.isIPv6(ip)) {
    const l = ip.toLowerCase();
    if (l === "::" || l === "::1") return true;
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(l);
    if (mapped) return isBlockedIp(mapped[1]);
    if (/^::ffff:[0-9a-f]{1,4}:[0-9a-f]{1,4}$/.test(l)) return true; // hex-form mapped v4: reject conservatively
    const first = parseInt(l.split(":")[0] || "0", 16);
    if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
    if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
    if ((first & 0xff00) === 0xff00) return true; // multicast
    if (l.startsWith("2001:db8")) return true; // documentation
    if (l.startsWith("64:ff9b")) return true; // NAT64
    if (l.startsWith("2002:")) return true; // 6to4 can embed private v4
    return false;
  }
  return true;
}

function safeLookup(
  hostname: string,
  options: dns.LookupOptions,
  callback: (err: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number) => void,
) {
  dns.lookup(hostname, { all: true }, (err, addresses) => {
    if (err) return callback(err, "", 4);
    const list = addresses as dns.LookupAddress[];
    const bad = list.find((a) => isBlockedIp(a.address));
    if (!list.length || bad) {
      const e = new Error(`Blocked address for ${hostname}`) as NodeJS.ErrnoException;
      e.code = "EBLOCKED";
      return callback(e, "", 4);
    }
    if (options.all) return callback(null, list);
    return callback(null, list[0].address, list[0].family);
  });
}

export function normalizeUserUrl(input: string): URL {
  let s = input.trim();
  if (!s) throw new FetchError("INVALID_URL", "Enter a web address.");
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = `https://${s}`;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    throw new FetchError("INVALID_URL", "That doesn't look like a valid web address.");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new FetchError("INVALID_URL", "Only http:// and https:// addresses can be checked.");
  if (u.username || u.password) throw new FetchError("INVALID_URL", "Addresses containing a username or password can't be checked.");
  if (u.port && u.port !== "80" && u.port !== "443") throw new FetchError("INVALID_URL", "Only the standard web ports (80 and 443) can be checked.");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host) && isBlockedIp(host)) throw new FetchError("BLOCKED_ADDRESS", "Private and local network addresses can't be checked.");
  if (!net.isIP(host) && !/\.[a-z0-9-]{2,}$/i.test(host)) throw new FetchError("INVALID_URL", "Enter a full domain name, such as example.com.");
  if (/(^|\.)(localhost|local|internal|intranet|home|lan|corp)$/i.test(host)) throw new FetchError("BLOCKED_ADDRESS", "Local network names can't be checked.");
  u.hash = "";
  return u;
}

export interface Hop {
  url: string;
  status: number;
  statusText: string;
  location?: string;
  ms: number;
  headers: Record<string, string>;
}

export interface SafeResponse {
  requestedUrl: string;
  finalUrl: string;
  status: number;
  statusText: string;
  hops: Hop[];
  headers: Record<string, string>;
  body: Buffer;
  /** Bytes received on the wire (before decompression). */
  transferBytes: number;
  truncated: boolean;
  totalMs: number;
  ttfbMs: number;
  tls?: { protocol?: string; validTo?: string; issuer?: string; subject?: string; authorized: boolean };
}

interface Options {
  method?: "GET" | "HEAD";
  maxRedirects?: number;
  followRedirects?: boolean;
  timeoutMs?: number;
  maxBytes?: number;
  userAgent?: string;
  accept?: string;
}

function one(u: URL, o: Required<Options>): Promise<{ hop: Hop; body: Buffer; transfer: number; truncated: boolean; ttfb: number; tls?: SafeResponse["tls"] }> {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const lib = u.protocol === "https:" ? https : http;
    const req = lib.request(
      u,
      {
        method: o.method,
        lookup: safeLookup as unknown as typeof dns.lookup,
        headers: {
          "user-agent": o.userAgent,
          accept: o.accept,
          "accept-encoding": "gzip, deflate, br",
          "accept-language": "en",
        },
        timeout: o.timeoutMs,
        rejectUnauthorized: true,
      },
      (res) => {
        const ttfb = performance.now() - start;
        let tls: SafeResponse["tls"];
        const sock = res.socket as import("node:tls").TLSSocket;
        if (typeof sock.getPeerCertificate === "function") {
          const c = sock.getPeerCertificate();
          tls = {
            protocol: sock.getProtocol?.() ?? undefined,
            validTo: c?.valid_to,
            issuer: [c?.issuer?.O ?? c?.issuer?.CN].flat()[0],
            subject: [c?.subject?.CN].flat()[0],
            authorized: sock.authorized,
          };
        }
        const headers: Record<string, string> = {};
        for (const [k, v] of Object.entries(res.headers)) if (v !== undefined) headers[k] = Array.isArray(v) ? v.join(", ") : String(v);
        const chunks: Buffer[] = [];
        let transfer = 0;
        let truncated = false;
        const isRedirect = [301, 302, 303, 307, 308].includes(res.statusCode ?? 0) && o.followRedirects;
        if (o.method === "HEAD" || isRedirect) {
          res.resume();
        } else {
          res.on("data", (c: Buffer) => {
            transfer += c.length;
            if (transfer > o.maxBytes) {
              truncated = true;
              res.destroy();
              return;
            }
            chunks.push(c);
          });
        }
        const done = () => {
          const raw = Buffer.concat(chunks);
          const enc = (headers["content-encoding"] || "").toLowerCase();
          let body = raw;
          try {
            if (!truncated && raw.length) {
              if (enc.includes("br")) body = zlib.brotliDecompressSync(raw);
              else if (enc.includes("gzip")) body = zlib.gunzipSync(raw);
              else if (enc.includes("deflate")) body = zlib.inflateSync(raw);
            }
          } catch {
            body = raw;
          }
          resolve({
            hop: {
              url: u.toString(),
              status: res.statusCode ?? 0,
              statusText: res.statusMessage ?? "",
              location: headers.location,
              ms: Math.round(performance.now() - start),
              headers,
            },
            body,
            transfer,
            truncated,
            ttfb: Math.round(ttfb),
            tls,
          });
        };
        res.on("end", done);
        res.on("close", () => {
          if (truncated) done();
        });
        res.on("error", (e) => reject(e));
      },
    );
    req.on("timeout", () => req.destroy(new FetchError("TIMEOUT", `The site didn't respond within ${Math.round(o.timeoutMs / 1000)} seconds.`)));
    req.on("error", (e: NodeJS.ErrnoException) => {
      if (e instanceof FetchError) return reject(e);
      if (e.code === "EBLOCKED") return reject(new FetchError("BLOCKED_ADDRESS", "That address points to a private or reserved network and can't be checked."));
      if (e.code === "ENOTFOUND" || e.code === "EAI_AGAIN") return reject(new FetchError("DNS_FAILED", "The domain name could not be found (DNS lookup failed)."));
      if (/CERT|SSL|TLS/i.test(e.code ?? "") || /certificate/i.test(e.message)) return reject(new FetchError("TLS_ERROR", `The site's HTTPS certificate is not valid (${e.code ?? e.message}).`));
      reject(new FetchError("CONNECTION_FAILED", `Couldn't connect to the site (${e.code ?? e.message}).`));
    });
    req.end();
  });
}

export async function safeFetch(input: string | URL, opts: Options = {}): Promise<SafeResponse> {
  const o: Required<Options> = {
    method: opts.method ?? "GET",
    maxRedirects: opts.maxRedirects ?? 10,
    followRedirects: opts.followRedirects ?? true,
    timeoutMs: opts.timeoutMs ?? 10_000,
    maxBytes: opts.maxBytes ?? 5_000_000,
    userAgent: opts.userAgent ?? USER_AGENT,
    accept: opts.accept ?? "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  };
  let url = typeof input === "string" ? normalizeUserUrl(input) : input;
  const requestedUrl = url.toString();
  const hops: Hop[] = [];
  const t0 = performance.now();
  for (let i = 0; i <= o.maxRedirects; i++) {
    const r = await one(url, o);
    hops.push(r.hop);
    const isRedirect = [301, 302, 303, 307, 308].includes(r.hop.status) && r.hop.location;
    if (isRedirect && o.followRedirects) {
      if (i === o.maxRedirects)
        throw new FetchError(
          "TOO_MANY_REDIRECTS",
          `Stopped after ${o.maxRedirects} redirects (possible redirect loop).`,
          hops.map((h) => ({ url: h.url, status: h.status, statusText: h.statusText, location: h.location, ms: h.ms })),
        );
      const next = new URL(r.hop.location!, url);
      url = normalizeUserUrl(next.toString());
      continue;
    }
    return {
      requestedUrl,
      finalUrl: url.toString(),
      status: r.hop.status,
      statusText: r.hop.statusText,
      hops,
      headers: r.hop.headers,
      body: r.body,
      transferBytes: r.transfer,
      truncated: r.truncated,
      totalMs: Math.round(performance.now() - t0),
      ttfbMs: r.ttfb,
      tls: r.tls,
    };
  }
  throw new FetchError("TOO_MANY_REDIRECTS", "Too many redirects.");
}

/* ---------- Best-effort per-IP rate limit (use platform rate limiting in production too) ---------- */
const buckets = new Map<string, { n: number; reset: number }>();
export function rateLimit(ip: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || b.reset < now) {
    buckets.set(ip, { n: 1, reset: now + windowMs });
    if (buckets.size > 10_000) for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
    return true;
  }
  b.n++;
  return b.n <= limit;
}

export function clientIp(req: Request): string {
  const h = req.headers;
  return (h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown").slice(0, 64);
}
