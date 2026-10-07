"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { Alert, Button, Checkbox, CopyButton, downloadBlob, Field, useDebounced, usePersistentOptions, useSessionText } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { FindBar } from "../lib/text/findbar";
import { wordCount } from "../lib/text/find";
import { EDITOR_OPS } from "../lib/text/editor-ops";
import { diffLines } from "../lib/text/diff";

/*
 * Online text editor: a one-off plain-text workspace (sessionStorage only, cleared when the tab
 * closes) with one-click operations on the selection or whole text, find and replace, its own
 * undo/redo history (so operations are undoable too), .txt open/save and a line-by-line compare.
 * Shortcuts inside the editor: Ctrl+Z undo, Ctrl+Y / Ctrl+Shift+Z redo, Ctrl+F find, Ctrl+S save.
 */

const MAX_HISTORY = 100;
const SAMPLE = "Shopping list\n  bananas  \napples\n\nmilk\nApples\nbread\nmilk";

export default function TextEditor({ toolId }: WidgetProps) {
  const id = useId();
  const { used, announce, completed } = useTool();
  const [text, setTextRaw] = useSessionText(toolId);
  const [other, setOther] = useSessionText(`${toolId}:compare`);
  const [o, setO] = usePersistentOptions(toolId, { mono: false, wrap: true, filename: "text.txt" });
  const [past, setPast] = useState<string[]>([]);
  const [future, setFuture] = useState<string[]>([]);
  const [findOpen, setFindOpen] = useState(false);
  const [compare, setCompare] = useState(false);
  const [sel, setSel] = useState<[number, number]>([0, 0]);
  const [fileErr, setFileErr] = useState<string | null>(null);
  const [lastOp, setLastOp] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastPush = useRef(0);

  const pushHistory = (prev: string) => {
    setPast((p) => [...p.slice(-(MAX_HISTORY - 1)), prev]);
    setFuture([]);
  };
  /** Replace the text as one undoable step (operations, replace all, open file). */
  const commit = (next: string, label: string) => {
    if (next === text) {
      announce(`${label}: nothing changed`);
      setLastOp(`${label}: nothing changed`);
      return;
    }
    pushHistory(text);
    lastPush.current = 0;
    setTextRaw(next);
    setLastOp(label);
    announce(`${label} applied. Press Undo to reverse it.`);
  };
  /** Typing: snapshot at most every 800 ms so undo steps are word-sized, not letter-sized. */
  const onType = (next: string) => {
    const now = Date.now();
    if (now - lastPush.current > 800) pushHistory(text);
    lastPush.current = now;
    setTextRaw(next);
    used("type");
  };
  const undo = () => {
    if (!past.length) return;
    setFuture((f) => [text, ...f].slice(0, MAX_HISTORY));
    setTextRaw(past[past.length - 1]);
    setPast((p) => p.slice(0, -1));
    lastPush.current = 0;
    announce("Undone");
  };
  const redo = () => {
    if (!future.length) return;
    setPast((p) => [...p, text]);
    setTextRaw(future[0]);
    setFuture((f) => f.slice(1));
    lastPush.current = 0;
    announce("Redone");
  };

  const applyOp = (opId: string) => {
    const op = EDITOR_OPS.find((x) => x.id === opId);
    const ta = taRef.current;
    if (!op) return;
    used("operation");
    const [s, e] = ta ? [ta.selectionStart, ta.selectionEnd] : [0, 0];
    if (s !== e) {
      const out = op.run(text.slice(s, e));
      commit(text.slice(0, s) + out + text.slice(e), `${op.label} (selection)`);
      requestAnimationFrame(() => {
        ta?.focus();
        ta?.setSelectionRange(s, s + out.length);
      });
    } else commit(op.run(text), op.label);
  };

  const save = () => {
    const name = (o.filename.trim() || "text.txt").replace(/[\\/:*?"<>|]+/g, "-");
    downloadBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), /\.[a-z0-9]{1,5}$/i.test(name) ? name : `${name}.txt`);
    completed("download");
    announce("Download started");
  };
  const openFile = async (f: File) => {
    setFileErr(null);
    if (f.size > 5_000_000) {
      setFileErr("That file is larger than 5 MB. The editor is meant for plain text up to a few megabytes.");
      return;
    }
    try {
      const t = await f.text();
      if (/\u0000/.test(t.slice(0, 2000))) {
        setFileErr("That doesn't look like a plain text file. Word documents and PDFs need converting first.");
        return;
      }
      commit(t, `Opened ${f.name}`);
      setO({ ...o, filename: f.name });
      used("file");
    } catch {
      setFileErr("Couldn't read that file.");
    }
  };

  useEffect(() => {
    if (!lastOp) return;
    const t = setTimeout(() => setLastOp(null), 8000);
    return () => clearTimeout(t);
  }, [lastOp]);

  const dText = useDebounced(text, 200);
  const dOther = useDebounced(other, 200);
  const stats = useMemo(() => ({ words: wordCount(dText), chars: [...dText].length, lines: dText ? dText.split("\n").length : 0 }), [dText]);
  const diff = useMemo(() => (compare && (dText || dOther) ? diffLines(dOther, dText) : null), [compare, dText, dOther]);
  const selLen = Math.abs(sel[1] - sel[0]);

  return (
    <div className="grid gap-4">
      <div className="panel min-w-0">
        <div className="grid gap-2 border-b border-line p-2 sm:px-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Button icon="rotate-ccw" onClick={undo} disabled={!past.length} aria-keyshortcuts="Control+Z">
              Undo
            </Button>
            <Button icon="rotate-cw" onClick={redo} disabled={!future.length} aria-keyshortcuts="Control+Y">
              Redo
            </Button>
            <Button variant="ghost" icon="search" aria-expanded={findOpen} onClick={() => setFindOpen(!findOpen)} aria-keyshortcuts="Control+F">
              Find &amp; replace
            </Button>
            <Button variant="ghost" icon="upload" onClick={() => fileRef.current?.click()}>
              Open file
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,.csv,.tsv,.log,.json,.xml,.html,.css,.js,.srt,text/*"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void openFile(f);
                e.target.value = "";
              }}
            />
            <Button variant="ghost" icon="arrow-left-right" aria-pressed={compare} onClick={() => setCompare(!compare)}>
              {compare ? "Hide compare" : "Compare"}
            </Button>
            <Button
              variant="ghost"
              icon="sparkles"
              onClick={() => {
                commit(SAMPLE, "Example");
                used("example");
              }}
            >
              Example
            </Button>
            <Button variant="ghost" icon="trash" disabled={!text} onClick={() => commit("", "Clear")}>
              Clear
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Text operations (apply to the selection, or to all text when nothing is selected)">
            <span className="mr-1 text-sm text-ink-3">{selLen ? "Apply to selection:" : "Apply to all text:"}</span>
            {EDITOR_OPS.map((op) => (
              <Button key={op.id} onClick={() => applyOp(op.id)} disabled={!text}>
                {op.label}
              </Button>
            ))}
          </div>
        </div>
        {findOpen && <FindBar text={text} setText={commit} taRef={taRef} onClose={() => setFindOpen(false)} autoFocus />}
        <label htmlFor={`${id}-ed`} className="sr-only">
          Text
        </label>
        <textarea
          id={`${id}-ed`}
          ref={taRef}
          className={`textarea rounded-none border-0 ${o.mono ? "mono" : ""}`}
          style={{ ["--ta-min" as string]: "18rem", ["--ta-min-lg" as string]: "28rem" }}
          wrap={o.wrap ? "soft" : "off"}
          placeholder="Paste or type text, or press Open file"
          value={text}
          spellCheck
          onChange={(e) => onType(e.target.value)}
          onPaste={() => used("paste")}
          onSelect={(e) => setSel([e.currentTarget.selectionStart, e.currentTarget.selectionEnd])}
          onKeyDown={(e) => {
            const k = e.key.toLowerCase();
            if (!(e.ctrlKey || e.metaKey)) return;
            if (k === "z" && !e.shiftKey) {
              e.preventDefault();
              undo();
            } else if (k === "y" || (k === "z" && e.shiftKey)) {
              e.preventDefault();
              redo();
            } else if (k === "f") {
              e.preventDefault();
              setFindOpen(true);
            } else if (k === "s") {
              e.preventDefault();
              save();
            }
          }}
        />
        <div className="flex min-h-10 flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-3 py-2 text-sm text-ink-3 tabular-nums sm:px-4">
          <span>{stats.words.toLocaleString("en-US")} words</span>
          <span>{stats.chars.toLocaleString("en-US")} characters</span>
          <span>{stats.lines.toLocaleString("en-US")} lines</span>
          {selLen > 0 && <span>{selLen.toLocaleString("en-US")} selected</span>}
          <span aria-live="polite" className="text-ink-2">
            {lastOp ?? ""}
          </span>
        </div>
      </div>

      <div className="panel flex flex-wrap items-end gap-x-6 gap-y-3 p-3 sm:p-4">
        <Field label="File name" htmlFor={`${id}-fn`} className="w-full sm:w-64">
          <input id={`${id}-fn`} className="input" value={o.filename} onChange={(e) => setO({ ...o, filename: e.target.value })} />
        </Field>
        <Button variant="primary" size="md" icon="download" onClick={save} disabled={!text} aria-keyshortcuts="Control+S">
          Download
        </Button>
        <CopyButton text={text} disabled={!text} size="md" />
        <Checkbox checked={o.mono} onChange={(v) => setO({ ...o, mono: v })} label="Monospace font" />
        <Checkbox checked={o.wrap} onChange={(v) => setO({ ...o, wrap: v })} label="Wrap long lines" />
      </div>
      {fileErr && (
        <div role="alert">
          <Alert tone="danger">{fileErr}</Alert>
        </div>
      )}

      {compare && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="panel min-w-0">
            <div className="panel-header">
              <label htmlFor={`${id}-cmp`} className="text-sm font-semibold">
                Original version (compare against)
              </label>
              <Button variant="ghost" icon="arrow-down" disabled={!text} onClick={() => setOther(text)}>
                Copy editor text here
              </Button>
            </div>
            <textarea
              id={`${id}-cmp`}
              className={`textarea rounded-none border-0 ${o.mono ? "mono" : ""}`}
              style={{ ["--ta-min" as string]: "14rem", ["--ta-min-lg" as string]: "20rem" }}
              value={other}
              placeholder="Paste the earlier version here. The editor text is treated as the new version."
              onChange={(e) => setOther(e.target.value)}
            />
          </div>
          <section className="panel min-w-0" aria-labelledby={`${id}-dh`}>
            <div className="panel-header">
              <h2 id={`${id}-dh`} className="text-sm font-semibold">
                Differences
              </h2>
              {diff && !("error" in diff) && (
                <span className="text-sm text-ink-3 tabular-nums">
                  {diff.removed} removed · {diff.added} added
                </span>
              )}
            </div>
            <div className="max-h-[32rem] min-h-56 overflow-auto p-2">
              {!diff ? (
                <p className="p-2 text-sm text-ink-3">Paste an earlier version on the left to see which lines changed.</p>
              ) : "error" in diff ? (
                <Alert tone="warning">{diff.error}</Alert>
              ) : diff.added + diff.removed === 0 ? (
                <p className="p-2 text-sm">The two versions are identical.</p>
              ) : (
                <ol className="mono text-sm">
                  {diff.lines.map((l, i) => (
                    <li
                      key={i}
                      className={`flex gap-2 px-1 whitespace-pre-wrap ${l.type === "add" ? "bg-success-subtle" : l.type === "del" ? "bg-danger-subtle" : "text-ink-3"}`}
                    >
                      <span className="w-4 shrink-0 select-none" aria-hidden="true">
                        {l.type === "add" ? "+" : l.type === "del" ? "−" : " "}
                      </span>
                      <span className="sr-only">{l.type === "add" ? "Added: " : l.type === "del" ? "Removed: " : "Unchanged: "}</span>
                      <span className="min-w-0 break-words">{l.text || " "}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>
        </div>
      )}
      <p className="text-sm text-ink-3">
        Your text stays in this browser tab (session storage) so a reload doesn&apos;t lose it; it&apos;s cleared when you close the tab. For notes you want
        to keep, use the online notepad. Shortcuts in the editor: <kbd className="kbd">Ctrl</kbd>+<kbd className="kbd">Z</kbd> undo,{" "}
        <kbd className="kbd">Ctrl</kbd>+<kbd className="kbd">Y</kbd> redo, <kbd className="kbd">Ctrl</kbd>+<kbd className="kbd">F</kbd> find,{" "}
        <kbd className="kbd">Ctrl</kbd>+<kbd className="kbd">S</kbd> download.
      </p>
    </div>
  );
}
