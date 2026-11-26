"use client";

import type { ReactNode } from "react";
import { track } from "@/lib/analytics";

/**
 * Records clicks on server-rendered related-tool links. Only tool ids and the list position are
 * sent: links opt in with data-related="<tool id>" and data-position="<1-based index>".
 */
export function RelatedTracker({ toolId, children }: { toolId: string; children: ReactNode }) {
  return (
    <div
      className="contents"
      onClick={(e) => {
        const link = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[data-related]");
        if (link) track("related_tool_click", { tool_id: toolId, to: link.dataset.related, position: Number(link.dataset.position) });
      }}
    >
      {children}
    </div>
  );
}
