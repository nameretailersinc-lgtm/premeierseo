import type { GuideDef } from "@/lib/types";
import { getTool } from "@/content/tools";

/** Wave-1 publish date. Change `dateModified` per guide when its content changes meaningfully. */
export const WAVE1_DATE = "2026-10-06";

function liveTool(id: string) {
  const t = getTool(id);
  return t && t.indexable ? t : undefined;
}

/**
 * Markdown link to a tool page if the tool is in the registry and indexable; otherwise the plain anchor text.
 * Lets a guide mention a planned tool (e.g. the redirect checker) without ever linking to a missing page:
 * the link appears automatically once the tool ships.
 */
export function toolLink(id: string, anchor: string): string {
  const t = liveTool(id);
  return t ? `[${anchor}](${t.path})` : anchor;
}

/** Words in a markdown string, ignoring link targets, table rules and markup characters. */
function countWords(md: string): number {
  const text = md
    .replace(/\]\([^)]*\)/g, "]")
    .replace(/^\s*\|?[\s:|-]+\|?\s*$/gm, " ")
    .replace(/[*`#>|[\]]/g, " ");
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

export function guideWordCount(g: Pick<GuideDef, "summary" | "body">): number {
  return countWords(g.summary) + g.body.reduce((n, s) => n + countWords(s.heading) + countWords(s.body), 0);
}

type GuideInput = Omit<GuideDef, "path" | "datePublished" | "dateModified" | "readingMinutes"> & {
  datePublished?: string;
  dateModified?: string;
};

/**
 * Fills the derived fields: path from the slug, wave-1 dates, readingMinutes (words ÷ 238, the average
 * adult silent reading rate for non-fiction in Brysbaert 2019, rounded up) and `tools` filtered to tools
 * that are live, so the "Tools used in this guide" card never lists a missing page.
 */
export function defineGuide(g: GuideInput): GuideDef {
  const words = guideWordCount(g);
  return {
    ...g,
    path: `/blog/${g.slug}/`,
    datePublished: g.datePublished ?? WAVE1_DATE,
    dateModified: g.dateModified ?? WAVE1_DATE,
    tools: g.tools.filter((id) => liveTool(id)),
    readingMinutes: Math.ceil(words / 238),
  };
}
