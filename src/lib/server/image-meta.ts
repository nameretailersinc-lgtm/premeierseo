import "server-only";

/** Sniff an uploaded image by its magic bytes and read its pixel size (no native deps). */
export function sniffImage(b: Buffer): { ext: "jpg" | "png" | "webp" | "gif"; mime: string; width?: number; height?: number } | null {
  if (b.length < 16) return null;
  // PNG
  if (b.readUInt32BE(0) === 0x89504e47) return { ext: "png", mime: "image/png", width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  // GIF
  if (b.toString("ascii", 0, 3) === "GIF") return { ext: "gif", mime: "image/gif", width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
  // WebP
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
    const chunk = b.toString("ascii", 12, 16);
    let width: number | undefined;
    let height: number | undefined;
    if (chunk === "VP8X") {
      width = 1 + b.readUIntLE(24, 3);
      height = 1 + b.readUIntLE(27, 3);
    } else if (chunk === "VP8 ") {
      width = b.readUInt16LE(26) & 0x3fff;
      height = b.readUInt16LE(28) & 0x3fff;
    } else if (chunk === "VP8L") {
      const bits = b.readUInt32LE(21);
      width = (bits & 0x3fff) + 1;
      height = ((bits >> 14) & 0x3fff) + 1;
    }
    return { ext: "webp", mime: "image/webp", width, height };
  }
  // JPEG: walk segments to the first SOFn marker
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      const len = b.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { ext: "jpg", mime: "image/jpeg", height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
      }
      i += 2 + len;
    }
    return { ext: "jpg", mime: "image/jpeg" };
  }
  return null;
}
