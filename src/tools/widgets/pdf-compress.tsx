"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { useTool } from "../ui/ToolContext";
import { FileDrop } from "../ui/FileDrop";
import { Alert, Button, Checkbox, Field, Panel, Segmented, StatTile, formatBytes, formatNumber, usePersistentOptions } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { type CancelToken, baseName, errorCode, errorMessage, isCancelled, openForRender, plural, readBytes, toBlob } from "../lib/pdf/core";
import { IMAGE_LEVELS, READABLE_DPI, compressToTarget, hasSelectableText, keepTextCompress, rasterizePdf, type ImageLevel } from "../lib/pdf/raster";
import { OutFileRow, Progress, Thumb, usePdfThumbnails, type OutFile } from "../lib/pdf/ui";

type Mode = "keep" | "raster";
type KeepLevel = "off" | "light" | "medium" | "strong";
type RasterLevel = "high" | "balanced" | "small";

const RASTER: Record<RasterLevel, { dpi: number; quality: number; label: string }> = {
  high: { dpi: 150, quality: 0.7, label: "Sharper (150 DPI)" },
  balanced: { dpi: 110, quality: 0.6, label: "Balanced (110 DPI)" },
  small: { dpi: 72, quality: 0.5, label: "Smallest (72 DPI)" },
};

const KEEP_HELP: Record<KeepLevel, string> = {
  off: "Lossless: removes unused objects, compresses uncompressed data and packs the file structure. Nothing visible changes.",
  light: `Also re-saves photos as JPEG at 80% quality, at most ${IMAGE_LEVELS.light.maxEdge} px on the long side.`,
  medium: `Also re-saves photos as JPEG at 65% quality, at most ${IMAGE_LEVELS.medium.maxEdge} px on the long side. Good for email.`,
  strong: `Also re-saves photos as JPEG at 50% quality, at most ${IMAGE_LEVELS.strong.maxEdge} px on the long side. Photos look softer.`,
};

interface Loaded {
  name: string;
  size: number;
  bytes: Uint8Array;
  pages: number;
  text: boolean;
}

interface Result {
  file: OutFile;
  tone: "success" | "warning";
  title: string;
  notes: string[];
  /** false when the output isn't smaller (download hidden). */
  useful: boolean;
}

const KB = 1000;

