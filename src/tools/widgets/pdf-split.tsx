"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { useTool } from "../ui/ToolContext";
import { FileDrop } from "../ui/FileDrop";
import { Alert, Button, Checkbox, Field, Panel, Segmented, downloadBlob, formatBytes } from "../ui/primitives";
import type { WidgetProps } from "../types";
import {
  type CancelToken,
  baseName,
  checkCancelled,
  errorCode,
  errorMessage,
  isCancelled,
  loadPdfLib,
  nextFrame,
  openForEdit,
  openForRender,
  parseRanges,
  plural,
  rangeLabel,
  readBytes,
  toBlob,
  zipFiles,
} from "../lib/pdf/core";
import { OutFileRow, Progress, Thumb, usePdfThumbnails, type OutFile } from "../lib/pdf/ui";

type Mode = "every" | "ranges" | "chunks" | "select";

interface Loaded {
  name: string;
  size: number;
  bytes: Uint8Array;
  pages: number;
}

export default function PdfSplit({ toolId }: WidgetProps) {
  void toolId;
  const id = useId();
  const { completed, error: trackError, announce } = useTool();
  const [file, setFile] = useState<Loaded | null>(null);
  const [view, setView] = useState<PDFDocumentProxy | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("ranges");
  const [ranges, setRanges] = useState("");
  const [rangesOne, setRangesOne] = useState(false);
  const [chunk, setChunk] = useState(2);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [selectSeparate, setSelectSeparate] = useState(false);
  const [progress, setProgress] = useState<{ label: string; value: number; max: number } | null>(null);
  const [outputs, setOutputs] = useState<OutFile[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const [zipping, setZipping] = useState(false);
  const cancel = useRef<CancelToken>({ cancelled: false });
  const thumbs = usePdfThumbnails(view);

  useEffect(() => () => void view?.destroy(), [view]);

  const load = async (files: File[]) => {
    const f = files[0];
    setProblem(null);
    setOutputs([]);
    setLoading(true);
    try {
      const bytes = await readBytes(f);
      const doc = await openForEdit(bytes, f.name);
      const pages = doc.getPageCount();
      setFile({ name: f.name, size: f.size, bytes, pages });
      setSelected(new Set());
      setRanges(pages > 1 ? `1-${Math.min(pages, Math.ceil(pages / 2))}` : "1");
      announce(`${f.name} opened, ${plural(pages, "page")}`);
      try {
        setView(await openForRender(bytes, f.name));
      } catch {
        setView(null); // thumbnails are optional
      }
    } catch (e) {
      setFile(null);
      setView(null);
      setProblem(errorMessage(e));
      trackError(errorCode(e), "input");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setView(null);
    setOutputs([]);
    setProblem(null);
  };

  // The groups of pages each output file will contain.
  const plan = useMemo((): { groups: number[][]; error?: string } => {
    if (!file) return { groups: [] };
    const all = Array.from({ length: file.pages }, (_, i) => i);
    if (mode === "every") return { groups: all.map((i) => [i]) };
    if (mode === "chunks") {
      const n = Math.max(1, Math.floor(chunk) || 1);
      const groups: number[][] = [];
      for (let i = 0; i < file.pages; i += n) groups.push(all.slice(i, i + n));
      return { groups };
    }
    if (mode === "select") {
      const pages = all.filter((i) => selected.has(i));
      if (!pages.length) return { groups: [], error: "Select at least one page." };
      return { groups: selectSeparate ? pages.map((p) => [p]) : [pages] };
    }
    const r = parseRanges(ranges, file.pages);
    if (r.error) return r;
    return { groups: rangesOne ? [r.groups.flat()] : r.groups };
  }, [file, mode, chunk, selected, selectSeparate, ranges, rangesOne]);

  const base = file ? baseName(file.name) : "document";
  const nameFor = (g: number[], i: number): string => {
    if (mode === "chunks") return `${base}-part-${i + 1}.pdf`;
    if (g.length === 1) return `${base}-page-${g[0] + 1}.pdf`;
    if (mode === "select") return `${base}-selected-pages.pdf`;
    return `${base}-pages-${rangeLabel(g).replace(/, /g, "_")}.pdf`.slice(0, 120);
  };

  const run = async () => {
    if (!file || plan.error || !plan.groups.length) return;
    setProblem(null);
    setOutputs([]);
    cancel.current = { cancelled: false };
    const token = cancel.current;
    const out: OutFile[] = [];
    try {
      setProgress({ label: "Preparing…", value: 0, max: plan.groups.length });
      const { PDFDocument } = await loadPdfLib();
      const src = await openForEdit(file.bytes, file.name);
      for (let i = 0; i < plan.groups.length; i++) {
        checkCancelled(token);
        const g = plan.groups[i];
        setProgress({ label: `Creating file ${i + 1} of ${plan.groups.length}`, value: i, max: plan.groups.length });
        if (i % 4 === 0) await nextFrame();
        const doc = await PDFDocument.create();
        const copied = await doc.copyPages(src, g);
        copied.forEach((p) => doc.addPage(p));
        const bytes = await doc.save();
        out.push({ name: nameFor(g, i), blob: toBlob(bytes), detail: g.length === 1 ? `page ${g[0] + 1}` : `pages ${rangeLabel(g)}` });
      }
      setOutputs(out);
      announce(`Created ${plural(out.length, "PDF file")}`);
      completed("split", { files: out.length });
    } catch (e) {
      if (isCancelled(e)) announce("Split cancelled");
      else {
        setProblem(errorMessage(e, "The PDF couldn't be split."));
        trackError(errorCode(e), "process");
      }
    } finally {
      setProgress(null);
    }
  };

  const downloadZip = async () => {
    setZipping(true);
    try {
      const files = await Promise.all(outputs.map(async (o) => ({ name: o.name, data: new Uint8Array(await o.blob.arrayBuffer()) })));
      downloadBlob(await zipFiles(files), `${base}-split.zip`);
      completed("download_zip");
    } catch {
      setProblem("The ZIP file couldn't be created. Download the files one by one instead.");
    } finally {
      setZipping(false);
    }
  };

  const toggle = (i: number) => {
    setOutputs([]);
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  };

  const summary = plan.error
    ? null
    : plan.groups.length === 1
      ? `1 PDF with ${plural(plan.groups[0].length, "page")}`
      : `${plan.groups.length} PDF files`;

  return (
    <div className="grid gap-4">
      {!file ? (
        <FileDrop accept=".pdf,application/pdf" onFiles={load} hint="One PDF · up to 100 MB" label="Choose PDF" />
      ) : (
        <Panel
          title={file.name}
          actions={
            <Button variant="ghost" icon="rotate-ccw" onClick={reset}>
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
            <Segmented<Mode>
              legend="How to split"
              value={mode}
              onChange={(m) => {
                setMode(m);
                setOutputs([]);
              }}
              options={[
                { value: "ranges", label: "Page ranges" },
                { value: "select", label: "Select pages" },
                { value: "every", label: "Every page" },
                { value: "chunks", label: "Every N pages" },
              ]}
            />
            {mode === "ranges" && (
              <div className="grid gap-2">
                <Field
                  label="Page ranges"
                  htmlFor={`${id}-ranges`}
                  help="Separate ranges with commas, for example 1-3, 5, 8-10. “8-” means page 8 to the end."
                  error={ranges.trim() ? plan.error : null}
                >
                  <input
                    id={`${id}-ranges`}
                    className="input max-w-md"
                    value={ranges}
                    aria-invalid={plan.error && ranges.trim() ? true : undefined}
                    onChange={(e) => {
                      setRanges(e.target.value);
                      setOutputs([]);
                    }}
                    autoComplete="off"
                  />
                </Field>
                <Checkbox
                  checked={rangesOne}
                  onChange={(v) => {
                    setRangesOne(v);
                    setOutputs([]);
                  }}
                  label="Put all ranges into one PDF"
                  help="Otherwise each range becomes its own file."
                />
              </div>
            )}
            {mode === "chunks" && (
              <Field label="Pages per file" htmlFor={`${id}-chunk`} help={`Makes ${Math.ceil(file.pages / Math.max(1, chunk || 1))} files; the last may be shorter.`}>
                <input
                  id={`${id}-chunk`}
                  type="number"
                  min={1}
                  max={file.pages}
                  className="input w-32"
                  value={chunk}
                  onChange={(e) => {
                    setChunk(Math.max(1, Math.min(file.pages, Number(e.target.value) || 1)));
                    setOutputs([]);
                  }}
                />
              </Field>
            )}
            {mode === "every" && <p className="text-sm text-ink-2">Each page becomes a separate PDF ({plural(file.pages, "file")}).</p>}
            {mode === "select" && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => {
                    setSelected(new Set(Array.from({ length: file.pages }, (_, i) => i)));
                    setOutputs([]);
                  }}
                >
                  Select all
                </Button>
                <Button
                  onClick={() => {
                    setSelected(new Set());
                    setOutputs([]);
                  }}
                  disabled={!selected.size}
                >
                  Select none
                </Button>
                <span className="text-sm text-ink-3 tabular-nums">{plural(selected.size, "page")} selected</span>
                <Checkbox
                  checked={selectSeparate}
                  onChange={(v) => {
                    setSelectSeparate(v);
                    setOutputs([]);
                  }}
                  label="Save each selected page as its own file"
                />
              </div>
            )}

            <div>
              <p className="mb-2 text-sm font-semibold text-ink">{mode === "select" ? "Tick the pages to extract" : "Pages"}</p>
              <ul className="grid max-h-[32rem] grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4 lg:grid-cols-6" aria-label="Pages in this PDF">
                {Array.from({ length: file.pages }, (_, i) => (
                  <li key={i}>
                    {mode === "select" ? (
                      <label
                        className={`block cursor-pointer rounded-md border-2 p-1 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus ${
                          selected.has(i) ? "border-accent bg-accent-subtle" : "border-transparent"
                        }`}
                      >
                        <Thumb url={thumbs[i]} alt="" />
                        <span className="mt-1 flex items-center justify-center gap-1.5 text-sm tabular-nums">
                          <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)} className="size-4" />
                          Page {i + 1}
                        </span>
                      </label>
                    ) : (
                      <div className="p-1">
                        <Thumb url={thumbs[i]} alt={`Page ${i + 1}`} />
                        <p className="mt-1 text-center text-sm text-ink-3 tabular-nums">Page {i + 1}</p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Panel>
      )}
      {loading && <p className="text-sm text-ink-3">Opening PDF…</p>}

      {file && (
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" size="md" icon="file" disabled={!!plan.error || !plan.groups.length || !!progress} onClick={run}>
            Split PDF
          </Button>
          {summary && <span className="text-sm text-ink-3">Creates {summary}.</span>}
          {mode === "select" && plan.error && <span className="text-sm text-ink-3">{plan.error}</span>}
        </div>
      )}

      {progress && <Progress {...progress} onCancel={() => (cancel.current.cancelled = true)} />}
      {problem && (
        <Alert tone="danger" role="alert">
          {problem}
        </Alert>
      )}
      {outputs.length > 0 && (
        <Panel
          tone="accent"
          title={`Result: ${plural(outputs.length, "file")}`}
          actions={
            outputs.length > 1 && (
              <Button variant="primary" icon="download" busy={zipping} disabled={zipping} onClick={downloadZip}>
                Download all (ZIP)
              </Button>
            )
          }
          footer={<span>Total {formatBytes(outputs.reduce((n, o) => n + o.blob.size, 0))} · your original file is unchanged</span>}
        >
          <ul className="grid max-h-96 gap-2 overflow-y-auto p-3 sm:p-4">
            {outputs.map((o, i) => (
              <OutFileRow key={o.name + i} file={o} primary={outputs.length === 1} />
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
