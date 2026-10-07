"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as RPointerEvent } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { useTool } from "../ui/ToolContext";
import { FileDrop } from "../ui/FileDrop";
import { Alert, Button, Checkbox, Field, Panel, Segmented, formatBytes, usePersistentOptions } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { baseName, canvasToBlob, errorCode, errorMessage, openForEdit, openForRender, parseRanges, plural, readBytes, releaseCanvas, renderPage, toBlob, uid } from "../lib/pdf/core";
import {
  CSS_FONT,
  TEXT_LINE,
  applyEdits,
  fontCharsets,
  pageGeom,
  readFormFields,
  unsupportedChars,
  type EditImage,
  type EditItem,
  type FontName,
  type FormField,
  type PageGeom,
} from "../lib/pdf/annotate";
import { SignatureMaker } from "../lib/pdf/signature";
import { OutFileRow, type OutFile } from "../lib/pdf/ui";

type ColorName = "black" | "blue" | "red";
const COLORS: Record<ColorName, [number, number, number]> = { black: [0, 0, 0], blue: [0.1, 0.24, 0.62], red: [0.75, 0.1, 0.1] };
const colorName = (c?: [number, number, number]): ColorName => (c ? ((Object.keys(COLORS) as ColorName[]).find((k) => COLORS[k][0] === c[0]) ?? "black") : "black");
const css = (c?: [number, number, number]) => (c ? `rgb(${c.map((v) => Math.round(v * 255)).join(",")})` : "#000");

