/* Review request links. Formats verified against each platform's public URL patterns. */

export interface PlaceIdResult {
  placeId: string | null;
  /** A link that's already a review link (g.page/r/…/review or writereview), used as-is. */
  directLink: string | null;
  error?: string;
  warning?: string;
}

/** Accepts a bare Place ID, a URL containing place_id/placeid, or an existing Google review short link. */
export function readPlaceInput(raw: string): PlaceIdResult {
  const s = raw.trim();
  if (!s) return { placeId: null, directLink: null };
  if (/^https?:\/\//i.test(s)) {
    let u: URL;
    try {
      u = new URL(s);
    } catch {
      return { placeId: null, directLink: null, error: "That doesn't look like a valid link." };
    }
    const fromParam = u.searchParams.get("placeid") ?? u.searchParams.get("place_id") ?? u.searchParams.get("query_place_id");
    if (fromParam) return readPlaceInput(fromParam);
    const m = /place_id:([A-Za-z0-9_-]{10,})/.exec(decodeURIComponent(s));
    if (m) return readPlaceInput(m[1]);
    if (/^(www\.)?g\.page$/i.test(u.hostname) && /\/review\/?$/i.test(u.pathname)) return { placeId: null, directLink: u.toString() };
    if (/search\.google\.com$/i.test(u.hostname) && /writereview/i.test(u.pathname)) return { placeId: null, directLink: u.toString() };
    return {
      placeId: null,
      directLink: null,
      error: "This link doesn't contain a Place ID. Google Maps share links (maps.app.goo.gl) don't include one; use the Place ID Finder linked below, or copy the review link from your Business Profile.",
    };
  }
  if (!/^[A-Za-z0-9_-]{16,}$/.test(s)) return { placeId: null, directLink: null, error: "A Place ID is a long code of letters, digits, - and _ (usually starting with ChIJ)." };
  return { placeId: s, directLink: null, warning: /^(ChIJ|GhIJ|EiI|Ei)/.test(s) ? undefined : "Most Place IDs start with ChIJ. Double-check you copied the Place ID, not another code." };
}

export function googleReviewLink(placeId: string): string {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

export function facebookReviewLink(page: string): string | null {
  const s = page.trim().replace(/^https?:\/\/(www\.|m\.)?facebook\.com\//i, "").replace(/\/.*$/, "").replace(/^@/, "");
  if (!s || !/^[A-Za-z0-9.\-_]+$/.test(s)) return null;
  return `https://www.facebook.com/${s}/reviews`;
}

export function trustpilotReviewLink(domain: string): string | null {
  const s = domain.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "").toLowerCase();
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(s)) return null;
  return `https://www.trustpilot.com/evaluate/${s}`;
}

export function emailTemplate(business: string, link: string): string {
  const name = business.trim() || "our business";
  return `Subject: How did we do?

Hi [customer name],

Thank you for choosing ${name}. If you have a minute, we'd appreciate an honest review of your experience. It helps other customers and shows us what to improve.

Leave a review: ${link}

Thank you,
[your name]
${business.trim() || ""}`.trimEnd();
}
