"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { pushRecent, track } from "@/lib/analytics";

interface ToolCtx {
  toolId: string;
  /** Call on the first meaningful interaction (typing, paste, file chosen, example loaded). */
  used: (inputMethod?: string) => void;
  /** Call when the user acts on a result (copy, download) or a result has been produced for view-only tools. */
  completed: (action: string, extra?: Record<string, string | number | boolean>) => void;
  error: (code: string, stage?: string) => void;
  /** Polite screen-reader announcement. */
  announce: (msg: string) => void;
}

const Ctx = createContext<ToolCtx | null>(null);

export function ToolProvider({ toolId, children }: { toolId: string; children: ReactNode }) {
  const usedOnce = useRef(false);
  const [message, setMessage] = useState("");
  const used = useCallback(
    (inputMethod?: string) => {
      if (usedOnce.current) return;
      usedOnce.current = true;
      pushRecent(toolId);
      track("tool_used", { tool_id: toolId, input_method: inputMethod });
    },
    [toolId],
  );
  const completed = useCallback(
    (action: string, extra?: Record<string, string | number | boolean>) =>
      track("tool_completed", { tool_id: toolId, action, ...extra }),
    [toolId],
  );
  const error = useCallback(
    (code: string, stage?: string) => track("tool_error", { tool_id: toolId, error_code: code, stage }),
    [toolId],
  );
  const announce = useCallback((msg: string) => {
    setMessage("");
    // Re-set on the next frame so repeated identical messages are still announced.
    requestAnimationFrame(() => setMessage(msg));
  }, []);
  const value = useMemo(() => ({ toolId, used, completed, error, announce }), [toolId, used, completed, error, announce]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <div role="status" aria-live="polite" className="sr-only">
        {message}
      </div>
    </Ctx.Provider>
  );
}

export function useTool(): ToolCtx {
  const c = useContext(Ctx);
  if (!c) {
    return {
      toolId: "unknown",
      used: () => {},
      completed: () => {},
      error: () => {},
      announce: () => {},
    };
  }
  return c;
}
