"use client";

import { useEffect, useId, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { Alert, Button, CopyButton, Field, Panel, downloadBlob } from "../ui/primitives";
import { emailTemplate, facebookReviewLink, googleReviewLink, readPlaceInput, trustpilotReviewLink } from "../lib/seo/review";

function LinkRow({ label, href }: { label: string; href: string }) {
  return (
    <div className="grid gap-2 rounded-md border border-line p-3">
      <p className="text-sm font-semibold">{label}</p>
      <p className="font-mono text-sm break-all">{href}</p>
      <div className="flex flex-wrap gap-1.5">
        <CopyButton text={href} />
        <a className="btn btn-ghost btn-sm" href={href} target="_blank" rel="noopener noreferrer nofollow">
          Open to test
        </a>
      </div>
    </div>
  );
}

function useQr(text: string | null) {
  const [svg, setSvg] = useState<{ display: string; file: string } | null>(null);
  useEffect(() => {
    if (!text) return;
    let cancelled = false;
    (async () => {
      const mod = await import("qrcode-generator");
      const qrcode = mod.default;
      const qr = qrcode(0, "M");
      qr.addData(text);
      qr.make();
      if (!cancelled) setSvg({ display: qr.createSvgTag({ cellSize: 8, margin: 4, scalable: true }), file: qr.createSvgTag({ cellSize: 8, margin: 4 }) });
    })();
    return () => {
      cancelled = true;
    };
  }, [text]);
  return text ? svg : null;
}

async function svgToPng(svg: string, size = 1024): Promise<Blob> {
  const img = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("render failed"));
      img.src = url;
    });
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, size, size);
    return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("encode failed"))), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function ReviewLink() {
  const id = useId();
  const { used, completed } = useTool();
  const [place, setPlace] = useState("");
  const [business, setBusiness] = useState("");
  const [fb, setFb] = useState("");
  const [tp, setTp] = useState("");
  const [showQr, setShowQr] = useState(false);
  const p = readPlaceInput(place);
  const google = p.directLink ?? (p.placeId ? googleReviewLink(p.placeId) : null);
  const fbLink = facebookReviewLink(fb);
  const tpLink = trustpilotReviewLink(tp);
  const svg = useQr(showQr ? google : null);
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Panel
        title="Your business"
        actions={
          <Button
            variant="ghost"
            icon="sparkles"
            onClick={() => {
              setPlace("ChIJN1t_tDeuEmsRUsoyG83frY4");
              setBusiness("Bread Notes Bakery");
              used("example");
            }}
          >
            Example
          </Button>
        }
      >
        <div className="grid gap-4 p-3 sm:p-4">
          <Field
            label="Google Place ID or review link"
            htmlFor={`${id}-p`}
            error={p.error ?? null}
            help={
              <>
                Find it with Google&apos;s{" "}
                <a className="text-accent underline" href="https://developers.google.com/maps/documentation/places/web-service/place-id#find-id" target="_blank" rel="noopener noreferrer">
                  Place ID Finder
                </a>
                : search for your business and copy the code that starts with ChIJ.
              </>
            }
          >
            <input id={`${id}-p`} className="input mono" autoCapitalize="off" spellCheck={false} value={place} placeholder="ChIJ…" aria-invalid={p.error ? true : undefined} onChange={(e) => (setPlace(e.target.value), used("type"))} />
          </Field>
          {p.warning && <Alert tone="warning">{p.warning}</Alert>}
          <Field label="Business name (for the email template)" htmlFor={`${id}-b`}>
            <input id={`${id}-b`} className="input" value={business} onChange={(e) => setBusiness(e.target.value)} />
          </Field>
          <fieldset className="grid gap-3">
            <legend className="field-label">Other platforms (optional)</legend>
            <Field label="Facebook page username or URL" htmlFor={`${id}-fb`}>
              <input id={`${id}-fb`} className="input" autoCapitalize="off" value={fb} placeholder="breadnotesbakery" onChange={(e) => setFb(e.target.value)} />
            </Field>
            <Field label="Website domain for Trustpilot" htmlFor={`${id}-tp`}>
              <input id={`${id}-tp`} className="input" autoCapitalize="off" value={tp} placeholder="example.com" onChange={(e) => setTp(e.target.value)} />
            </Field>
            <p className="text-sm text-ink-3">No Yelp link: Yelp&apos;s rules ask businesses not to request reviews from customers.</p>
          </fieldset>
        </div>
      </Panel>
      <div className="grid gap-4">
        <Panel title="Review links">
          <div className="grid min-h-32 gap-3 p-3 sm:p-4">
            {!google && !fbLink && !tpLink && <p className="text-sm text-ink-3">Enter a Place ID to create your Google review link.</p>}
            {google && <LinkRow label="Google: opens the review form" href={google} />}
            {fbLink && <LinkRow label="Facebook: opens the page's reviews (recommendations) tab" href={fbLink} />}
            {tpLink && <LinkRow label="Trustpilot: opens the review form for your domain" href={tpLink} />}
          </div>
        </Panel>
        {google && (
          <Panel
            title="QR code for the Google link"
            actions={
              svg ? (
                <>
                  <Button icon="download" onClick={() => (downloadBlob(new Blob([svg.file], { type: "image/svg+xml" }), "google-review-qr.svg"), completed("download"))}>
                    SVG
                  </Button>
                  <Button icon="download" onClick={async () => (downloadBlob(await svgToPng(svg.file), "google-review-qr.png"), completed("download"))}>
                    PNG
                  </Button>
                </>
              ) : null
            }
          >
            <div className="grid min-h-24 justify-items-start gap-3 p-3 sm:p-4">
              {!showQr ? (
                <Button icon="qr" onClick={() => setShowQr(true)}>
                  Make QR code
                </Button>
              ) : svg ? (
                <div className="w-48 rounded-md border border-line bg-white p-2" role="img" aria-label={`QR code linking to ${google}`} dangerouslySetInnerHTML={{ __html: svg.display }} />
              ) : (
                <p className="text-sm text-ink-3">Preparing…</p>
              )}
              <p className="text-xs text-ink-3">Print it at least 2 cm (0.8 in) wide and test it with a phone camera before printing in bulk.</p>
            </div>
          </Panel>
        )}
        {google && (
          <Panel title="Email template" actions={<CopyButton text={emailTemplate(business, google)} />}>
            <pre className="p-3 font-sans text-sm whitespace-pre-wrap sm:p-4">{emailTemplate(business, google)}</pre>
          </Panel>
        )}
      </div>
    </div>
  );
}
