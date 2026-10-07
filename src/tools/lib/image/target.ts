/*
 * Target-size search (pure logic, no DOM): find the highest quality — and, only if needed, the largest
 * dimensions — whose encoded size is at or under `targetBytes`.
 *
 * 1. At the current dimensions, try the maximum quality. If it fits, done.
 * 2. Otherwise try the quality floor. If that fits, binary-search quality between floor and max.
 * 3. If even the floor is too big: shrink the dimensions (area ∝ bytes, so scale ≈ √(target / size)),
 *    aiming for a mid quality (qPreferred) at the new size, and repeat — unless resizing is not allowed,
 *    in which case report the smallest result.
 *
 * For PNG the "quality" axis is the palette size (lossless, 256, 128 … 16 colors).
 */

export interface Encoded {
  size: number;
}

export interface SearchStep {
  w: number;
  h: number;
  q: number;
  size: number;
}

export interface SearchResult<T extends Encoded> {
  ok: boolean;
  result: T;
  w: number;
  h: number;
  q: number;
  steps: SearchStep[];
}

export interface SearchOptions<T extends Encoded> {
  width: number;
  height: number;
  targetBytes: number;
  /** Encode at (w, h) with quality q (0–1). */
  encode: (w: number, h: number, q: number) => Promise<T>;
  allowResize: boolean;
  qMax?: number;
  /** Lowest quality used before dimensions are reduced (when resizing is allowed). */
  qFloor?: number;
  /** Lowest quality when resizing is not allowed. */
  qMin?: number;
  iterations?: number;
  /** Stop shrinking below this longest side. */
  minSide?: number;
  /**
   * When dimensions must shrink, aim for this quality at the new size rather than the floor, so a
   * slightly smaller image at decent quality wins over a larger, blocky one.
   */
  qPreferred?: number;
  cancelled?: () => boolean;
}

export class Cancelled extends Error {
  constructor() {
    super("cancelled");
  }
}

export async function searchTarget<T extends Encoded>(o: SearchOptions<T>): Promise<SearchResult<T>> {
  const qMax = o.qMax ?? 0.92;
  const floor = o.allowResize ? (o.qFloor ?? 0.5) : (o.qMin ?? 0.05);
  const iterations = o.iterations ?? 7;
  const minSide = o.minSide ?? 24;
  const steps: SearchStep[] = [];
  let w = o.width;
  let h = o.height;
  let smallest: { r: T; w: number; h: number; q: number } | null = null;

  const enc = async (q: number) => {
    if (o.cancelled?.()) throw new Cancelled();
    const r = await o.encode(w, h, q);
    steps.push({ w, h, q, size: r.size });
    if (!smallest || r.size < smallest.r.size) smallest = { r, w, h, q };
    return r;
  };

  for (let round = 0; round < 12; round++) {
    const top = await enc(qMax);
    if (top.size <= o.targetBytes) return { ok: true, result: top, w, h, q: qMax, steps };
    const low = await enc(floor);
    if (low.size <= o.targetBytes) {
      let lo = floor;
      let hi = qMax;
      let best = low;
      let bestQ = floor;
      for (let i = 0; i < iterations; i++) {
        const mid = Math.round(((lo + hi) / 2) * 1000) / 1000;
        if (mid <= lo || mid >= hi) break;
        const r = await enc(mid);
        if (r.size <= o.targetBytes) {
          best = r;
          bestQ = mid;
          lo = mid;
          if (r.size >= o.targetBytes * 0.97) break;
        } else hi = mid;
      }
      return { ok: true, result: best, w, h, q: bestQ, steps };
    }
    if (!o.allowResize || Math.max(w, h) <= minSide) break;
    // Estimate the size at the preferred quality (sizes grow roughly geometrically with quality).
    const pref = Math.min(qMax, Math.max(floor, o.qPreferred ?? 0.65));
    const t = qMax > floor ? (pref - floor) / (qMax - floor) : 0;
    const est = low.size * Math.pow(Math.max(1, top.size / low.size), t);
    const s = Math.min(0.9, Math.max(0.25, Math.sqrt(o.targetBytes / est) * 0.97));
    const nw = Math.max(1, Math.round(w * s));
    const nh = Math.max(1, Math.round(h * s));
    if (Math.max(nw, nh) < minSide) {
      const k = minSide / Math.max(w, h);
      w = Math.max(1, Math.round(w * k));
      h = Math.max(1, Math.round(h * k));
    } else {
      w = nw;
      h = nh;
    }
  }
  const s = smallest as { r: T; w: number; h: number; q: number } | null;
  if (!s) throw new Error("no attempt");
  return { ok: false, result: s.r, w: s.w, h: s.h, q: s.q, steps };
}

/** PNG palette sizes tried in order; 0 = lossless. */
export const PNG_LEVELS = [0, 256, 128, 64, 32, 16];

/** Map a PNG level index (0…5) to the 0–1 "quality" axis used by searchTarget, and back. */
export function pngColorsForQuality(q: number): number {
  const idx = Math.round((1 - q) * (PNG_LEVELS.length - 1));
  return PNG_LEVELS[Math.max(0, Math.min(PNG_LEVELS.length - 1, idx))];
}

