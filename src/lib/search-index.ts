import { CATEGORIES } from "@/content/categories";
import { TOOLS } from "@/content/tools";
import type { SearchIndex } from "./search";

const CATEGORY_ALIASES: Record<string, string[]> = {
  "text-tools": ["text", "writing", "text tools"],
  "binary-tools": ["binary", "number systems", "binary converter"],
  "free-seo-tools": ["seo", "seo tools", "webmaster"],
  "imaging-tools": ["image", "images", "photo", "image tools", "photo tools"],
  "development-tools": ["developer", "dev", "code", "developer tools", "webmaster tools"],
  "traffic-performance-tools": ["performance", "speed", "website checks", "network"],
  "pdf-tools": ["pdf", "pdf tools"],
  "calculator-tools": ["calculator", "calculators", "calc"],
  "other-tools": ["generators", "utilities", "generator"],
};

/** Build-time search index generated from the tool registry. */
export function buildSearchIndex(): SearchIndex {
  const label = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));
  return {
    tools: TOOLS.map((t) => ({
      id: t.id,
      path: t.path,
      name: t.name,
      short: t.card,
      category: t.category,
      categoryLabel: label[t.category],
      aliases: t.aliases,
      keywords: t.keywords ?? [],
      ...(t.formats?.from ? { from: t.formats.from } : {}),
      ...(t.formats?.to ? { to: t.formats.to } : {}),
      ...(t.targetKB ? { targetKB: t.targetKB, media: t.media ?? "image" } : {}),
      priority: t.priority,
    })),
    categories: CATEGORIES.map((c) => ({
      id: c.id,
      path: c.path,
      label: c.label,
      aliases: CATEGORY_ALIASES[c.id] ?? [],
      count: TOOLS.filter((t) => t.category === c.id).length,
    })),
  };
}
