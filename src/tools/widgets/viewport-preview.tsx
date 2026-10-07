"use client";

import { useId, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { Alert, Button, Checkbox, Field, Panel, usePersistentOptions } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { DEVICES, DeviceFrame } from "../lib/seo/viewport-frame";

/* Responsive viewport preview. Runs entirely in the visitor's browser: it does not test other browser engines. */

export default function ViewportPreview({ toolId }: WidgetProps) {
  const id = useId();
  const { used, completed } = useTool();
  const [input, setInput] = useState("");
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [o, setO] = usePersistentOptions(toolId, { devices: ["iphone-15", "ipad", "laptop"] as string[], customW: 1024, customH: 768, custom: false });
  const toggle = (d: string, on: boolean) => setO({ ...o, devices: on ? [...o.devices, d] : o.devices.filter((x) => x !== d) });
  const frames = [...DEVICES.filter((d) => o.devices.includes(d.id)).map((d) => ({ key: d.id, label: d.label, w: d.w, h: d.h })), ...(o.custom ? [{ key: "custom", label: "Custom", w: o.customW, h: o.customH }] : [])];
  return (
    <div className="grid gap-4">
      <Alert tone="info" title="A responsive preview in your own browser">
        This shows the page at different screen sizes using the browser you&apos;re using now. It doesn&apos;t run Safari, Firefox or other engines, so it won&apos;t reveal engine-specific bugs. For that, test on real devices or a cross-browser testing service.
      </Alert>
      <Panel>
        <form
          className="grid gap-4 p-3 sm:p-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const s = input.trim();
            try {
              const u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`);
              if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
              if (!u.hostname.includes(".")) throw new Error();
              setErr(null);
              setUrl(u.toString());
              used("url");
              completed("preview");
            } catch {
              setErr("Enter a full web address, such as example.com.");
            }
          }}
        >
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <Field label="Page URL" htmlFor={`${id}-u`} error={err}>
              <input id={`${id}-u`} className="input" inputMode="url" autoCapitalize="off" spellCheck={false} value={input} onChange={(e) => setInput(e.target.value)} placeholder="example.com" aria-invalid={err ? true : undefined} />
            </Field>
            <Button type="submit" variant="primary" size="md" icon="eye">
              Show previews
            </Button>
          </div>
          <fieldset>
            <legend className="field-label">Screen sizes</legend>
            <div className="grid gap-x-4 sm:grid-cols-2 lg:grid-cols-4">
              {DEVICES.map((d) => (
                <Checkbox key={d.id} checked={o.devices.includes(d.id)} onChange={(v) => toggle(d.id, v)} label={`${d.label} (${d.w} × ${d.h})`} />
              ))}
              <Checkbox checked={o.custom} onChange={(v) => setO({ ...o, custom: v })} label="Custom size" />
            </div>
          </fieldset>
          {o.custom && (
            <div className="grid max-w-sm grid-cols-2 gap-3">
              <Field label="Width (px)" htmlFor={`${id}-w`}>
                <input id={`${id}-w`} type="number" min={240} max={2560} className="input" value={o.customW} onChange={(e) => setO({ ...o, customW: Math.max(240, Math.min(2560, Number(e.target.value) || 240)) })} />
              </Field>
              <Field label="Height (px)" htmlFor={`${id}-h`}>
                <input id={`${id}-h`} type="number" min={240} max={2000} className="input" value={o.customH} onChange={(e) => setO({ ...o, customH: Math.max(240, Math.min(2000, Number(e.target.value) || 240)) })} />
              </Field>
            </div>
          )}
        </form>
      </Panel>
      <div className="min-h-32">
        {url && frames.length > 0 && (
          <div className="grid items-start gap-6 md:grid-cols-2">
            {frames.map((f) => (
              <DeviceFrame key={`${f.key}-${url}`} url={url} width={f.w} height={f.h} label={f.label} />
            ))}
          </div>
        )}
        {url && !frames.length && <p className="text-sm text-ink-3">Tick at least one screen size.</p>}
        {!url && <p className="text-sm text-ink-3">Enter a URL and press Show previews. Your browser loads the page directly from the site, as if you opened it.</p>}
      </div>
    </div>
  );
}
