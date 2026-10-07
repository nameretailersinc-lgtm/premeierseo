"use client";

/*
 * "Check a URL" (fetched by /api/inspect on our server) or "Paste HTML" (parsed in the browser with the same rules).
 * Used by the meta tags analyzer, Open Graph checker and heading extractor.
 */
import { useId, useState, type ReactNode } from "react";
import { Alert, Button, Field } from "../../ui/primitives";
import { useTool } from "../../ui/ToolContext";
import { postJson, type ApiError, type InspectResult, type PageFacts } from "./api";
import type { ResponseContext } from "./checks";
import { PASTE_BASE, factsFromHtml } from "./page-facts";
import { ApiErrorAlert, CheckedAt, ModeTabs, StatusCode, UrlForm } from "./ui";

export interface PageResult {
  source: "url" | "paste";
  facts: PageFacts;
  ctx: ResponseContext;
  inspect?: InspectResult;
  pageUrl: string;
}

export function usePageSource(opts: { includeText?: boolean; includeAnchors?: boolean } = {}) {
  const { announce, completed, error: track, used } = useTool();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PageResult | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  /** Fetched but not analyzable (error status or not HTML). */
  const [noHtml, setNoHtml] = useState<InspectResult | null>(null);

  const fromUrl = async (url: string) => {
    setBusy(true);
    setError(null);
    setNoHtml(null);
    announce("Fetching the page…");
    const r = await postJson<InspectResult>("/api/inspect", { url, includeText: opts.includeText, includeAnchors: opts.includeAnchors });
    setBusy(false);
    if (!r.ok) {
      setResult(null);
      setError(r.error);
      track(r.error.code, "fetch");
      announce(r.error.message);
      return;
    }
    const d = r.data;
    if (!d.facts) {
      setResult(null);
      setNoHtml(d);
      announce(`The page returned status ${d.status}; there is no HTML to analyze.`);
      return;
    }
    setResult({
      source: "url",
      facts: d.facts,
      inspect: d,
      pageUrl: d.finalUrl,
      ctx: { status: d.status, finalUrl: d.finalUrl, requestedUrl: d.requestedUrl, headers: d.headers, hops: d.hops, ttfbMs: d.ttfbMs, htmlBytes: d.htmlBytes, transferBytes: d.transferBytes },
    });
    completed("check");
    announce("Page analyzed.");
  };

  const fromHtml = async (html: string, base: string) => {
    used("paste");
    setBusy(true);
    setError(null);
    setNoHtml(null);
    try {
      let pageUrl = PASTE_BASE;
      if (base.trim()) {
        try {
          pageUrl = new URL(/^https?:\/\//i.test(base.trim()) ? base.trim() : `https://${base.trim()}`).toString();
        } catch {
          pageUrl = PASTE_BASE;
        }
      }
      const facts = await factsFromHtml(html, pageUrl);
      setResult({ source: "paste", facts, pageUrl, ctx: { finalUrl: base.trim() ? pageUrl : undefined } });
      completed("check");
      announce("HTML analyzed.");
    } catch {
      setError({ kind: "input", code: "PARSE_FAILED", message: "The HTML couldn't be read. Paste the full page source, starting with <!doctype html> or <html>." });
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setNoHtml(null);
  };

  return { busy, result, error, noHtml, fromUrl, fromHtml, reset };
}

export function PageSourceForm({
  src,
  urlButton,
  pasteButton,
  sampleHtml,
  urlHelp,
  extra,
}: {
  src: ReturnType<typeof usePageSource>;
  urlButton: string;
  pasteButton: string;
  sampleHtml: string;
  urlHelp?: ReactNode;
  extra?: ReactNode;
}) {
  const id = useId();
  const [mode, setMode] = useState<"url" | "paste">("url");
  const [html, setHtml] = useState("");
  const [base, setBase] = useState("");
  return (
    <div className="grid gap-4">
      <ModeTabs
        label="What to check"
        value={mode}
        onChange={(m) => {
          setMode(m);
          src.reset();
        }}
        options={[
          { value: "url", label: "Check a URL" },
          { value: "paste", label: "Paste HTML" },
        ]}
      />
      {mode === "url" ? (
        <UrlForm buttonLabel={urlButton} busy={src.busy} onSubmit={(u) => void src.fromUrl(u)} help={urlHelp ?? "We request the page from our server, as a crawler would, and read the HTML it returns. Content added later by JavaScript isn't seen."}>
          {extra}
        </UrlForm>
      ) : (
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (html.trim()) void src.fromHtml(html, base);
          }}
        >
          <Field label="Page HTML" htmlFor={`${id}-h`} help="Paste the page source (in most desktop browsers: right-click → View page source, select all, copy). Nothing is uploaded; it's read in your browser.">
            <textarea id={`${id}-h`} className="textarea mono" style={{ ["--ta-min" as string]: "10rem", ["--ta-min-lg" as string]: "12rem" }} spellCheck={false} value={html} onChange={(e) => setHtml(e.target.value)} placeholder="<!doctype html>…" />
          </Field>
          <Field label="Page URL (optional)" htmlFor={`${id}-b`} help="Used to resolve relative links and to compare against the canonical tag.">
            <input id={`${id}-b`} className="input" inputMode="url" autoCapitalize="off" spellCheck={false} value={base} onChange={(e) => setBase(e.target.value)} placeholder="https://www.example.com/page/" />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary" size="md" icon="search" busy={src.busy} disabled={!html.trim() || src.busy}>
              {pasteButton}
            </Button>
            <Button
              variant="ghost"
              size="md"
              icon="sparkles"
              onClick={() => {
                setHtml(sampleHtml);
                setBase("https://www.example.com/baking/sourdough-starter/");
              }}
            >
              Load sample HTML
            </Button>
            <Button variant="ghost" size="md" icon="trash" disabled={!html} onClick={() => (setHtml(""), src.reset())}>
              Clear
            </Button>
          </div>
        </form>
      )}
      {src.error && <ApiErrorAlert error={src.error} />}
      {src.noHtml && <NoHtmlNotice r={src.noHtml} />}
    </div>
  );
}

