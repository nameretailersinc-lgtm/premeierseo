"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/Icon";
import type { IconName } from "@/lib/types";
import { useTool } from "./ToolContext";

/* ---------- Panel ---------- */
export function Panel({
  title,
  titleId,
  icon,
  tone = "plain",
  actions,
  children,
  footer,
  className = "",
  as = "section",
}: {
  title?: ReactNode;
  titleId?: string;
  /** Small glyph before the title; helps scanning when several panels sit side by side. */
  icon?: IconName;
  /** "accent" tints the header — use it for the panel that holds the result. */
  tone?: "plain" | "accent";
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  as?: "section" | "div";
}) {
  const Tag = as;
  return (
    <Tag
      className={`panel min-w-0 ${tone === "accent" ? "panel-accent" : ""} ${className}`}
      aria-labelledby={title && titleId ? titleId : undefined}
    >
      {(title || actions) && (
        <div className="panel-header">
          {title ? (
            <div id={titleId} tabIndex={-1} className="panel-title">
              {icon && <Icon name={icon} size={15} className={tone === "accent" ? "text-accent" : "text-ink-3"} />}
              {title}
            </div>
          ) : (
            <span />
          )}
          {actions && <div className="flex flex-wrap items-center gap-1.5">{actions}</div>}
        </div>
      )}
      {children}
      {footer && <div className="panel-footer">{footer}</div>}
    </Tag>
  );
}

/* ---------- Buttons ---------- */
export function Button({
  children,
  variant = "secondary",
  size = "sm",
  icon,
  className = "",
  busy,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  icon?: IconName;
  busy?: boolean;
}) {
  const sz = size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : "";
  return (
    <button type="button" className={`btn btn-${variant} ${sz} ${className}`} {...rest}>
      {busy ? (
        <Icon name="loader" size={size === "sm" ? 16 : 20} className="animate-spin" />
      ) : icon ? (
        <Icon name={icon} size={size === "sm" ? 16 : 20} />
      ) : null}
      {children}
    </button>
  );
}

/* ---------- Copy ---------- */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export function CopyButton({
  text,
  label = "Copy",
  disabled,
  variant = "secondary",
  size = "sm",
}: {
  text: string | (() => string);
  label?: string;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
}) {
  const { completed, announce } = useTool();
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 2000);
    return () => clearTimeout(t);
  }, [done]);
  return (
    <Button
      variant={variant}
      size={size}
      icon={done ? "check" : "copy"}
      disabled={disabled}
      className="min-w-24"
      onClick={async () => {
        const value = typeof text === "function" ? text() : text;
        const ok = await copyText(value);
        if (ok) {
          setDone(true);
          announce("Copied to clipboard");
          completed("copy");
        } else announce("Copy failed. Select the text and press Ctrl+C.");
      }}
    >
      {done ? "Copied" : label}
    </Button>
  );
}

/* ---------- Download ---------- */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function DownloadButton({
  data,
  filename,
  mime = "text/plain;charset=utf-8",
  label = "Download",
  disabled,
  variant = "secondary",
  size = "sm",
}: {
  data: string | Blob | (() => string | Blob | Promise<Blob>);
  filename: string | (() => string);
  mime?: string;
  label?: string;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}) {
  const { completed } = useTool();
  return (
    <Button
      variant={variant}
      size={size}
      icon="download"
      disabled={disabled}
      onClick={async () => {
        const d = typeof data === "function" ? await data() : data;
        const blob = d instanceof Blob ? d : new Blob([d], { type: mime });
        downloadBlob(blob, typeof filename === "function" ? filename() : filename);
        completed("download");
      }}
    >
      {label}
    </Button>
  );
}

export function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

/* ---------- Alerts ---------- */
export function Alert({
  tone = "info",
  children,
  title,
  role,
}: {
  tone?: "info" | "success" | "warning" | "danger";
  children: ReactNode;
  title?: string;
  role?: "alert" | "status";
}) {
  const styles = {
    info: "border-accent-line bg-accent-subtle text-ink",
    success: "border-success-line bg-success-subtle text-ink",
    warning: "border-warning-line bg-warning-subtle text-ink",
    danger: "border-danger-line bg-danger-subtle text-ink",
  }[tone];
  const icon: IconName = { info: "info", success: "circle-check", warning: "triangle-alert", danger: "circle-alert" }[tone] as IconName;
  const iconColor = { info: "text-accent", success: "text-success", warning: "text-warning", danger: "text-danger" }[tone];
  return (
    <div role={role} className={`flex gap-3 rounded-lg border px-3.5 py-3 text-sm leading-6 ${styles}`}>
      <Icon name={icon} size={18} className={`mt-0.5 shrink-0 ${iconColor}`} />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        <div className="[&_a]:text-accent [&_a]:underline">{children}</div>
      </div>
    </div>
  );
}

