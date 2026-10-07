"use client";

/*
 * Raster → SVG. "Trace" converts color regions into real vector paths with imagetracerjs (in a worker,
 * loaded on first use). "Embed" wraps the original image in an SVG file (not a vector) for tools that need
 * an .svg container. config.from: "jpg" | "png" sets the defaults and the file hint.
 */

import { useEffect, useId, useRef, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { FileDrop } from "../ui/FileDrop";
import { Alert, Button, CopyButton, Panel, Segmented, downloadBlob, formatBytes, usePersistentOptions } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { canvasToBlob, context, drawScaled } from "../lib/image/canvas";
import { openImage, release, type Opened } from "../lib/image/ops";
import { baseName } from "../lib/image/sniff";
import { ImageWorker, WorkerCancelled } from "../lib/image/worker-client";
import { BlobImage, CHECKER_STYLE, ErrorText, Progress, RangeNumber, errorOf } from "../lib/image/ui";

type Mode = "trace" | "embed";
interface Settings {
  colors: number;
  detail: number;
  speck: number;
  blur: number;
  bw: boolean;
  threshold: number;
  res: number;
}

const PRESETS: { id: string; label: string; s: Partial<Settings> }[] = [
  { id: "logo", label: "Logo or icon", s: { colors: 8, detail: 3, speck: 8, blur: 0, bw: false } },
  { id: "line", label: "Line art (black and white)", s: { colors: 2, detail: 3, speck: 4, blur: 0, bw: true, threshold: 128 } },
  { id: "detailed", label: "Detailed illustration", s: { colors: 32, detail: 4, speck: 2, blur: 0, bw: false } },
  { id: "photo", label: "Posterized photo", s: { colors: 16, detail: 2, speck: 16, blur: 2, bw: false } },
];
const DETAIL = [2, 1, 0.5, 0.25, 0.1];

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/** Tidy imagetracer output: drop fully transparent paths, set size + viewBox, remove the generator attribute. */
function finishSvg(svg: string, w: number, h: number): { svg: string; paths: number } {
  let out = svg.replace(/<path[^>]*opacity="0"[^>]*\/>/g, "");
  out = out.replace(/<svg [^>]*>/, `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`);
  const paths = (out.match(/<path/g) ?? []).length;
  return { svg: out, paths };
}

export default function ImageToSvg({ toolId, config }: WidgetProps) {
  const id = useId();
  const from = config?.from === "png" ? "png" : "jpg";
  const { used, completed, announce, error: trackError } = useTool();
  const [o, setO] = usePersistentOptions(toolId, {
    mode: "trace" as Mode,
    preset: "logo",
    colors: from === "png" ? 8 : 16,
    detail: 3,
    speck: 8,
    blur: from === "png" ? 0 : 1,
    bw: false,
    threshold: 128,
    res: 800,
  });
  const set = <K extends keyof typeof o>(k: K, v: (typeof o)[K]) => setO((p) => ({ ...p, [k]: v, preset: k === "mode" || k === "res" ? p.preset : "custom" }));
  const [img, setImg] = useState<Opened | null>(null);
  const [result, setResult] = useState<{ svg: string; blob: Blob; paths: number; ms: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<{ message: string; link?: { href: string; anchor: string } } | null>(null);
  const worker = useRef<ImageWorker | null>(null);

  useEffect(() => {
    const w = new ImageWorker();
    worker.current = w;
    return () => w.dispose();
  }, []);
  useEffect(() => () => img?.close(), [img]);

  const load = async (files: File[]) => {
    setProblem(null);
    setResult(null);
    try {
      const im = await openImage(files[0], { heic: false });
      setImg(im);
      announce(`Image loaded, ${im.width} by ${im.height} pixels. Tracing…`);
    } catch (e) {
      const err = errorOf(e);
      setProblem(err);
      trackError(err.code, "input");
    }
  };

  const key = JSON.stringify([o.mode, o.colors, o.detail, o.speck, o.blur, o.bw, o.threshold, o.res]);
  useEffect(() => {
    if (!img) return;
    let stop = false;
    const t = setTimeout(async () => {
      const t0 = performance.now();
      setBusy(true);
      setProblem(null);
      try {
        if (o.mode === "embed") {
          const passthrough = ["jpeg", "png", "webp", "gif"].includes(img.kind);
          const blob = passthrough ? img.file : await canvasToBlob(drawScaled(img.decoded.source, img.width, img.height, img.width, img.height), "image/png");
          const mime = passthrough ? (img.kind === "jpeg" ? "image/jpeg" : `image/${img.kind}`) : "image/png";
          const b64 = toBase64(new Uint8Array(await blob.arrayBuffer()));
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${img.width}" height="${img.height}" viewBox="0 0 ${img.width} ${img.height}"><image width="${img.width}" height="${img.height}" href="data:${mime};base64,${b64}"/></svg>`;
          if (!stop) setResult({ svg, blob: new Blob([svg], { type: "image/svg+xml" }), paths: 0, ms: performance.now() - t0 });
          return;
        }
        const s = Math.min(1, o.res / Math.max(img.width, img.height));
        const tw = Math.max(1, Math.round(img.width * s));
        const th = Math.max(1, Math.round(img.height * s));
        const c = drawScaled(img.decoded.source, img.width, img.height, tw, th);
        const data = context(c, { willReadFrequently: true }).getImageData(0, 0, tw, th);
        release(c);
        if (o.bw) {
          const p = data.data;
          for (let i = 0; i < p.length; i += 4) {
            const l = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
            const v = l < o.threshold ? 0 : 255;
            p[i] = p[i + 1] = p[i + 2] = v;
          }
        }
        const d = DETAIL[Math.max(0, Math.min(4, o.detail - 1))];
        const options = {
          numberofcolors: o.bw ? 2 : o.colors,
          colorsampling: o.bw ? 0 : 2,
          colorquantcycles: 3,
          ltres: d,
          qtres: d,
          pathomit: o.speck,
          blurradius: o.blur,
          blurdelta: 20,
          rightangleenhance: true,
          strokewidth: 1,
          roundcoords: 1,
          scale: img.width / tw,
          viewbox: false,
        };
        worker.current?.cancel();
        const raw = await (worker.current ?? new ImageWorker()).trace(data.data.buffer as ArrayBuffer, tw, th, options);
        if (stop) return;
        const fin = finishSvg(raw, img.width, img.height);
        setResult({ svg: fin.svg, blob: new Blob([fin.svg], { type: "image/svg+xml" }), paths: fin.paths, ms: performance.now() - t0 });
        used("trace");
        announce(`Traced into ${fin.paths} paths`);
      } catch (e) {
        if (e instanceof WorkerCancelled || stop) return;
        const err = errorOf(e);
        setProblem({ message: err.code === "PROCESSING" ? "Tracing failed. Try fewer colors or a lower resolution." : err.message, link: err.link });
        trackError("TRACE_FAILED", "process");
      } finally {
        if (!stop) setBusy(false);
      }
    }, 450);
    return () => {
      stop = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` covers every option used above
  }, [img, key]);

  const name = `${baseName(img?.file.name ?? "image")}.svg`;
  const big = result && result.blob.size > 1_000_000;

  return (
    <div className="grid gap-4">
      <FileDrop
        accept={from === "png" ? "image/png,.png,image/*" : "image/jpeg,.jpg,.jpeg,image/*"}
        pasteImages
        onFiles={load}
        hint={`${from === "png" ? "PNG" : "JPG or JPEG"} (other images work too) · logos, icons and line art trace best`}
        label={img ? "Choose another image" : "Choose image"}
        compact={!!img}
      />
      {problem && (
        <Alert tone="danger" role="alert">
          <ErrorText message={problem.message} link={problem.link} />
        </Alert>
      )}

      <Panel title="Conversion">
        <div className="grid gap-4 p-3 sm:p-4">
          <Segmented
            legend="Output"
            value={o.mode}
            onChange={(v) => set("mode", v)}
            options={[
              { value: "trace", label: "Vector paths (traced)" },
              { value: "embed", label: "Embedded image (not vector)" },
            ]}
          />
          {o.mode === "trace" ? (
            <>
              <div>
                <p className="field-label" id={`${id}-pre`}>
                  Preset
                </p>
                <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby={`${id}-pre`}>
                  {PRESETS.map((p) => (
                    <button key={p.id} type="button" className="chip" aria-pressed={o.preset === p.id} onClick={() => setO((prev) => ({ ...prev, ...p.s, preset: p.id }))}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {o.bw ? (
                  <RangeNumber label="Black/white threshold" value={o.threshold} onChange={(v) => set("threshold", v)} min={1} max={254} help="Pixels darker than this become black." />
                ) : (
                  <RangeNumber label="Colors" value={o.colors} onChange={(v) => set("colors", v)} min={2} max={64} help="Fewer colors: simpler, smaller SVG." />
                )}
                <RangeNumber label="Detail" value={o.detail} onChange={(v) => set("detail", v)} min={1} max={5} valueText={(v) => `detail ${v} of 5`} leftHint="Smoother" rightHint="Closer to the pixels" />
                <RangeNumber label="Remove specks smaller than" value={o.speck} onChange={(v) => set("speck", v)} min={0} max={64} unit=" px" help="Drops tiny shapes caused by noise or JPG artifacts." />
                <RangeNumber label="Blur before tracing" value={o.blur} onChange={(v) => set("blur", v)} min={0} max={5} help="1–2 smooths JPG noise and photo grain." />
              </div>
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label htmlFor={`${id}-res`} className="field-label">
                    Tracing resolution
                  </label>
                  <select id={`${id}-res`} className="select w-56" value={o.res} onChange={(e) => set("res", Number(e.target.value))}>
                    <option value={400}>Fast (400 px)</option>
                    <option value={800}>Standard (800 px)</option>
                    <option value={1200}>High (1,200 px)</option>
                    <option value={2000}>Very high (2,000 px, slow)</option>
                  </select>
                </div>
                <label className="inline-flex items-center gap-2 pb-2 text-base">
                  <input type="checkbox" className="size-[1.125rem]" checked={o.bw} onChange={(e) => set("bw", e.target.checked)} />
                  Black and white only
                </label>
              </div>
            </>
          ) : (
            <Alert tone="info">
              Embedding wraps your image in an SVG file. It is still made of pixels: it won&apos;t scale up sharply and can&apos;t be edited as shapes. Use it only when a program insists on an .svg file.
            </Alert>
          )}
        </div>
      </Panel>

      {busy && img && <Progress label={o.mode === "trace" ? "Tracing… larger images and more colors take longer." : "Building the SVG…"} value={1} max={2} onCancel={() => worker.current?.cancel()} />}

      <Panel
        title="Preview"
        actions={
          result && (
            <>
              <CopyButton text={() => result.svg} label="Copy SVG code" />
              <Button
                variant="primary"
                icon="download"
                onClick={() => {
                  downloadBlob(result.blob, name);
                  completed("download", { mode: o.mode, paths: result.paths });
                }}
              >
                Download SVG
              </Button>
            </>
          )
        }
        footer={
          result && (
            <>
              <span>{formatBytes(result.blob.size)} SVG</span>
              {o.mode === "trace" && <span>{result.paths.toLocaleString("en-US")} paths</span>}
              {o.mode === "trace" && <span>{o.bw ? 2 : o.colors} colors</span>}
              <span>{Math.round(result.ms)} ms</span>
            </>
          )
        }
      >
        <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4">
          <div className="min-w-0">
            <div className="flex h-64 items-center justify-center overflow-hidden rounded-md border border-line sm:h-80" style={CHECKER_STYLE}>
              {img ? <BlobImage blob={img.file} alt="Original image" className="max-h-full max-w-full object-contain" /> : <span className="text-sm text-ink-3">No image yet</span>}
            </div>
            <p className="mt-1 text-sm text-ink-2">Original{img ? ` · ${img.width} × ${img.height} px · ${formatBytes(img.file.size)}` : ""}</p>
          </div>
          <div className="min-w-0">
            <div className="flex h-64 items-center justify-center overflow-hidden rounded-md border border-line sm:h-80" style={CHECKER_STYLE}>
              {result ? <BlobImage blob={result.blob} alt="SVG result" className="max-h-full max-w-full object-contain" /> : <span className="text-sm text-ink-3">{img ? "Working…" : "The SVG appears here"}</span>}
            </div>
            <p className="mt-1 text-sm text-ink-2">{o.mode === "trace" ? "Traced SVG" : "SVG with embedded image"}</p>
          </div>
        </div>
      </Panel>
      {big && (
        <Alert tone="warning">
          This SVG is {formatBytes(result.blob.size)}. Large traced files are slow to open and edit; reduce the colors, lower the detail or raise &ldquo;Remove specks&rdquo;.
        </Alert>
      )}
      <p className="text-sm text-ink-3">Tracing runs in your browser; the image is not uploaded. Photos become flat, posterized shapes: tracing suits logos, icons, signatures and line art.</p>
    </div>
  );
}
