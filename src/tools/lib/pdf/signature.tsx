"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FileDrop } from "../../ui/FileDrop";
import { Alert, Button, Checkbox, Field, Segmented } from "../../ui/primitives";
import { useTool } from "../../ui/ToolContext";
import type { EditImage } from "./annotate";
import { canvasToBlob, releaseCanvas, uid } from "./core";

type Method = "draw" | "type" | "upload";
type Ink = "black" | "blue";
const INK: Record<Ink, string> = { black: "#111111", blue: "#1a3d9e" };
const FONTS = {
  script: { label: "Script", css: "'Segoe Script', 'Brush Script MT', 'Snell Roundhand', 'Apple Chancery', cursive", italic: false },
  hand: { label: "Handwriting", css: "'Ink Free', 'Bradley Hand', 'Segoe Print', 'Comic Sans MS', cursive", italic: false },
  formal: { label: "Formal", css: "'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif", italic: true },
} as const;
type FontKey = keyof typeof FONTS;

const PAD_W = 900;
const PAD_H = 300;

/** Crops a canvas to its non-transparent pixels (plus a small margin) and returns a PNG. */
async function trimToPng(src: HTMLCanvasElement): Promise<EditImage | null> {
  const ctx = src.getContext("2d");
  if (!ctx) return null;
  const { width: w, height: h } = src;
  const d = ctx.getImageData(0, 0, w, h).data;
  let x0 = w,
    y0 = h,
    x1 = -1,
    y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  const m = 6;
  x0 = Math.max(0, x0 - m);
  y0 = Math.max(0, y0 - m);
  x1 = Math.min(w - 1, x1 + m);
  y1 = Math.min(h - 1, y1 + m);
  const out = document.createElement("canvas");
  out.width = x1 - x0 + 1;
  out.height = y1 - y0 + 1;
  out.getContext("2d")?.drawImage(src, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  const blob = await canvasToBlob(out, "image/png");
  const img: EditImage = { id: uid(), bytes: new Uint8Array(await blob.arrayBuffer()), format: "png", width: out.width, height: out.height };
  releaseCanvas(out);
  return img;
}

interface Stroke {
  ink: Ink;
  width: number;
  pts: [number, number][];
}

export function SignatureMaker({ onCreate, onCancel }: { onCreate: (img: EditImage) => void; onCancel?: () => void }) {
  const id = useId();
  const { announce, used } = useTool();
  const [method, setMethod] = useState<Method>("draw");
  const [ink, setInk] = useState<Ink>("black");
  const [pen, setPen] = useState<"2" | "4" | "7">("4");
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [name, setName] = useState("");
  const [font, setFont] = useState<FontKey>("script");
  const [upload, setUpload] = useState<HTMLImageElement | null>(null);
  const [removeBg, setRemoveBg] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);
  const padRef = useRef<HTMLCanvasElement>(null);
  const typeRef = useRef<HTMLCanvasElement>(null);
  const upRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<Stroke | null>(null);

  /* ----- Draw ----- */
  const paint = (c: HTMLCanvasElement, list: Stroke[]) => {
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const s of list) {
      ctx.strokeStyle = INK[s.ink];
      ctx.lineWidth = s.width;
      ctx.beginPath();
      const p = s.pts;
      ctx.moveTo(p[0][0], p[0][1]);
      if (p.length === 1) ctx.lineTo(p[0][0] + 0.1, p[0][1]);
      for (let i = 1; i < p.length - 1; i++) {
        const mx = (p[i][0] + p[i + 1][0]) / 2;
        const my = (p[i][1] + p[i + 1][1]) / 2;
        ctx.quadraticCurveTo(p[i][0], p[i][1], mx, my);
      }
      if (p.length > 1) ctx.lineTo(p[p.length - 1][0], p[p.length - 1][1]);
      ctx.stroke();
    }
  };

  useEffect(() => {
    if (method === "draw" && padRef.current) paint(padRef.current, strokes);
  }, [strokes, method]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * PAD_W, ((e.clientY - r.top) / r.height) * PAD_H];
  };

  /* ----- Type ----- */
  useEffect(() => {
    if (method !== "type" || !typeRef.current) return;
    const c = typeRef.current;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const f = FONTS[font];
    ctx.clearRect(0, 0, c.width, c.height);
    let size = 110;
    const setFontSize = () => (ctx.font = `${f.italic ? "italic " : ""}${size}px ${f.css}`);
    setFontSize();
    while (size > 30 && ctx.measureText(name).width > c.width - 40) {
      size -= 6;
      setFontSize();
    }
    ctx.fillStyle = INK[ink];
    ctx.textBaseline = "middle";
    ctx.fillText(name, 20, c.height / 2);
  }, [method, name, font, ink]);

  /* ----- Upload ----- */
  useEffect(() => {
    if (method !== "upload" || !upload || !upRef.current) return;
    const c = upRef.current;
    const k = Math.min(1, 1200 / upload.naturalWidth, 600 / upload.naturalHeight);
    c.width = Math.max(1, Math.round(upload.naturalWidth * k));
    c.height = Math.max(1, Math.round(upload.naturalHeight * k));
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(upload, 0, 0, c.width, c.height);
    if (removeBg) {
      const img = ctx.getImageData(0, 0, c.width, c.height);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        // Fully transparent above 235, fading in from 235 down to 190, so ink edges stay smooth.
        const a = l >= 235 ? 0 : l <= 190 ? 1 : (235 - l) / 45;
        d[i + 3] = Math.round(d[i + 3] * a);
      }
      ctx.putImageData(img, 0, 0);
    }
  }, [method, upload, removeBg]);

  const create = async () => {
    setProblem(null);
    const c = method === "draw" ? padRef.current : method === "type" ? typeRef.current : upRef.current;
    if (!c) return;
    if (method === "draw" && !strokes.length) return setProblem("Draw your signature in the box first.");
    if (method === "type" && !name.trim()) return setProblem("Type your name first.");
    if (method === "upload" && !upload) return setProblem("Choose an image of your signature first.");
    const img = await trimToPng(c);
    if (!img) return setProblem(method === "upload" ? "The image is empty after removing the background. Turn off Remove white background." : "The signature is empty.");
    used(`signature_${method}`);
    announce("Signature ready");
    onCreate(img);
  };

  return (
    <div className="grid gap-4">
      <Segmented<Method>
        legend="Create your signature"
        value={method}
        onChange={(m) => {
          setMethod(m);
          setProblem(null);
        }}
        options={[
          { value: "draw", label: "Draw" },
          { value: "type", label: "Type" },
          { value: "upload", label: "Upload image" },
        ]}
      />
      {method !== "upload" && (
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <Segmented<Ink>
            legend="Ink"
            value={ink}
            onChange={(v) => {
              setInk(v);
              setStrokes((s) => s.map((x) => ({ ...x, ink: v })));
            }}
            options={[
              { value: "black", label: "Black" },
              { value: "blue", label: "Blue" },
            ]}
          />
          {method === "draw" && (
            <Segmented<"2" | "4" | "7">
              legend="Pen"
              value={pen}
              onChange={(v) => {
                setPen(v);
                setStrokes((s) => s.map((x) => ({ ...x, width: Number(v) })));
              }}
              options={[
                { value: "2", label: "Fine" },
                { value: "4", label: "Medium" },
                { value: "7", label: "Bold" },
              ]}
            />
          )}
        </div>
      )}

      {method === "draw" && (
        <div className="grid gap-2">
          <canvas
            ref={padRef}
            width={PAD_W}
            height={PAD_H}
            aria-label="Signature drawing area. Draw with a mouse, finger or stylus; if you can't, use Type or Upload image."
            role="img"
            className="aspect-[3/1] w-full max-w-xl cursor-crosshair touch-none rounded-md border border-line-strong bg-surface"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              drawing.current = { ink, width: Number(pen), pts: [pos(e)] };
              setStrokes((s) => [...s, drawing.current!]);
            }}
            onPointerMove={(e) => {
              const s = drawing.current;
              if (!s) return;
              s.pts.push(pos(e));
              if (padRef.current) paint(padRef.current, strokes.slice(0, -1).concat(s));
            }}
            onPointerUp={() => {
              if (drawing.current) setStrokes((s) => s.slice(0, -1).concat({ ...drawing.current!, pts: drawing.current!.pts.slice() }));
              drawing.current = null;
            }}
            onPointerCancel={() => (drawing.current = null)}
          />
          <div className="flex flex-wrap gap-2">
            <Button icon="rotate-ccw" disabled={!strokes.length} onClick={() => setStrokes((s) => s.slice(0, -1))}>
              Undo stroke
            </Button>
            <Button icon="trash" disabled={!strokes.length} onClick={() => setStrokes([])}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {method === "type" && (
        <div className="grid gap-3">
          <div className="flex flex-wrap items-end gap-4">
            <Field label="Your name" htmlFor={`${id}-name`} className="w-full max-w-xs">
              <input id={`${id}-name`} className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={60} />
            </Field>
            <Segmented<FontKey>
              legend="Style"
              value={font}
              onChange={setFont}
              options={(Object.keys(FONTS) as FontKey[]).map((k) => ({ value: k, label: FONTS[k].label }))}
            />
          </div>
          <canvas ref={typeRef} width={PAD_W} height={PAD_H} role="img" aria-label={`Preview of your typed signature: ${name}`} className="aspect-[3/1] w-full max-w-xl rounded-md border border-line bg-surface" />
          <p className="text-sm text-ink-3">Handwriting styles use fonts installed on your device, so they look different on other computers. The signature is saved as an image, exactly as previewed.</p>
        </div>
      )}

      {method === "upload" && (
        <div className="grid gap-3">
          <FileDrop
            accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
            compact
            maxBytes={15 * 1024 * 1024}
            hint="PNG, JPG or WebP · up to 15 MB"
            label="Choose signature image"
            onFiles={(fs) => {
              const url = URL.createObjectURL(fs[0]);
              const im = new Image();
              im.onload = () => {
                setUpload(im);
                URL.revokeObjectURL(url);
              };
              im.onerror = () => {
                setProblem("That image couldn't be opened. Try a PNG or JPG.");
                URL.revokeObjectURL(url);
              };
              im.src = url;
            }}
          />
          <Checkbox checked={removeBg} onChange={setRemoveBg} label="Remove white background" help="Makes paper white transparent, for a photo or scan of a signature on white paper." />
          {upload && <canvas ref={upRef} role="img" aria-label="Preview of the uploaded signature" className="max-h-48 max-w-full rounded-md border border-line bg-surface-2 object-contain" />}
        </div>
      )}

      {problem && (
        <Alert tone="danger" role="alert">
          {problem}
        </Alert>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" icon="check" onClick={create}>
          Use this signature
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
