/*
 * RSS 2.0, RSS 1.0 (RDF) and Atom 1.0 parsing with a DOMParser-compatible parser
 * (the browser's DOMParser; @xmldom/xmldom in tests). Only DOM Level 2 APIs are used.
 */
import { decodeEntities } from "./html";

export interface FeedItem {
  title: string;
  link: string;
  date: string | null; // ISO 8601
  dateRaw: string;
  author: string;
  categories: string[];
  summary: string;
  guid: string;
  enclosure: { url: string; type: string; length: string } | null;
  image: string;
}

export interface Feed {
  format: string;
  title: string;
  link: string;
  description: string;
  language: string;
  updated: string;
  generator: string;
  items: FeedItem[];
}

interface XParser {
  parseFromString(s: string, type: string): Document;
}

const local = (n: Node) => ((n as Element).localName || n.nodeName.replace(/^.*:/, "")).toLowerCase();

function kids(el: Element | null, name?: string): Element[] {
  if (!el) return [];
  const out: Element[] = [];
  for (let n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 1 && (!name || local(n) === name || n.nodeName.toLowerCase() === name)) out.push(n as Element);
  return out;
}

function text(el: Element | null | undefined): string {
  return (el?.textContent ?? "").trim();
}

/** Text of the first un-prefixed child called `name` that has text (so <atom:link/> or <media:title> don't shadow <link> or <title>). */
function plainText(el: Element | null, name: string): string {
  const all = kids(el, name);
  const plain = all.filter((k) => !k.nodeName.includes(":"));
  for (const k of [...plain, ...all]) {
    const t = text(k);
    if (t) return t;
  }
  return "";
}

function first(el: Element | null, ...names: string[]): Element | null {
  for (const n of names) {
    const k = kids(el, n)[0];
    if (k) return k;
  }
  return null;
}

/** Plain-text snippet from (possibly HTML) content. */
export function snippet(html: string, max = 280): string {
  const t = decodeEntities(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<\/?(br|p|div|li|h[1-6]|tr|td|th|ul|ol|blockquote)\b[^>]*>/gi, " ")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/\s+/g, " ")
    .trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t;
}

