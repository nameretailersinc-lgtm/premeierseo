"use client";

/*
 * Quality-based image compression (no size target).
 *   config.preset "general" → /image-compressor/ (JPG, PNG, WebP, keep format by default)
 *   config.preset "jpeg"    → /compress-jpg-image/ (quality presets)
 *   config.preset "png"     → /compress-png-image/ (lossless or palette quantization, keeps transparency)
 */

import { useId, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { FileDrop } from "../ui/FileDrop";
import { Panel, Segmented, formatBytes, usePersistentOptions } from "../ui/primitives";
import type { WidgetProps } from "../types";
import type { OutFormat } from "../lib/image/canvas";
import { convert, kindMatches, openImage, outName, resolveFormat, sameFormat, FORMAT_LABEL } from "../lib/image/ops";
import { formatInt } from "../lib/image/target";
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

type Preset = "general" | "jpeg" | "png";
type FormatChoice = "same" | "jpeg" | "png" | "webp";

const JPEG_PRESETS = [
  { label: "High quality", q: 90 },
  { label: "Balanced", q: 78 },
  { label: "Small file", q: 60 },
];
const COLOR_STEPS = [256, 128, 64, 32, 16, 8];

function pct(before: number, after: number): string {
  const d = Math.round((1 - after / before) * 100);
  return d >= 0 ? `−${d}%` : `+${-d}%`;
}

export default function ImageCompress({ toolId, config }: WidgetProps) {
  const id = useId();
  const preset: Preset = config?.preset === "jpeg" ? "jpeg" : config?.preset === "png" ? "png" : "general";
  const { completed, announce } = useTool();
  const [o, setO] = usePersistentOptions(toolId, {
    format: (preset === "jpeg" ? "jpeg" : preset === "png" ? "png" : "same") as FormatChoice,
    quality: preset === "jpeg" ? 78 : 80,
    pngMode: (preset === "png" ? "colors" : "lossless") as "lossless" | "colors",
    colors: 256,
    background: "#ffffff",
    maxW: null as number | null,
  });
  const set = <K extends keyof typeof o>(k: K, v: (typeof o)[K]) => setO((p) => ({ ...p, [k]: v }));

  const processor = async (row: Row): Promise<OutImage> => {
    const img = await openImage(row.file, { heic: true });
    try {
      const wanted: OutFormat = o.format === "same" ? sameFormat(img.kind, img.alpha) : o.format;
      const rf = await resolveFormat(wanted, img.alpha);
      const fmt = rf.format;
      let width = img.width;
      let height = img.height;
      if (o.maxW && o.maxW < img.width) {
        width = o.maxW;
        height = Math.max(1, Math.round((img.height * o.maxW) / img.width));
      }
      const r = await convert(img, {
        format: fmt,
        quality: o.quality / 100,
        pngColors: fmt === "png" && o.pngMode === "colors" ? o.colors : 0,
        background: o.background,
        width,
        height,
      });
      const notes: string[] = [];
      if (rf.note) notes.push(rf.note);
      notes.push(fmt === "png" ? (o.pngMode === "colors" ? `PNG, ${o.colors} colors` : "PNG, lossless") : `${FORMAT_LABEL[fmt]} quality ${o.quality}`);
      if (img.alpha && fmt === "jpeg") notes.push("transparent areas filled");
      if (width !== img.width) notes.push(`resized from ${img.width} px wide`);

      if (kindMatches(img.kind, fmt) && r.blob.size >= row.file.size && width === img.width) {
        return {
          blob: row.file,
          name: row.file.name,
          width: img.width,
          height: img.height,
          original: true,
          detail: `${formatBytes(row.file.size)} · ${dims(img.width, img.height)} · original kept`,
          info: `Re-saving made it ${formatBytes(r.blob.size)}, larger than the original, so the download is your original file. Try a lower quality${fmt === "png" ? ", fewer colors" : ""} or another format.`,
        };
      }
      const warn = r.blob.size > row.file.size ? `Larger than the original (${formatBytes(row.file.size)}). Choose a different format or a lower quality.` : undefined;
      return {
        blob: r.blob,
        name: outName(row.file, "compressed", fmt),
        width: r.width,
        height: r.height,
        detail: `${formatBytes(row.file.size)} → ${formatBytes(r.blob.size)} (${pct(row.file.size, r.blob.size)}) · ${dims(r.width, r.height)}`,
        warn,
        info: notes.join(" · "),
      };
    } finally {
      img.close();
    }
  };

  const batch = useBatch(processor, (rows) => {
    const done = rows.filter((r) => r.status === "done" && r.out);
    if (!done.length) return;
    const before = done.reduce((n, r) => n + r.file.size, 0);
    const after = done.reduce((n, r) => n + (r.out?.blob.size ?? 0), 0);
    completed("compress", { files: done.length });
    announce(`${done.length} image${done.length === 1 ? "" : "s"} compressed, ${formatBytes(before)} to ${formatBytes(after)}`);
  });
  const [selected, setSelected] = useState<string | null>(null);
  useRerunOnChange(JSON.stringify([o.format, o.quality, o.pngMode, o.colors, o.background, o.maxW]), batch.rerun);

  const doneRows = batch.rows.filter((r) => r.status === "done" && r.out);
  const sel = batch.rows.find((r) => r.id === selected && r.out) ?? doneRows[0];
  const showPng = o.format === "png" || (o.format === "same" && preset !== "jpeg");
  const showQuality = o.format !== "png";

  return (
    <div className="grid gap-4">
      <FileDrop
        accept={preset === "png" ? "image/png,.png,image/*,.heic,.heif,.avif" : IMAGE_ACCEPT}
        multiple
        pasteImages
        onFiles={batch.add}
        hint={`${preset === "png" ? "PNG (or any image)" : preset === "jpeg" ? "JPG/JPEG (or any image)" : "JPG, PNG, WebP, HEIC, AVIF, GIF"} · up to 100 MB each · or paste with Ctrl+V`}
        label="Choose images"
        compact={batch.rows.length > 0}
      />

      <Panel title="Compression settings">
        <div className="grid gap-4 p-3 sm:p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label htmlFor={`${id}-fmt`} className="field-label">
                Output format
              </label>
              <select id={`${id}-fmt`} className="select w-52" value={o.format} onChange={(e) => set("format", e.target.value as FormatChoice)}>
                <option value="same">Same as original</option>
                <option value="jpeg">JPG</option>
                <option value="png">PNG</option>
                <option value="webp">WebP (smallest)</option>
              </select>
            </div>
            <div className="w-44">
              <NumberField label="Max width (optional)" value={o.maxW} onChange={(v) => set("maxW", v)} placeholder="Keep size" suffix="px" />
            </div>
          </div>

          {showQuality && (
            <div className="grid gap-2">
              <RangeNumber
                label="Quality (JPG and WebP)"
                value={o.quality}
                onChange={(v) => set("quality", v)}
                min={10}
                max={100}
                unit="%"
                valueText={(v) => `${v} percent quality`}
                leftHint="Smaller file"
                rightHint="Better quality"
              />
              {preset === "jpeg" && (
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quality presets">
                  {JPEG_PRESETS.map((p) => (
                    <button key={p.q} type="button" className="chip" aria-pressed={o.quality === p.q} onClick={() => set("quality", p.q)}>
                      {p.label} ({p.q})
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {showPng && (
            <div className="grid gap-3">
              <Segmented
                legend="PNG compression"
                value={o.pngMode}
                onChange={(v) => set("pngMode", v)}
                options={[
                  { value: "lossless", label: "Lossless" },
                  { value: "colors", label: "Reduce colors" },
                ]}
              />
              {o.pngMode === "colors" && (
                <div>
                  <label htmlFor={`${id}-col`} className="field-label">
                    Colors in the palette
                  </label>
                  <select id={`${id}-col`} className="select w-40" value={o.colors} onChange={(e) => set("colors", Number(e.target.value))}>
                    {COLOR_STEPS.map((c) => (
                      <option key={c} value={c}>
                        {c} colors
                      </option>
                    ))}
                  </select>
                  <p className="field-help">Transparency is kept. Fewer colors = smaller file; gradients and photos start to band below about 128.</p>
                </div>
              )}
            </div>
          )}

          {(o.format === "jpeg" || (o.format === "same" && preset === "jpeg")) && <BackgroundField value={o.background} onChange={(v) => set("background", v)} />}
        </div>
      </Panel>

      {batch.rows.length > 0 ? (
        <section aria-labelledby={`${id}-res`} className="grid gap-3">
          <h2 id={`${id}-res`} className="sr-only">
            Results
          </h2>
          <BatchBar rows={batch.rows} zipName="compressed-images.zip" onClear={batch.clear} onStop={batch.stop} busy={batch.busy} />
          <RowList rows={batch.rows} selected={sel?.id} onSelect={setSelected} onRemove={batch.remove} />
          {sel?.out && (
            <Compare
              before={sel.file}
              after={sel.out.blob}
              beforeInfo={`${formatBytes(sel.file.size)} (${formatInt(sel.file.size)} bytes)`}
              afterInfo={`${formatBytes(sel.out.blob.size)} (${formatInt(sel.out.blob.size)} bytes) · ${pct(sel.file.size, sel.out.blob.size)}`}
              afterLabel="Compressed"
              note={sel.out.warn ?? sel.out.info}
            />
          )}
        </section>
      ) : (
        <p className="min-h-10 text-sm text-ink-3">Add images to see the new size of each file, the saving in percent and a before/after preview.</p>
      )}
      <p className="text-sm text-ink-3">{EXIF_NOTE}</p>
    </div>
  );
}
