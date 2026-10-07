"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { useTool } from "../ui/ToolContext";
import { FileDrop } from "../ui/FileDrop";
import { Alert, Button, Checkbox, Panel, Segmented, StatTile, formatBytes, usePersistentOptions } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { type CancelToken, baseName, canvasToBlob, errorCode, errorMessage, isCancelled, openForRender, plural, releaseCanvas, toBlob } from "../lib/pdf/core";
import { docxToPdf, type DocxImage, type DocxReport, type HNode } from "../lib/pdf/docx";
import { OutFileRow, Progress, Thumb, usePdfThumbnails, type OutFile } from "../lib/pdf/ui";

type Margin = "normal" | "narrow" | "wide";
const MARGIN: Record<Margin, number> = { normal: 72, narrow: 36, wide: 96 };

/** Converts GIF, BMP, WebP or TIFF images (when the browser can decode them) to PNG. */
async function decodeImage(img: DocxImage): Promise<{ bytes: Uint8Array; format: "png" } | null> {
  if (/(x-emf|x-wmf|emf|wmf|svg)/i.test(img.contentType)) return null;
  try {
    const bmp = await createImageBitmap(new Blob([img.bytes as Uint8Array<ArrayBuffer>], { type: img.contentType }));
    const c = document.createElement("canvas");
    c.width = bmp.width;
    c.height = bmp.height;
    c.getContext("2d")?.drawImage(bmp, 0, 0);
    bmp.close();
    const blob = await canvasToBlob(c, "image/png");
    releaseCanvas(c);
    return { bytes: new Uint8Array(await blob.arrayBuffer()), format: "png" };
  } catch {
    return null;
  }
}

