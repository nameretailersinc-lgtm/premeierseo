"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { Alert, Button, CopyButton, Field, Panel } from "../ui/primitives";
import { FileDrop } from "../ui/FileDrop";
import type { WidgetProps } from "../types";
import { contrast, formats, nearestName, over, parseColor, tintsAndShades, toHex, wcag, type RGBA } from "../lib/dev/color";

/*
 * Color engine. config.mode: "convert" (all formats), "rgb-hex" (RGB ↔ HEX first, with the
 * formula), "picker" (visual picker, EyeDropper where supported, image sampling, contrast).
 */

const DEFAULT: RGBA = { r: 255, g: 87, b: 34, a: 1 };
const WHITE: RGBA = { r: 255, g: 255, b: 255, a: 1 };
const BLACK: RGBA = { r: 0, g: 0, b: 0, a: 1 };

function Swatch({ c, className = "", label }: { c: RGBA; className?: string; label: string }) {
  return (
    <div
      role={label ? "img" : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      className={`rounded-md border border-line-strong ${className}`}
      style={{ background: `linear-gradient(${toHex(c)}, ${toHex(c)}), repeating-conic-gradient(var(--line-strong) 0 25%, var(--surface) 0 50%) 0 0 / 16px 16px` }}
    />
  );
}

function OutRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-2 border-b border-line py-1.5 last:border-b-0">
      <dt className="text-sm font-semibold text-ink-2">{label}</dt>
      <dd className="font-mono text-sm break-all">{value}</dd>
      <CopyButton text={value} variant="ghost" />
    </div>
  );
}

function Formats({ c }: { c: RGBA }) {
  const f = formats(c);
  const near = nearestName(c);
  return (
    <dl>
      <OutRow label="HEX" value={c.a < 1 ? f.hex8 : f.hex} />
      {c.a === 1 && <OutRow label="HEX (alpha)" value={f.hex8} />}
      <OutRow label="RGB" value={f.rgb} />
      <OutRow label="HSL" value={f.hsl} />
      <OutRow label="HWB" value={f.hwb} />
      <OutRow label="HSV" value={f.hsv} />
      <OutRow label="CMYK" value={f.cmyk} />
      <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2 py-1.5">
        <dt className="text-sm font-semibold text-ink-2">CSS name</dt>
        <dd className="text-sm">{f.name ? <code>{f.name}</code> : <>none (nearest: <code>{near.name}</code>)</>}</dd>
      </div>
    </dl>
  );
}

function ChannelInput({ id, label, value, max, step = 1, onChange }: { id: string; label: string; value: number; max: number; step?: number; onChange: (v: number) => void }) {
  return (
    <div className="grid grid-cols-[4.5rem_minmax(0,1fr)_5rem] items-center gap-3">
      <label htmlFor={`${id}-n`} className="text-sm font-semibold">
        {label}
      </label>
      <input type="range" min={0} max={max} step={step} value={value} aria-label={`${label} slider`} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
      <input
        id={`${id}-n`}
        type="number"
        min={0}
        max={max}
        step={step}
        className="input h-9 tabular-nums"
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onChange(Math.min(max, Math.max(0, v)));
        }}
      />
    </div>
  );
}

function Pass({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center justify-between gap-2 border-b border-line py-1 last:border-b-0">
      <span className="text-sm">{label}</span>
      <span className={`text-sm font-semibold ${ok ? "text-success" : "text-danger"}`}>{ok ? "Pass" : "Fail"}</span>
    </li>
  );
}

function Contrast({ bg }: { bg: RGBA }) {
  const id = useId();
  const [fgText, setFgText] = useState("#ffffff");
  const fgParsed = parseColor(fgText).color;
  const fg = fgParsed ? over(fgParsed, bg.a < 1 ? over(bg, WHITE) : bg) : null;
  const solidBg = bg.a < 1 ? over(bg, WHITE) : bg;
  const ratio = fg ? contrast(fg, solidBg) : 0;
  const w = wcag(ratio);
  const best = contrast(WHITE, solidBg) >= contrast(BLACK, solidBg) ? "#ffffff" : "#000000";
  return (
    <Panel title={<span>Contrast checker (WCAG 2.2)</span>}>
      <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4">
        <div className="grid content-start gap-3">
          <Field label="Text color" htmlFor={`${id}-fg`} error={fgParsed ? null : "Enter a color such as #ffffff or black."}>
            <div className="flex gap-2">
              <input
                type="color"
                aria-label="Pick text color"
                className="h-11 w-12 shrink-0 cursor-pointer rounded-md border border-line-strong bg-surface"
                value={fg ? toHex({ ...fg, a: 1 }) : "#ffffff"}
                onChange={(e) => setFgText(e.target.value)}
              />
              <input id={`${id}-fg`} className="input mono" value={fgText} onChange={(e) => setFgText(e.target.value)} spellCheck={false} />
            </div>
          </Field>
          <div className="rounded-md border border-line p-4" style={{ background: toHex(solidBg), color: fg ? toHex(fg) : undefined }}>
            <p className="text-2xl font-bold">Large text 24px</p>
            <p className="text-base">Normal body text at 16px. The quick brown fox jumps over the lazy dog.</p>
          </div>
          <p className="text-sm text-ink-2">
            On this background, {best === "#ffffff" ? "white" : "black"} text has the most contrast ({contrast(best === "#ffffff" ? WHITE : BLACK, solidBg).toFixed(2)}:1).{" "}
            <Button variant="ghost" onClick={() => setFgText(best)}>
              Use {best === "#ffffff" ? "white" : "black"}
            </Button>
          </p>
        </div>
        <div>
          <p className="text-3xl font-semibold tabular-nums">{fg ? `${(Math.floor(ratio * 100) / 100).toFixed(2)}:1` : "—"}</p>
          <p className="text-sm text-ink-3">Contrast ratio (1:1 to 21:1)</p>
          <ul className="mt-3">
            <Pass ok={w.aaNormal} label="AA normal text (4.5:1)" />
            <Pass ok={w.aaLarge} label="AA large text (3:1)" />
            <Pass ok={w.aaaNormal} label="AAA normal text (7:1)" />
            <Pass ok={w.aaaLarge} label="AAA large text (4.5:1)" />
            <Pass ok={w.ui} label="UI components and icons (3:1)" />
          </ul>
        </div>
      </div>
    </Panel>
  );
}

