"use client";

/*
 * Favicon generator: from an image or from text/emoji, produce favicon.ico (16/32/48), PNGs (16, 32, 48,
 * 180 Apple touch, 192 and 512 for Android/manifest), site.webmanifest and the HTML tags. ZIP via fflate.
 */

import { useEffect, useId, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { FileDrop } from "../ui/FileDrop";
import { Alert, Button, CopyButton, Panel, Segmented, downloadBlob, formatBytes, useDebounced, usePersistentOptions } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { canvasToBlob, context, createCanvas, drawScaled, type AnyCanvas } from "../lib/image/canvas";
import { buildIco } from "../lib/image/files";
import { openImage, release, type Opened } from "../lib/image/ops";
import { BackgroundField, BlobImage, CHECKER_STYLE, ErrorText, RangeNumber, ZipButton, errorOf } from "../lib/image/ui";

type Source = "image" | "text";
type Shape = "square" | "rounded" | "circle";

interface OutFile {
  name: string;
  blob: Blob;
  size: string;
}

const PNG_SET: { name: string; size: number; apple?: boolean }[] = [
  { name: "favicon-16x16.png", size: 16 },
  { name: "favicon-32x32.png", size: 32 },
  { name: "favicon-48x48.png", size: 48 },
  { name: "apple-touch-icon.png", size: 180, apple: true },
  { name: "android-chrome-192x192.png", size: 192 },
  { name: "android-chrome-512x512.png", size: 512 },
];

const FONTS: Record<string, string> = {
  sans: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, "SF Mono", Consolas, "Courier New", monospace',
};

function shapePath(x: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, s: number, shape: Shape) {
  x.beginPath();
  if (shape === "circle") x.ellipse(s / 2, s / 2, s / 2, s / 2, 0, 0, Math.PI * 2);
  else if (shape === "rounded") {
    const r = s * 0.2;
    x.moveTo(r, 0);
    x.arcTo(s, 0, s, s, r);
    x.arcTo(s, s, 0, s, r);
    x.arcTo(0, s, 0, 0, r);
    x.arcTo(0, 0, s, 0, r);
  } else x.rect(0, 0, s, s);
  x.closePath();
}

interface RenderOpts {
  source: Source;
  img: Opened | null;
  text: string;
  font: string;
  bold: boolean;
  color: string;
  background: string;
  shape: Shape;
  padding: number;
}

/** Render the icon at `s` px. Apple touch icons are always square and opaque (iOS adds its own rounding). */
function renderIcon(s: number, o: RenderOpts, apple = false): AnyCanvas {
  const c = createCanvas(s, s);
  const x = context(c);
  const shape: Shape = apple ? "square" : o.shape;
  const bg = apple && o.background === "transparent" ? "#ffffff" : o.background;
  x.save();
  shapePath(x, s, shape);
  x.clip();
  if (bg !== "transparent") {
    x.fillStyle = bg;
    x.fillRect(0, 0, s, s);
  }
  const pad = apple ? Math.max(o.padding, 0.08) : o.padding;
  const inner = s * (1 - 2 * pad);
  if (o.source === "image" && o.img) {
    const k = Math.min(inner / o.img.width, inner / o.img.height);
    const dw = Math.max(1, Math.round(o.img.width * k));
    const dh = Math.max(1, Math.round(o.img.height * k));
    const scaled = drawScaled(o.img.decoded.source, o.img.width, o.img.height, dw, dh);
    x.drawImage(scaled, Math.round((s - dw) / 2), Math.round((s - dh) / 2));
    release(scaled);
  } else if (o.source === "text" && o.text.trim()) {
    const t = o.text.trim();
    const family = FONTS[o.font] ?? FONTS.sans;
    let size = inner;
    x.font = `${o.bold ? "700" : "400"} ${size}px ${family}`;
    const m = x.measureText(t);
    const tw = m.width;
    const th = (m.actualBoundingBoxAscent || size * 0.75) + (m.actualBoundingBoxDescent || 0);
    size = size * Math.min(inner / Math.max(1, tw), inner / Math.max(1, th));
    x.font = `${o.bold ? "700" : "400"} ${size}px ${family}`;
    const m2 = x.measureText(t);
    const asc = m2.actualBoundingBoxAscent || size * 0.75;
    const desc = m2.actualBoundingBoxDescent || 0;
    x.fillStyle = o.color;
    x.textAlign = "center";
    x.textBaseline = "alphabetic";
    x.fillText(t, s / 2, s / 2 + (asc - desc) / 2);
  }
  x.restore();
  return c;
}

export default function Favicon({ toolId }: WidgetProps) {
  const id = useId();
  const { used, announce, error: trackError } = useTool();
  const [o, setO] = usePersistentOptions(toolId, {
    source: "image" as Source,
    text: "P",
    font: "sans",
    bold: true,
    color: "#ffffff",
    background: "#2553b8",
    shape: "rounded" as Shape,
    padding: 0.06,
    name: "",
    themeColor: "#ffffff",
    prefix: "/",
  });
  const set = <K extends keyof typeof o>(k: K, v: (typeof o)[K]) => setO((p) => ({ ...p, [k]: v }));
  const [img, setImg] = useState<Opened | null>(null);
  const [files, setFiles] = useState<OutFile[]>([]);
  const [problem, setProblem] = useState<{ message: string; link?: { href: string; anchor: string } } | null>(null);

  const load = async (list: File[]) => {
    setProblem(null);
    try {
      const im = await openImage(list[0], { heic: false });
      setImg(im);
      set("source", "image");
      if (o.background === "#2553b8") set("background", "transparent");
      announce("Image loaded. Previews updated.");
    } catch (e) {
      const err = errorOf(e);
      setProblem(err);
      trackError(err.code, "input");
    }
  };
  useEffect(() => () => img?.close(), [img]);

  const ready = o.source === "image" ? !!img : !!o.text.trim();
  const opts = useDebounced(JSON.stringify([o.source, o.text, o.font, o.bold, o.color, o.background, o.shape, o.padding, o.name, o.themeColor, o.prefix]), 200);

  useEffect(() => {
    if (!ready) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- outputs follow the inputs
      setFiles([]);
      return;
    }
    let stop = false;
    (async () => {
      const r: RenderOpts = { source: o.source, img, text: o.text, font: o.font, bold: o.bold, color: o.color, background: o.background, shape: o.shape, padding: o.padding };
      const out: OutFile[] = [];
      const icoEntries: { size: number; png: Uint8Array }[] = [];
      for (const p of PNG_SET) {
        const c = renderIcon(p.size, r, p.apple);
        const blob = await canvasToBlob(c, "image/png");
        release(c);
        out.push({ name: p.name, blob, size: `${p.size} × ${p.size}` });
        if (p.size <= 48) icoEntries.push({ size: p.size, png: new Uint8Array(await blob.arrayBuffer()) });
        if (stop) return;
      }
      const ico = new Blob([buildIco(icoEntries) as BlobPart], { type: "image/x-icon" });
      out.unshift({ name: "favicon.ico", blob: ico, size: "16, 32, 48" });
      const pre = normPrefix(o.prefix);
      const manifest = {
        name: o.name || "My site",
        short_name: (o.name || "Site").slice(0, 12),
        icons: [
          { src: `${pre}android-chrome-192x192.png`, sizes: "192x192", type: "image/png" },
          { src: `${pre}android-chrome-512x512.png`, sizes: "512x512", type: "image/png" },
        ],
        theme_color: o.themeColor,
        background_color: o.themeColor,
        display: "standalone",
      };
      out.push({ name: "site.webmanifest", blob: new Blob([JSON.stringify(manifest, null, 2)], { type: "application/manifest+json" }), size: "manifest" });
      if (!stop) setFiles(out);
    })().catch((e) => {
      if (!stop) setProblem(errorOf(e));
    });
    return () => {
      stop = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `opts` is the debounced snapshot of the options
  }, [opts, img, ready]);

  const pre = normPrefix(o.prefix);
  const html = [
    `<link rel="icon" href="${pre}favicon.ico" sizes="48x48">`,
    `<link rel="icon" type="image/png" sizes="32x32" href="${pre}favicon-32x32.png">`,
    `<link rel="icon" type="image/png" sizes="16x16" href="${pre}favicon-16x16.png">`,
    `<link rel="apple-touch-icon" sizes="180x180" href="${pre}apple-touch-icon.png">`,
    `<link rel="manifest" href="${pre}site.webmanifest">`,
    `<meta name="theme-color" content="${o.themeColor}">`,
  ].join("\n");
  const htmlFile = { name: "favicon-tags.html", blob: new Blob([html + "\n"], { type: "text/html" }) };
  const get = (n: string) => files.find((f) => f.name === n)?.blob;

  return (
    <div className="grid gap-4">
      <Segmented
        legend="Make the favicon from"
        value={o.source}
        onChange={(v) => {
          used(v);
          set("source", v);
        }}
        options={[
          { value: "image", label: "An image" },
          { value: "text", label: "Text or emoji" },
        ]}
      />

      {o.source === "image" ? (
        <FileDrop accept="image/*,.svg,.avif,.webp" pasteImages onFiles={load} hint="PNG, SVG, JPG or WebP · square images work best (512 × 512 or larger)" label={img ? "Choose another image" : "Choose image"} compact={!!img} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,12rem)_auto] sm:items-end">
          <div>
            <label htmlFor={`${id}-t`} className="field-label">
              Text (1–3 characters work best)
            </label>
            <input id={`${id}-t`} className="input" value={o.text} maxLength={8} onChange={(e) => set("text", e.target.value)} />
          </div>
          <div>
            <label htmlFor={`${id}-f`} className="field-label">
              Font
            </label>
            <select id={`${id}-f`} className="select w-full" value={o.font} onChange={(e) => set("font", e.target.value)}>
              <option value="sans">Sans-serif</option>
              <option value="serif">Serif</option>
              <option value="mono">Monospace</option>
            </select>
          </div>
          <div className="flex items-end gap-3">
            <div>
              <label htmlFor={`${id}-tc`} className="field-label">
                Text color
              </label>
              <input id={`${id}-tc`} type="color" value={o.color} onChange={(e) => set("color", e.target.value)} className="h-10 w-16 cursor-pointer rounded-md border border-line-strong bg-surface p-1" />
            </div>
            <label className="inline-flex items-center gap-2 pb-2 text-base">
              <input type="checkbox" className="size-[1.125rem]" checked={o.bold} onChange={(e) => set("bold", e.target.checked)} />
              Bold
            </label>
          </div>
        </div>
      )}
      {problem && (
        <Alert tone="danger" role="alert">
          <ErrorText message={problem.message} link={problem.link} />
        </Alert>
      )}

      <Panel title="Style">
        <div className="grid gap-4 p-3 sm:grid-cols-2 sm:p-4">
          <Segmented
            legend="Shape"
            value={o.shape}
            onChange={(v) => set("shape", v)}
            options={[
              { value: "square", label: "Square" },
              { value: "rounded", label: "Rounded" },
              { value: "circle", label: "Circle" },
            ]}
          />
          <RangeNumber label="Padding" value={Math.round(o.padding * 100)} onChange={(v) => set("padding", v / 100)} min={0} max={30} unit="%" help="Space around the image or text." />
          <div className="sm:col-span-2">
            <BackgroundField value={o.background} onChange={(v) => set("background", v)} legend="Background" allowTransparent />
          </div>
        </div>
      </Panel>

      <Panel title="Preview">
        <div className="grid min-h-40 gap-4 p-3 sm:grid-cols-2 sm:p-4">
          {files.length ? (
            <>
              {(["light", "dark"] as const).map((t) => (
                <div key={t} className={`flex items-center gap-4 rounded-md border border-line p-4 ${t === "dark" ? "bg-ink" : "bg-surface"}`}>
                  {[16, 32, 48].map((s) => (
                    <BlobImage key={s} blob={get(s === 16 ? "favicon-16x16.png" : s === 32 ? "favicon-32x32.png" : "favicon-48x48.png")} alt={`${s} pixel icon on a ${t} background`} className="shrink-0 [image-rendering:pixelated]" />
                  ))}
                  <span className={`text-sm ${t === "dark" ? "text-surface" : "text-ink-2"}`}>16, 32 and 48 px on a {t} tab</span>
                </div>
              ))}
              <div className="flex items-center gap-4">
                <div className="size-[90px] overflow-hidden rounded-[20px] border border-line">
                  <BlobImage blob={get("apple-touch-icon.png")} alt="Apple touch icon as an iPhone home-screen icon" className="size-full" />
                </div>
                <p className="text-sm text-ink-3">Apple touch icon (180 px, shown at half size). iOS rounds the corners itself, so it is saved square and opaque.</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="size-24 overflow-hidden rounded-md border border-line" style={CHECKER_STYLE}>
                  <BlobImage blob={get("android-chrome-512x512.png")} alt="512 pixel icon" className="size-full" />
                </div>
                <p className="text-sm text-ink-3">512 px icon for Android and installed web apps.</p>
              </div>
            </>
          ) : (
            <p className="text-sm text-ink-3 sm:col-span-2">{o.source === "image" ? "Choose an image to see the icons at real size." : "Type a letter or emoji to see the icons."}</p>
          )}
        </div>
      </Panel>

      <Panel title="Files">
        <div className="grid gap-4 p-3 sm:p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor={`${id}-n`} className="field-label">
                Site name (for the manifest)
              </label>
              <input id={`${id}-n`} className="input" value={o.name} placeholder="My site" onChange={(e) => set("name", e.target.value)} />
            </div>
            <div>
              <label htmlFor={`${id}-th`} className="field-label">
                Theme color
              </label>
              <input id={`${id}-th`} type="color" value={o.themeColor} onChange={(e) => set("themeColor", e.target.value)} className="h-10 w-16 cursor-pointer rounded-md border border-line-strong bg-surface p-1" />
            </div>
            <div>
              <label htmlFor={`${id}-p`} className="field-label">
                Folder on your site
              </label>
              <input id={`${id}-p`} className="input mono" value={o.prefix} onChange={(e) => set("prefix", e.target.value)} spellCheck={false} />
            </div>
          </div>
          {files.length > 0 && (
            <>
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {files.map((f) => (
                  <li key={f.name} className="flex h-11 items-center justify-between gap-2 rounded-md border border-line bg-surface px-3 text-sm">
                    <span className="min-w-0 truncate">
                      <span className="font-mono text-ink">{f.name}</span> <span className="text-ink-3 tabular-nums">· {f.size} · {formatBytes(f.blob.size)}</span>
                    </span>
                    <Button variant="ghost" icon="download" aria-label={`Download ${f.name}`} onClick={() => downloadBlob(f.blob, f.name)} />
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                <ZipButton files={[...files.map((f) => ({ name: f.name, blob: f.blob })), htmlFile]} zipName="favicon-package.zip" label="Download all (ZIP)" />
              </div>
            </>
          )}
        </div>
      </Panel>

      <Panel title="HTML to paste inside <head>" actions={<CopyButton text={html} label="Copy HTML" />}>
        <pre className="overflow-x-auto p-3 text-sm sm:p-4">
          <code>{html}</code>
        </pre>
      </Panel>
    </div>
  );
}

function normPrefix(p: string): string {
  const t = p.trim() || "/";
  return t.endsWith("/") ? t : `${t}/`;
}
