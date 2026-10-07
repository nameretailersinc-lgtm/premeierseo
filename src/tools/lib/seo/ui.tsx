"use client";

/* Shared building blocks for the SEO and website-check widgets. Uses the UI kit; no new styles. */
import { useId, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/Icon";
import { Alert, Button } from "../../ui/primitives";
import { useTool } from "../../ui/ToolContext";
import { formatCheckedAt, type ApiError, type ApiResult } from "./api";
import type { Check, CheckStatus } from "./checks";
import { SNIPPET, textWidth, truncateToWidth } from "./pixels";

/* ---------- URL form ---------- */
export function UrlForm({
  label = "Page URL",
  buttonLabel,
  busy,
  onSubmit,
  help,
  placeholder = "example.com/page",
  initial = "",
  children,
}: {
  label?: string;
  buttonLabel: string;
  busy?: boolean;
  onSubmit: (url: string) => void;
  help?: ReactNode;
  placeholder?: string;
  initial?: string;
  children?: ReactNode;
}) {
  const id = useId();
  const [url, setUrl] = useState(initial);
  const [err, setErr] = useState<string | null>(null);
  const { used } = useTool();
  return (
    <form
      className="grid gap-3"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const v = url.trim();
        if (!v) {
          setErr("Enter a web address, such as example.com.");
          return;
        }
        if (/\s/.test(v)) {
          setErr("A web address can't contain spaces.");
          return;
        }
        setErr(null);
        used("url");
        onSubmit(v);
      }}
    >
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="min-w-0">
          <label htmlFor={`${id}-u`} className="field-label">
            {label}
          </label>
          <input
            id={`${id}-u`}
            className="input"
            type="text"
            inputMode="url"
            autoComplete="url"
            autoCapitalize="off"
            spellCheck={false}
            placeholder={placeholder}
            value={url}
            aria-invalid={err ? true : undefined}
            aria-describedby={err ? `${id}-err` : help ? `${id}-help` : undefined}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <Button type="submit" variant="primary" size="md" busy={busy} disabled={busy} icon="search">
          {busy ? "Checking…" : buttonLabel}
        </Button>
      </div>
      {err && (
        <p id={`${id}-err`} className="flex gap-1.5 text-sm text-danger">
          <Icon name="circle-alert" size={16} className="mt-0.5 shrink-0" />
          {err}
        </p>
      )}
      {help && !err && (
        <p id={`${id}-help`} className="field-help mt-0">
          {help}
        </p>
      )}
      {children}
    </form>
  );
}

/* ---------- Status lines ---------- */
export function CheckedAt({ iso, children }: { iso: string; children?: ReactNode }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-3">
      <Icon name="server" size={14} />
      <span>Checked {formatCheckedAt(iso)} from our server.</span>
      {children}
    </p>
  );
}

export function ApiErrorAlert({ error, subject }: { error: ApiError; subject?: string }) {
  if (error.kind === "target")
    return (
      <Alert tone="warning" role="alert" title={`${subject ?? "The site"} didn't respond normally`}>
        <p>{error.message}</p>
        <p className="mt-1 text-ink-3">This is a result about the site, not a fault in our checker. Error code: {error.code}.</p>
      </Alert>
    );
  if (error.kind === "input")
    return (
      <Alert tone="danger" role="alert" title="Check the address">
        {error.message}
      </Alert>
    );
  if (error.kind === "rate")
    return (
      <Alert tone="warning" role="alert" title="Please wait a moment">
        {error.message}
      </Alert>
    );
  if (error.kind === "provider")
    return (
      <Alert tone="warning" role="alert" title="The external service couldn't complete the test">
        {error.message}
      </Alert>
    );
  return (
    <Alert tone="danger" role="alert" title="Our checker failed">
      <p>{error.message}</p>
      <p className="mt-1 text-ink-3">This says nothing about the site you entered. Try again in a minute; if it keeps happening, use “Report a problem” at the bottom of the page.</p>
    </Alert>
  );
}

/* ---------- Runner hook: busy state, errors, tracking and announcements in one place ---------- */
export function useRunner<T>() {
  const { announce, completed, error: track } = useTool();
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const seq = useRef(0);
  const run = async (fn: () => Promise<ApiResult<T>>, done?: (d: T) => string) => {
    const n = ++seq.current;
    setBusy(true);
    setError(null);
    announce("Checking…");
    try {
      const r = await fn();
      if (n !== seq.current) return null;
      if (r.ok) {
        setData(r.data);
        completed("check");
        announce(done ? done(r.data) : "Check complete.");
        return r.data;
      }
      setData(null);
      setError(r.error);
      track(r.error.code, "fetch");
      announce(r.error.message);
      return null;
    } finally {
      if (n === seq.current) setBusy(false);
    }
  };
  const reset = () => {
    seq.current++;
    setBusy(false);
    setData(null);
    setError(null);
  };
  return { busy, data, error, run, reset, setData, setError };
}

/* ---------- Check list ---------- */
const STATUS_META: Record<CheckStatus, { icon: "circle-check" | "triangle-alert" | "circle-alert" | "info"; cls: string; word: string }> = {
  pass: { icon: "circle-check", cls: "text-success", word: "Pass" },
  warn: { icon: "triangle-alert", cls: "text-warning", word: "Warning" },
  fail: { icon: "circle-alert", cls: "text-danger", word: "Problem" },
  info: { icon: "info", cls: "text-accent", word: "Note" },
};

