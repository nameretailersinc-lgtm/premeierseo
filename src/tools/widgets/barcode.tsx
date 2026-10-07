"use client";

/*
 * Barcode generator: Code 128, EAN-13, UPC-A, EAN-8, ITF-14 and Code 39. Input is validated and
 * GS1 check digits are added in src/tools/lib/calc/codes.ts; drawing is done by JsBarcode,
 * loaded on first use. Downloads: SVG (vector) and PNG.
 */
import { useEffect, useId, useRef, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { Alert, Button, Checkbox, DownloadButton, Panel, useDebounced, usePersistentOptions } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { BARCODE_FORMATS, gs1WeightedSum, prepareBarcode, type BarcodeFormat } from "../lib/calc/codes";
import { Formula } from "../lib/calc/ui";

type JsBarcodeFn = typeof import("jsbarcode");
let lib: JsBarcodeFn | null = null;
async function loadLib(): Promise<JsBarcodeFn> {
  if (lib) return lib;
  const mod = await import("jsbarcode");
  lib = ((mod as unknown as { default?: JsBarcodeFn }).default ?? mod) as JsBarcodeFn;
  return lib;
}

const DEFAULTS = { format: "EAN13" as BarcodeFormat, width: 2, height: 100, text: true };
const SAMPLES: Record<BarcodeFormat, string> = { CODE128: "SKU-2026-0042", EAN13: "400638133393", UPC: "03600029145", EAN8: "9638507", ITF14: "1540014128876", CODE39: "ASSET-1042" };

export default function Barcode({ toolId }: WidgetProps) {
  const id = useId();
  const { used, completed, error, announce } = useTool();
  const [o, setO] = usePersistentOptions(toolId, DEFAULTS);
  const set = <K extends keyof typeof DEFAULTS>(k: K, v: (typeof DEFAULTS)[K]) => setO((p) => ({ ...p, [k]: v }));
  const [value, setValue] = useState("");
  const svgRef = useRef<SVGSVGElement>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [renderErr, setRenderErr] = useState<string | null>(null);
  const debounced = useDebounced(value, 150);
  const check = debounced.trim() ? prepareBarcode(o.format, debounced) : null;
  const spec = BARCODE_FORMATS.find((f) => f.id === o.format)!;
  const width = Math.max(1, Math.min(4, o.width));
  const height = Math.max(30, Math.min(300, o.height));

  const opts = () => ({ format: o.format, width, height, displayValue: o.text, margin: 10, background: "#ffffff", lineColor: "#000000", fontSize: 18 });
  const okValue = check?.ok ? check.value : "";

  useEffect(() => {
    let cancelled = false;
    if (!okValue) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- nothing valid to draw
      setReady(false);
      return;
    }
    setLoading(true);
    loadLib()
      .then((JsBarcode) => {
        if (cancelled || !svgRef.current) return;
        try {
          JsBarcode(svgRef.current, okValue, opts());
          setReady(true);
          setRenderErr(null);
          announce(`${spec.label} barcode for ${okValue}`);
          completed("preview");
        } catch {
          setReady(false);
          setRenderErr("This value can't be drawn in the chosen barcode type.");
          error("render");
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [okValue, o.format, width, height, o.text]);

  const svgText = () => {
    const el = svgRef.current;
    if (!el) return "";
    const clone = el.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.removeAttribute("class");
    clone.removeAttribute("style");
    return new XMLSerializer().serializeToString(clone);
  };
  const png = async (): Promise<Blob> => {
    const JsBarcode = await loadLib();
    const canvas = document.createElement("canvas");
    // Draw at 2× bar width for print-friendly pixels.
    JsBarcode(canvas, okValue, { ...opts(), width: width * 2, height: height * 2, fontSize: 36, margin: 20 });
    return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("PNG failed"))), "image/png"));
  };
  const fileBase = `barcode-${o.format.toLowerCase()}-${(okValue || "code").replace(/[^A-Za-z0-9-]+/g, "_").slice(0, 40)}`;

  const working =
    check?.check && check.ok
      ? [
          `Data digits: ${check.check.data}`,
          "Weights from the right: 3, 1, 3, 1 …",
          `Weighted sum = ${gs1WeightedSum(check.check.data)}`,
          `Check digit = (10 − ${gs1WeightedSum(check.check.data)} mod 10) mod 10 = ${check.check.digit}${check.check.added ? " (added)" : " (verified)"}`,
        ]
      : [];

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <Panel
        title="Barcode settings"
        actions={
          <Button
            variant="ghost"
            icon="sparkles"
            onClick={() => {
              used("example");
              setValue(SAMPLES[o.format]);
            }}
          >
            Example
          </Button>
        }
      >
        <div className="grid gap-4 p-3 sm:p-4">
          <div>
            <label htmlFor={`${id}-fmt`} className="field-label">
              Barcode type
            </label>
            <select id={`${id}-fmt`} className="select" value={o.format} onChange={(e) => set("format", e.target.value as BarcodeFormat)}>
              {BARCODE_FORMATS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
            <p className="field-help">{spec.hint}</p>
          </div>
          <div>
            <label htmlFor={`${id}-val`} className="field-label">
              Value
            </label>
            <input
              id={`${id}-val`}
              className="input mono"
              value={value}
              inputMode={spec.digits ? "numeric" : "text"}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={check && !check.ok ? true : undefined}
              aria-describedby={`${id}-val-msg`}
              onChange={(e) => {
                setValue(e.target.value);
                used("type");
              }}
            />
            <p id={`${id}-val-msg`} className={`mt-1.5 text-sm ${check && !check.ok ? "text-danger" : "text-ink-3"}`}>
              {check && !check.ok ? check.error : check?.check?.added ? `Check digit ${check.check.digit} added: ${check.value}` : " "}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${id}-w`} className="field-label">
                Bar width (px)
              </label>
              <input id={`${id}-w`} type="number" min={1} max={4} className="input tabular-nums" value={o.width} onChange={(e) => set("width", Math.round(Number(e.target.value)) || 2)} />
            </div>
            <div>
              <label htmlFor={`${id}-h`} className="field-label">
                Height (px)
              </label>
              <input id={`${id}-h`} type="number" min={30} max={300} step={10} className="input tabular-nums" value={o.height} onChange={(e) => set("height", Math.round(Number(e.target.value)) || 100)} />
            </div>
          </div>
          <Checkbox checked={o.text} onChange={(v) => set("text", v)} label="Show the number under the bars" />
        </div>
      </Panel>
      <Panel
        title="Barcode"
        actions={
          <>
            <DownloadButton data={svgText} filename={`${fileBase}.svg`} mime="image/svg+xml" label="SVG" disabled={!ready} variant="primary" />
            <DownloadButton data={png} filename={`${fileBase}.png`} label="PNG" disabled={!ready} />
          </>
        }
      >
        <div className="grid min-h-64 content-start gap-4 p-3 sm:p-4">
          <div className="grid min-h-40 place-items-center overflow-x-auto rounded-md border border-line bg-white p-2">
            <svg ref={svgRef} role="img" aria-label={ready ? `${spec.label} barcode for ${okValue}` : "Barcode preview"} className={ready ? "max-w-full" : "hidden"} />
            {!ready && <p className="text-sm text-ink-3">{loading ? "Preparing…" : "Enter a value to draw the barcode."}</p>}
          </div>
          {renderErr && (
            <Alert tone="danger" role="alert">
              {renderErr}
            </Alert>
          )}
          <Formula title="Check digit" lines={working} />
          <p className="text-sm text-ink-3">Scan the downloaded file with a phone or scanner before printing a batch. Retail EAN/UPC numbers must come from GS1.</p>
        </div>
      </Panel>
    </div>
  );
}