/* ---------- Empty state ---------- */

/** Placeholder for a results area that has nothing in it yet, so reserved space reads as intentional. */
export function EmptyState({ icon = "sparkles", title, children }: { icon?: IconName; title: string; children?: ReactNode }) {
  return (
    <div className="grid place-items-center gap-2 rounded-xl border border-dashed border-line px-5 py-8 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-surface-2 text-ink-3">
        <Icon name={icon} size={19} />
      </span>
      <p className="text-sm font-semibold text-ink-2">{title}</p>
      {children && <p className="max-w-sm text-sm text-ink-3">{children}</p>}
    </div>
  );
}

/* ---------- Fields ---------- */
export function Field({
  label,
  help,
  error,
  children,
  htmlFor,
  className = "",
}: {
  label: ReactNode;
  help?: ReactNode;
  error?: string | null;
  children: ReactNode;
  htmlFor: string;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={htmlFor} className="field-label">
        {label}
      </label>
      {children}
      {help && !error && (
        <p id={`${htmlFor}-help`} className="field-help">
          {help}
        </p>
      )}
      {error && (
        <p id={`${htmlFor}-err`} className="mt-1.5 flex gap-1.5 text-sm text-danger">
          <Icon name="circle-alert" size={16} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  help,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  help?: ReactNode;
}) {
  return (
    <label className="inline-flex cursor-pointer items-start gap-2 py-1.5 text-base">
      <input type="checkbox" className="mt-1 size-[1.125rem] shrink-0" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        {label}
        {help && <span className="block text-sm text-ink-3">{help}</span>}
      </span>
    </label>
  );
}

/** Segmented control (radio group). Falls back to wrap on narrow screens. */
export function Segmented<T extends string>({
  legend,
  value,
  onChange,
  options,
  hideLegend,
}: {
  legend: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  hideLegend?: boolean;
}) {
  const name = useId();
  return (
    <fieldset className="min-w-0">
      <legend className={hideLegend ? "sr-only" : "field-label"}>{legend}</legend>
      <div className="inline-flex max-w-full flex-wrap gap-0.5 rounded-md border border-line-strong bg-surface p-0.5">
        {options.map((o) => (
          <label
            key={o.value}
            className="relative inline-flex h-9 cursor-pointer items-center rounded-sm px-3 text-sm font-semibold text-ink-2 hover:text-ink has-[:checked]:bg-accent has-[:checked]:text-on-accent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-focus"
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function StatTile({
  label,
  value,
  sub,
  emphasis,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  /** Headline metric: tinted so the number people came for stands out from the rest. */
  emphasis?: boolean;
}) {
  return (
    <div className={`stat ${emphasis ? "border-accent-line bg-accent-subtle" : ""}`}>
      <span className={`stat-value truncate ${emphasis ? "text-accent" : ""}`}>{value}</span>
      <span className="stat-label truncate">{label}</span>
      {sub && <span className="mt-0.5 block truncate text-xs text-ink-3">{sub}</span>}
    </div>
  );
}

/* ---------- Hooks ---------- */
export function useDebounced<T>(value: T, ms = 150): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Remembers non-sensitive options per tool in localStorage (pss:opt:{toolId}:v1). */
export function usePersistentOptions<T extends Record<string, unknown>>(toolId: string, defaults: T) {
  const key = `pss:opt:${toolId}:v1`;
  const [opts, setOpts] = useState<T>(defaults);
  const loaded = useRef(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate saved options after mount (SSR renders defaults)
      if (raw) setOpts({ ...defaults, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
    loaded.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(key, JSON.stringify(opts));
    } catch {
      /* ignore */
    }
  }, [key, opts]);
  const reset = () => setOpts(defaults);
  return [opts, setOpts, reset] as const;
}

/** sessionStorage-backed text input so an accidental reload or Back does not lose work. */
export function useSessionText(toolId: string, initial = "", enabled = true) {
  const key = `pss:input:${toolId}`;
  const [text, setText] = useState(initial);
  useEffect(() => {
    if (!enabled) return;
    try {
      const v = sessionStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore after mount
      if (v) setText(v);
    } catch {
      /* ignore */
    }
  }, [key, enabled]);
  useEffect(() => {
    if (!enabled) return;
    try {
      if (text.length < 500_000) sessionStorage.setItem(key, text);
    } catch {
      /* ignore */
    }
  }, [key, text, enabled]);
  return [text, setText] as const;
}

export function formatBytes(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n < 1000) return `${n} B`;
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)} KB`;
  return `${(n / 1_000_000).toFixed(2)} MB`;
}

export function formatNumber(n: number, digits = 0): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: digits });
}
