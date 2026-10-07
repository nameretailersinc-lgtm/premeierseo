"use client";

import { useState } from "react";
import { Alert, Button, EmptyState, Panel, Segmented, StatTile, formatBytes, usePersistentOptions } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { formatCheckedAt, postJson, type InspectResult, type PsiAudit, type PsiField, type PsiResult } from "../lib/seo/api";
import { documentChecks, viewportCheck, type Check } from "../lib/seo/checks";
import { ApiErrorAlert, CheckList, CheckedAt, StatusCode, UrlForm, useRunner } from "../lib/seo/ui";
import { DEVICES, DeviceFrame } from "../lib/seo/viewport-frame";

/* config.mode: "speed" (website speed checker) | "mobile" (mobile-friendly test) */

const CAT_LABEL: Record<string, string> = { FAST: "Good", AVERAGE: "Needs improvement", SLOW: "Poor" };
const CAT_CLS: Record<string, string> = { FAST: "text-success", AVERAGE: "text-warning", SLOW: "text-danger" };

function scoreClass(s: number | null | undefined) {
  if (s === null || s === undefined) return "text-ink-3";
  return s >= 90 ? "text-success" : s >= 50 ? "text-warning" : "text-danger";
}

function Attribution({ d }: { d: PsiResult }) {
  return (
    <p className="text-xs text-ink-3">
      Data from Google PageSpeed Insights: Lighthouse {d.lighthouseVersion ?? ""} lab test ({d.strategy === "mobile" ? "emulated mid-range phone on a throttled connection" : "desktop"}) and Chrome UX Report field data. Requested {formatCheckedAt(d.checkedAt)}.{" "}
      <a className="text-accent underline" href={`https://pagespeed.web.dev/analysis?url=${encodeURIComponent(d.finalUrl || d.url)}`} target="_blank" rel="noopener noreferrer">
        Full report on pagespeed.web.dev
      </a>
    </p>
  );
}

function FieldData({ field, origin }: { field: PsiField | null; origin: PsiField | null }) {
  const f = field ?? origin;
  if (!f)
    return (
      <Alert tone="info" title="No real-user data for this page">
        The Chrome UX Report doesn&apos;t have enough visits from Chrome users to this page or site to publish Core Web Vitals. The lab results below still apply.
      </Alert>
    );
  const row = (label: string, m: { p75: number; category: string } | null, fmt: (v: number) => string, good: string) => (
    <div className="rounded-md border border-line p-3">
      <p className="text-sm text-ink-3">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{m ? fmt(m.p75) : "—"}</p>
      <p className={`text-sm font-semibold ${m ? CAT_CLS[m.category] ?? "" : "text-ink-3"}`}>{m ? (CAT_LABEL[m.category] ?? m.category) : "No data"}</p>
      <p className="text-xs text-ink-3">Good: {good}</p>
    </div>
  );
  return (
    <div className="grid gap-2">
      <p className="text-sm text-ink-2">
        {field ? "Real Chrome users on this page, last 28 days (75th percentile)." : "Not enough data for this page, so these are the averages for the whole site (origin), last 28 days."}{" "}
        {f.overall && (
          <span className="font-semibold">
            Core Web Vitals: <span className={CAT_CLS[f.overall] ?? ""}>{f.overall === "FAST" ? "passed" : "not passed"}</span>
          </span>
        )}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {row("Largest Contentful Paint (LCP)", f.lcp, (v) => `${(v / 1000).toFixed(1)} s`, "≤ 2.5 s")}
        {row("Interaction to Next Paint (INP)", f.inp, (v) => `${Math.round(v)} ms`, "≤ 200 ms")}
        {row("Cumulative Layout Shift (CLS)", f.cls, (v) => (v / 100).toFixed(2), "≤ 0.1")}
      </div>
    </div>
  );
}

function LabRow({ label, a }: { label: string; a: PsiAudit | null }) {
  const s = a?.score === null || a?.score === undefined ? null : Math.round(a.score * 100);
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2 text-sm sm:px-4">
      <span>{label}</span>
      <span className={`font-semibold tabular-nums ${scoreClass(s)}`}>{a?.displayValue ?? "—"}</span>
    </li>
  );
}

