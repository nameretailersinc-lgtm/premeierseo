import type { CategoryId } from "./types";

/* 3D illustrations built by scripts/build-illustrations.py into /public/illustrations/.
   Tools without an entry fall back to their line icon on a coloured tile. */

const TOOL_ART = new Set([
  "word-counter",
  "merge-pdf",
  "compress-pdf",
  "json-viewer",
  "word-to-pdf",
  "compress-jpg-image",
  "compress-png-image",
  "image-compressor",
  "photo-resizer-in-kb",
  "reduce-image-size-in-kb",
  "compress-image-to-20kb",
  "compress-jpeg-to-30kb",
  "compress-image-to-50kb",
  "compress-jpeg-to-100kb",
  "compress-jpeg-to-200kb",
  "compress-image-to-1mb",
  "free-crop-image-online",
  "image-resizer",
  "heic-to-jpg-converter",
  "jpg-to-png-converter",
  "jpg-to-svg-converter",
  "png-to-jpg-converter",
  "webp-to-png",
  "avif-to-jpg-converter",
  "favicon-generator",
  "video-to-gif",
]);

/** Tools that share a generic illustration (no misleading format labels in the art). */
const TOOL_ALIAS: Record<string, string> = {
  "uppercase-to-lowercase": "case-converter",
  "compress-image-to-10kb": "photo-resizer-in-kb",
  "png-to-ico-converter": "favicon-generator",
  "webp-to-jpg": "image-convert",
  "heic-to-png-converter": "image-convert",
  "svg-to-png": "image-convert",
  "png-to-svg-converter": "image-magic",
};

export function toolArt(id: string): string | null {
  if (TOOL_ART.has(id)) return `/illustrations/${id}.webp`;
  if (TOOL_ALIAS[id]) return `/illustrations/${TOOL_ALIAS[id]}.webp`;
  return null;
}

export function categoryArt(id: CategoryId): string {
  return `/illustrations/cat-${id}.webp`;
}

/** Large hero art for a category hub; categories without a scene use their 3D mark. */
export function categoryHeroArt(id: CategoryId): { src: string; width: number; height: number; scene: boolean } {
  if (id === "text-tools") return { src: "/illustrations/hero-text.webp", width: 496, height: 481, scene: true };
  if (id === "imaging-tools") return { src: "/illustrations/hero-image.webp", width: 560, height: 483, scene: true };
  if (id === "traffic-performance-tools") return { src: "/illustrations/hero-perf.webp", width: 560, height: 436, scene: true };
  return { src: categoryArt(id), width: 192, height: 192, scene: false };
}

/** Group-heading art on the image hub, where every group has a matching illustration. */
export const GROUP_ART: Partial<Record<CategoryId, Record<string, string>>> = {
  "imaging-tools": {
    compress: "image-compressor",
    size: "reduce-image-size-in-kb",
    resize: "free-crop-image-online",
    convert: "image-convert",
    icons: "favicon-generator",
    video: "video-to-gif",
  },
};
