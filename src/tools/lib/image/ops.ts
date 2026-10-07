/* High-level image operations shared by the image widgets (browser only). */

import {
  EXT,
  FORMAT_LABEL,
  ImageError,
  MIME,
  canEncode,
  createCanvas,
  context,
  drawScaled,
  fitPixelLimit,
  hasTransparency,
  yieldToMain,
  type AnyCanvas,
  type OutFormat,
  type Rect,
} from "./canvas";
import { decodeImage, type Decoded } from "./decode";
import { encodeCanvas } from "./encode";
import { baseName, KIND_LABEL, sniffFile, type ImageKind } from "./sniff";
import { searchPngTarget, searchTarget, startDimensions } from "./target";

export interface Opened {
  file: File;
  kind: ImageKind;
  decoded: Decoded;
  /** Natural size (EXIF orientation applied). */
  width: number;
  height: number;
  alpha: boolean;
  /** Set when the image had to be scaled down to fit the browser's canvas limit. */
  limited?: { w: number; h: number };
  close: () => void;
}

/** Decode a file and check transparency. Throws ImageError with a user-facing message. */
export async function openImage(file: File, opts: { heic?: boolean } = {}): Promise<Opened> {
  const kind = await sniffFile(file);
  const decoded = await decodeImage(file, { heic: opts.heic, kind });
  const alpha = kind === "jpeg" ? false : safeAlpha(decoded);
  const fit = fitPixelLimit(decoded.width, decoded.height);
  return {
    file,
    kind,
    decoded,
    width: decoded.width,
    height: decoded.height,
    alpha,
    limited: fit.scaled ? { w: fit.w, h: fit.h } : undefined,
    close: () => decoded.close(),
  };
}

function safeAlpha(d: Decoded): boolean {
  try {
    return hasTransparency(d.source, d.width, d.height);
  } catch {
    return false;
  }
}

export interface RenderOpts {
  crop?: Rect;
  background?: string | null;
  grayscale?: boolean;
}

/** Draw an opened image at w×h (respecting the canvas pixel limit). */
export function render(img: Opened, w: number, h: number, o: RenderOpts = {}): AnyCanvas {
  const fit = fitPixelLimit(w, h);
  return drawScaled(img.decoded.source, img.decoded.width, img.decoded.height, fit.w, fit.h, o);
}

/** Free a canvas's backing memory early (helps on phones with many files). */
export function release(c: AnyCanvas | null | undefined) {
  if (!c) return;
  try {
    c.width = 1;
    c.height = 1;
  } catch {
    /* ignore */
  }
}

/** Format that the user's browser can write. WebP falls back to JPG/PNG (Safari before 17 can't write WebP). */
export async function resolveFormat(f: OutFormat, alpha: boolean): Promise<{ format: OutFormat; note?: string }> {
  if (f !== "webp") return { format: f };
  if (await canEncode("image/webp")) return { format: "webp" };
  const fb: OutFormat = alpha ? "png" : "jpeg";
  return { format: fb, note: `This browser can't save WebP, so the image was saved as ${FORMAT_LABEL[fb]}.` };
}

/** The format an input naturally maps to when the user picks "same as original". */
export function sameFormat(kind: ImageKind, alpha: boolean): OutFormat {
  if (kind === "jpeg") return "jpeg";
  if (kind === "png") return "png";
  if (kind === "webp") return "webp";
  return alpha ? "png" : "jpeg";
}

export function kindMatches(kind: ImageKind, f: OutFormat): boolean {
  return (kind === "jpeg" && f === "jpeg") || (kind === "png" && f === "png") || (kind === "webp" && f === "webp");
}

export function outName(file: File | string, suffix: string, f: OutFormat | "ico" | "svg" | "gif"): string {
  const base = baseName(typeof file === "string" ? file : file.name);
  const ext = f === "ico" || f === "svg" || f === "gif" ? f : EXT[f];
  return `${base}${suffix ? `-${suffix}` : ""}.${ext}`;
}

export { MIME, EXT, FORMAT_LABEL, KIND_LABEL };

/* ---------- Target size ---------- */

export interface TargetOptions {
  targetBytes: number;
  format: OutFormat;
  /** Fill color for transparent areas when saving JPG (PNG and WebP keep transparency). */
  background: string;
  grayscale?: boolean;
  /** Allow the search to reduce dimensions. */
  allowResize: boolean;
  /** Starting (maximum) size. Defaults to the natural size. */
  width?: number;
  height?: number;
  crop?: Rect;
  /** Optional minimum size in bytes (some portals reject files below a minimum). */
  minBytes?: number;
  cancelled?: () => boolean;
}

export interface TargetResult {
  ok: boolean;
  blob: Blob;
  width: number;
  height: number;
  /** JPG/WebP quality (0–1) or PNG colors (0 = lossless). */
  quality: number;
  format: OutFormat;
  resized: boolean;
  belowMin?: boolean;
  attempts: number;
}