export function StatusIcon({ status }: { status: CheckStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex shrink-0 items-center ${m.cls}`}>
      <Icon name={m.icon} size={18} />
      <span className="sr-only">{m.word}: </span>
    </span>
  );
}

export function CheckList({ checks, grouped = true }: { checks: Check[]; grouped?: boolean }) {
  const groups = grouped ? [...new Set(checks.map((c) => c.group))] : [""];
  return (
    <div className="grid gap-4">
      {groups.map((g) => (
        <div key={g || "all"} className="min-w-0">
          {g && <h3 className="mb-1.5 text-sm font-semibold text-ink-2">{g}</h3>}
          <ul className="divide-y divide-line rounded-md border border-line">
            {checks
              .filter((c) => !grouped || c.group === g)
              .map((c) => (
                <li key={c.id} className="flex gap-2.5 px-3 py-2.5">
                  <span className="mt-0.5">
                    <StatusIcon status={c.status} />
                  </span>
                  <div className="min-w-0 text-sm">
                    <p className="font-semibold text-ink">{c.label}</p>
                    {c.evidence && <p className="mt-0.5 break-words text-ink-2">{c.evidence}</p>}
                    {c.advice && <p className="mt-0.5 text-ink-3">{c.advice}</p>}
                  </div>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function StatusCode({ code }: { code: number }) {
  const cls = code >= 500 ? "border-danger-line bg-danger-subtle" : code >= 400 ? "border-danger-line bg-danger-subtle" : code >= 300 ? "border-warning-line bg-warning-subtle" : "border-success-line bg-success-subtle";
  return <span className={`inline-flex h-6 min-w-11 items-center justify-center rounded-sm border px-1.5 font-mono text-sm font-semibold text-ink tabular-nums ${cls}`}>{code}</span>;
}

/** Segmented-style tabs for "Check a URL" / "Paste HTML". */
export function ModeTabs<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o.value} type="button" className="chip" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Length meter ---------- */
export function LengthMeter({ label, chars, px, maxPx, verdict, hint }: { label: string; chars: number; px: number; maxPx: number; verdict: "empty" | "short" | "good" | "long"; hint?: string }) {
  const pct = Math.min(100, Math.round((px / maxPx) * 100));
  const tone = verdict === "long" ? "bg-danger" : verdict === "short" ? "bg-warning" : verdict === "good" ? "bg-success" : "bg-line-strong";
  const words = { empty: "Empty", short: "Short", good: "Fits", long: "Likely truncated" }[verdict];
  return (
    <div className="text-sm">
      <div className="flex flex-wrap justify-between gap-x-3 text-ink-3 tabular-nums">
        <span>
          {label}: {chars} characters · ~{px} of {maxPx} px
        </span>
        <span className={verdict === "long" ? "font-semibold text-danger" : verdict === "good" ? "text-success" : ""}>{words}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      {hint && <p className="mt-1 text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

/* ---------- SERP snippet ---------- */
export function breadcrumbFromUrl(url: string): { site: string; trail: string } {
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    const parts = u.pathname.split("/").filter(Boolean).map((p) => decodeURIComponent(p));
    return { site: u.hostname.replace(/^www\./, ""), trail: [u.origin.replace(/^https?:\/\//, "https://"), ...parts].join(" › ") };
  } catch {
    return { site: url || "example.com", trail: url || "https://example.com" };
  }
}

function highlight(text: string, kw: string): ReactNode {
  const k = kw.trim();
  if (!k) return text;
  const re = new RegExp(`(${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig");
  return text.split(re).map((part, i) => (i % 2 ? <b key={i}>{part}</b> : part));
}

export function SerpSnippet({
  title,
  description,
  url,
  siteName,
  date,
  device,
  keyword = "",
}: {
  title: string;
  description: string;
  url: string;
  siteName?: string;
  date?: string;
  device: "desktop" | "mobile";
  keyword?: string;
}) {
  const crumb = breadcrumbFromUrl(url);
  const t = device === "desktop" ? truncateToWidth(title || "Page title", SNIPPET.titleFontPx, SNIPPET.titleMaxPx).text : (title || "Page title").replace(/\s+/g, " ").trim();
  const descMax = device === "desktop" ? SNIPPET.descMaxDesktopPx : SNIPPET.descMaxMobilePx;
  const datePrefix = date ? `${date} — ` : "";
  const fullDesc = (description || "Google will pick text from the page when there's no meta description.").replace(/\s+/g, " ").trim();
  const d = truncateToWidth(datePrefix + fullDesc, SNIPPET.descFontPx, descMax).text.slice(datePrefix.length);
  return (
    <div className={`rounded-md border border-line bg-surface p-4 ${device === "mobile" ? "max-w-[24rem]" : ""}`} style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      <div className="flex items-center gap-2.5">
        <span className="inline-grid size-7 place-items-center rounded-full border border-line bg-surface-2 text-ink-3" aria-hidden="true">
          <Icon name="globe" size={14} />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm text-ink">{siteName || crumb.site}</p>
          <p className="truncate text-xs text-ink-3">{crumb.trail}</p>
        </div>
      </div>
      <p className={`mt-1.5 text-accent ${device === "desktop" ? "whitespace-nowrap" : "line-clamp-2"}`} style={{ fontSize: device === "desktop" ? 20 : 18, lineHeight: 1.3 }}>
        {t}
      </p>
      <p className="mt-1 text-ink-2" style={{ fontSize: 14, lineHeight: 1.58 }}>
        {date && <span className="text-ink-3">{date} — </span>}
        {highlight(d, keyword)}
      </p>
    </div>
  );
}

export { textWidth };
