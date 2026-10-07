"use client";

import { useId, useMemo, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { Alert, Button, CopyButton, Field, Panel, StatTile, useDebounced, usePersistentOptions, useSessionText } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { postJson, type FetchTextResult } from "../lib/seo/api";
import { matchRobots, parseRobots } from "../lib/seo/robots";
import { ApiErrorAlert, CheckedAt, StatusCode, StatusIcon, UrlForm, useRunner } from "../lib/seo/ui";

const AGENTS = ["Googlebot", "Googlebot-Image", "Googlebot-News", "Bingbot", "DuckDuckBot", "Applebot", "GPTBot", "OAI-SearchBot", "ClaudeBot", "PerplexityBot", "CCBot", "*"];

const SAMPLE = `User-agent: *
Disallow: /search
Disallow: /*.pdf$
Allow: /search/help

User-agent: Googlebot
Disallow: /private/
Allow: /private/press/

Sitemap: https://www.example.com/sitemap.xml`;

function fetchVerdict(r: FetchTextResult): { tone: "success" | "warning" | "danger"; text: string } {
  if (r.status >= 500) return { tone: "danger", text: `The server returned ${r.status}. While robots.txt returns a server error, Google treats the whole site as disallowed and pauses crawling.` };
  if (r.status >= 400) return { tone: "warning", text: `No robots.txt (status ${r.status}). Crawlers treat that as permission to crawl everything.` };
  if (/text\/html/i.test(r.contentType) && /<html|<!doctype/i.test(r.text.slice(0, 500))) return { tone: "warning", text: "The address returned an HTML page, not a text file. Crawlers will find no valid rules in it, so everything is allowed." };
  return { tone: "success", text: `Fetched ${r.finalUrl} (${r.text.length.toLocaleString("en-US")} characters).` };
}

export default function RobotsTester({ toolId }: WidgetProps) {
  const id = useId();
  const { used, announce } = useTool();
  const [text, setText] = useSessionText(toolId);
  const [urls, setUrls] = useSessionText(`${toolId}-urls`);
  const [o, setO] = usePersistentOptions(toolId, { agent: "Googlebot", custom: "" });
  const runner = useRunner<FetchTextResult>();
  const [fetched, setFetched] = useState<FetchTextResult | null>(null);
  const deb = useDebounced(text, 150);
  const debUrls = useDebounced(urls, 150);
  const parsed = useMemo(() => parseRobots(deb), [deb]);
  const agent = o.agent === "custom" ? o.custom.trim() || "*" : o.agent;
  const tests = useMemo(
    () =>
      debUrls
        .split(/\r?\n/)
        .map((u) => u.trim())
        .filter(Boolean)
        .slice(0, 200)
        .map((u) => ({ url: u, ...matchRobots(parsed, agent, u) })),
    [debUrls, parsed, agent],
  );
  const verdict = fetched ? fetchVerdict(fetched) : null;
  const effectiveText = fetched && fetched.status >= 400 ? "" : deb;
  const blocked = tests.filter((t) => !t.allowed).length;
  return (
    <div className="grid gap-4">
      <Panel title="Load the live robots.txt (optional)">
        <div className="grid gap-3 p-3 sm:p-4">
          <UrlForm
            label="Site address"
            buttonLabel="Fetch robots.txt"
            busy={runner.busy}
            placeholder="example.com"
            help="We request /robots.txt from the site's root on our server and put it in the editor below."
            onSubmit={async (u) => {
              const d = await runner.run(() => postJson<FetchTextResult>("/api/fetch-text", { url: u, kind: "robots" }), (r) => `robots.txt fetched, status ${r.status}.`);
              if (d) {
                setFetched(d);
                setText(d.status >= 400 ? "" : d.text);
                try {
                  const origin = new URL(d.finalUrl).origin;
                  if (!urls.trim()) setUrls(`${origin}/\n${origin}/search?q=test`);
                } catch {
                  /* ignore */
                }
              }
            }}
          />
          {runner.error && <ApiErrorAlert error={runner.error} subject="The site" />}
          {fetched && verdict && (
            <div className="grid gap-2">
              <CheckedAt iso={fetched.checkedAt}>
                <span className="inline-flex items-center gap-1.5">
                  <StatusCode code={fetched.status} /> {fetched.finalUrl}
                </span>
              </CheckedAt>
              {fetched.hops.length > 1 && <p className="text-sm text-ink-3">Redirected: {fetched.hops.map((h) => `${h.status} ${h.url}`).join(" → ")}. Google follows at least five redirect hops for robots.txt, then treats it as missing.</p>}
              <Alert tone={verdict.tone}>{verdict.text}</Alert>
              {fetched.truncated && <Alert tone="warning">The file was cut off at our size limit; Google reads only the first 500 KiB anyway.</Alert>}
            </div>
          )}
        </div>
      </Panel>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Panel
          title={<label htmlFor={`${id}-r`}>robots.txt rules</label>}
          actions={
            <>
              <Button variant="ghost" icon="sparkles" onClick={() => (setText(SAMPLE), setUrls("https://www.example.com/search?q=bread\nhttps://www.example.com/search/help\nhttps://www.example.com/files/menu.pdf\nhttps://www.example.com/private/press/2026.html\nhttps://www.example.com/private/report.html"), setFetched(null), used("example"))}>
                Example
              </Button>
              <Button variant="ghost" icon="trash" disabled={!text} onClick={() => (setText(""), setFetched(null))}>
                Clear
              </Button>
            </>
          }
          footer={
            <span>
              {parsed.groups.length} groups · {parsed.groups.reduce((n, g) => n + g.rules.length, 0)} rules · {parsed.sitemaps.length} sitemaps
            </span>
          }
        >
          <textarea id={`${id}-r`} className="textarea mono rounded-none border-0" style={{ ["--ta-min" as string]: "14rem", ["--ta-min-lg" as string]: "20rem" }} spellCheck={false} value={text} placeholder={"User-agent: *\nDisallow: /private/"} onChange={(e) => (setText(e.target.value), used("type"))} />
        </Panel>
        <div className="grid gap-4">
          <Panel title="Test URLs">
            <div className="grid gap-3 p-3 sm:p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="User agent" htmlFor={`${id}-a`}>
                  <select id={`${id}-a`} className="select" value={o.agent} onChange={(e) => (setO({ ...o, agent: e.target.value }), announce(`Testing as ${e.target.value}`))}>
                    {AGENTS.map((a) => (
                      <option key={a} value={a}>
                        {a === "*" ? "* (any other crawler)" : a}
                      </option>
                    ))}
                    <option value="custom">Other…</option>
                  </select>
                </Field>
                {o.agent === "custom" && (
                  <Field label="Crawler token" htmlFor={`${id}-ca`}>
                    <input id={`${id}-ca`} className="input mono" value={o.custom} onChange={(e) => setO({ ...o, custom: e.target.value })} placeholder="e.g. AhrefsBot" />
                  </Field>
                )}
              </div>
              <Field label="URLs or paths (one per line)" htmlFor={`${id}-u`}>
                <textarea id={`${id}-u`} className="textarea mono" style={{ ["--ta-min" as string]: "6rem", ["--ta-min-lg" as string]: "7rem" }} spellCheck={false} value={urls} placeholder={"/private/page.html\nhttps://www.example.com/search?q=shoes"} onChange={(e) => setUrls(e.target.value)} />
              </Field>
            </div>
          </Panel>
          {tests.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <StatTile label="Allowed" value={tests.length - blocked} />
              <StatTile label="Blocked" value={blocked} />
            </div>
          )}
          <Panel tone="accent" title="Results" actions={<CopyButton text={() => tests.map((t) => `${t.allowed ? "ALLOWED" : "BLOCKED"}\t${t.url}\t${t.rule ? `${t.rule.type}: ${t.rule.path} (line ${t.rule.line})` : "no matching rule"}`).join("\n")} disabled={!tests.length} label="Copy results" />}>
            <ul className="min-h-24 divide-y divide-line" aria-live="polite">
              {tests.length === 0 && <li className="p-3 text-sm text-ink-3 sm:p-4">Enter rules and at least one URL to test.</li>}
              {tests.map((t, i) => (
                <li key={i} className="flex gap-2.5 px-3 py-2.5 sm:px-4">
                  <span className="mt-0.5">
                    <StatusIcon status={t.allowed ? "pass" : "fail"} />
                  </span>
                  <div className="min-w-0 text-sm">
                    <p className="font-semibold break-all">
                      {t.allowed ? "Allowed" : "Blocked"}: <span className="font-mono font-normal">{t.url}</span>
                    </p>
                    <p className="text-ink-3">{t.reason}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
          {effectiveText && parsed.lint.length > 0 && (
            <Panel title={`Syntax notes (${parsed.lint.length})`}>
              <ul className="divide-y divide-line">
                {parsed.lint.map((l, i) => (
                  <li key={i} className="flex gap-2 px-3 py-2 text-sm sm:px-4">
                    <StatusIcon status={l.severity === "error" ? "fail" : l.severity === "warning" ? "warn" : "info"} />
                    <span>
                      {l.line ? <span className="font-mono text-ink-3">Line {l.line}: </span> : null}
                      {l.message}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
