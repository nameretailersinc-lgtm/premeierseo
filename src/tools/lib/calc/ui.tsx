"use client";

/* Small shared pieces for the calculator widgets (inputs, formula box, currency picker). */
import { useEffect, useState, type ReactNode } from "react";
import { CURRENCIES, currencyForLocale, parseNum } from "./money";

/** Text input for numbers: accepts commas/spaces, flags invalid entries without blocking typing. */
export function NumInput({
  id,
  value,
  onChange,
  suffix,
  prefix,
  placeholder,
  allowNegative,
  describedBy,
  className = "",
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  prefix?: string;
  placeholder?: string;
  allowNegative?: boolean;
  describedBy?: string;
  className?: string;
}) {
  const n = parseNum(value);
  const invalid = value.trim() !== "" && (!Number.isFinite(n) || (!allowNegative && n < 0));
  return (
    <div className={`relative flex items-center ${className}`}>
      {prefix && <span className="pointer-events-none absolute left-3 text-ink-3">{prefix}</span>}
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        className={`input tabular-nums ${prefix ? "pl-9" : ""} ${suffix ? "pr-14" : ""}`}
        value={value}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(e) => onChange(e.target.value)}
      />
      {suffix && <span className="pointer-events-none absolute right-3 text-sm text-ink-3">{suffix}</span>}
    </div>
  );
}

/** "Formula" box shown under every result: the general formula, then the numbers plugged in. */
export function Formula({ lines, title = "Formula" }: { lines: (string | null | false | undefined)[]; title?: string }) {
  const shown = lines.filter(Boolean) as string[];
  if (!shown.length) return null;
  return (
    <div className="rounded-md border border-line bg-surface-2 p-3">
      <p className="text-xs font-semibold tracking-wide text-ink-3 uppercase">{title}</p>
      <div className="mt-1 grid gap-1 font-mono text-sm break-words text-ink-2">
        {shown.map((l, i) => (
          <p key={i}>{l}</p>
        ))}
      </div>
    </div>
  );
}

/** Large primary result with a label. Shows "—" until inputs are valid. */
export function BigResult({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-sm text-ink-3">{label}</p>
      <p className="text-3xl font-semibold break-words text-ink tabular-nums sm:text-4xl">{value}</p>
      {sub && <div className="mt-1 text-sm text-ink-2">{sub}</div>}
    </div>
  );
}

/** Two-column definition rows for secondary results. */
export function ResultRows({ rows }: { rows: [ReactNode, ReactNode][] }) {
  return (
    <dl className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[auto_1fr]">
      {rows.map(([k, v], i) => (
        <div key={i} className="contents">
          <dt className="text-ink-3">{k}</dt>
          <dd className="font-semibold text-ink tabular-nums sm:text-right">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Browser locale (resolved after mount so the server render stays stable). */
export function useLocale(): string | undefined {
  const [loc, setLoc] = useState<string | undefined>(undefined);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the browser locale after hydration
    setLoc(navigator.language);
  }, []);
  return loc;
}

/** Currency picker; `value` "" means "from my browser's region". */
export function CurrencySelect({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  const loc = useLocale();
  const auto = currencyForLocale(loc);
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="field-label">
        Currency
      </label>
      <select id={id} className="select" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Auto ({auto})</option>
        {CURRENCIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}

export function useCurrencyCode(choice: string): string {
  const loc = useLocale();
  return choice || currencyForLocale(loc);
}

/** Announce a result politely once it has been stable for a moment, and record a completed view. */
export function useAnnounceResult(summary: string | null, announce: (m: string) => void, completed: (a: string) => void) {
  useEffect(() => {
    if (!summary) return;
    const t = setTimeout(() => {
      announce(summary);
      completed("view");
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary]);
}
