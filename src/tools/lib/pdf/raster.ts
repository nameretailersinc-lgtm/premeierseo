/*
 * Browser-only compression helpers: canvas image re-encoding for "Keep text", page
 * rasterisation for "Smallest size", and the target-size search for the KB presets.
 */
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  type CancelToken,
  canvasToBlob,
  checkCancelled,
  greyscaleCanvas,
  loadPdfLib,
  nextFrame,
  releaseCanvas,
  renderPage,
} from "./core";
import { optimizePdf, type ImageEncoder, type OptimizeReport } from "./compress";

/** Canvas-based encoder: scales images so the long edge is at most maxEdge px and saves JPEG. */
export function canvasEncoder(quality: number, maxEdge: number): ImageEncoder {
  return async (src) => {
    let w = src.width;
    let h = src.height;
    let source: CanvasImageSource;
    let bitmap: ImageBitmap | null = null;
    if (src.kind === "jpeg") {
      try {
        bitmap = await createImageBitmap(new Blob([src.bytes as Uint8Array<ArrayBuffer>], { type: "image/jpeg" }), {
          imageOrientation: "none",
        } as ImageBitmapOptions);
      } catch {
        return null; // CMYK or unusual JPEGs the browser can't decode
      }
      // A size mismatch means the browser applied EXIF rotation or misread the file: leave it alone.
      if (bitmap.width !== w || bitmap.height !== h) {
        bitmap.close();
        return null;
      }
      source = bitmap;
    } else {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const cx = c.getContext("2d");
      if (!cx) return null;
      const img = cx.createImageData(w, h);
      const p = src.pixels;
      const d = img.data;
      for (let i = 0, j = 0; i < w * h; i++, j += src.components) {
        const o = i * 4;
        if (src.components === 3) {
          d[o] = p[j];
          d[o + 1] = p[j + 1];
          d[o + 2] = p[j + 2];
        } else d[o] = d[o + 1] = d[o + 2] = p[j];
        d[o + 3] = 255;
      }
      cx.putImageData(img, 0, 0);
      source = c;
    }
    const k = Math.min(1, maxEdge / Math.max(w, h));
    w = Math.max(1, Math.round(w * k));
    h = Math.max(1, Math.round(h * k));
    const out = document.createElement("canvas");
    out.width = w;
    out.height = h;
    const ox = out.getContext("2d");
    if (!ox) return null;
    ox.fillStyle = "#fff";
    ox.fillRect(0, 0, w, h);
    ox.imageSmoothingQuality = "high";
    ox.drawImage(source, 0, 0, w, h);
    bitmap?.close();
    if (source instanceof HTMLCanvasElement) releaseCanvas(source);
    const blob = await canvasToBlob(out, "image/jpeg", quality);
    releaseCanvas(out);
    return { bytes: new Uint8Array(await blob.arrayBuffer()), width: w, height: h };
  };
}

export const IMAGE_LEVELS = {
  light: { quality: 0.8, maxEdge: 2400, label: "Light" },
  medium: { quality: 0.65, maxEdge: 1600, label: "Medium" },
  strong: { quality: 0.5, maxEdge: 1100, label: "Strong" },
  // Only used when searching for a target size.
  heavy: { quality: 0.42, maxEdge: 800, label: "Heavy" },
  max: { quality: 0.35, maxEdge: 560, label: "Maximum" },
} as const;
export type ImageLevel = keyof typeof IMAGE_LEVELS | "off";

export async function keepTextCompress(
  bytes: Uint8Array,
  name: string,
  level: ImageLevel,
  token?: CancelToken,
  onProgress?: (done: number, total: number) => void,
): Promise<{ bytes: Uint8Array; report: OptimizeReport }> {
  const encoder = level === "off" ? undefined : canvasEncoder(IMAGE_LEVELS[level].quality, IMAGE_LEVELS[level].maxEdge);
  return optimizePdf(bytes, name, { encoder, token, onProgress });
}

/* ---------- Rasterise ---------- */

export interface RasterOptions {
  dpi: number;
  quality: number;
  grey: boolean;
}

