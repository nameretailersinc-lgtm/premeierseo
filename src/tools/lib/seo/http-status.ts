/* Plain-English meanings of HTTP status codes (RFC 9110 and common extensions), plus redirect-chain analysis. */
import type { Hop } from "./api";

const MEANING: Record<number, string> = {
  200: "OK: the page was returned normally.",
  201: "Created.",
  202: "Accepted: the request was queued but not completed.",
  203: "Non-authoritative information: returned via a proxy that changed it.",
  204: "No content: success, but nothing to show.",
  206: "Partial content: only part of the file was returned.",
  301: "Moved permanently: the URL has a new permanent address. Search engines transfer signals to it.",
  302: "Found (temporary redirect): the URL is temporarily elsewhere. Use 301 for permanent moves.",
  303: "See other: redirect after a form submission.",
  304: "Not modified: the cached copy is still current.",
  307: "Temporary redirect: like 302, but the request method must not change.",
  308: "Permanent redirect: like 301, but the request method must not change.",
  400: "Bad request: the server couldn't understand the request.",
  401: "Unauthorized: a login is required.",
  403: "Forbidden: the server refused access. Some sites block automated checks like ours.",
  404: "Not found: no page exists at this address.",
  405: "Method not allowed: try GET instead of HEAD, or vice versa.",
  406: "Not acceptable.",
  408: "Request timeout.",
  410: "Gone: the page was removed on purpose. Search engines drop it slightly faster than a 404.",
  418: "I'm a teapot: a joke code some sites return to bots.",
  429: "Too many requests: the server is rate-limiting.",
  451: "Unavailable for legal reasons.",
  500: "Internal server error: the server or application crashed.",
  501: "Not implemented.",
  502: "Bad gateway: a proxy or CDN got an invalid response from the origin server.",
  503: "Service unavailable: overloaded or under maintenance. Search engines retry later.",
  504: "Gateway timeout: a proxy or CDN didn't get a response from the origin in time.",
  520: "Cloudflare 520: the origin server returned an unknown error.",
  521: "Cloudflare 521: the origin server refused the connection.",
  522: "Cloudflare 522: connection to the origin timed out.",
  523: "Cloudflare 523: the origin is unreachable.",
  524: "Cloudflare 524: the origin took too long to respond.",
  525: "Cloudflare 525: TLS handshake with the origin failed.",
  526: "Cloudflare 526: the origin's certificate is invalid.",
};

export function statusMeaning(code: number): string {
  if (MEANING[code]) return MEANING[code];
  if (code >= 200 && code < 300) return "Success.";
  if (code >= 300 && code < 400) return "Redirect.";
  if (code >= 400 && code < 500) return "Client error: the request was refused or the page doesn't exist.";
  if (code >= 500) return "Server error.";
  return "Unknown status.";
}

export const isRedirect = (s: number) => [301, 302, 303, 307, 308].includes(s);

export interface ChainNote {
  severity: "pass" | "warn" | "fail" | "info";
  text: string;
}

export function analyzeChain(hops: Hop[]): ChainNote[] {
  const notes: ChainNote[] = [];
  const redirects = hops.filter((h) => isRedirect(h.status));
  const final = hops[hops.length - 1];
  if (!redirects.length) notes.push({ severity: "pass", text: "No redirects: the address you entered is the final URL." });
  else if (redirects.length === 1) notes.push({ severity: "pass", text: "One redirect: fine. Link directly to the final URL where you can." });
  else notes.push({ severity: "warn", text: `${redirects.length} redirects in a chain. Point the first URL straight at the final one; each hop adds a round trip, and Googlebot stops following after 10.` });
  const temp = redirects.filter((h) => h.status === 302 || h.status === 307 || h.status === 303);
  if (temp.length) notes.push({ severity: "info", text: `${temp.length} temporary redirect${temp.length > 1 ? "s" : ""} (${temp.map((h) => h.status).join(", ")}). If the move is permanent, use 301 or 308.` });
  for (let i = 1; i < hops.length; i++) {
    const a = hops[i - 1].url;
    const b = hops[i].url;
    if (a.startsWith("https://") && b.startsWith("http://")) notes.push({ severity: "fail", text: `Downgrades from HTTPS to HTTP at hop ${i + 1}. Browsers may warn and the connection is no longer encrypted.` });
  }
  if (hops[0]?.url.startsWith("http://") && final?.url.startsWith("https://")) notes.push({ severity: "pass", text: "HTTP is redirected to HTTPS." });
  if (final && final.status >= 400) notes.push({ severity: "fail", text: `The chain ends in an error (${final.status}). Redirect to a working page instead.` });
  const urls = hops.map((h) => h.url);
  if (new Set(urls).size !== urls.length) notes.push({ severity: "fail", text: "The same URL appears twice in the chain: a redirect loop." });
  return notes;
}

export const USER_AGENTS = [
  { value: "default", label: "Our checker (PremierSEOServicesBot)" },
  { value: "googlebot", label: "Googlebot" },
  { value: "chrome", label: "Chrome on Windows" },
  { value: "mobile", label: "Safari on iPhone" },
] as const;

export type UserAgentId = (typeof USER_AGENTS)[number]["value"];
