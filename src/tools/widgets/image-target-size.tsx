"use client";

/*
 * Compress images to a file-size target.
 *   mode "fixed"  → one preset target (config.targetKB), e.g. /compress-image-to-20kb/
 *   mode "custom" → any KB/MB target (/reduce-image-size-in-kb/)
 *   mode "photo"  → exact pixel dimensions AND a KB limit (/photo-resizer-in-kb/)
 * Quality is searched first; dimensions shrink only if quality alone can't reach the target.
 */

import { useId, useMemo, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { FileDrop } from "../ui/FileDrop";
import { Alert, Checkbox, Panel, Segmented, formatBytes, usePersistentOptions } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { centerCropToAspect, createCanvas, context, type OutFormat, type Rect } from "../lib/image/canvas";
import { setJpegDpi } from "../lib/image/encode";
import { compressToTarget, kindMatches, openImage, outName, release, resolveFormat, FORMAT_LABEL, type Opened } from "../lib/image/ops";
import { formatInt, formatKB, targetBytes, toPixels } from "../lib/image/target";
import {
  BackgroundField,
  BatchBar,
  Compare,
  EXIF_NOTE,
  IMAGE_ACCEPT,
  NumberField,
  RowList,
  SizeChips,
  dims,
  useBatch,
  useRerunOnChange,
  type OutImage,
  type Row,
} from "../lib/image/ui";
import { Button } from "../ui/primitives";

type Mode = "fixed" | "custom" | "photo";
type FormatChoice = "auto" | "jpeg" | "png" | "webp";
type Unit = "px" | "cm" | "mm" | "in";
type Fit = "crop" | "pad" | "stretch";

const PHOTO_PRESETS: { id: string; label: string; w: number; h: number; unit: Unit; dpi: number; maxKB: number; minKB: number | null }[] = [
  { id: "p200", label: "Photo 200 × 230 px, 20–50 KB", w: 200, h: 230, unit: "px", dpi: 300, maxKB: 50, minKB: 20 },
  { id: "sig", label: "Signature 140 × 60 px, 10–20 KB", w: 140, h: 60, unit: "px", dpi: 300, maxKB: 20, minKB: 10 },
  { id: "p3545", label: "Passport-style 35 × 45 mm at 300 DPI, up to 100 KB", w: 35, h: 45, unit: "mm", dpi: 300, maxKB: 100, minKB: null },
  { id: "sq600", label: "Square 600 × 600 px, up to 100 KB", w: 600, h: 600, unit: "px", dpi: 300, maxKB: 100, minKB: null },
];

const CUSTOM_QUICK = [20, 50, 100, 200, 500];

export default function ImageTargetSize({ toolId, config }: WidgetProps) {
  const id = useId();
  const mode: Mode = config?.mode === "photo" ? "photo" : config?.mode === "custom" || !config?.targetKB ? "custom" : "fixed";
  const fixedKB = Number(config?.targetKB ?? 50);
  const { completed, announce, error: trackError } = useTool();

  const [o, setO] = usePersistentOptions(toolId, {
    base: "1000" as "1000" | "1024",
    format: (config?.format === "jpeg" ? "jpeg" : "auto") as FormatChoice,
    background: "#ffffff",
    grayscale: false,
    allowResize: true,
    maxW: null as number | null,
    maxH: null as number | null,
    value: 100,
    unit: "KB" as "KB" | "MB",
    pw: 200,
    ph: 230,
    punit: "px" as Unit,
    dpi: 300,
    fit: "crop" as Fit,
    maxKB: 50,
    minKB: 20 as number | null,
  });
  const set = <K extends keyof typeof o>(k: K, v: (typeof o)[K]) => setO((p) => ({ ...p, [k]: v }));
  const base = (o.base === "1024" ? 1024 : 1000) as 1000 | 1024;

  const target = useMemo(() => {
    if (mode === "fixed") return { bytes: fixedKB >= 1000 ? targetBytes(fixedKB / 1000, "MB", base) : targetBytes(fixedKB, "KB", base), label: fixedKB >= 1000 ? `${fixedKB / 1000} MB` : `${fixedKB} KB` };
    if (mode === "custom") return { bytes: targetBytes(o.value, o.unit, base), label: `${o.value} ${o.unit}` };
    return { bytes: targetBytes(o.maxKB, "KB", base), label: `${o.maxKB} KB` };
  }, [mode, fixedKB, base, o.value, o.unit, o.maxKB]);

  const photoPx = useMemo(() => {
    if (mode !== "photo") return null;
    return { w: toPixels(o.pw, o.punit, o.dpi), h: toPixels(o.ph, o.punit, o.dpi) };
  }, [mode, o.pw, o.ph, o.punit, o.dpi]);

  const minBytes = mode === "photo" && o.minKB ? targetBytes(o.minKB, "KB", base) : 0;
  const minError = mode === "photo" && o.minKB && o.minKB >= o.maxKB ? "The minimum must be smaller than the maximum." : null;
  const suffix = mode === "photo" && photoPx ? `${photoPx.w}x${photoPx.h}` : target.label.replace(/\s+/g, "").toLowerCase();

  const processor = async (row: Row, ctx: { cancelled: () => boolean }): Promise<OutImage> => {
    const img = await openImage(row.file, { heic: true });
    let src: Opened = img;
    let padded: ReturnType<typeof createCanvas> | null = null;
    try {
      const chosen: OutFormat = o.format === "auto" ? (mode !== "photo" && img.alpha ? "png" : "jpeg") : o.format;
      const rf = await resolveFormat(chosen, img.alpha);
      const fmt = rf.format;
      const notes: string[] = [];
      if (rf.note) notes.push(rf.note);

      // Already under the target, same format, nothing else asked for: keep the original.
      if (
        mode !== "photo" &&
        !row.force &&
        row.file.size <= target.bytes &&
        kindMatches(img.kind, fmt) &&
        !o.grayscale &&
        !o.maxW &&
        !o.maxH
      ) {
        return {
          blob: row.file,
          name: row.file.name,
          width: img.width,
          height: img.height,
          original: true,
          detail: `${formatKB(row.file.size, base)} (${formatInt(row.file.size)} bytes) · ${dims(img.width, img.height)}`,
          info: `Already under ${target.label}. No change needed; the download is your original file.`,
        };
      }

      let width = img.width;
      let height = img.height;
      let crop: Rect | undefined;
      let allowResize = o.allowResize;
      if (mode === "photo" && photoPx) {
        width = photoPx.w;
        height = photoPx.h;
        allowResize = false;
        const aspect = width / height;
        if (o.fit === "crop") crop = centerCropToAspect(img.width, img.height, aspect);
        else if (o.fit === "pad") {
          // Fit the whole photo inside the box and fill the rest with the background color.
          const s = Math.min(width / img.width, height / img.height);
          const dw = Math.max(1, Math.round(img.width * s));
          const dh = Math.max(1, Math.round(img.height * s));
          padded = createCanvas(width, height);
          const x = context(padded);
          x.fillStyle = o.background;
          x.fillRect(0, 0, width, height);
          x.imageSmoothingEnabled = true;
          x.imageSmoothingQuality = "high";
          x.drawImage(img.decoded.source, Math.round((width - dw) / 2), Math.round((height - dh) / 2), dw, dh);
          src = { ...img, decoded: { ...img.decoded, source: padded, width, height }, width, height };
        }
      } else if (o.maxW || o.maxH) {
        const s = Math.min(1, o.maxW ? o.maxW / img.width : 1, o.maxH ? o.maxH / img.height : 1);
        width = Math.max(1, Math.round(img.width * s));
        height = Math.max(1, Math.round(img.height * s));
      }

      const r = await compressToTarget(src, {
        targetBytes: target.bytes,
        format: fmt,
        background: o.background,
        grayscale: o.grayscale,
        allowResize,
        width,
        height,
        crop,
        minBytes: minBytes || undefined,
        cancelled: ctx.cancelled,
      });

      let blob = r.blob;
      if (mode === "photo" && fmt === "jpeg" && o.punit !== "px") {
        const withDpi = await setJpegDpi(blob, o.dpi);
        if (withDpi.size <= target.bytes) blob = withDpi;
      }

      const q = fmt === "png" ? (r.quality ? `PNG, ${r.quality} colors` : "PNG, lossless") : `${FORMAT_LABEL[fmt]} quality ${Math.round(r.quality * 100)}`;
      notes.unshift(q);
      if (r.resized && mode !== "photo") notes.push(`resized from ${img.width} × ${img.height}`);
      if (img.alpha && fmt === "png" && o.format === "auto") notes.push("kept as PNG for transparency");
      if (img.alpha && fmt === "jpeg") notes.push("transparent areas filled");
      if (img.limited) notes.push("very large image scaled to fit browser memory");

      let warn: string | undefined;
      if (!r.ok) {
        warn =
          mode === "photo"
            ? `Can't get under ${target.label} at ${r.width} × ${r.height} px, even at the lowest quality. Raise the KB limit or use smaller dimensions.`
            : `Couldn't reach ${target.label}; this is the smallest result. Tick "Allow smaller dimensions" or choose a larger target.`;
      } else if (r.belowMin && o.minKB) {
        warn = `Below the ${o.minKB} KB minimum even at the highest quality. Increase the dimensions if the form rejects it.`;
      }
      return {
        blob,
        name: outName(row.file, suffix, fmt),
        width: r.width,
        height: r.height,
        detail: `${formatBytes(row.file.size)} → ${formatKB(blob.size, base)} (${formatInt(blob.size)} bytes) · ${dims(r.width, r.height)}`,
        warn,
        info: notes.join(" · "),
      };
    } finally {
      release(padded);
      img.close();
    }
  };

  const batch = useBatch(processor, (rows) => {
    const ok = rows.filter((r) => r.status === "done").length;
    const failed = rows.filter((r) => r.status === "error").length;
    if (ok) completed("compress_target", { files: ok, target_kb: Math.round(target.bytes / 1000) });
    if (failed) trackError("DECODE", "process");
    announce(`${ok} image${ok === 1 ? "" : "s"} ready${failed ? `, ${failed} failed` : ""}`);
  });
  const [selected, setSelected] = useState<string | null>(null);

  const settingsKey = JSON.stringify([target.bytes, o.format, o.background, o.grayscale, o.allowResize, o.maxW, o.maxH, photoPx, o.fit, minBytes, o.dpi]);
  useRerunOnChange(settingsKey, batch.rerun);

  const doneRows = batch.rows.filter((r) => r.status === "done" && r.out);
  const sel = batch.rows.find((r) => r.id === selected && r.out) ?? doneRows[0];

  const sizeFields = (
    <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
      <NumberField label="Max width (optional)" value={o.maxW} onChange={(v) => set("maxW", v)} placeholder="Any" suffix="px" />
      <NumberField label="Max height (optional)" value={o.maxH} onChange={(v) => set("maxH", v)} placeholder="Any" suffix="px" />
    </div>
  );

  return (
    <div className="grid gap-4">
      <FileDrop
        accept={IMAGE_ACCEPT}
        multiple
        pasteImages
        onFiles={batch.add}
        hint="JPG, PNG, WebP, HEIC, AVIF, GIF · up to 100 MB each · or paste with Ctrl+V"
        label="Choose images"
        compact={batch.rows.length > 0}
      />

      <Panel title={mode === "photo" ? "Size and file-size limit" : mode === "fixed" ? `Target: ${target.label} or less` : "Target size"}>
        <div className="grid gap-4 p-3 sm:p-4">
          {mode === "fixed" && (
            <>
              <p className="text-sm text-ink-2">
                Each image is saved at or under <strong className="text-ink">{target.label}</strong> ({formatInt(target.bytes)} bytes). The tool lowers quality first and reduces dimensions only when it has to. Width and height keep their proportions.
              </p>
              {sizeFields}
              <SizeChips current={fixedKB} />
            </>
          )}

          {mode === "custom" && (
            <>
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-36">
                  <NumberField label="Target size" value={o.value} onChange={(v) => v !== null && set("value", v)} min={0.1} max={100000} />
                </div>
                <div>
                  <label htmlFor={`${id}-unit`} className="field-label">
                    Unit
                  </label>
                  <select id={`${id}-unit`} className="select w-24" value={o.unit} onChange={(e) => set("unit", e.target.value as "KB" | "MB")}>
                    <option value="KB">KB</option>
                    <option value="MB">MB</option>
                  </select>
                </div>
                <div className="flex flex-wrap gap-1.5 pb-1" role="group" aria-label="Common targets">
                  {CUSTOM_QUICK.map((v) => (
                    <button key={v} type="button" className="chip" aria-pressed={o.unit === "KB" && o.value === v} onClick={() => setO((p) => ({ ...p, value: v, unit: "KB" }))}>
                      {v} KB
                    </button>
                  ))}
                  <button type="button" className="chip" aria-pressed={o.unit === "MB" && o.value === 1} onClick={() => setO((p) => ({ ...p, value: 1, unit: "MB" }))}>
                    1 MB
                  </button>
                </div>
              </div>
              <p className="text-sm text-ink-3 tabular-nums">
                Target: {formatInt(target.bytes)} bytes. Images already under it are left as they are.
              </p>
              {sizeFields}
            </>
          )}

          {mode === "photo" && (
            <>
              <div>
                <label htmlFor={`${id}-preset`} className="field-label">
                  Start from a common size
                </label>
                <select
                  id={`${id}-preset`}
                  className="select w-full sm:max-w-md"
                  value=""
                  onChange={(e) => {
                    const p = PHOTO_PRESETS.find((x) => x.id === e.target.value);
                    if (p) setO((prev) => ({ ...prev, pw: p.w, ph: p.h, punit: p.unit, dpi: p.dpi, maxKB: p.maxKB, minKB: p.minKB }));
                  }}
                >
                  <option value="">Choose a preset (optional)…</option>
                  {PHOTO_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <p className="field-help">Presets are common sizes, not any particular form&apos;s rules. Always enter the numbers your form asks for.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <NumberField label="Width" value={o.pw} onChange={(v) => v !== null && set("pw", v)} min={0.1} max={20000} />
                <NumberField label="Height" value={o.ph} onChange={(v) => v !== null && set("ph", v)} min={0.1} max={20000} />
                <div>
                  <label htmlFor={`${id}-pu`} className="field-label">
                    Unit
                  </label>
                  <select id={`${id}-pu`} className="select w-full" value={o.punit} onChange={(e) => set("punit", e.target.value as Unit)}>
                    <option value="px">pixels</option>
                    <option value="mm">mm</option>
                    <option value="cm">cm</option>
                    <option value="in">inches</option>
                  </select>
                </div>
                {o.punit !== "px" ? (
                  <NumberField label="DPI" value={o.dpi} onChange={(v) => v !== null && set("dpi", Math.round(v))} min={50} max={1200} />
                ) : (
                  <div />
                )}
              </div>
              {photoPx && (
                <p className="text-sm text-ink-2 tabular-nums">
                  Output: <strong className="text-ink">{photoPx.w} × {photoPx.h} px</strong>
                  {o.punit !== "px" && ` (${o.pw} × ${o.ph} ${o.punit} at ${o.dpi} DPI; the DPI is written into the JPG)`}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
                <NumberField label="Max file size" value={o.maxKB} onChange={(v) => v !== null && set("maxKB", v)} suffix="KB" min={1} max={100000} />
                <NumberField label="Min file size (optional)" value={o.minKB} onChange={(v) => set("minKB", v)} suffix="KB" min={1} max={100000} placeholder="None" error={minError} />
              </div>
              <Segmented
                legend="If the photo's shape is different"
                value={o.fit}
                onChange={(v) => set("fit", v)}
                options={[
                  { value: "crop", label: "Crop to fit" },
                  { value: "pad", label: "Add borders" },
                  { value: "stretch", label: "Stretch" },
                ]}
              />
            </>
          )}

          <details className="group rounded-md border border-line">
            <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-ink">More options: format, KB definition, background</summary>
            <div className="grid gap-4 border-t border-line p-3">
              <div className="flex flex-wrap gap-4">
                <div>
                  <label htmlFor={`${id}-fmt`} className="field-label">
                    Output format
                  </label>
                  <select id={`${id}-fmt`} className="select w-56" value={o.format} onChange={(e) => set("format", e.target.value as FormatChoice)}>
                    <option value="auto">{mode === "photo" ? "Automatic (JPG)" : "Automatic (JPG, or PNG if transparent)"}</option>
                    <option value="jpeg">JPG</option>
                    <option value="png">PNG (keeps transparency)</option>
                    <option value="webp">WebP</option>
                  </select>
                </div>
                <Segmented
                  legend="1 KB equals"
                  value={o.base}
                  onChange={(v) => set("base", v)}
                  options={[
                    { value: "1000", label: "1,000 bytes" },
                    { value: "1024", label: "1,024 bytes" },
                  ]}
                />
              </div>
              <BackgroundField value={o.background} onChange={(v) => set("background", v)} legend="Fill for transparent areas (JPG) and borders" />
              <div className="grid gap-1">
                <Checkbox checked={o.grayscale} onChange={(v) => set("grayscale", v)} label="Black and white (grayscale)" help="Saves bytes on scanned signatures and documents." />
                {mode !== "photo" && (
                  <Checkbox
                    checked={o.allowResize}
                    onChange={(v) => set("allowResize", v)}
                    label="Allow smaller dimensions if needed"
                    help="Off: only quality is lowered, so a small target may not be reachable."
                  />
                )}
              </div>
            </div>
          </details>
        </div>
      </Panel>


      {batch.rows.length > 0 ? (
        <section aria-labelledby={`${id}-res`} className="grid gap-3">
          <h2 id={`${id}-res`} className="sr-only">
            Results
          </h2>
          <BatchBar rows={batch.rows} zipName={`images-${suffix}.zip`} onClear={batch.clear} onStop={batch.stop} busy={batch.busy} />
          <RowList
            rows={batch.rows}
            selected={sel?.id}
            onSelect={setSelected}
            onRemove={batch.remove}
            extra={(r) =>
              r.out?.original ? (
                <Button variant="ghost" onClick={() => batch.retry(r.id, { force: true })}>
                  Re-save
                </Button>
              ) : null
            }
          />
          {sel?.out && (
            <Compare
              before={sel.file}
              after={sel.out.blob}
              beforeInfo={formatBytes(sel.file.size)}
              afterInfo={`${formatKB(sel.out.blob.size, base)} · ${dims(sel.out.width, sel.out.height)}`}
              note={sel.out.warn ?? sel.out.info}
            />
          )}
          {minError && (
            <Alert tone="danger" role="alert">
              {minError}
            </Alert>
          )}
        </section>
      ) : (
        <p className="min-h-10 text-sm text-ink-3">
          Results appear here: each file&apos;s new size in KB and exact bytes, its dimensions, a before/after preview and a download button.
        </p>
      )}
      <p className="text-sm text-ink-3">
        {EXIF_NOTE} 1 KB is counted as {base === 1000 ? "1,000" : "1,024"} bytes{base === 1000 ? ", so results also pass checks that use 1,024" : ""}.
      </p>
    </div>
  );
}
