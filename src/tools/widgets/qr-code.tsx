"use client";

/*
 * QR code generator. Payloads (URL, text, Wi-Fi, email, phone, vCard) are built in
 * src/tools/lib/calc/qr.ts and encoded by qrcode-generator (ISO/IEC 18004), loaded on first use.
 * Text is encoded as UTF-8 in byte mode. Output: live SVG preview, PNG and SVG downloads.
 * Codes are static: the data is inside the image, nothing is hosted and nothing expires.
 */
import { useEffect, useId, useMemo, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { Alert, Button, Checkbox, DownloadButton, Panel, Segmented, useDebounced, usePersistentOptions } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { contrastRatio, emailPayload, isLighter, matrixToSvg, phonePayload, pngScale, urlPayload, vcardPayload, wifiPayload, type Matrix, type QrKind } from "../lib/calc/qr";

type Ecc = "L" | "M" | "Q" | "H";
type QrFactory = typeof import("qrcode-generator");

const DEFAULTS = { kind: "url" as QrKind, ecc: "M" as Ecc, px: 512, margin: 4, fg: "#000000", bg: "#ffffff" };
const HEX = /^#[0-9a-f]{6}$/i;

let factory: QrFactory | null = null;
async function loadQr(): Promise<QrFactory> {
  if (factory) return factory;
  const mod = await import("qrcode-generator");
  const f = ((mod as unknown as { default?: QrFactory }).default ?? mod) as QrFactory;
  const enc = new TextEncoder();
  // Encode as UTF-8 (the library's default keeps only the low byte of each UTF-16 unit).
  f.stringToBytes = (s: string) => Array.from(enc.encode(s));
  factory = f;
  return f;
}

function Text({ id, label, value, onChange, placeholder, type = "text", help }: { id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; help?: string }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <input id={id} type={type} className="input" value={value} placeholder={placeholder} autoComplete="off" spellCheck={false} onChange={(e) => onChange(e.target.value)} />
      {help && <p className="field-help">{help}</p>}
    </div>
  );
}

