"use client";

import { useEffect, useId, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { useTool } from "../ui/ToolContext";
import { FileDrop } from "../ui/FileDrop";
import { Alert, Button, Field, Panel, Segmented, downloadBlob, formatBytes } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { baseName, errorCode, errorMessage, loadPdfLib, openForEdit, openForRender, parseRanges, plural, readBytes, toBlob } from "../lib/pdf/core";
import { OutFileRow, Thumb, usePdfThumbnails, type OutFile } from "../lib/pdf/ui";

interface Loaded {
  name: string;
  size: number;
  bytes: Uint8Array;
  /** Displayed width/height of each page before our change. */
  aspects: number[];
  /** Rotation already stored in each page. */
  original: number[];
}

const norm = (d: number) => ((d % 360) + 360) % 360;
type Angle = "90" | "180" | "270";

export default function PdfRotate({ toolId }: WidgetProps) {
  void toolId;
  const id = useId();
  const { completed, error: trackError, announce, used } = useTool();
  const [file, setFile] = useState<Loaded | null>(null);
  const [view, setView] = useState<PDFDocumentProxy | null>(null);
  const [delta, setDelta] = useState<number[]>([]);
  const [range, setRange] = useState("");
  const [angle, setAngle] = useState<Angle>("90");
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<OutFile | null>(null);
  const thumbs = usePdfThumbnails(view);

  useEffect(() => () => void view?.destroy(), [view]);

  const load = async (files: File[]) => {
    const f = files[0];
    setProblem(null);
    setResult(null);
    try {
      const bytes = await readBytes(f);
      const doc = await openForEdit(bytes, f.name);
      const pages = doc.getPages();
      const original = pages.map((p) => norm(p.getRotation().angle));
      const aspects = pages.map((p, i) => {
        const { width, height } = p.getSize();
        return original[i] % 180 ? height / width : width / height;
      });
      setFile({ name: f.name, size: f.size, bytes, aspects, original });
      setDelta(new Array(pages.length).fill(0));
      announce(`${f.name} opened, ${plural(pages.length, "page")}`);
      try {
        setView(await openForRender(bytes, f.name));
      } catch {
        setView(null);
      }
    } catch (e) {
      setFile(null);
      setView(null);
      setProblem(errorMessage(e));
      trackError(errorCode(e), "input");
    }
  };

  const change = (fn: (d: number[]) => number[], msg: string) => {
    used("rotate");
    setDelta((d) => fn(d).map(norm));
    setResult(null);
    announce(msg);
  };

  const applyRange = () => {
    if (!file) return;
    const r = parseRanges(range, delta.length);
    if (r.error) {
      setRangeError(r.error);
      return;
    }
    setRangeError(null);
    const set = new Set(r.groups.flat());
    const by = Number(angle);
    change((d) => d.map((v, i) => (set.has(i) ? v + by : v)), `${plural(set.size, "page")} rotated`);
  };

  const changedCount = delta.filter(Boolean).length;

  const save = async () => {
    if (!file) return;
    setBusy(true);
    setProblem(null);
    try {
      const { degrees } = await loadPdfLib();
      const doc = await openForEdit(file.bytes, file.name);
      doc.getPages().forEach((p, i) => {
        if (delta[i]) p.setRotation(degrees(norm(file.original[i] + delta[i])));
      });
      const bytes = await doc.save();
      const out = { name: `${baseName(file.name)}-rotated.pdf`, blob: toBlob(bytes), detail: `${plural(changedCount, "page")} rotated` };
      setResult(out);
      downloadBlob(out.blob, out.name);
      announce(`Saved ${out.name}, ${formatBytes(out.blob.size)}`);
      completed("download", { pages: changedCount });
    } catch (e) {
      setProblem(errorMessage(e, "The rotated PDF couldn't be saved."));
      trackError(errorCode(e), "process");
    } finally {
      setBusy(false);
    }
  };

  if (!file) {
    return (
      <div className="grid gap-3">
        <FileDrop accept=".pdf,application/pdf" onFiles={load} hint="One PDF · up to 100 MB" label="Choose PDF" />
        {problem && (
          <Alert tone="danger" role="alert">
            {problem}
          </Alert>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <Panel
        title={file.name}
        actions={
          <Button
            variant="ghost"
            icon="rotate-ccw"
            onClick={() => {
              setFile(null);
              setView(null);
              setResult(null);
            }}
          >
            Choose another PDF
          </Button>
        }
        footer={
          <>
            <span>{plural(delta.length, "page")}</span>
            <span>{formatBytes(file.size)}</span>
            <span>{changedCount ? `${plural(changedCount, "page")} will be rotated` : "No changes yet"}</span>
          </>
        }
      >
        <div className="grid gap-4 p-3 sm:p-4">
          <div>
            <p className="field-label">All pages</p>
            <div className="flex flex-wrap gap-2">
              <Button icon="rotate-ccw" onClick={() => change((d) => d.map((v) => v - 90), "All pages rotated 90 degrees left")}>
                Rotate all left
              </Button>
              <Button icon="refresh" onClick={() => change((d) => d.map((v) => v + 90), "All pages rotated 90 degrees right")}>
                Rotate all right
              </Button>
              <Button onClick={() => change((d) => d.map((v) => v + 180), "All pages turned upside down")}>Rotate all 180°</Button>
              <Button variant="ghost" disabled={!changedCount} onClick={() => change((d) => d.map(() => 0), "Rotation reset")}>
                Reset
              </Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,16rem)_auto_auto] sm:items-end">
            <Field label="Selected pages" htmlFor={`${id}-range`} error={rangeError} help="For example 2, 4-6">
              <input
                id={`${id}-range`}
                className="input"
                value={range}
                onChange={(e) => setRange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyRange()}
                aria-invalid={rangeError ? true : undefined}
                autoComplete="off"
              />
            </Field>
            <div className={rangeError ? "" : "sm:pb-7"}>
              <Segmented<Angle>
                legend="Turn by"
                value={angle}
                onChange={setAngle}
                options={[
                  { value: "90", label: "90° right" },
                  { value: "180", label: "180°" },
                  { value: "270", label: "90° left" },
                ]}
              />
            </div>
            <div className={rangeError ? "" : "sm:pb-7"}>
              <Button disabled={!range.trim()} onClick={applyRange}>
                Rotate these pages
              </Button>
            </div>
          </div>
          <ul className="grid max-h-[36rem] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-4 lg:grid-cols-5" aria-label="Pages">
            {delta.map((d, i) => (
              <li key={i} className={`rounded-md border p-1.5 ${d ? "border-accent" : "border-line"}`}>
                <Thumb url={thumbs[i]} alt={`Page ${i + 1}${d ? `, turned ${d} degrees clockwise` : ""}`} rotation={d} aspect={file.aspects[i]} />
                <div className="mt-1.5 flex items-center justify-between gap-1">
                  <Button
                    variant="secondary"
                    className="btn-icon"
                    icon="rotate-ccw"
                    aria-label={`Rotate page ${i + 1} left`}
                    onClick={() => change((a) => a.map((v, j) => (j === i ? v - 90 : v)), `Page ${i + 1} rotated left`)}
                  />
                  <span className="text-sm tabular-nums">
                    {i + 1}
                    {d ? <span className="text-ink-3"> · {d}°</span> : null}
                  </span>
                  <Button
                    variant="secondary"
                    className="btn-icon"
                    icon="refresh"
                    aria-label={`Rotate page ${i + 1} right`}
                    onClick={() => change((a) => a.map((v, j) => (j === i ? v + 90 : v)), `Page ${i + 1} rotated right`)}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Panel>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" size="md" icon="download" busy={busy} disabled={busy || !changedCount} onClick={save}>
          Download rotated PDF
        </Button>
        {!changedCount && <span className="text-sm text-ink-3">Rotate at least one page first.</span>}
      </div>
      {problem && (
        <Alert tone="danger" role="alert">
          {problem}
        </Alert>
      )}
      {result && (
        <ul>
          <OutFileRow file={result} />
        </ul>
      )}
    </div>
  );
}