function SpeedResult({ d }: { d: PsiResult }) {
  const cats: [string, string][] = [
    ["performance", "Performance"],
    ["accessibility", "Accessibility"],
    ["best-practices", "Best practices"],
    ["seo", "SEO"],
  ];
  return (
    <div className="grid gap-4">
      <Attribution d={d} />
      <Panel title="Core Web Vitals from real users">
        <div className="p-3 sm:p-4">
          <FieldData field={d.field} origin={d.originField} />
        </div>
      </Panel>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cats.map(([k, l]) => (
          <StatTile key={k} label={`${l} (lab)`} value={<span className={scoreClass(d.scores[k])}>{d.scores[k] ?? "—"}</span>} sub="Lighthouse score, 0–100" />
        ))}
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Panel title={`Lab metrics (${d.strategy})`}>
          <ul className="divide-y divide-line">
            <LabRow label="First Contentful Paint" a={d.lab.fcp} />
            <LabRow label="Largest Contentful Paint" a={d.lab.lcp} />
            <LabRow label="Total Blocking Time" a={d.lab.tbt} />
            <LabRow label="Cumulative Layout Shift" a={d.lab.cls} />
            <LabRow label="Speed Index" a={d.lab.si} />
            <LabRow label="Total page weight" a={d.pageWeight} />
          </ul>
          <p className="border-t border-line px-3 py-2 text-xs text-ink-3 sm:px-4">
            {d.requests !== null ? `${d.requests} requests. ` : ""}Lab tests have no real user input, so INP can&apos;t be measured; Total Blocking Time is its lab stand-in.
          </p>
        </Panel>
        <Panel title="What would help most">
          {d.opportunities.length ? (
            <ol className="divide-y divide-line">
              {d.opportunities.map((o) => (
                <li key={o.id} className="flex justify-between gap-3 px-3 py-2 text-sm sm:px-4">
                  <span>{o.title}</span>
                  <span className="shrink-0 text-ink-3 tabular-nums">~{(o.savingsMs / 1000).toFixed(1)} s</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="p-3 text-sm text-ink-3 sm:p-4">Lighthouse found no opportunity worth more than 0.1 s.</p>
          )}
          <p className="border-t border-line px-3 py-2 text-xs text-ink-3 sm:px-4">Estimated savings in the lab test, as reported by Lighthouse.</p>
        </Panel>
      </div>
      {d.screenshot && (
        <Panel title="How the page looked at the end of the test">
          <div className="p-3 sm:p-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- data URI returned by our API */}
            <img src={d.screenshot} alt={`Lighthouse screenshot of ${d.finalUrl}`} className="max-h-[32rem] w-auto rounded-md border border-line" />
          </div>
        </Panel>
      )}
    </div>
  );
}

function SpeedChecker({ toolId }: { toolId: string }) {
  const [o, setO] = usePersistentOptions(toolId, { strategy: "mobile" as "mobile" | "desktop" });
  const runner = useRunner<PsiResult>();
  return (
    <div className="grid gap-4">
      <Panel>
        <div className="grid gap-4 p-3 sm:p-4">
          <Segmented legend="Device" value={o.strategy} onChange={(v) => setO({ strategy: v })} options={[{ value: "mobile", label: "Mobile" }, { value: "desktop", label: "Desktop" }]} />
          <UrlForm buttonLabel="Test speed" busy={runner.busy} help="We send the URL to Google PageSpeed Insights, which loads it in Lighthouse and looks up Chrome UX Report data. It usually takes 20–60 seconds." onSubmit={(u) => void runner.run(() => postJson<PsiResult>("/api/pagespeed", { url: u, strategy: o.strategy }), (d) => `Performance score ${d.scores.performance ?? "unavailable"}.`)} />
        </div>
      </Panel>
      <div className="grid min-h-32 gap-4" aria-live="polite">
        {runner.busy && <p className="text-sm text-ink-3">Running Lighthouse on Google&apos;s servers… this usually takes 20–60 seconds.</p>}
        {runner.error && <ApiErrorAlert error={runner.error} />}
        {runner.data && <SpeedResult d={runner.data} />}
        {!runner.busy && !runner.error && !runner.data && (
          <EmptyState icon="gauge" title="Your speed report appears here">
            Enter a page address above and press Test speed. You&apos;ll get a performance score, Core Web Vitals and the fixes that matter
            most.
          </EmptyState>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- mobile-friendly test */
function mobileChecks(d: InspectResult): Check[] {
  const f = d.facts!;
  const checks: Check[] = [viewportCheck(f), ...documentChecks(f, d.headers).filter((c) => c.id === "lang")];
  checks.push(
    f.iframes > 0
      ? { id: "iframes", group: "Mobile", label: "Embedded frames", status: "info", evidence: `${f.iframes} iframe${f.iframes === 1 ? "" : "s"}`, advice: "Embedded maps, videos and widgets often have fixed widths; check they shrink on narrow screens." }
      : { id: "iframes", group: "Mobile", label: "Embedded frames", status: "pass", evidence: "No iframes." },
  );
  checks.push(
    f.images.missingSize
      ? { id: "img-size", group: "Mobile", label: "Image dimensions", status: "info", evidence: `${f.images.missingSize} of ${f.images.total} images lack width and height`, advice: "Without them the layout jumps as images load, which is most noticeable on phones." }
      : { id: "img-size", group: "Mobile", label: "Image dimensions", status: "pass", evidence: f.images.total ? "All images declare width and height." : "No images in the HTML." },
  );
  return checks.map((c) => ({ ...c, group: "From the HTML" }));
}

function auditCheck(id: string, label: string, a: PsiAudit | null): Check | null {
  if (!a) return null;
  const s = a.score;
  return { id, group: "From Lighthouse (mobile)", label, status: s === null ? "info" : s >= 0.9 ? "pass" : s >= 0.5 ? "warn" : "fail", evidence: [a.title, a.displayValue].filter(Boolean).join(" · ") };
}

function MobileTest() {
  const inspect = useRunner<InspectResult>();
  const psi = useRunner<PsiResult>();
  const [device, setDevice] = useState<string>("iphone-15");
  const [preview, setPreview] = useState(false);
  const d = inspect.data;
  const htmlChecks = d?.facts ? mobileChecks(d) : [];
  const p = psi.data;
  const lhChecks = p ? ([auditCheck("psi-viewport", "Viewport (Lighthouse)", p.viewport), auditCheck("psi-font", "Legible font sizes", p.fontSize), auditCheck("psi-tap", "Tap target spacing", p.tapTargets)].filter(Boolean) as Check[]) : [];
  const dev = DEVICES.find((x) => x.id === device) ?? DEVICES[1];
  const frameBlocked = d ? /deny|sameorigin/i.test(d.headers["x-frame-options"] ?? "") || /frame-ancestors\s+('none'|'self')/i.test(d.headers["content-security-policy"] ?? "") : false;
  return (
    <div className="grid gap-4">
      <Panel>
        <div className="p-3 sm:p-4">
          <UrlForm
            buttonLabel="Test page"
            busy={inspect.busy}
            help="Step 1 checks the HTML from our server. Then you can run Google's Lighthouse mobile test and show a phone-sized preview."
            onSubmit={(u) => {
              psi.reset();
              setPreview(false);
              void inspect.run(() => postJson<InspectResult>("/api/inspect", { url: u }), (x) => (x.facts ? "HTML checks complete." : `The page returned ${x.status}.`));
            }}
          />
        </div>
      </Panel>
      <div className="grid min-h-32 gap-4" aria-live="polite">
        {inspect.error && <ApiErrorAlert error={inspect.error} />}
        {!inspect.error && !d && (
          <EmptyState icon="monitor" title="Your results appear here">
            Enter a page address above to run the HTML checks, then add Google&apos;s Lighthouse test and a phone-sized preview.
          </EmptyState>
        )}
        {d && (
          <>
            <CheckedAt iso={d.checkedAt}>
              <span className="inline-flex items-center gap-1.5">
                <StatusCode code={d.status} /> {d.finalUrl}
              </span>
            </CheckedAt>
            {!d.facts ? (
              <Alert tone="danger" role="alert" title={`No HTML to test (status ${d.status})`}>
                The address didn&apos;t return a page, so there is nothing to check on mobile.
              </Alert>
            ) : (
              <>
                <Panel title="Mobile checks">
                  <div className="grid gap-3 p-3 sm:p-4">
                    <CheckList checks={[...htmlChecks, ...lhChecks]} />
                    {!p && (
                      <div className="grid gap-2 rounded-md border border-line p-3">
                        <p className="text-sm">Run Google&apos;s Lighthouse mobile test for font size, tap targets, a mobile performance score and a screenshot. The URL is sent to Google PageSpeed Insights; it takes 20–60 seconds.</p>
                        <div>
                          <Button variant="secondary" icon="gauge" busy={psi.busy} disabled={psi.busy} onClick={() => void psi.run(() => postJson<PsiResult>("/api/pagespeed", { url: d.finalUrl, strategy: "mobile" }), () => "Lighthouse mobile test complete.")}>
                            {psi.busy ? "Running Lighthouse…" : "Run Lighthouse mobile test"}
                          </Button>
                        </div>
                        {psi.error && <ApiErrorAlert error={psi.error} />}
                      </div>
                    )}
                    {p && lhChecks.length < 3 && <p className="text-xs text-ink-3">Lighthouse {p.lighthouseVersion} didn&apos;t report every mobile audit (newer versions dropped the tap-target check), so only those it returned are listed.</p>}
                  </div>
                </Panel>
                {p && (
                  <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
                    <div className="grid content-start gap-3">
                      <div className="grid grid-cols-2 gap-3">
                        <StatTile label="Mobile performance (lab)" value={<span className={scoreClass(p.scores.performance)}>{p.scores.performance ?? "—"}</span>} />
                        <StatTile label="Page weight" value={p.pageWeight?.numericValue ? formatBytes(p.pageWeight.numericValue) : "—"} />
                      </div>
                      <Attribution d={p} />
                    </div>
                    {p.screenshot && (
                      // eslint-disable-next-line @next/next/no-img-element -- data URI returned by our API
                      <img src={p.screenshot} alt={`Lighthouse mobile screenshot of ${p.finalUrl}`} className="max-h-[36rem] w-auto rounded-md border border-line" />
                    )}
                  </div>
                )}
                <Panel title="Phone-size preview in your browser (optional)">
                  <div className="grid gap-3 p-3 sm:p-4">
                    <p className="text-sm text-ink-2">Shows the page at a phone&apos;s screen size in your current browser. It doesn&apos;t emulate another browser or a touch screen, and your browser loads the page directly from the site.</p>
                    {frameBlocked && <Alert tone="warning">This site sends headers that forbid embedding (X-Frame-Options or CSP frame-ancestors), so the preview will probably stay blank. Use the Lighthouse screenshot instead.</Alert>}
                    <div className="flex flex-wrap items-end gap-3">
                      <div>
                        <label className="field-label" htmlFor="mft-device">
                          Device size
                        </label>
                        <select id="mft-device" className="select" value={device} onChange={(e) => setDevice(e.target.value)}>
                          {DEVICES.filter((x) => x.w < 900).map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.label} ({x.w} × {x.h})
                            </option>
                          ))}
                        </select>
                      </div>
                      <Button icon="eye" onClick={() => setPreview(!preview)} aria-pressed={preview}>
                        {preview ? "Hide preview" : "Show preview"}
                      </Button>
                    </div>
                    {preview && (
                      <div className="max-w-md">
                        <DeviceFrame url={d.finalUrl} width={dev.w} height={dev.h} label={dev.label} />
                      </div>
                    )}
                  </div>
                </Panel>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function PageSpeed({ toolId, config }: WidgetProps) {
  return config?.mode === "mobile" ? <MobileTest /> : <SpeedChecker toolId={toolId} />;
}