function ImagePicker({ onPick }: { onPick: (c: RGBA) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);
  const { announce } = useTool();
  return (
    <Panel title={<span>Pick a color from an image</span>}>
      <div className="grid gap-3 p-3 sm:p-4">
        <FileDrop
          accept="image/*"
          compact
          pasteImages
          hint="JPG, PNG, WebP or GIF · stays on your device"
          label="Choose image"
          onFiles={async ([f]) => {
            const url = URL.createObjectURL(f);
            const img = new Image();
            img.onload = () => {
              const cv = canvas.current;
              if (!cv) return;
              const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
              cv.width = Math.round(img.width * scale);
              cv.height = Math.round(img.height * scale);
              cv.getContext("2d", { willReadFrequently: true })?.drawImage(img, 0, 0, cv.width, cv.height);
              URL.revokeObjectURL(url);
              setLoaded(true);
              announce("Image loaded. Click a point on it to pick that color.");
            };
            img.src = url;
          }}
        />
        <canvas
          ref={canvas}
          className={loaded ? "h-auto max-h-[28rem] w-auto max-w-full cursor-crosshair rounded-md border border-line" : "hidden"}
          aria-label="Uploaded image. Click to pick a color."
          onClick={(e) => {
            const cv = canvas.current;
            if (!cv) return;
            const r = cv.getBoundingClientRect();
            const x = Math.floor(((e.clientX - r.left) / r.width) * cv.width);
            const y = Math.floor(((e.clientY - r.top) / r.height) * cv.height);
            const d = cv.getContext("2d")?.getImageData(x, y, 1, 1).data;
            if (d) onPick({ r: d[0], g: d[1], b: d[2], a: Math.round((d[3] / 255) * 100) / 100 });
          }}
        />
        {loaded && <p className="text-sm text-ink-3">Click anywhere on the image to pick that pixel&apos;s color.</p>}
      </div>
    </Panel>
  );
}