export function NoHtmlNotice({ r }: { r: InspectResult }) {
  return (
    <div className="grid gap-2">
      <Alert tone={r.status >= 400 ? "danger" : "warning"} role="alert" title={r.status >= 400 ? `The page returned an error (${r.status})` : "This address didn't return an HTML page"}>
        <p className="flex flex-wrap items-center gap-2">
          <StatusCode code={r.status} /> {r.statusText} · {r.finalUrl}
        </p>
        <p className="mt-1">
          {r.status >= 400 ? "Pages that return an error status can't be indexed, so there are no tags to check. Fix the error first." : `Content type: ${r.contentType || "not stated"}. Only HTML pages have meta tags.`}
        </p>
      </Alert>
      <CheckedAt iso={r.checkedAt} />
    </div>
  );
}

export const SAMPLE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>How to Make a Sourdough Starter From Scratch: Feeding, Storing and Reviving It</title>
<meta name="description" content="Make a sourdough starter with flour and water.">
<link rel="canonical" href="https://www.example.com/baking/sourdough-starter/">
<meta property="og:title" content="How to make a sourdough starter">
<meta property="og:description" content="Seven days, two ingredients, one jar.">
<meta property="og:image" content="/images/starter.jpg">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Article","headline":"How to make a sourdough starter","datePublished":"2026-09-12"}</script>
</head>
<body>
<h1>How to make a sourdough starter</h1>
<h3>What you need</h3>
<p>Flour, water and a jar. <img src="/images/jar.jpg"></p>
<h2>Day 1</h2>
<p>Mix 50 g flour with 50 g water. <a href="/baking/">More baking guides</a></p>
<h2></h2>
</body>
</html>`;
