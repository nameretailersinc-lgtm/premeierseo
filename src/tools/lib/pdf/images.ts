/*
 * Images → PDF. JPEG and PNG are embedded as they are (no re-encoding, so no quality loss);
 * other formats the browser can decode (WebP, GIF, BMP, AVIF) are converted to JPEG or PNG on a
 * canvas first. JPEG EXIF orientation is honoured so phone photos are not sideways.
 */
import { type CancelToken, PdfError, canvasToBlob, checkCancelled, loadPdfLib, nextFrame, releaseCanvas } from "./core";

export type ImageKind = "jpeg" | "png" | "webp" | "gif" | "bmp" | "avif" | "heic" | "tiff" | "unknown";

/** Detects the image format from its first bytes (not from the file name). */
export function sniffImage(b: Uint8Array): ImageKind {
  const s = (o: number, str: string) => [...str].every((c, i) => b[o + i] === c.charCodeAt(0));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b[0] === 0x89 && s(1, "PNG")) return "png";
  if (s(0, "RIFF") && s(8, "WEBP")) return "webp";
  if (s(0, "GIF8")) return "gif";
  if (s(0, "BM")) return "bmp";
  if (s(0, "II*\u0000") || s(0, "MM\u0000*")) return "tiff";
  if (s(4, "ftyp")) {
    const brand = String.fromCharCode(...b.slice(8, 12));
    if (/^(avif|avis)$/.test(brand)) return "avif";
    if (/^(heic|heix|hevc|hevx|heim|heis|mif1|msf1)$/.test(brand)) return "heic";
  }
  return "unknown";
}

/**
 * Reads the EXIF orientation (1–8) from a JPEG, or 1 if there is none.
 * 3 = upside down, 6 = needs 90° clockwise, 8 = needs 90° counter-clockwise; 2, 4, 5, 7 are mirrored.
 */
export function jpegOrientation(b: Uint8Array): number {
  let i = 2;
  while (i + 4 < b.length) {
    if (b[i] !== 0xff) return 1;
    const marker = b[i + 1];
    const len = (b[i + 2] << 8) | b[i + 3];
    if (marker === 0xe1 && b[i + 4] === 0x45 && b[i + 5] === 0x78 && b[i + 6] === 0x69 && b[i + 7] === 0x66) {
      const t = i + 10; // TIFF header
      const le = b[t] === 0x49;
      const u16 = (o: number) => (le ? b[o] | (b[o + 1] << 8) : (b[o] << 8) | b[o + 1]);
      const u32 = (o: number) => (le ? (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0 : ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0);
      const ifd = t + u32(t + 4);
      const n = u16(ifd);
      for (let k = 0; k < n; k++) {
        const e = ifd + 2 + k * 12;
        if (e + 10 > b.length) break;
        if (u16(e) === 0x0112) {
          const v = u16(e + 8);
          return v >= 1 && v <= 8 ? v : 1;
        }
      }
      return 1;
    }
    if (marker === 0xda || marker === 0xd9) return 1; // start of scan: no EXIF before image data
    i += 2 + len;
  }
  return 1;
}

/** Pixel size from a PNG IHDR or JPEG SOF segment, without decoding. */
export function imageSize(b: Uint8Array, kind: ImageKind): { width: number; height: number } | null {
  if (kind === "png" && b.length > 24) {
    const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
    return { width: v.getUint32(16), height: v.getUint32(20) };
  }
  if (kind === "jpeg") {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return null;
      const m = b[i + 1];
      const len = (b[i + 2] << 8) | b[i + 3];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        return { height: (b[i + 5] << 8) | b[i + 6], width: (b[i + 7] << 8) | b[i + 8] };
      }
      i += 2 + len;
    }
  }
  return null;
}

export interface PreparedImage {
  /** Bytes to embed. */
  bytes: Uint8Array;
  format: "jpeg" | "png";
  /** Pixel size of the embedded image (before orientation). */
  width: number;
  height: number;
  /** Clockwise quarter turns needed to display it upright (0–3). */
  turns: number;
}

const ORIENT_TURNS: Record<number, number> = { 1: 0, 3: 2, 6: 1, 8: 3 };

async function viaCanvas(blob: Blob, format: "jpeg" | "png", quality: number, maxEdge = Infinity): Promise<PreparedImage> {
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(blob, { imageOrientation: "from-image" } as ImageBitmapOptions);
  } catch {
    throw new PdfError("UNSUPPORTED", "This browser can't read the image.");
  }
  const k = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * k));
  const h = Math.max(1, Math.round(bmp.height * k));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) throw new PdfError("UNSUPPORTED", "Your browser couldn't create a drawing canvas.");
  if (format === "jpeg") {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const out = await canvasToBlob(c, format === "jpeg" ? "image/jpeg" : "image/png", quality);
  releaseCanvas(c);
  return { bytes: new Uint8Array(await out.arrayBuffer()), format, width: w, height: h, turns: 0 };
}

/**
 * Turns an image file into something pdf-lib can embed. With `reduce`, large images are scaled
 * so the long edge is at most 2000 px and saved as JPEG (quality 0.8), which keeps the PDF small.
 */