/** Find the best-looking image (quality first, then dimensions) that fits under the target. */
export async function compressToTarget(img: Opened, o: TargetOptions): Promise<TargetResult> {
  const W0 = o.width ?? img.width;
  const H0 = o.height ?? img.height;
  const start = o.allowResize ? startDimensions(W0, H0, o.targetBytes) : { w: W0, h: H0 };
  const lim = fitPixelLimit(start.w, start.h);
  // Only JPG needs a fill; PNG and WebP keep transparency.
  const bg = o.format === "jpeg" ? o.background : null;
  let cache: { key: string; c: AnyCanvas } | null = null;
  const canvasAt = (w: number, h: number) => {
    const key = `${w}x${h}`;
    if (cache?.key === key) return cache.c;
    if (cache) release(cache.c);
    cache = { key, c: drawScaled(img.decoded.source, img.decoded.width, img.decoded.height, w, h, { crop: o.crop, background: bg, grayscale: o.grayscale }) };
    return cache.c;
  };
  let attempts = 0;
  try {
    if (o.format === "png") {
      const r = await searchPngTarget({
        width: lim.w,
        height: lim.h,
        targetBytes: o.targetBytes,
        allowResize: o.allowResize,
        cancelled: o.cancelled,
        encode: async (w, h, colors) => {
          attempts++;
          await yieldToMain();
          return encodeCanvas(canvasAt(w, h), "png", 1, colors);
        },
      });
      return { ok: r.ok, blob: r.result, width: r.w, height: r.h, quality: r.colors, format: "png", resized: r.w !== W0 || r.h !== H0, attempts };
    }
    const r = await searchTarget({
      width: lim.w,
      height: lim.h,
      targetBytes: o.targetBytes,
      allowResize: o.allowResize,
      cancelled: o.cancelled,
      encode: async (w, h, q) => {
        attempts++;
        await yieldToMain();
        return encodeCanvas(canvasAt(w, h), o.format, q);
      },
    });
    let blob = r.result;
    let q = r.q;
    let belowMin = false;
    if (o.minBytes && r.ok && blob.size < o.minBytes) {
      // Try the highest quality at the same dimensions; it may land inside the min–max window.
      const hi = await encodeCanvas(canvasAt(r.w, r.h), o.format, 1);
      attempts++;
      if (hi.size <= o.targetBytes && hi.size > blob.size) {
        blob = hi;
        q = 1;
      }
      belowMin = blob.size < o.minBytes;
    }
    return { ok: r.ok, blob, width: r.w, height: r.h, quality: q, format: o.format, resized: r.w !== W0 || r.h !== H0, belowMin, attempts };
  } finally {
    if (cache) release((cache as { c: AnyCanvas }).c);
  }
}

/* ---------- Plain conversion ---------- */

export interface ConvertOptions {
  format: OutFormat;
  /** 0–1 for JPG/WebP. */
  quality?: number;
  /** PNG palette colors, 0 = lossless. */
  pngColors?: number;
  background?: string | null;
  width?: number;
  height?: number;
  crop?: Rect;
  grayscale?: boolean;
}

export async function convert(img: Opened, o: ConvertOptions): Promise<{ blob: Blob; width: number; height: number }> {
  const w = o.width ?? img.width;
  const h = o.height ?? img.height;
  // Only JPG needs a fill for transparent areas; PNG and WebP keep transparency.
  const bg = o.format === "jpeg" ? (o.background ?? "#ffffff") : null;
  const c = render(img, w, h, { crop: o.crop, background: bg, grayscale: o.grayscale });
  try {
    await yieldToMain();
    const blob = await encodeCanvas(c, o.format, o.quality ?? 0.9, o.pngColors ?? 0);
    return { blob, width: c.width, height: c.height };
  } finally {
    release(c);
  }
}

/* ---------- Transforms (crop tool) ---------- */

/** Rotate by a multiple of 90° and/or flip, returning a new canvas. */
export function orient(src: CanvasImageSource, w: number, h: number, rotate: number, flipH: boolean, flipV: boolean): AnyCanvas {
  const r = ((rotate % 360) + 360) % 360;
  const swap = r === 90 || r === 270;
  const c = createCanvas(swap ? h : w, swap ? w : h);
  const x = context(c);
  x.translate(c.width / 2, c.height / 2);
  x.rotate((r * Math.PI) / 180);
  x.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  x.drawImage(src, -w / 2, -h / 2, w, h);
  return c;
}

/** Make everything outside the inscribed ellipse transparent. */
export function circleMask(c: AnyCanvas) {
  const x = context(c);
  x.globalCompositeOperation = "destination-in";
  x.beginPath();
  x.ellipse(c.width / 2, c.height / 2, c.width / 2, c.height / 2, 0, 0, Math.PI * 2);
  x.closePath();
  x.fill();
  x.globalCompositeOperation = "source-over";
}

/** Decode a File's natural dimensions without keeping it open. */
export async function probe(file: File, heic = true): Promise<{ width: number; height: number; kind: ImageKind }> {
  const img = await openImage(file, { heic });
  img.close();
  return { width: img.width, height: img.height, kind: img.kind };
}

export function isImageError(e: unknown): e is ImageError {
  return e instanceof ImageError;
}
