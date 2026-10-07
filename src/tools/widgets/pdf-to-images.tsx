"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { useTool } from "../ui/ToolContext";
import { FileDrop } from "../ui/FileDrop";
import { Alert, Button, Field, Panel, Segmented, downloadBlob, formatBytes, formatNumber, usePersistentOptions } from "../ui/primitives";
import type { WidgetProps } from "../types";
import {
  type CancelToken,
  baseName,
  canvasToBlob,
  checkCancelled,
  errorCode,
  errorMessage,
  isCancelled,
  looksLikePdf,
  nextFrame,
  openForRender,
  outputName,
  parseRanges,
  plural,
  readBytes,
  releaseCanvas,
  renderPage,
  uid,
  zipFiles,
} from "../lib/pdf/core";
import { OutFileRow, Progress, useObjectUrls, type OutFile } from "../lib/pdf/ui";

type Format = "jpg" | "png";
type ZipMode = "archive" | "images";
const DPIS = ["72", "150", "200", "300"] as const;
type Dpi = (typeof DPIS)[number];

interface Loaded {
  name: string;
  size: number;
  pages: number;
}

interface OutImage extends OutFile {
  url: string;
  width: number;
  height: number;
  page: number;
}

/* ---------- PDF pages → images ---------- */

function PagesToImages({ toolId, zipFirst }: { toolId: string; zipFirst: boolean }) {
  const id = useId();
  const { completed, error: trackError, announce, used } = useTool();
  const [opts, setOpts] = usePersistentOptions(`${toolId}:img`, { format: "jpg" as Format, dpi: "150" as Dpi, quality: 85 });
  const [file, setFile] = useState<Loaded | null>(null);
  const [view, setView] = useState<PDFDocumentProxy | null>(null);
  const [which, setWhich] = useState<"all" | "some">("all");
  const [range, setRange] = useState("");
  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ label: string; value: number; max: number } | null>(null);
  const [outputs, setOutputs] = useState<OutImage[]>([]);
  const [zipping, setZipping] = useState(false);
  const [capped, setCapped] = useState(false);
  const cancel = useRef<CancelToken>({ cancelled: false });
  const urls = useObjectUrls();

  useEffect(() => () => void view?.destroy(), [view]);

  const resetOutputs = () => {
    urls.clear();
    setOutputs([]);
    setCapped(false);
  };

  const load = async (files: File[]) => {
    const f = files[0];
    setProblem(null);
    resetOutputs();
    setLoading(true);
    try {
      const bytes = await readBytes(f);
      const v = await openForRender(bytes, f.name);
      setView(v);
      setFile({ name: f.name, size: f.size, pages: v.numPages });
      setRange(v.numPages > 1 ? `1-${Math.min(3, v.numPages)}` : "1");
      announce(`${f.name} opened, ${plural(v.numPages, "page")}`);
    } catch (e) {
      setFile(null);
      setView(null);
      setProblem(errorMessage(e));
      trackError(errorCode(e), "input");
    } finally {
      setLoading(false);
    }
  };

  const pageList = (): { pages: number[]; error?: string } => {
    if (!file) return { pages: [] };
    if (which === "all") return { pages: Array.from({ length: file.pages }, (_, i) => i + 1) };
    const r = parseRanges(range, file.pages);
    if (r.error) return { pages: [], error: r.error };
    const seen = new Set<number>();
    const pages: number[] = [];
    for (const p of r.groups.flat()) {
      if (seen.has(p)) continue;
      seen.add(p);
      pages.push(p + 1);
    }
    return { pages };
  };
  const plan = pageList();
  const ext = opts.format;
  const base = file ? baseName(file.name) : "page";
  const dpi = Number(opts.dpi);

  const run = async () => {
    if (!file || !view || plan.error || !plan.pages.length) return;
    used("convert");
    setProblem(null);
    resetOutputs();
    cancel.current = { cancelled: false };
    const token = cancel.current;
    const out: OutImage[] = [];
    let wasCapped = false;
    try {
      for (let k = 0; k < plan.pages.length; k++) {
        checkCancelled(token);
        const n = plan.pages[k];
        setProgress({ label: `Converting page ${n} (${k + 1} of ${plan.pages.length})`, value: k, max: plan.pages.length });
        await nextFrame();
        const r = await renderPage(view, n, { scale: dpi / 72 });
        if (r.scale < dpi / 72 - 0.001) wasCapped = true;
        const blob = await canvasToBlob(r.canvas, ext === "png" ? "image/png" : "image/jpeg", ext === "png" ? undefined : opts.quality / 100);
        const width = r.canvas.width;
        const height = r.canvas.height;
        releaseCanvas(r.canvas);
        const pad = String(file.pages).length;
        out.push({
          name: `${base}-page-${String(n).padStart(pad, "0")}.${ext}`,
          blob,
          url: urls.make(blob),
          width,
          height,
          page: n,
          detail: `${formatNumber(width)} × ${formatNumber(height)} px`,
        });
        setOutputs(out.slice());
      }
      setCapped(wasCapped);
      announce(`Converted ${plural(out.length, "page")} to ${ext.toUpperCase()}`);
      completed("convert", { pages: out.length, dpi, format: ext });
    } catch (e) {
      if (isCancelled(e)) announce(`Cancelled after ${plural(out.length, "page")}`);
      else {
        setProblem(errorMessage(e, "The pages couldn't be converted."));
        trackError(errorCode(e), "process");
      }
    } finally {
      setProgress(null);
    }
  };

  const downloadZip = async () => {
    setZipping(true);
    try {
      const files = await Promise.all(outputs.map(async (o) => ({ name: o.name, data: new Uint8Array(await o.blob.arrayBuffer()), store: true })));
      downloadBlob(await zipFiles(files), `${base}-${ext}.zip`);
      completed("download_zip", { files: outputs.length });
    } catch (e) {
      setProblem(errorMessage(e, "The ZIP file couldn't be created. Download the images one by one instead."));
    } finally {
      setZipping(false);
    }
  };

  const total = outputs.reduce((n, o) => n + o.blob.size, 0);
  const a4px = (w: number) => Math.floor((w / 72) * dpi);

  return (
    <div className="grid gap-4">
      {!file ? (
        <FileDrop accept=".pdf,application/pdf" onFiles={load} hint="One PDF · up to 100 MB · converted on your device" label="Choose PDF" />
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
                resetOutputs();
              }}
            >
              Choose another PDF
            </Button>
          }
          footer={
            <>
              <span>{plural(file.pages, "page")}</span>
              <span>{formatBytes(file.size)}</span>
            </>
          }
        >
          <div className="grid gap-4 p-3 sm:p-4">
            <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
              <Segmented<Format>
                legend="Image format"
                value={opts.format}
                onChange={(v) => {
                  setOpts((o) => ({ ...o, format: v }));
                  resetOutputs();
                }}
                options={[
                  { value: "jpg", label: "JPG" },
                  { value: "png", label: "PNG" },
                ]}
              />
              <Segmented<Dpi>
                legend="Resolution"
                value={opts.dpi}
                onChange={(v) => {
                  setOpts((o) => ({ ...o, dpi: v }));
                  resetOutputs();
                }}
                options={DPIS.map((d) => ({ value: d, label: `${d} DPI` }))}
              />
              {opts.format === "jpg" && (
                <Field label={`JPG quality: ${opts.quality}%`} htmlFor={`${id}-q`} className="w-48">
                  <input
                    id={`${id}-q`}
                    type="range"
                    min={40}
                    max={100}
                    step={5}
                    value={opts.quality}
                    onChange={(e) => {
                      setOpts((o) => ({ ...o, quality: Number(e.target.value) }));
                      resetOutputs();
                    }}
                    aria-valuetext={`${opts.quality} percent`}
                    className="w-full"
                  />
                </Field>
              )}
            </div>
            <p className="text-sm text-ink-3">
              At {opts.dpi} DPI an A4 page becomes {formatNumber(a4px(595.28))} × {formatNumber(a4px(841.89))} pixels.{" "}
              {opts.dpi === "72" ? "Fine for a quick preview." : opts.dpi === "150" ? "Good for screens, email and most upload forms." : opts.dpi === "200" ? "Sharper text for reading on screen." : "Print quality; files are large."}
            </p>
            <div className="flex flex-wrap items-end gap-4">
              <Segmented<"all" | "some">
                legend="Pages"
                value={which}
                onChange={(v) => {
                  setWhich(v);
                  resetOutputs();
                }}
                options={[
                  { value: "all", label: `All ${file.pages}` },
                  { value: "some", label: "Choose pages" },
                ]}
              />
              {which === "some" && (
                <Field label="Page numbers" htmlFor={`${id}-r`} error={range.trim() ? plan.error : null} help="For example 1, 3-5">
                  <input
                    id={`${id}-r`}
                    className="input w-48"
                    value={range}
                    onChange={(e) => {
                      setRange(e.target.value);
                      resetOutputs();
                    }}
                    autoComplete="off"
                  />
                </Field>
              )}
            </div>
          </div>
        </Panel>
      )}
      {loading && <p className="text-sm text-ink-3">Opening PDF…</p>}

      {file && (
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" size="md" icon="file" disabled={!!progress || !!plan.error || !plan.pages.length} onClick={run}>
            {zipFirst ? "Convert pages to ZIP" : `Convert to ${ext.toUpperCase()}`}
          </Button>
          {!plan.error && <span className="text-sm text-ink-3">Creates {plural(plan.pages.length, `${ext.toUpperCase()} image`)}.</span>}
          {plan.pages.length > 40 && dpi >= 300 && <span className="text-sm text-warning">Many pages at 300 DPI need a lot of memory; consider 150 DPI.</span>}
        </div>
      )}

      {progress && <Progress {...progress} onCancel={() => (cancel.current.cancelled = true)} />}
      {problem && (
        <Alert tone="danger" role="alert">
          {problem}
        </Alert>
      )}

      {outputs.length > 0 && !progress && (
        <Panel
          title={`${plural(outputs.length, "image")} · ${formatBytes(total)}`}
          actions={
            outputs.length > 1 || zipFirst ? (
              <Button variant="primary" icon="download" busy={zipping} disabled={zipping} onClick={downloadZip}>
                {zipFirst ? "Download ZIP" : "Download all (ZIP)"}
              </Button>
            ) : undefined
          }
          footer={
            <span>
              Your PDF is unchanged. Images are named by page number so they sort in order.
              {capped ? " Some very large pages were rendered below the chosen DPI to stay within browser memory limits." : ""}
            </span>
          }
        >
          <ul className="grid max-h-[40rem] gap-3 overflow-y-auto p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-3">
            {outputs.map((o) => (
              <li key={o.name} className="grid gap-2 rounded-md border border-line bg-surface p-2">
                <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-sm bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
                  <img src={o.url} alt={`Page ${o.page}`} loading="lazy" decoding="async" className="max-h-full max-w-full object-contain" />
                </div>
                <ul>
                  <OutFileRow file={o} primary={outputs.length === 1 && !zipFirst} />
                </ul>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

/* ---------- PDF files → ZIP archive ---------- */

interface Item {
  id: string;
  name: string;
  size: number;
  file: File;
}

function PdfsToZip() {
  const id = useId();
  const { completed, error: trackError, announce, used } = useTool();
  const [items, setItems] = useState<Item[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const [name, setName] = useState("pdf-files");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [result, setResult] = useState<OutFile | null>(null);

  const add = async (files: File[]) => {
    used("files");
    setResult(null);
    const bad: string[] = [];
    const ok: Item[] = [];
    for (const f of files) {
      const head = new Uint8Array(await f.slice(0, 1024).arrayBuffer());
      if (!looksLikePdf(head)) bad.push(`${f.name} isn't a PDF file.`);
      else ok.push({ id: uid(), name: f.name, size: f.size, file: f });
    }
    setItems((prev) => [...prev, ...ok]);
    setRejected(bad);
    if (bad.length) trackError("NOT_PDF", "input");
    if (ok.length) announce(`${plural(ok.length, "PDF")} added`);
  };

  const total = items.reduce((n, i) => n + i.size, 0);

  const make = async () => {
    setBusy(true);
    setProblem(null);
    setResult(null);
    try {
      const files = [];
      for (const it of items) files.push({ name: it.name, data: new Uint8Array(await it.file.arrayBuffer()) });
      const blob = await zipFiles(files);
      const out = { name: outputName(name, "zip", "pdf-files"), blob, detail: `${plural(items.length, "PDF")}, ${formatBytes(total)} before zipping` };
      setResult(out);
      announce(`Created ${out.name}, ${formatBytes(blob.size)}`);
      completed("zip", { files: items.length });
    } catch (e) {
      setProblem(errorMessage(e, "The ZIP file couldn't be created. Try fewer or smaller files."));
      trackError(errorCode(e), "process");
    } finally {
      setBusy(false);
    }
  };

  const saving = result ? 1 - result.blob.size / total : 0;

  return (
    <div className="grid gap-4">
      <FileDrop accept=".pdf,application/pdf" multiple onFiles={add} hint="PDF files · up to 100 MB each · zipped on your device" label="Choose PDFs" compact={items.length > 0} />
      {rejected.length > 0 && (
        <Alert tone="danger" role="alert" title="Some files weren't added">
          <ul className="grid gap-1">
            {rejected.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </Alert>
      )}
      <Panel
        title={items.length ? `PDFs to zip (${items.length})` : "PDFs to zip"}
        actions={
          items.length > 0 && (
            <Button
              variant="ghost"
              icon="trash"
              onClick={() => {
                setItems([]);
                setResult(null);
              }}
            >
              Clear all
            </Button>
          )
        }
        footer={items.length > 0 && <span>{formatBytes(total)} in total</span>}
      >
        <div className="min-h-20 p-3 sm:p-4">
          {items.length ? (
            <ul className="grid gap-2">
              {items.map((it) => (
                <li key={it.id} className="flex items-center justify-between gap-2 rounded-md border border-line bg-surface px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{it.name}</p>
                    <p className="text-sm text-ink-3 tabular-nums">{formatBytes(it.size)}</p>
                  </div>
                  <Button
                    variant="secondary"
                    className="btn-icon"
                    icon="trash"
                    aria-label={`Remove ${it.name}`}
                    onClick={() => {
                      setItems((l) => l.filter((x) => x.id !== it.id));
                      setResult(null);
                      announce(`${it.name} removed`);
                    }}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-3">No files yet. Add one or more PDFs to put them in a single .zip archive.</p>
          )}
        </div>
      </Panel>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,18rem)_auto] sm:items-end">
        <Field label="ZIP file name" htmlFor={`${id}-n`} help=".zip is added automatically">
          <input id={`${id}-n`} className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </Field>
        <div className="sm:pb-7">
          <Button variant="primary" size="md" icon="download" busy={busy} disabled={!items.length || busy} onClick={make}>
            Create ZIP
          </Button>
        </div>
      </div>
      {problem && (
        <Alert tone="danger" role="alert">
          {problem}
        </Alert>
      )}
      {result && (
        <div className="grid gap-2">
          <Alert tone={saving >= 0.1 ? "success" : "info"} role="status" title={`ZIP created: ${formatBytes(result.blob.size)}`}>
            {saving >= 0.01
              ? `That is ${Math.round(saving * 100)}% smaller than the PDFs on their own (${formatBytes(total)}).`
              : `About the same size as the PDFs on their own (${formatBytes(total)}): PDF contents are already compressed, so zipping mainly bundles them into one file.`}{" "}
            To make the PDFs themselves smaller, use <Link href="/compress-pdf/">Compress PDF</Link>.
          </Alert>
          <ul>
            <OutFileRow file={result} primary />
          </ul>
        </div>
      )}
    </div>
  );
}

export default function PdfToImages({ toolId, config }: WidgetProps) {
  const zipTool = config?.mode === "zip";
  const [mode, setMode] = useState<ZipMode>("archive");
  if (!zipTool) return <PagesToImages toolId={toolId} zipFirst={false} />;
  return (
    <div className="grid gap-4">
      <Segmented<ZipMode>
        legend="What to put in the ZIP"
        value={mode}
        onChange={setMode}
        options={[
          { value: "archive", label: "PDF files" },
          { value: "images", label: "Pages as images" },
        ]}
      />
      {mode === "archive" ? <PdfsToZip /> : <PagesToImages toolId={toolId} zipFirst />}
    </div>
  );
}
