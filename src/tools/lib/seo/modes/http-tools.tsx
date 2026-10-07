"use client";

/* Redirect checker and HTTP status checker (single and bulk), both via /api/http. */
import { useId, useState } from "react";
import { useTool } from "../../../ui/ToolContext";
import { Alert, Button, Checkbox, CopyButton, DownloadButton, Field, Panel, Segmented, StatTile, formatBytes, stamp, usePersistentOptions } from "../../../ui/primitives";
import { parseUrlList, postJson, toCsv, type ApiError, type HttpBulk, type HttpSingle, type Hop } from "../api";
import { USER_AGENTS, analyzeChain, isRedirect, statusMeaning, type UserAgentId } from "../http-status";
import { ApiErrorAlert, CheckedAt, StatusCode, StatusIcon, UrlForm, useRunner } from "../ui";

const MAX_BULK = 20;

function UaSelect({ id, value, onChange }: { id: string; value: UserAgentId; onChange: (v: UserAgentId) => void }) {
  return (
    <Field label="User agent" htmlFor={id} help="Sites can answer bots, phones and desktops differently.">
      <select id={id} className="select" value={value} onChange={(e) => onChange(e.target.value as UserAgentId)}>
        {USER_AGENTS.map((u) => (
          <option key={u.value} value={u.value}>
            {u.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

function HopTable({ hops }: { hops: Hop[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Each request in the redirect chain</caption>
        <thead className="text-xs text-ink-3">
          <tr>
            <th scope="col" className="px-3 py-2 font-semibold sm:px-4">
              #
            </th>
            <th scope="col" className="px-2 py-2 font-semibold">
              Status
            </th>
            <th scope="col" className="px-2 py-2 font-semibold">
              URL → Location
            </th>
            <th scope="col" className="px-3 py-2 text-right font-semibold sm:px-4">
              Time
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {hops.map((h, i) => (
            <tr key={i} className="align-top">
              <td className="px-3 py-2 tabular-nums sm:px-4">{i + 1}</td>
              <td className="px-2 py-2">
                <StatusCode code={h.status} />
              </td>
              <td className="px-2 py-2 break-all">
                <span className="font-mono text-xs">{h.url}</span>
                {h.location && <span className="mt-0.5 block font-mono text-xs text-ink-3">→ {h.location}</span>}
                <span className="mt-0.5 block text-xs text-ink-3">{statusMeaning(h.status)}</span>
              </td>
              <td className="px-3 py-2 text-right tabular-nums sm:px-4">{h.ms !== undefined ? `${h.ms} ms` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** When the server stops at 10 redirects, follow one hop at a time to show where the loop is. */
async function traceLoop(start: string, userAgent: string): Promise<Hop[]> {
  const hops: Hop[] = [];
  const seen = new Set<string>();
  let url = start;
  for (let i = 0; i < 12; i++) {
    const r = await postJson<HttpSingle>("/api/http", { url, follow: false, userAgent, method: "GET" });
    if (!r.ok || r.data.error || !r.data.status) break;
    const loc = r.data.headers?.location;
    hops.push({ url: r.data.finalUrl ?? url, status: r.data.status, location: loc, ms: r.data.totalMs });
    if (!isRedirect(r.data.status) || !loc) break;
    let next: string;
    try {
      next = new URL(loc, url).toString();
    } catch {
      break;
    }
    if (seen.has(next)) {
      hops.push({ url: next, status: 0, location: "(already visited: loop)" });
      break;
    }
    seen.add(url);
    url = next;
  }
  return hops;
}

function BulkTable({ data, kind }: { data: HttpBulk; kind: "redirect" | "status" }) {
  const rows = data.results;
  const csv = () =>
    toCsv([
      ["url", "status", "redirects", "final_url", "ttfb_ms", "total_ms", "error"],
      ...rows.map((r) => [r.url, r.status ?? "", r.hops ? r.hops.filter((h) => isRedirect(h.status)).length : "", r.finalUrl ?? "", r.ttfbMs ?? "", r.totalMs ?? "", r.error?.message ?? ""]),
    ]);
  const ok = rows.filter((r) => !r.error && (r.status ?? 0) < 400).length;
  return (
    <div className="grid gap-3">
      <CheckedAt iso={data.checkedAt} />
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Checked" value={rows.length} />
        <StatTile label="OK (under 400)" value={ok} />
        <StatTile label="Errors or failed" value={rows.length - ok} />
      </div>
      <Panel tone="accent" title="Results" actions={<DownloadButton data={csv} filename={() => `${kind === "redirect" ? "redirects" : "status-codes"}-${stamp()}.csv`} mime="text/csv;charset=utf-8" label="CSV" />}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Bulk results</caption>
            <thead className="text-xs text-ink-3">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold sm:px-4">
                  URL
                </th>
                <th scope="col" className="px-2 py-2 font-semibold">
                  Status
                </th>
                <th scope="col" className="px-2 py-2 font-semibold">
                  {kind === "redirect" ? "Redirects → final URL" : "Final URL"}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-semibold sm:px-4">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r, i) => {
                const n = r.hops?.filter((h) => isRedirect(h.status)).length ?? 0;
                return (
                  <tr key={i} className="align-top">
                    <td className="px-3 py-2 font-mono text-xs break-all sm:px-4">{r.url}</td>
                    <td className="px-2 py-2">{r.error ? <span className="text-danger">{r.error.code}</span> : <StatusCode code={r.status ?? 0} />}</td>
                    <td className="px-2 py-2 text-xs break-all">
                      {r.error ? r.error.message : `${kind === "redirect" ? `${n} redirect${n === 1 ? "" : "s"} → ` : ""}${r.finalUrl ?? ""}`}
                      {!r.error && r.hops && r.hops.length > 1 && kind === "redirect" && <span className="block text-ink-3">{r.hops.map((h) => h.status).join(" → ")}</span>}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums sm:px-4">{r.totalMs !== undefined ? `${r.totalMs} ms` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function BulkForm({ busy, onRun, help }: { busy: boolean; onRun: (urls: string[]) => void; help: string }) {
  const id = useId();
  const { used } = useTool();
  const [text, setText] = useState("");
  const parsed = parseUrlList(text, MAX_BULK);
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (parsed.urls.length) {
          used("bulk");
          onRun(parsed.urls);
        }
      }}
    >
      <Field label={`URLs (one per line, up to ${MAX_BULK})`} htmlFor={`${id}-b`} help={help}>
        <textarea id={`${id}-b`} className="textarea mono" style={{ ["--ta-min" as string]: "8rem", ["--ta-min-lg" as string]: "10rem" }} spellCheck={false} value={text} onChange={(e) => setText(e.target.value)} placeholder={"example.com\nhttp://example.com/old-page"} />
      </Field>
      {parsed.dropped > 0 && <Alert tone="warning">Only the first {MAX_BULK} URLs will be checked; {parsed.dropped} more were left out.</Alert>}
      <div>
        <Button type="submit" variant="primary" size="md" icon="search" busy={busy} disabled={busy || !parsed.urls.length}>
          {busy ? "Checking…" : `Check ${parsed.urls.length || ""} URL${parsed.urls.length === 1 ? "" : "s"}`}
        </Button>
      </div>
    </form>
  );
}

/* ---------------------------------------------------------------- redirect checker */
export function RedirectChecker({ toolId }: { toolId: string }) {
  const id = useId();
  const { announce } = useTool();
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [o, setO] = usePersistentOptions(toolId, { ua: "default" as UserAgentId });
  const single = useRunner<HttpSingle>();
  const bulk = useRunner<HttpBulk>();
  const [loop, setLoop] = useState<Hop[] | null>(null);
  const [loopBusy, setLoopBusy] = useState(false);
  const [lastUrl, setLastUrl] = useState("");
  const d = single.data;
  const targetError: ApiError | null = d?.error ? { kind: "target", code: d.error.code, message: d.error.message } : null;
  const hops = d && !d.error ? (d.hops ?? []) : [];
  return (
    <div className="grid gap-4">
      <Panel>
        <div className="grid gap-4 p-3 sm:p-4">
          <div className="flex flex-wrap items-end gap-4">
            <Segmented legend="Mode" value={mode} onChange={setMode} options={[{ value: "single", label: "One URL" }, { value: "bulk", label: `Bulk (up to ${MAX_BULK})` }]} />
            <div className="min-w-56">
              <UaSelect id={`${id}-ua`} value={o.ua} onChange={(ua) => setO({ ua })} />
            </div>
          </div>
          {mode === "single" ? (
            <UrlForm
              buttonLabel="Trace redirects"
              busy={single.busy || loopBusy}
              placeholder="http://example.com/old-page"
              help="We request the URL from our server without following redirects automatically, then follow each Location header ourselves (up to 10) and record every hop."
              onSubmit={async (u) => {
                setLoop(null);
                setLastUrl(u);
                const r = await single.run(() => postJson<HttpSingle>("/api/http", { url: u, userAgent: o.ua, method: "GET" }), (x) => (x.error ? x.error.message : `${(x.hops?.length ?? 1) - 1} redirects, final status ${x.status}.`));
                if (r?.error?.code === "TOO_MANY_REDIRECTS") {
                  setLoopBusy(true);
                  announce("Tracing the loop one hop at a time…");
                  setLoop(await traceLoop(u, o.ua));
                  setLoopBusy(false);
                }
              }}
            />
          ) : (
            <BulkForm busy={bulk.busy} onRun={(urls) => void bulk.run(() => postJson<HttpBulk>("/api/http", { urls, userAgent: o.ua, method: "GET" }), (x) => `${x.results.length} URLs checked.`)} help="Each URL is followed to its final destination." />
          )}
        </div>
      </Panel>
      {mode === "single" && (
        <div className="grid min-h-24 gap-4" aria-live="polite">
          {single.error && <ApiErrorAlert error={single.error} />}
          {d && (
            <>
              <CheckedAt iso={d.checkedAt}>
                <span>User agent: {USER_AGENTS.find((u) => u.value === o.ua)?.label}</span>
              </CheckedAt>
              {targetError && <ApiErrorAlert error={targetError} />}
              {hops.length > 0 && (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatTile label="Redirects" value={hops.filter((h) => isRedirect(h.status)).length} />
                    <StatTile label="Final status" value={<StatusCode code={d.status ?? 0} />} />
                    <StatTile label="Total time" value={`${d.totalMs ?? 0} ms`} />
                    <StatTile label="Final URL changed" value={d.finalUrl !== hops[0].url ? "Yes" : "No"} />
                  </div>
                  <Panel title="Redirect chain" actions={<CopyButton text={() => hops.map((h, i) => `${i + 1}\t${h.status}\t${h.url}${h.location ? `\t→ ${h.location}` : ""}`).join("\n")} label="Copy chain" />}>
                    <HopTable hops={hops} />
                  </Panel>
                  <Panel title="Findings">
                    <ul className="divide-y divide-line">
                      {analyzeChain(hops).map((n, i) => (
                        <li key={i} className="flex gap-2 px-3 py-2 text-sm sm:px-4">
                          <StatusIcon status={n.severity} />
                          {n.text}
                        </li>
                      ))}
                    </ul>
                  </Panel>
                </>
              )}
            </>
          )}
          {loopBusy && <p className="text-sm text-ink-3">Tracing the loop one hop at a time…</p>}
          {loop && loop.length > 0 && (
            <Panel title={`Hop-by-hop trace of ${lastUrl}`}>
              <HopTable hops={loop.filter((h) => h.status)} />
              <p className="border-t border-line px-3 py-2 text-sm sm:px-4">
                {loop.some((h) => h.status === 0) ? `Loop: the chain returns to ${loop[loop.length - 1].url}. Fix the rule that sends this URL back to an earlier one.` : "The chain kept redirecting past 10 hops. Shorten it so it ends at a page that returns 200."}
              </p>
            </Panel>
          )}
          <p className="text-sm text-ink-3">Only HTTP redirects are followed. Meta refresh tags and JavaScript redirects run in the browser and aren&apos;t detected here.</p>
        </div>
      )}
      {mode === "bulk" && (
        <div className="min-h-24">
          {bulk.error && <ApiErrorAlert error={bulk.error} />}
          {bulk.data && <BulkTable data={bulk.data} kind="redirect" />}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- HTTP status checker */
function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const t = Date.parse(dateStr);
  return Number.isNaN(t) ? null : Math.floor((t - Date.now()) / 86_400_000);
}

export function StatusChecker({ toolId }: { toolId: string }) {
  const id = useId();
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [o, setO] = usePersistentOptions(toolId, { ua: "default" as UserAgentId, method: "GET" as "GET" | "HEAD", follow: true });
  const single = useRunner<HttpSingle>();
  const bulk = useRunner<HttpBulk>();
  const d = single.data;
  const targetError: ApiError | null = d?.error ? { kind: "target", code: d.error.code, message: d.error.message } : null;
  const days = daysUntil(d?.tls?.validTo);
  return (
    <div className="grid gap-4">
      <Panel>
        <div className="grid gap-4 p-3 sm:p-4">
          <Segmented legend="Mode" value={mode} onChange={setMode} options={[{ value: "single", label: "One URL" }, { value: "bulk", label: `Bulk (up to ${MAX_BULK})` }]} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Segmented legend="Request method" value={o.method} onChange={(v) => setO({ ...o, method: v })} options={[{ value: "GET", label: "GET" }, { value: "HEAD", label: "HEAD" }]} />
            <UaSelect id={`${id}-ua`} value={o.ua} onChange={(ua) => setO({ ...o, ua })} />
            <div className="self-end">
              <Checkbox checked={o.follow} onChange={(v) => setO({ ...o, follow: v })} label="Follow redirects" help="Off: report the first response only." />
            </div>
          </div>
          {mode === "single" ? (
            <UrlForm buttonLabel="Check status" busy={single.busy} help="We send the request from our server with the method and user agent you chose, and report exactly what came back." onSubmit={(u) => void single.run(() => postJson<HttpSingle>("/api/http", { url: u, method: o.method, userAgent: o.ua, follow: o.follow }), (x) => (x.error ? x.error.message : `Status ${x.status}.`))} />
          ) : (
            <BulkForm busy={bulk.busy} help="The method and user agent above apply to every URL. Redirects are followed in bulk mode." onRun={(urls) => void bulk.run(() => postJson<HttpBulk>("/api/http", { urls, method: o.method, userAgent: o.ua }), (x) => `${x.results.length} URLs checked.`)} />
          )}
        </div>
      </Panel>
      {mode === "single" && (
        <div className="grid min-h-24 gap-4" aria-live="polite">
          {single.error && <ApiErrorAlert error={single.error} />}
          {d && (
            <>
              <CheckedAt iso={d.checkedAt}>
                <span>
                  {d.method} · {USER_AGENTS.find((u) => u.value === o.ua)?.label}
                </span>
              </CheckedAt>
              {targetError && <ApiErrorAlert error={targetError} />}
              {!d.error && d.status !== undefined && (
                <>
                  <Alert tone={d.status >= 400 ? "danger" : d.status >= 300 ? "warning" : "success"} title={`${d.status} ${d.statusText ?? ""}`}>
                    {statusMeaning(d.status)}
                    {d.method === "HEAD" && d.status === 405 && " Switch the method to GET and check again."}
                  </Alert>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatTile label="Time to first byte" value={`${d.ttfbMs ?? 0} ms`} sub="final request" />
                    <StatTile label="Total time" value={`${d.totalMs ?? 0} ms`} sub="all hops" />
                    <StatTile label="Transferred" value={d.method === "HEAD" ? "—" : formatBytes(d.transferBytes ?? 0)} sub={d.method === "HEAD" ? "HEAD has no body" : `${formatBytes(d.bodyBytes ?? 0)} decoded`} />
                    <StatTile label="Redirects" value={(d.hops ?? []).filter((h) => isRedirect(h.status)).length} />
                  </div>
                  {(d.hops?.length ?? 0) > 1 && (
                    <Panel title="Redirects followed">
                      <HopTable hops={d.hops ?? []} />
                    </Panel>
                  )}
                  <div className="grid items-start gap-4 lg:grid-cols-2">
                    <Panel title="Response headers" actions={<CopyButton text={() => Object.entries(d.headers ?? {}).map(([k, v]) => `${k}: ${v}`).join("\n")} />}>
                      <table className="w-full text-left text-sm">
                        <caption className="sr-only">Selected response headers</caption>
                        <tbody className="divide-y divide-line">
                          {Object.entries(d.headers ?? {}).map(([k, v]) => (
                            <tr key={k} className="align-top">
                              <th scope="row" className="w-44 px-3 py-1.5 font-mono text-xs font-semibold text-ink-2 sm:px-4">
                                {k}
                              </th>
                              <td className="px-3 py-1.5 font-mono text-xs break-all sm:px-4">{v}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="border-t border-line px-3 py-2 text-xs text-ink-3 sm:px-4">Headers relevant to SEO, caching and security are shown; others are omitted.</p>
                    </Panel>
                    <Panel title="HTTPS certificate">
                      <div className="p-3 text-sm sm:p-4">
                        {d.tls ? (
                          <dl className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-3 gap-y-1.5">
                            <dt className="text-ink-3">Valid</dt>
                            <dd>{d.tls.authorized ? "Yes, trusted by our server" : "No"}</dd>
                            <dt className="text-ink-3">Protocol</dt>
                            <dd>{d.tls.protocol ?? "—"}</dd>
                            <dt className="text-ink-3">Issued to</dt>
                            <dd className="break-all">{d.tls.subject ?? "—"}</dd>
                            <dt className="text-ink-3">Issuer</dt>
                            <dd>{d.tls.issuer ?? "—"}</dd>
                            <dt className="text-ink-3">Expires</dt>
                            <dd>
                              {d.tls.validTo ?? "—"}
                              {days !== null && <span className={days < 14 ? " text-danger" : " text-ink-3"}> ({days < 0 ? "expired" : `in ${days} days`})</span>}
                            </dd>
                          </dl>
                        ) : (
                          <p className="text-ink-3">The final URL uses plain HTTP, so there is no certificate.</p>
                        )}
                      </div>
                    </Panel>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
      {mode === "bulk" && (
        <div className="min-h-24">
          {bulk.error && <ApiErrorAlert error={bulk.error} />}
          {bulk.data && <BulkTable data={bulk.data} kind="status" />}
        </div>
      )}
    </div>
  );
}