type DateFormat = "iso" | "us" | "eu" | "long";
function formatDate(f: DateFormat, d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  if (f === "iso") return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  if (f === "us") return `${p(d.getMonth() + 1)}/${p(d.getDate())}/${d.getFullYear()}`;
  if (f === "eu") return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

interface Loaded {
  name: string;
  size: number;
  bytes: Uint8Array;
  geoms: PageGeom[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const KIND_LABEL: Record<EditItem["kind"], string> = { text: "Text", check: "Check mark", cross: "Cross", whiteout: "Whiteout box", image: "Signature" };

function describe(it: EditItem) {
  if (it.kind === "text") return `${it.label ?? "Text"}: “${(it.text ?? "").split("\n")[0].slice(0, 30) || "empty"}”`;
  return KIND_LABEL[it.kind];
}

/* ---------- Page view with movable items ---------- */

function PageCanvas({
  view,
  pageIndex,
  geom,
  items,
  selected,
  onSelect,
  onChange,
  onRemove,
  imageUrl,
}: {
  view: PDFDocumentProxy;
  pageIndex: number;
  geom: PageGeom;
  items: EditItem[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  onChange: (id: string, patch: Partial<EditItem>) => void;
  onRemove: (id: string) => void;
  imageUrl: (img: EditImage) => string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [src, setSrc] = useState<{ key: string; url: string } | null>(null);
  const drag = useRef<{ id: string; mode: "move" | "resize"; sx: number; sy: number; ox: number; oy: number; ow: number; oh: number; keep: boolean } | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.round(el.clientWidth)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = width ? width / geom.w : 0;
  const renderW = width ? Math.min(2000, Math.ceil((width * Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1)) / 100) * 100) : 0;

  useEffect(() => {
    if (!renderW) return;
    let stop = false;
    let made: string | null = null;
    (async () => {
      try {
        const r = await renderPage(view, pageIndex + 1, { width: renderW, maxPixels: 6_000_000 });
        const blob = await canvasToBlob(r.canvas, "image/jpeg", 0.85);
        releaseCanvas(r.canvas);
        if (stop) return;
        made = URL.createObjectURL(blob);
        setSrc({ key: `${pageIndex}:${renderW}`, url: made });
      } catch {
        /* the page stays blank; editing still works */
      }
    })();
    return () => {
      stop = true;
      if (made) URL.revokeObjectURL(made);
    };
  }, [view, pageIndex, renderW]);

  const clamp = (it: EditItem, x: number, y: number) => ({
    x: round1(Math.max(-it.w / 2, Math.min(geom.w - Math.max(4, it.w / 2), x))),
    y: round1(Math.max(0, Math.min(geom.h - 4, y))),
  });

  const onPointerDown = (e: RPointerEvent, it: EditItem, mode: "move" | "resize") => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (mode === "move") (e.currentTarget as HTMLElement).focus({ preventScroll: true });
    onSelect(it.id);
    const el = (mode === "move" ? e.currentTarget : e.currentTarget.parentElement) as HTMLElement;
    const w = it.kind === "text" ? el.offsetWidth / scale : it.w;
    const h = it.kind === "text" ? el.offsetHeight / scale : it.h;
    drag.current = { id: it.id, mode, sx: e.clientX, sy: e.clientY, ox: it.x, oy: it.y, ow: w, oh: h, keep: it.kind !== "whiteout" };
  };
  const onPointerMove = (e: RPointerEvent, it: EditItem) => {
    const d = drag.current;
    if (!d || d.id !== it.id || !scale) return;
    const dx = (e.clientX - d.sx) / scale;
    const dy = (e.clientY - d.sy) / scale;
    if (d.mode === "move") onChange(it.id, clamp({ ...it, w: d.ow }, d.ox + dx, d.oy + dy));
    else if (it.kind === "text") {
      onChange(it.id, { size: Math.max(4, Math.min(144, round1(((it.size ?? 12) * (d.oh + dy)) / d.oh))) });
    } else {
      let w = Math.max(6, d.ow + dx);
      let h = Math.max(6, d.oh + dy);
      if (d.keep) h = (w * d.oh) / d.ow;
      w = Math.min(w, geom.w - it.x);
      h = Math.min(h, geom.h - it.y);
      if (d.keep) w = Math.min(w, (h * d.ow) / d.oh);
      onChange(it.id, { w: round1(w), h: round1(d.keep ? (w * d.oh) / d.ow : h) });
    }
  };
  const onPointerUp = () => (drag.current = null);

  const onKey = (e: KeyboardEvent, it: EditItem) => {
    const step = e.shiftKey ? 10 : 1;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (moves[e.key]) {
      e.preventDefault();
      onChange(it.id, clamp(it, it.x + moves[e.key][0], it.y + moves[e.key][1]));
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      onRemove(it.id);
    } else if (e.key === "+" || e.key === "=" || e.key === "-") {
      e.preventDefault();
      const k = e.key === "-" ? 0.92 : 1.08;
      if (it.kind === "text") onChange(it.id, { size: Math.max(4, Math.min(144, round1((it.size ?? 12) * k))) });
      else onChange(it.id, { w: round1(Math.max(6, it.w * k)), h: round1(Math.max(6, it.h * k)) });
    } else if (e.key === "Escape") onSelect(null);
  };

  const ready = src?.key === `${pageIndex}:${renderW}`;

  return (
    <div
      ref={box}
      className="relative w-full touch-none overflow-hidden rounded-sm border border-line-strong bg-white select-none"
      style={{ aspectRatio: `${geom.w} / ${geom.h}` }}
      onPointerDown={() => onSelect(null)}
    >
      {ready ? (
        // eslint-disable-next-line @next/next/no-img-element -- rendered page (object URL)
        <img src={src.url} alt={`Page ${pageIndex + 1}`} className="pointer-events-none absolute inset-0 h-full w-full" draggable={false} />
      ) : (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-ink-3">Rendering page {pageIndex + 1}…</p>
      )}
      {scale > 0 &&
        items.map((it) => {
          const sel = it.id === selected;
          const common = {
            tabIndex: 0,
            role: "button",
            "aria-label": `${describe(it)}, at ${Math.round(it.x)}, ${Math.round(it.y)} points. Arrow keys move it, plus and minus resize it, Delete removes it.`,
            "aria-pressed": sel,
            onPointerDown: (e: RPointerEvent) => onPointerDown(e, it, "move"),
            onPointerMove: (e: RPointerEvent) => onPointerMove(e, it),
            onPointerUp,
            onPointerCancel: onPointerUp,
            onKeyDown: (e: KeyboardEvent) => onKey(e, it),
            onFocus: () => onSelect(it.id),
            className: `absolute cursor-move outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus ${sel ? "outline-2 outline-dashed outline-accent" : "hover:outline-1 hover:outline-dashed hover:outline-ink-3"}`,
          } as const;
          const pos = { left: it.x * scale, top: it.y * scale };
          const handle = sel && (
            <span
              aria-hidden="true"
              className="absolute -right-2 -bottom-2 size-4 cursor-nwse-resize rounded-sm border-2 border-accent bg-surface"
              onPointerDown={(e) => onPointerDown(e, it, "resize")}
              onPointerMove={(e) => onPointerMove(e, it)}
              onPointerUp={onPointerUp}
            />
          );
          if (it.kind === "text") {
            return (
              <div
                key={it.id}
                {...common}
                style={{
                  ...pos,
                  fontFamily: CSS_FONT[it.font ?? "helvetica"],
                  fontSize: (it.size ?? 12) * scale,
                  lineHeight: TEXT_LINE,
                  color: css(it.color),
                  whiteSpace: "pre",
                  minWidth: 8,
                }}
              >
                {it.text || " "}
                {handle}
              </div>
            );
          }
          const sizeStyle = { ...pos, width: it.w * scale, height: it.h * scale };
          if (it.kind === "image" && it.image) {
            return (
              <div key={it.id} {...common} style={sizeStyle}>
                {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
                <img src={imageUrl(it.image)} alt="" className="pointer-events-none h-full w-full" draggable={false} />
                {handle}
              </div>
            );
          }
          if (it.kind === "whiteout") {
            return (
              <div key={it.id} {...common} style={{ ...sizeStyle, background: css(it.color ?? [1, 1, 1]), boxShadow: sel ? undefined : "inset 0 0 0 1px rgba(0,0,0,0.15)" }}>
                {handle}
              </div>
            );
          }
          const sw = Math.max(1, Math.min(it.w, it.h) * 0.12);
          return (
            <div key={it.id} {...common} style={sizeStyle}>
              <svg viewBox={`0 0 ${it.w} ${it.h}`} className="pointer-events-none h-full w-full" aria-hidden="true">
                <path
                  d={
                    it.kind === "check"
                      ? `M${0.12 * it.w} ${0.55 * it.h} L${0.4 * it.w} ${0.82 * it.h} L${0.9 * it.w} ${0.18 * it.h}`
                      : `M${0.18 * it.w} ${0.18 * it.h} L${0.82 * it.w} ${0.82 * it.h} M${0.82 * it.w} ${0.18 * it.h} L${0.18 * it.w} ${0.82 * it.h}`
                  }
                  stroke={css(it.color)}
                  strokeWidth={sw}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
              {handle}
            </div>
          );
        })}
    </div>
  );
}

/* ---------- Widget ---------- */

export default function PdfAnnotate({ toolId, config }: WidgetProps) {
  const id = useId();
  const sign = config?.mode === "sign";
  const { completed, error: trackError, announce, used } = useTool();
  const [prefs, setPrefs] = usePersistentOptions(toolId, { font: "helvetica" as FontName, size: 12, color: "black" as ColorName, date: "iso" as DateFormat });
  const [file, setFile] = useState<Loaded | null>(null);
  const [view, setView] = useState<PDFDocumentProxy | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<EditItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [signature, setSignature] = useState<EditImage | null>(null);
  const [makerOpen, setMakerOpen] = useState(sign);
  const [fields, setFields] = useState<FormField[]>([]);
  const [xfa, setXfa] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string | boolean>>({});
  const [flatten, setFlatten] = useState(false);
  const [charsets, setCharsets] = useState<Record<FontName, Set<number>> | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<OutFile | null>(null);
  const [copyRange, setCopyRange] = useState("");
  const [copyError, setCopyError] = useState<string | null>(null);
  const [imgUrls, setImgUrls] = useState<Record<string, string>>({});
  const madeUrls = useRef<string[]>([]);

  useEffect(() => () => void view?.destroy(), [view]);
  useEffect(() => {
    const list = madeUrls.current;
    return () => list.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const imageUrl = useCallback((img: EditImage) => imgUrls[img.id] ?? "", [imgUrls]);
  const rememberImage = (img: EditImage) => {
    const u = URL.createObjectURL(new Blob([img.bytes as Uint8Array<ArrayBuffer>], { type: "image/png" }));
    madeUrls.current.push(u);
    setImgUrls((m) => ({ ...m, [img.id]: u }));
  };

  const load = async (files: File[]) => {
    const f = files[0];
    setProblem(null);
    setResult(null);
    setLoading(true);
    try {
      const bytes = await readBytes(f);
      const doc = await openForEdit(bytes, f.name);
      const geoms = doc.getPages().map(pageGeom);
      const v = await openForRender(bytes, f.name);
      setView(v);
      setFile({ name: f.name, size: f.size, bytes, geoms });
      setItems([]);
      setSelected(null);
      setPage(0);
      setFormValues({});
      setCharsets(await fontCharsets());
      if (!sign) {
        const ff = await readFormFields(bytes, f.name).catch(() => ({ fields: [], xfa: false }));
        setFields(ff.fields);
        setXfa(ff.xfa);
      }
      announce(`${f.name} opened, ${plural(geoms.length, "page")}`);
    } catch (e) {
      setFile(null);
      setView(null);
      setProblem(errorMessage(e));
      trackError(errorCode(e), "input");
    } finally {
      setLoading(false);
    }
  };

  const geom = file?.geoms[page];
  const sel = items.find((i) => i.id === selected) ?? null;

  const update = (itemId: string, patch: Partial<EditItem>) => {
    setItems((list) => list.map((i) => (i.id === itemId ? { ...i, ...patch } : i)));
    setResult(null);
  };
  const remove = (itemId: string) => {
    const it = items.find((i) => i.id === itemId);
    setItems((list) => list.filter((i) => i.id !== itemId));
    setSelected(null);
    setResult(null);
    if (it) announce(`${describe(it)} removed`);
  };

  const add = (kind: EditItem["kind"], extra: Partial<EditItem> = {}) => {
    if (!geom) return;
    used(`add_${kind}`);
    const w = extra.w ?? (kind === "whiteout" ? 140 : kind === "image" ? 150 : 16);
    const h = extra.h ?? (kind === "whiteout" ? 22 : 16);
    const it: EditItem = {
      id: uid(),
      page,
      kind,
      x: round1(Math.max(0, (geom.w - (kind === "text" ? 120 : w)) / 2)),
      y: round1(Math.max(0, (geom.h - h) / 2)),
      w,
      h,
      ...(kind === "text" ? { font: prefs.font, size: prefs.size, color: COLORS[prefs.color], text: "" } : {}),
      ...(kind === "check" || kind === "cross" ? { color: COLORS[prefs.color] } : {}),
      ...extra,
    };
    setItems((l) => [...l, it]);
    setSelected(it.id);
    setResult(null);
    announce(`${describe(it)} added to page ${page + 1}. Use the fields below or the arrow keys to position it.`);
    if (kind === "text") setTimeout(() => document.getElementById(`${id}-text`)?.focus(), 50);
  };

  const addSignature = (img: EditImage) => {
    if (!geom) return;
    const w = Math.min(160, geom.w * 0.4);
    const h = (w * img.height) / img.width;
    add("image", { image: img, w: round1(w), h: round1(h), x: round1(geom.w - w - geom.w * 0.12), y: round1(geom.h * 0.78 - h) });
  };

  const copyToPages = (all: boolean) => {
    if (!sel || !file) return;
    let targets: number[];
    if (all) targets = file.geoms.map((_, i) => i);
    else {
      const r = parseRanges(copyRange, file.geoms.length);
      if (r.error) return setCopyError(r.error);
      targets = [...new Set(r.groups.flat())];
    }
    setCopyError(null);
    const copies = targets
      .filter((p) => p !== sel.page)
      .map((p) => {
        const g = file.geoms[p];
        return { ...sel, id: uid(), page: p, x: Math.min(sel.x, Math.max(0, g.w - sel.w)), y: Math.min(sel.y, Math.max(0, g.h - sel.h)) };
      });
    setItems((l) => [...l, ...copies]);
    setResult(null);
    announce(`Copied to ${plural(copies.length, "page")}`);
  };

  const badChars = useMemo(() => {
    if (!sel || sel.kind !== "text" || !charsets) return [];
    return unsupportedChars(sel.text ?? "", charsets[sel.font ?? "helvetica"]);
  }, [sel, charsets]);
  const anyBad = useMemo(
    () => (charsets ? items.some((i) => i.kind === "text" && unsupportedChars(i.text ?? "", charsets[i.font ?? "helvetica"]).length > 0) : false),
    [items, charsets],
  );

  const changedForm = Object.keys(formValues).length > 0;
  const canSave = !!file && (items.some((i) => i.kind !== "text" || (i.text ?? "").trim()) || changedForm || flatten);

  const save = async () => {
    if (!file) return;
    if (anyBad) {
      setProblem("Some text contains characters the built-in PDF fonts can't draw. Remove the characters marked in the text box before downloading.");
      return;
    }
    setBusy(true);
    setProblem(null);
    try {
      const r = await applyEdits(
        file.bytes,
        file.name,
        items.filter((i) => i.kind !== "text" || (i.text ?? "").trim()),
        { formValues, flattenForm: flatten },
      );
      const out = { name: `${baseName(file.name)}-${sign ? "signed" : "edited"}.pdf`, blob: toBlob(r.bytes), detail: plural(file.geoms.length, "page") };
      setResult(out);
      if (r.formErrors.length) setProblem(`Some form fields couldn't be filled: ${r.formErrors.filter((n) => !n.startsWith("(")).join(", ") || "the form uses features this editor can't change"}.`);
      announce(`${out.name} is ready, ${formatBytes(out.blob.size)}`);
      completed(sign ? "sign" : "edit", { items: items.length, form: changedForm });
    } catch (e) {
      setProblem(errorMessage(e, "The PDF couldn't be saved."));
      trackError(errorCode(e), "process");
    } finally {
      setBusy(false);
    }
  };

  if (!file || !view || !geom) {
    return (
      <div className="grid gap-3">
        <FileDrop accept=".pdf,application/pdf" onFiles={load} hint="One PDF · up to 100 MB · edited on your device" label="Choose PDF" />
        {loading && <p className="text-sm text-ink-3">Opening PDF…</p>}
        {problem && (
          <Alert tone="danger" role="alert">
            {problem}
          </Alert>
        )}
      </div>
    );
  }

  const pageItems = items.filter((i) => i.page === page);
  const n = file.geoms.length;

  const signaturePanel = (
    <Panel title={signature && !makerOpen ? "Your signature" : sign ? "1. Create your signature" : "Signature"}>
      <div className="p-3 sm:p-4">
        {makerOpen || !signature ? (
          makerOpen ? (
            <SignatureMaker
              onCreate={(img) => {
                rememberImage(img);
                setSignature(img);
                setMakerOpen(false);
                addSignature(img);
              }}
              onCancel={signature || !sign ? () => setMakerOpen(false) : undefined}
            />
          ) : (
            <Button icon="plus" onClick={() => setMakerOpen(true)}>
              Create a signature
            </Button>
          )
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
            <img src={imageUrl(signature)} alt="Your signature" className="h-12 max-w-48 rounded-sm border border-line bg-white object-contain p-1" />
            <Button variant={sign ? "primary" : "secondary"} icon="plus" onClick={() => addSignature(signature)}>
              Add signature to page {page + 1}
            </Button>
            <Button variant="ghost" onClick={() => setMakerOpen(true)}>
              Change signature
            </Button>
          </div>
        )}
      </div>
    </Panel>
  );

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 truncate text-sm text-ink-2">
          <span className="font-semibold text-ink">{file.name}</span> · {plural(n, "page")} · {formatBytes(file.size)}
        </p>
        <Button
          variant="ghost"
          icon="rotate-ccw"
          onClick={() => {
            setFile(null);
            setView(null);
            setItems([]);
            setResult(null);
            setFields([]);
          }}
        >
          Choose another PDF
        </Button>
      </div>

      {sign && signaturePanel}

      <Panel title={sign ? "2. Place it on the page" : "Add to the page"}>
        <div className="grid gap-3 p-3 sm:p-4">
          <div className="flex flex-wrap items-end gap-2">
            <Button icon="plus" onClick={() => add("text", { label: sign ? "Name" : "Text" })}>
              {sign ? "Add name" : "Add text"}
            </Button>
            <div className="flex items-end gap-1">
              <Button icon="clock" onClick={() => add("text", { text: formatDate(prefs.date), label: "Date" })}>
                Add date
              </Button>
              <label htmlFor={`${id}-df`} className="sr-only">
                Date format
              </label>
              <select id={`${id}-df`} className="select h-9 w-auto text-sm" value={prefs.date} onChange={(e) => setPrefs((p) => ({ ...p, date: e.target.value as DateFormat }))}>
                {(["iso", "us", "eu", "long"] as DateFormat[]).map((f) => (
                  <option key={f} value={f}>
                    {formatDate(f)}
                  </option>
                ))}
              </select>
            </div>
            <Button icon="check" onClick={() => add("check")}>
              Check mark
            </Button>
            <Button icon="x" onClick={() => add("cross")}>
              Cross
            </Button>
            {!sign && (
              <Button icon="minus" onClick={() => add("whiteout")}>
                Whiteout
              </Button>
            )}
            {!sign && signature && (
              <Button icon="plus" onClick={() => addSignature(signature)}>
                Signature
              </Button>
            )}
            {!sign && !signature && (
              <Button icon="plus" onClick={() => setMakerOpen(true)}>
                Signature
              </Button>
            )}
          </div>
          {!sign && makerOpen && signaturePanel}
          <p className="text-sm text-ink-3">
            New items appear in the middle of the page. Drag them, or select one and use the arrow keys (hold Shift to move 10 points) or the position fields.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Button disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
              Previous
            </Button>
            <label htmlFor={`${id}-page`} className="text-sm text-ink-2">
              Page
            </label>
            <select id={`${id}-page`} className="select h-9 w-auto" value={page} onChange={(e) => setPage(Number(e.target.value))}>
              {file.geoms.map((_, i) => (
                <option key={i} value={i}>
                  {i + 1}
                  {items.some((it) => it.page === i) ? " •" : ""}
                </option>
              ))}
            </select>
            <span className="text-sm text-ink-3">of {n}</span>
            <Button icon="arrow-right" disabled={page >= n - 1} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
              Next
            </Button>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="mx-auto w-full max-w-3xl">
              <PageCanvas
                view={view}
                pageIndex={page}
                geom={geom}
                items={pageItems}
                selected={selected}
                onSelect={setSelected}
                onChange={update}
                onRemove={remove}
                imageUrl={imageUrl}
              />
            </div>

            <div className="grid content-start gap-3">
              {sel ? (
                <div className="grid gap-3 rounded-md border border-line bg-surface p-3">
                  <p className="text-sm font-semibold text-ink">
                    {describe(sel)} <span className="font-normal text-ink-3">· page {sel.page + 1}</span>
                  </p>
                  {sel.kind === "text" && (
                    <>
                      <Field
                        label="Text"
                        htmlFor={`${id}-text`}
                        error={badChars.length ? `Can't be drawn with the built-in fonts: ${badChars.join(" ")}` : null}
                        help="Press Enter for a new line."
                      >
                        <textarea id={`${id}-text`} className="textarea min-h-20" value={sel.text ?? ""} onChange={(e) => update(sel.id, { text: e.target.value })} />
                      </Field>
                      <Segmented<FontName>
                        legend="Font"
                        value={sel.font ?? "helvetica"}
                        onChange={(v) => {
                          update(sel.id, { font: v });
                          setPrefs((p) => ({ ...p, font: v }));
                        }}
                        options={[
                          { value: "helvetica", label: "Sans" },
                          { value: "times", label: "Serif" },
                          { value: "courier", label: "Mono" },
                        ]}
                      />
                      <Field label="Size (pt)" htmlFor={`${id}-size`}>
                        <input
                          id={`${id}-size`}
                          type="number"
                          min={4}
                          max={144}
                          step={0.5}
                          className="input w-28"
                          value={sel.size ?? 12}
                          onChange={(e) => {
                            const v = Math.max(4, Math.min(144, Number(e.target.value) || 12));
                            update(sel.id, { size: v });
                            setPrefs((p) => ({ ...p, size: v }));
                          }}
                        />
                      </Field>
                    </>
                  )}
                  {(sel.kind === "text" || sel.kind === "check" || sel.kind === "cross") && (
                    <Segmented<ColorName>
                      legend="Color"
                      value={colorName(sel.color)}
                      onChange={(v) => {
                        update(sel.id, { color: COLORS[v] });
                        setPrefs((p) => ({ ...p, color: v }));
                      }}
                      options={[
                        { value: "black", label: "Black" },
                        { value: "blue", label: "Blue" },
                        { value: "red", label: "Red" },
                      ]}
                    />
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="X (pt from left)" htmlFor={`${id}-x`}>
                      <input id={`${id}-x`} type="number" step={1} className="input" value={round1(sel.x)} onChange={(e) => update(sel.id, { x: Number(e.target.value) || 0 })} />
                    </Field>
                    <Field label="Y (pt from top)" htmlFor={`${id}-y`}>
                      <input id={`${id}-y`} type="number" step={1} className="input" value={round1(sel.y)} onChange={(e) => update(sel.id, { y: Number(e.target.value) || 0 })} />
                    </Field>
                    {sel.kind !== "text" && (
                      <>
                        <Field label="Width (pt)" htmlFor={`${id}-w`}>
                          <input
                            id={`${id}-w`}
                            type="number"
                            min={4}
                            step={1}
                            className="input"
                            value={round1(sel.w)}
                            onChange={(e) => {
                              const w = Math.max(4, Number(e.target.value) || 4);
                              update(sel.id, sel.kind === "whiteout" ? { w } : { w, h: round1((w * sel.h) / sel.w) });
                            }}
                          />
                        </Field>
                        <Field label="Height (pt)" htmlFor={`${id}-h`}>
                          <input
                            id={`${id}-h`}
                            type="number"
                            min={4}
                            step={1}
                            className="input"
                            value={round1(sel.h)}
                            onChange={(e) => {
                              const h = Math.max(4, Number(e.target.value) || 4);
                              update(sel.id, sel.kind === "whiteout" ? { h } : { h, w: round1((h * sel.w) / sel.h) });
                            }}
                          />
                        </Field>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-ink-3">72 pt = 1 inch = 25.4 mm. This page is {Math.round(geom.w)} × {Math.round(geom.h)} pt.</p>
                  {n > 1 && (
                    <div className="grid gap-2 border-t border-line pt-3">
                      <Field label="Copy to pages" htmlFor={`${id}-copy`} error={copyError} help="For example 2-4, 7">
                        <input id={`${id}-copy`} className="input" value={copyRange} onChange={(e) => setCopyRange(e.target.value)} autoComplete="off" />
                      </Field>
                      <div className="flex flex-wrap gap-2">
                        <Button disabled={!copyRange.trim()} onClick={() => copyToPages(false)}>
                          Copy
                        </Button>
                        <Button onClick={() => copyToPages(true)}>Copy to all pages</Button>
                      </div>
                    </div>
                  )}
                  <Button variant="ghost" icon="trash" onClick={() => remove(sel.id)}>
                    Remove
                  </Button>
                </div>
              ) : (
                <p className="rounded-md border border-dashed border-line p-3 text-sm text-ink-3">Select an item on the page, or from the list below, to change it.</p>
              )}

              {items.length > 0 && (
                <div>
                  <p className="mb-1 text-sm font-semibold text-ink">Added items ({items.length})</p>
                  <ul className="grid max-h-56 gap-1 overflow-y-auto">
                    {items.map((it) => (
                      <li key={it.id}>
                        <button
                          type="button"
                          className={`w-full truncate rounded-sm px-2 py-1 text-left text-sm hover:bg-surface-2 ${it.id === selected ? "bg-accent-subtle text-ink" : "text-ink-2"}`}
                          onClick={() => {
                            setPage(it.page);
                            setSelected(it.id);
                          }}
                        >
                          p.{it.page + 1} · {describe(it)}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {!sign && items.some((i) => i.kind === "whiteout") && (
                <Alert tone="warning">Whiteout only covers content. The text underneath is still in the file and can be found by search or copied, so don&apos;t use it to hide confidential information.</Alert>
              )}
            </div>
          </div>
        </div>
      </Panel>

      {!sign && fields.length > 0 && (
        <Panel title={`Form fields in this PDF (${fields.length})`}>
          <div className="grid gap-3 p-3 sm:p-4">
            {xfa && <Alert tone="info">This form also contains an XFA (Adobe LiveCycle) version. It is removed when you save so that every viewer shows the values you enter here.</Alert>}
            <div className="grid max-h-[28rem] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
              {fields.map((f, i) => {
                const fid = `${id}-f${i}`;
                const value = f.name in formValues ? formValues[f.name] : f.value;
                const set = (v: string | boolean) => {
                  setFormValues((fv) => ({ ...fv, [f.name]: v }));
                  setResult(null);
                };
                if (f.kind === "checkbox") {
                  return (
                    <div key={f.name}>
                      <Checkbox checked={!!value} onChange={(v) => !f.readOnly && set(v)} label={f.name} help={f.readOnly ? "Read-only" : undefined} />
                    </div>
                  );
                }
                if (f.kind === "text") {
                  return (
                    <Field key={f.name} label={f.name} htmlFor={fid} help={f.readOnly ? "Read-only" : undefined}>
                      {f.multiline ? (
                        <textarea id={fid} className="textarea min-h-16" value={String(value)} readOnly={f.readOnly} onChange={(e) => set(e.target.value)} />
                      ) : (
                        <input id={fid} className="input" value={String(value)} readOnly={f.readOnly} onChange={(e) => set(e.target.value)} />
                      )}
                    </Field>
                  );
                }
                return (
                  <Field key={f.name} label={f.name} htmlFor={fid}>
                    <select id={fid} className="select" value={String(value)} disabled={f.readOnly} onChange={(e) => set(e.target.value)}>
                      <option value="">(none)</option>
                      {(f.options ?? []).map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </Field>
                );
              })}
            </div>
            <Checkbox checked={flatten} onChange={setFlatten} label="Flatten form fields" help="Turns the fields into plain page content so the values can't be changed later." />
          </div>
        </Panel>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" size="md" icon="download" busy={busy} disabled={busy || !canSave} onClick={save}>
          {sign ? "Download signed PDF" : "Download PDF"}
        </Button>
        {!canSave && <span className="text-sm text-ink-3">{sign ? "Add your signature to a page first." : "Add something to a page first."}</span>}
      </div>
      {problem && (
        <Alert tone="danger" role="alert">
          {problem}
        </Alert>
      )}
      {result && (
        <div className="grid gap-2">
          <Alert tone="success" role="status" title="Saved">
            Everything you added is drawn into the page{flatten ? " and the form fields were flattened" : ""}. Your original file is unchanged.
          </Alert>
          <ul>
            <OutFileRow file={result} primary />
          </ul>
        </div>
      )}
    </div>
  );
}
