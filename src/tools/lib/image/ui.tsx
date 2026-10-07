"use client";

/* Shared UI for the image widgets: batch rows, before/after preview, quality and color fields, ZIP, size chips. */

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/Icon";
import { Button, Segmented, downloadBlob, formatBytes } from "../../ui/primitives";
import { useTool } from "../../ui/ToolContext";
import { ImageError, toImageError } from "./canvas";
import { zipFiles } from "./files";
import { formatInt } from "./target";

/* ---------- Batch processing ---------- */

export type RowStatus = "queued" | "working" | "done" | "error" | "stopped";

export interface OutImage {
  blob: Blob;
  name: string;
  width?: number;
  height?: number;
  /** One-line result summary, e.g. "1.8 MB → 19.6 KB · 412 × 550 px". */
  detail?: string;
  /** Problem the user should know about (shown in amber). */
  warn?: string;
  /** Neutral note (shown in gray). */
  info?: string;
  /** The original file is offered unchanged (already under target, or smaller than any re-encode). */
  original?: boolean;
}

export interface Row {
  id: string;
  file: File;
  status: RowStatus;
  out?: OutImage;
  error?: { message: string; link?: { href: string; anchor: string } };
  /** Process even if the original already meets the target. */
  force?: boolean;
}

export type Processor = (row: Row, ctx: { cancelled: () => boolean }) => Promise<OutImage>;

let rowSeq = 0;

/**
 * Sequential batch processor. Starting a new run (new files, changed settings) cancels the previous one
 * through a generation counter; unfinished rows are picked up by the new run.
 */
export function useBatch(processor: Processor, onFinished?: (rows: Row[]) => void) {
  const [rows, setRowsState] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const list = useRef<Row[]>([]);
  const proc = useRef(processor);
  const finished = useRef(onFinished);
  const gen = useRef(0);
  useEffect(() => {
    proc.current = processor;
    finished.current = onFinished;
  });

  const commit = useCallback((next: Row[]) => {
    list.current = next;
    setRowsState(next);
  }, []);
  const patch = useCallback((id: string, p: Partial<Row>) => commit(list.current.map((r) => (r.id === id ? { ...r, ...p } : r))), [commit]);

  const run = useCallback(async (ids: string[]) => {
    const my = ++gen.current;
    const set = new Set(ids);
    commit(list.current.map((r) => (set.has(r.id) ? { ...r, status: "queued", out: undefined, error: undefined } : r)));
    setBusy(true);
    for (const id of ids) {
      if (gen.current !== my) return;
      const row = list.current.find((r) => r.id === id);
      if (!row) continue;
      patch(id, { status: "working" });
      try {
        const out = await proc.current(row, { cancelled: () => gen.current !== my });
        if (gen.current !== my) return;
        patch(id, { status: "done", out });
      } catch (e) {
        if (gen.current !== my) return;
        const err = toImageError(e);
        patch(id, { status: "error", error: { message: err.message, link: err.link } });
      }
    }
    if (gen.current !== my) return;
    setBusy(false);
    finished.current?.(list.current);
  }, [commit, patch]);

  const add = useCallback(
    (files: File[]) => {
      const added = files.map((file) => ({ id: `r${++rowSeq}`, file, status: "queued" as RowStatus }));
      commit([...list.current, ...added]);
      const pending = list.current.filter((r) => r.status !== "done" && r.status !== "error").map((r) => r.id);
      void run(pending);
    },
    [run, commit],
  );

  const rerun = useCallback(() => {
    if (list.current.length) void run(list.current.map((r) => r.id));
  }, [run]);

  const retry = useCallback(
    (id: string, p: Partial<Row> = {}) => {
      commit(list.current.map((r) => (r.id === id ? { ...r, ...p } : r)));
      const pending = list.current.filter((r) => r.id === id || (r.status !== "done" && r.status !== "error")).map((r) => r.id);
      void run(pending);
    },
    [run, commit],
  );

  const stop = useCallback(() => {
    gen.current++;
    commit(list.current.map((r) => (r.status === "queued" || r.status === "working" ? { ...r, status: "stopped" } : r)));
    setBusy(false);
  }, [commit]);

  const remove = useCallback((id: string) => {
    commit(list.current.filter((r) => r.id !== id));
  }, [commit]);

  const clear = useCallback(() => {
    gen.current++;
    commit([]);
    setBusy(false);
  }, [commit]);

  return { rows, busy, add, rerun, retry, stop, remove, clear };
}

