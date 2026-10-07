/*
 * Word (.docx) → PDF in the browser.
 *  1. mammoth reads the .docx and produces simple semantic HTML (headings, paragraphs, bold,
 *     italic, underline, lists, tables, links, images, footnotes). It ignores fonts, colours,
 *     alignment, headers/footers and exact spacing.
 *  2. That HTML is turned into blocks and laid out on pages with pdf-lib's built-in fonts
 *     (Helvetica or Times), which only cover Western European characters.
 * The HTML parser is injected (DOMParser in the browser, node-html-parser in tests).
 */
import type { PDFDocument, PDFFont, PDFImage, PDFPage } from "pdf-lib";
import { type CancelToken, PdfError, checkCancelled, loadPdfLib, nextFrame } from "./core";
import { PAGE_SIZES } from "./images";

/* ---------- Minimal DOM interface (works with the browser DOM and node-html-parser) ---------- */

export interface HNode {
  nodeType: number;
  tagName?: string;
  childNodes: ArrayLike<HNode>;
  textContent?: string | null;
  getAttribute?: (name: string) => string | null | undefined;
}

/* ---------- Blocks ---------- */

export interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  script?: "sup" | "sub";
  href?: string;
}

export type BlockStyle = "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export type Block =
  | { type: "para"; style: BlockStyle; runs: Run[]; indent: number; marker?: string }
  | { type: "image"; key: string; alt: string; indent: number }
  | { type: "table"; rows: TableCell[][] }
  | { type: "rule" };

export interface TableCell {
  paras: { runs: Run[]; marker?: string; indent: number }[];
  colspan: number;
  rowspan: number;
  header: boolean;
}

const tag = (n: HNode) => (n.tagName ?? "").toLowerCase();
const attr = (n: HNode, a: string) => n.getAttribute?.(a) ?? null;
const kids = (n: HNode) => Array.from(n.childNodes);

const ROMAN: [number, string][] = [
  [10, "x"],
  [9, "ix"],
  [5, "v"],
  [4, "iv"],
  [1, "i"],
];
function roman(n: number) {
  let s = "";
  for (const [v, r] of ROMAN) {
    while (n >= v) {
      s += r;
      n -= v;
    }
  }
  return s;
}
function listMarker(ordered: boolean, depth: number, index: number) {
  if (!ordered) return ["•", "–", "·"][depth % 3];
  const k = depth % 3;
  if (k === 0) return `${index}.`;
  if (k === 1) return `${String.fromCharCode(96 + (((index - 1) % 26) + 1))}.`;
  return `${roman(index)}.`;
}