export interface PngSearchResult<T extends Encoded> {
  ok: boolean;
  result: T;
  w: number;
  h: number;
  colors: number;
  steps: { w: number; h: number; colors: number; size: number }[];
}

/**
 * PNG target search. Quality steps are palette sizes (lossless, 256 … 16 colors), not a continuous scale.
 * With resizing allowed, colors go no lower than 64 before the dimensions are reduced.
 */
export async function searchPngTarget<T extends Encoded>(o: {
  width: number;
  height: number;
  targetBytes: number;
  encode: (w: number, h: number, colors: number) => Promise<T>;
  allowResize: boolean;
  minSide?: number;
  cancelled?: () => boolean;
}): Promise<PngSearchResult<T>> {
  const levels = o.allowResize ? [0, 256, 128, 64] : PNG_LEVELS;
  const minSide = o.minSide ?? 24;
  const steps: PngSearchResult<T>["steps"] = [];
  let w = o.width;
  let h = o.height;
  let smallest: { r: T; w: number; h: number; colors: number } | null = null;
  for (let round = 0; round < 12; round++) {
    let last: T | null = null;
    for (const colors of levels) {
      if (o.cancelled?.()) throw new Cancelled();
      const r = await o.encode(w, h, colors);
      steps.push({ w, h, colors, size: r.size });
      if (!smallest || r.size < smallest.r.size) smallest = { r, w, h, colors };
      if (r.size <= o.targetBytes) return { ok: true, result: r, w, h, colors, steps };
      last = r;
    }
    if (!o.allowResize || !last || Math.max(w, h) <= minSide) break;
    const s = Math.min(0.9, Math.max(0.25, Math.sqrt(o.targetBytes / last.size) * 0.95));
    const k = Math.max(s, minSide / Math.max(w, h));
    w = Math.max(1, Math.round(w * k));
    h = Math.max(1, Math.round(h * k));
  }
  const s = smallest as { r: T; w: number; h: number; colors: number } | null;
  if (!s) throw new Error("no attempt");
  return { ok: false, result: s.r, w: s.w, h: s.h, colors: s.colors, steps };
}

/** Bytes for a target given in KB or MB with a 1,000 or 1,024 base. */
export function targetBytes(value: number, unit: "KB" | "MB", base: 1000 | 1024): number {
  return Math.floor(value * (unit === "MB" ? base * base : base));
}

/** "19.6 KB" in the chosen base (1 KB = 1,000 or 1,024 bytes). */
export function formatKB(bytes: number, base: 1000 | 1024 = 1000): string {
  if (bytes >= base * base) return `${(bytes / (base * base)).toFixed(2)} MB`;
  const kb = bytes / base;
  return `${kb < 10 ? kb.toFixed(2) : kb < 100 ? kb.toFixed(1) : Math.round(kb)} KB`;
}

export function formatInt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/** Label for a target: 20 → "20 KB", 1000 → "1 MB" (only when the value came from an MB preset). */
export function targetLabel(kb: number): string {
  return kb >= 1000 && kb % 1000 === 0 ? `${kb / 1000} MB` : `${kb} KB`;
}

/** Physical length to pixels at a DPI. */
export function toPixels(value: number, unit: "px" | "cm" | "mm" | "in", dpi: number): number {
  const inches = unit === "cm" ? value / 2.54 : unit === "mm" ? value / 25.4 : unit === "in" ? value : NaN;
  return Math.max(1, Math.round(unit === "px" ? value : inches * dpi));
}

/**
 * Starting pixel budget for a target search. Encoding a 12-megapixel photo several times to find a
 * 20 KB result wastes seconds; images are first capped at ~60 pixels per target byte (the search then
 * shrinks further if needed). Large targets are effectively uncapped.
 */
export function startDimensions(w: number, h: number, targetBytes: number, pixelsPerByte = 60) {
  const cap = targetBytes * pixelsPerByte;
  if (w * h <= cap) return { w, h };
  const s = Math.sqrt(cap / (w * h));
  return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)) };
}

export type ResizeMode = "pixels" | "percent" | "longest";

/** Output size for one image (pure). */
export function resizeDims(
  w: number,
  h: number,
  o: { mode: ResizeMode; width: number | null; height: number | null; lock: boolean; percent: number; longest: number | null },
): { w: number; h: number } {
  if (o.mode === "percent") return { w: Math.max(1, Math.round((w * o.percent) / 100)), h: Math.max(1, Math.round((h * o.percent) / 100)) };
  if (o.mode === "longest") {
    const L = o.longest ?? Math.max(w, h);
    const s = L / Math.max(w, h);
    return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)) };
  }
  const W = o.width;
  const H = o.height;
  if (o.lock || !W || !H) {
    if (W) return { w: W, h: Math.max(1, Math.round((h * W) / w)) };
    if (H) return { w: Math.max(1, Math.round((w * H) / h)), h: H };
    return { w, h };
  }
  return { w: W, h: H };
}

