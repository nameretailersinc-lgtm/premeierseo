"use client";

import { useId, useMemo } from "react";
import { useTool } from "../ui/ToolContext";
import { Alert, Button, Checkbox, CopyButton, DownloadButton, Field, Panel, Segmented, StatTile, useDebounced, usePersistentOptions, useSessionText } from "../ui/primitives";
import type { WidgetProps } from "../types";
import type { PageFacts } from "../lib/seo/api";
import { countStatuses, descriptionChecks, documentChecks, indexabilityChecks, socialChecks, titleChecks, viewportCheck, type Check } from "../lib/seo/checks";
import { META_DEFAULTS, buildMetaTags, type MetaInput } from "../lib/seo/meta-gen";
import { PageSourceForm, SAMPLE_HTML, usePageSource, type PageResult } from "../lib/seo/page-source";
import { SNIPPET, descriptionVerdict, titleVerdict } from "../lib/seo/pixels";
import { CheckList, CheckedAt, LengthMeter, SerpSnippet, StatusCode } from "../lib/seo/ui";

/* config.mode: "analyze" (meta tags analyzer) | "generate" (meta tag generator) */

export function metaChecks(r: PageResult): Check[] {
  const f = r.facts;
  return [...titleChecks(f), ...descriptionChecks(f), ...indexabilityChecks(f, r.ctx), viewportCheck(f), ...documentChecks(f, r.ctx.headers), ...socialChecks(f, r.ctx.finalUrl)];
}

function tagRows(f: PageFacts): [string, string][] {
  const rows: [string, string][] = [
    ["title", f.title ?? "—"],
    ["description", f.metaDescription ?? "—"],
    ["robots", f.robots ?? "—"],
    ["googlebot", f.googlebot ?? "—"],
    ["canonical", f.canonical.join("\n") || "—"],
    ["viewport", f.viewport ?? "—"],
    ["charset", f.charset ?? "—"],
    ["html lang", f.lang ?? "—"],
    ["keywords", f.metaKeywords ?? "—"],
    ["favicon", f.favicon ?? "—"],
  ];
  for (const h of f.hreflang) rows.push([`hreflang ${h.lang}`, h.href]);
  for (const [k, v] of Object.entries(f.og)) rows.push([k, v]);
  for (const [k, v] of Object.entries(f.twitter)) rows.push([k, v]);
  return rows;
}