export default function PdfCompress({ toolId, config }: WidgetProps) {
  const id = useId();
  const presetKB = typeof config?.targetKB === "number" ? config.targetKB : null;
  const { completed, error: trackError, announce, used } = useTool();
  const [opts, setOpts] = usePersistentOptions(toolId, {
    mode: "keep" as Mode,
    level: "medium" as KeepLevel,
    raster: "balanced" as RasterLevel,
    grey: false,
  });
  const [targetText, setTargetText] = useState(String(presetKB ?? 100));
  const [file, setFile] = useState<Loaded | null>(null);
  const [view, setView] = useState<PDFDocumentProxy | null>(null);
  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ label: string; value: number; max: number } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [resultView, setResultView] = useState<PDFDocumentProxy | null>(null);
  const cancel = useRef<CancelToken>({ cancelled: false });
  const thumbs = usePdfThumbnails(resultView, 160, 3);

  useEffect(() => () => void view?.destroy(), [view]);
  useEffect(() => () => void resultView?.destroy(), [resultView]);

  const target = presetKB !== null ? Math.max(5, Math.round(Number(targetText) || 0)) : null;
  const targetError = presetKB !== null && (!Number(targetText) || Number(targetText) < 5) ? "Enter a size of at least 5 KB." : null;

  const clearResult = () => {
    setResult(null);
    setResultView(null);
  };

  const load = async (files: File[]) => {
    const f = files[0];
    setProblem(null);
    clearResult();
    setLoading(true);
    try {
      const bytes = await readBytes(f);
      const v = await openForRender(bytes, f.name);
      const text = await hasSelectableText(v);
      setView(v);
      setFile({ name: f.name, size: f.size, bytes, pages: v.numPages, text });
      announce(`${f.name} opened, ${plural(v.numPages, "page")}, ${formatBytes(f.size)}`);
    } catch (e) {
      setFile(null);
      setView(null);
      setProblem(errorMessage(e));
      trackError(errorCode(e), "input");
    } finally {
      setLoading(false);
    }
  };

  const finish = async (bytes: Uint8Array, name: string, r: Omit<Result, "file" | "useful">, useful = bytes.length < (file?.size ?? Infinity)) => {
    const out: Result = { ...r, useful, file: { name, blob: toBlob(bytes), detail: file ? `was ${formatBytes(file.size)}` : undefined } };
    setResult(out);
    if (useful) {
      try {
        setResultView(await openForRender(bytes, name));
      } catch {
        setResultView(null);
      }
    }
    announce(`${r.title}. ${formatBytes(bytes.length)}.`);
  };

  const run = async () => {
    if (!file || !view) return;
    used("compress");
    setProblem(null);
    clearResult();
    cancel.current = { cancelled: false };
    const token = cancel.current;
    const base = baseName(file.name);
    try {
      if (target !== null) {
        if (targetError) return;
        const tb = target * KB;
        setProgress({ label: "Preparing…", value: 0, max: 1 });
        const r = await compressToTarget(file.bytes, file.name, view, tb, opts.grey, token, (label, value, max) => setProgress({ label, value, max }));
        const name = `${base}-${target}kb.pdf`;
        if (r.kind === "already") {
          await finish(r.bytes, file.name, {
            tone: "success",
            title: `Already ${formatBytes(file.size)}, under ${target} KB`,
            notes: ["No change needed. You can upload your original file as it is."],
          }, false);
        } else if (r.kind === "kept-text") {
          await finish(r.bytes, name, {
            tone: "success",
            title: `Compressed to ${formatBytes(r.bytes.length)} with text kept`,
            notes: [
              r.level === "off"
                ? "Unused data was removed and the file structure packed; nothing visible changed."
                : `${plural(r.report.imagesRecompressed, "image")} inside the PDF ${r.report.imagesRecompressed === 1 ? "was" : "were"} saved at lower quality (at most ${IMAGE_LEVELS[r.level as Exclude<ImageLevel, "off">].maxEdge} px on the long side). Text, links and fonts are unchanged.`,
              `${formatNumber(r.bytes.length)} bytes, under the ${formatNumber(tb)}-byte limit (1 KB = 1,000 bytes).`,
            ],
          });
        } else {
          const readable = r.dpi >= READABLE_DPI;
          await finish(r.bytes, name, {
            tone: r.reached && readable ? "success" : "warning",
            title: r.reached
              ? `Compressed to ${formatBytes(r.bytes.length)} by converting pages to images`
              : `Couldn't reach ${target} KB. The smallest result is ${formatBytes(r.bytes.length)}`,
            notes: [
              `Pages were rendered at ${r.dpi} DPI with JPEG quality ${Math.round(r.quality * 100)}%. Text is no longer selectable or searchable.`,
              ...(r.reached && !readable ? [`To fit, the resolution had to drop below ${READABLE_DPI} DPI, so small print may be hard to read. Check the preview before you submit it.`] : []),
              ...(!r.reached
                ? [
                    `${plural(file.pages, "page")} at the lowest setting (${r.dpi} DPI) still take more than ${target} KB.`,
                    "To get under the limit: remove pages you don't need with Split PDF, compress each part separately, or ask whether the portal accepts a larger file.",
                  ]
                : []),
              ...(r.reached ? [`${formatNumber(r.bytes.length)} bytes, under the ${formatNumber(tb)}-byte limit (1 KB = 1,000 bytes).`] : []),
            ],
          }, r.bytes.length < file.size);
        }
        completed("compress", { mode: "target", target, reached: r.kind !== "raster" || r.reached });
      } else if (opts.mode === "keep") {
        setProgress({ label: "Optimizing…", value: 0, max: 1 });
        const r = await keepTextCompress(file.bytes, file.name, opts.level as ImageLevel, token, (d, t) =>
          setProgress({ label: `Optimizing objects (${formatNumber(d)} of ${formatNumber(t)})`, value: d, max: t }),
        );
        const saved = file.size - r.bytes.length;
        const smaller = saved > 0;
        const rep = r.report;
        const what = [
          rep.removedObjects ? `${plural(rep.removedObjects, "unused object")} removed` : "",
          rep.deflatedStreams ? `${plural(rep.deflatedStreams, "uncompressed stream")} compressed` : "",
          rep.imagesRecompressed ? `${plural(rep.imagesRecompressed, "image")} re-saved at lower quality` : "",
        ].filter(Boolean);
        await finish(r.bytes, `${base}-compressed.pdf`, {
          tone: smaller && saved / file.size >= 0.05 ? "success" : "warning",
          title: smaller
            ? `${formatBytes(file.size)} → ${formatBytes(r.bytes.length)} (${Math.round((saved / file.size) * 100)}% smaller)`
            : "This PDF can't be made smaller without converting pages to images",
          notes: [
            what.length ? `${what.join(", ")}; file structure packed into compressed object streams.` : "File structure packed into compressed object streams.",
            ...(opts.level === "off" && rep.imagesFound > 0 && (!smaller || saved / file.size < 0.1)
              ? [`The PDF contains ${plural(rep.imagesFound, "image")}. Choose an image compression level to shrink them.`]
              : []),
            ...(!smaller
              ? [
                  file.text
                    ? "It is already compact. Smallest size can reach lower sizes only by turning pages into images, and text-only PDFs often get larger that way."
                    : "It looks like a scan. Try Smallest size, which re-renders each page at a lower resolution.",
                ]
              : []),
            "Text stays selectable and searchable.",
          ],
        });
        completed("compress", { mode: "keep", level: opts.level, saved: Math.max(0, saved) });
      } else {
        const preset = RASTER[opts.raster];
        const r = await rasterizePdf(view, { dpi: preset.dpi, quality: preset.quality, grey: opts.grey }, token, (label, value, max) => setProgress({ label, value, max }));
        const saved = file.size - r.bytes.length;
        await finish(r.bytes, `${base}-compressed.pdf`, {
          tone: saved > 0 ? "success" : "warning",
          title:
            saved > 0
              ? `${formatBytes(file.size)} → ${formatBytes(r.bytes.length)} (${Math.round((saved / file.size) * 100)}% smaller)`
              : `The result (${formatBytes(r.bytes.length)}) is larger than your original`,
          notes: [
            `Each page was rendered at ${preset.dpi} DPI${opts.grey ? " in greyscale" : ""} and saved as a JPEG. Text is no longer selectable or searchable.`,
            ...(r.capped ? ["Some very large pages were rendered at a lower resolution to stay within browser memory limits."] : []),
            ...(saved <= 0 ? ["Text-only PDFs are usually smaller as text than as pictures of text. Use Keep text instead."] : []),
          ],
        });
        completed("compress", { mode: "raster", dpi: preset.dpi });
      }
    } catch (e) {
      if (isCancelled(e)) announce("Compression cancelled");
      else {
        setProblem(errorMessage(e, "The PDF couldn't be compressed. The file may be damaged."));
        trackError(errorCode(e), "process");
      }
    } finally {
      setProgress(null);
    }
  };

  const rasterWarning = (
    <Alert tone="warning" title="Pages will become images">
      Text won&apos;t be selectable, searchable or readable by screen readers, and links, bookmarks and form fields are removed. Keep your original file.
    </Alert>
  );

  return (
    <div className="grid gap-4">
      {!file ? (
        <FileDrop accept=".pdf,application/pdf" onFiles={load} hint="One PDF · up to 100 MB · processed on your device" label="Choose PDF" />
      ) : (
        <Panel
          title={file.name}
          actions={
            <Button
              variant="ghost"
              icon="rotate-ccw"
              onClick={() => {
                setFile(null);
                setView(null);
                clearResult();
                setProblem(null);
              }}
            >
              Choose another PDF
            </Button>
          }
          footer={
            <>
              <span>{formatBytes(file.size)}</span>
              <span>{plural(file.pages, "page")}</span>
              <span>{file.text ? "Has selectable text" : "No selectable text (looks scanned)"}</span>
            </>
          }
        >
          <div className="grid gap-4 p-3 sm:p-4">
            {target !== null ? (
              <>
                <div className="flex flex-wrap items-end gap-4">
                  <Field label="Target size (KB)" htmlFor={`${id}-t`} error={targetError} help="1 KB = 1,000 bytes, so the result also passes forms that count 1,024.">
                    <input
                      id={`${id}-t`}
                      type="number"
                      inputMode="numeric"
                      min={5}
                      className="input w-36"
                      value={targetText}
                      onChange={(e) => {
                        setTargetText(e.target.value);
                        clearResult();
                      }}
                    />
                  </Field>
                  <div className="pb-1">
                    <Checkbox
                      checked={opts.grey}
                      onChange={(v) => {
                        setOpts((o) => ({ ...o, grey: v }));
                        clearResult();
                      }}
                      label="Greyscale"
                      help="Smaller when pages have to be converted to images"
                    />
                  </div>
                </div>
                {file.size <= (target ?? 0) * KB ? (
                  <Alert tone="success">This file is already under {target} KB. You don&apos;t need to compress it.</Alert>
                ) : (
                  <Alert tone="info" title="How the target is reached">
                    {file.text
                      ? `First the tool tries to keep the text and only shrink images inside the PDF. If that can't reach ${target} KB, every page is converted to an image at the highest resolution that fits, and text is no longer selectable.`
                      : `This PDF has no selectable text, so if shrinking its images isn't enough, pages are re-rendered as images at the highest resolution that fits ${target} KB.`}
                  </Alert>
                )}
              </>
            ) : (
              <>
                <Segmented<Mode>
                  legend="Compression mode"
                  value={opts.mode}
                  onChange={(m) => {
                    setOpts((o) => ({ ...o, mode: m }));
                    clearResult();
                  }}
                  options={[
                    { value: "keep", label: "Keep text" },
                    { value: "raster", label: "Smallest size" },
                  ]}
                />
                {opts.mode === "keep" ? (
                  <div className="grid gap-2">
                    <Segmented<KeepLevel>
                      legend="Image compression"
                      value={opts.level}
                      onChange={(v) => {
                        setOpts((o) => ({ ...o, level: v }));
                        clearResult();
                      }}
                      options={[
                        { value: "off", label: "None" },
                        { value: "light", label: "Light" },
                        { value: "medium", label: "Medium" },
                        { value: "strong", label: "Strong" },
                      ]}
                    />
                    <p className="text-sm text-ink-3">{KEEP_HELP[opts.level]}</p>
                    {!file.text && <p className="text-sm text-ink-2">This PDF looks scanned, so Smallest size usually saves more and loses nothing you could select.</p>}
                  </div>
                ) : (
                  <div className="grid gap-3">
                    <div className="flex flex-wrap items-end gap-4">
                      <Segmented<RasterLevel>
                        legend="Page image quality"
                        value={opts.raster}
                        onChange={(v) => {
                          setOpts((o) => ({ ...o, raster: v }));
                          clearResult();
                        }}
                        options={(Object.keys(RASTER) as RasterLevel[]).map((k) => ({ value: k, label: RASTER[k].label }))}
                      />
                      <Checkbox
                        checked={opts.grey}
                        onChange={(v) => {
                          setOpts((o) => ({ ...o, grey: v }));
                          clearResult();
                        }}
                        label="Greyscale"
                      />
                    </div>
                    {rasterWarning}
                  </div>
                )}
              </>
            )}
          </div>
        </Panel>
      )}
      {loading && <p className="text-sm text-ink-3">Opening PDF…</p>}

      {file && (
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" size="md" icon="download" disabled={!!progress || !!targetError || (target !== null && file.size <= target * KB)} onClick={run}>
            {target !== null ? `Compress to ${target || "…"} KB` : "Compress PDF"}
          </Button>
          {file.pages > 60 && (target !== null || opts.mode === "raster") && (
            <span className="text-sm text-ink-3">Long documents can take a minute; you can cancel at any time.</span>
          )}
        </div>
      )}

      {progress && <Progress {...progress} onCancel={() => (cancel.current.cancelled = true)} />}
      {problem && (
        <Alert tone="danger" role="alert">
          {problem}
        </Alert>
      )}

      <div className="min-h-0" aria-live="off">
        {result && file && (
          <Panel tone="accent" title="Result">
            <div className="grid gap-4 p-3 sm:p-4">
              <Alert tone={result.tone} role="status" title={result.title}>
                <ul className="grid gap-1">
                  {result.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </Alert>
              {result.useful && (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <StatTile label="Before" value={formatBytes(file.size)} />
                    <StatTile label="After" value={formatBytes(result.file.blob.size)} />
                    <StatTile label="Change" value={`−${Math.round(((file.size - result.file.blob.size) / file.size) * 100)}%`} />
                  </div>
                  <ul>
                    <OutFileRow file={result.file} primary />
                  </ul>
                  {resultView && (
                    <div>
                      <p className="mb-2 text-sm font-semibold text-ink">Preview of the compressed file{file.pages > 3 ? " (first 3 pages)" : ""}</p>
                      <ul className="grid max-w-xl grid-cols-3 gap-2">
                        {Array.from({ length: Math.min(3, file.pages) }, (_, i) => (
                          <li key={i}>
                            <Thumb url={thumbs[i]} alt={`Compressed page ${i + 1}`} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}