/** Converts mammoth's HTML body into layout blocks. */
export function htmlToBlocks(root: HNode): Block[] {
  const blocks: Block[] = [];

  // Collects inline runs; images inside a paragraph are returned separately (in order).
  const inline = (n: HNode, style: Omit<Run, "text">, out: (Run | { image: string; alt: string })[]) => {
    for (const c of kids(n)) {
      if (c.nodeType === 3) {
        const t = (c.textContent ?? "").replace(/[ \t\r\n]+/g, " ");
        if (t) out.push({ ...style, text: t });
        continue;
      }
      if (c.nodeType !== 1) continue;
      const t = tag(c);
      if (t === "br") out.push({ ...style, text: "\n" });
      else if (t === "img") out.push({ image: attr(c, "src") ?? "", alt: attr(c, "alt") ?? "" });
      else if (t === "strong" || t === "b") inline(c, { ...style, bold: true }, out);
      else if (t === "em" || t === "i") inline(c, { ...style, italic: true }, out);
      else if (t === "u") inline(c, { ...style, underline: true }, out);
      else if (t === "s" || t === "del" || t === "strike") inline(c, { ...style, strike: true }, out);
      else if (t === "sup") inline(c, { ...style, script: "sup" }, out);
      else if (t === "sub") inline(c, { ...style, script: "sub" }, out);
      else if (t === "a") {
        const href = attr(c, "href") ?? "";
        if (/^#(footnote|endnote|comment)-ref-/.test(href)) continue; // "↑" back-links
        inline(c, /^(https?:|mailto:)/i.test(href) ? { ...style, href } : style, out);
      } else inline(c, style, out);
    }
  };

  const paragraph = (n: HNode, style: BlockStyle, indent: number, marker?: string) => {
    const parts: (Run | { image: string; alt: string })[] = [];
    inline(n, {}, parts);
    let runs: Run[] = [];
    let first = true;
    const flush = () => {
      if (runs.some((r) => r.text.trim()) || (first && marker)) {
        blocks.push({ type: "para", style, runs, indent, marker: first ? marker : undefined });
        first = false;
      }
      runs = [];
    };
    for (const p of parts) {
      if ("image" in p) {
        flush();
        blocks.push({ type: "image", key: p.image, alt: p.alt, indent });
      } else runs.push(p);
    }
    if (runs.length || first) {
      if (!runs.some((r) => r.text.trim()) && !marker) {
        // Empty paragraph: keep as vertical space, as Word does.
        if (first) blocks.push({ type: "para", style, runs: [], indent });
      } else flush();
    }
  };

  const list = (n: HNode, depth: number) => {
    const ordered = tag(n) === "ol";
    let i = 0;
    for (const li of kids(n)) {
      if (li.nodeType !== 1 || tag(li) !== "li") continue;
      i++;
      const marker = listMarker(ordered, depth, i);
      // The li's own content (text and inline elements) up to any nested list.
      const own: HNode = { nodeType: 1, tagName: "span", childNodes: kids(li).filter((c) => !(c.nodeType === 1 && /^(ul|ol|p|table)$/.test(tag(c)))) };
      const ps = kids(li).filter((c) => c.nodeType === 1 && tag(c) === "p");
      if (ps.length) {
        ps.forEach((p, k) => paragraph(p, "p", depth + 1, k === 0 ? marker : undefined));
      } else paragraph(own, "p", depth + 1, marker);
      for (const c of kids(li)) {
        if (c.nodeType !== 1) continue;
        if (tag(c) === "ul" || tag(c) === "ol") list(c, depth + 1);
        else if (tag(c) === "table") table(c);
      }
    }
  };

  const cellParas = (cell: HNode): TableCell["paras"] => {
    const out: TableCell["paras"] = [];
    const walk = (n: HNode, depth: number, marker?: string) => {
      const parts: (Run | { image: string; alt: string })[] = [];
      inline(n, {}, parts);
      const runs = parts.filter((p): p is Run => !("image" in p));
      if (parts.some((p) => "image" in p)) runs.push({ text: " [image]", italic: true });
      out.push({ runs, marker, indent: depth });
    };
    const block = (n: HNode, depth: number) => {
      const loose: HNode[] = [];
      const flushLoose = () => {
        if (loose.length) walk({ nodeType: 1, tagName: "span", childNodes: loose.splice(0) }, depth);
      };
      for (const c of kids(n)) {
        const t = c.nodeType === 1 ? tag(c) : "";
        if (/^(p|h[1-6])$/.test(t)) {
          flushLoose();
          walk(c, depth);
        } else if (t === "ul" || t === "ol") {
          flushLoose();
          let i = 0;
          for (const li of kids(c)) {
            if (li.nodeType !== 1 || tag(li) !== "li") continue;
            walk({ nodeType: 1, tagName: "span", childNodes: kids(li).filter((x) => !(x.nodeType === 1 && /^(ul|ol)$/.test(tag(x)))) }, depth + 1, listMarker(t === "ol", depth, ++i));
            for (const x of kids(li)) if (x.nodeType === 1 && /^(ul|ol)$/.test(tag(x))) block({ nodeType: 1, tagName: "div", childNodes: [x] }, depth + 1);
          }
        } else if (t === "table") {
          flushLoose();
          out.push({ runs: [{ text: "[nested table]", italic: true }], indent: depth });
        } else loose.push(c);
      }
      flushLoose();
    };
    block(cell, 0);
    return out.length ? out : [{ runs: [], indent: 0 }];
  };

  const table = (n: HNode) => {
    const rows: TableCell[][] = [];
    const collectRows = (x: HNode) => {
      for (const c of kids(x)) {
        if (c.nodeType !== 1) continue;
        const t = tag(c);
        if (t === "tr") {
          rows.push(
            kids(c)
              .filter((td) => td.nodeType === 1 && /^(td|th)$/.test(tag(td)))
              .map((td) => ({
                paras: cellParas(td),
                colspan: Math.max(1, Number(attr(td, "colspan")) || 1),
                rowspan: Math.max(1, Number(attr(td, "rowspan")) || 1),
                header: tag(td) === "th",
              })),
          );
        } else if (/^(thead|tbody|tfoot)$/.test(t)) collectRows(c);
      }
    };
    collectRows(n);
    if (rows.length) blocks.push({ type: "table", rows });
  };

  const walk = (n: HNode) => {
    for (const c of kids(n)) {
      if (c.nodeType === 3) {
        if ((c.textContent ?? "").trim()) paragraph({ nodeType: 1, tagName: "span", childNodes: [c] }, "p", 0);
        continue;
      }
      if (c.nodeType !== 1) continue;
      const t = tag(c);
      if (t === "p") paragraph(c, "p", 0);
      else if (/^h[1-6]$/.test(t)) paragraph(c, t as BlockStyle, 0);
      else if (t === "ul" || t === "ol") list(c, 0);
      else if (t === "table") table(c);
      else if (t === "hr") blocks.push({ type: "rule" });
      else if (t === "img") blocks.push({ type: "image", key: attr(c, "src") ?? "", alt: attr(c, "alt") ?? "", indent: 0 });
      else if (t === "blockquote" || t === "div" || t === "body" || t === "html" || t === "section") walk(c);
      else paragraph(c, "p", 0);
    }
  };
  walk(root);
  return blocks;
}

/* ---------- Layout ---------- */

export interface DocxPdfOptions {
  pageSize: "a4" | "letter";
  orientation: "portrait" | "landscape";
  /** Page margin in points. */
  margin: number;
  font: "sans" | "serif";
  pageNumbers: boolean;
}

export interface DocxImage {
  bytes: Uint8Array;
  contentType: string;
}

export interface DocxReport {
  pages: number;
  paragraphs: number;
  headings: number;
  tables: number;
  images: number;
  imagesSkipped: number;
  /** Characters the built-in fonts can't show (replaced by "?"). */
  missingChars: string[];
}

const HEADING: Record<BlockStyle, { size: number; before: number; after: number; bold: boolean; italic?: boolean }> = {
  h1: { size: 20, before: 16, after: 8, bold: true },
  h2: { size: 16, before: 14, after: 6, bold: true },
  h3: { size: 13.5, before: 12, after: 5, bold: true },
  h4: { size: 12, before: 10, after: 4, bold: true },
  h5: { size: 11, before: 8, after: 4, bold: true },
  h6: { size: 11, before: 8, after: 4, bold: true, italic: true },
  p: { size: 11, before: 0, after: 7, bold: false },
};
const LINE = 1.32;
const LINK_COLOR = [0.02, 0.32, 0.72] as const;

interface Piece {
  text: string;
  font: PDFFont;
  size: number;
  rise: number;
  width: number;
  underline?: boolean;
  strike?: boolean;
  href?: string;
  space: boolean;
  newline?: boolean;
}

interface Line {
  pieces: { p: Piece; x: number }[];
  width: number;
  size: number;
}

/**
 * Lays out blocks into a new PDF. `images` maps an <img src> key to its bytes; `decodeImage`
 * converts formats pdf-lib can't embed (GIF, BMP, WebP) to PNG and may return null.
 */
export async function blocksToPdf(
  blocks: Block[],
  images: Map<string, DocxImage>,
  o: DocxPdfOptions,
  hooks: {
    decodeImage?: (img: DocxImage) => Promise<{ bytes: Uint8Array; format: "png" | "jpeg" } | null>;
    token?: CancelToken;
    onProgress?: (done: number, total: number) => void;
    title?: string;
  } = {},
): Promise<{ bytes: Uint8Array; report: DocxReport }> {
  const lib = await loadPdfLib();
  const { PDFDocument, StandardFonts, rgb, PDFName, PDFString } = lib;
  const doc: PDFDocument = await PDFDocument.create();
  if (hooks.title) doc.setTitle(hooks.title);
  doc.setCreator("premierseoservices.com Word to PDF");
  doc.setProducer("pdf-lib");
  const serif = o.font === "serif";
  const F = {
    r: await doc.embedFont(serif ? StandardFonts.TimesRoman : StandardFonts.Helvetica),
    b: await doc.embedFont(serif ? StandardFonts.TimesRomanBold : StandardFonts.HelveticaBold),
    i: await doc.embedFont(serif ? StandardFonts.TimesRomanItalic : StandardFonts.HelveticaOblique),
    bi: await doc.embedFont(serif ? StandardFonts.TimesRomanBoldItalic : StandardFonts.HelveticaBoldOblique),
  };
  const fontFor = (bold?: boolean, italic?: boolean) => (bold ? (italic ? F.bi : F.b) : italic ? F.i : F.r);
  // pdf-lib's widthOfTextAtSize subtracts kerning pairs, but drawText doesn't kern, so sum the
  // glyph widths one character at a time (cached) to match what is drawn.
  const glyphW = new Map<PDFFont, Map<string, number>>();
  const textWidth = (font: PDFFont, text: string, size: number) => {
    let m = glyphW.get(font);
    if (!m) glyphW.set(font, (m = new Map()));
    let w = 0;
    for (const ch of text) {
      let g = m.get(ch);
      if (g === undefined) m.set(ch, (g = font.widthOfTextAtSize(ch, 1)));
      w += g;
    }
    return w * size;
  };
  const charset = new Set(F.r.getCharacterSet());
  const missing = new Set<string>();
  const REPLACE: Record<string, string> = {
    "‐": "-",
    "‑": "-",
    "‒": "-",
    "―": "—",
    "−": "-",
    "′": "'",
    "″": '"',
    "←": "<-",
    "→": "->",
    "≤": "<=",
    "≥": ">=",
    "≠": "!=",
    "✓": "v",
    "✔": "v",
    "●": "•",
    "▪": "•",
    "◦": "·",
    "­": "",
    "​": "",
    "‌": "",
    "‍": "",
    "﻿": "",
    "\t": "    ",
  };
  const clean = (s: string) => {
    let out = "";
    for (const ch of s) {
      if (ch === "\n") {
        out += ch;
        continue;
      }
      if (ch in REPLACE) {
        out += REPLACE[ch];
        continue;
      }
      const cp = ch.codePointAt(0)!;
      if (charset.has(cp)) out += ch;
      else {
        missing.add(ch);
        out += "?";
      }
    }
    return out;
  };

  let [pw, ph] = PAGE_SIZES[o.pageSize];
  if (o.orientation === "landscape") [pw, ph] = [ph, pw];
  const left = o.margin;
  const right = pw - o.margin;
  const top = ph - o.margin;
  const bottom = o.margin + (o.pageNumbers ? 14 : 0);
  const fullWidth = right - left;

  let page: PDFPage = doc.addPage([pw, ph]);
  let y = top;
  const newPage = () => {
    page = doc.addPage([pw, ph]);
    y = top;
  };
  const report: DocxReport = { pages: 0, paragraphs: 0, headings: 0, tables: 0, images: 0, imagesSkipped: 0, missingChars: [] };

  const addLink = (href: string, x1: number, y1: number, x2: number, y2: number) => {
    const ctx = doc.context;
    const annot = ctx.obj({
      Type: "Annot",
      Subtype: "Link",
      Rect: [x1, y1, x2, y2],
      Border: [0, 0, 0],
      A: { Type: "Action", S: "URI", URI: PDFString.of(href) },
    });
    const ref = ctx.register(annot);
    const annots = page.node.lookup(PDFName.of("Annots"));
    if (annots instanceof lib.PDFArray) annots.push(ref);
    else page.node.set(PDFName.of("Annots"), ctx.obj([ref]));
  };

  /** Splits runs into measured pieces (words and spaces). */
  const toPieces = (runs: Run[], size: number, forceBold = false, forceItalic = false): Piece[] => {
    const out: Piece[] = [];
    for (const r of runs) {
      const font = fontFor(r.bold || forceBold, r.italic || forceItalic);
      const s = r.script ? size * 0.7 : size;
      const rise = r.script === "sup" ? size * 0.33 : r.script === "sub" ? -size * 0.15 : 0;
      for (const part of clean(r.text).split(/(\n| +)/)) {
        if (!part) continue;
        if (part === "\n") {
          out.push({ text: "", font, size: s, rise, width: 0, space: false, newline: true });
          continue;
        }
        const space = part.trim() === "";
        out.push({
          text: space ? " " : part,
          font,
          size: s,
          rise,
          width: textWidth(font, space ? " " : part, s),
          underline: r.underline || !!r.href,
          strike: r.strike,
          href: r.href,
          space,
        });
      }
    }
    return out;
  };

  /** Greedy line breaking; words longer than the line are split by characters. */
  const breakLines = (pieces: Piece[], width: number, baseSize: number): Line[] => {
    const lines: Line[] = [];
    let cur: Line = { pieces: [], width: 0, size: baseSize };
    const push = () => {
      // Drop trailing spaces.
      while (cur.pieces.length && cur.pieces[cur.pieces.length - 1].p.space) {
        cur.width -= cur.pieces.pop()!.p.width;
      }
      lines.push(cur);
      cur = { pieces: [], width: 0, size: baseSize };
    };
    for (let k = 0; k < pieces.length; k++) {
      let p = pieces[k];
      if (p.newline) {
        push();
        continue;
      }
      if (p.space && !cur.pieces.length) continue;
      if (cur.width + p.width > width && !p.space) {
        if (cur.pieces.length) push();
        // Still too wide on an empty line: split the word.
        while (p.width > width && p.text.length > 1) {
          let n = p.text.length - 1;
          while (n > 1 && textWidth(p.font, p.text.slice(0, n), p.size) > width) n--;
          const head = { ...p, text: p.text.slice(0, n), width: textWidth(p.font, p.text.slice(0, n), p.size) };
          cur.pieces.push({ p: head, x: 0 });
          cur.width = head.width;
          cur.size = Math.max(cur.size, head.size);
          push();
          const rest = p.text.slice(n);
          p = { ...p, text: rest, width: textWidth(p.font, rest, p.size) };
        }
      }
      cur.pieces.push({ p, x: cur.width });
      cur.width += p.width;
      cur.size = Math.max(cur.size, p.size);
    }
    if (cur.pieces.length || !lines.length) push();
    return lines;
  };

  const drawLine = (line: Line, x0: number, baseline: number) => {
    for (const { p, x } of line.pieces) {
      if (!p.text) continue;
      const color = p.href ? rgb(...LINK_COLOR) : rgb(0, 0, 0);
      if (!p.space) page.drawText(p.text, { x: x0 + x, y: baseline + p.rise, size: p.size, font: p.font, color });
      if (p.underline) {
        page.drawLine({ start: { x: x0 + x, y: baseline - p.size * 0.12 }, end: { x: x0 + x + p.width, y: baseline - p.size * 0.12 }, thickness: p.size * 0.05, color });
      }
      if (p.strike) {
        page.drawLine({ start: { x: x0 + x, y: baseline + p.size * 0.28 }, end: { x: x0 + x + p.width, y: baseline + p.size * 0.28 }, thickness: p.size * 0.05, color });
      }
      if (p.href && !p.space) {
        addLink(p.href, x0 + x, baseline - p.size * 0.25, x0 + x + p.width, baseline + p.size * 0.85);
      }
    }
  };

  const lineHeight = (l: Line) => l.size * LINE;

  /* ----- Paragraphs ----- */
  const para = (b: Extract<Block, { type: "para" }>, next?: Block, nextImageH = 0) => {
    const h = HEADING[b.style];
    const indentPt = b.indent * 18;
    const markerW = b.marker ? 18 : 0;
    const x0 = left + indentPt + (b.marker ? 0 : 0);
    const textX = x0 + markerW;
    const width = right - textX;
    if (b.style !== "p") report.headings++;
    else report.paragraphs++;
    const pieces = toPieces(b.runs, h.size, h.bold, h.italic);
    const lines = pieces.length ? breakLines(pieces, width, h.size) : [{ pieces: [], width: 0, size: h.size }];
    if (y < top) y -= h.before;
    // Keep headings with at least two lines of what follows.
    const need = lineHeight(lines[0]) + (b.style !== "p" && next ? (nextImageH ? nextImageH + 8 : 11 * LINE * 2) + h.after : 0);
    if (y - need < bottom) newPage();
    lines.forEach((line, k) => {
      const lh = lineHeight(line);
      if (y - lh < bottom) newPage();
      const baseline = y - line.size * 1.02;
      if (k === 0 && b.marker) {
        const mf = F.r;
        const m = clean(b.marker);
        page.drawText(m, { x: textX - 6 - textWidth(mf, m, h.size), y: baseline, size: h.size, font: mf });
      }
      drawLine(line, textX, baseline);
      y -= lh;
    });
    const nextIsListItem = next?.type === "para" && !!next.marker && !!b.marker;
    y -= nextIsListItem ? 2 : h.after;
  };

  /* ----- Images ----- */
  const embedded = new Map<string, Promise<PDFImage | null>>();
  const embedImage = (key: string): Promise<PDFImage | null> => {
    if (!embedded.has(key)) {
      embedded.set(
        key,
        (async () => {
          const src = images.get(key);
          if (!src) return null;
          let data: { bytes: Uint8Array; format: "png" | "jpeg" } | null = null;
          if (/jpe?g/i.test(src.contentType)) data = { bytes: src.bytes, format: "jpeg" };
          else if (/png/i.test(src.contentType)) data = { bytes: src.bytes, format: "png" };
          else if (hooks.decodeImage) data = await hooks.decodeImage(src).catch(() => null);
          if (!data) return null;
          try {
            return data.format === "jpeg" ? await doc.embedJpg(data.bytes) : await doc.embedPng(data.bytes);
          } catch {
            return null;
          }
        })(),
      );
    }
    return embedded.get(key)!;
  };
  /** Drawn size: 96 px per inch, like a screen, but never wider than the text column or taller than a page. */
  const imageBox = (im: PDFImage, indent: number) => {
    const maxW = right - (left + indent * 18);
    const maxH = top - bottom;
    const k = Math.min(1, maxW / (im.width * 0.75), maxH / (im.height * 0.75));
    return { w: im.width * 0.75 * k, h: im.height * 0.75 * k };
  };

  const image = async (b: Extract<Block, { type: "image" }>) => {
    const src = images.get(b.key);
    if (!src) return;
    const im = await embedImage(b.key);
    if (!im) {
      report.imagesSkipped++;
      const kind = (src.contentType.split("/")[1] ?? "unknown").replace(/^x-/, "").toUpperCase();
      para({ type: "para", style: "p", runs: [{ text: `[Image not included: ${kind} format${b.alt ? `, “${b.alt}”` : ""}]`, italic: true }], indent: b.indent });
      return;
    }
    report.images++;
    const { w, h } = imageBox(im, b.indent);
    if (y - h < bottom) newPage();
    page.drawImage(im, { x: left + b.indent * 18, y: y - h, width: w, height: h });
    y -= h + 8;
  };

  /* ----- Tables ----- */
  const tableBlock = async (b: Extract<Block, { type: "table" }>) => {
    report.tables++;
    const size = 10;
    const pad = 4;
    // Place cells on a grid, honouring colspan/rowspan.
    const occupied: boolean[][] = [];
    const placed: { cell: TableCell; row: number; col: number }[][] = [];
    let cols = 0;
    b.rows.forEach((row, r) => {
      occupied[r] ??= [];
      placed[r] = [];
      let c = 0;
      for (const cell of row) {
        while (occupied[r][c]) c++;
        placed[r].push({ cell, row: r, col: c });
        for (let dr = 0; dr < cell.rowspan; dr++) {
          occupied[r + dr] ??= [];
          for (let dc = 0; dc < cell.colspan; dc++) occupied[r + dr][c + dc] = true;
        }
        c += cell.colspan;
        cols = Math.max(cols, c);
      }
    });
    if (!cols) return;
    // Column widths: minimum = longest word, natural = longest paragraph; share the rest.
    const minW = new Array(cols).fill(24);
    const natW = new Array(cols).fill(24);
    for (const row of placed) {
      for (const { cell, col } of row) {
        if (cell.colspan !== 1) continue;
        for (const pr of cell.paras) {
          const pieces = toPieces(pr.runs, size, cell.header);
          const extra = 2 * pad + (pr.marker ? 12 : 0) + pr.indent * 10;
          const longest = Math.max(0, ...pieces.filter((p) => !p.space).map((p) => p.width));
          const total = pieces.reduce((s, p) => s + p.width, 0);
          minW[col] = Math.max(minW[col], longest + extra);
          natW[col] = Math.max(natW[col], total + extra);
        }
      }
    }
    const sumMin = minW.reduce((a, v) => a + v, 0);
    let widths: number[];
    if (sumMin >= fullWidth) widths = minW.map((v) => (v * fullWidth) / sumMin);
    else {
      const sumNat = natW.reduce((a, v) => a + v, 0);
      if (sumNat <= fullWidth) widths = natW.map((v) => (v * fullWidth) / sumNat);
      else {
        const room = fullWidth - sumMin;
        const flex = natW.map((v, i) => v - minW[i]);
        const sumFlex = flex.reduce((a, v) => a + v, 0) || 1;
        widths = minW.map((v, i) => v + (room * flex[i]) / sumFlex);
      }
    }
    const xs = [left];
    for (const w of widths) xs.push(xs[xs.length - 1] + w);

    const border = rgb(0.55, 0.55, 0.55);
    y -= 4;
    for (let r = 0; r < placed.length; r++) {
      checkCancelled(hooks.token);
      // Lay out each cell's lines.
      const cells = placed[r].map(({ cell, col }) => {
        const x = xs[col];
        const w = xs[Math.min(cols, col + cell.colspan)] - x;
        const lines: { line: Line; x: number }[] = [];
        for (const pr of cell.paras) {
          const indent = pr.indent * 10 + (pr.marker ? 12 : 0);
          const pieces = toPieces(pr.runs, size, cell.header);
          const ls = pieces.length ? breakLines(pieces, Math.max(8, w - 2 * pad - indent), size) : [{ pieces: [], width: 0, size }];
          ls.forEach((l, k) => {
            if (k === 0 && pr.marker) l = { ...l, pieces: [{ p: { text: pr.marker, font: F.r, size, rise: 0, width: 0, space: false }, x: -12 }, ...l.pieces] };
            lines.push({ line: l, x: x + pad + indent });
          });
        }
        return { x, w, lines, header: cell.header };
      });
      // Draw the row, continuing on the next page if it doesn't fit.
      const printed = cells.map(() => 0);
      for (;;) {
        if (y - (size * LINE + 2 * pad) < bottom) newPage();
        const avail = y - bottom;
        const segTop = y;
        const segs = cells.map((c, ci) => {
          let h = pad;
          const out: { line: Line; x: number; y: number }[] = [];
          let k = printed[ci];
          while (k < c.lines.length) {
            const lh = lineHeight(c.lines[k].line);
            if (h + lh + pad > avail && (out.length || y < top)) break;
            out.push({ ...c.lines[k], y: segTop - h - c.lines[k].line.size * 1.02 });
            h += lh;
            k++;
          }
          printed[ci] = k;
          return { out, h: h + pad };
        });
        const segH = Math.min(avail, Math.max(...segs.map((s) => s.h)));
        cells.forEach((c) => {
          if (c.header) page.drawRectangle({ x: c.x, y: segTop - segH, width: c.w, height: segH, color: rgb(0.93, 0.93, 0.93) });
          page.drawRectangle({ x: c.x, y: segTop - segH, width: c.w, height: segH, borderColor: border, borderWidth: 0.6 });
        });
        segs.forEach((s) => s.out.forEach((l) => drawLine(l.line, l.x, l.y)));
        y = segTop - segH;
        if (cells.every((c, ci) => printed[ci] >= c.lines.length)) break;
        newPage();
      }
      if (r % 10 === 9) await nextFrame();
    }
    y -= 10;
  };

  for (let i = 0; i < blocks.length; i++) {
    checkCancelled(hooks.token);
    if (i % 40 === 0) {
      hooks.onProgress?.(i, blocks.length);
      await nextFrame();
    }
    const b = blocks[i];
    if (b.type === "para") {
      const next = blocks[i + 1];
      let nextImageH = 0;
      if (b.style !== "p" && next?.type === "image") {
        const im = await embedImage(next.key);
        if (im) nextImageH = imageBox(im, next.indent).h;
      }
      para(b, next, nextImageH);
    }
    else if (b.type === "image") await image(b);
    else if (b.type === "table") await tableBlock(b);
    else {
      if (y - 12 < bottom) newPage();
      page.drawLine({ start: { x: left, y: y - 6 }, end: { x: right, y: y - 6 }, thickness: 0.6, color: rgb(0.6, 0.6, 0.6) });
      y -= 12;
    }
  }

  const pages = doc.getPages();
  if (o.pageNumbers) {
    pages.forEach((p, i) => {
      const label = `${i + 1} / ${pages.length}`;
      const w = textWidth(F.r, label, 9);
      p.drawText(label, { x: (pw - w) / 2, y: o.margin / 2, size: 9, font: F.r, color: rgb(0.35, 0.35, 0.35) });
    });
  }
  report.pages = pages.length;
  report.missingChars = [...missing].slice(0, 12);
  hooks.onProgress?.(blocks.length, blocks.length);
  return { bytes: await doc.save({ useObjectStreams: true }), report };
}

/* ---------- Whole pipeline ---------- */

/** Rejects old .doc files, password-protected .docx and non-Word files with clear messages. */
export function checkDocx(bytes: Uint8Array, name: string) {
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) {
    throw new PdfError(
      "UNSUPPORTED",
      `${name} is an older Word .doc file or a password-protected document. Open it in Word, Google Docs or LibreOffice, save it as .docx without a password, then try again.`,
    );
  }
  if (!(bytes[0] === 0x50 && bytes[1] === 0x4b)) {
    throw new PdfError("UNSUPPORTED", `${name} isn't a Word .docx file.`);
  }
}