export default function ColorTool({ config }: WidgetProps) {
  const id = useId();
  const { used, announce } = useTool();
  const mode = String(config?.mode ?? "convert");
  const [c, setC] = useState<RGBA>(DEFAULT);
  const [text, setText] = useState("#ff5722");
  const [err, setErr] = useState<string | null>(null);
  const [hasEyeDropper, setHasEyeDropper] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- feature detection after mount
    setHasEyeDropper(typeof window !== "undefined" && "EyeDropper" in window);
  }, []);

  const setColor = (n: RGBA, fromText = false) => {
    setC(n);
    if (!fromText) setText(toHex(n));
    setErr(null);
    used("type");
  };
  const onText = (v: string) => {
    setText(v);
    const p = parseColor(v);
    if (p.color) setColor(p.color, true);
    else if (v.trim()) setErr(p.error ?? null);
  };
  const ts = useMemo(() => tintsAndShades(c), [c]);
  const r = Math.round(c.r);
  const g = Math.round(c.g);
  const b = Math.round(c.b);

  const pickScreen = async () => {
    try {
      const ed = new (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper();
      const res = await ed.open();
      const p = parseColor(res.sRGBHex);
      if (p.color) {
        setColor(p.color);
        announce(`Picked ${res.sRGBHex}`);
      }
    } catch {
      /* cancelled */
    }
  };

  const inputRow = (
    <Field label={mode === "rgb-hex" ? "HEX code" : "Color (any format)"} htmlFor={`${id}-in`} error={err} help={mode === "rgb-hex" ? "#ff5722, #f52 or 8-digit #ff572280" : "HEX, rgb(), hsl(), hwb(), hsv(), cmyk() or a CSS name"}>
      <div className="flex gap-2">
        <input
          type="color"
          aria-label="Visual color picker"
          className="h-11 w-14 shrink-0 cursor-pointer rounded-md border border-line-strong bg-surface"
          value={toHex({ ...c, a: 1 })}
          onChange={(e) => setColor({ ...parseColor(e.target.value).color!, a: c.a })}
        />
        <input id={`${id}-in`} className="input mono" value={text} spellCheck={false} autoComplete="off" aria-invalid={err ? true : undefined} onChange={(e) => onText(e.target.value)} />
      </div>
    </Field>
  );

  const sliders = (
    <div className="grid gap-2">
      <ChannelInput id={`${id}-r`} label="Red" value={r} max={255} onChange={(v) => setColor({ ...c, r: v })} />
      <ChannelInput id={`${id}-g`} label="Green" value={g} max={255} onChange={(v) => setColor({ ...c, g: v })} />
      <ChannelInput id={`${id}-b`} label="Blue" value={b} max={255} onChange={(v) => setColor({ ...c, b: v })} />
      <ChannelInput id={`${id}-a`} label="Alpha" value={c.a} max={1} step={0.01} onChange={(v) => setColor({ ...c, a: v })} />
    </div>
  );

  const hex = toHex({ ...c, a: 1 }).toUpperCase();

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={<span>{mode === "rgb-hex" ? "RGB values" : mode === "picker" ? "Pick a color" : "Enter a color"}</span>}>
          <div className="grid gap-4 p-3 sm:p-4">
            {mode === "rgb-hex" ? (
              <>
                {sliders}
                {inputRow}
              </>
            ) : (
              <>
                {inputRow}
                {mode === "picker" && (
                  <div className="flex flex-wrap gap-2">
                    {hasEyeDropper ? (
                      <Button variant="secondary" icon="eye" onClick={pickScreen}>
                        Pick from screen
                      </Button>
                    ) : (
                      <p className="text-sm text-ink-3">Picking from anywhere on screen needs the EyeDropper feature (Chrome and Edge on desktop). You can still pick from an image below.</p>
                    )}
                  </div>
                )}
                {sliders}
              </>
            )}
            <Swatch c={c} className="h-24" label={`Color swatch ${toHex(c)}`} />
          </div>
        </Panel>
        <Panel title={<span>Codes</span>}>
          <div className="p-3 sm:p-4">
            <Formats c={c} />
          </div>
        </Panel>
      </div>

      {mode === "rgb-hex" && (
        <Panel title={<span>The formula, channel by channel</span>}>
          <div className="overflow-x-auto p-3 sm:p-4">
            <table className="w-full min-w-[30rem] border-collapse text-sm">
              <thead>
                <tr>
                  {["Channel", "Decimal", "÷ 16", "Remainder", "Hex"].map((h) => (
                    <th key={h} scope="col" className="border-b border-line px-2 py-1.5 text-left font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ["Red", r],
                    ["Green", g],
                    ["Blue", b],
                    ...(c.a < 1 ? [["Alpha", Math.round(c.a * 255)] as [string, number]] : []),
                  ] as [string, number][]
                ).map(([name, v]) => (
                  <tr key={name}>
                    <td className="border-b border-line px-2 py-1">{name}</td>
                    <td className="border-b border-line px-2 py-1 tabular-nums">{name === "Alpha" ? `${c.a} × 255 = ${v}` : v}</td>
                    <td className="border-b border-line px-2 py-1 tabular-nums">
                      {Math.floor(v / 16)} → {(Math.floor(v / 16)).toString(16).toUpperCase()}
                    </td>
                    <td className="border-b border-line px-2 py-1 tabular-nums">
                      {v % 16} → {(v % 16).toString(16).toUpperCase()}
                    </td>
                    <td className="border-b border-line px-2 py-1 font-mono font-semibold">{v.toString(16).toUpperCase().padStart(2, "0")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 font-mono text-sm">
              rgb({r}, {g}, {b}) = #{hex.slice(1)}
              {c.a < 1 ? Math.round(c.a * 255).toString(16).toUpperCase().padStart(2, "0") : ""}
            </p>
          </div>
        </Panel>
      )}

      {mode !== "rgb-hex" && (
        <Panel title={<span>Tints and shades</span>}>
          <div className="grid gap-3 p-3 sm:p-4">
            {(["tints", "shades"] as const).map((k) => (
              <div key={k}>
                <p className="mb-1 text-sm font-semibold">{k === "tints" ? "Tints (mixed with white)" : "Shades (mixed with black)"}</p>
                <div className="grid grid-cols-5 gap-2">
                  {ts[k].map((x, i) => (
                    <button
                      key={i}
                      type="button"
                      className="grid gap-1 rounded-md text-left focus-visible:outline-2 focus-visible:outline-focus"
                      onClick={() => setColor(x)}
                      aria-label={`Use ${k === "tints" ? "tint" : "shade"} ${toHex(x)}`}
                    >
                      <Swatch c={x} className="h-12" label="" />
                      <span className="font-mono text-xs">{toHex(x)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {(mode === "picker" || mode === "convert") && <Contrast bg={c} />}
      {mode === "picker" && <ImagePicker onPick={(x) => setColor(x)} />}
      {c.a < 1 && mode !== "rgb-hex" && <Alert tone="info">The color is partly transparent. Contrast is measured against it laid over a white background.</Alert>}
    </div>
  );
}
