/* Canvas helpers: OffscreenCanvas where available, progressive downscaling, encoding with type checks. */

export class ImageError extends Error {
  code: string;
  link?: { href: string; anchor: string };
  constructor(code: string, message: string, link?: { href: string; anchor: string }) {
    super(message);
    this.code = code;
    this.link = link;
  }
}

export function toImageError(e: unknown, fallback = "Something went wrong while processing this image."): ImageError {
  if (e instanceof ImageError) return e;
  if (e instanceof DOMException && e.name === "AbortError") return new ImageError("CANCELLED", "Cancelled.");
  return new ImageError("PROCESSING", fallback);
}

export type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;
export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type OutFormat = "jpeg" | "png" | "webp";
export const MIME: Record<OutFormat, string> = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
export const EXT: Record<OutFormat, string> = { jpeg: "jpg", png: "png", webp: "webp" };
export const FORMAT_LABEL: Record<OutFormat, string> = { jpeg: "JPG", png: "PNG", webp: "WebP" };

/** Largest canvas area we render. iOS Safari refuses canvases above 16.7 million pixels. */
export function maxCanvasPixels(): number {
  if (typeof navigator !== "undefined") {
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    if (ios) return 16_777_216;
  }
  return 50_000_000;
}

/** Scale (w, h) down so that it fits the canvas pixel limit. Returns the same size when it already fits. */
export function fitPixelLimit(w: number, h: number, limit = maxCanvasPixels()): { w: number; h: number; scaled: boolean } {
  if (w * h <= limit) return { w, h, scaled: false };
  const s = Math.sqrt(limit / (w * h));
  return { w: Math.max(1, Math.floor(w * s)), h: Math.max(1, Math.floor(h * s)), scaled: true };
}

export function createCanvas(w: number, h: number): AnyCanvas {
  const W = Math.max(1, Math.round(w));
  const H = Math.max(1, Math.round(h));
  if (typeof OffscreenCanvas !== "undefined") {
    try {
      return new OffscreenCanvas(W, H);
    } catch {
      /* fall through */
    }
  }
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  return c;
}

export function context(c: AnyCanvas, opts?: CanvasRenderingContext2DSettings): Ctx2D {
  const x = c.getContext("2d", opts) as Ctx2D | null;
  if (!x) throw new ImageError("CANVAS", "Your browser ran out of memory for an image this large. Try a smaller image or close other tabs.");
  return x;
}

/**
 * Draw `src` (optionally a crop of it) into a new w×h canvas. Large reductions are done in halving steps,
 * which avoids the aliasing some browsers produce when shrinking by more than 2× in one pass.
 */
export function drawScaled(
  src: CanvasImageSource,
  srcW: number,
  srcH: number,
  dw: number,
  dh: number,
  opts: { crop?: Rect; background?: string | null; grayscale?: boolean } = {},
): AnyCanvas {
  const W = Math.max(1, Math.round(dw));
  const H = Math.max(1, Math.round(dh));
  const crop = opts.crop ?? { x: 0, y: 0, w: srcW, h: srcH };
  let cur: CanvasImageSource = src;
  let { x: cx, y: cy, w: cw, h: ch } = crop;
  while (cw > W * 2 && ch > H * 2) {
    const nw = Math.max(W, Math.round(cw / 2));
    const nh = Math.max(H, Math.round(ch / 2));
    const t = createCanvas(nw, nh);
    const tx = context(t);
    tx.imageSmoothingEnabled = true;
    tx.imageSmoothingQuality = "high";
    tx.drawImage(cur, cx, cy, cw, ch, 0, 0, nw, nh);
    cur = t;
    cx = 0;
    cy = 0;
    cw = nw;
    ch = nh;
  }
  const out = createCanvas(W, H);
  const x = context(out);
  if (opts.background) {
    x.fillStyle = opts.background;
    x.fillRect(0, 0, W, H);
  }
  x.imageSmoothingEnabled = true;
  x.imageSmoothingQuality = "high";
  x.drawImage(cur, cx, cy, cw, ch, 0, 0, W, H);
  if (opts.grayscale) toGrayscale(out);
  return out;
}

export function toGrayscale(c: AnyCanvas) {
  const x = context(c);
  const d = x.getImageData(0, 0, c.width, c.height);
  const p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    const l = Math.round(0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]);
    p[i] = p[i + 1] = p[i + 2] = l;
  }
  x.putImageData(d, 0, 0);
}

export function imageDataOf(c: AnyCanvas): ImageData {
  return context(c).getImageData(0, 0, c.width, c.height);
}

/** True when any pixel is not fully opaque. Checks a copy of at most ~2 megapixels. */
export function hasTransparency(src: CanvasImageSource, w: number, h: number): boolean {
  const s = Math.min(1, Math.sqrt(2_000_000 / (w * h)));
  const c = createCanvas(Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s)));
  const x = context(c, { willReadFrequently: true });
  x.drawImage(src, 0, 0, c.width, c.height);
  const p = x.getImageData(0, 0, c.width, c.height).data;
  for (let i = 3; i < p.length; i += 4) if (p[i] < 255) return true;
  return false;
}

export async function canvasToBlob(c: AnyCanvas, type: string, quality?: number): Promise<Blob> {
  let blob: Blob | null;
  if ("convertToBlob" in c) {
    blob = await c.convertToBlob({ type, quality });
  } else {
    blob = await new Promise<Blob | null>((res) => (c as HTMLCanvasElement).toBlob(res, type, quality));
  }
  if (!blob || !blob.size) throw new ImageError("ENCODE", "Your browser couldn't save this image. It may be too large for this device.");
  if (blob.type !== type) {
    const label = type === "image/webp" ? "WebP" : type === "image/avif" ? "AVIF" : type.replace("image/", "").toUpperCase();
    throw new ImageError("ENCODE_UNSUPPORTED", `This browser can't save ${label} files. Choose JPG or PNG, or use a current version of Chrome, Edge or Firefox.`);
  }
  return blob;
}

const encodeSupport = new Map<string, Promise<boolean>>();
/** Whether the browser's canvas can encode this MIME type (Safari can't write WebP, for example). */
export function canEncode(type: string): Promise<boolean> {
  if (!encodeSupport.has(type)) {
    encodeSupport.set(
      type,
      canvasToBlob(createCanvas(2, 2), type, 0.8).then(
        () => true,
        () => false,
      ),
    );
  }
  return encodeSupport.get(type)!;
}

/** Let the browser paint and handle input between heavy steps (keeps INP low). */
export function yieldToMain(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

export function bytesToBlob(u8: Uint8Array | ArrayBuffer, type: string): Blob {
  return new Blob([u8 as BlobPart], { type });
}

/** Fit (w, h) inside a box, never enlarging unless `enlarge` is true. */
export function fitInside(w: number, h: number, maxW?: number | null, maxH?: number | null, enlarge = false) {
  let s = Infinity;
  if (maxW && maxW > 0) s = Math.min(s, maxW / w);
  if (maxH && maxH > 0) s = Math.min(s, maxH / h);
  if (!Number.isFinite(s)) s = 1;
  if (!enlarge) s = Math.min(1, s);
  return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)) };
}

export function centerCropToAspect(w: number, h: number, aspect: number): Rect {
  if (w / h > aspect) {
    const cw = h * aspect;
    return { x: (w - cw) / 2, y: 0, w: cw, h };
  }
  const ch = w / aspect;
  return { x: 0, y: (h - ch) / 2, w, h: ch };
}
