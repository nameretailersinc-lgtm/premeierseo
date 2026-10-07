"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { Alert, Button, Checkbox, CopyButton, DownloadButton, Field, Panel, Segmented, StatTile, downloadBlob, formatBytes, useDebounced, usePersistentOptions, useSessionText } from "../ui/primitives";
import type { WidgetProps } from "../types";
import {
  CANONICAL_DEFAULTS,
  SITEMAP_LIMIT,
  SLUG_DEFAULTS,
  buildHreflang,
  buildSitemap,
  canonicalHeader,
  canonicalTag,
  canonicalize,
  parseHreflang,
  slugify,
  validateHreflang,
  type CanonicalOptions,
  type HreflangFormat,
  type HreflangRow,
  type SitemapOptions,
  type SlugOptions,
} from "../lib/seo/generators";
import { AI_CRAWLERS, buildRobots, type RobotsGenInput, type RobotsGenRule } from "../lib/seo/robots";
import { StatusIcon } from "../lib/seo/ui";

/* config.tool: "slug" | "hreflang" | "canonical" | "robots" | "sitemap" */

const ROBOTS_TESTER_KEY = "pss:input:robots-txt-tester";

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ---------------------------------------------------------------- slugs */
function SlugTool({ toolId }: { toolId: string }) {
  const id = useId();
  const { used } = useTool();
  const [text, setText] = useSessionText(toolId);
  const [o, setO] = usePersistentOptions<SlugOptions & Record<string, unknown>>(toolId, { ...SLUG_DEFAULTS });
  const deb = useDebounced(text, 100);
  const rows = useMemo(
    () =>
      deb
        .split(/\r?\n/)
        .filter((l) => l.trim())
        .map((l) => ({ title: l.trim(), slug: slugify(l, o) })),
    [deb, o],
  );
  const output = rows.map((r) => r.slug).join("\n");
  return (
    <div className="grid gap-4">
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Panel
          title={<label htmlFor={`${id}-t`}>Titles (one per line)</label>}
          actions={
            <>
              <Button variant="ghost" icon="sparkles" onClick={() => (setText("10 Tips for Crème Brûlée & Other French Desserts!\nWhat Is the Best Way to Store a Sourdough Starter?\nStraße in München: Ein Überblick"), used("example"))}>
                Example
              </Button>
              <Button variant="ghost" icon="trash" disabled={!text} onClick={() => setText("")}>
                Clear
              </Button>
            </>
          }
        >
          <textarea id={`${id}-t`} className="textarea rounded-none border-0" style={{ ["--ta-min" as string]: "10rem", ["--ta-min-lg" as string]: "14rem" }} value={text} placeholder="Paste a page title, or many titles, one per line" onChange={(e) => (setText(e.target.value), used("type"))} />
        </Panel>
        <Panel title="Slugs" actions={<CopyButton text={output} disabled={!output} label="Copy all" />} footer={<span>{rows.length} slugs</span>}>
          <ol className="min-h-40 divide-y divide-line">
            {rows.map((r, i) => (
              <li key={i} className="flex items-center justify-between gap-2 px-3 py-2 sm:px-4">
                <div className="min-w-0">
                  <p className="font-mono text-sm break-all text-ink">{r.slug || <span className="text-ink-3">(nothing left after cleaning)</span>}</p>
                  <p className="truncate text-xs text-ink-3">
                    {r.title} · {[...r.slug].length} characters
                  </p>
                </div>
                <CopyButton text={r.slug} disabled={!r.slug} />
              </li>
            ))}
          </ol>
        </Panel>
      </div>
      <Panel icon="sparkles" title="Options">
        <div className="grid gap-4 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-4">
          <Segmented legend="Separator" value={o.separator} onChange={(v) => setO({ ...o, separator: v })} options={[{ value: "-", label: "Hyphen -" }, { value: "_", label: "Underscore _" }]} />
          <Field label="Maximum length" htmlFor={`${id}-max`} help="Cut at a whole word. 0 = no limit.">
            <input id={`${id}-max`} type="number" min={0} max={200} className="input" value={o.maxLength} onChange={(e) => setO({ ...o, maxLength: Math.max(0, Math.min(200, Number(e.target.value) || 0)) })} />
          </Field>
          <div className="grid content-start gap-1 sm:col-span-2">
            <Checkbox checked={o.lowercase} onChange={(v) => setO({ ...o, lowercase: v })} label="Lowercase" />
            <Checkbox checked={o.transliterate} onChange={(v) => setO({ ...o, transliterate: v })} label="Convert accents (é → e, ß → ss)" help="Letters with no Latin equivalent, such as Cyrillic or Chinese, are kept." />
            <Checkbox checked={o.removeStopWords} onChange={(v) => setO({ ...o, removeStopWords: v })} label="Remove stop words (a, the, of, to…)" />
          </div>
        </div>
      </Panel>
    </div>
  );
}

