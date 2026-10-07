import type { CategoryId, ToolDef } from "@/lib/types";
import { TEXT_TOOLS } from "./text";
import { WRITING_TOOLS } from "./text-writing";
import { BINARY_TOOLS } from "./binary";
import { SEO_TOOLS } from "./seo";
import { IMAGE_TOOLS } from "./image";
import { DEV_TOOLS } from "./dev";
import { PERFORMANCE_TOOLS } from "./performance";
import { PDF_TOOLS } from "./pdf";
import { CALCULATOR_TOOLS } from "./calculators";
import { OTHER_TOOLS } from "./other";

export const TOOLS: ToolDef[] = [
  ...TEXT_TOOLS,
  ...WRITING_TOOLS,
  ...BINARY_TOOLS,
  ...SEO_TOOLS,
  ...IMAGE_TOOLS,
  ...DEV_TOOLS,
  ...PERFORMANCE_TOOLS,
  ...PDF_TOOLS,
  ...CALCULATOR_TOOLS,
  ...OTHER_TOOLS,
];

const BY_ID = new Map(TOOLS.map((t) => [t.id, t]));
const BY_PATH = new Map(TOOLS.map((t) => [t.path, t]));

export function getTool(id: string): ToolDef | undefined {
  return BY_ID.get(id);
}

export function getToolByPath(path: string): ToolDef | undefined {
  return BY_PATH.get(path);
}

/** Tools whose primary category is `cat`, in hub order (group order, then priority, then name). */
export function toolsInCategory(cat: CategoryId, groupOrder?: string[]): ToolDef[] {
  const list = TOOLS.filter((t) => t.category === cat);
  const gi = (g: string) => (groupOrder ? groupOrder.indexOf(g) : 0);
  return list.sort(
    (a, b) =>
      gi(a.subgroup) - gi(b.subgroup) ||
      (a.targetKB ?? 0) - (b.targetKB ?? 0) ||
      a.priority - b.priority ||
      a.name.localeCompare(b.name),
  );
}

/** Tools cross-listed on `cat` ("Also useful here"). */
export function alsoInCategory(cat: CategoryId): ToolDef[] {
  return TOOLS.filter((t) => t.alsoIn?.includes(cat)).sort((a, b) => a.priority - b.priority);
}

/** Related tools for a tool page: curated list first, then same-group and same-category fill. */
export function relatedTools(tool: ToolDef, max = 6): ToolDef[] {
  const out: ToolDef[] = [];
  const push = (t?: ToolDef) => {
    if (t && t.id !== tool.id && t.indexable && !out.includes(t) && out.length < max) out.push(t);
  };
  tool.related.forEach((id) => push(BY_ID.get(id)));
  TOOLS.filter((t) => t.category === tool.category && t.subgroup === tool.subgroup)
    .sort((a, b) => a.priority - b.priority)
    .forEach(push);
  TOOLS.filter((t) => t.category === tool.category)
    .sort((a, b) => a.priority - b.priority)
    .forEach(push);
  return out;
}

export function popularTools(ids: string[]): ToolDef[] {
  return ids.map((id) => BY_ID.get(id)).filter((t): t is ToolDef => Boolean(t));
}
