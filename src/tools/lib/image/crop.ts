/* Crop-rectangle geometry (pure). All values are image pixels; results are whole pixels inside the image. */

import type { Rect } from "./canvas";

export type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export const MIN_CROP = 8;

function finish(r: Rect, bw: number, bh: number): Rect {
  let w = Math.max(1, Math.min(bw, Math.round(r.w)));
  let h = Math.max(1, Math.min(bh, Math.round(r.h)));
  if (!Number.isFinite(w)) w = bw;
  if (!Number.isFinite(h)) h = bh;
  const x = Math.max(0, Math.min(bw - w, Math.round(r.x)));
  const y = Math.max(0, Math.min(bh - h, Math.round(r.y)));
  return { x, y, w, h };
}

/** Largest centered rectangle with this aspect (w/h), scaled by `fill` (0–1). Free aspect: the image inset by 10%. */
export function initialRect(bw: number, bh: number, aspect: number | null, fill = 0.9): Rect {
  if (!aspect) return finish({ x: bw * 0.1, y: bh * 0.1, w: bw * 0.8, h: bh * 0.8 }, bw, bh);
  let w = bw;
  let h = bw / aspect;
  if (h > bh) {
    h = bh;
    w = bh * aspect;
  }
  w *= fill;
  h *= fill;
  return finish({ x: (bw - w) / 2, y: (bh - h) / 2, w, h }, bw, bh);
}

export function moveRect(s: Rect, dx: number, dy: number, bw: number, bh: number): Rect {
  return finish({ x: s.x + dx, y: s.y + dy, w: s.w, h: s.h }, bw, bh);
}

/** Drag a handle by (dx, dy). With an aspect, the opposite edge/corner (or the center line) stays fixed. */
export function resizeRect(s: Rect, hnd: Handle, dx: number, dy: number, aspect: number | null, bw: number, bh: number): Rect {
  let x1 = s.x;
  let y1 = s.y;
  let x2 = s.x + s.w;
  let y2 = s.y + s.h;
  if (hnd.includes("w")) x1 = Math.min(x2 - MIN_CROP, Math.max(0, x1 + dx));
  if (hnd.includes("e")) x2 = Math.max(x1 + MIN_CROP, Math.min(bw, x2 + dx));
  if (hnd.includes("n")) y1 = Math.min(y2 - MIN_CROP, Math.max(0, y1 + dy));
  if (hnd.includes("s")) y2 = Math.max(y1 + MIN_CROP, Math.min(bh, y2 + dy));
  if (!aspect) return finish({ x: x1, y: y1, w: x2 - x1, h: y2 - y1 }, bw, bh);

  let w = x2 - x1;
  let h = y2 - y1;
  if (hnd === "e" || hnd === "w") h = w / aspect;
  else if (hnd === "n" || hnd === "s") w = h * aspect;
  else if (w / h > aspect) h = w / aspect;
  else w = h * aspect;

  const ax = hnd.includes("w") ? "right" : hnd.includes("e") ? "left" : "center";
  const ay = hnd.includes("n") ? "bottom" : hnd.includes("s") ? "top" : "center";
  const cx = s.x + s.w / 2;
  const cy = s.y + s.h / 2;
  const maxW = ax === "left" ? bw - s.x : ax === "right" ? s.x + s.w : 2 * Math.min(cx, bw - cx);
  const maxH = ay === "top" ? bh - s.y : ay === "bottom" ? s.y + s.h : 2 * Math.min(cy, bh - cy);
  const k = Math.min(1, maxW / w, maxH / h);
  w = Math.max(MIN_CROP, w * k);
  h = Math.max(MIN_CROP, w / aspect);
  const nx = ax === "left" ? s.x : ax === "right" ? s.x + s.w - w : cx - w / 2;
  const ny = ay === "top" ? s.y : ay === "bottom" ? s.y + s.h - h : cy - h / 2;
  return finish({ x: nx, y: ny, w, h }, bw, bh);
}

/** Apply a typed value. With an aspect, the edited side drives the other; the result stays inside the image. */
export function setField(s: Rect, field: "x" | "y" | "w" | "h", v: number, aspect: number | null, bw: number, bh: number): Rect {
  const r = { ...s, [field]: v };
  if (field === "w" || field === "h") {
    if (aspect && field === "w") r.h = r.w / aspect;
    if (aspect && field === "h") r.w = r.h * aspect;
    const k = Math.min(1, bw / r.w, bh / r.h);
    r.w *= k;
    r.h *= k;
    r.x = Math.min(r.x, bw - r.w);
    r.y = Math.min(r.y, bh - r.h);
  }
  return finish(r, bw, bh);
}

/** Re-fit an existing rectangle to a new aspect around its center. */
export function applyAspect(s: Rect, aspect: number | null, bw: number, bh: number): Rect {
  if (!aspect) return finish(s, bw, bh);
  const cx = s.x + s.w / 2;
  const cy = s.y + s.h / 2;
  let w = s.w;
  let h = w / aspect;
  if (h > s.h) {
    h = s.h;
    w = h * aspect;
  }
  const k = Math.min(1, (2 * Math.min(cx, bw - cx)) / w, (2 * Math.min(cy, bh - cy)) / h);
  if (k < 0.5) return initialRect(bw, bh, aspect);
  w *= k;
  h *= k;
  return finish({ x: cx - w / 2, y: cy - h / 2, w, h }, bw, bh);
}

/** Parse "16:9", "4/5", "1.5" → 1.777…; invalid → null. */
export function parseAspect(v: string): number | null {
  const m = /^\s*(\d+(?:\.\d+)?)\s*[:/x×]\s*(\d+(?:\.\d+)?)\s*$/i.exec(v);
  if (m) {
    const a = parseFloat(m[1]) / parseFloat(m[2]);
    return a > 0 && Number.isFinite(a) ? a : null;
  }
  const n = parseFloat(v);
  return n > 0 && Number.isFinite(n) ? n : null;
}