export default function QrCode({ toolId }: WidgetProps) {
  const id = useId();
  const { used, completed, error, announce } = useTool();
  const [o, setO] = usePersistentOptions(toolId, DEFAULTS);
  const set = <K extends keyof typeof DEFAULTS>(k: K, v: (typeof DEFAULTS)[K]) => setO((p) => ({ ...p, [k]: v }));
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [wifi, setWifi] = useState({ ssid: "", password: "", security: "WPA" as "WPA" | "WEP" | "nopass", hidden: false });
  const [mail, setMail] = useState({ to: "", subject: "", body: "" });
  const [phone, setPhone] = useState("");
  const [vc, setVc] = useState({ first: "", last: "", org: "", title: "", phone: "", email: "", url: "" });
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [msg, setMsg] = useState("");

  const payload = useMemo(() => {
    switch (o.kind) {
      case "url":
        return urlPayload(url);
      case "text":
        return text;
      case "wifi":
        return wifi.ssid ? wifiPayload(wifi) : "";
      case "email":
        return mail.to.trim() ? emailPayload(mail) : "";
      case "phone":
        return phone.replace(/[^\d+]/g, "") ? phonePayload(phone) : "";
      case "vcard":
        return vc.first || vc.last || vc.org ? vcardPayload(vc) : "";
    }
  }, [o.kind, url, text, wifi, mail, phone, vc]);
  const debounced = useDebounced(payload, 200);

  useEffect(() => {
    let cancelled = false;
    if (!debounced) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear the preview when the input is emptied
      setMatrix(null);
      setStatus("idle");
      return;
    }
    setStatus((s) => (s === "ready" ? s : "loading"));
    loadQr()
      .then((qrcode) => {
        if (cancelled) return;
        const qr = qrcode(0, o.ecc);
        qr.addData(debounced, "Byte");
        qr.make();
        const size = qr.getModuleCount();
        setMatrix({ size, dark: (r, c) => qr.isDark(r, c) });
        setStatus("ready");
        setMsg(`Version ${(size - 17) / 4} · ${size} × ${size} modules · ${new TextEncoder().encode(debounced).length} bytes`);
        announce("QR code updated");
      })
      .catch((e) => {
        if (cancelled) return;
        setMatrix(null);
        setStatus("error");
        const overflow = String(e).includes("overflow");
        setMsg(overflow ? "Too much data for a QR code at this error-correction level. Shorten the content or choose a lower level (L)." : "The QR code couldn't be generated. Please try again.");
        error(overflow ? "overflow" : "encode");
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, o.ecc, error, announce]);

  const fg = HEX.test(o.fg) ? o.fg : "#000000";
  const bg = HEX.test(o.bg) ? o.bg : "#ffffff";
  const ratio = contrastRatio(fg, bg);
  const inverted = isLighter(fg, bg);
  const px = Math.max(64, Math.min(4096, Math.round(o.px) || 512));
  const svg = matrix ? matrixToSvg(matrix, { margin: o.margin, fg, bg, px }) : "";
  const src = svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : "";
  const sc = matrix ? pngScale(matrix.size, o.margin, px) : null;

  const png = async (): Promise<Blob> => {
    if (!matrix || !sc) throw new Error("No QR code");
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = sc.width;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, sc.width, sc.width);
    ctx.fillStyle = fg;
    for (let r = 0; r < matrix.size; r++) for (let c = 0; c < matrix.size; c++) if (matrix.dark(r, c)) ctx.fillRect((c + o.margin) * sc.scale, (r + o.margin) * sc.scale, sc.scale, sc.scale);
    return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("PNG failed"))), "image/png"));
  };

  const onType = () => used("type");

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
      <Panel
        title="Content"
        actions={
          <Button
            variant="ghost"
            icon="sparkles"
            onClick={() => {
              used("example");
              set("kind", "url");
              setUrl("https://www.example.com/menu");
            }}
          >
            Example
          </Button>
        }
      >
        <div className="grid gap-4 p-3 sm:p-4">
          <Segmented
            legend="QR code type"
            value={o.kind}
            onChange={(v) => set("kind", v)}
            options={[
              { value: "url", label: "URL" },
              { value: "text", label: "Text" },
              { value: "wifi", label: "Wi-Fi" },
              { value: "email", label: "Email" },
              { value: "phone", label: "Phone" },
              { value: "vcard", label: "Contact (vCard)" },
            ]}
          />
          {o.kind === "url" && (
            <Text id={`${id}-url`} label="Website address" value={url} placeholder="https://example.com/page" type="url" onChange={(v) => (setUrl(v), onType())} help="https:// is added if you leave it out." />
          )}
          {o.kind === "text" && (
            <div>
              <label htmlFor={`${id}-text`} className="field-label">
                Text
              </label>
              <textarea id={`${id}-text`} className="textarea" style={{ ["--ta-min" as string]: "8rem" }} value={text} onChange={(e) => (setText(e.target.value), onType())} />
            </div>
          )}
          {o.kind === "wifi" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Text id={`${id}-ssid`} label="Network name (SSID)" value={wifi.ssid} onChange={(v) => (setWifi((w) => ({ ...w, ssid: v })), onType())} />
              <div>
                <label htmlFor={`${id}-sec`} className="field-label">
                  Security
                </label>
                <select id={`${id}-sec`} className="select" value={wifi.security} onChange={(e) => setWifi((w) => ({ ...w, security: e.target.value as typeof w.security }))}>
                  <option value="WPA">WPA / WPA2 / WPA3</option>
                  <option value="WEP">WEP</option>
                  <option value="nopass">None (open network)</option>
                </select>
              </div>
              {wifi.security !== "nopass" && <Text id={`${id}-pw`} label="Password" value={wifi.password} onChange={(v) => setWifi((w) => ({ ...w, password: v }))} />}
              <div className="self-end">
                <Checkbox checked={wifi.hidden} onChange={(v) => setWifi((w) => ({ ...w, hidden: v }))} label="Hidden network" />
              </div>
            </div>
          )}
          {o.kind === "email" && (
            <div className="grid gap-4">
              <Text id={`${id}-to`} label="Email address" type="email" value={mail.to} onChange={(v) => (setMail((m) => ({ ...m, to: v })), onType())} />
              <Text id={`${id}-sub`} label="Subject (optional)" value={mail.subject} onChange={(v) => setMail((m) => ({ ...m, subject: v }))} />
              <Text id={`${id}-body`} label="Message (optional)" value={mail.body} onChange={(v) => setMail((m) => ({ ...m, body: v }))} />
            </div>
          )}
          {o.kind === "phone" && (
            <Text id={`${id}-tel`} label="Phone number" type="tel" value={phone} placeholder="+44 7700 900123" onChange={(v) => (setPhone(v), onType())} help="Include the country code (+44, +1, +91…) so it works from abroad." />
          )}
          {o.kind === "vcard" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Text id={`${id}-fn`} label="First name" value={vc.first} onChange={(v) => (setVc((c) => ({ ...c, first: v })), onType())} />
              <Text id={`${id}-ln`} label="Last name" value={vc.last} onChange={(v) => setVc((c) => ({ ...c, last: v }))} />
              <Text id={`${id}-org`} label="Organization" value={vc.org} onChange={(v) => setVc((c) => ({ ...c, org: v }))} />
              <Text id={`${id}-title`} label="Job title" value={vc.title} onChange={(v) => setVc((c) => ({ ...c, title: v }))} />
              <Text id={`${id}-vtel`} label="Phone" type="tel" value={vc.phone} onChange={(v) => setVc((c) => ({ ...c, phone: v }))} />
              <Text id={`${id}-vmail`} label="Email" type="email" value={vc.email} onChange={(v) => setVc((c) => ({ ...c, email: v }))} />
              <Text id={`${id}-vurl`} label="Website" type="url" value={vc.url} onChange={(v) => setVc((c) => ({ ...c, url: v }))} />
            </div>
          )}

          <details className="rounded-md border border-line p-3" open>
            <summary className="cursor-pointer text-sm font-semibold">Size, colors and error correction</summary>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor={`${id}-ecc`} className="field-label">
                  Error correction
                </label>
                <select id={`${id}-ecc`} className="select" value={o.ecc} onChange={(e) => set("ecc", e.target.value as Ecc)}>
                  <option value="L">L: recovers about 7% damage</option>
                  <option value="M">M: about 15% (default)</option>
                  <option value="Q">Q: about 25%</option>
                  <option value="H">H: about 30%</option>
                </select>
              </div>
              <div>
                <label htmlFor={`${id}-px`} className="field-label">
                  Image size (pixels)
                </label>
                <input id={`${id}-px`} type="number" min={64} max={4096} step={32} className="input tabular-nums" value={o.px} onChange={(e) => set("px", Number(e.target.value))} />
              </div>
              <div>
                <label htmlFor={`${id}-margin`} className="field-label">
                  Quiet zone (modules)
                </label>
                <input id={`${id}-margin`} type="number" min={0} max={10} className="input tabular-nums" value={o.margin} onChange={(e) => set("margin", Math.max(0, Math.min(10, Math.round(Number(e.target.value)) || 0)))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor={`${id}-fg`} className="field-label">
                    Foreground
                  </label>
                  <input id={`${id}-fg`} type="color" className="input h-11 w-full p-1" value={fg} onChange={(e) => set("fg", e.target.value)} />
                </div>
                <div>
                  <label htmlFor={`${id}-bg`} className="field-label">
                    Background
                  </label>
                  <input id={`${id}-bg`} type="color" className="input h-11 w-full p-1" value={bg} onChange={(e) => set("bg", e.target.value)} />
                </div>
              </div>
            </div>
            {inverted && (
              <div className="mt-3">
                <Alert tone="warning">The foreground is lighter than the background. Many phone cameras can&apos;t read inverted QR codes; use a dark code on a light background.</Alert>
              </div>
            )}
            {!inverted && ratio < 4.5 && (
              <div className="mt-3">
                <Alert tone="warning">Low contrast ({ratio.toFixed(1)}:1). Codes with weak contrast often fail to scan; aim for dark modules on a light background, at least 4.5:1.</Alert>
              </div>
            )}
            {o.margin < 4 && <p className="mt-3 text-sm text-ink-3">The QR standard asks for a 4-module quiet zone. Keep at least that much blank space around the code when you place it.</p>}
            <Button variant="ghost" icon="rotate-ccw" className="mt-3" onClick={() => setO((p) => ({ ...DEFAULTS, kind: p.kind }))}>
              Reset appearance
            </Button>
          </details>
        </div>
      </Panel>

      <Panel
        tone="accent"
        title="QR code"
        actions={
          <>
            <DownloadButton data={png} filename="qr-code.png" label="PNG" disabled={!matrix} variant="primary" />
            <DownloadButton data={svg} filename="qr-code.svg" mime="image/svg+xml" label="SVG" disabled={!matrix} />
          </>
        }
        footer={status === "ready" ? <span>{msg}</span> : undefined}
      >
        <div className="grid min-h-80 place-items-center p-4">
          {status === "error" ? (
            <Alert tone="danger" role="alert">
              {msg}
            </Alert>
          ) : src ? (
            // eslint-disable-next-line @next/next/no-img-element -- generated data URI preview
            <img src={src} alt={`QR code for ${o.kind === "url" ? debounced : `the ${o.kind} details entered`}`} className="aspect-square w-full max-w-72 border border-line" onLoad={() => completed("preview")} />
          ) : status === "loading" ? (
            <p className="text-sm text-ink-3">Preparing…</p>
          ) : (
            <p className="max-w-60 text-center text-sm text-ink-3">Enter some content and the QR code appears here. Test it with your phone camera before printing.</p>
          )}
        </div>
        {sc && <p className="px-4 pb-3 text-xs text-ink-3">PNG: {sc.width} × {sc.width} px ({sc.scale} px per module, so edges stay sharp).</p>}
      </Panel>
    </div>
  );
}
