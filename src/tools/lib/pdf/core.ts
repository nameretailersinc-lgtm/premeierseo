/*
 * Shared PDF helpers for the PDF tool widgets. Everything runs in the browser.
 * Heavy libraries (pdf-lib, pdfjs-dist, fflate) are only imported inside functions,
 * so importing this module does not pull them into the widget chunk.
 */
import type { PDFDocument } from "pdf-lib";
import type { PDFDocumentProxy } from "pdfjs-dist";

/* ---------- Errors ---------- */

export type PdfErrorCode = "NOT_PDF" | "ENCRYPTED" | "CORRUPT" | "CANCELLED" | "EMPTY" | "UNSUPPORTED" | "TOO_LARGE";

export class PdfError extends Error {
  code: PdfErrorCode;
  constructor(code: PdfErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "PdfError";
  }
}

export class CancelledError extends PdfError {
  constructor() {
    super("CANCELLED", "Cancelled.");
  }
}

/** A cancel flag shared between a running job and its Cancel button. */
export interface CancelToken {
  cancelled: boolean;
}
export function checkCancelled(t?: CancelToken) {
  if (t?.cancelled) throw new CancelledError();
}

export function isCancelled(e: unknown): boolean {
  return e instanceof PdfError && e.code === "CANCELLED";
}

export function errorMessage(e: unknown, fallback = "Something went wrong while processing the file."): string {
  if (e instanceof PdfError) return e.message;
  if (e instanceof Error && /memory|allocation|Array buffer/i.test(e.message)) {
    return "The browser ran out of memory. Try fewer pages, a lower resolution, or close other tabs.";
  }
  return fallback;
}

export function errorCode(e: unknown): string {
  return e instanceof PdfError ? e.code : "UNKNOWN";
}

/* ---------- Bytes, names, blobs ---------- */

export async function readBytes(file: Blob): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

/** True when the "%PDF-" signature appears in the first 1 KB (some files have junk before it). */
export function looksLikePdf(bytes: Uint8Array): boolean {
  const n = Math.min(bytes.length - 4, 1024);
  for (let i = 0; i < n; i++) {
    if (bytes[i] === 0x25 && bytes[i + 1] === 0x50 && bytes[i + 2] === 0x44 && bytes[i + 3] === 0x46 && bytes[i + 4] === 0x2d) return true;
  }
  return false;
}

export function toBlob(bytes: Uint8Array, type = "application/pdf"): Blob {
  return new Blob([bytes as Uint8Array<ArrayBuffer>], { type });
}

/** File name without extension, stripped of characters that are invalid in file names. */
export function baseName(name: string, fallback = "document"): string {
  const b = name
    .replace(/\.[a-z0-9]{1,5}$/i, "")
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return b || fallback;
}

/** Cleans a user-typed output name and makes sure it ends with the extension. */
export function outputName(input: string, ext: string, fallback: string): string {
  const b = baseName(input.trim().replace(new RegExp(`\\.${ext}$`, "i"), "") + ".x", fallback);
  return `${b}.${ext}`;
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${performance.now().toString(36)}`;
}

/* ---------- Page ranges ---------- */

/**
 * Parses "1-3, 5, 8-" into groups of 0-based page indexes. "8-" means page 8 to the end,
 * "-3" means pages 1 to 3. Reversed ranges ("5-3") are allowed and keep their order.
 */
export function parseRanges(input: string, pageCount: number): { groups: number[][]; error?: string } {
  const parts = input
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!parts.length) return { groups: [], error: "Enter at least one page number or range, for example 1-3, 5." };
  const groups: number[][] = [];
  for (const part of parts) {
    const single = /^(\d+)$/.exec(part);
    const range = /^(\d*)\s*(?:-|–|—|to)\s*(\d*)$/i.exec(part);
    if (!single && !(range && (range[1] || range[2]))) {
      return { groups: [], error: `“${part}” isn't a page number or range. Use numbers like 2 or 4-7.` };
    }
    const a = single ? Number(single[1]) : range?.[1] ? Number(range[1]) : 1;
    const b = single ? a : range?.[2] ? Number(range[2]) : pageCount;
    for (const n of [a, b]) {
      if (n < 1 || n > pageCount) {
        return { groups: [], error: `Page ${n} doesn't exist. This PDF has ${pageCount} page${pageCount === 1 ? "" : "s"}.` };
      }
    }
    const g: number[] = [];
    if (a <= b) for (let i = a; i <= b; i++) g.push(i - 1);
    else for (let i = a; i >= b; i--) g.push(i - 1);
    groups.push(g);
  }
  return { groups };
}