export interface RasterPage {
  jpg: Uint8Array;
  widthPt: number;
  heightPt: number;
}

async function renderJpeg(view: PDFDocumentProxy, n: number, dpi: number, grey: boolean, qualities: number[]) {
  const r = await renderPage(view, n, { scale: dpi / 72 });
  if (grey) greyscaleCanvas(r.canvas);
  const out: Uint8Array[] = [];
  for (const q of qualities) out.push(new Uint8Array(await (await canvasToBlob(r.canvas, "image/jpeg", q)).arrayBuffer()));
  releaseCanvas(r.canvas);
  return { jpgs: out, widthPt: r.widthPt, heightPt: r.heightPt, scale: r.scale };
}

/** Builds a PDF whose pages are the given JPEGs, each drawn at the original page size. */
export async function buildImagePdf(pages: RasterPage[]): Promise<Uint8Array> {
  const { PDFDocument } = await loadPdfLib();
  const doc = await PDFDocument.create();
  for (const p of pages) {
    const img = await doc.embedJpg(p.jpg);
    const page = doc.addPage([p.widthPt, p.heightPt]);
    page.drawImage(img, { x: 0, y: 0, width: p.widthPt, height: p.heightPt });
  }
  return doc.save({ useObjectStreams: true });
}

export async function rasterizePdf(
  view: PDFDocumentProxy,
  opts: RasterOptions,
  token: CancelToken,
  onProgress: (label: string, done: number, total: number) => void,
): Promise<{ bytes: Uint8Array; firstPage: Uint8Array; capped: boolean }> {
  const pages: RasterPage[] = [];
  let capped = false;
  for (let i = 1; i <= view.numPages; i++) {
    checkCancelled(token);
    onProgress(`Converting page ${i} of ${view.numPages}`, i - 1, view.numPages);
    await nextFrame();
    const r = await renderJpeg(view, i, opts.dpi, opts.grey, [opts.quality]);
    if (r.scale < opts.dpi / 72 - 0.001) capped = true;
    pages.push({ jpg: r.jpgs[0], widthPt: r.widthPt, heightPt: r.heightPt });
  }
  checkCancelled(token);
  onProgress("Building the PDF…", view.numPages, view.numPages);
  await nextFrame();
  return { bytes: await buildImagePdf(pages), firstPage: pages[0].jpg, capped };
}

/* ---------- Target size ---------- */

/** Resolution/quality steps, best first. Steps below 72 DPI are marked as hard to read. */
const LADDER: { dpi: number; qs: number[] }[] = [
  { dpi: 150, qs: [0.8, 0.65, 0.5] },
  { dpi: 120, qs: [0.7, 0.55, 0.45] },
  { dpi: 100, qs: [0.65, 0.5, 0.4, 0.3] },
  { dpi: 85, qs: [0.55, 0.45, 0.35, 0.25] },
  { dpi: 72, qs: [0.5, 0.4, 0.3, 0.22] },
  { dpi: 60, qs: [0.4, 0.3, 0.2] },
  { dpi: 50, qs: [0.35, 0.25, 0.18] },
  { dpi: 40, qs: [0.3, 0.2, 0.15] },
];
export const READABLE_DPI = 72;

export type TargetResult =
  | { kind: "already"; bytes: Uint8Array }
  | { kind: "kept-text"; bytes: Uint8Array; report: OptimizeReport; level: ImageLevel }
  | { kind: "raster"; bytes: Uint8Array; dpi: number; quality: number; reached: boolean; firstPage: Uint8Array };

/** True when the first pages contain selectable text (so it isn't a pure scan). */
export async function hasSelectableText(view: PDFDocumentProxy, maxPages = 3): Promise<boolean> {
  let chars = 0;
  for (let i = 1; i <= Math.min(view.numPages, maxPages); i++) {
    const page = await view.getPage(i);
    try {
      const tc = await page.getTextContent();
      for (const it of tc.items) chars += "str" in it ? it.str.trim().length : 0;
    } catch {
      /* ignore */
    } finally {
      page.cleanup();
    }
    if (chars > 40) return true;
  }
  return false;
}

