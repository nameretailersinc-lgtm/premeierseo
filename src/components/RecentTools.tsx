"use client";

import Link from "next/link";
import { Icon } from "./Icon";
import { useEffect, useState } from "react";
import { clearRecent, getRecent, track } from "@/lib/analytics";
import { loadIndex } from "./search/load-index";

/** "Continue where you left off" — only for returning visitors; ids from localStorage only. */
export function RecentTools() {
  const [items, setItems] = useState<{ id: string; name: string; path: string }[]>([]);
  useEffect(() => {
    const ids = getRecent();
    if (!ids.length) return;
    loadIndex()
      .then((idx) =>
        setItems(
          ids
            .map((id) => idx.tools.find((t) => t.id === id))
            .filter(Boolean)
            .slice(0, 6)
            .map((t) => ({ id: t!.id, name: t!.name, path: t!.path })),
        ),
      )
      .catch(() => {});
  }, []);
  if (!items.length) return null;
  return (
    <section aria-labelledby="recent" className="card mt-8 flex flex-wrap items-center gap-x-4 gap-y-3 p-4 sm:px-5">
      <div className="flex items-baseline gap-3">
        <h2 id="recent" className="inline-flex items-center gap-2 text-sm font-bold text-ink">
          <Icon name="clock" size={16} className="text-accent" />
          Continue where you left off
        </h2>
        <button
          type="button"
          className="text-sm text-accent underline"
          onClick={() => {
            clearRecent();
            setItems([]);
          }}
        >
          Clear
        </button>
      </div>
      <ul className="flex flex-wrap gap-2">
        {items.map((t, i) => (
          <li key={t.id}>
            <Link href={t.path} className="chip" onClick={() => track("recent_tool_clicked", { surface: "home", position: i + 1 })}>
              {t.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