/** Re-run a batch when settings change (debounced), but not on first render. */
export function useRerunOnChange(key: string, rerun: () => void, ms = 450) {
  const first = useRef(true);
  const last = useRef(key);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      last.current = key;
      return;
    }
    if (key === last.current) return;
    const t = setTimeout(() => {
      last.current = key;
      rerun();
    }, ms);
    return () => clearTimeout(t);
  }, [key, rerun, ms]);
}

/* ---------- Object URLs ---------- */

export function useObjectUrl(blob: Blob | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- object URL lifecycle follows the blob
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}

/** Transparency checkerboard drawn with theme tokens (functional, shows which areas are transparent). */
export const CHECKER_STYLE = {
  backgroundColor: "var(--surface)",
  backgroundImage:
    "linear-gradient(45deg, var(--line) 25%, transparent 25%), linear-gradient(-45deg, var(--line) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--line) 75%), linear-gradient(-45deg, transparent 75%, var(--line) 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
} as const;

export function BlobImage({ blob, alt, className = "", fallback }: { blob?: Blob | null; alt: string; className?: string; fallback?: ReactNode }) {
  const url = useObjectUrl(blob);
  const [failed, setFailed] = useState<string | null>(null);
  if (!url) return null;
  if (failed === url) return <>{fallback ?? null}</>;
  // eslint-disable-next-line @next/next/no-img-element -- local object URL
  return <img src={url} alt={alt} className={className} onError={() => setFailed(url)} />;
}

/* ---------- Errors ---------- */

export function ErrorText({ message, link }: { message: string; link?: { href: string; anchor: string } }) {
  return (
    <>
      {message}
      {link && (
        <>
          {" "}
          <Link href={link.href} className="text-accent underline">
            {link.anchor}
          </Link>
          .
        </>
      )}
    </>
  );
}

export function errorOf(e: unknown): { message: string; link?: { href: string; anchor: string }; code: string } {
  const err = e instanceof ImageError ? e : toImageError(e);
  return { message: err.message, link: err.link, code: err.code };
}

/* ---------- Row list ---------- */

const STATUS_TEXT: Record<RowStatus, string> = {
  queued: "Waiting…",
  working: "Working…",
  done: "Done",
  error: "Failed",
  stopped: "Stopped",
};

