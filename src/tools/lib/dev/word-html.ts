/*
 * Clean HTML from Word, Google Docs or a .docx conversion. Keeps structure (headings, paragraphs,
 * lists, tables, links, bold/italic) and drops styling, classes, spans, Office XML and comments.
 * Word's pasted lists (paragraphs with mso-list) are rebuilt as <ul>/<ol>.
 */
import { decodeEntities, escapeHtml, tokenize, type Token } from "./html";

export interface CleanOpts {
  images: boolean;
  tables: boolean;
  nbsp: boolean; // turn &nbsp; into normal spaces
  headingsShift?: number;
}

const KEEP: Record<string, string[]> = {
  p: [], h1: [], h2: [], h3: [], h4: [], h5: [], h6: [], ul: [], ol: ["start"], li: [], blockquote: [], pre: [], code: [],
  strong: [], em: [], sub: [], sup: [], br: [], hr: [], a: ["href", "title"], img: ["src", "alt", "width", "height"],
  table: [], thead: [], tbody: [], tfoot: [], tr: [], td: ["colspan", "rowspan"], th: ["colspan", "rowspan", "scope"], caption: [],
};
const RENAME: Record<string, string> = { b: "strong", i: "em", dfn: "em", cite: "em" };
const DROP_WITH_CONTENT = new Set(["script", "style", "head", "title", "xml", "meta", "link", "template", "noscript", "o:smarttagtype"]);
const BLOCKS = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "blockquote", "pre", "table", "thead", "tbody", "tfoot", "tr", "td", "th", "caption", "hr"]);
const TABLE_TAGS = new Set(["table", "thead", "tbody", "tfoot", "tr", "td", "th", "caption"]);

/** Word list markers: "1." "a)" "iv." are numbered; bullets (·, o, §, •) are not. */
function listType(marker: string): "ul" | "ol" {
  return /^(\(?[0-9]+[.)]|[a-z][.)]|[ivxlc]+[.)])/i.test(marker) ? "ol" : "ul";
}

function styleOf(t: Extract<Token, { type: "open" }>): string {
  return (t.attrs.find((a) => a.name.toLowerCase() === "style")?.value ?? "").toLowerCase();
}

function safeHref(v: string): string | null {
  const s = decodeEntities(v).trim();
  if (/^(javascript|vbscript|data):/i.test(s.replace(/\s/g, ""))) return null;
  if (/^file:/i.test(s)) return null;
  return s;
}

