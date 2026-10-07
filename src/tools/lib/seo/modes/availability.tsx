"use client";

/*
 * Website uptime checker (owner view) and "Is it down?" (visitor view). One request from our server per check.
 * This is not monitoring and not multi-location: the page says so.
 */
import { useState } from "react";
import { Alert, Button, EmptyState, Panel, StatTile } from "../../../ui/primitives";
import { useTool } from "../../../ui/ToolContext";
import { formatCheckedAt, postJson, type ApiError, type ApiResult, type InspectResult } from "../api";
import { statusMeaning } from "../http-status";
import { ApiErrorAlert, StatusCode, StatusIcon, UrlForm } from "../ui";

export type Verdict = "up" | "error-page" | "blocked" | "server-error" | "down" | "tls" | "loop" | "unknown";

export interface VerdictInfo {
  verdict: Verdict;
  headline: string;
  detail: string;
}

export function verdictFor(r: ApiResult<InspectResult>): VerdictInfo {
  if (!r.ok) {
    const e = r.error;
    if (e.kind !== "target") return { verdict: "unknown", headline: "We couldn't tell", detail: e.kind === "input" ? e.message : "Our checker had a problem, so this says nothing about the site. Try again in a minute." };
    if (e.code === "DNS_FAILED") return { verdict: "down", headline: "Down: the domain doesn't resolve", detail: "Its DNS lookup failed. The domain may have expired, been mistyped, or its DNS servers are failing. This affects everyone." };
    if (e.code === "TIMEOUT") return { verdict: "down", headline: "Down: no response", detail: "The server didn't answer within 10 seconds from our server. It may be overloaded, offline, or blocking our network." };
    if (e.code === "CONNECTION_FAILED") return { verdict: "down", headline: "Down: connection refused or reset", detail: e.message };
    if (e.code === "TLS_ERROR") return { verdict: "tls", headline: "Reachable, but the HTTPS certificate is invalid", detail: `${e.message} Browsers show a security warning instead of the page.` };
    if (e.code === "TOO_MANY_REDIRECTS") return { verdict: "loop", headline: "Broken: stuck in a redirect loop", detail: "The site keeps redirecting and never reaches a page. Browsers show “too many redirects”." };
    return { verdict: "unknown", headline: "The site didn't respond normally", detail: e.message };
  }
  const s = r.data.status;
  if (s < 400) return { verdict: "up", headline: "Up: it's responding for us", detail: `${s} ${r.data.statusText}. The server answered our request normally.` };
  if (s === 401 || s === 403 || s === 429) return { verdict: "blocked", headline: "Up, but it refused our request", detail: `${s}: ${statusMeaning(s)} The server is running, so visitors may still be able to open it.` };
  if (s >= 500) return { verdict: "server-error", headline: "Down: the server returns an error", detail: `${s}: ${statusMeaning(s)} Visitors see an error page too.` };
  return { verdict: "error-page", headline: `The server is up, but this page returns ${s}`, detail: statusMeaning(s) };
}

const TONE: Record<Verdict, "success" | "warning" | "danger" | "info"> = { up: "success", blocked: "warning", "error-page": "warning", "server-error": "danger", down: "danger", tls: "danger", loop: "danger", unknown: "info" };
const ICON: Record<Verdict, "pass" | "warn" | "fail" | "info"> = { up: "pass", blocked: "warn", "error-page": "warn", "server-error": "fail", down: "fail", tls: "fail", loop: "fail", unknown: "info" };

const TRY_LOCAL = [
  "Reload with a hard refresh (Ctrl+F5, or Cmd+Shift+R on a Mac), or open the site in a private window to bypass your cache.",
  "Try another network: switch your phone from Wi-Fi to mobile data. If it works there, the problem is your network or ISP.",
  "Flush your DNS cache (Windows: ipconfig /flushdns; macOS: sudo dscacheutil -flushcache) or switch to a public DNS resolver.",
  "Turn off VPN, proxy and ad-blocking extensions, then try again.",
  "Check whether the site blocks your country or network; some sites restrict access by region.",
];

const TRY_DOWN = [
  "Wait a few minutes and press Check again: outages are often short.",
  "Look for a status page (often status.domain.com) or the site's social media accounts for outage notices.",
  "If it's your site: check your hosting dashboard, server logs, DNS records and domain expiry date.",
];

