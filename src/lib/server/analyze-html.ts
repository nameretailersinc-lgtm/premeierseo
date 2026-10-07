import "server-only";
import { parse, type HTMLElement } from "node-html-parser";

/** Structured facts about a fetched HTML page. Only facts we can read from the HTML — no scores invented here. */
export interface PageFacts {
  lang: string | null;
  charset: string | null;
  title: string | null;
  titleCount: number;
  metaDescription: string | null;
  metaDescriptionCount: number;
  metaKeywords: string | null;
  robots: string | null;
  googlebot: string | null;
  canonical: string[];
  viewport: string | null;
  favicon: string | null;
  hreflang: { lang: string; href: string }[];
  og: Record<string, string>;
  twitter: Record<string, string>;
  headings: { level: number; text: string }[];
  links: { total: number; internal: number; external: number; nofollow: number; empty: number };
  anchors: { href: string; text: string; rel: string }[];
  images: { total: number; missingAlt: number; missingSize: number };
  jsonLd: { raw: string; types: string[]; valid: boolean; error?: string }[];
  microdataTypes: string[];
  wordCount: number;
  text: string;
  scripts: number;
  stylesheets: number;
  iframes: number;
  hasAmp: boolean;
}

function attr(el: HTMLElement | null, name: string) {
  return el?.getAttribute(name)?.trim() ?? null;
}

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

export function analyzeHtml(html: string, pageUrl: string): PageFacts {
  const root = parse(html, { comment: false, blockTextElements: { script: true, style: true, noscript: true, pre: true } });
  const head = root.querySelector("head") ?? root;
  const metas = root.querySelectorAll("meta");
  const metaBy = (key: string, attrName = "name") =>
    metas.filter((m) => (m.getAttribute(attrName) || "").toLowerCase() === key.toLowerCase());
  const og: Record<string, string> = {};
  const tw: Record<string, string> = {};
  for (const m of metas) {
    const p = (m.getAttribute("property") || m.getAttribute("name") || "").toLowerCase();
    const c = m.getAttribute("content") ?? "";
    if (p.startsWith("og:") && !(p in og)) og[p] = c;
    if (p.startsWith("twitter:") && !(p in tw)) tw[p] = c;
  }
  const host = new URL(pageUrl).hostname.replace(/^www\./, "");
  const anchors = root.querySelectorAll("a[href]");
  let internal = 0,
    external = 0,
    nofollow = 0,
    empty = 0;
  const anchorList: PageFacts["anchors"] = [];
  for (const a of anchors) {
    const href = a.getAttribute("href") || "";
    if (/^(#|javascript:|mailto:|tel:)/i.test(href)) continue;
    let abs: URL | null = null;
    try {
      abs = new URL(href, pageUrl);
    } catch {
      continue;
    }
    const rel = (a.getAttribute("rel") || "").toLowerCase();
    const text = a.text.replace(/\s+/g, " ").trim();
    if (abs.hostname.replace(/^www\./, "") === host) internal++;
    else external++;
    if (rel.includes("nofollow")) nofollow++;
    if (!text && !a.querySelector("img[alt]")) empty++;
    if (anchorList.length < 2000) anchorList.push({ href: abs.toString(), text: text.slice(0, 200), rel });
  }
  const imgs = root.querySelectorAll("img");
  const jsonLd = root.querySelectorAll('script[type="application/ld+json"]').map((s) => {
    const raw = s.text.trim();
    try {
      const data = JSON.parse(raw);
      return { raw: raw.slice(0, 20000), types: [...new Set(collectTypes(data, []))], valid: true };
    } catch (e) {
      return { raw: raw.slice(0, 20000), types: [], valid: false, error: e instanceof Error ? e.message : "Invalid JSON" };
    }
  });
  const body = root.querySelector("body") ?? root;
  body.querySelectorAll("script,style,noscript,template,svg").forEach((n) => n.remove());
  const text = body.text.replace(/\s+/g, " ").trim();
  const words = text.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? [];
  const titles = head.querySelectorAll("title");
  const descs = metaBy("description");
  const iconEl = root.querySelector('link[rel~="icon"]') ?? root.querySelector('link[rel="shortcut icon"]');
  return {
    lang: attr(root.querySelector("html"), "lang"),
    charset: attr(root.querySelector("meta[charset]"), "charset"),
    title: titles[0]?.text.trim() ?? null,
    titleCount: titles.length,
    metaDescription: descs[0]?.getAttribute("content")?.trim() ?? null,
    metaDescriptionCount: descs.length,
    metaKeywords: metaBy("keywords")[0]?.getAttribute("content") ?? null,
    robots: metaBy("robots")[0]?.getAttribute("content") ?? null,
    googlebot: metaBy("googlebot")[0]?.getAttribute("content") ?? null,
    canonical: root.querySelectorAll('link[rel="canonical"]').map((l) => {
      try {
        return new URL(l.getAttribute("href") || "", pageUrl).toString();
      } catch {
        return l.getAttribute("href") || "";
      }
    }),
    viewport: metaBy("viewport")[0]?.getAttribute("content") ?? null,
    favicon: iconEl ? new URL(iconEl.getAttribute("href") || "/favicon.ico", pageUrl).toString() : null,
    hreflang: root
      .querySelectorAll('link[rel="alternate"][hreflang]')
      .map((l) => ({ lang: l.getAttribute("hreflang") || "", href: l.getAttribute("href") || "" })),
    og,
    twitter: tw,
    headings: root
      .querySelectorAll("h1,h2,h3,h4,h5,h6")
      .slice(0, 500)
      .map((h) => ({ level: Number(h.tagName[1]), text: h.text.replace(/\s+/g, " ").trim().slice(0, 300) })),
    links: { total: internal + external, internal, external, nofollow, empty },
    anchors: anchorList,
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