export function cleanHtml(html: string, o: CleanOpts): { html: string; notes: string[] } {
  const notes: string[] = [];
  // Word wraps its list markers and Office-only markup in conditional comments; drop them first.
  const src = html
    .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, "")
    .replace(/<!\[if !supportLists\]>([\s\S]*?)<!\[endif\]>/gi, (_, marker: string) => `\u0001${listType(decodeEntities(marker.replace(/<[^>]*>/g, "")).trim())}\u0001`)
    .replace(/<!\[(?:if|endif)[^>]*>/gi, "");
  const toks = tokenize(src);
  const out: string[] = [];
  const stack: { name: string; emit: string | null }[] = [];
  let drop = 0;
  let droppedImages = 0;
  let droppedTables = 0;
  let wordList: { type: "ul" | "ol" } | null = null;
  let skipMarker = 0;

  const emitOpen = (name: string, attrs = "") => out.push(`<${name}${attrs}>`);

  for (let k = 0; k < toks.length; k++) {
    const t = toks[k];
    if (t.type === "comment" || t.type === "decl") continue;
    if (t.type === "raw") continue; // script/style/title contents
    if (t.type === "open") {
      const name = t.name;
      if (DROP_WITH_CONTENT.has(name)) {
        if (!t.selfClosing && !["meta", "link"].includes(name)) drop++;
        continue;
      }
      if (drop) continue;
      const style = styleOf(t);
      const cls = (t.attrs.find((a) => a.name.toLowerCase() === "class")?.value ?? "").toLowerCase();
      // Word list marker spans: <span style="mso-list:Ignore">·<span>&nbsp;</span></span>
      if (style.includes("mso-list:ignore")) {
        skipMarker++;
        stack.push({ name, emit: null, marker: true } as { name: string; emit: string | null });
        continue;
      }
      if (skipMarker) {
        stack.push({ name, emit: null });
        continue;
      }
      // Word list paragraphs become <li>.
      if (name === "p" && (/mso-list:\s*l\d/.test(style) || cls.includes("msolistparagraph"))) {
        const next = toks.slice(k + 1, k + 12).find((x) => x.type === "text" && x.text.trim()) as { text: string } | undefined;
        const flagged = next && /\u0001(ul|ol)\u0001/.exec(next.text);
        const type: "ul" | "ol" = flagged ? (flagged[1] as "ul" | "ol") : listType(next ? decodeEntities(next.text).trim() : "");
        if (!wordList || wordList.type !== type) {
          if (wordList) out.push(`</${wordList.type}>`);
          out.push(`<${type}>`);
          wordList = { type };
        }
        emitOpen("li");
        stack.push({ name, emit: "li" });
        continue;
      }
      if (wordList && BLOCKS.has(name)) {
        out.push(`</${wordList.type}>`);
        wordList = null;
      }
      let target = RENAME[name] ?? name;
      // Google Docs: <b style="font-weight:normal"> wraps everything; spans carry the real formatting.
      if (name === "b" && /font-weight:\s*(normal|400)/.test(style)) target = "";
      if (name === "span") {
        const bold = /font-weight:\s*(bold|[6-9]00)/.test(style);
        const italic = /font-style:\s*italic/.test(style);
        if (bold || italic) {
          const parts = [bold ? "strong" : "", italic ? "em" : ""].filter(Boolean);
          parts.forEach((p) => emitOpen(p));
          stack.push({ name, emit: parts.reverse().map((p) => `</${p}>`).join("") });
          continue;
        }
      }
      if (/^h[1-6]$/.test(name) && o.headingsShift) target = `h${Math.min(6, Math.max(1, Number(name[1]) + o.headingsShift))}`;
      if (!o.tables && TABLE_TAGS.has(name)) {
        if (name === "table") droppedTables++;
        target = name === "td" || name === "th" ? "" : name === "tr" ? "p" : "";
      }
      if (!target || !KEEP[target]) {
        if (!t.selfClosing) stack.push({ name, emit: null });
        continue;
      }
      let attrs = "";
      for (const a of t.attrs) {
        const an = a.name.toLowerCase();
        if (!KEEP[target].includes(an) || a.value === null) continue;
        let v = a.value;
        if (an === "href") {
          const h = safeHref(v);
          if (!h) continue;
          v = h;
        }
        if (an === "src") {
          const s = decodeEntities(v).trim();
          if (!/^(https?:|data:image\/)/i.test(s)) continue;
          v = s;
        }
        attrs += ` ${an}="${escapeHtml(decodeEntities(v), true)}"`;
      }
      if (target === "a" && !/href=/.test(attrs)) {
        stack.push({ name, emit: null });
        continue;
      }
      if (target === "img") {
        if (!o.images || !/src=/.test(attrs)) {
          droppedImages++;
          continue;
        }
        out.push(`<img${attrs}>`);
        continue;
      }
      if (target === "br" || target === "hr") {
        out.push(`<${target}>`);
        continue;
      }
      emitOpen(target, attrs);
      if (!t.selfClosing) stack.push({ name, emit: `</${target}>` });
      continue;
    }
    if (t.type === "close") {
      if (DROP_WITH_CONTENT.has(t.name)) {
        if (drop) drop--;
        continue;
      }
      if (drop) continue;
      // Pop to the matching open tag (tolerate mis-nesting).
      let idx = -1;
      for (let s = stack.length - 1; s >= 0; s--)
        if (stack[s].name === t.name) {
          idx = s;
          break;
        }
      if (idx < 0) continue;
      while (stack.length > idx) {
        const e = stack.pop()! as { name: string; emit: string | null; marker?: boolean };
        if (e.marker) skipMarker = Math.max(0, skipMarker - 1);
        if (e.emit) out.push(e.emit.startsWith("</") ? e.emit : `</${e.emit}>`);
      }
      continue;
    }
    if (t.type === "text") {
      if (drop || skipMarker) continue;
      let s = t.text.replace(/\u0001(ul|ol)\u0001/g, "");
      s = decodeEntities(s);
      if (o.nbsp) s = s.replace(/ /g, " ");
      s = s.replace(/[ \t\r\n]+/g, " ");
      out.push(escapeHtml(s).replace(/ /g, "&nbsp;"));
    }
  }
  while (stack.length) {
    const e = stack.pop()!;
    if (e.emit) out.push(e.emit.startsWith("</") ? e.emit : `</${e.emit}>`);
  }
  if (wordList) out.push(`</${wordList.type}>`);

  let html2 = out.join("");
  // A lone paragraph inside a cell or list item is just its text.
  html2 = html2.replace(/<(td|th|li)([^>]*)>\s*<p>((?:(?!<\/?p>)[\s\S])*)<\/p>\s*<\/\1>/g, "<$1$2>$3</$1>");
  // Tidy: drop empty inline wrappers and empty paragraphs, merge adjacent identical inline tags.
  for (let pass = 0; pass < 3; pass++) {
    html2 = html2
      .replace(/<(strong|em|sub|sup|code)>(\s*)<\/\1>/g, "$2")
      .replace(/<\/(strong|em)>(\s*)<\1>/g, "$2")
      .replace(/<(p|h[1-6]|li|blockquote)>(?:\s|&nbsp;|<br>)*<\/\1>/g, "");
  }
  html2 = html2
    .replace(/<(p|h[1-6]|li|td|th)>\s+/g, "<$1>")
    .replace(/\s+<\/(p|h[1-6]|li|td|th)>/g, "</$1>")
    .replace(/(<\/(?:p|h[1-6]|ul|ol|li|blockquote|pre|table|thead|tbody|tfoot|tr|caption)>|<hr>|<(?:ul|ol|table|thead|tbody|tfoot|tr)>)\s*/g, "$1\n")
    .replace(/\s*(<(?:li|tr|td|th)[ >])/g, "\n$1")
    .replace(/\n{2,}/g, "\n")
    .trim();
  // Indent list items and table rows a little for readability.
  html2 = html2
    .split("\n")
    .map((l) => (/^<(li|td|th)[ >]/.test(l) ? "  " + l : /^<\/?tr/.test(l) ? "  " + l : l))
    .join("\n");
  if (droppedImages) notes.push(`${droppedImages} image${droppedImages === 1 ? " was" : "s were"} left out${o.images ? " because pasted images point to files on your computer" : ""}.`);
  if (droppedTables) notes.push(`${droppedTables} table${droppedTables === 1 ? "" : "s"} converted to paragraphs.`);
  return { html: html2, notes };
}
