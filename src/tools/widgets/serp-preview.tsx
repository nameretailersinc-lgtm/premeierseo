"use client";

import { useId, useMemo, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { Button, CopyButton, Field, Panel, Segmented, useDebounced, usePersistentOptions, useSessionText } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { escAttr, escText } from "../lib/seo/html";
import { SNIPPET, descriptionVerdict, titleVerdict } from "../lib/seo/pixels";
import { PAGE_TYPES, descriptionSuggestions, titleSuggestions, type PageType, type Suggestion } from "../lib/seo/snippet-templates";
import { LengthMeter, SerpSnippet } from "../lib/seo/ui";

/*
 * Modes (config.mode):
 *  simulate     → SERP simulator: type title/description/URL, preview desktop and mobile.
 *  title        → Title tag generator: template suggestions + pixel check + preview.
 *  description  → Meta description generator: template suggestions + pixel check + preview.
 */

type Device = "desktop" | "mobile";

function TitleMeter({ value }: { value: string }) {
  const v = titleVerdict(value);
  return <LengthMeter label="Title" chars={v.chars} px={v.px} maxPx={SNIPPET.titleMaxPx} verdict={v.verdict} />;
}

function DescMeter({ value }: { value: string }) {
  const v = descriptionVerdict(value);
  return (
    <LengthMeter
      label="Description"
      chars={v.chars}
      px={v.px}
      maxPx={SNIPPET.descMaxDesktopPx}
      verdict={v.verdict}
      hint={v.mobileCut && v.verdict !== "long" ? `Fits on desktop; mobile results cut descriptions at about ${SNIPPET.descMaxMobilePx} px.` : undefined}
    />
  );
}

function Preview({ title, description, url, siteName, date, keyword }: { title: string; description: string; url: string; siteName?: string; date?: string; keyword?: string }) {
  const [device, setDevice] = useState<Device>("desktop");
  return (
    <Panel title="Search result preview" actions={<Segmented legend="Device" hideLegend value={device} onChange={setDevice} options={[{ value: "desktop", label: "Desktop" }, { value: "mobile", label: "Mobile" }]} />}>
      <div className="grid min-h-48 gap-3 p-3 sm:p-4">
        <SerpSnippet title={title} description={description} url={url} siteName={siteName} date={date} device={device} keyword={keyword} />
        <p className="text-xs text-ink-3">
          An estimate. Truncation is calculated from Arial character widths; Google doesn&apos;t publish limits and may rewrite the title or description.
        </p>
      </div>
    </Panel>
  );
}

function headCode(title: string, desc: string) {
  const lines = [];
  if (title.trim()) lines.push(`<title>${escText(title.replace(/\s+/g, " ").trim())}</title>`);
  if (desc.trim()) lines.push(`<meta name="description" content="${escAttr(desc.replace(/\s+/g, " ").trim())}">`);
  return lines.join("\n");
}

/* ---------- SERP simulator ---------- */
function Simulator({ toolId }: { toolId: string }) {
  const id = useId();
  const { used } = useTool();
  const [title, setTitle] = useSessionText(`${toolId}-title`);
  const [desc, setDesc] = useSessionText(`${toolId}-desc`);
  const [url, setUrl] = useSessionText(`${toolId}-url`);
  const [site, setSite] = useState("");
  const [date, setDate] = useState("");
  const [kw, setKw] = useState("");
  const dt = useDebounced(title, 80);
  const dd = useDebounced(desc, 80);
  const code = headCode(title, desc);
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Panel
        title="Your snippet"
        actions={
          <>
            <Button
              variant="ghost"
              icon="sparkles"
              onClick={() => {
                setTitle("Sourdough Starter: How to Make, Feed and Store It");
                setDesc("Make a sourdough starter with just flour and water in 7 days. Learn when to feed it, how to store it in the fridge and how to revive a neglected starter.");
                setUrl("https://www.example.com/baking/sourdough-starter/");
                setDate("Sep 12, 2026");
                setKw("sourdough starter");
                used("example");
              }}
            >
              Example
            </Button>
            <Button
              variant="ghost"
              icon="trash"
              disabled={!title && !desc && !url}
              onClick={() => {
                setTitle("");
                setDesc("");
                setUrl("");
                setSite("");
                setDate("");
                setKw("");
              }}
            >
              Clear
            </Button>
          </>
        }
      >
        <div className="grid gap-4 p-3 sm:p-4">
          <div>
            <Field label="Title" htmlFor={`${id}-t`}>
              <input id={`${id}-t`} className="input" value={title} placeholder="Page title shown as the blue link" onChange={(e) => (setTitle(e.target.value), used("type"))} />
            </Field>
            <div className="mt-2">
              <TitleMeter value={dt} />
            </div>
          </div>
          <div>
            <Field label="Meta description" htmlFor={`${id}-d`}>
              <textarea id={`${id}-d`} className="textarea" style={{ ["--ta-min" as string]: "6rem", ["--ta-min-lg" as string]: "6rem" }} value={desc} placeholder="One or two sentences that summarise the page" onChange={(e) => (setDesc(e.target.value), used("type"))} />
            </Field>
            <div className="mt-2">
              <DescMeter value={dd} />
            </div>
          </div>
          <Field label="Page URL" htmlFor={`${id}-u`} help="Shown as the breadcrumb line under the site name.">
            <input id={`${id}-u`} className="input" inputMode="url" autoCapitalize="off" spellCheck={false} value={url} placeholder="https://www.example.com/page/" onChange={(e) => setUrl(e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Site name (optional)" htmlFor={`${id}-s`}>
              <input id={`${id}-s`} className="input" value={site} placeholder="From the domain" onChange={(e) => setSite(e.target.value)} />
            </Field>
            <Field label="Date (optional)" htmlFor={`${id}-dt`}>
              <input id={`${id}-dt`} className="input" value={date} placeholder="Sep 12, 2026" onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Bold keyword (optional)" htmlFor={`${id}-k`}>
              <input id={`${id}-k`} className="input" value={kw} placeholder="Words to bold" onChange={(e) => setKw(e.target.value)} />
            </Field>
          </div>
        </div>
      </Panel>
      <div className="grid gap-4">
        <Preview title={dt} description={dd} url={url} siteName={site} date={date} keyword={kw} />
        <Panel title="HTML for your page" actions={<CopyButton text={code} disabled={!code} />}>
          <pre className="min-h-20 overflow-auto p-3 font-mono text-sm whitespace-pre-wrap break-all sm:p-4">{code || "Type a title or description to get the tags."}</pre>
        </Panel>
      </div>
    </div>
  );
}

/* ---------- Title and description generators ---------- */
function SuggestionList({ items, onUse, kind }: { items: Suggestion[]; onUse: (s: string) => void; kind: "title" | "description" }) {
  if (!items.length)
    return <p className="p-3 text-sm text-ink-3 sm:p-4">{kind === "title" ? "Enter a keyword to see title patterns." : "Enter a keyword and what the page offers to see description patterns."}</p>;
  const max = kind === "title" ? SNIPPET.titleMaxPx : SNIPPET.descMaxDesktopPx;
  return (
    <ol className="divide-y divide-line">
      {items.map((s) => (
        <li key={s.text} className="grid gap-2 px-3 py-3 sm:px-4">
          <p className="break-words text-ink">{s.text}</p>
          <LengthMeter label={kind === "title" ? "Title" : "Description"} chars={s.chars} px={s.px} maxPx={max} verdict={s.verdict} />
          <div className="flex flex-wrap gap-1.5">
            <Button variant="secondary" icon="arrow-down" onClick={() => onUse(s.text)}>
              Use this
            </Button>
            <CopyButton text={s.text} />
          </div>
        </li>
      ))}
    </ol>
  );
}

function Generator({ toolId, kind }: { toolId: string; kind: "title" | "description" }) {
  const id = useId();
  const { used, announce } = useTool();
  const [o, setO] = usePersistentOptions(toolId, { brand: "", pageType: "article" as PageType });
  const [keyword, setKeyword] = useState("");
  const [detail, setDetail] = useState("");
  const [location, setLocation] = useState("");
  const [cta, setCta] = useState("");
  const [url, setUrl] = useState("");
  const [mine, setMine] = useSessionText(`${toolId}-mine`);
  const [other, setOther] = useState("");
  const input = useDebounced({ keyword, detail, brand: o.brand, location, pageType: o.pageType, cta }, 120);
  const items = useMemo(() => (kind === "title" ? titleSuggestions(input) : descriptionSuggestions(input)), [input, kind]);
  const dm = useDebounced(mine, 80);
  const title = kind === "title" ? dm : other;
  const desc = kind === "description" ? dm : other;
  const isTitle = kind === "title";
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <div className="grid gap-4">
        <Panel
          title="About the page"
          actions={
            <Button
              variant="ghost"
              icon="sparkles"
              onClick={() => {
                setKeyword("sourdough starter");
                setDetail(isTitle ? "Make, Feed and Store It" : "make a starter with flour and water in 7 days, then learn when to feed it and how to store it");
                setCta(isTitle ? "" : "Read the step-by-step guide");
                setO({ ...o, brand: "Bread Notes", pageType: "article" });
                used("example");
              }}
            >
              Example
            </Button>
          }
        >
          <div className="grid gap-4 p-3 sm:grid-cols-2 sm:p-4">
            <Field label="Main keyword" htmlFor={`${id}-k`} className="sm:col-span-2">
              <input id={`${id}-k`} className="input" value={keyword} placeholder="e.g. sourdough starter" onChange={(e) => (setKeyword(e.target.value), used("type"))} />
            </Field>
            <Field label={isTitle ? "What the page offers" : "What the page gives the reader"} htmlFor={`${id}-d`} className="sm:col-span-2" help={isTitle ? "A short phrase: the benefit, format or angle." : "The answer or benefit, in plain words. This becomes most of the description."}>
              {isTitle ? (
                <input id={`${id}-d`} className="input" value={detail} placeholder="e.g. Make, Feed and Store It" onChange={(e) => setDetail(e.target.value)} />
              ) : (
                <textarea id={`${id}-d`} className="textarea" style={{ ["--ta-min" as string]: "5rem", ["--ta-min-lg" as string]: "5rem" }} value={detail} placeholder="e.g. make a starter with flour and water in 7 days" onChange={(e) => setDetail(e.target.value)} />
              )}
            </Field>
            <Field label="Page type" htmlFor={`${id}-p`}>
              <select id={`${id}-p`} className="select" value={o.pageType} onChange={(e) => setO({ ...o, pageType: e.target.value as PageType })}>
                {PAGE_TYPES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Brand or site name" htmlFor={`${id}-b`}>
              <input id={`${id}-b`} className="input" value={o.brand} placeholder="Optional" onChange={(e) => setO({ ...o, brand: e.target.value })} />
            </Field>
            <Field label="Location" htmlFor={`${id}-l`} help="For local pages, e.g. Leeds.">
              <input id={`${id}-l`} className="input" value={location} placeholder="Optional" onChange={(e) => setLocation(e.target.value)} />
            </Field>
            {!isTitle && (
              <Field label="Call to action" htmlFor={`${id}-c`} help="Defaults to “Find out more”.">
                <input id={`${id}-c`} className="input" value={cta} placeholder="e.g. Compare prices" onChange={(e) => setCta(e.target.value)} />
              </Field>
            )}
          </div>
        </Panel>
        <Panel title={`Suggestions (${items.length})`}>
          <div className="min-h-32">
            <SuggestionList
              items={items}
              kind={kind}
              onUse={(s) => {
                setMine(s);
                announce(`Copied into “Your ${kind}” for editing.`);
              }}
            />
          </div>
          <p className="border-t border-line px-3 py-2 text-xs text-ink-3 sm:px-4">
            Fill-in patterns built from your words, in a fixed order. Patterns that need a field you left empty are skipped. Edit the one you like below.
          </p>
        </Panel>
      </div>
      <div className="grid gap-4">
        <Panel title={`Your ${kind}`} actions={<CopyButton text={mine} disabled={!mine} />}>
          <div className="grid gap-3 p-3 sm:p-4">
            <label htmlFor={`${id}-m`} className="sr-only">
              Your {kind}
            </label>
            {isTitle ? (
              <input id={`${id}-m`} className="input" value={mine} placeholder="Type or pick a suggestion to check it" onChange={(e) => (setMine(e.target.value), used("type"))} />
            ) : (
              <textarea id={`${id}-m`} className="textarea" style={{ ["--ta-min" as string]: "6rem", ["--ta-min-lg" as string]: "6rem" }} value={mine} placeholder="Type or pick a suggestion to check it" onChange={(e) => (setMine(e.target.value), used("type"))} />
            )}
            {isTitle ? <TitleMeter value={dm} /> : <DescMeter value={dm} />}
            <Field label={isTitle ? "Meta description for the preview (optional)" : "Title for the preview (optional)"} htmlFor={`${id}-o`}>
              <input id={`${id}-o`} className="input" value={other} onChange={(e) => setOther(e.target.value)} />
            </Field>
            <Field label="Page URL for the preview (optional)" htmlFor={`${id}-u`}>
              <input id={`${id}-u`} className="input" inputMode="url" autoCapitalize="off" spellCheck={false} value={url} placeholder="https://www.example.com/page/" onChange={(e) => setUrl(e.target.value)} />
            </Field>
          </div>
        </Panel>
        <Preview title={title} description={desc} url={url} siteName={o.brand} keyword={keyword} />
        <Panel title="HTML" actions={<CopyButton text={headCode(isTitle ? mine : "", isTitle ? "" : mine)} disabled={!mine} />}>
          <pre className="min-h-12 overflow-auto p-3 font-mono text-sm whitespace-pre-wrap break-all sm:p-4">{mine ? headCode(isTitle ? mine : "", isTitle ? "" : mine) : `Your ${kind} tag will appear here.`}</pre>
        </Panel>
      </div>
    </div>
  );
}

export default function SerpPreview({ toolId, config }: WidgetProps) {
  const mode = (config?.mode as string) ?? "simulate";
  if (mode === "title") return <Generator toolId={toolId} kind="title" />;
  if (mode === "description") return <Generator toolId={toolId} kind="description" />;
  return <Simulator toolId={toolId} />;
}
