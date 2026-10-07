/* File packaging: ZIP (fflate, lazily loaded), ICO container, unique names. Pure except for Blob. */

export interface NamedBlob {
  name: string;
  blob: Blob;
}

/** Make file names unique inside one ZIP: photo.jpg, photo-2.jpg, photo-3.jpg … */
export function uniqueNames<T extends { name: string }>(files: T[]): T[] {
  const used = new Map<string, number>();
  return files.map((f) => {
    const key = f.name.toLowerCase();
    const n = used.get(key) ?? 0;
    used.set(key, n + 1);
    if (!n) return f;
    const dot = f.name.lastIndexOf(".");
    const name = dot > 0 ? `${f.name.slice(0, dot)}-${n + 1}${f.name.slice(dot)}` : `${f.name}-${n + 1}`;
    return { ...f, name };
  });
}

/** Build a ZIP. Images are already compressed, so they are stored (level 0); text files are deflated. */
export async function zipFiles(files: NamedBlob[]): Promise<Blob> {
  const { zipSync } = await import("fflate");
  const entries: Record<string, [Uint8Array, { level: 0 | 6 }]> = {};
  for (const f of uniqueNames(files)) {
    const bytes = new Uint8Array(await f.blob.arrayBuffer());
    const text = /\.(txt|html|json|webmanifest|svg|xml)$/i.test(f.name);
    entries[f.name] = [bytes, { level: text ? 6 : 0 }];
  }
  const out = zipSync(entries);
  return new Blob([out as BlobPart], { type: "application/zip" });
}

/**
 * ICO container with PNG-compressed entries (supported by every current browser and by Windows Vista and later).
 * Each entry: 16-byte directory record; width/height 0 means 256.
 */
export function buildIco(images: { size: number; png: Uint8Array }[]): Uint8Array {
  const sorted = [...images].sort((a, b) => a.size - b.size);
  const headerLen = 6 + 16 * sorted.length;
  const total = headerLen + sorted.reduce((n, i) => n + i.png.length, 0);
  const out = new Uint8Array(total);
  const v = new DataView(out.buffer);
  v.setUint16(0, 0, true); // reserved
  v.setUint16(2, 1, true); // type 1 = icon
  v.setUint16(4, sorted.length, true);
  let offset = headerLen;
  sorted.forEach((img, i) => {
    const e = 6 + i * 16;
    const s = img.size >= 256 ? 0 : img.size;
    v.setUint8(e, s); // width
    v.setUint8(e + 1, s); // height
    v.setUint8(e + 2, 0); // palette colors
    v.setUint8(e + 3, 0); // reserved
    v.setUint16(e + 4, 1, true); // color planes
    v.setUint16(e + 6, 32, true); // bits per pixel
    v.setUint32(e + 8, img.png.length, true);
    v.setUint32(e + 12, offset, true);
    out.set(img.png, offset);
    offset += img.png.length;
  });
  return out;
}
