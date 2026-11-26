"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { FileDrop } from "../ui/FileDrop";
import { useTool } from "../ui/ToolContext";
import { Alert, Button, CopyButton, DownloadButton, Panel, formatBytes } from "../ui/primitives";
import { baseName, errorCode, errorMessage, isCancelled, openForRender, parseRanges, readBytes, type CancelToken } from "../lib/pdf/core";
import { extractPdfText } from "../lib/pdf/text";
import type { WidgetProps } from "../types";

export default function PdfToText({ toolId }: WidgetProps) {
  const id = useId();
  const { used, completed, error, announce } = useTool();
  const document = useRef<PDFDocumentProxy | null>(null);
  const token = useRef<CancelToken>({ cancelled: false });
  const generation = useRef(0);
  const [file, setFile] = useState<{ name: string; size: number; pages: number } | null>(null);
  const [range, setRange] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<{ text: string; empty: number; pages: number } | null>(null);
  useEffect(() => () => {
    generation.current++;
    token.current.cancelled = true;
    void document.current?.destroy();
  }, []);

  async function load(files: File[]) {
    const f = files[0];
    const run = ++generation.current;
    token.current.cancelled = true;
    used("file");
    setBusy(true); setProblem(""); setResult(null); setFile(null); setProgress("Opening PDF…");
    void document.current?.destroy(); document.current = null;
    try {
      const doc = await openForRender(await readBytes(f), f.name);
      if (run !== generation.current) { await doc.destroy(); return; }
      document.current = doc;
      setFile({ name: f.name, size: f.size, pages: doc.numPages });
      setRange("");
      announce(`${doc.numPages} pages ready for text extraction`);
    } catch (e) {
      if (run === generation.current) { setProblem(errorMessage(e)); error(errorCode(e), "input"); }
    } finally { if (run === generation.current) { setBusy(false); setProgress(""); } }
  }

  async function extract() {
    const doc = document.current;
    if (!doc || !file) return;
    const parsed = range.trim() ? parseRanges(range, file.pages) : { groups: [Array.from({ length: file.pages }, (_, i) => i)] };
    if (parsed.error) { setProblem(parsed.error); return; }
    const run = generation.current;
    const current = { cancelled: false }; token.current = current;
    setBusy(true); setProblem(""); setResult(null);
    try {
      const pages = await extractPdfText(doc, parsed.groups.flat(), current, (done, total) => setProgress(`Reading page ${done} of ${total}`));
      if (run !== generation.current) return;
      const text = pages.map((p) => `--- Page ${p.page} ---\n${p.text || "[No selectable text on this page]"}`).join("\n\n");
      const empty = pages.filter((p) => !p.text.trim()).length;
      setResult({ text, empty, pages: pages.length });
      if (empty < pages.length) completed("extract_text", { pages: pages.length, reached: true });
      else error("NO_TEXT_LAYER", "process");
      announce(`Read ${pages.length} pages; ${empty} without selectable text`);
    } catch (e) {
      if (!isCancelled(e)) { setProblem(errorMessage(e)); error(errorCode(e), "process"); }
      else announce("Text extraction cancelled");
    } finally { if (run === generation.current) { setBusy(false); setProgress(""); } }
  }

  return <div className="grid gap-4" data-tool={toolId}>
    <FileDrop accept=".pdf,application/pdf" onFiles={load} label="Choose PDF" hint="PDF up to 100MB. Files stay in your browser; scanned pages need OCR elsewhere." disabled={busy} />
    {problem && <Alert tone="danger">{problem}</Alert>}
    {file && <Panel title={`${file.pages} pages · ${formatBytes(file.size)}`}>
      <div className="grid gap-4 p-4">
        <div><label htmlFor={`${id}-pages`} className="field-label">Pages to extract (optional)</label>
          <input id={`${id}-pages`} className="input" placeholder="All pages, or 1-3, 5" value={range} disabled={busy} onChange={(e) => { setRange(e.target.value); setResult(null); }} />
        </div>
        <div className="flex flex-wrap gap-2"><Button onClick={extract} disabled={busy}>Extract text</Button>
          {busy && <Button variant="secondary" onClick={() => { token.current.cancelled = true; }}>Cancel extraction</Button>}
        </div>
      </div>
    </Panel>}
    {progress && <p role="status" className="text-sm text-ink-2">{progress}</p>}
    {result && <Panel title="Extracted text">
      <div className="grid gap-3 p-4">
        {result.empty > 0 && <Alert tone="warning">{result.empty} of {result.pages} pages had no selectable text. Scans and image-only PDFs need OCR; this tool does not recognize text inside images.</Alert>}
        <p className="text-sm text-ink-2">Reading order follows the PDF text layer. Columns, tables and font layout may not be preserved.</p>
        <textarea aria-label="Extracted PDF text" className="textarea min-h-80 font-mono text-sm" value={result.text} readOnly />
        <div className="flex flex-wrap gap-2"><CopyButton text={result.text} disabled={result.empty === result.pages} /><DownloadButton data={result.text} filename={`${baseName(file?.name || "document")}.txt`} disabled={result.empty === result.pages} /></div>
      </div>
    </Panel>}
  </div>;
}