interface Entry {
  url: string;
  at: string;
  result: ApiResult<InspectResult>;
}

export function AvailabilityCheck({ variant }: { variant: "uptime" | "down" }) {
  const { announce, completed, error: track } = useTool();
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<Entry[]>([]);
  const check = async (url: string) => {
    setBusy(true);
    announce("Checking…");
    const result = await postJson<InspectResult>("/api/inspect", { url });
    const at = result.ok ? result.data.checkedAt : new Date().toISOString();
    setHistory((h) => [{ url, at, result }, ...h].slice(0, 10));
    const v = verdictFor(result);
    announce(v.headline);
    if (result.ok) completed("check");
    else track(result.error.code, "fetch");
    setBusy(false);
  };
  const latest = history[0];
  const v = latest ? verdictFor(latest.result) : null;
  const d = latest?.result.ok ? latest.result.data : null;
  const err: ApiError | null = latest && !latest.result.ok ? latest.result.error : null;
  return (
    <div className="grid gap-4">
      <Panel>
        <div className="p-3 sm:p-4">
          <UrlForm label={variant === "down" ? "Website" : "Your website"} buttonLabel={variant === "down" ? "Check now" : "Check uptime"} busy={busy} placeholder="example.com" help="One request from our server, right now. It isn't continuous monitoring, and it runs from a single location." onSubmit={(u) => void check(u)} />
        </div>
      </Panel>
      <div className="grid min-h-32 gap-4" aria-live="polite">
        {!latest && !busy && !err && (
          <EmptyState icon="wifi" title="Your check result appears here">
            Enter a website above and press the button. We request the page once, from our server, and report what came back.
          </EmptyState>
        )}
        {latest && v && (
          <>
            <Alert tone={TONE[v.verdict]} role="status" title={v.headline}>
              <p>{v.detail}</p>
              <p className="mt-1 text-ink-3">
                Checked {formatCheckedAt(latest.at)} from our server · {latest.url}
              </p>
            </Alert>
            {err && err.kind !== "target" && <ApiErrorAlert error={err} />}
            {d && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatTile label="Status" value={<StatusCode code={d.status} />} sub={d.statusText} />
                <StatTile label="Response time" value={`${d.totalMs} ms`} sub="including redirects" />
                <StatTile label="Time to first byte" value={`${d.ttfbMs} ms`} />
                <StatTile label="Page title" value={<span className="text-base">{d.facts?.title || "—"}</span>} />
              </div>
            )}
            {d && d.hops.length > 1 && <p className="text-sm text-ink-3">Redirected: {d.hops.map((h) => `${h.status} ${h.url}`).join(" → ")}</p>}
            {variant === "down" && (
              <Panel title={v.verdict === "up" || v.verdict === "blocked" ? "It works for us. If it doesn't work for you:" : "What to try"}>
                <ul className="grid gap-2 p-3 text-sm sm:p-4">
                  {(v.verdict === "up" || v.verdict === "blocked" || v.verdict === "unknown" ? TRY_LOCAL : TRY_DOWN).map((t) => (
                    <li key={t} className="flex gap-2">
                      <StatusIcon status="info" />
                      {t}
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
            <div>
              <Button icon="refresh" busy={busy} disabled={busy} onClick={() => void check(latest.url)}>
                Check again
              </Button>
            </div>
            {history.length > 1 && (
              <Panel title="Checks in this session">
                <ul className="divide-y divide-line">
                  {history.map((h, i) => {
                    const hv = verdictFor(h.result);
                    return (
                      <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm sm:px-4">
                        <StatusIcon status={ICON[hv.verdict]} />
                        <span className="tabular-nums text-ink-3">{formatCheckedAt(h.at)}</span>
                        <span className="min-w-0 break-all">{h.url}</span>
                        <span className="text-ink-2">{h.result.ok ? `${h.result.data.status} · ${h.result.data.totalMs} ms` : h.result.error.code}</span>
                      </li>
                    );
                  })}
                </ul>
                <p className="border-t border-line px-3 py-2 text-xs text-ink-3 sm:px-4">Kept only on this page; cleared when you leave.</p>
              </Panel>
            )}
          </>
        )}
      </div>
    </div>
  );
}