export default function WordToPdf({ toolId }: WidgetProps) {
  const { completed, error: trackError, announce, used } = useTool();
  const [opts, setOpts] = usePersistentOptions(toolId, {
    pageSize: "a4" as "a4" | "letter",
    orientation: "portrait" as "portrait" | "landscape",
    margin: "normal" as Margin,
    font: "sans" as "sans" | "serif",
    pageNumbers: false,
  });
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<{ label: string; value: number; max: number } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [result, setResult] = useState<{ file: OutFile; report: DocxReport } | null>(null);
  const [view, setView] = useState<PDFDocumentProxy | null>(null);
  const cancel = useRef<CancelToken>({ cancelled: false });
  const thumbs = usePdfThumbnails(view, 220, 6);

  useEffect(() => () => void view?.destroy(), [view]);

  const clear = () => {
    setResult(null);
    setView(null);
  };

  const setOpt = <K extends keyof typeof opts>(k: K, v: (typeof opts)[K]) => {
    setOpts((o) => ({ ...o, [k]: v }));
    clear();
  };

  const convert = async (f: File | null = file) => {
    if (!f) return;
    used("convert");
    setProblem(null);
    clear();
    cancel.current = { cancelled: false };
    const token = cancel.current;
    try {
      setProgress({ label: "Preparing…", value: 0, max: 1 });
      const ab = await f.arrayBuffer();
      const r = await docxToPdf(
        ab,
        f.name,
        { pageSize: opts.pageSize, orientation: opts.orientation, margin: MARGIN[opts.margin], font: opts.font, pageNumbers: opts.pageNumbers },
        {
          parseHtml: (html) => new DOMParser().parseFromString(html, "text/html").body as unknown as HNode,
          decodeImage,
          token,
          onProgress: (label, value, max) => setProgress({ label, value, max }),
        },
      );
      const out = { name: `${baseName(f.name)}.pdf`, blob: toBlob(r.bytes), detail: plural(r.report.pages, "page") };
      setResult({ file: out, report: r.report });
      try {
        setView(await openForRender(r.bytes, out.name));
      } catch {
        setView(null);
      }
      announce(`Converted to ${out.name}, ${plural(r.report.pages, "page")}, ${formatBytes(out.blob.size)}`);
      completed("convert", { pages: r.report.pages, images: r.report.images });
    } catch (e) {
      if (isCancelled(e)) announce("Conversion cancelled");
      else {
        setProblem(errorMessage(e, "The document couldn't be converted."));
        trackError(errorCode(e), "process");
      }
    } finally {
      setProgress(null);
    }
  };

  const rep = result?.report;

  return (
    <div className="grid gap-4">
      {!file ? (
        <FileDrop
          accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
          onFiles={(fs) => {
            setFile(fs[0]);
            clear();
            setProblem(null);
            void convert(fs[0]);
          }}
          hint="Word .docx · up to 100 MB · converted on your device"
          label="Choose Word file"
        />
      ) : (
        <Panel
          title={file.name}
          actions={
            <Button
              variant="ghost"
              icon="rotate-ccw"
              onClick={() => {
                setFile(null);
                clear();
                setProblem(null);
              }}
            >
              Choose another file
            </Button>
          }
          footer={<span>{formatBytes(file.size)}</span>}
        >
          <div className="grid gap-4 p-3 sm:p-4">
            <div className="flex flex-wrap gap-x-6 gap-y-4">
              <Segmented
                legend="Page size"
                value={opts.pageSize}
                onChange={(v) => setOpt("pageSize", v)}
                options={[
                  { value: "a4", label: "A4" },
                  { value: "letter", label: "US Letter" },
                ]}
              />
              <Segmented
                legend="Orientation"
                value={opts.orientation}
                onChange={(v) => setOpt("orientation", v)}
                options={[
                  { value: "portrait", label: "Portrait" },
                  { value: "landscape", label: "Landscape" },
                ]}
              />
              <Segmented<Margin>
                legend="Margins"
                value={opts.margin}
                onChange={(v) => setOpt("margin", v)}
                options={[
                  { value: "narrow", label: "Narrow" },
                  { value: "normal", label: "Normal" },
                  { value: "wide", label: "Wide" },
                ]}
              />
              <Segmented
                legend="Font"
                value={opts.font}
                onChange={(v) => setOpt("font", v)}
                options={[
                  { value: "sans", label: "Sans-serif" },
                  { value: "serif", label: "Serif" },
                ]}
              />
            </div>
            <Checkbox checked={opts.pageNumbers} onChange={(v) => setOpt("pageNumbers", v)} label="Add page numbers" />
            <p className="text-sm text-ink-3">
              Best for text documents. Headings, paragraphs, bold, italic, underline, lists, tables, links and PNG or JPEG images are kept. Your fonts, colors, text
              alignment, headers, footers, text boxes and exact spacing are not.
            </p>
          </div>
        </Panel>
      )}

      {file && (
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" size="md" icon="file" disabled={!!progress} onClick={() => convert()}>
            {result ? "Convert again" : "Convert to PDF"}
          </Button>
          {result && <span className="text-sm text-ink-3">Change a setting, then convert again to compare.</span>}
        </div>
      )}

      {progress && <Progress {...progress} onCancel={() => (cancel.current.cancelled = true)} />}
      {problem && (
        <Alert tone="danger" role="alert">
          {problem}
        </Alert>
      )}

      {result && rep && (
        <Panel tone="accent" title="Result">
          <div className="grid gap-4 p-3 sm:p-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatTile label="Pages" value={rep.pages} />
              <StatTile label="Headings" value={rep.headings} />
              <StatTile label="Tables" value={rep.tables} />
              <StatTile label="Images" value={rep.images} sub={rep.imagesSkipped ? `${rep.imagesSkipped} not included` : undefined} />
            </div>
            {(rep.imagesSkipped > 0 || rep.missingChars.length > 0) && (
              <Alert tone="warning" title="Check the preview">
                <ul className="grid gap-1">
                  {rep.imagesSkipped > 0 && (
                    <li>
                      {plural(rep.imagesSkipped, "image")} in a format browsers can&apos;t draw (usually EMF or WMF drawings) {rep.imagesSkipped === 1 ? "was" : "were"} replaced by a
                      note in the text.
                    </li>
                  )}
                  {rep.missingChars.length > 0 && (
                    <li>
                      Some characters can&apos;t be shown with the built-in PDF fonts and appear as “?”: {rep.missingChars.join(" ")}. This converter supports Western European
                      languages only; for other scripts, use Word&apos;s own Save as PDF.
                    </li>
                  )}
                </ul>
              </Alert>
            )}
            <ul>
              <OutFileRow file={result.file} primary />
            </ul>
            {view && (
              <div>
                <p className="mb-2 text-sm font-semibold text-ink">Preview{rep.pages > 6 ? " (first 6 pages)" : ""}</p>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {Array.from({ length: Math.min(6, rep.pages) }, (_, i) => (
                    <li key={i}>
                      <Thumb url={thumbs[i]} alt={`Page ${i + 1} of the PDF`} />
                      <p className="mt-1 text-center text-sm text-ink-3 tabular-nums">Page {i + 1}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Panel>
      )}
    </div>
  );
}