function isoDate(s: string): string | null {
  if (!s) return null;
  const t = Date.parse(s.replace(/\s+(UT|Z)$/i, " GMT"));
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

export function parseFeed(xml: string, parser: XParser): { feed?: Feed; error?: string } {
  const src = xml.replace(/^﻿/, "").trim();
  if (!src) return { error: "The feed is empty." };
  if (/^<!doctype html|^<html[\s>]/i.test(src)) return { error: "This is an HTML page, not a feed." };
  let doc: Document;
  try {
    doc = parser.parseFromString(src, "application/xml");
  } catch (e) {
    return { error: `The XML couldn't be parsed: ${e instanceof Error ? e.message : "syntax error"}.` };
  }
  const pe = doc.getElementsByTagName("parsererror")[0];
  if (pe) {
    const msg = (pe.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 240);
    return { error: `The XML isn't well-formed${msg ? `: ${msg}` : "."} A common cause is an unescaped “&” in a title or link.` };
  }
  const root = doc.documentElement;
  if (!root) return { error: "The XML has no root element." };
  const rn = local(root);
  const items: FeedItem[] = [];

  if (rn === "feed") {
    const linkOf = (el: Element, rel = "alternate") =>
      kids(el, "link").find((l) => (l.getAttribute("rel") || "alternate") === rel)?.getAttribute("href") ?? "";
    for (const e of kids(root, "entry")) {
      const enc = kids(e, "link").find((l) => l.getAttribute("rel") === "enclosure");
      const content = first(e, "summary", "content");
      const media = kids(e, "thumbnail")[0] ?? kids(e, "content").find((c) => c.getAttribute("url"));
      const dateRaw = text(first(e, "published", "updated"));
      items.push({
        title: snippet(text(first(e, "title")), 500),
        link: linkOf(e),
        dateRaw,
        date: isoDate(dateRaw),
        author: kids(e, "author").map((a) => text(first(a, "name"))).filter(Boolean).join(", ") || kids(root, "author").map((a) => text(first(a, "name"))).join(", "),
        categories: kids(e, "category").map((c) => c.getAttribute("label") || c.getAttribute("term") || "").filter(Boolean),
        summary: snippet(text(content)),
        guid: text(first(e, "id")),
        enclosure: enc ? { url: enc.getAttribute("href") ?? "", type: enc.getAttribute("type") ?? "", length: enc.getAttribute("length") ?? "" } : null,
        image: media?.getAttribute("url") ?? "",
      });
    }
    return {
      feed: {
        format: "Atom 1.0",
        title: text(first(root, "title")),
        link: linkOf(root),
        description: text(first(root, "subtitle")),
        language: root.getAttribute("xml:lang") ?? "",
        updated: text(first(root, "updated")),
        generator: text(first(root, "generator")),
        items,
      },
    };
  }

  if (rn === "rss" || rn === "rdf") {
    const channel = first(root, "channel");
    const itemEls = rn === "rss" ? kids(channel, "item") : kids(root, "item");
    for (const it of itemEls) {
      const enc = first(it, "enclosure");
      const media = kids(it, "content").find((c) => c.getAttribute("url")) ?? kids(it, "thumbnail")[0];
      const dateRaw = text(first(it, "pubdate", "date", "dc:date"));
      const desc = plainText(it, "description") || text(first(it, "encoded", "content:encoded"));
      items.push({
        title: snippet(plainText(it, "title"), 500),
        link: plainText(it, "link") || (first(it, "guid")?.getAttribute("isPermaLink") !== "false" ? text(first(it, "guid")) : ""),
        dateRaw,
        date: isoDate(dateRaw),
        author: text(first(it, "creator", "dc:creator", "author")),
        categories: kids(it, "category").map((c) => text(c)).concat(kids(it, "subject").map((c) => text(c))).filter(Boolean),
        summary: snippet(desc),
        guid: text(first(it, "guid")) || it.getAttribute("rdf:about") || "",
        enclosure: enc ? { url: enc.getAttribute("url") ?? "", type: enc.getAttribute("type") ?? "", length: enc.getAttribute("length") ?? "" } : null,
        image: media?.getAttribute("url") ?? "",
      });
    }
    const version = root.getAttribute("version");
    return {
      feed: {
        format: rn === "rdf" ? "RSS 1.0 (RDF)" : `RSS ${version || "2.0"}`,
        title: plainText(channel, "title"),
        link: plainText(channel, "link"),
        description: snippet(plainText(channel, "description"), 500),
        language: text(first(channel, "language", "dc:language")),
        updated: text(first(channel, "lastbuilddate", "pubdate", "date")),
        generator: text(first(channel, "generator")),
        items,
      },
    };
  }
  if (rn === "urlset" || rn === "sitemapindex") return { error: "This is an XML sitemap, not a feed." };
  if (rn === "html") return { error: "This is an HTML page, not a feed." };
  return { error: `The root element is <${root.nodeName}>, which isn't RSS or Atom. Feeds start with <rss>, <rdf:RDF> or <feed>.` };
}

/** Feed links advertised in an HTML page's <head>. */
export function discoverFeeds(html: string, base: string): { href: string; title: string; type: string }[] {
  const out: { href: string; title: string; type: string }[] = [];
  const re = /<link\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const tag = m[0];
    const attr = (n: string) => new RegExp(`\\b${n}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag);
    const rel = attr("rel");
    const type = attr("type");
    const href = attr("href");
    const relV = (rel?.[1] ?? rel?.[2] ?? rel?.[3] ?? "").toLowerCase();
    const typeV = (type?.[1] ?? type?.[2] ?? type?.[3] ?? "").toLowerCase();
    if (!relV.split(/\s+/).includes("alternate") || !/(rss|atom)\+xml/.test(typeV)) continue;
    const hv = decodeEntities(href?.[1] ?? href?.[2] ?? href?.[3] ?? "");
    try {
      out.push({ href: new URL(hv, base).toString(), title: decodeEntities(attr("title")?.[1] ?? ""), type: typeV });
    } catch {
      /* skip */
    }
  }
  return out;
}
