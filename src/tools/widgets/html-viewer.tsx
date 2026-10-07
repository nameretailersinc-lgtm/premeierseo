"use client";

import { useId, useMemo, useRef, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { FileDrop } from "../ui/FileDrop";
import { Alert, Button, Checkbox, CopyButton, DownloadButton, Panel, Segmented, formatBytes, useDebounced, usePersistentOptions, useSessionText } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { cleanHtml } from "../lib/dev/word-html";
import { textToHtml } from "../lib/dev/html-text";

/*
 * config.mode "viewer": HTML editor with a live preview in a sandboxed iframe (srcdoc, never
 * allow-same-origin; scripts only when the visitor ticks "Run JavaScript").
 * config.mode "word-to-html": paste from Word/Google Docs or open a .docx (mammoth, lazy) → clean HTML.
 */

const WIDTHS = { full: "100%", tablet: "768px", phone: "375px" } as const;

function Preview({ html, scripts, width, title }: { html: string; scripts: boolean; width: keyof typeof WIDTHS; title: string }) {
  return (
    <div className="overflow-x-auto bg-surface-2 p-2">
      <iframe
        key={scripts ? "js" : "nojs"}
        title={title}
        sandbox={scripts ? "allow-scripts" : ""}
        referrerPolicy="no-referrer"
        srcDoc={html}
        className="mx-auto block h-[28rem] rounded-md border border-line bg-white lg:h-[34rem]"
        style={{ width: WIDTHS[width], maxWidth: width === "full" ? "100%" : undefined }}
      />
    </div>
  );
}

const SAMPLE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Preview</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; line-height: 1.5; }
    .card { border: 1px solid #ddd; border-radius: 8px; padding: 1rem; max-width: 28rem; }
    button { padding: .5rem 1rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Hello</h1>
    <p>Edit the code on the left and the preview updates.</p>
    <button onclick="document.querySelector('p').textContent = 'JavaScript ran.'">Click me</button>
  </div>
</body>
</html>`;

function Viewer({ toolId }: { toolId: string }) {
  const id = useId();
  const { used, announce } = useTool();
  const [code, setCode] = useSessionText(toolId);
  const [o, setO] = usePersistentOptions(toolId, { auto: true, scripts: false, width: "full" });
  const [manual, setManual] = useState("");
  const debounced = useDebounced(code, code.length > 200_000 ? 600 : 300);
  const shown = o.auto ? debounced : manual;
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="grid gap-4">
      <div className="panel p-3 sm:p-4">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <Checkbox
            checked={o.auto}
            onChange={(v) => {
              // Keep the current preview when switching to manual mode.
              if (!v) setManual(code);
              setO({ ...o, auto: v });
            }}
            label="Auto-preview"
            help="Update as you type"
          />
          <Checkbox checked={o.scripts} onChange={(v) => setO({ ...o, scripts: v })} label="Run JavaScript" help="Off by default; runs in an isolated sandbox" />
          <Segmented
            legend="Preview width"
            value={o.width as keyof typeof WIDTHS}
            onChange={(v) => setO({ ...o, width: v })}
            options={[
              { value: "full", label: "Full" },
              { value: "tablet", label: "Tablet 768" },
              { value: "phone", label: "Phone 375" },
            ]}
          />
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          as="div"
          title={<label htmlFor={`${id}-c`}>HTML</label>}
          actions={
            <>
              <Button
                variant="ghost"
                icon="sparkles"
                onClick={() => {
                  setCode(SAMPLE);
                  setManual(SAMPLE);
                  used("example");
                }}
              >
                Example
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".html,.htm,text/html"
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const t = await f.text();
                    setCode(t);
                    setManual(t);
                    used("file_picker");
                    announce(`${f.name} opened`);
                  }
                  e.target.value = "";
                }}
              />
              <Button variant="ghost" icon="upload" onClick={() => fileRef.current?.click()}>
                Open .html
              </Button>
              <Button variant="ghost" icon="trash" disabled={!code} onClick={() => setCode("")}>
                Clear
              </Button>
            </>
          }
          footer={
            <>
              <span>{formatBytes(new Blob([code]).size)}</span>
              <CopyButton text={code} disabled={!code} />
              <DownloadButton data={() => code} filename="page.html" mime="text/html;charset=utf-8" disabled={!code} />
            </>
          }
        >
          <textarea
            id={`${id}-c`}
            className="textarea mono rounded-none border-0"
            style={{ ["--ta-min" as string]: "20rem", ["--ta-min-lg" as string]: "34rem" }}
            wrap="off"
            spellCheck={false}
            autoCapitalize="off"
            placeholder="<h1>Hello</h1>"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              used("type");
            }}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") setManual(code);
            }}
          />
          {!o.auto && (
            <div className="border-t border-line p-3 sm:p-4">
              <Button variant="primary" size="md" icon="play" disabled={!code} onClick={() => setManual(code)}>
                Run
              </Button>
              <span className="ml-3 hidden text-sm text-ink-3 lg:inline">
                or press <kbd className="kbd">Ctrl</kbd> + <kbd className="kbd">Enter</kbd>
              </span>
            </div>
          )}
        </Panel>
        <Panel title={<span>Preview</span>}>
          {shown ? (
            <Preview html={shown} scripts={o.scripts} width={o.width as keyof typeof WIDTHS} title="Preview of your HTML" />
          ) : (
            <p className="flex min-h-[28rem] items-center justify-center p-4 text-sm text-ink-3">The rendered page appears here.</p>
          )}
          <p className="border-t border-line px-3 py-2 text-sm text-ink-3 sm:px-4">
            Sandboxed: the preview can&apos;t read this site, your cookies or storage.{o.scripts ? " Scripts are running." : " Scripts and forms are blocked."}
          </p>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Word → HTML ---------------- */

function WordToHtml({ toolId }: { toolId: string }) {
  const id = useId();
  const { used, announce, completed, error: track } = useTool();
  const [source, setSource] = useState<"paste" | "docx">("paste");
  const [raw, setRaw] = useState("");
  const [rawKind, setRawKind] = useState("");
  const [o, setO] = usePersistentOptions(toolId, { images: true, tables: true, nbsp: true });
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [view, setView] = useState<"code" | "preview">("code");
  const res = useMemo(() => (raw ? cleanHtml(raw, o) : null), [raw, o]);

  const onDocx = async (f: File) => {
    setBusy(true);
    setErr(null);
    try {
      const mammoth = (await import("mammoth")) as unknown as { default?: typeof import("mammoth") } & typeof import("mammoth");
      const lib = mammoth.default ?? mammoth;
      const r = await lib.convertToHtml({ arrayBuffer: await f.arrayBuffer() });
      setRaw(r.value);
      setRawKind(`${f.name} (${formatBytes(f.size)})`);
      setMsgs(r.messages.filter((m) => m.type === "warning").map((m) => m.message).slice(0, 5));
      announce("Document converted");
      completed("convert");
    } catch {
      setErr("This file couldn't be read as a Word document. Only .docx files are supported; open older .doc files in Word and save them as .docx first.");
      track("CONVERT_FAILED", "process");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="panel p-3 sm:p-4">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <Segmented
            legend="Source"
            value={source}
            onChange={setSource}
            options={[
              { value: "paste", label: "Paste formatted text" },
              { value: "docx", label: "Open a .docx file" },
            ]}
          />
          <Checkbox checked={o.tables} onChange={(v) => setO({ ...o, tables: v })} label="Keep tables" />
          <Checkbox checked={o.images} onChange={(v) => setO({ ...o, images: v })} label="Keep images" help="Embedded as data URIs" />
          <Checkbox checked={o.nbsp} onChange={(v) => setO({ ...o, nbsp: v })} label="Replace &nbsp; with spaces" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title={<span>{source === "paste" ? "Paste here" : "Word document"}</span>}
          actions={
            <Button
              variant="ghost"
              icon="trash"
              disabled={!raw}
              onClick={() => {
                setRaw("");
                setRawKind("");
                setMsgs([]);
              }}
            >
              Clear
            </Button>
          }
        >
          <div className="grid gap-3 p-3 sm:p-4">
            {source === "paste" ? (
              <>
                <div
                  id={`${id}-paste`}
                  role="textbox"
                  aria-multiline="true"
                  aria-label="Paste formatted text from Word or Google Docs here"
                  tabIndex={0}
                  contentEditable
                  suppressContentEditableWarning
                  className="min-h-40 rounded-md border-2 border-dashed border-line-strong bg-surface p-4 focus:border-accent focus:outline-none"
                  onPaste={(e) => {
                    e.preventDefault();
                    const html = e.clipboardData.getData("text/html");
                    const text = e.clipboardData.getData("text/plain");
                    used("paste");
                    if (html) {
                      setRaw(html);
                      setRawKind(`Formatted text (${formatBytes(html.length)} of clipboard HTML)`);
                    } else if (text) {
                      setRaw(textToHtml(text, { breaks: "p-br", escape: true, links: true, newTab: false, markdown: false }));
                      setRawKind("Plain text (no formatting on the clipboard)");
                    }
                    setMsgs([]);
                    announce("Pasted and cleaned");
                    completed("convert");
                  }}
                  onInput={(e) => {
                    // This box only accepts pastes; anything typed or dropped is cleared.
                    e.currentTarget.textContent = "";
                    announce("Paste formatted text here with Ctrl+V");
                  }}
                />
                <p className="text-sm text-ink-2">
                  Click the box and press <kbd className="kbd">Ctrl</kbd> + <kbd className="kbd">V</kbd> (⌘V on a Mac) to paste from Word, Google Docs or a web page.
                </p>
                <p className="text-sm text-ink-3">Headings, lists, links, bold and italic are kept. Fonts, colors, spacing and Word&apos;s hidden markup are removed.</p>
              </>
            ) : (
              <>
                <FileDrop accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hint=".docx up to 50 MB · converted in your browser" maxBytes={50 * 1024 * 1024} onFiles={([f]) => void onDocx(f)} />
                {busy && <p className="text-sm text-ink-3">Preparing… converting the document.</p>}
              </>
            )}
            {rawKind && <p className="text-sm text-ink-2">Source: {rawKind}</p>}
            {err && (
              <Alert tone="danger" role="alert">
                {err}
              </Alert>
            )}
            {msgs.length > 0 && (
              <Alert tone="warning" title="Notes from the converter">
                {msgs.map((m) => (
                  <p key={m}>{m}</p>
                ))}
              </Alert>
            )}
          </div>
        </Panel>
        <Panel
          title={<span id={`${id}-outl`}>Clean HTML</span>}
          actions={
            <>
              <CopyButton text={res?.html ?? ""} disabled={!res?.html} variant="primary" />
              <DownloadButton data={() => res?.html ?? ""} filename="document.html" mime="text/html;charset=utf-8" disabled={!res?.html} />
            </>
          }
          footer={
            res ? (
              <>
                <span>
                  {raw.length.toLocaleString()} → {res.html.length.toLocaleString()} characters
                  {raw.length > res.html.length ? ` (${Math.round((1 - res.html.length / raw.length) * 100)}% of the markup removed)` : ""}
                </span>
                {res.notes.map((n) => (
                  <span key={n}>{n}</span>
                ))}
              </>
            ) : undefined
          }
        >
          <div className="border-b border-line p-2">
            <Segmented
              legend="Show"
              hideLegend
              value={view}
              onChange={setView}
              options={[
                { value: "code", label: "HTML code" },
                { value: "preview", label: "Preview" },
              ]}
            />
          </div>
          {view === "code" ? (
            <textarea
              aria-labelledby={`${id}-outl`}
              readOnly
              className="textarea mono rounded-none border-0"
              style={{ ["--ta-min" as string]: "16rem", ["--ta-min-lg" as string]: "24rem" }}
              value={res?.html ?? ""}
              placeholder="Clean HTML appears here."
            />
          ) : res?.html ? (
            <Preview html={`<!doctype html><meta charset="utf-8"><style>body{font-family:system-ui,sans-serif;margin:1rem;line-height:1.5}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:4px 8px}img{max-width:100%}</style>${res.html}`} scripts={false} width="full" title="Preview of the clean HTML" />
          ) : (
            <p className="min-h-64 p-4 text-sm text-ink-3">The preview appears here.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}

export default function HtmlViewer({ toolId, config }: WidgetProps) {
  if (config?.mode === "word-to-html") return <WordToHtml toolId={toolId} />;
  return <Viewer toolId={toolId} />;
}