/* ---------------------------------------------------------------- hreflang */
function HreflangTool({ toolId }: { toolId: string }) {
  const id = useId();
  const { used } = useTool();
  const [rows, setRows] = useState<HreflangRow[]>([
    { code: "", url: "" },
    { code: "", url: "" },
    { code: "x-default", url: "" },
  ]);
  const [o, setO] = usePersistentOptions(toolId, { format: "html" as HreflangFormat });
  const deb = useDebounced(rows, 150);
  const issues = useMemo(() => validateHreflang(deb), [deb]);
  const code = useMemo(() => buildHreflang(deb, o.format), [deb, o.format]);
  const errors = issues.filter((i) => i.severity === "error");
  const set = (i: number, k: keyof HreflangRow, v: string) => {
    setRows(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
    used("type");
  };
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Panel
        title="Language versions of the page"
        actions={
          <>
            <Button
              variant="ghost"
              icon="sparkles"
              onClick={() => {
                setRows([
                  { code: "en", url: "https://www.example.com/" },
                  { code: "en-GB", url: "https://www.example.com/uk/" },
                  { code: "de", url: "https://www.example.com/de/" },
                  { code: "x-default", url: "https://www.example.com/" },
                ]);
                used("example");
              }}
            >
              Example
            </Button>
            <Button variant="ghost" icon="trash" onClick={() => setRows([{ code: "", url: "" }, { code: "x-default", url: "" }])}>
              Clear
            </Button>
          </>
        }
      >
        <div className="grid gap-3 p-3 sm:p-4">
          {rows.map((r, i) => {
            const p = parseHreflang(r.code);
            const rowIssues = issues.filter((x) => x.row === i);
            return (
              <div key={i} className="grid gap-2 rounded-md border border-line p-3 sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:items-end">
                <Field label="Code" htmlFor={`${id}-c${i}`}>
                  <input id={`${id}-c${i}`} className="input mono" value={r.code} placeholder="en-GB" autoCapitalize="off" spellCheck={false} onChange={(e) => set(i, "code", e.target.value)} />
                </Field>
                <Field label="URL" htmlFor={`${id}-u${i}`}>
                  <input id={`${id}-u${i}`} className="input" inputMode="url" autoCapitalize="off" spellCheck={false} value={r.url} placeholder="https://www.example.com/uk/" onChange={(e) => set(i, "url", e.target.value)} />
                </Field>
                <Button variant="ghost" icon="trash" disabled={rows.length <= 1} onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label={`Remove row ${i + 1}`}>
                  Remove
                </Button>
                <div className="text-sm sm:col-span-3">
                  {p.label && !p.error && <p className="text-ink-3">{p.label}</p>}
                  {rowIssues.map((x, k) => (
                    <p key={k} className={`flex gap-1.5 ${x.severity === "error" ? "text-danger" : "text-ink-2"}`}>
                      <StatusIcon status={x.severity === "error" ? "fail" : "warn"} />
                      {x.message}
                    </p>
                  ))}
                </div>
              </div>
            );
          })}
          <div>
            <Button icon="plus" onClick={() => setRows([...rows, { code: "", url: "" }])}>
              Add language
            </Button>
          </div>
        </div>
      </Panel>
      <div className="grid gap-4">
        <Segmented
          legend="Output format"
          value={o.format}
          onChange={(v) => setO({ format: v })}
          options={[
            { value: "html", label: "HTML link tags" },
            { value: "sitemap", label: "XML sitemap" },
            { value: "header", label: "HTTP header" },
          ]}
        />
        <Panel
          title={o.format === "html" ? "Add to the <head> of every version" : o.format === "sitemap" ? "Sitemap entries" : "Link header (for PDFs and other non-HTML files)"}
          actions={
            <>
              <CopyButton text={code} disabled={!code} />
              <DownloadButton data={code} filename={o.format === "sitemap" ? "hreflang-sitemap.xml" : o.format === "header" ? "hreflang-header.txt" : "hreflang.html"} disabled={!code} />
            </>
          }
        >
          <pre className="min-h-40 overflow-auto p-3 font-mono text-sm whitespace-pre sm:p-4">{code || "Enter at least one language code and URL."}</pre>
        </Panel>
        {issues.filter((i) => i.row === -1).map((x, k) => (
          <Alert key={k} tone="warning">
            {x.message}
          </Alert>
        ))}
        {errors.length > 0 && (
          <Alert tone="danger" title={`${errors.length} problem${errors.length === 1 ? "" : "s"} to fix`}>
            Rows with errors are shown above. Codes that can&apos;t be read are left out of the output.
          </Alert>
        )}
        <p className="text-sm text-ink-3">Every language version must carry the same complete set, including a link to itself. Pages that don&apos;t link back to each other have their hreflang ignored.</p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- canonical */
function CanonicalTool({ toolId }: { toolId: string }) {
  const id = useId();
  const { used } = useTool();
  const [text, setText] = useSessionText(toolId);
  const [o, setO] = usePersistentOptions<CanonicalOptions & Record<string, unknown>>(toolId, { ...CANONICAL_DEFAULTS });
  const deb = useDebounced(text, 120);
  const rows = useMemo(
    () =>
      deb
        .split(/\r?\n/)
        .filter((l) => l.trim())
        .slice(0, 500)
        .map((l) => ({ input: l.trim(), ...canonicalize(l, o) })),
    [deb, o],
  );
  const [fmt, setFmt] = useState<"tag" | "header" | "url">("tag");
  const out = rows
    .filter((r) => r.url)
    .map((r) => (fmt === "tag" ? canonicalTag(r.url) : fmt === "header" ? canonicalHeader(r.url) : r.url))
    .join("\n");
  return (
    <div className="grid gap-4">
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Panel
          title={<label htmlFor={`${id}-t`}>Page URLs (one per line)</label>}
          actions={
            <>
              <Button variant="ghost" icon="sparkles" onClick={() => (setText("http://Example.com/Shoes/index.html?utm_source=news&color=red&gclid=abc#reviews\nexample.com/blog/post"), used("example"))}>
                Example
              </Button>
              <Button variant="ghost" icon="trash" disabled={!text} onClick={() => setText("")}>
                Clear
              </Button>
            </>
          }
        >
          <textarea id={`${id}-t`} className="textarea mono rounded-none border-0" style={{ ["--ta-min" as string]: "9rem", ["--ta-min-lg" as string]: "12rem" }} spellCheck={false} value={text} placeholder="https://www.example.com/page?utm_source=newsletter" onChange={(e) => (setText(e.target.value), used("type"))} />
        </Panel>
        <div className="grid gap-3">
          <Segmented
            legend="Output"
            value={fmt}
            onChange={setFmt}
            options={[
              { value: "tag", label: "<link> tag" },
              { value: "header", label: "HTTP header" },
              { value: "url", label: "URL only" },
            ]}
          />
          <Panel title="Canonical" actions={<CopyButton text={out} disabled={!out} />}>
            <ul className="min-h-32 divide-y divide-line">
              {rows.map((r, i) => (
                <li key={i} className="px-3 py-2 sm:px-4">
                  {r.error ? (
                    <p className="text-sm text-danger">
                      {r.input}: {r.error}
                    </p>
                  ) : (
                    <>
                      <p className="font-mono text-sm break-all">{fmt === "tag" ? canonicalTag(r.url) : fmt === "header" ? canonicalHeader(r.url) : r.url}</p>
                      <p className="text-xs text-ink-3">{r.changes.length ? `Changed: ${r.changes.join("; ")}` : "Already in canonical form."}</p>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
      <Panel title="Normalization rules">
        <div className="grid gap-4 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-3">
          <Segmented legend="www" value={o.www} onChange={(v) => setO({ ...o, www: v })} options={[{ value: "keep", label: "Keep" }, { value: "add", label: "Add" }, { value: "remove", label: "Remove" }]} />
          <Segmented legend="Trailing slash" value={o.trailingSlash} onChange={(v) => setO({ ...o, trailingSlash: v })} options={[{ value: "keep", label: "Keep" }, { value: "add", label: "Add" }, { value: "remove", label: "Remove" }]} />
          <Segmented
            legend="Query parameters"
            value={o.params}
            onChange={(v) => setO({ ...o, params: v })}
            options={[
              { value: "tracking", label: "Remove tracking" },
              { value: "all", label: "Remove all" },
              { value: "keep", label: "Keep all" },
            ]}
          />
          <Field label="Always keep these parameters" htmlFor={`${id}-keep`} help="Comma-separated, e.g. page, color, id">
            <input id={`${id}-keep`} className="input" value={o.keepParams} onChange={(e) => setO({ ...o, keepParams: e.target.value })} />
          </Field>
          <div className="grid content-start gap-1 sm:col-span-2">
            <Checkbox checked={o.https} onChange={(v) => setO({ ...o, https: v })} label="Use https://" />
            <Checkbox checked={o.removeIndex} onChange={(v) => setO({ ...o, removeIndex: v })} label="Remove index.html, index.php and default.aspx" />
            <Checkbox checked={o.lowercasePath} onChange={(v) => setO({ ...o, lowercasePath: v })} label="Lowercase the path" help="Only if your server treats /Page and /page as the same page." />
          </div>
        </div>
      </Panel>
    </div>
  );
}

/* ---------------------------------------------------------------- robots.txt generator */
function RobotsTool({ toolId }: { toolId: string }) {
  const id = useId();
  const { used } = useTool();
  const [o, setO] = usePersistentOptions(toolId, { defaultPolicy: "allow" as RobotsGenInput["defaultPolicy"], wordpress: false, crawlDelay: "" });
  const [rules, setRules] = useState<RobotsGenRule[]>([{ agent: "*", type: "disallow", path: "" }]);
  const [ai, setAi] = useState<string[]>([]);
  const [sitemaps, setSitemaps] = useState("");
  const input: RobotsGenInput = { defaultPolicy: o.defaultPolicy, wordpress: o.wordpress, crawlDelay: o.crawlDelay, rules, blockAi: ai, sitemaps };
  const deb = useDebounced(input, 120);
  const code = useMemo(() => buildRobots(deb), [deb]);
  const setRule = (i: number, k: keyof RobotsGenRule, v: string) => {
    setRules(rules.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
    used("type");
  };
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <div className="grid gap-4">
        <Panel
          title="Rules"
          actions={
            <Button
              variant="ghost"
              icon="sparkles"
              onClick={() => {
                setO({ ...o, defaultPolicy: "allow", wordpress: true });
                setRules([
                  { agent: "*", type: "disallow", path: "/cart/" },
                  { agent: "*", type: "disallow", path: "/search" },
                ]);
                setAi(["GPTBot", "CCBot", "Google-Extended"]);
                setSitemaps("https://www.example.com/sitemap.xml");
                used("example");
              }}
            >
              Example
            </Button>
          }
        >
          <div className="grid gap-4 p-3 sm:p-4">
            <Segmented
              legend="All crawlers"
              value={o.defaultPolicy}
              onChange={(v) => setO({ ...o, defaultPolicy: v })}
              options={[
                { value: "allow", label: "Allow, with exceptions below" },
                { value: "block", label: "Block the whole site" },
              ]}
            />
            {o.defaultPolicy === "block" && <Alert tone="warning">Disallow: / for all crawlers removes the whole site from search over time. Use it only for staging or private sites.</Alert>}
            <Checkbox checked={o.wordpress} onChange={(v) => setO({ ...o, wordpress: v })} label="WordPress defaults" help="Blocks /wp-admin/ but allows admin-ajax.php, which themes and plugins need." />
            <fieldset className="grid gap-2">
              <legend className="field-label">Allow and disallow rules</legend>
              {rules.map((r, i) => (
                <div key={i} className="grid gap-2 rounded-md border border-line p-2 sm:grid-cols-[8rem_8rem_minmax(0,1fr)_auto] sm:items-end">
                  <Field label="User-agent" htmlFor={`${id}-a${i}`}>
                    <input id={`${id}-a${i}`} className="input mono" value={r.agent} onChange={(e) => setRule(i, "agent", e.target.value)} placeholder="*" />
                  </Field>
                  <Field label="Rule" htmlFor={`${id}-t${i}`}>
                    <select id={`${id}-t${i}`} className="select" value={r.type} onChange={(e) => setRule(i, "type", e.target.value)}>
                      <option value="disallow">Disallow</option>
                      <option value="allow">Allow</option>
                    </select>
                  </Field>
                  <Field label="Path" htmlFor={`${id}-p${i}`}>
                    <input id={`${id}-p${i}`} className="input mono" value={r.path} onChange={(e) => setRule(i, "path", e.target.value)} placeholder="/private/" />
                  </Field>
                  <Button variant="ghost" icon="trash" onClick={() => setRules(rules.filter((_, j) => j !== i))} aria-label={`Remove rule ${i + 1}`}>
                    Remove
                  </Button>
                </div>
              ))}
              <div>
                <Button icon="plus" onClick={() => setRules([...rules, { agent: "*", type: "disallow", path: "" }])}>
                  Add rule
                </Button>
              </div>
              <p className="text-sm text-ink-3">Paths are case-sensitive. Use * for any characters and $ for the end of the URL, e.g. /*.pdf$.</p>
            </fieldset>
          </div>
        </Panel>
        <Panel title="AI crawlers">
          <fieldset className="grid gap-1 p-3 sm:p-4">
            <legend className="sr-only">Block these AI crawlers</legend>
            <p className="mb-1 text-sm text-ink-3">Tick the crawlers to block. Compliance is voluntary: robots.txt asks, it doesn&apos;t enforce.</p>
            {AI_CRAWLERS.map((c) => (
              <Checkbox key={c.token} checked={ai.includes(c.token)} onChange={(v) => setAi(v ? [...ai, c.token] : ai.filter((t) => t !== c.token))} label={`${c.token} (${c.owner})`} help={c.note} />
            ))}
          </fieldset>
        </Panel>
        <Panel title="Sitemap and crawl rate">
          <div className="grid gap-4 p-3 sm:p-4">
            <Field label="Sitemap URLs (one per line)" htmlFor={`${id}-sm`}>
              <textarea id={`${id}-sm`} className="textarea mono" style={{ ["--ta-min" as string]: "4rem", ["--ta-min-lg" as string]: "4rem" }} value={sitemaps} onChange={(e) => setSitemaps(e.target.value)} placeholder="https://www.example.com/sitemap.xml" />
            </Field>
            <Field label="Crawl-delay in seconds (optional)" htmlFor={`${id}-cd`} help="Google ignores it; Bing and Yandex honor it.">
              <input id={`${id}-cd`} className="input" inputMode="decimal" value={o.crawlDelay} onChange={(e) => setO({ ...o, crawlDelay: e.target.value })} />
            </Field>
          </div>
        </Panel>
      </div>
      <div className="grid gap-3 lg:sticky lg:top-4">
        <Panel
          title="robots.txt"
          actions={
            <>
              <CopyButton text={code} />
              <DownloadButton data={code} filename="robots.txt" />
            </>
          }
          footer={<span>Upload to the root of your domain: https://www.example.com/robots.txt</span>}
        >
          <pre className="min-h-48 overflow-auto p-3 font-mono text-sm whitespace-pre sm:p-4">{code}</pre>
        </Panel>
        <div>
          <Link
            className="btn btn-secondary btn-sm"
            href="/robots-txt-tester/"
            onClick={() => {
              try {
                sessionStorage.setItem(ROBOTS_TESTER_KEY, code);
              } catch {
                /* ignore */
              }
            }}
          >
            Test these rules in the robots.txt tester
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- XML sitemap */
function SitemapTool({ toolId }: { toolId: string }) {
  const id = useId();
  const { used, completed } = useTool();
  const [text, setText] = useSessionText(toolId);
  const [o, setO] = usePersistentOptions(toolId, { lastmod: "column" as SitemapOptions["lastmod"], changefreq: "" as SitemapOptions["changefreq"], priority: "" });
  const deb = useDebounced(text, 200);
  const r = useMemo(() => buildSitemap(deb, { ...o, today: today() }), [deb, o]);
  const first = r.files[0];
  const preview = r.index ?? first?.xml ?? "";
  const shown = preview.length > 60_000 ? preview.slice(0, 60_000) + "\n…" : preview;
  const totalBytes = r.files.reduce((n, f) => n + new Blob([f.xml]).size, 0);
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <div className="grid gap-4">
        <Panel
          title={<label htmlFor={`${id}-t`}>Page URLs (one per line)</label>}
          actions={
            <>
              <Button variant="ghost" icon="sparkles" onClick={() => (setText("https://www.example.com/\nhttps://www.example.com/about/ 2026-09-01\nhttps://www.example.com/blog/sourdough-starter/\t2026-09-20\nhttps://www.example.com/about/\n/contact/"), used("example"))}>
                Example
              </Button>
              <Button variant="ghost" icon="trash" disabled={!text} onClick={() => setText("")}>
                Clear
              </Button>
            </>
          }
          footer={<span>Optionally put a date (YYYY-MM-DD) after each URL, separated by a space or tab.</span>}
        >
          <textarea id={`${id}-t`} className="textarea mono rounded-none border-0" style={{ ["--ta-min" as string]: "12rem", ["--ta-min-lg" as string]: "18rem" }} spellCheck={false} value={text} placeholder={"https://www.example.com/\nhttps://www.example.com/about/ 2026-09-01"} onChange={(e) => (setText(e.target.value), used("type"))} />
        </Panel>
        <Panel icon="sparkles" title="Options">
          <div className="grid gap-4 p-3 sm:p-4">
            <Segmented
              legend="lastmod"
              value={o.lastmod}
              onChange={(v) => setO({ ...o, lastmod: v })}
              options={[
                { value: "column", label: "Dates from my list" },
                { value: "today", label: "Today for all" },
                { value: "none", label: "None" },
              ]}
            />
            {o.lastmod === "today" && <p className="text-sm text-ink-3">Only use today&apos;s date if every page really changed today; Google stops trusting lastmod values that are always new.</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="changefreq (ignored by Google)" htmlFor={`${id}-cf`}>
                <select id={`${id}-cf`} className="select" value={o.changefreq} onChange={(e) => setO({ ...o, changefreq: e.target.value as SitemapOptions["changefreq"] })}>
                  <option value="">Leave out</option>
                  {["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"].map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="priority (ignored by Google)" htmlFor={`${id}-pr`}>
                <select id={`${id}-pr`} className="select" value={o.priority} onChange={(e) => setO({ ...o, priority: e.target.value })}>
                  <option value="">Leave out</option>
                  {["1.0", "0.8", "0.5", "0.3"].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        </Panel>
      </div>
      <div className="grid gap-4">
        <div className="grid grid-cols-3 gap-3">
          <StatTile label="URLs" value={r.accepted.toLocaleString()} />
          <StatTile label="Duplicates removed" value={r.duplicates} />
          <StatTile label="Lines skipped" value={r.skipped.filter((s) => !s.reason.startsWith("Date")).length} />
        </div>
        <Panel
          title={r.index ? `Sitemap index + ${r.files.length} files` : "sitemap.xml"}
          actions={
            <>
              <CopyButton text={preview} disabled={!r.accepted} />
              {r.files.length > 1 ? (
                <Button
                  icon="download"
                  disabled={!r.accepted}
                  onClick={async () => {
                    const { zipSync, strToU8 } = await import("fflate");
                    const files: Record<string, Uint8Array> = { "sitemap-index.xml": strToU8(r.index ?? "") };
                    for (const f of r.files) files[f.name] = strToU8(f.xml);
                    downloadBlob(new Blob([zipSync(files) as BlobPart], { type: "application/zip" }), "sitemaps.zip");
                    completed("download");
                  }}
                >
                  Download all (ZIP)
                </Button>
              ) : (
                <DownloadButton data={first?.xml ?? ""} filename="sitemap.xml" mime="application/xml" disabled={!r.accepted} />
              )}
            </>
          }
          footer={r.accepted ? <span>{formatBytes(totalBytes)} uncompressed · limit 50,000 URLs and 50 MB per file</span> : undefined}
        >
          <pre className="max-h-[32rem] min-h-40 overflow-auto p-3 font-mono text-sm whitespace-pre sm:p-4">{r.accepted ? shown : "Paste absolute URLs (starting with https://) to build the sitemap."}</pre>
        </Panel>
        {r.files.length > 1 && <Alert tone="info">More than {SITEMAP_LIMIT.toLocaleString()} URLs, so they were split into {r.files.length} files plus an index. Upload all of them and submit only the index.</Alert>}
        {r.hosts.length > 1 && <Alert tone="warning">The list mixes hosts ({r.hosts.join(", ")}). A sitemap may only list URLs on the host where it is stored.</Alert>}
        {r.skipped.length > 0 && (
          <Alert tone="warning" title="Lines not used">
            <ul className="grid gap-0.5">
              {r.skipped.slice(0, 20).map((s, i) => (
                <li key={i}>
                  Line {s.line}: {s.reason} ({s.text})
                </li>
              ))}
            </ul>
          </Alert>
        )}
      </div>
    </div>
  );
}

export default function SeoGenerators({ toolId, config }: WidgetProps) {
  switch (config?.tool) {
    case "hreflang":
      return <HreflangTool toolId={toolId} />;
    case "canonical":
      return <CanonicalTool toolId={toolId} />;
    case "robots":
      return <RobotsTool toolId={toolId} />;
    case "sitemap":
      return <SitemapTool toolId={toolId} />;
    default:
      return <SlugTool toolId={toolId} />;
  }
}
