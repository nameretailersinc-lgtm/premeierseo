/* Decode an image file with the browser's own decoder (plus a lazily loaded HEIC decoder where allowed). */

import { ImageError } from "./canvas";
import { KIND_LABEL, sniffFile, type ImageKind } from "./sniff";

export interface Decoded {
  source: CanvasImageSource;
  width: number;
  height: number;
  kind: ImageKind;
  /** Original SVG markup when the file is an SVG. */
  svgText?: string;
  close: () => void;
}

export const HEIC_LINK = { href: "/heic-to-jpg-converter/", anchor: "HEIC to JPG converter" };

function loadImg(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("load"));
    img.src = url;
  });
}

async function bitmapFrom(blob: Blob): Promise<ImageBitmap | null> {
  if (typeof createImageBitmap !== "function") return null;
  try {
    return await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    try {
      return await createImageBitmap(blob);
    } catch {
      return null;
    }
  }
}

async function elementFrom(blob: Blob): Promise<Decoded | null> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImg(url);
    if (!img.naturalWidth) throw new Error("empty");
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, kind: "unknown", close: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
}

const UNIT_PX: Record<string, number> = { px: 1, pt: 96 / 72, pc: 16, in: 96, cm: 96 / 2.54, mm: 96 / 25.4, "": 1 };
function svgLength(v: string | null): number | null {
  if (!v) return null;
  const m = /^\s*([\d.]+)\s*(px|pt|pc|in|cm|mm)?\s*$/i.exec(v);
  if (!m) return null;
  const n = parseFloat(m[1]) * (UNIT_PX[(m[2] ?? "").toLowerCase()] ?? 1);
  return n > 0 ? n : null;
}

/** Intrinsic size of an SVG in CSS pixels (width/height attributes, else the viewBox, else 300×150). */
export function svgSize(text: string): { width: number; height: number; doc: Document | null } {
  let doc: Document | null = null;
  try {
    doc = new DOMParser().parseFromString(text, "image/svg+xml");
    if (doc.getElementsByTagName("parsererror").length) doc = null;
  } catch {
    doc = null;
  }
  const root = doc?.documentElement;
  if (!root || root.nodeName.toLowerCase() !== "svg") return { width: 300, height: 150, doc: null };
  const vb = (root.getAttribute("viewBox") ?? "").split(/[\s,]+/).map(Number);
  const vbw = vb.length === 4 && vb[2] > 0 ? vb[2] : null;
  const vbh = vb.length === 4 && vb[3] > 0 ? vb[3] : null;
  let w = svgLength(root.getAttribute("width"));
  let h = svgLength(root.getAttribute("height"));
  if (w && !h) h = vbw && vbh ? (w * vbh) / vbw : 150;
  if (h && !w) w = vbw && vbh ? (h * vbw) / vbh : 300;
  if (!w || !h) {
    w = vbw ?? 300;
    h = vbh ?? 150;
  }
  return { width: w, height: h, doc };
}

/** Load an SVG as an image element rendered at exactly (w × h), so it rasterizes sharply at any size. */
export async function loadSvgAt(text: string, w?: number, h?: number): Promise<Decoded> {
  const size = svgSize(text);
  if (!size.doc) throw new ImageError("SVG_INVALID", "This SVG file couldn't be read. It may be damaged or not a valid SVG.");
  const W = Math.max(1, Math.round(w ?? size.width));
  const H = Math.max(1, Math.round(h ?? size.height));
  const root = size.doc.documentElement;
  if (!root.getAttribute("viewBox")) root.setAttribute("viewBox", `0 0 ${size.width} ${size.height}`);
  root.setAttribute("width", String(W));
  root.setAttribute("height", String(H));
  if (!root.getAttribute("preserveAspectRatio")) root.setAttribute("preserveAspectRatio", "none");
  const markup = new XMLSerializer().serializeToString(size.doc);
  const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml" }));
  try {
    const img = await loadImg(url);
    return { source: img, width: W, height: H, kind: "svg", svgText: text, close: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    throw new ImageError("SVG_INVALID", "This SVG couldn't be rendered. Check that it opens in your browser on its own.");
  }
}

async function decodeHeic(file: Blob): Promise<Decoded> {
  let out: Blob | Blob[];
  try {
    const heic2any = (await import("heic2any")).default;
    out = await heic2any({ blob: file, toType: "image/png" });
  } catch {
    throw new ImageError(
      "HEIC_DECODE",
      "This HEIC file couldn't be decoded. Some burst, Live Photo or edited HEIC files use features the decoder doesn't support. Try exporting it as JPG from your phone or Photos app.",
    );
  }
  const blob = Array.isArray(out) ? out[0] : out;
  const bmp = await bitmapFrom(blob);
  if (bmp) return { source: bmp, width: bmp.width, height: bmp.height, kind: "heic", close: () => bmp.close() };
  const el = await elementFrom(blob);
  if (el) return { ...el, kind: "heic" };
  throw new ImageError("HEIC_DECODE", "This HEIC file couldn't be decoded.");
}

/**
 * Decode `file`. EXIF orientation is applied. HEIC is decoded natively where the browser can (Safari),
 * otherwise with heic2any when `heic` is true; if not, a friendly error links the HEIC converter.
 */
export async function decodeImage(file: Blob & { name?: string }, opts: { heic?: boolean; kind?: ImageKind } = {}): Promise<Decoded> {
  const kind = opts.kind ?? (await sniffFile(file));
  if (kind === "svg") return loadSvgAt(await file.text());
  const bmp = await bitmapFrom(file);
  if (bmp) return { source: bmp, width: bmp.width, height: bmp.height, kind, close: () => bmp.close() };
  const el = kind === "heic" ? null : await elementFrom(file);
  if (el) return { ...el, kind };
  if (kind === "heic") {
    if (opts.heic) return decodeHeic(file);
    throw new ImageError(
      "HEIC_UNSUPPORTED",
      "This is an HEIC photo (the iPhone camera format), which this browser can't open directly. Convert it to JPG first with our",
      HEIC_LINK,
    );
  }
  if (kind === "avif")
    throw new ImageError(
      "AVIF_UNSUPPORTED",
      "Your browser can't decode AVIF images. Update it, or open this page in a current version of Chrome, Edge, Firefox or Safari.",
    );
  if (kind === "unknown") throw new ImageError("NOT_IMAGE", "This file isn't an image format we can read. Try JPG, PNG, WebP, GIF or AVIF.");
  throw new ImageError("DECODE", `Your browser couldn't read this ${KIND_LABEL[kind]} file. It may be damaged or incomplete.`);
}
