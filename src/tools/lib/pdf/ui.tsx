"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { Button, downloadBlob, formatBytes } from "../../ui/primitives";
import { useTool } from "../../ui/ToolContext";
import { canvasToBlob, releaseCanvas, renderPage } from "./core";

/* ---------- Progress with Cancel ---------- */

export function Progress({ label, value, max, onCancel }: { label: string; value: number; max: number; onCancel?: () => void }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="grid gap-2 rounded-md border border-line bg-surface p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink tabular-nums" aria-live="polite">
          {label}
        </p>
        {onCancel && (
          <Button variant="secondary" icon="x" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-2 overflow-hidden rounded-full bg-surface-2"
      >
        <div className="h-full bg-accent transition-[width] duration-150" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ---------- Thumbnails ---------- */

/**
 * Renders small JPEG thumbnails of the first `maxPages` pages, one at a time, and returns their
 * object URLs (undefined until rendered). URLs are revoked when the document changes or on unmount.
 */
export function usePdfThumbnails(doc: PDFDocumentProxy | null, width = 150, maxPages = Infinity): (string | undefined)[] {
  const [state, setState] = useState<{ doc: PDFDocumentProxy | null; urls: (string | undefined)[] }>({ doc: null, urls: [] });
  useEffect(() => {
    if (!doc) return;
    let stop = false;
    const made: string[] = [];
    const count = Math.min(doc.numPages, maxPages);
    (async () => {
      const dpr = typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio || 1) : 1;
      for (let i = 1; i <= count && !stop; i++) {
        try {
          const r = await renderPage(doc, i, { width: width * dpr, maxPixels: 1_500_000 });
          const blob = await canvasToBlob(r.canvas, "image/jpeg", 0.75);
          releaseCanvas(r.canvas);
          if (stop) break;
          const url = URL.createObjectURL(blob);
          made.push(url);
          setState((prev) => {
            const urls = prev.doc === doc ? prev.urls.slice() : [];
            urls[i - 1] = url;
            return { doc, urls };
          });
        } catch {
          if (stop) break;
        }
      }
    })();
    return () => {
      stop = true;
      made.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [doc, width, maxPages]);
  return state.doc === doc && doc ? state.urls : [];
}

/** A page thumbnail box that keeps its space while the image loads. */
export function Thumb({
  url,
  alt,
  rotation = 0,
  aspect,
  children,
}: {
  url?: string;
  alt: string;
  rotation?: number;
  /** width / height of the unrotated page. */
  aspect?: number;
  children?: ReactNode;
}) {
  const swap = rotation % 180 !== 0;
  // The box is 3:4. When a page is turned sideways, shrink it so it still fits the box.
  const fit = swap ? (aspect === undefined ? 0.75 : aspect < 0.75 ? 0.75 : Math.min(1, aspect)) : 1;
  return (
    <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-sm border border-line bg-surface-2">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- local object URL
        <img
          src={url}
          alt={alt}
          className="max-h-full max-w-full object-contain transition-transform duration-150"
          style={{
            transform: rotation ? `rotate(${rotation}deg) scale(${fit})` : undefined,
          }}
        />
      ) : (
        <span className="text-xs text-ink-3">Loading…</span>
      )}
      {children}
    </div>
  );
}

/* ---------- Reorderable list (buttons + drag) ---------- */

export interface ReorderItem {
  id: string;
  name: string;
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = list.slice();
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
}

/**
 * Ordered list with Move up / Move down / Remove buttons on every row and optional
 * drag-and-drop reordering. Moves are announced to screen readers.
 */
export function ReorderList<T extends ReorderItem>({
  items,
  onChange,
  renderRow,
  label,
}: {
  items: T[];
  onChange: (next: T[]) => void;
  renderRow: (item: T, index: number) => ReactNode;
  label: string;
}) {
  const { announce } = useTool();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const focusAfter = useRef<string | null>(null);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (!focusAfter.current || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLButtonElement>(`[data-focus="${focusAfter.current}"]`);
    focusAfter.current = null;
    el?.focus();
  });

  const move = (from: number, to: number, focusKey?: string) => {
    if (to < 0 || to >= items.length) return;
    const item = items[from];
    onChange(moveItem(items, from, to));
    announce(`${item.name} moved to position ${to + 1} of ${items.length}`);
    if (focusKey) focusAfter.current = `${item.id}:${focusKey}`;
  };

  return (
    <ol ref={listRef} aria-label={label} className="grid gap-2">
      {items.map((item, i) => (
        <li
          key={item.id}
          draggable
          onDragStart={(e) => {
            setDragId(item.id);
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", item.id);
          }}
          onDragOver={(e) => {
            if (!dragId) return;
            e.preventDefault();
            setOverId(item.id);
          }}
          onDragLeave={() => setOverId((o) => (o === item.id ? null : o))}
          onDrop={(e) => {
            e.preventDefault();
            const from = items.findIndex((x) => x.id === dragId);
            if (from >= 0) move(from, i);
            setDragId(null);
            setOverId(null);
          }}
          onDragEnd={() => {
            setDragId(null);
            setOverId(null);
          }}
          className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border bg-surface p-2 sm:flex-nowrap ${
            overId === item.id && dragId !== item.id ? "border-accent" : "border-line"
          } ${dragId === item.id ? "opacity-60" : ""}`}
        >
          <span className="hidden w-6 shrink-0 cursor-grab text-center text-sm text-ink-3 select-none sm:block" aria-hidden="true" title="Drag to reorder">
            ⋮⋮
          </span>
          <span className="w-6 shrink-0 text-center text-sm font-semibold text-ink-2 tabular-nums">{i + 1}</span>
          <div className="min-w-0 flex-1">{renderRow(item, i)}</div>
          <div className="flex shrink-0 gap-1">
            <Button
              variant="secondary"
              className="btn-icon"
              icon="arrow-up"
              aria-label={`Move ${item.name} up`}
              data-focus={`${item.id}:up`}
              disabled={i === 0}
              onClick={() => move(i, i - 1, "up")}
            />
            <Button
              variant="secondary"
              className="btn-icon"
              icon="arrow-down"
              aria-label={`Move ${item.name} down`}
              data-focus={`${item.id}:down`}
              disabled={i === items.length - 1}
              onClick={() => move(i, i + 1, "down")}
            />
            <Button
              variant="secondary"
              className="btn-icon"
              icon="trash"
              aria-label={`Remove ${item.name}`}
              onClick={() => {
                onChange(items.filter((x) => x.id !== item.id));
                announce(`${item.name} removed`);
              }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ---------- Output files ---------- */

export interface OutFile {
  name: string;
  blob: Blob;
  detail?: string;
}

export function OutFileRow({ file, primary }: { file: OutFile; primary?: boolean }) {
  const { completed } = useTool();
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-surface px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink">{file.name}</p>
        <p className="text-sm text-ink-3 tabular-nums">
          {formatBytes(file.blob.size)}
          {file.detail ? ` · ${file.detail}` : ""}
        </p>
      </div>
      <Button
        variant={primary ? "primary" : "secondary"}
        icon="download"
        onClick={() => {
          downloadBlob(file.blob, file.name);
          completed("download");
        }}
      >
        Download
      </Button>
    </li>
  );
}

/** Keeps a list of object URLs and revokes them when replaced or on unmount. */
export function useObjectUrls() {
  const ref = useRef<string[]>([]);
  useEffect(() => () => ref.current.forEach((u) => URL.revokeObjectURL(u)), []);
  return {
    make(blob: Blob) {
      const u = URL.createObjectURL(blob);
      ref.current.push(u);
      return u;
    },
    clear() {
      ref.current.forEach((u) => URL.revokeObjectURL(u));
      ref.current = [];
    },
  };
}

/** Hides the empty-state text once files are chosen; shows limits before upload. */
export function DropHint({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-sm text-ink-3">{children}</p>;
}
