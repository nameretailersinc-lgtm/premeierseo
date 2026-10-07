"use client";

/* Heading extractor, SEO checklist, backlink verifier and page size checker (via /api/inspect). */
import { useId, useMemo, useState } from "react";
import { useTool } from "../../../ui/ToolContext";
import { Alert, Button, CopyButton, DownloadButton, Field, Panel, StatTile, formatBytes, stamp } from "../../../ui/primitives";
import { hostOf, parseUrlList, postJson, toCsv, type ApiError, type InspectResult, type PsiResult } from "../api";
import {
  contentChecks,
  countStatuses,
  descriptionChecks,
  directives,
  documentChecks,
  headingIssues,
  indexabilityChecks,
  linkImageChecks,
  scoreChecks,
  socialChecks,
  speedBasics,
  structuredDataCheck,
  titleChecks,
  viewportCheck,
  type Check,
} from "../checks";
import { PageSourceForm, SAMPLE_HTML, usePageSource, NoHtmlNotice } from "../page-source";
import { ApiErrorAlert, CheckList, CheckedAt, StatusCode, StatusIcon, UrlForm, useRunner } from "../ui";

/* ---------------------------------------------------------------- heading extractor */
export function HeadingExtractor() {
  const src = usePageSource();
  const r = src.result;
  const [level, setLevel] = useState(0);
  const h = useMemo(() => r?.facts.headings ?? [], [r]);
  const issues = useMemo(() => headingIssues(h), [h]);
  const counts = [1, 2, 3, 4, 5, 6].map((l) => h.filter((x) => x.level === l).length);
  const outline = h.map((x) => `${"  ".repeat(x.level - 1)}H${x.level} ${x.text || "(empty)"}`).join("\n");
  const csv = () => toCsv([["position", "level", "text", "issue"], ...h.map((x, i) => [i + 1, `H${x.level}`, x.text, issues.filter((s) => s.index === i).map((s) => s.message).join(" ")])]);
  const shown = h.map((x, i) => ({ ...x, i })).filter((x) => !level || x.level === level);
  return (
    <div className="grid gap-4">
      <Panel>
        <div className="p-3 sm:p-4">
          <PageSourceForm src={src} urlButton="Extract headings" pasteButton="Extract from HTML" sampleHtml={SAMPLE_HTML} />
        </div>
      </Panel>
      <div className="min-h-24">
        {r && (
          <div className="grid gap-4">
            {r.inspect ? (
              <CheckedAt iso={r.inspect.checkedAt}>
                <span className="inline-flex items-center gap-1.5">
                  <StatusCode code={r.inspect.status} /> {r.inspect.finalUrl}
                </span>
              </CheckedAt>
            ) : (
              <p className="text-sm text-ink-3">Read from the HTML you pasted, in your browser.</p>
            )}
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {counts.map((c, i) => (
                <StatTile key={i} label={`H${i + 1}`} value={c} />
              ))}
            </div>
            <Panel title="Issues">
              <ul className="divide-y divide-line">
                {counts[0] === 0 && (
                  <li className="flex gap-2 px-3 py-2 text-sm sm:px-4">
                    <StatusIcon status="warn" /> No H1. Give the page one main heading that says what it is about.
                  </li>
                )}
                {counts[0] > 1 && (
                  <li className="flex gap-2 px-3 py-2 text-sm sm:px-4">
                    <StatusIcon status="info" /> {counts[0]} H1 headings. Allowed, but one clear main heading is easier to scan and for screen-reader users.
                  </li>
                )}
                {issues
                  .filter((s) => s.kind !== "extra-h1")
                  .map((s, k) => (
                    <li key={k} className="flex gap-2 px-3 py-2 text-sm sm:px-4">
                      <StatusIcon status="warn" /> Heading {s.index + 1}: {s.message}
                    </li>
                  ))}
                {counts[0] === 1 && !issues.some((s) => s.kind !== "extra-h1") && (
                  <li className="flex gap-2 px-3 py-2 text-sm sm:px-4">
                    <StatusIcon status="pass" /> One H1, no skipped levels and no empty headings.
                  </li>
                )}
              </ul>
            </Panel>
            <Panel
              title={`Outline (${h.length} headings)`}
              actions={
                <>
                  <label className="sr-only" htmlFor="heading-level-filter">
                    Show level
                  </label>
                  <select id="heading-level-filter" className="select h-9 w-28 text-sm" value={level} onChange={(e) => setLevel(Number(e.target.value))}>
                    <option value={0}>All levels</option>
                    {[1, 2, 3, 4, 5, 6].map((l) => (
                      <option key={l} value={l}>
                        H{l} only
                      </option>
                    ))}
                  </select>
                  <CopyButton text={outline} disabled={!h.length} label="Copy outline" />
                  <DownloadButton data={csv} filename={() => `headings-${stamp()}.csv`} mime="text/csv;charset=utf-8" label="CSV" disabled={!h.length} />
                </>
              }
            >
              {h.length ? (
                <ol className="max-h-[36rem] overflow-auto p-3 sm:p-4">
                  {shown.map((x) => {
                    const iss = issues.filter((s) => s.index === x.i);
                    return (
                      <li key={x.i} className="flex items-start gap-2 py-1 text-sm" style={{ paddingLeft: level ? 0 : `${(x.level - 1) * 1.25}rem` }}>
                        <span className="inline-flex h-5 min-w-8 shrink-0 items-center justify-center rounded-sm border border-line bg-surface-2 font-mono text-xs font-semibold">H{x.level}</span>
                        <span className={x.text ? "text-ink" : "text-ink-3 italic"}>{x.text || "(empty heading)"}</span>
                        {iss.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-warning">
                            <StatusIcon status="warn" />
                            {iss.map((s) => s.message).join(" ")}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="p-3 text-sm text-ink-3 sm:p-4">No H1–H6 headings in the HTML.</p>
              )}
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- SEO checklist + score */
export function seoAuditChecks(d: InspectResult): Check[] {
  const f = d.facts!;
  const ctx = { status: d.status, finalUrl: d.finalUrl, requestedUrl: d.requestedUrl, headers: d.headers, hops: d.hops, ttfbMs: d.ttfbMs, htmlBytes: d.htmlBytes, transferBytes: d.transferBytes };
  return [
    ...indexabilityChecks(f, ctx),
    ...titleChecks(f),
    ...descriptionChecks(f),
    ...contentChecks(f),
    ...linkImageChecks(f),
    structuredDataCheck(f),
    viewportCheck(f),
    ...documentChecks(f, d.headers),
    ...speedBasics(ctx),
    ...socialChecks(f, d.finalUrl).map((c) => ({ ...c, group: "Social sharing" })),
  ];
}

export function SeoAudit() {
  const runner = useRunner<InspectResult>();
  const d = runner.data;
  const checks = useMemo(() => (d?.facts ? seoAuditChecks(d) : []), [d]);
  const score = scoreChecks(checks);
  const counts = countStatuses(checks);
  const fixes = checks
    .filter((c) => c.status === "fail" || c.status === "warn")
    .sort((a, b) => (a.status === b.status ? (b.weight ?? 0) - (a.weight ?? 0) : a.status === "fail" ? -1 : 1));
  return (
    <div className="grid gap-4">
      <Panel>
        <div className="p-3 sm:p-4">
          <UrlForm buttonLabel="Audit page" busy={runner.busy} help="Checks one page. Our server requests it like a crawler and reads the HTML, headers and timing it receives." onSubmit={(u) => void runner.run(() => postJson<InspectResult>("/api/inspect", { url: u }), (x) => (x.facts ? "Audit complete." : `The page returned ${x.status}; nothing to audit.`))} />
        </div>
      </Panel>
      <div className="grid min-h-24 gap-4" aria-live="polite">
        {runner.error && <ApiErrorAlert error={runner.error} />}
        {d && !d.facts && <NoHtmlNotice r={d} />}
        {d?.facts && (
          <>
            <CheckedAt iso={d.checkedAt}>
              <span className="inline-flex items-center gap-1.5">
                <StatusCode code={d.status} /> {d.finalUrl}
              </span>
            </CheckedAt>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <StatTile label="Checklist score" value={`${score.score}/100`} sub={`${score.earned} of ${score.possible} points`} />
              <StatTile label="Passed" value={counts.pass} />
              <StatTile label="Warnings" value={counts.warn} />
              <StatTile label="Problems" value={counts.fail} />
              <StatTile label="Notes" value={counts.info} />
            </div>
            <details className="rounded-md border border-line px-3 py-2 text-sm">
              <summary className="cursor-pointer font-semibold">How the score is calculated</summary>
              <p className="mt-2 text-ink-2">
                Each scored check has a weight, listed in the “How the score is calculated” section further down this page. A pass earns its full weight, a warning half, a problem nothing; notes aren&apos;t scored. Score = points earned ÷ points available × 100. It measures this checklist only, not how Google ranks the page.
              </p>
            </details>
            {fixes.length > 0 && (
              <Panel title={`Fix first (${fixes.length})`}>
                <ol className="divide-y divide-line">
                  {fixes.map((c) => (
                    <li key={c.id} className="flex gap-2.5 px-3 py-2.5 text-sm sm:px-4">
                      <StatusIcon status={c.status} />
                      <div className="min-w-0">
                        <p className="font-semibold">
                          {c.label} <span className="font-normal text-ink-3">· {c.group}</span>
                        </p>
                        {c.advice && <p className="text-ink-2">{c.advice}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              </Panel>
            )}
            <Panel title="Full checklist with evidence">
              <div className="p-3 sm:p-4">
                <CheckList checks={checks} />
              </div>
            </Panel>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- backlink verifier */
interface LinkCheck {
  url: string;
  data?: InspectResult;
  error?: ApiError;
}

function relLabel(rel: string): string {
  const r = rel.split(/\s+/).filter(Boolean);
  const flags = r.filter((x) => ["nofollow", "sponsored", "ugc"].includes(x));
  return flags.length ? flags.join(", ") : "followed";
}

function matchesDomain(href: string, domain: string): boolean {
  const h = hostOf(href).toLowerCase().replace(/^www\./, "");
  const d = domain.toLowerCase().replace(/^www\./, "");
  return h === d || h.endsWith("." + d);
}

export function BacklinkVerifier() {
  const id = useId();
  const { used, announce, completed } = useTool();
  const [target, setTarget] = useState("");
  const [pages, setPages] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<LinkCheck[]>([]);
  const [checkedAt, setCheckedAt] = useState("");
  const domain = target.trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase();
  const list = parseUrlList(pages, 10);
  const run = async () => {
    if (!domain || !list.urls.length) return;
    used("url");
    setBusy(true);
    setResults([]);
    const out: LinkCheck[] = [];
    for (let i = 0; i < list.urls.length; i += 3) {
      const batch = await Promise.all(
        list.urls.slice(i, i + 3).map(async (url) => {
          const r = await postJson<InspectResult>("/api/inspect", { url, includeAnchors: true });
          return r.ok ? { url, data: r.data } : { url, error: r.error };
        }),
      );
      out.push(...batch);
      setResults([...out]);
      announce(`${out.length} of ${list.urls.length} pages checked.`);
    }
    setCheckedAt(new Date().toISOString());
    setBusy(false);
    completed("check");
  };
  const rows = results.map((r) => {
    const anchors = r.data?.facts?.anchors.filter((a) => matchesDomain(a.href, domain)) ?? [];
    const robots = r.data?.facts ? [...directives(r.data.facts.robots), ...directives(r.data.facts.googlebot)] : [];
    return { ...r, anchors, noindex: robots.includes("noindex") || robots.includes("none"), nofollowPage: robots.includes("nofollow") || robots.includes("none") };
  });
  const found = rows.filter((r) => r.anchors.length).length;
  const csv = () =>
    toCsv([
      ["page", "status", "links_found", "link_href", "anchor_text", "rel", "page_noindex"],
      ...rows.flatMap((r) => (r.anchors.length ? r.anchors.map((a) => [r.url, r.data?.status ?? r.error?.code ?? "", r.anchors.length, a.href, a.text, relLabel(a.rel), r.noindex ? "yes" : "no"]) : [[r.url, r.data?.status ?? r.error?.code ?? "", 0, "", "", "", r.noindex ? "yes" : "no"]])),
    ]);
  return (
    <div className="grid gap-4">
      <Panel>
        <form
          className="grid gap-4 p-3 sm:p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void run();
          }}
        >
          <Field label="Your domain" htmlFor={`${id}-d`} help="Links to this domain and its subdomains are counted.">
            <input id={`${id}-d`} className="input" autoCapitalize="off" spellCheck={false} value={target} onChange={(e) => setTarget(e.target.value)} placeholder="example.com" />
          </Field>
          <Field label="Pages that should link to you (one per line, up to 10)" htmlFor={`${id}-p`} help="For example, pages from a guest post, directory listing or partner site.">
            <textarea id={`${id}-p`} className="textarea mono" style={{ ["--ta-min" as string]: "7rem", ["--ta-min-lg" as string]: "8rem" }} spellCheck={false} value={pages} onChange={(e) => setPages(e.target.value)} placeholder={"https://blog.example.org/best-bakeries/\nhttps://directory.example.net/leeds/bakeries/"} />
          </Field>
          {list.dropped > 0 && <Alert tone="warning">Only the first 10 pages will be checked.</Alert>}
          <div>
            <Button type="submit" variant="primary" size="md" icon="search" busy={busy} disabled={busy || !domain || !list.urls.length}>
              {busy ? "Checking…" : "Verify links"}
            </Button>
          </div>
        </form>
      </Panel>
      <div className="grid min-h-24 gap-4" aria-live="polite">
        {rows.length > 0 && (
          <>
            {checkedAt && <CheckedAt iso={checkedAt} />}
            <div className="grid grid-cols-3 gap-3">
              <StatTile label="Pages checked" value={rows.length} />
              <StatTile label="Link to you" value={found} />
              <StatTile label="No link found" value={rows.length - found} />
            </div>
            <Panel tone="accent" title="Results" actions={<DownloadButton data={csv} filename={() => `backlink-check-${stamp()}.csv`} mime="text/csv;charset=utf-8" label="CSV" disabled={busy} />}>
              <ul className="divide-y divide-line">
                {rows.map((r) => (
                  <li key={r.url} className="grid gap-1.5 px-3 py-3 text-sm sm:px-4">
                    <p className="flex flex-wrap items-center gap-2 font-mono text-xs break-all">
                      {r.data ? <StatusCode code={r.data.status} /> : null}
                      {r.url}
                    </p>
                    {r.error ? (
                      <p className={r.error.kind === "target" ? "text-warning" : "text-danger"}>{r.error.message}</p>
                    ) : !r.data?.facts ? (
                      <p className="text-danger">No HTML to read (status {r.data?.status}).</p>
                    ) : r.anchors.length ? (
                      <>
                        <p className="flex gap-2 font-semibold">
                          <StatusIcon status="pass" /> {r.anchors.length} link{r.anchors.length === 1 ? "" : "s"} to {domain}
                        </p>
                        <ul className="grid gap-1 pl-7">
                          {r.anchors.slice(0, 10).map((a, k) => (
                            <li key={k} className="break-all">
                              <span className="font-mono text-xs">{a.href}</span> · anchor “{a.text || "(no text)"}” · <span className={relLabel(a.rel) === "followed" ? "text-success" : "text-ink-3"}>{relLabel(a.rel)}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <p className="flex gap-2">
                        <StatusIcon status="fail" /> No link to {domain} in the HTML.
                      </p>
                    )}
                    {r.noindex && <p className="flex gap-2 text-ink-2"><StatusIcon status="warn" /> This page has noindex, so search engines may drop it and its links.</p>}
                    {r.nofollowPage && !r.noindex && <p className="flex gap-2 text-ink-2"><StatusIcon status="warn" /> The whole page is set to nofollow.</p>}
                  </li>
                ))}
              </ul>
            </Panel>
          </>
        )}
        <Alert tone="info" title="This checks pages you name; it doesn't discover backlinks">
          To see who links to your site, use the Links report in Google Search Console and the Backlinks report in Bing Webmaster Tools; both are free for sites you verify. Links added by JavaScript after the page loads aren&apos;t seen here.
        </Alert>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- page size */
export function PageSize() {
  const runner = useRunner<InspectResult>();
  const psi = useRunner<PsiResult>();
  const d = runner.data;
  const enc = d?.headers["content-encoding"];
  const ratio = d && d.htmlBytes ? Math.round((1 - d.transferBytes / d.htmlBytes) * 100) : 0;
  return (
    <div className="grid gap-4">
      <Panel>
        <div className="p-3 sm:p-4">
          <UrlForm buttonLabel="Check page size" busy={runner.busy} help="Our server downloads the HTML document and measures it. Images, scripts and styles are counted but not downloaded; use the optional full-page test for those." onSubmit={(u) => (psi.reset(), void runner.run(() => postJson<InspectResult>("/api/inspect", { url: u }), (x) => `HTML is ${formatBytes(x.htmlBytes)}.`))} />
        </div>
      </Panel>
      <div className="grid min-h-24 gap-4" aria-live="polite">
        {runner.error && <ApiErrorAlert error={runner.error} />}
        {d && (
          <>
            <CheckedAt iso={d.checkedAt}>
              <span className="inline-flex items-center gap-1.5">
                <StatusCode code={d.status} /> {d.finalUrl}
              </span>
            </CheckedAt>
            <Panel title="HTML document">
              <div className="grid gap-3 p-3 sm:p-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatTile label="Transferred" value={formatBytes(d.transferBytes)} sub={enc ? `${enc} compressed` : "not compressed"} />
                  <StatTile label="Uncompressed HTML" value={formatBytes(d.htmlBytes)} />
                  <StatTile label="Saved by compression" value={enc ? `${ratio}%` : "0%"} />
                  <StatTile label="Server response" value={`${d.ttfbMs} ms`} sub="time to first byte" />
                </div>
                {!enc && d.htmlBytes > 2000 && <Alert tone="warning">The HTML is sent uncompressed. Enabling gzip or Brotli on the server usually shrinks HTML to a fraction of its size.</Alert>}
                {d.truncated && <Alert tone="warning">The document is larger than our 5 MB download limit; sizes shown are for the first 5 MB only.</Alert>}
                {d.htmlBytes > 15_000_000 && <Alert tone="danger">Over 15 MB: Googlebot stops reading HTML after the first 15 MB.</Alert>}
                {d.facts && (
                  <p className="text-sm text-ink-2">
                    The HTML references {d.facts.scripts} external scripts, {d.facts.stylesheets} stylesheets, {d.facts.images.total} images and {d.facts.iframes} iframes. Their size isn&apos;t included above.
                  </p>
                )}
              </div>
            </Panel>
            <Panel title="Total page weight (optional)">
              <div className="grid gap-3 p-3 sm:p-4">
                <p className="text-sm text-ink-2">
                  To measure everything the page loads (images, scripts, CSS, fonts), run a Lighthouse test with Google PageSpeed Insights. This sends the URL to Google and takes up to a minute.
                </p>
                <div>
                  <Button variant="secondary" icon="gauge" busy={psi.busy} disabled={psi.busy} onClick={() => void psi.run(() => postJson<PsiResult>("/api/pagespeed", { url: d.finalUrl, strategy: "mobile" }), () => "Full-page test complete.")}>
                    {psi.busy ? "Testing with PageSpeed Insights…" : "Measure total page weight"}
                  </Button>
                </div>
                {psi.error && <ApiErrorAlert error={psi.error} />}
                {psi.data && (
                  <>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <StatTile label="Total transferred" value={psi.data.pageWeight?.numericValue ? formatBytes(psi.data.pageWeight.numericValue) : "—"} sub="all resources, mobile test" />
                      <StatTile label="Requests" value={psi.data.requests ?? "—"} />
                      <StatTile label="HTML share" value={psi.data.pageWeight?.numericValue ? `${Math.round((d.transferBytes / psi.data.pageWeight.numericValue) * 100)}%` : "—"} />
                    </div>
                    <p className="text-xs text-ink-3">
                      Data from Google PageSpeed Insights (Lighthouse {psi.data.lighthouseVersion ?? ""}), mobile emulation, checked {new Date(psi.data.checkedAt).toLocaleString("en-US")}.
                    </p>
                  </>
                )}
              </div>
            </Panel>
          </>
        )}
      </div>
    </div>
  );
}
