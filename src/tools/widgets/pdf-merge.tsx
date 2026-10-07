"use client";

import { useId, useRef, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { FileDrop } from "../ui/FileDrop";
import { Alert, Button, Field, Panel, formatBytes } from "../ui/primitives";
import type { WidgetProps } from "../types";
import {
  type CancelToken,
  checkCancelled,
  errorCode,
  errorMessage,
  isCancelled,
  loadPdfLib,
  nextFrame,
  openForEdit,
  outputName,
  parseRanges,
  plural,
  readBytes,
  toBlob,
  uid,
} from "../lib/pdf/core";
import { OutFileRow, Progress, ReorderList, type OutFile } from "../lib/pdf/ui";

interface Item {
  id: string;
  name: string;
  size: number;
  bytes: Uint8Array;
  pages: number;
  range: string;
}

export default function PdfMerge({ toolId }: WidgetProps) {
  void toolId;
  const id = useId();
  const { completed, error: trackError, announce } = useTool();
  const [items, setItems] = useState<Item[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("merged");
  const [progress, setProgress] = useState<{ label: string; value: number; max: number } | null>(null);
  const [result, setResult] = useState<OutFile | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [rangeErrors, setRangeErrors] = useState<Record<string, string>>({});
  const cancel = useRef<CancelToken>({ cancelled: false });

  const changed = (next: Item[]) => {
    setItems(next);
    setResult(null);
    setProblem(null);
  };

  const add = async (files: File[]) => {
    setAdding(true);
    setResult(null);
    const bad: string[] = [];
    const added: Item[] = [];
    for (const f of files) {
      try {
        const bytes = await readBytes(f);
        const doc = await openForEdit(bytes, f.name);
        added.push({ id: uid(), name: f.name, size: f.size, bytes, pages: doc.getPageCount(), range: "" });
      } catch (e) {
        bad.push(errorMessage(e));
        trackError(errorCode(e), "input");
      }
    }
    setItems((prev) => [...prev, ...added]);
    setRejected(bad);
    setAdding(false);
    if (added.length) announce(`${plural(added.length, "PDF")} added${bad.length ? `, ${bad.length} rejected` : ""}`);
  };

  const totalPages = items.reduce((n, it) => n + it.pages, 0);
  const totalSize = items.reduce((n, it) => n + it.size, 0);

  const merge = async () => {
    setProblem(null);
    setResult(null);
    // Validate page selections first.
    const errs: Record<string, string> = {};
    const picks: number[][] = items.map((it) => {
      if (!it.range.trim()) return Array.from({ length: it.pages }, (_, i) => i);
      const r = parseRanges(it.range, it.pages);
      if (r.error) errs[it.id] = r.error;
      return r.groups.flat();
    });
    setRangeErrors(errs);
    if (Object.keys(errs).length) {
      setProblem("Fix the page selection marked below, or clear it to include every page.");
      return;
    }
    cancel.current = { cancelled: false };
    const token = cancel.current;
    try {
      setProgress({ label: "Preparing…", value: 0, max: items.length });
      const { PDFDocument } = await loadPdfLib();
      const out = await PDFDocument.create();
      let pages = 0;
      for (let i = 0; i < items.length; i++) {
        checkCancelled(token);
        const it = items[i];
        setProgress({ label: `Adding ${it.name} (${i + 1} of ${items.length})`, value: i, max: items.length });
        await nextFrame();
        const src = await openForEdit(it.bytes, it.name);
        const copied = await out.copyPages(src, picks[i]);
        copied.forEach((p) => out.addPage(p));
        pages += copied.length;
      }
      checkCancelled(token);
      setProgress({ label: "Saving the merged PDF…", value: items.length, max: items.length });
      await nextFrame();
      const bytes = await out.save();
      checkCancelled(token);
      const file = { name: outputName(name, "pdf", "merged"), blob: toBlob(bytes), detail: plural(pages, "page") };
      setResult(file);
      announce(`Merged ${plural(items.length, "file")} into ${file.name}, ${plural(pages, "page")}, ${formatBytes(file.blob.size)}`);
      completed("merge", { files: items.length, pages });
    } catch (e) {
      if (isCancelled(e)) announce("Merge cancelled");
      else {
        setProblem(errorMessage(e, "The PDFs couldn't be merged. One of the files may be damaged."));
        trackError(errorCode(e), "process");
      }
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="grid gap-4">
      <FileDrop accept=".pdf,application/pdf" multiple onFiles={add} hint="PDF files · up to 100 MB each · add as many as you need" label="Choose PDFs" compact={items.length > 0} />
      {adding && <p className="text-sm text-ink-3">Reading files…</p>}
      {rejected.length > 0 && (
        <Alert tone="danger" role="alert" title={rejected.length === 1 ? "One file wasn't added" : `${rejected.length} files weren't added`}>
          <ul className="grid gap-1">
            {rejected.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </Alert>
      )}

      <Panel
        title={items.length ? `Files to merge (${items.length})` : "Files to merge"}
        actions={
          items.length > 0 && (
            <Button variant="ghost" icon="trash" onClick={() => changed([])}>
              Clear all
            </Button>
          )
        }
        footer={
          items.length > 0 && (
            <>
              <span>{plural(items.length, "file")}</span>
              <span>{plural(totalPages, "page")}</span>
              <span>{formatBytes(totalSize)} in total</span>
            </>
          )
        }
      >
        <div className="min-h-24 p-3 sm:p-4">
          {items.length ? (
            <>
              <p className="mb-3 text-sm text-ink-3">
                Files are merged from top to bottom. Use the arrow buttons or drag a row to change the order.
              </p>
              <ReorderList
                label="Files to merge, in order"
                items={items}
                onChange={changed}
                renderRow={(it) => (
                  <div className="grid gap-1 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-center sm:gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink" title={it.name}>
                        {it.name}
                      </p>
                      <p className="text-sm text-ink-3 tabular-nums">
                        {plural(it.pages, "page")} · {formatBytes(it.size)}
                      </p>
                    </div>
                    <div>
                      <label htmlFor={`${id}-r-${it.id}`} className="sr-only">
                        Pages to include from {it.name}
                      </label>
                      <input
                        id={`${id}-r-${it.id}`}
                        className="input h-9 text-sm"
                        placeholder={`All pages (1-${it.pages})`}
                        value={it.range}
                        aria-invalid={rangeErrors[it.id] ? true : undefined}
                        aria-describedby={rangeErrors[it.id] ? `${id}-re-${it.id}` : undefined}
                        onChange={(e) => {
                          const v = e.target.value;
                          changed(items.map((x) => (x.id === it.id ? { ...x, range: v } : x)));
                          setRangeErrors((r) => ({ ...r, [it.id]: "" }));
                        }}
                      />
                      {rangeErrors[it.id] && (
                        <p id={`${id}-re-${it.id}`} className="mt-1 text-sm text-danger">
                          {rangeErrors[it.id]}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              />
            </>
          ) : (
            <p className="text-sm text-ink-3">No files yet. Add two or more PDFs; you can add more at any time and reorder them before merging.</p>
          )}
        </div>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,18rem)_auto] sm:items-end">
        <Field label="Output file name" htmlFor={`${id}-name`} help=".pdf is added automatically">
          <input id={`${id}-name`} className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </Field>
        <div className="sm:pb-7">
          <Button variant="primary" size="md" icon="file" disabled={items.length < 2 || !!progress || adding} onClick={merge}>
            Merge PDFs
          </Button>
        </div>
      </div>
      {items.length === 1 && <p className="-mt-2 text-sm text-ink-3">Add at least one more PDF to merge.</p>}

      {progress && <Progress {...progress} onCancel={() => (cancel.current.cancelled = true)} />}
      {problem && (
        <Alert tone="danger" role="alert">
          {problem}
        </Alert>
      )}
      {result && (
        <div className="grid gap-2">
          <Alert tone="success" role="status" title="Merged">
            Your files were combined in the order shown. The download stays available until you change the list.
          </Alert>
          <ul>
            <OutFileRow file={result} primary />
          </ul>
        </div>
      )}
    </div>
  );
}
