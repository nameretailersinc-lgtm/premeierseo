/* Detect an image format from its first bytes (magic numbers), not from the file name or MIME type. */

export type ImageKind = "jpeg" | "png" | "webp" | "gif" | "avif" | "heic" | "svg" | "bmp" | "ico" | "tiff" | "unknown";

export const KIND_LABEL: Record<ImageKind, string> = {
  jpeg: "JPG",
  png: "PNG",
  webp: "WebP",
  gif: "GIF",
  avif: "AVIF",
  heic: "HEIC",
  svg: "SVG",
  bmp: "BMP",
  ico: "ICO",
  tiff: "TIFF",
  unknown: "unknown",
};

function ascii(b: Uint8Array, start: number, len: number): string {
  let s = "";
  for (let i = start; i < start + len && i < b.length; i++) s += String.fromCharCode(b[i]);
  return s;
}

function u32(b: Uint8Array, o: number): number {
  return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
}

const HEIF_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "mif1", "msf1"]);

export function sniffBytes(b: Uint8Array): ImageKind {
  if (b.length < 4) return "unknown";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  if (ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") return "webp";
  if (ascii(b, 0, 4) === "GIF8") return "gif";
  if (ascii(b, 4, 4) === "ftyp") {
    const size = Math.min(u32(b, 0), b.length);
    const brands = [ascii(b, 8, 4)];
    for (let o = 16; o + 4 <= size; o += 4) brands.push(ascii(b, o, 4));
    if (brands.some((x) => x === "avif" || x === "avis")) return "avif";
    if (brands.some((x) => HEIF_BRANDS.has(x))) return "heic";
    return "unknown";
  }
  if (b[0] === 0 && b[1] === 0 && b[2] === 1 && b[3] === 0) return "ico";
  if ((b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a && b[3] === 0) || (b[0] === 0x4d && b[1] === 0x4d && b[2] === 0 && b[3] === 0x2a)) return "tiff";
  if (b[0] === 0x42 && b[1] === 0x4d && b.length > 26) return "bmp";
  const text = ascii(b, b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf ? 3 : 0, b.length).trimStart();
  if (text.startsWith("<") && /<svg[\s>]/i.test(text)) return "svg";
  return "unknown";
}

export async function sniffFile(file: Blob & { name?: string }): Promise<ImageKind> {
  const head = new Uint8Array(await file.slice(0, 4096).arrayBuffer());
  const kind = sniffBytes(head);
  if (kind === "unknown" && (file.type === "image/svg+xml" || /\.svg$/i.test(file.name ?? ""))) return "svg";
  return kind;
}

export function baseName(name: string): string {
  const n = name.replace(/\.[a-z0-9]{2,5}$/i, "").replace(/[^\w\-. ]+/g, "").trim();
  return n || "image";
}
