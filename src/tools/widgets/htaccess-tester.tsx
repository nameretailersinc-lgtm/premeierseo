"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { Alert, Button, Checkbox, CopyButton, Field, Panel, useDebounced, useSessionText } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { simulate, type SimResult } from "../lib/dev/htaccess";

/*
 * .htaccess rule simulator. Evaluates the common mod_rewrite (RewriteEngine, RewriteBase,
 * RewriteCond, RewriteRule) and mod_alias (Redirect, RedirectMatch, RedirectPermanent,
 * RedirectTemp) directives as Apache does in a per-directory context, with JavaScript regular
 * expressions standing in for PCRE. It never contacts a server.
 */

const SAMPLE_RULES = `RewriteEngine On

# HTTPS and non-www in one redirect
RewriteCond %{HTTPS} off [OR]
RewriteCond %{HTTP_HOST} ^www\\. [NC]
RewriteRule ^ https://example.com%{REQUEST_URI} [R=301,L,NE]

# Moved pages
RewriteRule ^old-page/?$ /new-page/ [R=301,L]
RewriteRule ^blog/(.*)$ /news/$1 [R=301,L]

# Front controller
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.php [L]`;

const SAMPLE_URLS = `https://example.com/old-page
https://example.com/blog/2026/hello
http://www.example.com/
https://example.com/contact/`;

const STATUS_LABEL = { match: "Matched", "no-match": "No match", skipped: "Skipped", ignored: "Not simulated", info: "Info", error: "Error" } as const;

function toneOf(r: SimResult | null): "info" | "success" | "warning" | "danger" {
  if (!r) return "info";
  const k = r.outcome.kind;
  return k === "redirect" ? "success" : k === "loop" || k === "error" ? "danger" : k === "none" ? "info" : "warning";
}

function summary(r: SimResult): string {
  const o = r.outcome;
  if (o.kind === "redirect") return `${o.status} → ${o.url}`;
  if (o.kind === "rewrite") return `Internal rewrite → ${o.url}`;
  if (o.kind === "forbidden") return "403 Forbidden";
  if (o.kind === "gone") return "410 Gone";
  if (o.kind === "loop") return "Rewrite loop (500)";
  if (o.kind === "error") return o.message;
  return "Unchanged";
}

