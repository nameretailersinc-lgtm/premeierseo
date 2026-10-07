/* Encoders: canvas JPG/WebP, PNG (lossless or palette-quantized via upng-js), JPEG DPI and EXIF helpers. */

import { bytesToBlob, canvasToBlob, imageDataOf, MIME, type AnyCanvas, type OutFormat } from "./canvas";
import { sharedWorker } from "./worker-client";

/**
 * PNG encode. colors = 0 → lossless (the smaller of the browser's PNG and upng-js's filtered PNG);
 * colors = 2…256 → palette quantization with upng-js, keeping alpha. Runs in a worker when possible.
 */
export async function encodePng(c: AnyCanvas, colors = 0): Promise<Blob> {
  const d = imageDataOf(c);
  const buf = await sharedWorker().png(d.data.buffer as ArrayBuffer, d.width, d.height, colors);
  const upng = bytesToBlob(buf, "image/png");
  if (colors > 0) return upng;
  const native = await canvasToBlob(c, "image/png");
  return native.size <= upng.size ? native : upng;
}

/** Encode a canvas. `quality` is 0–1 (JPG/WebP); `pngColors` applies to PNG. */
export async function encodeCanvas(c: AnyCanvas, format: OutFormat, quality = 0.9, pngColors = 0): Promise<Blob> {
  if (format === "png") return encodePng(c, pngColors);
  return canvasToBlob(c, MIME[format], quality);
}

function ascii(b: Uint8Array, start: number, len: number): string {
  let s = "";
  for (let i = start; i < start + len && i < b.length; i++) s += String.fromCharCode(b[i]);
  return s;
}

/** Write the DPI into the JPEG's JFIF header (inserting one if missing). Pixels are untouched. */
export async function setJpegDpi(blob: Blob, dpi: number): Promise<Blob> {
  const d = Math.max(1, Math.min(65535, Math.round(dpi)));
  const b = new Uint8Array(await blob.arrayBuffer());
  if (b[0] !== 0xff || b[1] !== 0xd8) return blob;
  if (b[2] === 0xff && b[3] === 0xe0 && ascii(b, 6, 5) === "JFIF\0") {
    b[13] = 1;
    b[14] = d >> 8;
    b[15] = d & 255;
    b[16] = d >> 8;
    b[17] = d & 255;
    return bytesToBlob(b, "image/jpeg");
  }
  const app0 = new Uint8Array([0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 1, d >> 8, d & 255, d >> 8, d & 255, 0, 0]);
  return new Blob([b.subarray(0, 2) as BlobPart, app0 as BlobPart, b.subarray(2) as BlobPart], { type: "image/jpeg" });
}

/** Set EXIF Orientation (0x0112) in IFD0 to 1, because pixels have already been rotated upright. */
function resetOrientation(tiff: Uint8Array) {
  const le = tiff[0] === 0x49;
  const r16 = (o: number) => (le ? tiff[o] | (tiff[o + 1] << 8) : (tiff[o] << 8) | tiff[o + 1]);
  const r32 = (o: number) => (le ? (tiff[o] | (tiff[o + 1] << 8) | (tiff[o + 2] << 16) | (tiff[o + 3] << 24)) >>> 0 : ((tiff[o] << 24) | (tiff[o + 1] << 16) | (tiff[o + 2] << 8) | tiff[o + 3]) >>> 0);
  const ifd = r32(4);
  if (ifd + 2 > tiff.length) return;
  const n = r16(ifd);
  for (let i = 0; i < n; i++) {
    const e = ifd + 2 + i * 12;
    if (e + 12 > tiff.length) return;
    if (r16(e) === 0x0112) {
      if (le) {
        tiff[e + 8] = 1;
        tiff[e + 9] = 0;
      } else {
        tiff[e + 8] = 0;
        tiff[e + 9] = 1;
      }
      return;
    }
  }
}

/** Insert a TIFF-format EXIF block into a JPEG as an APP1 segment (after JFIF APP0 if present). */
export async function insertJpegExif(jpeg: Blob, tiffIn: Uint8Array): Promise<Blob> {
  const tiff = new Uint8Array(tiffIn);
  const okHeader = (tiff[0] === 0x49 && tiff[1] === 0x49 && tiff[2] === 0x2a) || (tiff[0] === 0x4d && tiff[1] === 0x4d && tiff[3] === 0x2a);
  if (!okHeader || tiff.length + 8 > 65535) return jpeg;
  resetOrientation(tiff);
  const b = new Uint8Array(await jpeg.arrayBuffer());
  let at = 2;
  if (b[2] === 0xff && b[3] === 0xe0) at = 4 + ((b[4] << 8) | b[5]);
  const len = tiff.length + 8;
  const head = new Uint8Array([0xff, 0xe1, len >> 8, len & 255, 0x45, 0x78, 0x69, 0x66, 0, 0]);
  return new Blob([b.subarray(0, at) as BlobPart, head as BlobPart, tiff as BlobPart, b.subarray(at) as BlobPart], { type: "image/jpeg" });
}

