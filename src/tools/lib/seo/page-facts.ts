/*
 * Paste-HTML mode: extracts the same facts as the server's analyzer (src/lib/server/analyze-html.ts) from HTML
 * the user pastes, so pasted and fetched pages are checked by identical rules. Runs in the browser;
 * node-html-parser is loaded on first use.
 */
import type { PageFacts } from "./api";

export const PASTE_BASE = "https://example.com/";

function collectTypes(v: unknown, acc: string[]) {
  if (Array.isArray(v)) v.forEach((x) => collectTypes(x, acc));
  else if (v && typeof v === "object") {
    const t = (v as Record<string, unknown>)["@type"];
    if (typeof t === "string") acc.push(t);
    else if (Array.isArray(t)) t.forEach((x) => typeof x === "string" && acc.push(x));
    Object.values(v).forEach((x) => collectTypes(x, acc));
  }
  return acc;
}

function abs(href: string, base: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

export async function factsFromHtml(html: string, pageUrl = PASTE_BASE): Promise<PageFacts> {
  const { parse } = await import("node-html-parser");
  const root = parse(html, { comment: false, blockTextElements: { script: true, style: true, noscript: true, pre: true } });
  const head = root.querySelector("head") ?? root;
  const metas = root.querySelectorAll("meta");
  const metaBy = (key: string) => metas.filter((m) => (m.getAttribute("name") || "").toLowerCase() === key);
  const og: Record<string, string> = {};
  const tw: Record<string, string> = {};
  for (const m of metas) {
    const p = (m.getAttribute("property") || m.getAttribute("name") || "").toLowerCase();
    const c = m.getAttribute("content") ?? "";
    if (p.startsWith("og:") && !(p in og)) og[p] = c;
    if (p.startsWith("twitter:") && !(p in tw)) tw[p] = c;
  }
  let host = "";
  try {
    host = new URL(pageUrl).hostname.replace(/^www\./, "");
  } catch {
    host = "";
  }
  let internal = 0,
    external = 0,
    nofollow = 0,
    empty = 0;
  const anchors: PageFacts["anchors"] = [];
  for (const a of root.querySelectorAll("a[href]")) {
    const href = a.getAttribute("href") || "";
    if (/^(#|javascript:|mailto:|tel:)/i.test(href)) continue;
    let u: URL;
    try {
      u = new URL(href, pageUrl);
    } catch {
      continue;
    }
    const rel = (a.getAttribute("rel") || "").toLowerCase();
    const text = a.text.replace(/\s+/g, " ").trim();
    if (u.hostname.replace(/^www\./, "") === host) internal++;
    else external++;
    if (rel.includes("nofollow")) nofollow++;
    if (!text && !a.querySelector("img[alt]")) empty++;
    if (anchors.length < 2000) anchors.push({ href: u.toString(), text: text.slice(0, 200), rel });
  }
  const imgs = root.querySelectorAll("img");
  const jsonLd = root.querySelectorAll('script[type="application/ld+json"]').map((s) => {
    const raw = s.text.trim();
    try {
      return { raw, types: [...new Set(collectTypes(JSON.parse(raw), []))], valid: true };
    } catch (e) {
      return { raw, types: [] as string[], valid: false, error: e instanceof Error ? e.message : "Invalid JSON" };
    }
  });
  const headings = root
    .querySelectorAll("h1,h2,h3,h4,h5,h6")
    .slice(0, 500)
    .map((h) => ({ level: Number(h.tagName[1]), text: h.text.replace(/\s+/g, " ").trim().slice(0, 300) }));
  const body = root.querySelector("body") ?? root;
  body.querySelectorAll("script,style,noscript,template,svg").forEach((n) => n.remove());
  const text = body.text.replace(/\s+/g, " ").trim();
  const words = text.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? [];
  const titles = head.querySelectorAll("title");
  const descs = metaBy("description");
  const iconEl = root.querySelector('link[rel~="icon"]') ?? root.querySelector('link[rel="shortcut icon"]');
  const metaCharset = root.querySelector("meta[charset]");
  return {
    lang: root.querySelector("html")?.getAttribute("lang")?.trim() ?? null,
    charset: metaCharset?.getAttribute("charset")?.trim() ?? null,
    title: titles[0]?.text.trim() ?? null,
    titleCount: titles.length,
    metaDescription: descs[0]?.getAttribute("content")?.trim() ?? null,
    metaDescriptionCount: descs.length,
    metaKeywords: metaBy("keywords")[0]?.getAttribute("content") ?? null,
    robots: metaBy("robots")[0]?.getAttribute("content") ?? null,
    googlebot: metaBy("googlebot")[0]?.getAttribute("content") ?? null,
    canonical: root.querySelectorAll('link[rel="canonical"]').map((l) => abs(l.getAttribute("href") || "", pageUrl)),
    viewport: metaBy("viewport")[0]?.getAttribute("content") ?? null,
    favicon: iconEl ? abs(iconEl.getAttribute("href") || "/favicon.ico", pageUrl) : null,
    hreflang: root
      .querySelectorAll('link[rel="alternate"][hreflang]')
      .map((l) => ({ lang: l.getAttribute("hreflang") || "", href: l.getAttribute("href") || "" })),
    og,
    twitter: tw,
    headings,
    links: { total: internal + external, internal, external, nofollow, empty },
    anchors,
    images: {
      total: imgs.length,
      missingAlt: imgs.filter((i) => i.getAttribute("alt") === undefined || i.getAttribute("alt") === null).length,
      missingSize: imgs.filter((i) => !i.getAttribute("width") || !i.getAttribute("height")).length,
    },
    jsonLd,
    microdataTypes: [...new Set(root.querySelectorAll("[itemtype]").map((e) => (e.getAttribute("itemtype") || "").split("/").pop() || ""))].filter(Boolean),
    wordCount: words.length,
    text: text.slice(0, 200_000),
    scripts: root.querySelectorAll("script[src]").length,
    stylesheets: root.querySelectorAll('link[rel="stylesheet"]').length,
    iframes: root.querySelectorAll("iframe").length,
    hasAmp: Boolean(root.querySelector('link[rel="amphtml"]')),
  };
}
