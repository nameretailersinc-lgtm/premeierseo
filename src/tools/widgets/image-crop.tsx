"use client";

/*
 * Crop one image: drag the box or its handles, type exact X/Y/W/H, or nudge with the arrow keys.
 * Aspect presets, circle crop (transparent PNG corners), rotate 90° and flip. All in the browser.
 */

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent as RPointerEvent } from "react";
import { useTool } from "../ui/ToolContext";
import { FileDrop } from "../ui/FileDrop";
import { Alert, Button, Checkbox, Panel, downloadBlob, formatBytes, usePersistentOptions } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { context, createCanvas, drawScaled, type AnyCanvas, type OutFormat, type Rect } from "../lib/image/canvas";
import { encodeCanvas } from "../lib/image/encode";
import { applyAspect, initialRect, moveRect, parseAspect, resizeRect, setField, type Handle } from "../lib/image/crop";
import { circleMask, openImage, orient, outName, release, resolveFormat, FORMAT_LABEL, type Opened } from "../lib/image/ops";
import { BackgroundField, CHECKER_STYLE, ErrorText, NumberField, RangeNumber, errorOf } from "../lib/image/ui";

const ASPECTS: { id: string; label: string; value: number | null }[] = [
  { id: "free", label: "Free", value: null },
  { id: "1:1", label: "1:1 square", value: 1 },
  { id: "4:5", label: "4:5", value: 4 / 5 },
  { id: "3:4", label: "3:4", value: 3 / 4 },
  { id: "4:3", label: "4:3", value: 4 / 3 },
  { id: "3:2", label: "3:2", value: 3 / 2 },
  { id: "16:9", label: "16:9", value: 16 / 9 },
  { id: "9:16", label: "9:16", value: 9 / 16 },
  { id: "35:45", label: "35 × 45 mm photo", value: 35 / 45 },
];

const HANDLES: { h: Handle; cls: string; cursor: string }[] = [
  { h: "nw", cls: "-left-2 -top-2", cursor: "nwse-resize" },
  { h: "n", cls: "left-1/2 -top-2 -translate-x-1/2", cursor: "ns-resize" },
  { h: "ne", cls: "-right-2 -top-2", cursor: "nesw-resize" },
  { h: "e", cls: "-right-2 top-1/2 -translate-y-1/2", cursor: "ew-resize" },
  { h: "se", cls: "-bottom-2 -right-2", cursor: "nwse-resize" },
  { h: "s", cls: "-bottom-2 left-1/2 -translate-x-1/2", cursor: "ns-resize" },
  { h: "sw", cls: "-bottom-2 -left-2", cursor: "nesw-resize" },
  { h: "w", cls: "-left-2 top-1/2 -translate-y-1/2", cursor: "ew-resize" },
];

interface Base {
  canvas: AnyCanvas;
  w: number;
  h: number;
}

