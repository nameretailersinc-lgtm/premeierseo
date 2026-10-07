"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { bucket, clearRecent, getRecent, track } from "@/lib/analytics";
import { highlight, search, type Hit, type SearchIndex } from "@/lib/search";
import { loadIndex } from "./load-index";

export { loadIndex };

export const COMMON_TASKS: { path: string; name: string }[] = [
  { path: "/word-counter/", name: "Word counter" },
  { path: "/reduce-image-size-in-kb/", name: "Reduce image size in KB" },
  { path: "/merge-pdf/", name: "Merge PDF" },
  { path: "/compress-pdf/", name: "Compress PDF" },
  { path: "/json-viewer/", name: "JSON viewer" },
  { path: "/redirect-checker/", name: "Redirect checker" },
  { path: "/qr-code-generator/", name: "QR code generator" },
  { path: "/password-generator/", name: "Password generator" },
];

export function SearchBox({
  variant = "hero",
  autoFocus = false,
  initialQuery = "",
  onNavigate,
  placeholder = 'Search tools — e.g. "compress pdf" or "word count"',
  trigger = "hero",
}: {
  variant?: "hero" | "palette";
  autoFocus?: boolean;
  initialQuery?: string;
  onNavigate?: () => void;
  placeholder?: string;
  trigger?: string;
}) {
  const router = useRouter();
  const id = useId();
  const listId = `${id}-list`;
  const [q, setQ] = useState(initialQuery);
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(variant === "palette");
  const [active, setActive] = useState(-1);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [liveMsg, setLiveMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const opened = useRef(false);

  const ensure = () => {
    if (!opened.current) {
      opened.current = true;
      track("search_opened", { trigger });
    }
    setRecentIds(getRecent());
    loadIndex()
      .then(setIndex)
      .catch(() => setFailed(true));
  };

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
      ensure();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus]);

  useEffect(() => {
    if (initialQuery) ensure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const hits: Hit[] = useMemo(() => (index && q.trim() ? search(index, q, recentIds) : []), [index, q, recentIds]);
  const selectable = hits.filter((h) => h.kind !== "notice") as Exclude<Hit, { kind: "notice" }>[];

  const emptyItems = useMemo(() => {
    if (!index) return COMMON_TASKS.map((t) => ({ ...t, group: "Common tasks" }));
    const recent = recentIds
      .map((rid) => index.tools.find((t) => t.id === rid))
      .filter(Boolean)
      .slice(0, 5)
      .map((t) => ({ path: t!.path, name: t!.name, group: "Recently used" }));
    return [...recent, ...COMMON_TASKS.filter((c) => !recent.some((r) => r.path === c.path)).map((t) => ({ ...t, group: "Common tasks" }))];
  }, [index, recentIds]);

  const showEmpty = open && !q.trim();
  const items = showEmpty ? emptyItems.map((e) => ({ path: e.path })) : selectable.map((h) => ({ path: h.entry.path }));

  useEffect(() => {
    if (!q.trim()) return;
    const t = setTimeout(() => {
      const n = selectable.length;
      setLiveMsg(n ? `${n} result${n === 1 ? "" : "s"}` : "No results");
      if (index && !n) track("search_no_results", { query_normalized: q.length <= 50 ? q.toLowerCase().replace(/\S+@\S+|https?:\S+|\d{5,}/g, "") : "[redacted]" });
      if (index) track("search_used", { query_length: bucket(q.length, [5, 15, 30], ["1-4", "5-14", "15-29", "30+"]), results_count: n });
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, index]);

  const go = (path: string, position: number, newTab = false) => {
    track("search_result_clicked", { position: position + 1 });
    if (newTab) window.open(path, "_blank", "noopener");
    else {
      router.push(path);
      onNavigate?.();
      setOpen(false);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (items.length ? (a + 1) % items.length : -1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (items.length ? (a - 1 + items.length) % items.length : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = items[active >= 0 ? active : 0];
      if (target) go(target.path, active >= 0 ? active : 0, e.ctrlKey || e.metaKey);
      else if (q.trim() && failed) router.push(`/tools/?q=${encodeURIComponent(q)}`);
    } else if (e.key === "Escape") {
      if (variant === "palette") return; // dialog handles Esc
      if (open && q) setOpen(false);
      else setQ("");
    } else if (e.key === "Tab") setOpen(false);
  };

  const hero = variant === "hero";
  const activeId = active >= 0 ? `${id}-opt-${active}` : undefined;

  return (
    <div className="relative" role="search">
      <form
        action="/tools/"
        method="get"
        onSubmit={(e) => {
          if (index) e.preventDefault();
        }}
      >
        <label htmlFor={`${id}-q`} className="sr-only">
          Search tools
        </label>
        <div className="relative">
          <Icon
            name="search"
            size={20}
            className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-ink-3 ${hero ? "left-4" : "left-4"}`}
          />
          <input
            ref={inputRef}
            id={`${id}-q`}
            name="q"
            type="search"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open && (showEmpty || q.trim().length > 0)}
            aria-controls={listId}
            aria-activedescendant={activeId}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            placeholder={placeholder}
            value={q}
            onFocus={() => {
              ensure();
              setOpen(true);
            }}
            onPointerEnter={() => loadIndex().then(setIndex).catch(() => {})}
            onBlur={() => {
              if (variant === "hero") setTimeout(() => setOpen(false), 150);
            }}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(-1);
              setOpen(true);
            }}
            onKeyDown={onKey}
            className={
              hero
                ? "h-14 w-full rounded-xl border border-line bg-surface pr-28 pl-12 text-base text-ink placeholder:text-ink-3 focus:border-accent focus:shadow-[0_0_0_4px_var(--accent-subtle)] focus-visible:outline-offset-0 sm:h-16 sm:pr-32 sm:text-[1.0625rem] [&::-webkit-search-cancel-button]:hidden"
                : "h-14 w-full border-0 border-b border-line bg-surface pr-4 pl-12 text-lg text-ink placeholder:text-ink-3 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            }
          />
          {hero && (
            <button type="submit" className="btn btn-primary absolute top-2 right-2 bottom-2 h-auto rounded-lg px-5 text-[0.9375rem] sm:px-7">
              Search
            </button>
          )}
        </div>
      </form>

      <div
        className={
          hero
            ? `absolute inset-x-0 top-full z-50 mt-2 max-h-[min(28rem,70vh)] overflow-auto rounded-xl border border-line bg-surface py-1.5 shadow-overlay ${
                open && (showEmpty || q.trim()) ? "" : "hidden"
              }`
            : "max-h-[60vh] overflow-auto py-1"
        }
      >
        <ul id={listId} role="listbox" aria-label="Tool suggestions">
          {showEmpty &&
            emptyItems.map((it, i) => (
              <li
                key={it.path + it.group}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={active === i}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(it.path, i)}
                className={`flex min-h-12 cursor-pointer items-center gap-3 px-4 py-2 ${active === i ? "bg-accent-subtle" : "hover:bg-surface-2"}`}
              >
                <Icon name={it.group === "Recently used" ? "clock" : "arrow-right"} size={16} className="text-ink-3" />
                <span className="flex-1 font-semibold text-ink">{it.name}</span>
                <span className="text-sm text-ink-3">{it.group}</span>
              </li>
            ))}
          {!showEmpty &&
            (() => {
              let n = -1;
              return hits.map((h, i) => {
                if (h.kind === "notice")
                  return (
                    <li key={`n${i}`} role="presentation" className="px-4 py-2 text-sm text-warning">
                      {h.text}
                    </li>
                  );
                n++;
                const idx = n;
                const isCat = h.kind === "category";
                const name = isCat ? `${h.entry.label}` : h.entry.name;
                const meta = isCat ? `Category · ${h.entry.count} tools` : h.entry.categoryLabel;
                const sub = isCat ? "" : h.entry.short;
                return (
                  <li
                    key={h.entry.path}
                    id={`${id}-opt-${idx}`}
                    role="option"
                    aria-selected={active === idx}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => go(h.entry.path, idx)}
                    className={`cursor-pointer px-4 py-2.5 ${active === idx ? "bg-accent-subtle" : "hover:bg-surface-2"}`}
                  >
                    <span className="block font-semibold text-ink">
                      {highlight(name, q).map((s, k) => (s.mark ? <mark key={k}>{s.text}</mark> : <span key={k}>{s.text}</span>))}
                    </span>
                    <span className="block truncate text-sm text-ink-3">
                      {meta}
                      {sub && ` · ${sub}`}
                    </span>
                  </li>
                );
              });
            })()}
        </ul>
        {!showEmpty && q.trim() && index && selectable.length === 0 && (
          <div className="px-4 py-3 text-sm text-ink-2">
            <p className="font-semibold text-ink">No tools match “{q}”.</p>
            <p className="mt-1">
              Try fewer words, <Link className="text-accent underline" href="/tools/">browse all tools</Link>, or{" "}
              <Link className="text-accent underline" href="/contact/?topic=tool-request">
                suggest a tool
              </Link>
              .
            </p>
          </div>
        )}
        {!index && !failed && q.trim() && <p className="px-4 py-3 text-sm text-ink-3">Loading…</p>}
        {failed && (
          <p className="px-4 py-3 text-sm text-ink-2">
            Search is unavailable right now. Press Enter to search the <Link className="text-accent underline" href="/tools/">all tools</Link> page.
          </p>
        )}
        {showEmpty && recentIds.length > 0 && (
          <button
            type="button"
            className="mx-4 my-1 text-sm text-accent underline"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              clearRecent();
              setRecentIds([]);
            }}
          >
            Clear recently used
          </button>
        )}
      </div>
      <div role="status" aria-live="polite" className="sr-only">
        {liveMsg}
      </div>
    </div>
  );
}
