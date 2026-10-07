"use client";

/*
 * Shows a URL in an iframe sized like a device, inside the visitor's own browser.
 * It is NOT another browser engine and not a screenshot service; the UI says so.
 */
import { useEffect, useRef, useState } from "react";
import { Button } from "../../ui/primitives";

export const DEVICES = [
  { id: "iphone-se", label: "iPhone SE", w: 375, h: 667 },
  { id: "iphone-15", label: "iPhone 15", w: 393, h: 852 },
  { id: "pixel-8", label: "Pixel 8", w: 412, h: 915 },
  { id: "galaxy-s24", label: "Galaxy S24", w: 360, h: 780 },
  { id: "ipad", label: "iPad (10th gen)", w: 820, h: 1180 },
  { id: "laptop", label: "Laptop", w: 1366, h: 768 },
  { id: "desktop", label: "Desktop", w: 1920, h: 1080 },
] as const;

export function DeviceFrame({ url, width, height, label }: { url: string; width: number; height: number; label: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [avail, setAvail] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [key, setKey] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setAvail(el.clientWidth));
    ro.observe(el); // fires once immediately with the current size
    return () => ro.disconnect();
  }, []);
  const scale = avail ? Math.min(1, avail / width) : 1;
  const maxH = Math.min(height, 900);
  return (
    <figure className="grid gap-2">
      <figcaption className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span>
          <span className="font-semibold">{label}</span> <span className="text-ink-3 tabular-nums">{width} × {height} px{scale < 1 ? ` · shown at ${Math.round(scale * 100)}%` : ""}</span>
        </span>
        <span className="flex gap-1.5">
          <Button variant="ghost" icon="refresh" onClick={() => (setLoaded(false), setKey((k) => k + 1))}>
            Reload
          </Button>
          <a className="btn btn-ghost btn-sm" href={url} target="_blank" rel="noopener noreferrer nofollow">
            Open in new tab
          </a>
        </span>
      </figcaption>
      <div ref={box} className="w-full overflow-hidden rounded-md border border-line bg-surface-2" style={{ height: maxH * scale }}>
        <iframe
          key={key}
          src={url}
          title={`${label} preview of ${url}`}
          width={width}
          height={maxH}
          loading="lazy"
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          onLoad={() => setLoaded(true)}
          style={{ width, height: maxH, transform: `scale(${scale})`, transformOrigin: "0 0", border: 0, background: "white" }}
        />
      </div>
      {!loaded && <p className="text-xs text-ink-3">Loading… If it stays blank, the site forbids being shown inside other pages (X-Frame-Options or CSP frame-ancestors). Use “Open in new tab” and your browser&apos;s device toolbar instead.</p>}
    </figure>
  );
}
