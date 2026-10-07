"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { Alert, Button, CopyButton, downloadBlob, formatBytes, Segmented, usePersistentOptions } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { FindBar } from "../lib/text/findbar";
import { wordCount } from "../lib/text/find";

/*
 * Online notepad: several notes saved to localStorage (pss:notes:v1) on this device only.
 * Autosaves 400 ms after typing stops, syncs between open tabs (storage event), and offers
 * .txt download, ZIP of all notes, print, open .txt, find and replace, delete with undo.
 */

interface Note {
  id: string;
  title: string;
  body: string;
  updated: number;
}

const KEY = "pss:notes:v1";
const MAX_NOTES = 200;
const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.floor(performance.now())}`);
const blank = (): Note => ({ id: newId(), title: "", body: "", updated: Date.now() });

function readNotes(): Note[] | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { notes?: Note[] };
    const notes = (v.notes ?? []).filter((n) => n && typeof n.id === "string").map((n) => ({ id: n.id, title: String(n.title ?? ""), body: String(n.body ?? ""), updated: Number(n.updated) || Date.now() }));
    return notes.length ? notes : null;
  } catch {
    return null;
  }
}

const displayTitle = (n: Note) => n.title.trim() || n.body.trim().split("\n")[0].slice(0, 60) || "Untitled note";
const safeName = (n: Note) =>
  (displayTitle(n)
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ")
    .trim()
    .slice(0, 60) || "note") + ".txt";
const when = (t: number) => {
  const d = new Date(t);
  return d.toDateString() === new Date().toDateString() ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString();
};

function printText(title: string, body: string) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  if (!doc) return;
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  doc.open();
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font:12pt/1.5 Georgia,serif;margin:2cm}h1{font-size:14pt}pre{white-space:pre-wrap;font:inherit}</style></head><body><h1>${esc(title)}</h1><pre>${esc(body)}</pre></body></html>`,
  );
  doc.close();
  iframe.contentWindow?.focus();
  iframe.contentWindow?.print();
  setTimeout(() => iframe.remove(), 1000);
}