/** Human label for a group of 0-based page indexes: "1-3", "5", "2, 4, 9". */
export function rangeLabel(pages: number[]): string {
  if (!pages.length) return "";
  const out: string[] = [];
  let start = pages[0];
  let prev = pages[0];
  for (let i = 1; i <= pages.length; i++) {
    const p = pages[i];
    if (p === prev + 1) {
      prev = p;
      continue;
    }
    out.push(start === prev ? `${start + 1}` : `${start + 1}-${prev + 1}`);
    start = prev = p;
  }
  return out.join(", ");
}

/* ---------- Library loaders ---------- */

let pdfLibP: Promise<typeof import("pdf-lib")> | null = null;
export function loadPdfLib() {
  pdfLibP ??= import("pdf-lib").catch((e) => {
    pdfLibP = null;
    throw e;
  });
  return pdfLibP;
}

const PDFJS_BASE = "/vendor/pdfjs/";
let pdfjsP: Promise<typeof import("pdfjs-dist")> | null = null;
export function loadPdfjs() {
  pdfjsP ??= import("pdfjs-dist")
    .then((m) => {
      m.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE}pdf.worker.min.mjs`;
      return m;
    })
    .catch((e) => {
      pdfjsP = null;
      throw e;
    });
  return pdfjsP;
}

export async function zipFiles(files: { name: string; data: Uint8Array; store?: boolean }[]): Promise<Blob> {
  const { zip, zipSync } = await import("fflate");
  const entries: Record<string, [Uint8Array, { level: 0 | 6 }]> = {};
  const used = new Set<string>();
  for (const f of files) {
    let name = f.name;
    let i = 2;
    while (used.has(name.toLowerCase())) name = f.name.replace(/(\.[^.]+)?$/, `-${i++}$1`);
    used.add(name.toLowerCase());
    entries[name] = [f.data, { level: f.store ? 0 : 6 }];
  }
  const out = await new Promise<Uint8Array>((resolve, reject) => {
    try {
      zip(entries, (err, data) => (err ? reject(err) : resolve(data)));
    } catch {
      try {
        resolve(zipSync(entries));
      } catch (e) {
        reject(e);
      }
    }
  });
  return toBlob(out, "application/zip");
}

/* ---------- Opening PDFs ---------- */

/** Loads a PDF with pdf-lib for editing. Rejects non-PDFs, encrypted and unreadable files with clear messages. */
export async function openForEdit(bytes: Uint8Array, name: string): Promise<PDFDocument> {
  if (!bytes.length) throw new PdfError("EMPTY", `${name} is empty (0 bytes).`);
  if (!looksLikePdf(bytes)) throw new PdfError("NOT_PDF", `${name} isn't a PDF file. Choose a file that ends in .pdf and opens in a PDF viewer.`);
  const { PDFDocument, EncryptedPDFError } = await loadPdfLib();
  try {
    const doc = await PDFDocument.load(bytes, { updateMetadata: false });
    if (doc.getPageCount() === 0) throw new PdfError("CORRUPT", `${name} has no pages that can be read.`);
    return doc;
  } catch (e) {
    if (e instanceof PdfError) throw e;
    if (e instanceof EncryptedPDFError || (e instanceof Error && /encrypt/i.test(e.message))) {
      throw new PdfError(
        "ENCRYPTED",
        `${name} is password-protected or encrypted. Remove the protection first (open it with the password and save or print a copy without it), then add it again.`,
      );
    }
    throw new PdfError("CORRUPT", `${name} couldn't be read. The file may be damaged or incomplete; try opening and re-saving it in a PDF viewer.`);
  }
}

/** Opens a PDF with PDF.js for rendering. Owner-restricted PDFs without an open password work. */
export async function openForRender(bytes: Uint8Array, name: string): Promise<PDFDocumentProxy> {
  if (!bytes.length) throw new PdfError("EMPTY", `${name} is empty (0 bytes).`);
  if (!looksLikePdf(bytes)) throw new PdfError("NOT_PDF", `${name} isn't a PDF file. Choose a file that ends in .pdf and opens in a PDF viewer.`);
  const pdfjs = await loadPdfjs();
  // PDF.js transfers the buffer to its worker, so give it a copy.
  const task = pdfjs.getDocument({
    data: bytes.slice(),
    cMapUrl: `${PDFJS_BASE}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${PDFJS_BASE}standard_fonts/`,
    wasmUrl: `${PDFJS_BASE}wasm/`,
    iccUrl: `${PDFJS_BASE}iccs/`,
    isEvalSupported: false,
    enableXfa: false,
  });
  let needsPassword = false;
  task.onPassword = () => {
    needsPassword = true;
    void task.destroy();
  };
  try {
    return await task.promise;
  } catch (e) {
    const n = (e as { name?: string })?.name ?? "";
    if (needsPassword || n === "PasswordException") {
      throw new PdfError("ENCRYPTED", `${name} needs a password to open. Remove the password in a PDF viewer first, then try again.`);
    }
    throw new PdfError("CORRUPT", `${name} couldn't be read. The file may be damaged or incomplete.`);
  }
}

/* ---------- Rendering ---------- */

export interface RenderedPage {
  canvas: HTMLCanvasElement;
  /** Page size in PDF points as displayed (rotation applied). */
  widthPt: number;
  heightPt: number;
  /** Actual scale used (may be lower than requested if the canvas would be too large). */
  scale: number;
}

/** Largest canvas area we allow (Safari on iOS refuses canvases above ~16.7 megapixels). */
export const MAX_CANVAS_PIXELS = 16_000_000;

/**
 * Renders one page (1-based) to a new canvas on a white background, with annotations and
 * form-field appearances included. `extraRotation` is added to the page's own rotation.
 */
export async function renderPage(
  doc: PDFDocumentProxy,
  pageNumber: number,
  opts: { scale?: number; width?: number; extraRotation?: number; maxPixels?: number } = {},
): Promise<RenderedPage> {
  const pdfjs = await loadPdfjs();
  const page = await doc.getPage(pageNumber);
  try {
    const rotation = (((page.rotate + (opts.extraRotation ?? 0)) % 360) + 360) % 360;
    const base = page.getViewport({ scale: 1, rotation });
    let scale = opts.width ? opts.width / base.width : (opts.scale ?? 1);
    const maxPx = opts.maxPixels ?? MAX_CANVAS_PIXELS;
    if (base.width * base.height * scale * scale > maxPx) scale = Math.sqrt(maxPx / (base.width * base.height));
    const viewport = page.getViewport({ scale, rotation });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new PdfError("UNSUPPORTED", "Your browser couldn't create a drawing canvas.");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: ctx, viewport, annotationMode: pdfjs.AnnotationMode.ENABLE, intent: "print" }).promise;
    return { canvas, widthPt: base.width, heightPt: base.height, scale };
  } finally {
    page.cleanup();
  }
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: "image/jpeg" | "image/png", quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new PdfError("UNSUPPORTED", "The browser couldn't encode the image."))), type, quality),
  );
}

/** Frees a canvas's pixel memory immediately (Safari keeps it until GC otherwise). */
export function releaseCanvas(c: HTMLCanvasElement) {
  c.width = 0;
  c.height = 0;
}

/** Converts a canvas to greyscale in place (luma, Rec. 601 weights). */
export function greyscaleCanvas(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const y = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    d[i] = d[i + 1] = d[i + 2] = y;
  }
  ctx.putImageData(img, 0, 0);
}

/** Yields to the browser so progress updates paint between heavy steps. */
export function nextFrame(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
}