export default function ImageCrop({ toolId }: WidgetProps) {
  const id = useId();
  const { used, completed, announce, error: trackError } = useTool();
  const [o, setO] = usePersistentOptions(toolId, {
    aspect: "free",
    custom: "",
    circle: false,
    format: "png" as OutFormat,
    quality: 92,
    background: "#ffffff",
    grid: true,
  });
  const set = <K extends keyof typeof o>(k: K, v: (typeof o)[K]) => setO((p) => ({ ...p, [k]: v }));
  const [img, setImg] = useState<Opened | null>(null);
  const [base, setBase] = useState<Base | null>(null);
  const [orientState, setOrientState] = useState({ rotate: 0, flipH: false, flipV: false });
  const [crop, setCrop] = useState<Rect>({ x: 0, y: 0, w: 1, h: 1 });
  const [outW, setOutW] = useState<number | null>(null);
  const [problem, setProblem] = useState<{ message: string; link?: { href: string; anchor: string } } | null>(null);
  const [saved, setSaved] = useState<{ name: string; size: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [boxW, setBoxW] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const aspect = o.aspect === "custom" ? parseAspect(o.custom) : (ASPECTS.find((a) => a.id === o.aspect)?.value ?? null);
  const effAspect = o.circle && aspect === null ? null : aspect;

  // Measure the available width for the editor.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth));
    ro.observe(el);
    setBoxW(el.clientWidth);
    return () => ro.disconnect();
  }, [base]);

  const maxH = typeof window !== "undefined" ? Math.max(260, Math.min(560, window.innerHeight * 0.6)) : 480;
  const k = base && boxW ? Math.min(boxW / base.w, maxH / base.h, 1) : 0;
  const dispW = base ? Math.round(base.w * k) : 0;
  const dispH = base ? Math.round(base.h * k) : 0;

  // Draw the image into the on-screen canvas.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !base || !dispW) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(dispW * dpr);
    c.height = Math.round(dispH * dpr);
    const x = c.getContext("2d");
    if (!x) return;
    x.imageSmoothingQuality = "high";
    x.drawImage(base.canvas, 0, 0, c.width, c.height);
  }, [base, dispW, dispH]);

  // Live preview of the result (small).
  useEffect(() => {
    const c = previewRef.current;
    if (!c || !base) return;
    const s = Math.min(1, 220 / Math.max(crop.w, crop.h));
    c.width = Math.max(1, Math.round(crop.w * s));
    c.height = Math.max(1, Math.round(crop.h * s));
    const x = c.getContext("2d");
    if (!x) return;
    x.clearRect(0, 0, c.width, c.height);
    x.drawImage(base.canvas, crop.x, crop.y, crop.w, crop.h, 0, 0, c.width, c.height);
    if (o.circle) {
      x.globalCompositeOperation = "destination-in";
      x.beginPath();
      x.ellipse(c.width / 2, c.height / 2, c.width / 2, c.height / 2, 0, 0, Math.PI * 2);
      x.fill();
      x.globalCompositeOperation = "source-over";
    }
  }, [base, crop, o.circle]);

  const rebuild = useCallback((im: Opened, st: { rotate: number; flipH: boolean; flipV: boolean }, asp: number | null) => {
    const c = st.rotate || st.flipH || st.flipV ? orient(im.decoded.source, im.width, im.height, st.rotate, st.flipH, st.flipV) : drawScaled(im.decoded.source, im.width, im.height, im.width, im.height);
    setBase((prev) => {
      if (prev) release(prev.canvas);
      return { canvas: c, w: c.width, h: c.height };
    });
    setCrop(initialRect(c.width, c.height, asp));
    setSaved(null);
  }, []);

  const load = async (files: File[]) => {
    setProblem(null);
    setSaved(null);
    try {
      const im = await openImage(files[0], { heic: false });
      img?.close();
      setImg(im);
      const st = { rotate: 0, flipH: false, flipV: false };
      setOrientState(st);
      setOutW(null);
      rebuild(im, st, effAspect);
      announce(`Image loaded, ${im.width} by ${im.height} pixels. Adjust the crop box or type exact values.`);
    } catch (e) {
      const err = errorOf(e);
      setProblem(err);
      trackError(err.code, "input");
    }
  };

  useEffect(() => () => img?.close(), [img]);

  const transform = (next: { rotate: number; flipH: boolean; flipV: boolean }) => {
    if (!img) return;
    used("transform");
    setOrientState(next);
    rebuild(img, next, effAspect);
  };

  const chooseAspect = (idv: string) => {
    set("aspect", idv);
    const a = idv === "custom" ? parseAspect(o.custom) : (ASPECTS.find((x) => x.id === idv)?.value ?? null);
    if (base) setCrop((c) => applyAspect(c, a, base.w, base.h));
    setSaved(null);
  };

  const startDrag = (e: RPointerEvent, kind: "move" | Handle) => {
    if (!base || !k) return;
    e.preventDefault();
    e.stopPropagation();
    used("drag");
    const sx = e.clientX;
    const sy = e.clientY;
    const start = crop;
    const kk = k;
    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - sx) / kk;
      const dy = (ev.clientY - sy) / kk;
      setCrop(kind === "move" ? moveRect(start, dx, dy, base.w, base.h) : resizeRect(start, kind, dx, dy, effAspect, base.w, base.h));
      setSaved(null);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  const onKey = (e: KeyboardEvent) => {
    if (!base) return;
    const step = e.shiftKey ? 10 : 1;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    used("keyboard");
    if (e.altKey || e.ctrlKey || e.metaKey) setCrop((c) => resizeRect(c, d[0] ? "e" : "s", d[0], d[1], effAspect, base.w, base.h));
    else setCrop((c) => moveRect(c, d[0], d[1], base.w, base.h));
    setSaved(null);
  };

  const field = (f: "x" | "y" | "w" | "h", v: number | null) => {
    if (!base || v === null) return;
    setCrop((c) => setField(c, f, v, effAspect, base.w, base.h));
    setSaved(null);
  };

  const finalW = outW && outW > 0 ? outW : crop.w;
  const finalH = Math.max(1, Math.round((crop.h * finalW) / crop.w));

  const save = async () => {
    if (!base) return;
    setSaving(true);
    setProblem(null);
    try {
      const wantAlpha = o.circle || o.format !== "jpeg";
      const rf = await resolveFormat(o.format, wantAlpha);
      const fmt = rf.format;
      let c = drawScaled(base.canvas, base.w, base.h, finalW, finalH, { crop });
      if (o.circle) circleMask(c);
      if (fmt === "jpeg") {
        const flat = createCanvas(c.width, c.height);
        const x = context(flat);
        x.fillStyle = o.background;
        x.fillRect(0, 0, flat.width, flat.height);
        x.drawImage(c, 0, 0);
        release(c);
        c = flat;
      }
      const blob = await encodeCanvas(c, fmt, o.quality / 100, 0);
      release(c);
      const name = outName(img?.file ?? "image", o.circle ? "circle" : "cropped", fmt);
      downloadBlob(blob, name);
      setSaved({ name, size: blob.size });
      completed("download", { circle: o.circle });
      announce(`Saved ${name}, ${finalW} by ${finalH} pixels, ${formatBytes(blob.size)}${rf.note ? `. ${rf.note}` : ""}`);
    } catch (e) {
      const err = errorOf(e);
      setProblem(err);
      trackError(err.code, "output");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    if (!img) return;
    transform({ rotate: 0, flipH: false, flipV: false });
  };

  const box = { left: crop.x * k, top: crop.y * k, width: crop.w * k, height: crop.h * k };

  return (
    <div className="grid gap-4">
      <FileDrop accept="image/*,.avif,.webp" pasteImages onFiles={load} hint="JPG, PNG, WebP, AVIF, GIF · up to 100 MB · or paste with Ctrl+V" label={img ? "Choose another image" : "Choose image"} compact={!!img} />
      {problem && (
        <Alert tone="danger" role="alert">
          <ErrorText message={problem.message} link={problem.link} />
        </Alert>
      )}

      <Panel
        title="Crop area"
        actions={
          base && (
            <>
              <Button variant="ghost" icon="rotate-ccw" onClick={() => transform({ ...orientState, rotate: orientState.rotate - 90 })}>
                Rotate left
              </Button>
              <Button variant="ghost" icon="refresh" onClick={() => transform({ ...orientState, rotate: orientState.rotate + 90 })}>
                Rotate right
              </Button>
              <Button variant="ghost" icon="arrow-left-right" onClick={() => transform({ ...orientState, flipH: !orientState.flipH })} aria-pressed={orientState.flipH}>
                Flip horizontal
              </Button>
              <Button variant="ghost" onClick={() => transform({ ...orientState, flipV: !orientState.flipV })} aria-pressed={orientState.flipV}>
                Flip vertical
              </Button>
              <Button variant="ghost" onClick={reset}>
                Reset
              </Button>
            </>
          )
        }
      >
        <div ref={wrapRef} className="flex min-h-64 items-center justify-center p-3 sm:p-4">
          {base && dispW > 0 ? (
            <div className="relative touch-none select-none" style={{ width: dispW, height: dispH, ...CHECKER_STYLE }}>
              <canvas ref={canvasRef} style={{ width: dispW, height: dispH }} className="block" aria-hidden="true" />
              {/* Dim everything outside the crop box. */}
              <div className="pointer-events-none absolute inset-x-0 top-0 bg-ink/50" style={{ height: box.top }} />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-ink/50" style={{ top: box.top + box.height }} />
              <div className="pointer-events-none absolute left-0 bg-ink/50" style={{ top: box.top, height: box.height, width: box.left }} />
              <div className="pointer-events-none absolute right-0 bg-ink/50" style={{ top: box.top, height: box.height, left: box.left + box.width }} />
              <div
                role="group"
                tabIndex={0}
                aria-label={`Crop box, ${crop.w} by ${crop.h} pixels at ${crop.x}, ${crop.y}`}
                aria-describedby={`${id}-keys`}
                onPointerDown={(e) => startDrag(e, "move")}
                onKeyDown={onKey}
                className="absolute cursor-move border-2 border-on-accent outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus"
                style={box}
              >
                {o.circle && <div className="pointer-events-none absolute inset-0 rounded-full border-2 border-dashed border-on-accent" />}
                {o.grid && (
                  <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                    <div className="absolute inset-y-0 left-1/3 border-l border-on-accent/60" />
                    <div className="absolute inset-y-0 left-2/3 border-l border-on-accent/60" />
                    <div className="absolute inset-x-0 top-1/3 border-t border-on-accent/60" />
                    <div className="absolute inset-x-0 top-2/3 border-t border-on-accent/60" />
                  </div>
                )}
                {HANDLES.map((hd) => (
                  <span
                    key={hd.h}
                    aria-hidden="true"
                    onPointerDown={(e) => startDrag(e, hd.h)}
                    className={`absolute size-4 rounded-sm border-2 border-accent bg-on-accent ${hd.cls}`}
                    style={{ cursor: hd.cursor }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-ink-3">Choose an image to start. You can drag the crop box and its handles, or type exact values below.</p>
          )}
        </div>
        {base && (
          <p id={`${id}-keys`} className="border-t border-line px-3 py-2 text-sm text-ink-3 sm:px-4">
            Keyboard: focus the crop box, then use the arrow keys to move it (Shift moves 10 px). Hold Alt or Ctrl with the arrows to resize.
          </p>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <Panel title="Exact crop (pixels)">
          <div className="grid gap-4 p-3 sm:p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <NumberField label="X (left)" value={base ? crop.x : null} onChange={(v) => field("x", v)} min={0} max={base?.w ?? 30000} />
              <NumberField label="Y (top)" value={base ? crop.y : null} onChange={(v) => field("y", v)} min={0} max={base?.h ?? 30000} />
              <NumberField label="Width" value={base ? crop.w : null} onChange={(v) => field("w", v)} min={1} max={base?.w ?? 30000} />
              <NumberField label="Height" value={base ? crop.h : null} onChange={(v) => field("h", v)} min={1} max={base?.h ?? 30000} />
            </div>
            <div>
              <p className="field-label" id={`${id}-asp`}>
                Aspect ratio
              </p>
              <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby={`${id}-asp`}>
                {ASPECTS.map((a) => (
                  <button key={a.id} type="button" className="chip" aria-pressed={o.aspect === a.id} onClick={() => chooseAspect(a.id)}>
                    {a.label}
                  </button>
                ))}
                <button type="button" className="chip" aria-pressed={o.aspect === "custom"} onClick={() => chooseAspect("custom")}>
                  Custom
                </button>
              </div>
              {o.aspect === "custom" && (
                <div className="mt-2 w-44">
                  <label htmlFor={`${id}-ca`} className="field-label">
                    Custom ratio
                  </label>
                  <input
                    id={`${id}-ca`}
                    className="input"
                    value={o.custom}
                    placeholder="e.g. 2:3"
                    onChange={(e) => {
                      set("custom", e.target.value);
                      const a = parseAspect(e.target.value);
                      if (a && base) setCrop((c) => applyAspect(c, a, base.w, base.h));
                    }}
                  />
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-x-6">
              <Checkbox
                checked={o.circle}
                onChange={(v) => {
                  setO((p) => ({ ...p, circle: v, format: v && p.format === "jpeg" ? "png" : p.format, aspect: v && p.aspect === "free" ? "1:1" : p.aspect }));
                  if (v && base && o.aspect === "free") setCrop((c) => applyAspect(c, 1, base.w, base.h));
                }}
                label="Circle crop"
                help="Transparent corners (PNG or WebP)."
              />
              <Checkbox checked={o.grid} onChange={(v) => set("grid", v)} label="Show rule-of-thirds grid" />
            </div>
          </div>
        </Panel>

        <Panel tone="accent" title="Result">
          <div className="grid gap-3 p-3">
            <div className="flex h-40 items-center justify-center overflow-hidden rounded-md border border-line" style={CHECKER_STYLE}>
              {base ? <canvas ref={previewRef} className="max-h-full max-w-full" aria-label="Preview of the cropped image" role="img" /> : <span className="text-sm text-ink-3">No image yet</span>}
            </div>
            <p className="text-sm text-ink tabular-nums">
              {base ? (
                <>
                  <strong>
                    {finalW} × {finalH} px
                  </strong>
                  {img && base && ` from ${base.w} × ${base.h}`}
                </>
              ) : (
                "—"
              )}
            </p>
            <NumberField label="Resize result to width (optional)" value={outW} onChange={setOutW} suffix="px" placeholder="Keep" max={20000} />
          </div>
        </Panel>
      </div>

      <Panel title="Save">
        <div className="grid gap-4 p-3 sm:p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label htmlFor={`${id}-fmt`} className="field-label">
                Format
              </label>
              <select id={`${id}-fmt`} className="select w-44" value={o.format} onChange={(e) => set("format", e.target.value as OutFormat)}>
                <option value="png">PNG</option>
                <option value="jpeg">JPG</option>
                <option value="webp">WebP</option>
              </select>
            </div>
            {o.format !== "png" && (
              <div className="min-w-56 flex-1">
                <RangeNumber label={`${FORMAT_LABEL[o.format]} quality`} value={o.quality} onChange={(v) => set("quality", v)} min={10} max={100} unit="%" />
              </div>
            )}
          </div>
          {o.format === "jpeg" && <BackgroundField value={o.background} onChange={(v) => set("background", v)} legend={o.circle ? "Color outside the circle (JPG has no transparency)" : "Fill for transparent areas"} />}
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" size="md" icon="download" disabled={!base || saving} busy={saving} onClick={save}>
              Download cropped image
            </Button>
            {saved && (
              <p className="text-sm text-ink-2 tabular-nums" role="status">
                Saved {saved.name} · {formatBytes(saved.size)}
              </p>
            )}
          </div>
          <p className="text-sm text-ink-3">Cropping keeps the original pixels inside the box (no re-sampling unless you resize). Location and camera details (EXIF) are not copied.</p>
        </div>
      </Panel>
    </div>
  );
}