export async function compressToTarget(
  src: Uint8Array,
  name: string,
  view: PDFDocumentProxy,
  targetBytes: number,
  grey: boolean,
  token: CancelToken,
  onProgress: (label: string, done: number, total: number) => void,
): Promise<TargetResult> {
  if (src.length <= targetBytes) return { kind: "already", bytes: src };

  // 1. Try keeping text: lossless clean-up, then recompressing photos inside the PDF. Heavy image
  //    reduction is only worth it when there is real text to keep; for scans, rendering pages at a
  //    known resolution (step 2) gives more readable results at the same size.
  const text = await hasSelectableText(view);
  const levels: ImageLevel[] = text ? ["off", "medium", "strong", "heavy", "max"] : ["off", "medium", "strong"];
  for (const level of levels) {
    checkCancelled(token);
    onProgress(level === "off" ? "Trying lossless clean-up…" : `Trying to shrink images inside the PDF (${IMAGE_LEVELS[level].label.toLowerCase()})…`, 0, 1);
    await nextFrame();
    try {
      const r = await keepTextCompress(src, name, level, token);
      if (r.bytes.length <= targetBytes) return { kind: "kept-text", ...r, level };
      if (level === "off" && r.report.imagesFound === 0) break; // no images to shrink
    } catch (e) {
      if ((e as { code?: string })?.code === "CANCELLED") throw e;
      break; // e.g. encrypted for editing: rendering may still work
    }
  }

  // 2. Rasterise, from the sharpest setting down.
  const n = view.numPages;
  const overhead = 1200 + n * 350;
  let best: { pages: RasterPage[]; dpi: number; q: number; size: number } | null = null;
  /** Average bytes per page at the lowest quality of the last step tried, scaled to 72 DPI. */
  let bytesPerPage72: number | null = null;
  const last = LADDER[LADDER.length - 1];

  for (const step of LADDER) {
    checkCancelled(token);
    // Skip steps the last measurement says can't fit (JPEG size grows roughly with pixel count).
    if (bytesPerPage72 !== null && step !== last) {
      const est = bytesPerPage72 * (step.dpi / 72) ** 2 * n;
      if (est > (targetBytes - overhead) * 1.6) continue;
    }
    const perPage: { jpgs: Uint8Array[]; widthPt: number; heightPt: number }[] = [];
    let lowestSum = 0;
    let aborted = false;
    for (let i = 1; i <= n; i++) {
      checkCancelled(token);
      onProgress(`Trying ${step.dpi} DPI: page ${i} of ${n}`, i - 1, n);
      await nextFrame();
      const r = await renderJpeg(view, i, step.dpi, grey, step.qs);
      perPage.push(r);
      lowestSum += r.jpgs[r.jpgs.length - 1].length;
      // Stop early once even the lowest quality at this resolution is over the target.
      if (lowestSum + overhead > targetBytes && step !== last) {
        aborted = true;
        break;
      }
    }
    bytesPerPage72 = lowestSum / perPage.length / (step.dpi / 72) ** 2;
    if (aborted) continue;

    for (let qi = 0; qi < step.qs.length; qi++) {
      const pages = perPage.map((p) => ({ jpg: p.jpgs[qi], widthPt: p.widthPt, heightPt: p.heightPt }));
      const est = pages.reduce((s, p) => s + p.jpg.length, 0) + overhead;
      if (est > targetBytes * 1.05 && qi < step.qs.length - 1) continue;
      checkCancelled(token);
      onProgress("Building the PDF…", n, n);
      await nextFrame();
      const bytes = await buildImagePdf(pages);
      if (!best || bytes.length < best.size) best = { pages, dpi: step.dpi, q: step.qs[qi], size: bytes.length };
      if (bytes.length <= targetBytes) {
        return { kind: "raster", bytes, dpi: step.dpi, quality: step.qs[qi], reached: true, firstPage: pages[0].jpg };
      }
    }
  }
  if (!best) throw new Error("No result");
  const bytes = await buildImagePdf(best.pages);
  return { kind: "raster", bytes, dpi: best.dpi, quality: best.q, reached: false, firstPage: best.pages[0].jpg };
}