/** Return the TIFF-format EXIF block of a JPEG (APP1 "Exif"), or null. */
export function jpegExif(buf: ArrayBuffer): Uint8Array | null {
  const b = new Uint8Array(buf);
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  let o = 2;
  while (o + 4 <= b.length && b[o] === 0xff) {
    const marker = b[o + 1];
    if (marker === 0xda || marker === 0xd9) break;
    const len = (b[o + 2] << 8) | b[o + 3];
    if (marker === 0xe1 && ascii(b, o + 4, 4) === "Exif" && b[o + 8] === 0 && b[o + 9] === 0) return b.slice(o + 10, o + 2 + len);
    o += 2 + len;
  }
  return null;
}

/* ---------- HEIC (ISO-BMFF) EXIF extraction ---------- */

interface Box {
  type: string;
  start: number;
  body: number;
  end: number;
}

function boxes(b: DataView, start: number, end: number): Box[] {
  const out: Box[] = [];
  let o = start;
  while (o + 8 <= end) {
    let size = b.getUint32(o);
    const type = String.fromCharCode(b.getUint8(o + 4), b.getUint8(o + 5), b.getUint8(o + 6), b.getUint8(o + 7));
    let body = o + 8;
    if (size === 1) {
      size = Number(b.getBigUint64(o + 8));
      body = o + 16;
    } else if (size === 0) size = end - o;
    if (size < 8 || o + size > end) break;
    out.push({ type, start: o, body, end: o + size });
    o += size;
  }
  return out;
}

function readN(v: DataView, o: number, n: number): number {
  if (n === 0) return 0;
  if (n === 4) return v.getUint32(o);
  if (n === 8) return Number(v.getBigUint64(o));
  if (n === 2) return v.getUint16(o);
  return v.getUint8(o);
}

/** Return the TIFF-format EXIF block stored in an HEIC/HEIF file, or null. */
export function heicExif(buf: ArrayBuffer): Uint8Array | null {
  try {
    const v = new DataView(buf);
    const meta = boxes(v, 0, v.byteLength).find((x) => x.type === "meta");
    if (!meta) return null;
    const kids = boxes(v, meta.body + 4, meta.end);
    const iinf = kids.find((x) => x.type === "iinf");
    const iloc = kids.find((x) => x.type === "iloc");
    if (!iinf || !iloc) return null;
    // iinf → infe entries
    const iv = v.getUint8(iinf.body);
    const entriesStart = iinf.body + 4 + (iv === 0 ? 2 : 4);
    let exifId = -1;
    for (const e of boxes(v, entriesStart, iinf.end)) {
      if (e.type !== "infe") continue;
      const ev = v.getUint8(e.body);
      if (ev < 2) continue;
      const id = ev === 2 ? v.getUint16(e.body + 4) : v.getUint32(e.body + 4);
      const typeAt = e.body + 4 + (ev === 2 ? 2 : 4) + 2;
      const t = String.fromCharCode(v.getUint8(typeAt), v.getUint8(typeAt + 1), v.getUint8(typeAt + 2), v.getUint8(typeAt + 3));
      if (t === "Exif") {
        exifId = id;
        break;
      }
    }
    if (exifId < 0) return null;
    // iloc → extents
    const lv = v.getUint8(iloc.body);
    let o = iloc.body + 4;
    const s1 = v.getUint8(o);
    const s2 = v.getUint8(o + 1);
    o += 2;
    const offSize = s1 >> 4;
    const lenSize = s1 & 15;
    const baseSize = s2 >> 4;
    const idxSize = lv === 1 || lv === 2 ? s2 & 15 : 0;
    const count = lv < 2 ? v.getUint16(o) : v.getUint32(o);
    o += lv < 2 ? 2 : 4;
    for (let i = 0; i < count; i++) {
      const id = lv < 2 ? v.getUint16(o) : v.getUint32(o);
      o += lv < 2 ? 2 : 4;
      let method = 0;
      if (lv === 1 || lv === 2) {
        method = v.getUint16(o) & 15;
        o += 2;
      }
      o += 2; // data_reference_index
      const base = readN(v, o, baseSize);
      o += baseSize;
      const ext = v.getUint16(o);
      o += 2;
      const parts: Uint8Array[] = [];
      for (let k = 0; k < ext; k++) {
        o += idxSize;
        const off = readN(v, o, offSize);
        o += offSize;
        const len = readN(v, o, lenSize);
        o += lenSize;
        if (id === exifId && method === 0) parts.push(new Uint8Array(buf, base + off, len));
      }
      if (id === exifId) {
        if (!parts.length) return null;
        const total = parts.reduce((a, p) => a + p.length, 0);
        const all = new Uint8Array(total);
        let p = 0;
        for (const part of parts) {
          all.set(part, p);
          p += part.length;
        }
        const skip = 4 + new DataView(all.buffer).getUint32(0);
        if (skip >= all.length) return null;
        const tiff = all.slice(skip);
        return ascii(tiff, 0, 4) === "Exif" ? tiff.slice(6) : tiff;
      }
    }
    return null;
  } catch {
    return null;
  }
}
