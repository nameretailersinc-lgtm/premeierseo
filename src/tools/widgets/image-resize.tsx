"use client";

/*
 * Resize by pixels (aspect lock), percentage or longest side; batch; presets for common social sizes.
 * When both width and height are fixed and the shape differs: stretch, crop to fill, or fit with borders.
 */

import { useId, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { FileDrop } from "../ui/FileDrop";
import { Checkbox, Panel, Segmented, formatBytes, usePersistentOptions } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { ImageError, centerCropToAspect, createCanvas, context, drawScaled, yieldToMain, type OutFormat } from "../lib/image/canvas";
import { encodeCanvas } from "../lib/image/encode";
import { resizeDims as targetSize, type ResizeMode as Mode } from "../lib/image/target";
import { openImage, outName, release, resolveFormat, sameFormat, FORMAT_LABEL } from "../lib/image/ops";
import {
  BackgroundField,
  BatchBar,
  Compare,
  EXIF_NOTE,
  IMAGE_ACCEPT,
  NumberField,
  RangeNumber,
  RowList,
  dims,
  useBatch,
  useRerunOnChange,
  type OutImage,
  type Row,
} from "../lib/image/ui";

type Fit = "stretch" | "crop" | "pad";
type FormatChoice = "same" | "jpeg" | "png" | "webp";

const PRESETS = [
  { label: "Square post 1080 × 1080", w: 1080, h: 1080 },
  { label: "Portrait post 1080 × 1350", w: 1080, h: 1350 },
  { label: "Story / Reel 1080 × 1920", w: 1080, h: 1920 },
  { label: "YouTube thumbnail 1280 × 720", w: 1280, h: 720 },
  { label: "Link preview 1200 × 630", w: 1200, h: 630 },
  { label: "Full HD 1920 × 1080", w: 1920, h: 1080 },
];

export default function ImageResize({ toolId }: WidgetProps) {
  const id = useId();
  const { completed, announce } = useTool();
  const [o, setO] = usePersistentOptions(toolId, {
    mode: "pixels" as Mode,
    width: 1080 as number | null,
    height: null as number | null,
    lock: true,
    percent: 50,
    longest: 1600 as number | null,
    fit: "crop" as Fit,
    format: "same" as FormatChoice,
    quality: 88,
    background: "#ffffff",
  });
  const set = <K extends keyof typeof o>(k: K, v: (typeof o)[K]) => setO((p) => ({ ...p, [k]: v }));
  const [firstSize, setFirstSize] = useState<{ w: number; h: number } | null>(null);

  const processor = async (row: Row): Promise<OutImage> => {
    const img = await openImage(row.file, { heic: true });
    try {
      setFirstSize((p) => p ?? { w: img.width, h: img.height });
      const t = targetSize(img.width, img.height, o);
      if (t.w * t.h > 50_000_000) throw new ImageError("TOO_LARGE", `${t.w} × ${t.h} px is larger than browsers can draw. Choose a smaller size.`);
      const wanted: OutFormat = o.format === "same" ? sameFormat(img.kind, img.alpha) : o.format;
      const rf = await resolveFormat(wanted, img.alpha);
      const fmt = rf.format;
      const fill = o.background === "transparent" ? (fmt === "jpeg" ? "#ffffff" : null) : o.background;
      const bg = fmt === "jpeg" ? fill : null;
      const exact = o.mode === "pixels" && !o.lock && o.width && o.height;
      const shapeDiffers = exact && Math.abs(t.w / t.h - img.width / img.height) > 0.005;
      let c;
      if (shapeDiffers && o.fit === "crop") {
        c = drawScaled(img.decoded.source, img.width, img.height, t.w, t.h, { crop: centerCropToAspect(img.width, img.height, t.w / t.h), background: bg });
      } else if (shapeDiffers && o.fit === "pad") {
        const k = Math.min(t.w / img.width, t.h / img.height);
        const inner = drawScaled(img.decoded.source, img.width, img.height, Math.max(1, Math.round(img.width * k)), Math.max(1, Math.round(img.height * k)));
        c = createCanvas(t.w, t.h);
        const x = context(c);
        if (fill) {
          x.fillStyle = fill;
          x.fillRect(0, 0, t.w, t.h);
        }
        x.drawImage(inner, Math.round((t.w - inner.width) / 2), Math.round((t.h - inner.height) / 2));
        release(inner);
      } else {
        c = drawScaled(img.decoded.source, img.width, img.height, t.w, t.h, { background: bg });
      }
      await yieldToMain();
      const blob = await encodeCanvas(c, fmt, o.quality / 100, 0);
      release(c);
      const scale = t.w / img.width;
      const notes: string[] = [FORMAT_LABEL[fmt] + (fmt === "png" ? "" : ` quality ${o.quality}`)];
      if (rf.note) notes.push(rf.note);
      if (shapeDiffers) notes.push(o.fit === "crop" ? "edges cropped to the new shape" : o.fit === "pad" ? "borders added" : "stretched to the new shape");
      let warn: string | undefined;
      if (scale > 1.01 || t.h / img.height > 1.01) warn = `Enlarged ${Math.round(Math.max(scale, t.h / img.height) * 100) / 100}×. Enlarging can't add detail, so expect a softer image.`;
      return {
        blob,
        name: outName(row.file, `${t.w}x${t.h}`, fmt),
        width: t.w,
        height: t.h,
        detail: `${dims(img.width, img.height)} → ${dims(t.w, t.h)} · ${formatBytes(blob.size)}`,
        warn,
        info: notes.join(" · "),
      };
    } finally {
      img.close();
    }
  };

  const batch = useBatch(processor, (rows) => {
    const ok = rows.filter((r) => r.status === "done").length;
    if (ok) completed("resize", { files: ok, mode: o.mode });
    announce(`${ok} image${ok === 1 ? "" : "s"} resized`);
  });
  const [selected, setSelected] = useState<string | null>(null);
  useRerunOnChange(JSON.stringify([o.mode, o.width, o.height, o.lock, o.percent, o.longest, o.fit, o.format, o.quality, o.background]), batch.rerun);

  const doneRows = batch.rows.filter((r) => r.status === "done" && r.out);
  const sel = batch.rows.find((r) => r.id === selected && r.out) ?? doneRows[0];
  const preview = firstSize ? targetSize(firstSize.w, firstSize.h, o) : null;
  const exact = o.mode === "pixels" && !o.lock && o.width && o.height;

  return (
    <div className="grid gap-4">
      <FileDrop
        accept={IMAGE_ACCEPT}
        multiple
        pasteImages
        onFiles={(f) => {
          if (!batch.rows.length) setFirstSize(null);
          batch.add(f);
        }}
        hint="JPG, PNG, WebP, HEIC, AVIF, GIF · up to 100 MB each · resize many at once"
        label="Choose images"
        compact={batch.rows.length > 0}
      />

      <Panel title="New size">
        <div className="grid gap-4 p-3 sm:p-4">
          <Segmented
            legend="Resize by"
            value={o.mode}
            onChange={(v) => set("mode", v)}
            options={[
              { value: "pixels", label: "Pixels" },
              { value: "percent", label: "Percentage" },
              { value: "longest", label: "Longest side" },
            ]}
          />
          {o.mode === "pixels" && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:max-w-md">
                <NumberField
                  label="Width"
                  value={o.width}
                  onChange={(v) => setO((p) => ({ ...p, width: v, height: p.lock && v ? null : p.height }))}
                  suffix="px"
                  placeholder={o.lock && preview ? String(preview.w) : "Auto"}
                />
                <NumberField
                  label="Height"
                  value={o.height}
                  onChange={(v) => setO((p) => ({ ...p, height: v, width: p.lock && v ? null : p.width }))}
                  suffix="px"
                  placeholder={o.lock && preview ? String(preview.h) : "Auto"}
                />
              </div>
              <Checkbox
                checked={o.lock}
                onChange={(v) => setO((p) => ({ ...p, lock: v, height: v && p.width ? null : p.height }))}
                label="Keep aspect ratio"
                help="Enter a width or a height; the other side follows each image's own proportions."
              />
              <div>
                <p className="field-label">Common sizes</p>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Common sizes">
                  {PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      className="chip"
                      aria-pressed={!o.lock && o.width === p.w && o.height === p.h}
                      onClick={() => setO((prev) => ({ ...prev, mode: "pixels", lock: false, width: p.w, height: p.h }))}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              {exact && (
                <Segmented
                  legend="If the shape is different"
                  value={o.fit}
                  onChange={(v) => set("fit", v)}
                  options={[
                    { value: "crop", label: "Crop to fill" },
                    { value: "pad", label: "Fit with borders" },
                    { value: "stretch", label: "Stretch" },
                  ]}
                />
              )}
            </>
          )}
          {o.mode === "percent" && (
            <RangeNumber label="Scale" value={o.percent} onChange={(v) => set("percent", v)} min={1} max={400} unit="%" valueText={(v) => `${v} percent`} help="Below 100% makes the image smaller; above 100% enlarges it." />
          )}
          {o.mode === "longest" && (
            <div className="w-48">
              <NumberField label="Longest side" value={o.longest} onChange={(v) => set("longest", v)} suffix="px" help="Landscape: the width. Portrait: the height." />
            </div>
          )}
          {preview && (
            <p className="text-sm text-ink-2 tabular-nums" aria-live="polite">
              First image: {dims(firstSize?.w, firstSize?.h)} → <strong className="text-ink">{dims(preview.w, preview.h)}</strong>
            </p>
          )}
          <details className="rounded-md border border-line">
            <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-ink">Format and quality</summary>
            <div className="grid gap-4 border-t border-line p-3">
              <div>
                <label htmlFor={`${id}-fmt`} className="field-label">
                  Output format
                </label>
                <select id={`${id}-fmt`} className="select w-52" value={o.format} onChange={(e) => set("format", e.target.value as FormatChoice)}>
                  <option value="same">Same as original</option>
                  <option value="jpeg">JPG</option>
                  <option value="png">PNG</option>
                  <option value="webp">WebP</option>
                </select>
              </div>
              {o.format !== "png" && <RangeNumber label="Quality (JPG and WebP)" value={o.quality} onChange={(v) => set("quality", v)} min={10} max={100} unit="%" leftHint="Smaller file" rightHint="Better quality" />}
              <BackgroundField value={o.background} onChange={(v) => set("background", v)} legend="Fill for transparent areas (JPG) and borders" allowTransparent />
            </div>
          </details>
        </div>
      </Panel>

      {batch.rows.length > 0 ? (
        <section aria-labelledby={`${id}-res`} className="grid gap-3">
          <h2 id={`${id}-res`} className="sr-only">
            Resized images
          </h2>
          <BatchBar rows={batch.rows} zipName="resized-images.zip" onClear={batch.clear} onStop={batch.stop} busy={batch.busy} />
          <RowList rows={batch.rows} selected={sel?.id} onSelect={setSelected} onRemove={batch.remove} />
          {sel?.out && (
            <Compare
              before={sel.file}
              after={sel.out.blob}
              beforeInfo={formatBytes(sel.file.size)}
              afterInfo={`${dims(sel.out.width, sel.out.height)} · ${formatBytes(sel.out.blob.size)}`}
              afterLabel="Resized"
              note={sel.out.warn ?? sel.out.info}
            />
          )}
        </section>
      ) : (
        <p className="min-h-10 text-sm text-ink-3">Resized images appear here with their new dimensions and file size. Change the size at any time; the images update automatically.</p>
      )}
      <p className="text-sm text-ink-3">{EXIF_NOTE}</p>
    </div>
  );
}