export function RowList({
  rows,
  selected,
  onSelect,
  onRemove,
  extra,
  title = "Files",
}: {
  rows: Row[];
  selected?: string | null;
  onSelect?: (id: string) => void;
  onRemove: (id: string) => void;
  extra?: (row: Row) => ReactNode;
  title?: string;
}) {
  const { completed } = useTool();
  return (
    <ul aria-label={title} className="grid gap-2">
      {rows.map((r) => {
        const out = r.out;
        return (
          <li
            key={r.id}
            className={`grid h-[5.25rem] grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border px-2.5 shadow-sm transition-colors sm:px-3 ${
              selected === r.id ? "border-accent bg-accent-subtle" : "border-line bg-surface hover:border-line-strong"
            }`}
          >
            <div className="flex size-14 items-center justify-center overflow-hidden rounded-md border border-line" style={CHECKER_STYLE}>
              {out ? (
                <BlobImage blob={out.blob} alt="" className="max-h-full max-w-full object-contain" fallback={<Icon name="image" size={20} className="text-ink-3" />} />
              ) : r.status === "working" ? (
                <Icon name="loader" size={20} className="animate-spin text-ink-3" />
              ) : (
                <Icon name="image" size={20} className="text-ink-3" />
              )}
            </div>
            <div className="min-w-0 text-sm leading-5">
              <p className="truncate font-semibold text-ink" title={r.file.name}>
                {r.file.name}
              </p>
              <p className="truncate text-ink-2 tabular-nums" title={out?.detail}>
                {r.status === "done" && out ? (out.detail ?? formatBytes(out.blob.size)) : r.status === "error" ? "Failed" : `${formatBytes(r.file.size)} · ${STATUS_TEXT[r.status]}`}
              </p>
              {r.status === "error" && r.error ? (
                <p className="truncate text-danger" title={r.error.message}>
                  <ErrorText message={r.error.message} link={r.error.link} />
                </p>
              ) : out?.warn ? (
                <p className="truncate text-warning" title={out.warn}>
                  {out.warn}
                </p>
              ) : out?.info ? (
                <p className="truncate text-ink-3" title={out.info}>
                  {out.info}
                </p>
              ) : (
                <p className="text-ink-3">&nbsp;</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              {extra?.(r)}
              {onSelect && out && (
                <Button variant="ghost" icon="eye" aria-label={`Preview ${r.file.name}`} aria-pressed={selected === r.id} onClick={() => onSelect(r.id)}>
                  <span className="hidden md:inline">Preview</span>
                </Button>
              )}
              {out && (
                <Button
                  variant="secondary"
                  icon="download"
                  aria-label={`Download ${out.name}`}
                  onClick={() => {
                    downloadBlob(out.blob, out.name);
                    completed("download");
                  }}
                >
                  <span className="hidden sm:inline">Download</span>
                </Button>
              )}
              <Button variant="ghost" icon="x" aria-label={`Remove ${r.file.name}`} onClick={() => onRemove(r.id)} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Summary line + Download all (ZIP) + Clear, shown above the rows. */
export function BatchBar({
  rows,
  zipName,
  onClear,
  onStop,
  busy,
  extraFiles,
}: {
  rows: Row[];
  zipName: string;
  onClear: () => void;
  onStop?: () => void;
  busy: boolean;
  extraFiles?: { name: string; blob: Blob }[];
}) {
  const done = rows.filter((r) => r.status === "done" && r.out);
  const failed = rows.filter((r) => r.status === "error").length;
  const before = done.reduce((n, r) => n + r.file.size, 0);
  const after = done.reduce((n, r) => n + (r.out?.blob.size ?? 0), 0);
  return (
    <div className="toolbar">
      <p className="text-sm font-medium text-ink-2 tabular-nums" aria-live="polite">
        {busy
          ? `Processing ${rows.filter((r) => r.status === "done" || r.status === "error").length + 1} of ${rows.length}…`
          : done.length
            ? `${done.length} of ${rows.length} ready · ${formatBytes(before)} → ${formatBytes(after)}${failed ? ` · ${failed} failed` : ""}`
            : `${rows.length} file${rows.length === 1 ? "" : "s"}`}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {busy && onStop && (
          <Button variant="secondary" icon="x" onClick={onStop}>
            Stop
          </Button>
        )}
        {done.length > 1 && (
          <ZipButton
            files={[...done.map((r) => ({ name: r.out!.name, blob: r.out!.blob })), ...(extraFiles ?? [])]}
            zipName={zipName}
            disabled={busy}
          />
        )}
        <Button variant="ghost" icon="trash" onClick={onClear}>
          Clear all
        </Button>
      </div>
    </div>
  );
}

export function ZipButton({
  files,
  zipName,
  disabled,
  label = "Download all (ZIP)",
  variant = "primary",
}: {
  files: { name: string; blob: Blob }[];
  zipName: string;
  disabled?: boolean;
  label?: string;
  variant?: "primary" | "secondary";
}) {
  const { completed, announce, error } = useTool();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant={variant}
      icon="download"
      busy={busy}
      disabled={disabled || busy || !files.length}
      onClick={async () => {
        setBusy(true);
        try {
          const zip = await zipFiles(files);
          downloadBlob(zip, zipName);
          completed("download_zip", { files: files.length });
          announce(`ZIP with ${files.length} files downloaded`);
        } catch {
          error("ZIP_FAILED", "output");
          announce("The ZIP file couldn't be created.");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Preparing…" : label}
    </Button>
  );
}

/* ---------- Before / after ---------- */

export function Compare({
  before,
  after,
  beforeInfo,
  afterInfo,
  afterLabel = "Result",
  note,
}: {
  before: Blob | null;
  after: Blob | null;
  beforeInfo?: ReactNode;
  afterInfo?: ReactNode;
  afterLabel?: string;
  note?: ReactNode;
}) {
  const box = "flex h-56 items-center justify-center overflow-hidden rounded-lg border border-line shadow-sm sm:h-72";
  return (
    <figure className="grid gap-2">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <div className={box} style={CHECKER_STYLE}>
            <BlobImage
              blob={before}
              alt="Original image"
              className="max-h-full max-w-full object-contain"
              fallback={<span className="px-4 text-center text-sm text-ink-3">Your browser can&apos;t display this format, but it was converted.</span>}
            />
          </div>
          <p className="mt-2 text-sm text-ink-2 tabular-nums">
            <span className="font-semibold text-ink">Original</span> {beforeInfo}
          </p>
        </div>
        <div className="min-w-0">
          <div className={box} style={CHECKER_STYLE}>
            {after ? <BlobImage blob={after} alt={`${afterLabel} image`} className="max-h-full max-w-full object-contain" /> : <span className="text-sm text-ink-3">Working…</span>}
          </div>
          <p className="mt-2 text-sm text-ink-2 tabular-nums">
            <span className="font-semibold text-accent">{afterLabel}</span> {afterInfo}
          </p>
        </div>
      </div>
      {note && <figcaption className="text-sm leading-6 text-ink-3">{note}</figcaption>}
    </figure>
  );
}

/* ---------- Fields ---------- */

/** Range slider paired with a number field (WCAG 2.5.7: dragging is never the only way). */
export function RangeNumber({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = "",
  valueText,
  help,
  leftHint,
  rightHint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  valueText?: (v: number) => string;
  help?: ReactNode;
  leftHint?: string;
  rightHint?: string;
}) {
  const id = useId();
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <div className="min-w-0">
      <label htmlFor={`${id}-n`} className="field-label">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <input
          type="range"
          aria-label={`${label} slider`}
          aria-valuetext={valueText ? valueText(value) : `${value}${unit}`}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-9 min-w-0 flex-1 accent-[var(--accent)]"
        />
        <div className="flex items-center gap-1">
          <input
            id={`${id}-n`}
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            step={step}
            value={draft ?? String(value)}
            onChange={(e) => {
              setDraft(e.target.value);
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n) && n >= min && n <= max) onChange(n);
            }}
            onBlur={() => {
              if (draft !== null) {
                const n = Number(draft);
                onChange(clamp(Number.isFinite(n) && draft !== "" ? n : value));
              }
              setDraft(null);
            }}
            className="input w-20 text-right tabular-nums"
            aria-describedby={help ? `${id}-h` : undefined}
          />
          {unit && <span className="text-sm text-ink-3">{unit}</span>}
        </div>
      </div>
      {(leftHint || rightHint) && (
        <div className="mt-0.5 flex justify-between text-xs text-ink-3" aria-hidden="true">
          <span>{leftHint}</span>
          <span>{rightHint}</span>
        </div>
      )}
      {help && (
        <p id={`${id}-h`} className="field-help">
          {help}
        </p>
      )}
    </div>
  );
}

/** Background color for transparent areas: (Transparent) / White / Black / Custom. "transparent" = none. */
export function BackgroundField({
  value,
  onChange,
  legend = "Background for transparent areas",
  allowTransparent = false,
}: {
  value: string;
  onChange: (v: string) => void;
  legend?: string;
  allowTransparent?: boolean;
}) {
  const id = useId();
  const v = value.toLowerCase();
  const mode = v === "transparent" ? "transparent" : v === "#ffffff" ? "white" : v === "#000000" ? "black" : "custom";
  const options = [
    ...(allowTransparent ? [{ value: "transparent", label: "Transparent" }] : []),
    { value: "white", label: "White" },
    { value: "black", label: "Black" },
    { value: "custom", label: "Custom" },
  ];
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Segmented
        legend={legend}
        value={mode}
        onChange={(m) =>
          onChange(m === "transparent" ? "transparent" : m === "white" ? "#ffffff" : m === "black" ? "#000000" : mode === "custom" ? value : "#f2f2f2")
        }
        options={options}
      />
      {mode === "custom" && (
        <div>
          <label htmlFor={`${id}-c`} className="field-label">
            Color
          </label>
          <input
            id={`${id}-c`}
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-11 w-16 cursor-pointer rounded-md border border-line-strong bg-surface p-1"
          />
        </div>
      )}
    </div>
  );
}

/** Optional positive integer field ("" = not set). */
export function NumberField({
  label,
  value,
  onChange,
  placeholder,
  help,
  min = 1,
  max = 30000,
  suffix,
  error,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  help?: ReactNode;
  min?: number;
  max?: number;
  suffix?: string;
  error?: string | null;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value === null ? "" : String(value));
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="flex items-center gap-1.5">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          value={shown}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-e` : help ? `${id}-h` : undefined}
          onChange={(e) => {
            const v = e.target.value;
            setDraft(v);
            if (v === "") onChange(null);
            else {
              const n = Number(v);
              if (Number.isFinite(n) && n >= min && n <= max) onChange(n);
            }
          }}
          onBlur={() => setDraft(null)}
          className="input w-full min-w-0 tabular-nums"
        />
        {suffix && <span className="text-sm text-ink-3">{suffix}</span>}
      </div>
      {error ? (
        <p id={`${id}-e`} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      ) : (
        help && (
          <p id={`${id}-h`} className="field-help">
            {help}
          </p>
        )
      )}
    </div>
  );
}

/* ---------- Progress ---------- */

export function Progress({ label, value, max, onCancel }: { label: string; value: number; max: number; onCancel?: () => void }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="grid gap-2.5 rounded-lg border border-line bg-surface p-3.5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-ink tabular-nums">{label}</p>
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
        className="h-2.5 overflow-hidden rounded-full border border-line bg-surface-2"
      >
        <div className="h-full rounded-full bg-accent transition-[width] duration-150" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ---------- Size chips ---------- */

export const SIZE_PAGES: { kb: number; label: string; href: string }[] = [
  { kb: 10, label: "10 KB", href: "/compress-image-to-10kb/" },
  { kb: 20, label: "20 KB", href: "/compress-image-to-20kb/" },
  { kb: 30, label: "30 KB", href: "/compress-jpeg-to-30kb/" },
  { kb: 50, label: "50 KB", href: "/compress-image-to-50kb/" },
  { kb: 100, label: "100 KB", href: "/compress-jpeg-to-100kb/" },
  { kb: 200, label: "200 KB", href: "/compress-jpeg-to-200kb/" },
  { kb: 1000, label: "1 MB", href: "/compress-image-to-1mb/" },
];

export function SizeChips({ current, custom = true }: { current?: number; custom?: boolean }) {
  return (
    <nav aria-label="Other target sizes" className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-sm text-ink-3">Other sizes:</span>
      {SIZE_PAGES.map((s) => (
        <Link key={s.kb} href={s.href} className="chip" aria-current={current === s.kb ? "page" : undefined}>
          {s.label}
        </Link>
      ))}
      {custom && (
        <Link href="/reduce-image-size-in-kb/" className="chip">
          Custom size
        </Link>
      )}
    </nav>
  );
}

/* ---------- Small helpers ---------- */

export function dims(w?: number, h?: number): string {
  return w && h ? `${formatInt(w)} × ${formatInt(h)} px` : "";
}

/** True once the component has mounted (client-only values such as canEncode). */
export function useMounted(): boolean {
  const [m, setM] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount flag
    setM(true);
  }, []);
  return m;
}

export const IMAGE_ACCEPT = "image/*,.heic,.heif,.avif,.webp,.svg";
export const EXIF_NOTE = "Location and camera details (EXIF) are removed from saved images.";
