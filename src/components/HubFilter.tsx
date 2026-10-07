"use client";

import { useEffect, useId, useState } from "react";
import { Icon } from "./Icon";
import { track } from "@/lib/analytics";

/**
 * Progressive filter for server-rendered tool grids. Without JS every tool stays visible and the
 * group chips are plain jump links. With JS, typing filters by token prefix over name, card text
 * and aliases, and a chip narrows the page to one group.
 */
export function HubFilter({
  items,
  label,
  groups,
  noun = "tools in this category",
  initialFromQuery = false,
}: {
  items: { id: string; text: string }[];
  label: string;
  groups?: { id: string; heading: string; anchor: string }[];
  noun?: string;
  initialFromQuery?: boolean;
}) {
  const id = useId();
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string | null>(null);
  const [count, setCount] = useState(items.length);

  useEffect(() => {
    if (!initialFromQuery) return;
    const p = new URLSearchParams(window.location.search).get("q");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read ?q= after mount on a static page
    if (p) setQ(p);
  }, [initialFromQuery]);

  useEffect(() => {
    const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
    const map = new Map(items.map((i) => [i.id, i.text.toLowerCase()]));
    document.querySelectorAll<HTMLElement>("[data-tool-id]").forEach((el) => {
      const text = map.get(el.dataset.toolId!) ?? "";
      const words = text.split(/[^a-z0-9]+/);
      el.hidden = !tokens.every((t) => words.some((w) => w.startsWith(t)) || text.includes(t));
    });
    let shown = 0;
    document.querySelectorAll<HTMLElement>("[data-hub-group]").forEach((g) => {
      const key = g.dataset.hubGroup;
      const visible = g.querySelectorAll("[data-tool-id]:not([hidden])").length;
      g.hidden = !visible || (group !== null && key !== group);
      if (!g.hidden) shown += visible;
    });
    const empty = document.getElementById("hub-filter-empty");
    if (empty) empty.hidden = shown > 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync visible count
    setCount(shown);
    if (q) {
      const t = setTimeout(() => track("filter_used", { results_count: shown }), 800);
      return () => clearTimeout(t);
    }
  }, [q, group, items]);

  const filtered = q !== "" || group !== null;

  return (
    <div className="mt-8">
      <div className="card flex items-center gap-2 py-1.5 pr-1.5 pl-4 transition-shadow focus-within:border-accent focus-within:shadow-[0_0_0_4px_var(--accent-subtle)]">
        <Icon name="search" size={18} className="shrink-0 text-ink-3" />
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
        <input
          id={id}
          type="search"
          className="h-11 min-w-0 flex-1 bg-transparent text-[0.9375rem] text-ink outline-none placeholder:text-ink-3"
          placeholder="Type to filter tools, e.g. “compress”"
          value={q}
          autoComplete="off"
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="hidden shrink-0 rounded-full border border-line bg-surface-2 px-3 py-1 text-xs font-medium text-ink-2 tabular-nums sm:inline">
          {filtered ? `${count} of ${items.length} shown` : `${items.length} ${noun}`}
        </span>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {filtered ? `${count} tools shown` : ""}
      </p>

      {groups && groups.length > 1 && (
        <nav aria-label="Sections" className="-mx-4 mt-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
          <ul className="flex w-max gap-2 pb-1 sm:w-auto sm:flex-wrap">
            <li>
              <a
                href="#tools"
                className="chip whitespace-nowrap"
                aria-current={group === null ? "true" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  setGroup(null);
                }}
              >
                All
              </a>
            </li>
            {groups.map((g) => (
              <li key={g.id}>
                <a
                  href={`#${g.anchor}`}
                  className="chip whitespace-nowrap"
                  aria-current={group === g.id ? "true" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    setGroup(group === g.id ? null : g.id);
                  }}
                >
                  {g.heading}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
