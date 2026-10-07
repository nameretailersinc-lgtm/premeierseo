"use client";

/*
 * Format converter. config.from (hint/accept only — input is detected from its bytes) and config.to:
 *   to "jpeg" | "png" | "webp" → re-encode (JPG gets a background color for transparent areas)
 *   to "ico"                    → multi-size .ico with PNG entries
 * SVG input is rasterised at the requested size (sharp at any scale). HEIC uses the browser's decoder
 * where available (Safari) and a lazily loaded decoder elsewhere.
 */

import { useId, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { FileDrop } from "../ui/FileDrop";
import { Checkbox, Panel, Segmented, formatBytes, usePersistentOptions } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { ImageError, canvasToBlob, centerCropToAspect, createCanvas, context, drawScaled, yieldToMain, type AnyCanvas, type OutFormat } from "../lib/image/canvas";
import { loadSvgAt, svgSize } from "../lib/image/decode";
import { encodeCanvas, heicExif, insertJpegExif, jpegExif } from "../lib/image/encode";
import { buildIco } from "../lib/image/files";
import { openImage, outName, release, resolveFormat, FORMAT_LABEL, KIND_LABEL } from "../lib/image/ops";
import { sniffFile } from "../lib/image/sniff";
import { formatInt } from "../lib/image/target";
import {
  BackgroundField,
  BatchBar,
  Compare,
  NumberField,
  RangeNumber,
  RowList,
  dims,
  useBatch,
  useRerunOnChange,
  type OutImage,
  type Row,
} from "../lib/image/ui";

type To = "jpeg" | "png" | "webp" | "ico";
type From = "png" | "jpg" | "webp" | "heic" | "avif" | "svg" | "any";

const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];

const ACCEPT: Record<From, string> = {
  png: "image/png,.png,image/*,.heic,.heif,.avif",
  jpg: "image/jpeg,.jpg,.jpeg,image/*,.heic,.heif,.avif",
  webp: "image/webp,.webp,image/*,.avif",
  heic: ".heic,.heif,image/heic,image/heif,image/*",
  avif: ".avif,image/avif,image/*",
  svg: ".svg,image/svg+xml",
  any: "image/*,.heic,.heif,.avif,.svg",
};
const HINT: Record<From, string> = {
  png: "PNG files (other images work too)",
  jpg: "JPG or JPEG files (other images work too)",
  webp: "WebP files (other images work too)",
  heic: "HEIC or HEIF photos from an iPhone or iPad",
  avif: "AVIF files",
  svg: "SVG files",
  any: "PNG, JPG, WebP, SVG and other images",
};