function Analyzer() {
  const src = usePageSource();
  const r = src.result;
  const checks = useMemo(() => (r ? metaChecks(r) : []), [r]);
  const counts = countStatuses(checks);
  return (
    <div className="grid gap-4">
      <Panel>
        <div className="p-3 sm:p-4">
          <PageSourceForm src={src} urlButton="Analyze tags" pasteButton="Analyze HTML" sampleHtml={SAMPLE_HTML} />
        </div>
      </Panel>
      <div className="min-h-24" aria-live="polite">
        {r && (
          <div className="grid gap-4">
            {r.inspect ? (
              <CheckedAt iso={r.inspect.checkedAt}>
                <span className="inline-flex items-center gap-1.5">
                  <StatusCode code={r.inspect.status} /> {r.inspect.finalUrl}
                </span>
              </CheckedAt>
            ) : (
              <p className="text-sm text-ink-3">Analyzed the HTML you pasted, in your browser.</p>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Passed" value={counts.pass} />
              <StatTile label="Warnings" value={counts.warn} />
              <StatTile label="Problems" value={counts.fail} />
              <StatTile label="Notes" value={counts.info} />
            </div>
            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <Panel title="Checks">
                <div className="p-3 sm:p-4">
                  <CheckList checks={checks} />
                </div>
              </Panel>
              <div className="grid gap-4">
                <Panel title="How it may look in Google (desktop)">
                  <div className="grid gap-2 p-3 sm:p-4">
                    <SerpSnippet title={r.facts.title ?? ""} description={r.facts.metaDescription ?? ""} url={r.ctx.finalUrl ?? r.pageUrl} device="desktop" />
                    <p className="text-xs text-ink-3">Estimated from the tags. Google may rewrite titles and often picks its own snippet text.</p>
                  </div>
                </Panel>
                <Panel title="All tags found" actions={<CopyButton text={() => tagRows(r.facts).map(([k, v]) => `${k}\t${v}`).join("\n")} label="Copy table" />}>
                  <div className="max-h-[32rem] overflow-auto">
                    <table className="w-full text-left text-sm">
                      <caption className="sr-only">Meta tags found on the page</caption>
                      <tbody className="divide-y divide-line">
                        {tagRows(r.facts).map(([k, v], i) => (
                          <tr key={`${k}-${i}`} className="align-top">
                            <th scope="row" className="w-40 px-3 py-2 font-mono text-xs font-semibold text-ink-2 sm:px-4">
                              {k}
                            </th>
                            <td className="px-3 py-2 break-words whitespace-pre-wrap text-ink sm:px-4">{v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Panel>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Generator({ toolId }: { toolId: string }) {
  const id = useId();
  const { used } = useTool();
  const [prefs, setPrefs] = usePersistentOptions(toolId, {
    viewport: META_DEFAULTS.viewport,
    charset: META_DEFAULTS.charset,
    og: META_DEFAULTS.og,
    twitter: META_DEFAULTS.twitter,
    twitterCard: META_DEFAULTS.twitterCard as MetaInput["twitterCard"],
    siteName: "",
    twitterSite: "",
  });
  const [title, setTitle] = useSessionText(`${toolId}-title`);
  const [desc, setDesc] = useSessionText(`${toolId}-desc`);
  const [canonical, setCanonical] = useSessionText(`${toolId}-canonical`);
  const [extra, setExtra] = usePersistentOptions(`${toolId}-page`, {
    index: true,
    follow: true,
    largeImagePreview: false,
    ogType: "website" as MetaInput["ogType"],
    image: "",
    themeColor: "",
    legacy: false,
    keywords: "",
    revisitAfter: "",
  });
  const input: MetaInput = { ...META_DEFAULTS, ...prefs, ...extra, title, description: desc, canonical };
  const debounced = useDebounced(input, 120);
  const { code, warnings } = useMemo(() => buildMetaTags(debounced), [debounced]);
  const tv = titleVerdict(title);
  const dv = descriptionVerdict(desc);
  const set = <K extends keyof typeof extra>(k: K, v: (typeof extra)[K]) => setExtra({ ...extra, [k]: v });
  const setP = <K extends keyof typeof prefs>(k: K, v: (typeof prefs)[K]) => setPrefs({ ...prefs, [k]: v });

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
                setTitle("Sourdough Starter: How to Make, Feed and Store It");
                setDesc("Make a sourdough starter with flour and water in 7 days. Learn when to feed it, how to store it and how to revive a neglected starter.");
                setCanonical("https://www.example.com/baking/sourdough-starter/");
                setExtra({ ...extra, ogType: "article", image: "https://www.example.com/images/starter-1200x630.jpg" });
                setPrefs({ ...prefs, siteName: "Bread Notes", twitterSite: "@breadnotes" });
                used("example");
              }}
            >
              Example
            </Button>
            <Button
              variant="ghost"
              icon="trash"
              disabled={!title && !desc && !canonical}
              onClick={() => {
                setTitle("");
                setDesc("");
                setCanonical("");
                setExtra({ ...extra, image: "" });
              }}
            >
              Clear
            </Button>
          </>
        }
      >
        <div className="grid gap-5 p-3 sm:p-4">
          <div>
            <Field label="Title" htmlFor={`${id}-t`}>
              <input id={`${id}-t`} className="input" value={title} onChange={(e) => (setTitle(e.target.value), used("type"))} placeholder="What the page is, in a few words" />
            </Field>
            <div className="mt-2">
              <LengthMeter label="Title" chars={tv.chars} px={tv.px} maxPx={SNIPPET.titleMaxPx} verdict={tv.verdict} />
            </div>
          </div>
          <div>
            <Field label="Meta description" htmlFor={`${id}-d`}>
              <textarea id={`${id}-d`} className="textarea" style={{ ["--ta-min" as string]: "5.5rem", ["--ta-min-lg" as string]: "5.5rem" }} value={desc} onChange={(e) => (setDesc(e.target.value), used("type"))} placeholder="One or two sentences that summarise the page" />
            </Field>
            <div className="mt-2">
              <LengthMeter label="Description" chars={dv.chars} px={dv.px} maxPx={SNIPPET.descMaxDesktopPx} verdict={dv.verdict} />
            </div>
          </div>
          <Field label="Canonical URL" htmlFor={`${id}-c`} help="The preferred address of this page, usually its own URL. Also used for og:url.">
            <input id={`${id}-c`} className="input" inputMode="url" autoCapitalize="off" spellCheck={false} value={canonical} onChange={(e) => setCanonical(e.target.value)} placeholder="https://www.example.com/page/" />
          </Field>
          <fieldset className="grid gap-1">
            <legend className="field-label">Search engine settings</legend>
            <Checkbox checked={extra.index} onChange={(v) => set("index", v)} label="Allow indexing" help="Unticked adds noindex: the page won't appear in search results." />
            <Checkbox checked={extra.follow} onChange={(v) => set("follow", v)} label="Allow following links" help="Unticked adds nofollow to every link on the page." />
            <Checkbox checked={extra.largeImagePreview} onChange={(v) => set("largeImagePreview", v)} label="Allow large image previews" help="Adds max-image-preview:large (used by Discover and image results)." />
            <Checkbox checked={prefs.viewport} onChange={(v) => setP("viewport", v)} label="Mobile viewport tag" />
            <Checkbox checked={prefs.charset} onChange={(v) => setP("charset", v)} label="UTF-8 charset tag" />
          </fieldset>
          <fieldset className="grid gap-3">
            <legend className="field-label">Social sharing</legend>
            <Checkbox checked={prefs.og} onChange={(v) => setP("og", v)} label="Open Graph tags (Facebook, LinkedIn, chat apps)" />
            <Checkbox checked={prefs.twitter} onChange={(v) => setP("twitter", v)} label="X (Twitter) card tags" help="X reads title, description and image from Open Graph, so only the card type and handle are added." />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Share image URL" htmlFor={`${id}-i`} help="1200 × 630 px works on most platforms." className="sm:col-span-2">
                <input id={`${id}-i`} className="input" inputMode="url" autoCapitalize="off" spellCheck={false} value={extra.image} onChange={(e) => set("image", e.target.value)} placeholder="https://www.example.com/share.jpg" />
              </Field>
              <Field label="Site name" htmlFor={`${id}-s`}>
                <input id={`${id}-s`} className="input" value={prefs.siteName} onChange={(e) => setP("siteName", e.target.value)} />
              </Field>
              <Field label="X handle" htmlFor={`${id}-x`}>
                <input id={`${id}-x`} className="input" value={prefs.twitterSite} onChange={(e) => setP("twitterSite", e.target.value)} placeholder="@yoursite" />
              </Field>
              <Field label="og:type" htmlFor={`${id}-ot`}>
                <select id={`${id}-ot`} className="select" value={extra.ogType} onChange={(e) => set("ogType", e.target.value as MetaInput["ogType"])}>
                  <option value="website">website</option>
                  <option value="article">article</option>
                </select>
              </Field>
              <Field label="X card type" htmlFor={`${id}-tc`}>
                <select id={`${id}-tc`} className="select" value={prefs.twitterCard} onChange={(e) => setP("twitterCard", e.target.value as MetaInput["twitterCard"])}>
                  <option value="summary_large_image">Large image</option>
                  <option value="summary">Summary (small image)</option>
                </select>
              </Field>
            </div>
          </fieldset>
          <Field label="Theme color (optional)" htmlFor={`${id}-th`} help="Colors the browser toolbar on some phones, e.g. #1d4396.">
            <input id={`${id}-th`} className="input" value={extra.themeColor} onChange={(e) => set("themeColor", e.target.value)} placeholder="#ffffff" />
          </Field>
          <details className="rounded-md border border-line px-3 py-2">
            <summary className="cursor-pointer text-sm font-semibold">Legacy, ignored by Google</summary>
            <div className="mt-2 grid gap-3">
              <p className="text-sm text-ink-3">Google ignores these tags. Add them only if another system you use reads them.</p>
              <Checkbox checked={extra.legacy} onChange={(v) => set("legacy", v)} label="Include legacy tags" />
              {extra.legacy && (
                <>
                  <Field label="Keywords" htmlFor={`${id}-kw`}>
                    <input id={`${id}-kw`} className="input" value={extra.keywords} onChange={(e) => set("keywords", e.target.value)} />
                  </Field>
                  <Field label="Revisit after" htmlFor={`${id}-ra`}>
                    <input id={`${id}-ra`} className="input" value={extra.revisitAfter} onChange={(e) => set("revisitAfter", e.target.value)} placeholder="7 days" />
                  </Field>
                </>
              )}
            </div>
          </details>
        </div>
      </Panel>
      <div className="grid gap-4 lg:sticky lg:top-4">
        <Panel
          title="Your meta tags"
          actions={
            <>
              <CopyButton text={code} disabled={!code} />
              <DownloadButton data={code} filename="meta-tags.html" mime="text/html;charset=utf-8" disabled={!code} />
            </>
          }
          footer={<span>Paste inside the &lt;head&gt; of your page.</span>}
        >
          <pre className="min-h-40 overflow-auto p-3 font-mono text-sm whitespace-pre-wrap break-all sm:p-4">{code}</pre>
        </Panel>
        {warnings.length > 0 && (
          <Alert tone="warning">
            <ul className="grid gap-1">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </Alert>
        )}
        <PreviewPanel title={debounced.title} desc={debounced.description} url={debounced.canonical} />
      </div>
    </div>
  );
}

function PreviewPanel({ title, desc, url }: { title: string; desc: string; url: string }) {
  const [o, setO] = usePersistentOptions("meta-tag-generator-preview", { device: "desktop" as "desktop" | "mobile" });
  return (
    <Panel title="Search result preview" actions={<Segmented legend="Device" hideLegend value={o.device} onChange={(v) => setO({ device: v })} options={[{ value: "desktop", label: "Desktop" }, { value: "mobile", label: "Mobile" }]} />}>
      <div className="p-3 sm:p-4">
        <SerpSnippet title={title} description={desc} url={url || "https://www.example.com/"} device={o.device} />
      </div>
    </Panel>
  );
}

export default function MetaTags({ toolId, config }: WidgetProps) {
  return config?.mode === "generate" ? <Generator toolId={toolId} /> : <Analyzer />;
}