export default function HtaccessTester({ toolId }: WidgetProps) {
  const id = useId();
  const { used, completed, announce } = useTool();
  const [rules, setRules] = useSessionText(toolId);
  const [url, setUrl] = useState("http://www.example.com/blog/2026/hello");
  const [method, setMethod] = useState("GET");
  const [ua, setUa] = useState("");
  const [referer, setReferer] = useState("");
  const [isFile, setIsFile] = useState(false);
  const [isDir, setIsDir] = useState(false);
  const [batch, setBatch] = useState("");
  const dr = useDebounced(rules, 200);
  const du = useDebounced(url, 200);
  const db = useDebounced(batch, 300);
  const req = { method, userAgent: ua, referer, isFile, isDir };
  const res = useMemo(
    () => (dr.trim() && du.trim() ? simulate(dr, { url: du, ...req }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dr, du, method, ua, referer, isFile, isDir],
  );
  const batchRows = useMemo(() => {
    if (!dr.trim() || !db.trim()) return [];
    return db
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 100)
      .map((u) => ({ url: u, r: simulate(dr, { url: u, ...req }) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dr, db, method, ua, referer, isFile, isDir]);

  useEffect(() => {
    if (res && res.outcome.kind !== "error") {
      completed("view");
      announce(res.outcome.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [res?.outcome.message]);

  const batchText = batchRows.map((b) => `${b.url}\t${summary(b.r)}`).join("\n");

  return (
    <div className="grid gap-4">
      <Alert tone="info">
        Rule simulator: it evaluates RewriteEngine, RewriteBase, RewriteCond, RewriteRule, Redirect, RedirectMatch, RedirectPermanent and RedirectTemp the way Apache does in an
        .htaccess file, using JavaScript regular expressions. It doesn&apos;t contact your server; other directives are listed as not simulated.
      </Alert>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          as="div"
          title={<label htmlFor={`${id}-r`}>.htaccess rules</label>}
          actions={
            <>
              <Button
                variant="ghost"
                icon="sparkles"
                onClick={() => {
                  setRules(SAMPLE_RULES);
                  used("example");
                }}
              >
                Example
              </Button>
              <Button variant="ghost" icon="trash" disabled={!rules} onClick={() => setRules("")}>
                Clear
              </Button>
            </>
          }
        >
          <textarea
            id={`${id}-r`}
            className="textarea mono rounded-none border-0"
            wrap="off"
            spellCheck={false}
            style={{ ["--ta-min" as string]: "16rem", ["--ta-min-lg" as string]: "24rem" }}
            placeholder={"RewriteEngine On\nRewriteRule ^old-page/?$ /new-page/ [R=301,L]"}
            value={rules}
            onChange={(e) => {
              setRules(e.target.value);
              used("type");
            }}
          />
        </Panel>
        <Panel title={<span>Request to test</span>}>
          <div className="grid gap-3 p-3 sm:p-4">
            <Field label="URL" htmlFor={`${id}-u`} help="Full address including http:// or https://">
              <input id={`${id}-u`} className="input mono" value={url} autoComplete="off" spellCheck={false} onChange={(e) => setUrl(e.target.value)} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Request method" htmlFor={`${id}-m`}>
                <select id={`${id}-m`} className="select" value={method} onChange={(e) => setMethod(e.target.value)}>
                  {["GET", "POST", "HEAD"].map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </Field>
              <Field label="User agent (optional)" htmlFor={`${id}-ua`}>
                <input id={`${id}-ua`} className="input" value={ua} placeholder="Googlebot" onChange={(e) => setUa(e.target.value)} />
              </Field>
            </div>
            <Field label="Referer (optional)" htmlFor={`${id}-ref`} help="For rules that test %{HTTP_REFERER}, such as hotlink protection">
              <input id={`${id}-ref`} className="input mono" value={referer} placeholder="https://other-site.com/page" autoComplete="off" spellCheck={false} onChange={(e) => setReferer(e.target.value)} />
            </Field>
            <fieldset>
              <legend className="field-label">The requested path is on the server as…</legend>
              <Checkbox checked={isFile} onChange={setIsFile} label="An existing file (-f is true)" />
              <Checkbox checked={isDir} onChange={setIsDir} label="An existing folder (-d is true)" />
            </fieldset>
          </div>
        </Panel>
      </div>

      <Panel title={<span>Result</span>}>
        <div className="grid min-h-24 gap-3 p-3 sm:p-4">
          {!res ? (
            <p className="text-sm text-ink-3">Paste your rules and a URL to see which lines match and where the request ends up.</p>
          ) : (
            <>
              <Alert tone={toneOf(res)} title={res.outcome.kind === "redirect" ? `${res.outcome.status} redirect` : res.outcome.status ? String(res.outcome.status) : undefined}>
                <span className="break-all">{res.outcome.message}</span>
              </Alert>
              {res.trace.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[40rem] border-collapse text-sm">
                    <thead>
                      <tr>
                        {["Line", "Directive", "Result", "Why"].map((h) => (
                          <th key={h} scope="col" className="border-b border-line px-2 py-1.5 text-left font-semibold">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {res.trace.map((t, i) => (
                        <tr key={i} className={t.status === "match" ? "bg-success-subtle" : t.status === "error" ? "bg-danger-subtle" : ""}>
                          <td className="border-b border-line px-2 py-1.5 align-top tabular-nums">{t.line || ""}</td>
                          <td className="border-b border-line px-2 py-1.5 align-top font-mono break-all">{t.text}</td>
                          <td className="border-b border-line px-2 py-1.5 align-top font-semibold whitespace-nowrap">{STATUS_LABEL[t.status]}</td>
                          <td className="border-b border-line px-2 py-1.5 align-top break-words">{t.detail}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {res.unsupported.length > 0 && (
                <p className="text-sm text-ink-2">
                  Not simulated in these rules:{" "}
                  {res.unsupported.map((u) => (
                    <code key={u} className="mr-1">
                      {u}
                    </code>
                  ))}
                  . Check those on a test server.
                </p>
              )}
            </>
          )}
        </div>
      </Panel>

      <Panel
        title={<label htmlFor={`${id}-b`}>Test several URLs</label>}
        actions={
          <>
            <Button
              variant="ghost"
              icon="sparkles"
              onClick={() => {
                setBatch(SAMPLE_URLS);
                used("example");
              }}
            >
              Example URLs
            </Button>
            <CopyButton text={batchText} disabled={!batchText} label="Copy results" />
          </>
        }
      >
        <div className="grid gap-3 p-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:p-4">
          <textarea
            id={`${id}-b`}
            className="textarea mono"
            wrap="off"
            spellCheck={false}
            style={{ ["--ta-min" as string]: "8rem" }}
            placeholder={"One URL per line (up to 100)\nhttps://example.com/old-page"}
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
          />
          <div className="min-h-32 overflow-x-auto">
            {batchRows.length ? (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th scope="col" className="border-b border-line px-2 py-1.5 text-left font-semibold">
                      URL
                    </th>
                    <th scope="col" className="border-b border-line px-2 py-1.5 text-left font-semibold">
                      Outcome
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {batchRows.map((b, i) => (
                    <tr key={i}>
                      <td className="border-b border-line px-2 py-1 align-top font-mono break-all">{b.url}</td>
                      <td className={`border-b border-line px-2 py-1 align-top break-all ${b.r.outcome.kind === "loop" || b.r.outcome.kind === "error" ? "text-danger" : ""}`}>{summary(b.r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-ink-3">Each URL is run through the same rules and request settings. Useful for checking a whole list of old addresses after a migration.</p>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}
