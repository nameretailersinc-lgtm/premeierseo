/*
 * Plain text → HTML and HTML → plain text. Pure functions built on the tokenizer in ./html.
 */
import { BLOCK, attr, decodeEntities, escapeHtml, tokenize } from "./html";

/* ---------- Text → HTML ---------- */

export interface TextToHtmlOpts {
  breaks: "p-br" | "p-line" | "br";
  escape: boolean;
  links: boolean;
  newTab: boolean;
  markdown: boolean;
}

const URL_RE = /\b((?:https?:\/\/|www\.)[^\s<>"']+[^\s<>"'.,;:!?)\]}])|\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g;

function linkify(s: string, o: TextToHtmlOpts): string {
  const extra = o.newTab ? ' target="_blank" rel="noopener"' : "";
  return s.replace(URL_RE, (m, url: string | undefined, email: string | undefined) => {
    if (email) return `<a href="mailto:${email}">${email}</a>`;
    const href = url!.startsWith("www.") ? `https://${url}` : url!;
    return `<a href="${href.replace(/"/g, "&quot;")}"${extra}>${url}</a>`;
  });
}

function inlineMd(s: string): string {
  return s
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, "$1<em>$2</em>")
    .replace(/(^|[^_\w])_([^_\s][^_]*?)_(?!\w)/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/|#|mailto:)[^)\s]+)\)/g, '<a href="$2">$1</a>');
}

export function textToHtml(text: string, o: TextToHtmlOpts): string {
  const src = text.replace(/\r\n?/g, "\n");
  const inline = (s: string) => {
    let r = o.escape ? escapeHtml(s) : s;
    if (o.markdown) r = inlineMd(r);
    if (o.links && !/<a\s/i.test(r)) r = linkify(r, o);
    return r;
  };
  if (o.breaks === "br") return src.split("\n").map(inline).join("<br>\n");
  const blocks = src.split(/\n\s*\n/).map((b) => b.replace(/^\n+|\n+$/g, "")).filter((b) => b.trim());
  const out: string[] = [];
  for (const b of blocks) {
    const lines = b.split("\n");
    if (o.markdown) {
      const h = /^(#{1,6})\s+(.+)$/.exec(lines[0]);
      if (h && lines.length === 1) {
        out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
        continue;
      }
      if (lines.every((l) => /^\s*[-*+]\s+/.test(l))) {
        out.push("<ul>\n" + lines.map((l) => `  <li>${inline(l.replace(/^\s*[-*+]\s+/, ""))}</li>`).join("\n") + "\n</ul>");
        continue;
      }
      if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
        out.push("<ol>\n" + lines.map((l) => `  <li>${inline(l.replace(/^\s*\d+[.)]\s+/, ""))}</li>`).join("\n") + "\n</ol>");
        continue;
      }
      if (lines.every((l) => /^>\s?/.test(l))) {
        out.push(`<blockquote><p>${lines.map((l) => inline(l.replace(/^>\s?/, ""))).join("<br>\n")}</p></blockquote>`);
        continue;
      }
    }
    if (o.breaks === "p-line") out.push(...lines.filter((l) => l.trim()).map((l) => `<p>${inline(l)}</p>`));
    else out.push(`<p>${lines.map(inline).join("<br>\n")}</p>`);
  }
  return out.join("\n");
}

/* ---------- HTML → Text ---------- */

export interface HtmlToTextOpts {
  links: "text" | "inline" | "markdown";
  headings: "plain" | "markdown" | "upper";
  lists: boolean;
  images: boolean;
  tables: "tabs" | "pipes";
}

const DROP = new Set(["script", "style", "noscript", "template", "head", "svg", "iframe", "object", "canvas", "select", "button"]);

export function htmlToText(html: string, o: HtmlToTextOpts): string {
  const toks = tokenize(html);
  let out = "";
  let drop = 0;
  let pre = 0;
  const lists: { ordered: boolean; n: number }[] = [];
  const linkStack: { href: string; start: number }[] = [];
  let cellIndex = 0;
  let headingStart = -1;
  let headingLevel = 0;

  const nl = (count: number) => {
    // Ensure the output ends with at least `count` newlines (ignoring trailing spaces).
    out = out.replace(/[ \t]+$/, "");
    if (!out) return;
    const m = /\n*$/.exec(out)![0].length;
    if (m < count) out += "\n".repeat(count - m);
  };
  const space = () => {
    if (out && !/[\s]$/.test(out)) out += " ";
  };

  for (const t of toks) {
    if (t.type === "open") {
      if (DROP.has(t.name) && !t.selfClosing) {
        drop++;
        continue;
      }
      if (drop) continue;
      const n = t.name;
      if (n === "br") {
        out = out.replace(/[ \t]+$/, "") + "\n";
        continue;
      }
      if (n === "hr") {
        nl(2);
        out += "---";
        nl(2);
        continue;
      }
      if (n === "img") {
        const alt = attr(t, "alt");
        if (o.images && alt) {
          space();
          out += `[image: ${alt.trim()}]`;
        }
        continue;
      }
      if (n === "pre") {
        nl(2);
        pre++;
        continue;
      }
      if (n === "ul" || n === "ol") {
        nl(lists.length ? 1 : 2);
        lists.push({ ordered: n === "ol", n: Number(attr(t, "start")) || 1 });
        continue;
      }
      if (n === "li") {
        nl(1);
        const l = lists[lists.length - 1];
        const indent = "  ".repeat(Math.max(0, lists.length - 1));
        if (o.lists) out += indent + (l?.ordered ? `${l.n++}. ` : "- ");
        else out += indent;
        continue;
      }
      if (/^h[1-6]$/.test(n)) {
        nl(2);
        headingLevel = Number(n[1]);
        if (o.headings === "markdown") out += "#".repeat(headingLevel) + " ";
        headingStart = out.length;
        continue;
      }
      if (n === "tr") {
        nl(1);
        cellIndex = 0;
        continue;
      }
      if (n === "td" || n === "th") {
        if (cellIndex++ > 0) out = out.replace(/[ \t]+$/, "") + (o.tables === "tabs" ? "\t" : " | ");
        continue;
      }
      if (n === "a") {
        linkStack.push({ href: attr(t, "href") ?? "", start: out.length });
        continue;
      }
      if (n === "blockquote") {
        nl(2);
        continue;
      }
      if (BLOCK.has(n)) nl(n === "div" || n === "dt" || n === "dd" ? 1 : 2);
      continue;
    }
    if (t.type === "close") {
      const n = t.name;
      if (DROP.has(n)) {
        if (drop) drop--;
        continue;
      }
      if (drop) continue;
      if (n === "pre") {
        pre = Math.max(0, pre - 1);
        nl(2);
        continue;
      }
      if (n === "ul" || n === "ol") {
        lists.pop();
        nl(lists.length ? 1 : 2);
        continue;
      }
      if (/^h[1-6]$/.test(n)) {
        if (o.headings === "upper" && headingStart >= 0) out = out.slice(0, headingStart) + out.slice(headingStart).toUpperCase();
        headingStart = -1;
        nl(2);
        continue;
      }
      if (n === "a") {
        const l = linkStack.pop();
        if (!l) continue;
        const text = out.slice(l.start).trim();
        const href = l.href.trim();
        if (!href || href.startsWith("#") || href.startsWith("javascript:") || o.links === "text") continue;
        const shown = href.replace(/^mailto:/, "");
        if (o.links === "markdown") out = out.slice(0, l.start) + out.slice(l.start).replace(text, () => `[${text}](${href})`);
        else if (text !== shown && text !== href) out += ` (${shown})`;
        continue;
      }
      if (n === "table") {
        nl(2);
        continue;
      }
      if (n === "td" || n === "th") continue;
      if (n === "tr") {
        nl(1);
        continue;
      }
      if (BLOCK.has(n)) nl(n === "div" || n === "li" || n === "td" || n === "th" || n === "dt" || n === "dd" ? 1 : 2);
      continue;
    }
    if (drop) continue;
    if (t.type === "text") {
      let s = decodeEntities(t.text);
      if (pre) {
        out += s;
        continue;
      }
      s = s.replace(/[ \t\r\n\f]+/g, " ");
      if (/\n$/.test(out) || !out) s = s.replace(/^ /, "");
      out += s.replace(/ /g, " ");
      continue;
    }
    if (t.type === "raw" && (t.parent === "textarea" || t.parent === "title")) {
      if (t.parent === "textarea") out += decodeEntities(t.text);
    }
  }
  return out
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
