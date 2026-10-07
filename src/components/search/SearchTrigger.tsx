"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { loadIndex } from "./load-index";

const SearchPalette = dynamic(() => import("./SearchPalette"), { ssr: false });

function isTyping(el: Element | null) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (el as HTMLElement).isContentEditable;
}

export function SearchTrigger() {
  const [open, setOpen] = useState(false);
  const [apple, setApple] = useState(false);
  const [how, setHow] = useState("click");
  const returnFocus = useRef<HTMLElement | null>(null);

  const show = useCallback((trigger: string) => {
    returnFocus.current = document.activeElement as HTMLElement;
    setHow(trigger);
    setOpen(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- platform detection needs the browser
    setApple(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        show("shortcut_cmdk");
      } else if (e.key === "/" && !isTyping(document.activeElement) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        show("shortcut_slash");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show]);

  const prefetch = () => {
    void import("./SearchPalette");
    loadIndex().catch(() => {});
  };

  return (
    <>
      <button
        type="button"
        onClick={() => show("click")}
        onPointerEnter={prefetch}
        onFocus={prefetch}
        aria-label="Search tools"
        aria-haspopup="dialog"
        className="inline-flex size-11 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink md:h-10 md:w-52 md:justify-between md:gap-2 md:border md:border-line md:bg-surface-2 md:pr-2 md:pl-3.5 md:text-sm md:text-ink-3 md:hover:border-accent-line md:hover:bg-surface xl:w-60 2xl:w-72"
      >
        <span className="inline-flex items-center gap-2">
          <Icon name="search" size={18} />
          <span className="hidden truncate md:inline">Search tools…</span>
        </span>
        <kbd className="kbd hidden min-w-11 bg-surface pointer-fine:md:inline-flex">{apple ? "⌘ K" : "Ctrl K"}</kbd>
      </button>
      {open && (
        <SearchPalette
          trigger={how}
          onClose={() => {
            setOpen(false);
            returnFocus.current?.focus();
          }}
        />
      )}
    </>
  );
}
