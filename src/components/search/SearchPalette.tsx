"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/components/Icon";
import { SearchBox } from "./SearchBox";

/** Command palette: native modal <dialog> (focus trap, inert background, Esc). */
export default function SearchPalette({ onClose, trigger }: { onClose: () => void; trigger: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label="Search tools"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
      className="m-0 h-dvh max-h-dvh w-full max-w-none overflow-hidden bg-surface p-0 text-ink sm:mx-auto sm:mt-[12vh] sm:h-auto sm:max-h-[70vh] sm:w-[min(40rem,calc(100vw-2rem))] sm:rounded-xl sm:border sm:border-line sm:shadow-overlay"
    >
      <div className="relative">
        <SearchBox variant="palette" autoFocus trigger={trigger} onNavigate={() => ref.current?.close()} placeholder="Search tools…" />
        <button
          type="button"
          className="btn btn-ghost btn-sm absolute top-3 right-2 sm:hidden"
          onClick={() => ref.current?.close()}
        >
          Cancel
        </button>
      </div>
      <div className="hidden items-center gap-4 border-t border-line px-4 py-2 text-xs text-ink-3 pointer-fine:flex">
        <span>
          <kbd className="kbd">↑</kbd> <kbd className="kbd">↓</kbd> navigate
        </span>
        <span>
          <kbd className="kbd">↵</kbd> open
        </span>
        <span>
          <kbd className="kbd">Esc</kbd> close
        </span>
        <span className="ml-auto inline-flex items-center gap-1">
          <Icon name="search" size={14} /> Searches tool names, tasks and file formats
        </span>
      </div>
    </dialog>
  );
}