export async function prepareImage(file: Blob, name: string, opts: { reduce: boolean }): Promise<PreparedImage> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (kind === "heic") {
    throw new PdfError("UNSUPPORTED", `${name} is a HEIC photo, which most browsers can't open. Convert it to JPG first, then add it again.`);
  }
  if (kind === "tiff") throw new PdfError("UNSUPPORTED", `${name} is a TIFF image, which browsers can't open. Save it as JPG or PNG first.`);
  if (kind === "unknown") throw new PdfError("UNSUPPORTED", `${name} isn't an image this tool can read. Use JPG, PNG, WebP or GIF.`);

  if (opts.reduce) {
    const size = imageSize(bytes, kind);
    const big = !size || Math.max(size.width, size.height) > 2000 || bytes.length > 600_000;
    if (big || (kind !== "jpeg" && kind !== "png")) {
      try {
        const r = await viaCanvas(new Blob([bytes as Uint8Array<ArrayBuffer>]), "jpeg", 0.8, 2000);
        // Only use the reduced version if it is actually smaller.
        if (r.bytes.length < bytes.length || (kind !== "jpeg" && kind !== "png")) return r;
      } catch (e) {
        if (kind !== "jpeg" && kind !== "png") throw new PdfError("UNSUPPORTED", `${name} couldn't be read. ${(e as Error).message}`);
      }
    }
  }

  if (kind === "jpeg") {
    const size = imageSize(bytes, "jpeg");
    const o = jpegOrientation(bytes);
    if (size && o in ORIENT_TURNS) return { bytes, format: "jpeg", ...size, turns: ORIENT_TURNS[o] };
    // Mirrored orientations or unreadable headers: let the browser apply EXIF and re-encode.
    return viaCanvas(new Blob([bytes as Uint8Array<ArrayBuffer>]), "jpeg", 0.92);
  }
  if (kind === "png") {
    const size = imageSize(bytes, "png");
    if (size) return { bytes, format: "png", ...size, turns: 0 };
  }
  // WebP, GIF (first frame), BMP, AVIF: decode in the browser. PNG keeps transparency.
  try {
    return await viaCanvas(new Blob([bytes as Uint8Array<ArrayBuffer>]), kind === "gif" || kind === "webp" ? "png" : "jpeg", 0.92);
  } catch {
    throw new PdfError("UNSUPPORTED", `${name} couldn't be read by this browser. Save it as JPG or PNG and try again.`);
  }
}

/* ---------- Layout ---------- */

export type PageSizeName = "a4" | "letter" | "fit";
export type Orientation = "auto" | "portrait" | "landscape";

export const PAGE_SIZES: Record<Exclude<PageSizeName, "fit">, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
};

export interface LayoutOptions {
  size: PageSizeName;
  orientation: Orientation;
  /** Margin in points (72 pt = 1 inch). */
  margin: number;
}

/**
 * Where an image of displayed size (w × h px) goes: page size and the drawn box, in points.
 * With "fit", the page matches the image at 96 px per inch (CSS pixels), plus the margin.
 */
export function layoutImage(w: number, h: number, o: LayoutOptions) {
  if (o.size === "fit") {
    const iw = w * 0.75;
    const ih = h * 0.75;
    return { pageW: iw + 2 * o.margin, pageH: ih + 2 * o.margin, x: o.margin, y: o.margin, w: iw, h: ih };
  }
  let [pw, ph] = PAGE_SIZES[o.size];
  const landscape = o.orientation === "landscape" || (o.orientation === "auto" && w > h);
  if (landscape) [pw, ph] = [ph, pw];
  const bw = Math.max(1, pw - 2 * o.margin);
  const bh = Math.max(1, ph - 2 * o.margin);
  const k = Math.min(bw / w, bh / h);
  const dw = w * k;
  const dh = h * k;
  return { pageW: pw, pageH: ph, x: (pw - dw) / 2, y: (ph - dh) / 2, w: dw, h: dh };
}

/** Builds one PDF with one image per page. */
export async function imagesToPdf(
  images: PreparedImage[],
  o: LayoutOptions,
  token?: CancelToken,
  onProgress?: (done: number, total: number) => void,
): Promise<Uint8Array> {
  const { PDFDocument, degrees } = await loadPdfLib();
  const doc = await PDFDocument.create();
  doc.setProducer("premierseoservices.com JPG to PDF");
  doc.setCreator("premierseoservices.com");
  for (let i = 0; i < images.length; i++) {
    checkCancelled(token);
    onProgress?.(i, images.length);
    if (i % 3 === 0) await nextFrame();
    const im = images[i];
    const emb = im.format === "jpeg" ? await doc.embedJpg(im.bytes) : await doc.embedPng(im.bytes);
    const sideways = im.turns % 2 === 1;
    const dispW = sideways ? im.height : im.width;
    const dispH = sideways ? im.width : im.height;
    const L = layoutImage(dispW, dispH, o);
    const page = doc.addPage([L.pageW, L.pageH]);
    // pdf-lib rotates around (x, y): pick the anchor so the turned image fills the box.
    if (im.turns === 0) page.drawImage(emb, { x: L.x, y: L.y, width: L.w, height: L.h });
    else if (im.turns === 1) page.drawImage(emb, { x: L.x, y: L.y + L.h, width: L.h, height: L.w, rotate: degrees(-90) });
    else if (im.turns === 2) page.drawImage(emb, { x: L.x + L.w, y: L.y + L.h, width: L.w, height: L.h, rotate: degrees(180) });
    else page.drawImage(emb, { x: L.x + L.w, y: L.y, width: L.h, height: L.w, rotate: degrees(90) });
  }
  onProgress?.(images.length, images.length);
  return doc.save({ useObjectStreams: true });
}