export async function docxToPdf(
  file: ArrayBuffer,
  name: string,
  o: DocxPdfOptions,
  hooks: {
    parseHtml: (html: string) => HNode;
    decodeImage?: (img: DocxImage) => Promise<{ bytes: Uint8Array; format: "png" | "jpeg" } | null>;
    token?: CancelToken;
    onProgress?: (label: string, done: number, total: number) => void;
  },
): Promise<{ bytes: Uint8Array; report: DocxReport; blocks: number }> {
  checkDocx(new Uint8Array(file, 0, Math.min(8, file.byteLength)), name);
  hooks.onProgress?.("Reading the document…", 0, 1);
  const mod = await import("mammoth");
  const mammoth = (mod as unknown as { default?: typeof mod }).default ?? mod;
  const images = new Map<string, DocxImage>();
  let html: string;
  try {
    // The browser build of mammoth reads `arrayBuffer`; the Node build (used in tests) reads `buffer`.
    const input = { arrayBuffer: file, buffer: file } as unknown as { arrayBuffer: ArrayBuffer };
    const res = await mammoth.convertToHtml(
      input,
      {
        styleMap: ["u => u", "strike => s"],
        convertImage: mammoth.images.imgElement(async (img) => {
          const key = `img:${images.size}`;
          images.set(key, { bytes: new Uint8Array(await img.readAsArrayBuffer()), contentType: img.contentType || "" });
          return { src: key };
        }),
      },
    );
    html = res.value;
  } catch {
    throw new PdfError("CORRUPT", `${name} couldn't be read as a Word document. It may be damaged, or saved in a format other than .docx.`);
  }
  checkCancelled(hooks.token);
  const blocks = htmlToBlocks(hooks.parseHtml(html));
  if (!blocks.length) throw new PdfError("EMPTY", `${name} has no text, tables or images to convert.`);
  const title = name.replace(/\.docx?$/i, "");
  const out = await blocksToPdf(blocks, images, o, {
    decodeImage: hooks.decodeImage,
    token: hooks.token,
    title,
    onProgress: (d, t) => hooks.onProgress?.("Laying out pages…", d, t),
  });
  return { ...out, blocks: blocks.length };
}