export default function ImageConvert({ toolId, config }: WidgetProps) {
  const id = useId();
  const to: To = (["jpeg", "png", "webp", "ico"].includes(String(config?.to)) ? config?.to : "png") as To;
  const from: From = (["png", "jpg", "webp", "heic", "avif", "svg"].includes(String(config?.from)) ? config?.from : "any") as From;
  const { completed, announce } = useTool();
  const [o, setO] = usePersistentOptions(toolId, {
    quality: 90,
    background: to === "jpeg" ? "#ffffff" : "transparent",
    keepExif: false,
    svgMode: "scale" as "scale" | "width",
    svgScale: 2,
    svgWidth: 1024 as number | null,
    icoSizes: [16, 32, 48] as number[],
    icoFit: "contain" as "contain" | "cover",
  });
  const set = <K extends keyof typeof o>(k: K, v: (typeof o)[K]) => setO((p) => ({ ...p, [k]: v }));

  const encodeTo = async (c: AnyCanvas, fmt: OutFormat): Promise<Blob> => {
    if (fmt === "png") return canvasToBlob(c, "image/png");
    return encodeCanvas(c, fmt, o.quality / 100);
  };

  const toIco = async (row: Row): Promise<OutImage> => {
    const img = await openImage(row.file, { heic: false });
    try {
      const sizes = [...o.icoSizes].sort((a, b) => a - b);
      if (!sizes.length) throw new ImageError("NO_SIZES", "Choose at least one icon size.");
      const crop = o.icoFit === "cover" ? centerCropToAspect(img.width, img.height, 1) : undefined;
      const entries: { size: number; png: Uint8Array }[] = [];
      for (const s of sizes) {
        await yieldToMain();
        let c: AnyCanvas;
        if (crop || img.width === img.height) {
          c = drawScaled(img.decoded.source, img.width, img.height, s, s, { crop });
        } else {
          // Fit inside a transparent square.
          const k = Math.min(s / img.width, s / img.height);
          const inner = drawScaled(img.decoded.source, img.width, img.height, Math.max(1, Math.round(img.width * k)), Math.max(1, Math.round(img.height * k)));
          c = createCanvas(s, s);
          context(c).drawImage(inner, Math.round((s - inner.width) / 2), Math.round((s - inner.height) / 2));
          release(inner);
        }
        const png = new Uint8Array(await (await canvasToBlob(c, "image/png")).arrayBuffer());
        release(c);
        entries.push({ size: s, png });
      }
      const blob = new Blob([buildIco(entries) as BlobPart], { type: "image/x-icon" });
      return {
        blob,
        name: outName(row.file, "", "ico"),
        width: sizes[sizes.length - 1],
        height: sizes[sizes.length - 1],
        detail: `${formatBytes(row.file.size)} → ${formatBytes(blob.size)} · ${sizes.join(", ")} px`,
        info: img.width !== img.height ? (o.icoFit === "cover" ? "Not square: cropped to the center" : "Not square: centered on a transparent square") : "Transparency kept",
      };
    } finally {
      img.close();
    }
  };

  const fromSvg = async (row: Row, fmt: OutFormat): Promise<OutImage> => {
    const text = await row.file.text();
    const size = svgSize(text);
    if (!size.doc) throw new ImageError("SVG_INVALID", "This SVG file couldn't be read. It may be damaged or not a valid SVG.");
    const k = o.svgMode === "width" && o.svgWidth ? o.svgWidth / size.width : o.svgScale;
    const W = Math.max(1, Math.round(size.width * k));
    const H = Math.max(1, Math.round(size.height * k));
    if (W * H > 50_000_000) throw new ImageError("TOO_LARGE", `${W} × ${H} px is too large to render. Choose a smaller width or scale.`);
    const d = await loadSvgAt(text, W, H);
    try {
      const c = createCanvas(W, H);
      const x = context(c);
      const bg = fmt === "jpeg" && o.background === "transparent" ? "#ffffff" : o.background;
      if (bg !== "transparent") {
        x.fillStyle = bg;
        x.fillRect(0, 0, W, H);
      }
      x.drawImage(d.source, 0, 0, W, H);
      const blob = await encodeTo(c, fmt);
      release(c);
      return {
        blob,
        name: outName(row.file, "", fmt),
        width: W,
        height: H,
        detail: `${formatBytes(row.file.size)} → ${formatBytes(blob.size)} · ${dims(W, H)}`,
        info: `Rendered at ${Math.round(k * 100) / 100}× the SVG's own size (${Math.round(size.width)} × ${Math.round(size.height)})`,
      };
    } finally {
      d.close();
    }
  };

  const processor = async (row: Row): Promise<OutImage> => {
    if (to === "ico") return toIco(row);
    const kind = await sniffFile(row.file);
    const rf = await resolveFormat(to, true);
    const fmt = rf.format;
    if (kind === "svg") return fromSvg(row, fmt);

    // iOS often converts HEIC to JPEG when a photo is shared or uploaded: nothing to convert.
    if (fmt === "jpeg" && kind === "jpeg" && from === "heic") {
      return {
        blob: row.file,
        name: outName(row.file, "", "jpeg"),
        original: true,
        detail: `${formatBytes(row.file.size)} · already a JPG`,
        info: "This file is already a JPG inside (your phone converted it when sharing), so it is saved unchanged with a .jpg name.",
      };
    }

    const img = await openImage(row.file, { heic: true });
    try {
      const bg = fmt === "jpeg" ? (o.background === "transparent" ? "#ffffff" : o.background) : o.background === "transparent" ? null : o.background;
      const c = drawScaled(img.decoded.source, img.width, img.height, img.width, img.height, { background: bg });
      await yieldToMain();
      let blob = await encodeTo(c, fmt);
      release(c);
      const notes: string[] = [];
      if (rf.note) notes.push(rf.note);
      if (fmt === "jpeg" && o.keepExif && (kind === "heic" || kind === "jpeg")) {
        const buf = await row.file.arrayBuffer();
        const tiff = kind === "heic" ? heicExif(buf) : jpegExif(buf);
        if (tiff) {
          blob = await insertJpegExif(blob, tiff);
          notes.push("EXIF kept (date, camera, location)");
        } else notes.push("no EXIF found to keep");
      } else notes.push("EXIF removed");
      if (img.alpha && fmt === "jpeg") notes.push("transparent areas filled");
      if (img.alpha && fmt !== "jpeg" && bg === null) notes.push("transparency kept");
      if (kind === "gif" || (kind === "webp" && from === "webp")) {
        // Animated GIF/WebP: the browser decoder returns the first frame only.
        notes.push("animated files: first frame only");
      }
      if (img.limited) notes.push("very large image scaled to fit browser memory");
      const label = `${KIND_LABEL[img.kind] ?? "Image"} → ${FORMAT_LABEL[fmt]}`;
      return {
        blob,
        name: outName(row.file, "", fmt),
        width: img.width,
        height: img.height,
        detail: `${label} · ${formatBytes(row.file.size)} → ${formatBytes(blob.size)} · ${dims(img.width, img.height)}`,
        info: notes.join(" · "),
      };
    } finally {
      img.close();
    }
  };

  const batch = useBatch(processor, (rows) => {
    const ok = rows.filter((r) => r.status === "done").length;
    const failed = rows.filter((r) => r.status === "error").length;
    if (ok) completed("convert", { files: ok, to });
    announce(`${ok} file${ok === 1 ? "" : "s"} converted${failed ? `, ${failed} failed` : ""}`);
  });
  const [selected, setSelected] = useState<string | null>(null);
  useRerunOnChange(JSON.stringify([o.quality, o.background, o.keepExif, o.svgMode, o.svgScale, o.svgWidth, o.icoSizes, o.icoFit]), batch.rerun);

  const doneRows = batch.rows.filter((r) => r.status === "done" && r.out);
  const sel = batch.rows.find((r) => r.id === selected && r.out) ?? doneRows[0];
  const toLabel = to === "ico" ? "ICO" : FORMAT_LABEL[to];

  return (
    <div className="grid gap-4">
      <FileDrop
        accept={ACCEPT[from]}
        multiple
        pasteImages={from !== "svg"}
        onFiles={batch.add}
        hint={`${HINT[from]} · up to 100 MB each · add several at once`}
        label={from === "svg" ? "Choose SVG files" : "Choose images"}
        compact={batch.rows.length > 0}
      />

      <Panel title={`Convert to ${toLabel}`}>
        <div className="grid gap-4 p-3 sm:p-4">
          {(to === "jpeg" || to === "webp") && (
            <RangeNumber
              label={`${toLabel} quality`}
              value={o.quality}
              onChange={(v) => set("quality", v)}
              min={10}
              max={100}
              unit="%"
              valueText={(v) => `${v} percent quality`}
              leftHint="Smaller file"
              rightHint="Better quality"
              help={to === "jpeg" ? "85–92 looks the same as the original for most photos." : undefined}
            />
          )}
          {to === "jpeg" && <BackgroundField value={o.background === "transparent" ? "#ffffff" : o.background} onChange={(v) => set("background", v)} />}
          {(to === "png" || to === "webp") && from === "svg" && (
            <BackgroundField value={o.background} onChange={(v) => set("background", v)} legend="Background" allowTransparent />
          )}
          {from === "svg" && (
            <div className="grid gap-3">
              <Segmented
                legend="Output size"
                value={o.svgMode}
                onChange={(v) => set("svgMode", v)}
                options={[
                  { value: "scale", label: "Scale" },
                  { value: "width", label: "Width in pixels" },
                ]}
              />
              {o.svgMode === "scale" ? (
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Scale">
                  {[1, 2, 3, 4, 8].map((s) => (
                    <button key={s} type="button" className="chip" aria-pressed={o.svgScale === s} onClick={() => set("svgScale", s)}>
                      {s}×
                    </button>
                  ))}
                </div>
              ) : (
                <div className="w-44">
                  <NumberField label="Width" value={o.svgWidth} onChange={(v) => set("svgWidth", v)} suffix="px" max={16000} help="Height follows the SVG's proportions." />
                </div>
              )}
            </div>
          )}
          {from === "heic" && to === "jpeg" && (
            <Checkbox
              checked={o.keepExif}
              onChange={(v) => set("keepExif", v)}
              label="Keep photo details (EXIF: date taken, camera, location)"
              help="Off by default: shared photos then don't reveal where they were taken."
            />
          )}
          {to === "ico" && (
            <div className="grid gap-3">
              <fieldset>
                <legend className="field-label">Sizes inside the .ico file</legend>
                <div className="flex flex-wrap gap-x-4">
                  {ICO_SIZES.map((s) => (
                    <Checkbox
                      key={s}
                      checked={o.icoSizes.includes(s)}
                      onChange={(v) => set("icoSizes", v ? [...o.icoSizes, s] : o.icoSizes.filter((x) => x !== s))}
                      label={`${s} × ${s}`}
                    />
                  ))}
                </div>
                <p className="field-help">Favicons: 16, 32 and 48. Windows app and desktop icons: add 256.</p>
              </fieldset>
              <Segmented
                legend="If the image isn't square"
                value={o.icoFit}
                onChange={(v) => set("icoFit", v)}
                options={[
                  { value: "contain", label: "Fit (transparent edges)" },
                  { value: "cover", label: "Crop to square" },
                ]}
              />
            </div>
          )}
          {to === "png" && from !== "svg" && (
            <p className="text-sm text-ink-3">PNG is lossless: pixels are copied exactly. Transparent areas stay transparent; conversion can&apos;t add transparency that isn&apos;t in the original.</p>
          )}
        </div>
      </Panel>

      {batch.rows.length > 0 ? (
        <section aria-labelledby={`${id}-res`} className="grid gap-3">
          <h2 id={`${id}-res`} className="sr-only">
            Converted files
          </h2>
          <BatchBar rows={batch.rows} zipName={`converted-${to === "jpeg" ? "jpg" : to}.zip`} onClear={batch.clear} onStop={batch.stop} busy={batch.busy} />
          <RowList rows={batch.rows} selected={sel?.id} onSelect={setSelected} onRemove={batch.remove} />
          {sel?.out && (
            <Compare
              before={sel.file}
              after={sel.out.blob}
              beforeInfo={`${formatBytes(sel.file.size)} (${formatInt(sel.file.size)} bytes)`}
              afterInfo={`${formatBytes(sel.out.blob.size)}${sel.out.width ? ` · ${dims(sel.out.width, sel.out.height)}` : ""}`}
              afterLabel={toLabel}
              note={sel.out.warn ?? sel.out.info}
            />
          )}
        </section>
      ) : (
        <p className="min-h-10 text-sm text-ink-3">Converted files appear here with their size, a preview and a download button. Several files can be downloaded together as a ZIP.</p>
      )}
      <p className="text-sm text-ink-3">
        Files are converted in your browser and never uploaded.
        {to === "jpeg" && from === "heic" ? " Location and camera details are removed unless you tick the option above." : to !== "ico" ? " Location and camera details (EXIF) are not copied to the new file." : ""}
      </p>
    </div>
  );
}