export default function Notepad({ toolId }: WidgetProps) {
  const id = useId();
  const { used, announce, completed, error: trackError } = useTool();
  const [notes, setNotes] = useState<Note[]>(() => [{ id: "first", title: "", body: "", updated: 0 }]);
  const [activeId, setActiveId] = useState("first");
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState<"idle" | "pending" | "saved" | "failed">("idle");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [undo, setUndo] = useState<{ label: string; notes: Note[]; active: string } | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [fileErr, setFileErr] = useState<string | null>(null);
  const [o, setO] = usePersistentOptions(toolId, { font: "sans" as "sans" | "mono" | "serif", size: "md" as "sm" | "md" | "lg" });
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const skipSave = useRef(true);

  // Load after mount (SSR renders one empty note).
  useEffect(() => {
    const n = readNotes();
    const first = n ?? [blank()];
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restore notes from localStorage after hydration
    setNotes(first);
    setActiveId(first[0].id);
    setLoaded(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY) return;
      const fresh = readNotes();
      if (!fresh) return;
      skipSave.current = true;
      setNotes(fresh);
      setActiveId((a) => (fresh.some((x) => x.id === a) ? a : fresh[0].id));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Autosave (debounced).
  useEffect(() => {
    if (!loaded) return;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    const t = setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify({ notes }));
        setSaved("saved");
        setSavedAt(Date.now());
      } catch {
        setSaved("failed");
        trackError("STORAGE_FULL", "save");
      }
    }, 400);
    return () => clearTimeout(t);
  }, [notes, loaded, trackError]);

  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 10_000);
    return () => clearTimeout(t);
  }, [undo]);

  const active = notes.find((n) => n.id === activeId) ?? notes[0];
  const update = (patch: Partial<Note>) => {
    setNotes((ns) => ns.map((n) => (n.id === active.id ? { ...n, ...patch, updated: Date.now() } : n)));
    setSaved("pending");
    used("type");
  };
  const setBody = (body: string) => update({ body });

  const addNote = (init?: Partial<Note>) => {
    if (notes.length >= MAX_NOTES) {
      setFileErr(`You can keep up to ${MAX_NOTES} notes. Delete or download some first.`);
      return;
    }
    const n = { ...blank(), ...init };
    setNotes([n, ...notes]);
    setActiveId(n.id);
    setSaved("pending");
    announce("New note created");
    requestAnimationFrame(() => taRef.current?.focus());
  };
  const deleteNote = () => {
    setUndo({ label: `“${displayTitle(active)}” deleted`, notes, active: active.id });
    const rest = notes.filter((n) => n.id !== active.id);
    const next = rest.length ? rest : [blank()];
    setNotes(next);
    setActiveId(next[0].id);
    setSaved("pending");
    announce("Note deleted. Undo is available for 10 seconds.");
  };
  const deleteAll = () => {
    setUndo({ label: `${notes.length} ${notes.length === 1 ? "note" : "notes"} deleted`, notes, active: active.id });
    const n = blank();
    setNotes([n]);
    setActiveId(n.id);
    setConfirmAll(false);
    setSaved("pending");
    announce("All notes deleted. Undo is available for 10 seconds.");
  };
  const downloadAll = async () => {
    const { zipSync, strToU8 } = await import("fflate");
    const files: Record<string, Uint8Array> = {};
    for (const n of notes) {
      let name = safeName(n);
      let k = 2;
      while (files[name]) name = safeName(n).replace(/\.txt$/, ` (${k++}).txt`);
      files[name] = strToU8(n.body);
    }
    const zip = zipSync(files);
    downloadBlob(new Blob([zip as BlobPart], { type: "application/zip" }), "notes.zip");
    completed("download", { notes: notes.length });
  };
  const openFile = async (f: File) => {
    setFileErr(null);
    if (f.size > 2_000_000) {
      setFileErr("That file is over 2 MB. Browser storage holds about 5 MB in total, so open large files in the online text editor instead.");
      return;
    }
    try {
      const body = await f.text();
      addNote({ title: f.name.replace(/\.[^.]+$/, ""), body });
      used("file");
    } catch {
      setFileErr("Couldn't read that file. Choose a plain text file such as .txt, .md or .csv.");
    }
  };

  const bytes = loaded ? new Blob([JSON.stringify({ notes })]).size : 0;
  const words = wordCount(active.body);
  const fontClass = o.font === "mono" ? "mono" : o.font === "serif" ? "font-serif" : "";
  const sizeClass = o.size === "sm" ? "text-sm" : o.size === "lg" ? "text-lg" : "text-base";

  return (
    <div className="grid gap-4">
      <Alert tone="info">
        Notes save automatically in <strong>this browser on this device</strong> (local storage). They are never uploaded, so they won&apos;t appear on your phone
        or another browser, and clearing site data or closing a private window deletes them. Download anything you can&apos;t afford to lose.
      </Alert>
      <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <nav className="panel grid content-start gap-2 p-3" aria-label="Your notes">
          <Button variant="primary" icon="plus" onClick={() => addNote()}>
            New note
          </Button>
          <ul className="grid max-h-[28rem] gap-1 overflow-y-auto">
            {notes.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  aria-current={n.id === active.id ? "true" : undefined}
                  onClick={() => {
                    setActiveId(n.id);
                    setFindOpen(false);
                  }}
                  className={`w-full rounded-md px-2.5 py-2 text-left text-sm hover:bg-surface-2 ${n.id === active.id ? "bg-accent-subtle font-semibold text-ink" : "text-ink-2"}`}
                >
                  <span className="block truncate">{displayTitle(n)}</span>
                  <span className="block text-xs font-normal text-ink-3">{n.updated ? when(n.updated) : "—"}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-ink-3">
            {notes.length} {notes.length === 1 ? "note" : "notes"} · {formatBytes(bytes)} of about 5 MB browser storage
          </p>
        </nav>

        <div className="panel min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 border-b border-line p-2 sm:px-3">
            <Button variant="ghost" icon="search" aria-expanded={findOpen} onClick={() => setFindOpen(!findOpen)}>
              Find &amp; replace
            </Button>
            <CopyButton text={active.body} disabled={!active.body} variant="ghost" />
            <Button
              variant="ghost"
              icon="download"
              disabled={!active.body && !active.title}
              onClick={() => {
                downloadBlob(new Blob([active.body], { type: "text/plain;charset=utf-8" }), safeName(active));
                completed("download");
              }}
            >
              Download .txt
            </Button>
            <Button variant="ghost" icon="download" onClick={downloadAll} disabled={notes.every((n) => !n.body && !n.title)}>
              Download all (ZIP)
            </Button>
            <Button variant="ghost" icon="file" onClick={() => printText(displayTitle(active), active.body)} disabled={!active.body}>
              Print
            </Button>
            <Button variant="ghost" icon="upload" onClick={() => fileRef.current?.click()}>
              Open .txt
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,.csv,.log,.json,text/plain"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void openFile(f);
                e.target.value = "";
              }}
            />
            <Button variant="ghost" icon="trash" onClick={deleteNote}>
              Delete note
            </Button>
          </div>
          {findOpen && <FindBar text={active.body} setText={(v) => setBody(v)} taRef={taRef} onClose={() => setFindOpen(false)} autoFocus />}
          <div className="grid gap-2 p-3 sm:px-4">
            <label htmlFor={`${id}-title`} className="sr-only">
              Note title
            </label>
            <input
              id={`${id}-title`}
              className="input text-lg font-semibold"
              placeholder="Title (optional)"
              value={active.title}
              maxLength={120}
              onChange={(e) => update({ title: e.target.value })}
            />
            <label htmlFor={`${id}-body`} className="sr-only">
              Note text
            </label>
            <textarea
              id={`${id}-body`}
              ref={taRef}
              className={`textarea ${fontClass} ${sizeClass}`}
              style={{ ["--ta-min" as string]: "18rem", ["--ta-min-lg" as string]: "26rem" }}
              placeholder="Start typing. Your note saves automatically."
              value={active.body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
                  e.preventDefault();
                  setFindOpen(true);
                }
              }}
            />
          </div>
          <div className="flex min-h-10 flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-3 py-2 text-sm text-ink-3 tabular-nums sm:px-4">
            <span>{words.toLocaleString("en-US")} words</span>
            <span>{[...active.body].length.toLocaleString("en-US")} characters</span>
            <span aria-live="polite">
              {saved === "pending" ? "Saving…" : saved === "saved" && savedAt ? `Saved ${new Date(savedAt).toLocaleTimeString()}` : saved === "failed" ? "" : loaded ? "Saved in this browser" : ""}
            </span>
          </div>
          {saved === "failed" && (
            <div className="p-3" role="alert">
              <Alert tone="danger">
                Couldn&apos;t save: browser storage is full or blocked. Download your notes now, then delete large notes to free space.
              </Alert>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <Segmented
          legend="Font"
          value={o.font}
          onChange={(v) => setO({ ...o, font: v })}
          options={[
            { value: "sans", label: "Sans" },
            { value: "serif", label: "Serif" },
            { value: "mono", label: "Monospace" },
          ]}
        />
        <Segmented
          legend="Text size"
          value={o.size}
          onChange={(v) => setO({ ...o, size: v })}
          options={[
            { value: "sm", label: "Small" },
            { value: "md", label: "Medium" },
            { value: "lg", label: "Large" },
          ]}
        />
        <div className="grid gap-1">
          {!confirmAll ? (
            <Button variant="ghost" icon="trash" onClick={() => setConfirmAll(true)} disabled={notes.every((n) => !n.body && !n.title) && notes.length < 2}>
              Delete all notes
            </Button>
          ) : (
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-danger-line bg-danger-subtle p-2 text-sm" role="group" aria-label="Confirm deleting all notes">
              <span>
                Delete all {notes.length} {notes.length === 1 ? "note" : "notes"} from this browser?
              </span>
              <Button variant="primary" onClick={deleteAll}>
                Yes, delete all
              </Button>
              <Button onClick={() => setConfirmAll(false)}>Cancel</Button>
            </div>
          )}
        </div>
        {undo && (
          <p className="text-sm">
            {undo.label}.{" "}
            <button
              type="button"
              className="font-semibold text-accent underline"
              onClick={() => {
                setNotes(undo.notes);
                setActiveId(undo.active);
                setUndo(null);
                setSaved("pending");
                announce("Restored");
              }}
            >
              Undo
            </button>
          </p>
        )}
      </div>
      {fileErr && (
        <div role="alert">
          <Alert tone="danger">{fileErr}</Alert>
        </div>
      )}
    </div>
  );
}
