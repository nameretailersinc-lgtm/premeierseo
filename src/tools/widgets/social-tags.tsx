"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { useTool } from "../ui/ToolContext";
import { Alert, Button, CopyButton, DownloadButton, Field, Panel, Segmented, StatTile, formatBytes, useDebounced, usePersistentOptions } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { postJson, type HttpSingle } from "../lib/seo/api";
import { countStatuses, socialChecks } from "../lib/seo/checks";
import { PageSourceForm, SAMPLE_HTML, usePageSource } from "../lib/seo/page-source";
import { CARD_DEFAULTS, OG_DEFAULTS, OG_TYPES, buildCardTags, buildOgTags, type CardInput, type OgInput } from "../lib/seo/social-gen";
import { SocialPreviews } from "../lib/seo/social-preview";
import { CheckList, CheckedAt, StatusCode } from "../lib/seo/ui";

/* config.mode: "check" (Open Graph checker) | "og" (Open Graph generator) | "twitter" (X card generator) */

/* ---------- Checker ---------- */
interface ImageProbe {
  status?: number;
  type?: string;
  bytes?: number;
  error?: string;
}

function useImageProbe(url: string | undefined, enabled: boolean) {
  const [probe, setProbe] = useState<{ url: string; data: ImageProbe } | null>(null);
  useEffect(() => {
    if (!enabled || !url || !/^https?:\/\//i.test(url)) return;
    let cancelled = false;
    (async () => {
      let r = await postJson<HttpSingle>("/api/http", { url, method: "HEAD" });
      if (r.ok && (r.data.error || (r.data.status ?? 0) >= 400)) r = await postJson<HttpSingle>("/api/http", { url, method: "GET" });
      if (cancelled) return;
      if (!r.ok) setProbe({ url, data: { error: r.error.message } });
      else if (r.data.error) setProbe({ url, data: { error: r.data.error.message } });
      else {
        const len = Number(r.data.headers?.["content-length"]);
        setProbe({ url, data: { status: r.data.status, type: r.data.headers?.["content-type"], bytes: Number.isFinite(len) && len > 0 ? len : r.data.bodyBytes || undefined } });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url, enabled]);
  return probe && probe.url === url ? probe.data : null;
}

function Checker() {
  const src = usePageSource();
  const r = src.result;
  const checks = useMemo(() => (r ? socialChecks(r.facts, r.ctx.finalUrl) : []), [r]);
  const counts = countStatuses(checks);
  const f = r?.facts;
  const img = f?.og["og:image"] || f?.twitter["twitter:image"] || "";
  const probe = useImageProbe(img, r?.source === "url");
  const rows = f ? [...Object.entries(f.og), ...Object.entries(f.twitter)] : [];
  return (
    <div className="grid gap-4">
      <Panel>
        <div className="p-3 sm:p-4">
          <PageSourceForm src={src} urlButton="Check tags" pasteButton="Check HTML" sampleHtml={SAMPLE_HTML} />
        </div>
      </Panel>
      <div className="min-h-24">
        {r && f && (
          <div className="grid gap-4">
            {r.inspect ? (
              <CheckedAt iso={r.inspect.checkedAt}>
                <span className="inline-flex items-center gap-1.5">
                  <StatusCode code={r.inspect.status} /> {r.inspect.finalUrl}
                </span>
              </CheckedAt>
            ) : (
              <p className="text-sm text-ink-3">Checked the HTML you pasted, in your browser.</p>
            )}
            <div className="grid grid-cols-3 gap-3">
              <StatTile label="Passed" value={counts.pass} />
              <StatTile label="Warnings" value={counts.warn} />
              <StatTile label="Problems" value={counts.fail} />
            </div>
            <Panel title="Link previews">
              <div className="p-3 sm:p-4">
                <SocialPreviews
                  d={{
                    title: f.og["og:title"] || f.twitter["twitter:title"] || f.title || "",
                    description: f.og["og:description"] || f.twitter["twitter:description"] || f.metaDescription || "",
                    url: f.og["og:url"] || r.ctx.finalUrl || r.pageUrl,
                    image: img,
                    siteName: f.og["og:site_name"],
                    cardType: f.twitter["twitter:card"] === "summary" ? "summary" : "summary_large_image",
                  }}
                />
                <p className="mt-3 text-xs text-ink-3">Layouts are approximations. Each platform crops, caches and truncates in its own way, and changes its design without notice.</p>
              </div>
            </Panel>
            <div className="grid items-start gap-4 lg:grid-cols-2">
              <Panel title="Checks">
                <div className="grid gap-3 p-3 sm:p-4">
                  <CheckList checks={checks} grouped={false} />
                  {img && r.source === "url" && (
                    <div className="rounded-md border border-line p-3 text-sm">
                      <p className="font-semibold">Share image request</p>
                      {!probe ? (
                        <p className="text-ink-3">Requesting the image from our server…</p>
                      ) : probe.error ? (
                        <p className="text-danger">{probe.error}</p>
                      ) : (
                        <p className="flex flex-wrap items-center gap-2 text-ink-2">
                          <StatusCode code={probe.status ?? 0} /> {probe.type || "no content type"}
                          {probe.bytes ? ` · ${formatBytes(probe.bytes)}` : ""}
                          {probe.type && !/^image\//.test(probe.type) && <span className="text-danger">Not an image content type.</span>}
                          {probe.bytes && probe.bytes > 5_000_000 ? <span className="text-danger">Over 5 MB: X won&apos;t use it.</span> : null}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-ink-3">We can check that the image loads, but not its pixel dimensions.</p>
                    </div>
                  )}
                </div>
              </Panel>
              <Panel title={`Tags found (${rows.length})`} actions={<CopyButton text={() => rows.map(([k, v]) => `${k}\t${v}`).join("\n")} disabled={!rows.length} label="Copy table" />}>
                {rows.length ? (
                  <table className="w-full text-left text-sm">
                    <caption className="sr-only">Open Graph and X card tags</caption>
                    <tbody className="divide-y divide-line">
                      {rows.map(([k, v]) => (
                        <tr key={k} className="align-top">
                          <th scope="row" className="w-44 px-3 py-2 font-mono text-xs font-semibold text-ink-2 sm:px-4">
                            {k}
                          </th>
                          <td className="px-3 py-2 break-words text-ink sm:px-4">{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="p-3 text-sm text-ink-3 sm:p-4">No og: or twitter: tags on this page.</p>
                )}
              </Panel>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Generators ---------- */
function TextField({ id, label, value, onChange, help, placeholder, area, url }: { id: string; label: string; value: string; onChange: (v: string) => void; help?: string; placeholder?: string; area?: boolean; url?: boolean }) {
  return (
    <Field label={label} htmlFor={id} help={help}>
      {area ? (
        <textarea id={id} className="textarea" style={{ ["--ta-min" as string]: "5rem", ["--ta-min-lg" as string]: "5rem" }} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} className="input" value={value} placeholder={placeholder} inputMode={url ? "url" : undefined} autoCapitalize={url ? "off" : undefined} spellCheck={url ? false : undefined} onChange={(e) => onChange(e.target.value)} />
      )}
      <p className="mt-1 text-right text-xs text-ink-3 tabular-nums">{[...value].length} characters</p>
    </Field>
  );
}

function OutputPanel({ code, warnings, filename, extra }: { code: string; warnings: string[]; filename: string; extra?: ReactNode }) {
  return (
    <div className="grid gap-4">
      <Panel
        title="Your tags"
        actions={
          <>
            <CopyButton text={code} disabled={!code} />
            <DownloadButton data={code} filename={filename} mime="text/html;charset=utf-8" disabled={!code} />
          </>
        }
        footer={<span>Paste inside the &lt;head&gt; of the page.</span>}
      >
        <pre className="min-h-32 overflow-auto p-3 font-mono text-sm whitespace-pre-wrap break-all sm:p-4">{code}</pre>
      </Panel>
      {extra}
      {warnings.length > 0 && (
        <Alert tone="warning">
          <ul className="grid gap-1">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </Alert>
      )}
    </div>
  );
}

function OgGenerator({ toolId }: { toolId: string }) {
  const id = useId();
  const { used } = useTool();
  const [v, setV] = useState<OgInput>(OG_DEFAULTS);
  const [prefs, setPrefs] = usePersistentOptions(toolId, { siteName: "", locale: "" });
  const set = (k: keyof OgInput) => (x: string) => {
    setV({ ...v, [k]: x });
    used("type");
  };
  const input = useDebounced({ ...v, siteName: prefs.siteName, locale: prefs.locale }, 120);
  const { code, warnings } = useMemo(() => buildOgTags(input), [input]);
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Panel
        title="Page details"
        actions={
          <>
            <Button
              variant="ghost"
              icon="sparkles"
              onClick={() => {
                setV({ ...OG_DEFAULTS, type: "article", title: "How to make a sourdough starter", description: "Seven days, two ingredients, one jar: a starter you can bake with by next weekend.", url: "https://www.example.com/baking/sourdough-starter/", image: "https://www.example.com/images/starter-1200x630.jpg", imageAlt: "A jar of bubbly sourdough starter on a kitchen counter", imageWidth: "1200", imageHeight: "630", published: "2026-09-12", section: "Baking", tags: "sourdough, bread" });
                setPrefs({ siteName: "Bread Notes", locale: "en_US" });
                used("example");
              }}
            >
              Example
            </Button>
            <Button variant="ghost" icon="trash" onClick={() => setV(OG_DEFAULTS)}>
              Clear
            </Button>
          </>
        }
      >
        <div className="grid gap-4 p-3 sm:grid-cols-2 sm:p-4">
          <Field label="og:type" htmlFor={`${id}-type`} className="sm:col-span-2" help="article for posts and news; website for everything else.">
            <select id={`${id}-type`} className="select" value={v.type} onChange={(e) => setV({ ...v, type: e.target.value as OgInput["type"] })}>
              {OG_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <TextField id={`${id}-t`} label="Title (og:title)" value={v.title} onChange={set("title")} placeholder="Headline as it should appear when shared" />
          </div>
          <div className="sm:col-span-2">
            <TextField id={`${id}-d`} label="Description (og:description)" value={v.description} onChange={set("description")} area placeholder="One or two sentences" />
          </div>
          <div className="sm:col-span-2">
            <TextField id={`${id}-u`} label="Page URL (og:url)" value={v.url} onChange={set("url")} url placeholder="https://www.example.com/page/" help="The canonical URL." />
          </div>
          <div className="sm:col-span-2">
            <TextField id={`${id}-i`} label="Image URL (og:image)" value={v.image} onChange={set("image")} url placeholder="https://www.example.com/share.jpg" help="1200 × 630 px recommended; at least 600 × 315 px." />
          </div>
          <div className="sm:col-span-2">
            <TextField id={`${id}-ia`} label="Image description (og:image:alt)" value={v.imageAlt} onChange={set("imageAlt")} />
          </div>
          <Field label="Image width (px)" htmlFor={`${id}-iw`}>
            <input id={`${id}-iw`} className="input" inputMode="numeric" value={v.imageWidth} onChange={(e) => set("imageWidth")(e.target.value.replace(/\D/g, ""))} placeholder="1200" />
          </Field>
          <Field label="Image height (px)" htmlFor={`${id}-ih`}>
            <input id={`${id}-ih`} className="input" inputMode="numeric" value={v.imageHeight} onChange={(e) => set("imageHeight")(e.target.value.replace(/\D/g, ""))} placeholder="630" />
          </Field>
          <Field label="Site name (og:site_name)" htmlFor={`${id}-s`}>
            <input id={`${id}-s`} className="input" value={prefs.siteName} onChange={(e) => setPrefs({ ...prefs, siteName: e.target.value })} />
          </Field>
          <Field label="Locale (og:locale)" htmlFor={`${id}-l`} help="e.g. en_US, en_GB, fr_FR">
            <input id={`${id}-l`} className="input" value={prefs.locale} onChange={(e) => setPrefs({ ...prefs, locale: e.target.value })} placeholder="en_US" />
          </Field>
          {v.type === "article" && (
            <>
              <Field label="Published (ISO date)" htmlFor={`${id}-p`}>
                <input id={`${id}-p`} className="input" value={v.published} onChange={(e) => set("published")(e.target.value)} placeholder="2026-09-12" />
              </Field>
              <Field label="Modified (ISO date)" htmlFor={`${id}-m`}>
                <input id={`${id}-m`} className="input" value={v.modified} onChange={(e) => set("modified")(e.target.value)} placeholder="2026-09-20" />
              </Field>
              <Field label="Author (profile URL or name)" htmlFor={`${id}-a`}>
                <input id={`${id}-a`} className="input" value={v.author} onChange={(e) => set("author")(e.target.value)} />
              </Field>
              <Field label="Section" htmlFor={`${id}-sec`}>
                <input id={`${id}-sec`} className="input" value={v.section} onChange={(e) => set("section")(e.target.value)} placeholder="Baking" />
              </Field>
              <Field label="Tags (comma-separated)" htmlFor={`${id}-tags`} className="sm:col-span-2">
                <input id={`${id}-tags`} className="input" value={v.tags} onChange={(e) => set("tags")(e.target.value)} />
              </Field>
            </>
          )}
        </div>
      </Panel>
      <div className="grid gap-4">
        <OutputPanel code={code} warnings={warnings} filename="open-graph-tags.html" />
        <Panel title="Preview">
          <div className="p-3 sm:p-4">
            <SocialPreviews d={{ title: input.title, description: input.description, url: input.url, image: input.image, siteName: input.siteName }} />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function CardGenerator({ toolId }: { toolId: string }) {
  const id = useId();
  const { used } = useTool();
  const [v, setV] = useState<CardInput>(CARD_DEFAULTS);
  const [prefs, setPrefs] = usePersistentOptions(toolId, { site: "", card: CARD_DEFAULTS.card as CardInput["card"], hasOg: false });
  const set = (k: keyof CardInput) => (x: string) => {
    setV({ ...v, [k]: x });
    used("type");
  };
  const input = useDebounced({ ...v, site: prefs.site, card: prefs.card, hasOg: prefs.hasOg }, 120);
  const { code, warnings, fallbacks } = useMemo(() => buildCardTags(input), [input]);
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Panel
        title="Card details"
        actions={
          <>
            <Button
              variant="ghost"
              icon="sparkles"
              onClick={() => {
                setV({ ...CARD_DEFAULTS, creator: "@ana_bakes", title: "How to make a sourdough starter", description: "Seven days, two ingredients, one jar.", image: "https://www.example.com/images/starter-1200x600.jpg", imageAlt: "A jar of bubbly sourdough starter" });
                setPrefs({ site: "@breadnotes", card: "summary_large_image", hasOg: false });
                used("example");
              }}
            >
              Example
            </Button>
            <Button variant="ghost" icon="trash" onClick={() => setV(CARD_DEFAULTS)}>
              Clear
            </Button>
          </>
        }
      >
        <div className="grid gap-4 p-3 sm:grid-cols-2 sm:p-4">
          <div className="sm:col-span-2">
            <Segmented
              legend="Card type"
              value={prefs.card}
              onChange={(c) => setPrefs({ ...prefs, card: c })}
              options={[
                { value: "summary_large_image", label: "Large image" },
                { value: "summary", label: "Summary (small square image)" },
              ]}
            />
          </div>
          <div className="sm:col-span-2">
            <Segmented
              legend="Does the page already have Open Graph tags?"
              value={prefs.hasOg ? "yes" : "no"}
              onChange={(x) => setPrefs({ ...prefs, hasOg: x === "yes" })}
              options={[
                { value: "no", label: "No, write all tags" },
                { value: "yes", label: "Yes, reuse them" },
              ]}
            />
          </div>
          <Field label="Site handle (twitter:site)" htmlFor={`${id}-s`}>
            <input id={`${id}-s`} className="input" value={prefs.site} onChange={(e) => setPrefs({ ...prefs, site: e.target.value })} placeholder="@yoursite" />
          </Field>
          <Field label="Author handle (twitter:creator)" htmlFor={`${id}-c`}>
            <input id={`${id}-c`} className="input" value={v.creator} onChange={(e) => set("creator")(e.target.value)} placeholder="@author" />
          </Field>
          {!prefs.hasOg && (
            <>
              <div className="sm:col-span-2">
                <TextField id={`${id}-t`} label="Title (max 70 characters)" value={v.title} onChange={set("title")} />
              </div>
              <div className="sm:col-span-2">
                <TextField id={`${id}-d`} label="Description (max 200 characters)" value={v.description} onChange={set("description")} area />
              </div>
              <div className="sm:col-span-2">
                <TextField
                  id={`${id}-i`}
                  label="Image URL"
                  value={v.image}
                  onChange={set("image")}
                  url
                  help={prefs.card === "summary" ? "Square, at least 144 × 144 px, under 5 MB." : "2:1 ratio, at least 300 × 157 px (1200 × 600 works well), under 5 MB."}
                />
              </div>
            </>
          )}
          <div className="sm:col-span-2">
            <TextField id={`${id}-ia`} label="Image description (twitter:image:alt)" value={v.imageAlt} onChange={set("imageAlt")} />
          </div>
        </div>
      </Panel>
      <div className="grid gap-4">
        <OutputPanel
          code={code}
          warnings={warnings}
          filename="x-card-tags.html"
          extra={
            fallbacks.length > 0 ? (
              <Alert tone="info" title="Taken from your Open Graph tags">
                <ul className="font-mono text-xs">
                  {fallbacks.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </Alert>
            ) : null
          }
        />
        {!prefs.hasOg && (
          <Panel title="Preview">
            <div className="p-3 sm:p-4">
              <SocialPreviews d={{ title: input.title, description: input.description, url: "https://www.example.com/", image: input.image, cardType: input.card }} />
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

export default function SocialTags({ toolId, config }: WidgetProps) {
  const mode = (config?.mode as string) ?? "check";
  if (mode === "og") return <OgGenerator toolId={toolId} />;
  if (mode === "twitter") return <CardGenerator toolId={toolId} />;
  return <Checker />;
}
