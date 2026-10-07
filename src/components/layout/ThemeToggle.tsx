"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";

type Theme = "system" | "light" | "dark";
const ORDER: Theme[] = ["system", "light", "dark"];

function apply(t: Theme) {
  const el = document.documentElement;
  if (t === "system") el.removeAttribute("data-theme");
  else el.setAttribute("data-theme", t);
  try {
    if (t === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", t);
  } catch {
    /* ignore */
  }
}

function useTheme() {
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => {
    try {
      const t = localStorage.getItem("theme");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read persisted preference after mount
      if (t === "light" || t === "dark") setTheme(t);
    } catch {
      /* ignore */
    }
  }, []);
  const set = (t: Theme) => {
    setTheme(t);
    apply(t);
  };
  return [theme, set] as const;
}

/** Icon button cycling System → Light → Dark (header, desktop). */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, set] = useTheme();
  const icon = theme === "light" ? "sun" : theme === "dark" ? "moon" : "monitor";
  return (
    <button
      type="button"
      className={`btn btn-ghost btn-icon rounded-full text-ink-2 hover:text-ink ${className}`}
      aria-label={`Theme: ${theme}. Change theme`}
      onClick={() => set(ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length])}
    >
      <Icon name={icon} size={20} />
    </button>
  );
}

/** Radio group used in the footer and mobile menu. */
export function ThemeRadios() {
  const [theme, set] = useTheme();
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-ink">Theme</legend>
      <div className="inline-flex gap-0.5 rounded-full border border-line bg-surface p-1">
        {ORDER.map((t) => (
          <label
            key={t}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold text-ink-2 capitalize has-[:checked]:bg-accent has-[:checked]:text-on-accent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus"
          >
            <input type="radio" name="theme" className="sr-only" checked={theme === t} onChange={() => set(t)} />
            <Icon name={t === "light" ? "sun" : t === "dark" ? "moon" : "monitor"} size={16} />
            {t}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
