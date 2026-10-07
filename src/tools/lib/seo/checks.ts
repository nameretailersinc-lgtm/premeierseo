/*
 * Pass / warn / fail rules for the on-page checkers. Each check carries the evidence it is based on
 * (the actual tag value), so nothing is asserted without showing what was found.
 * Rules follow Google Search Central documentation; thresholds that are conventions rather than Google rules
 * (title width, description length, word count) are labelled as such in the advice text.
 */
import type { PageFacts } from "./api";
import { SNIPPET, descriptionVerdict, titleVerdict } from "./pixels";

export type CheckStatus = "pass" | "warn" | "fail" | "info";

export interface Check {
  id: string;
  group: string;
  label: string;
  status: CheckStatus;
  /** What we found (tag text, header value, counts). */
  evidence?: string;
  /** What to do about it. */
  advice?: string;
  /** Points available in the SEO score (0 = not scored). */
  weight?: number;
}

export interface ResponseContext {
  status?: number;
  finalUrl?: string;
  requestedUrl?: string;
  headers?: Record<string, string>;
  hops?: { url: string; status: number }[];
  ttfbMs?: number;
  htmlBytes?: number;
  transferBytes?: number;
}

const q = (s: string) => `“${s}”`;

export function directives(v: string | null | undefined): string[] {
  return (v ?? "")
    .toLowerCase()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/* ---------- Title, description, robots, canonical ---------- */

export function titleChecks(f: PageFacts): Check[] {
  const out: Check[] = [];
  if (!f.title) {
    out.push({ id: "title", group: "Title and description", label: "Title tag", status: "fail", evidence: "No <title> element found.", advice: "Add a unique, descriptive <title> inside <head>. Google uses it as the main source for the result title.", weight: 10 });
  } else {
    const v = titleVerdict(f.title);
    const ev = `${q(f.title)} — ${v.chars} characters, about ${v.px} px`;
    if (v.verdict === "long")
      out.push({ id: "title", group: "Title and description", label: "Title tag", status: "warn", evidence: ev, advice: `Wider than about ${SNIPPET.titleMaxPx} px, so desktop results will probably cut it off. Put the most important words first.`, weight: 10 });
    else if (v.verdict === "short")
      out.push({ id: "title", group: "Title and description", label: "Title tag", status: "warn", evidence: ev, advice: "Very short titles often leave out what the page offers. Describe the page more specifically.", weight: 10 });
    else out.push({ id: "title", group: "Title and description", label: "Title tag", status: "pass", evidence: ev, weight: 10 });
  }
  if (f.titleCount > 1)
    out.push({ id: "title-count", group: "Title and description", label: "Single title element", status: "warn", evidence: `${f.titleCount} <title> elements found.`, advice: "Keep exactly one <title>. With several, which one is used is undefined.", weight: 2 });
  return out;
}

export function descriptionChecks(f: PageFacts): Check[] {
  const out: Check[] = [];
  if (!f.metaDescription) {
    out.push({ id: "description", group: "Title and description", label: "Meta description", status: "warn", evidence: "No meta description found.", advice: "Optional, but without one Google picks text from the page for the snippet. Write a one- or two-sentence summary.", weight: 6 });
  } else {
    const v = descriptionVerdict(f.metaDescription);
    const ev = `${q(f.metaDescription)} — ${v.chars} characters, about ${v.px} px`;
    if (v.verdict === "long")
      out.push({ id: "description", group: "Title and description", label: "Meta description", status: "warn", evidence: ev, advice: `Longer than the ~${SNIPPET.descMaxDesktopPx} px most desktop snippets show; the end will likely be cut. Move the key point forward.`, weight: 6 });
    else if (v.verdict === "short")
      out.push({ id: "description", group: "Title and description", label: "Meta description", status: "warn", evidence: ev, advice: "Short descriptions are more likely to be replaced with text from the page. Add a concrete detail.", weight: 6 });
    else
      out.push({ id: "description", group: "Title and description", label: "Meta description", status: "pass", evidence: ev + (v.mobileCut ? " (may be cut on mobile)" : ""), weight: 6 });
  }
  if (f.metaDescriptionCount > 1)
    out.push({ id: "description-count", group: "Title and description", label: "Single meta description", status: "warn", evidence: `${f.metaDescriptionCount} description tags found.`, advice: "Keep one meta description per page.", weight: 1 });
  if (f.metaKeywords !== null)
    out.push({ id: "keywords", group: "Title and description", label: "Meta keywords", status: "info", evidence: q(f.metaKeywords.slice(0, 200)), advice: "Google ignores the keywords meta tag. It does no harm, but it also tells competitors your targets." });
  return out;
}

export function indexabilityChecks(f: PageFacts | null, ctx: ResponseContext): Check[] {
  const out: Check[] = [];
  if (ctx.status !== undefined) {
    const ok = ctx.status >= 200 && ctx.status < 300;
    out.push({
      id: "status",
      group: "Indexability",
      label: "HTTP status",
      status: ok ? "pass" : "fail",
      evidence: `${ctx.status}${ctx.finalUrl ? ` for ${ctx.finalUrl}` : ""}`,
      advice: ok ? undefined : "Only pages that return 200 can be indexed. Fix the error or redirect the URL.",
      weight: 10,
    });
  }
  if (ctx.hops && ctx.hops.length > 1) {
    const n = ctx.hops.length - 1;
    out.push({
      id: "redirects",
      group: "Indexability",
      label: "Redirects before the page",
      status: n > 1 ? "warn" : "info",
      evidence: ctx.hops.map((h) => `${h.status} ${h.url}`).join(" → "),
      advice: n > 1 ? `${n} redirects in a row. Link straight to the final URL and redirect old URLs in one step.` : "The address you entered redirects once. Link to the final URL where you can.",
      weight: n > 1 ? 3 : 0,
    });
  }
  const xRobots = ctx.headers?.["x-robots-tag"];
  if (f) {
    const meta = [...directives(f.robots), ...directives(f.googlebot)];
    const noindex = meta.includes("noindex") || meta.includes("none");
    const nofollow = meta.includes("nofollow") || meta.includes("none");
    if (noindex)
      out.push({ id: "robots", group: "Indexability", label: "Robots meta tag", status: "fail", evidence: [f.robots && `robots: ${q(f.robots)}`, f.googlebot && `googlebot: ${q(f.googlebot)}`].filter(Boolean).join("; "), advice: "This page asks search engines not to index it. Remove noindex if the page should appear in search.", weight: 10 });
    else
      out.push({ id: "robots", group: "Indexability", label: "Robots meta tag", status: nofollow ? "warn" : "pass", evidence: f.robots || f.googlebot ? [f.robots && `robots: ${q(f.robots)}`, f.googlebot && `googlebot: ${q(f.googlebot)}`].filter(Boolean).join("; ") : "None (defaults to index, follow).", advice: nofollow ? "nofollow tells search engines not to follow any link on this page." : undefined, weight: 10 });
  }
  if (xRobots) {
    const d = directives(xRobots.replace(/^[a-z-]+:\s*/i, ""));
    const bad = d.includes("noindex") || d.includes("none");
    out.push({ id: "x-robots", group: "Indexability", label: "X-Robots-Tag header", status: bad ? "fail" : "info", evidence: q(xRobots), advice: bad ? "The server sends noindex in an HTTP header, which blocks indexing even if the HTML allows it." : undefined, weight: bad ? 10 : 0 });
  }
  if (f) {
    const final = ctx.finalUrl;
    if (!f.canonical.length)
      out.push({ id: "canonical", group: "Indexability", label: "Canonical tag", status: "warn", evidence: "No rel=canonical link found.", advice: "Add a self-referencing canonical so URL variants (parameters, tracking codes) consolidate to this address.", weight: 4 });
    else if (f.canonical.length > 1 && new Set(f.canonical).size > 1)
      out.push({ id: "canonical", group: "Indexability", label: "Canonical tag", status: "fail", evidence: f.canonical.join(" | "), advice: "Several different canonical URLs: Google may ignore all of them. Keep one.", weight: 4 });
    else {
      const c = f.canonical[0];
      const same = final ? normalizeForCompare(c) === normalizeForCompare(final) : true;
      out.push({
        id: "canonical",
        group: "Indexability",
        label: "Canonical tag",
        status: same ? "pass" : "info",
        evidence: c + (f.canonical.length > 1 ? ` (declared ${f.canonical.length} times)` : ""),
        advice: same ? undefined : `Points to a different URL than the one checked (${final}). That's right for a duplicate page; on the main version it would stop this URL being indexed.`,
        weight: 4,
      });
    }
  }
  return out;
}

function normalizeForCompare(u: string): string {
  try {
    const x = new URL(u);
    x.hash = "";
    return x.toString().replace(/\/$/, "");
  } catch {
    return u;
  }
}

export function viewportCheck(f: PageFacts): Check {
  if (!f.viewport)
    return { id: "viewport", group: "Mobile", label: "Viewport meta tag", status: "fail", evidence: "No <meta name=\"viewport\"> found.", advice: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> so phones render the page at device width instead of a zoomed-out desktop layout.', weight: 6 };
  const v = f.viewport.toLowerCase().replace(/\s+/g, "");
  const issues: string[] = [];
  if (!v.includes("width=device-width")) issues.push("missing width=device-width");
  if (/user-scalable=(no|0)/.test(v)) issues.push("user-scalable=no blocks pinch zoom");
  const max = v.match(/maximum-scale=([\d.]+)/);
  if (max && Number(max[1]) < 2) issues.push(`maximum-scale=${max[1]} limits zoom`);
  return {
    id: "viewport",
    group: "Mobile",
    label: "Viewport meta tag",
    status: issues.length ? "warn" : "pass",
    evidence: q(f.viewport),
    advice: issues.length ? `${issues.join("; ")}. Use width=device-width, initial-scale=1 and allow zooming (WCAG 1.4.4).` : undefined,
    weight: 6,
  };
}

export function documentChecks(f: PageFacts, headers?: Record<string, string>): Check[] {
  const out: Check[] = [];
  out.push(
    f.lang
      ? { id: "lang", group: "Document", label: "Page language", status: "pass", evidence: `<html lang="${f.lang}">`, weight: 2 }
      : { id: "lang", group: "Document", label: "Page language", status: "warn", evidence: "No lang attribute on <html>.", advice: 'Add lang (e.g. <html lang="en">) so screen readers pronounce the text correctly.', weight: 2 },
  );
  const headerCharset = /charset=([\w-]+)/i.exec(headers?.["content-type"] ?? "")?.[1];
  out.push(
    f.charset || headerCharset
      ? { id: "charset", group: "Document", label: "Character encoding", status: "pass", evidence: f.charset ? `<meta charset="${f.charset}">` : `Content-Type header: charset=${headerCharset}`, weight: 1 }
      : { id: "charset", group: "Document", label: "Character encoding", status: "warn", evidence: "No charset declared in the HTML or the Content-Type header.", advice: 'Add <meta charset="utf-8"> as the first element in <head>.', weight: 1 },
  );
  out.push(
    f.favicon
      ? { id: "favicon", group: "Document", label: "Favicon", status: "pass", evidence: f.favicon, weight: 1 }
      : { id: "favicon", group: "Document", label: "Favicon", status: "info", evidence: "No <link rel=\"icon\">. Browsers will try /favicon.ico.", advice: "Google shows a favicon next to results; declare one explicitly." },
  );
  return out;
}

/* ---------- Social tags ---------- */

export function socialChecks(f: PageFacts, pageUrl?: string): Check[] {
  const out: Check[] = [];
  const g = "Open Graph and X cards";
  const need: [string, string][] = [
    ["og:title", "Title of the shared card. Falls back to <title> on most platforms, but set it explicitly."],
    ["og:description", "One or two sentences shown under the title on Facebook and LinkedIn."],
    ["og:image", "Without an image, links are shown as a small text-only card or with an image the platform guesses."],
    ["og:url", "The canonical URL that likes and shares are counted against."],
  ];
  for (const [k, why] of need) {
    const v = f.og[k];
    const w = k === "og:url" ? 0 : k === "og:image" ? 3 : 2;
    if (!v) out.push({ id: k, group: g, label: k, status: k === "og:url" ? "info" : "warn", evidence: "Missing.", advice: why, weight: w });
    else if ((k === "og:image" || k === "og:url") && !/^https?:\/\//i.test(v))
      out.push({ id: k, group: g, label: k, status: "fail", evidence: q(v), advice: "Must be a full URL starting with https://. Platforms don't resolve relative paths.", weight: w || 2 });
    else out.push({ id: k, group: g, label: k, status: "pass", evidence: q(v), weight: w });
  }
  const img = f.og["og:image"];
  if (img && !f.og["og:image:alt"]) out.push({ id: "og:image:alt", group: g, label: "og:image:alt", status: "info", evidence: "Missing.", advice: "Describe the image for people using screen readers." });
  if (f.og["og:url"] && pageUrl && normalizeForCompare(f.og["og:url"]) !== normalizeForCompare(pageUrl) && !pageUrl.startsWith("https://example.com"))
    out.push({ id: "og:url-match", group: g, label: "og:url matches the page", status: "info", evidence: `og:url ${f.og["og:url"]} vs checked ${pageUrl}`, advice: "Shares will be attributed to og:url. That's correct only if it is this page's canonical URL." });
  if (!f.og["og:type"]) out.push({ id: "og:type", group: g, label: "og:type", status: "info", evidence: "Missing (platforms assume website).", advice: "Use article for posts and website for other pages." });
  const card = f.twitter["twitter:card"];
  out.push(
    card
      ? { id: "twitter:card", group: g, label: "twitter:card", status: ["summary", "summary_large_image", "app", "player"].includes(card) ? "pass" : "warn", evidence: q(card), advice: ["summary", "summary_large_image", "app", "player"].includes(card) ? undefined : "Unknown card type. Use summary or summary_large_image.", weight: 1 }
      : { id: "twitter:card", group: g, label: "twitter:card", status: "info", evidence: "Missing.", advice: "X uses Open Graph tags for the title, description and image, but twitter:card chooses the card layout. Add summary_large_image for a big image.", weight: 0 },
  );
  return out;
}

/* ---------- Content, headings, links, images, structured data ---------- */

export interface HeadingIssue {
  index: number;
  kind: "skip" | "empty" | "extra-h1";
  message: string;
}

export function headingIssues(h: { level: number; text: string }[]): HeadingIssue[] {
  const out: HeadingIssue[] = [];
  let prev = 0;
  let h1s = 0;
  h.forEach((x, i) => {
    if (!x.text) out.push({ index: i, kind: "empty", message: `Empty H${x.level}.` });
    if (x.level === 1) {
      h1s++;
      if (h1s > 1) out.push({ index: i, kind: "extra-h1", message: `H1 number ${h1s}.` });
    }
    if (prev && x.level > prev + 1) out.push({ index: i, kind: "skip", message: `Jumps from H${prev} to H${x.level}.` });
    prev = x.level;
  });
  return out;
}

export function contentChecks(f: PageFacts): Check[] {
  const out: Check[] = [];
  const h1 = f.headings.filter((h) => h.level === 1);
  if (!h1.length) out.push({ id: "h1", group: "Content and headings", label: "H1 heading", status: "warn", evidence: "No H1 found.", advice: "Give the page one visible main heading that says what it is about.", weight: 5 });
  else if (h1.length > 1) out.push({ id: "h1", group: "Content and headings", label: "H1 heading", status: "info", evidence: h1.map((h) => q(h.text)).join(", "), advice: "Several H1s are allowed by Google, but one clear main heading is easier for readers and screen-reader users.", weight: 5 });
  else out.push({ id: "h1", group: "Content and headings", label: "H1 heading", status: h1[0].text ? "pass" : "warn", evidence: h1[0].text ? q(h1[0].text) : "The H1 is empty.", weight: 5 });
  const issues = headingIssues(f.headings).filter((i) => i.kind !== "extra-h1");
  out.push({
    id: "heading-order",
    group: "Content and headings",
    label: "Heading structure",
    status: issues.length ? "warn" : "pass",
    evidence: `${f.headings.length} headings${issues.length ? `; ${issues.slice(0, 3).map((i) => i.message).join(" ")}${issues.length > 3 ? ` (+${issues.length - 3} more)` : ""}` : ", no skipped levels or empty headings"}`,
    advice: issues.length ? "Use headings in order (H2 under H1, H3 under H2) and give every heading text. See the heading tag extractor for the full outline." : undefined,
    weight: 3,
  });
  out.push({
    id: "words",
    group: "Content and headings",
    label: "Visible text",
    status: f.wordCount < 150 ? "warn" : "pass",
    evidence: `${f.wordCount.toLocaleString("en-US")} words in the HTML body`,
    advice: f.wordCount < 150 ? "Very little text in the HTML. If the content is loaded by JavaScript, check that Google renders it (URL Inspection in Search Console); if it really is thin, add useful detail. There's no minimum word count in Google's guidelines." : undefined,
    weight: 4,
  });
  return out;
}

export function linkImageChecks(f: PageFacts): Check[] {
  const out: Check[] = [];
  out.push({
    id: "links",
    group: "Links and images",
    label: "Links",
    status: f.links.internal === 0 ? "warn" : "pass",
    evidence: `${f.links.internal} internal, ${f.links.external} external, ${f.links.nofollow} nofollow`,
    advice: f.links.internal === 0 ? "No crawlable links to other pages on the same site. Links in <a href> are how crawlers find your other pages." : undefined,
    weight: 3,
  });
  if (f.links.empty > 0)
    out.push({ id: "empty-links", group: "Links and images", label: "Links with no text", status: "warn", evidence: `${f.links.empty} link${f.links.empty === 1 ? "" : "s"} without text or an image with alt`, advice: "Give every link descriptive text (or alt text on the image inside it). Anchor text tells users and search engines where the link goes.", weight: 2 });
  out.push({
    id: "alt",
    group: "Links and images",
    label: "Image alt attributes",
    status: f.images.missingAlt ? "warn" : "pass",
    evidence: f.images.total ? `${f.images.missingAlt} of ${f.images.total} <img> elements have no alt attribute` : "No <img> elements in the HTML",
    advice: f.images.missingAlt ? 'Add alt text that describes informative images; use alt="" for decorative ones.' : undefined,
    weight: 3,
  });
  if (f.images.missingSize)
    out.push({ id: "img-size", group: "Links and images", label: "Image dimensions", status: "info", evidence: `${f.images.missingSize} of ${f.images.total} images lack width and height attributes`, advice: "Width and height let the browser reserve space, which prevents layout shift (CLS)." });
  return out;
}

export function structuredDataCheck(f: PageFacts): Check {
  const bad = f.jsonLd.filter((j) => !j.valid);
  const types = [...new Set(f.jsonLd.flatMap((j) => j.types))];
  if (!f.jsonLd.length && !f.microdataTypes.length)
    return { id: "schema", group: "Structured data", label: "Structured data", status: "info", evidence: "No JSON-LD or microdata found.", advice: "Optional. Structured data can make a page eligible for rich results (products, events, articles, breadcrumbs).", weight: 0 };
  if (bad.length)
    return { id: "schema", group: "Structured data", label: "Structured data", status: "fail", evidence: `${bad.length} of ${f.jsonLd.length} JSON-LD blocks don't parse: ${bad[0].error}`, advice: "Invalid JSON is ignored entirely. Check it with the schema markup validator.", weight: 3 };
  return { id: "schema", group: "Structured data", label: "Structured data", status: "pass", evidence: `Types: ${[...types, ...f.microdataTypes.map((t) => `${t} (microdata)`)].join(", ") || "none declared"}`, weight: 3 };
}

export function speedBasics(ctx: ResponseContext): Check[] {
  const out: Check[] = [];
  if (ctx.ttfbMs !== undefined)
    out.push({
      id: "ttfb",
      group: "Speed basics",
      label: "Server response time (TTFB)",
      status: ctx.ttfbMs <= 800 ? "pass" : ctx.ttfbMs <= 1800 ? "warn" : "fail",
      evidence: `${ctx.ttfbMs} ms from our server to the first byte of the final response`,
      advice: ctx.ttfbMs > 800 ? "web.dev rates TTFB above 0.8 s as needing improvement. Caching and a CDN usually help most." : undefined,
      weight: 3,
    });
  const enc = ctx.headers?.["content-encoding"];
  if (ctx.htmlBytes !== undefined) {
    out.push({
      id: "compression",
      group: "Speed basics",
      label: "HTML compression",
      status: enc ? "pass" : ctx.htmlBytes < 2000 ? "info" : "warn",
      evidence: enc ? `content-encoding: ${enc} (${ctx.transferBytes?.toLocaleString("en-US")} bytes on the wire, ${ctx.htmlBytes.toLocaleString("en-US")} decoded)` : `No content-encoding; ${ctx.htmlBytes.toLocaleString("en-US")} bytes sent uncompressed`,
      advice: enc ? undefined : "Enable gzip or Brotli on the server for HTML, CSS and JavaScript.",
      weight: 2,
    });
  }
  if (ctx.finalUrl)
    out.push({
      id: "https",
      group: "Speed basics",
      label: "HTTPS",
      status: ctx.finalUrl.startsWith("https://") ? "pass" : "fail",
      evidence: ctx.finalUrl,
      advice: ctx.finalUrl.startsWith("https://") ? undefined : "The final page is served over plain HTTP. Redirect to HTTPS.",
      weight: 4,
    });
  return out;
}

/* ---------- Score ---------- */

/** Documented formula: pass = full weight, warn = half, fail = 0; info checks and weight 0 are not scored. */
export function scoreChecks(checks: Check[]): { score: number; earned: number; possible: number } {
  let earned = 0;
  let possible = 0;
  for (const c of checks) {
    const w = c.weight ?? 0;
    if (!w || c.status === "info") continue;
    possible += w;
    earned += c.status === "pass" ? w : c.status === "warn" ? w / 2 : 0;
  }
  return { score: possible ? Math.round((earned / possible) * 100) : 0, earned, possible };
}

export function countStatuses(checks: Check[]) {
  return {
    pass: checks.filter((c) => c.status === "pass").length,
    warn: checks.filter((c) => c.status === "warn").length,
    fail: checks.filter((c) => c.status === "fail").length,
    info: checks.filter((c) => c.status === "info").length,
  };
}
