import type { MetadataRoute } from "next";
import { CATEGORIES } from "@/content/categories";
import { GUIDES } from "@/content/guides";
import { TOOLS } from "@/content/tools";
import { STATIC_PAGES } from "@/content/pages";
import { absUrl } from "@/lib/site";

/** Only indexable, 200, self-canonical URLs. lastModified = the content's real edit date, never build time. */
export default function sitemap(): MetadataRoute.Sitemap {
  const newest = (dates: string[]) => dates.sort().at(-1)!;
  const entries: MetadataRoute.Sitemap = [
    { url: absUrl("/"), lastModified: newest(TOOLS.map((t) => t.updated)) },
    { url: absUrl("/tools/"), lastModified: newest(TOOLS.map((t) => t.updated)) },
    ...CATEGORIES.map((c) => ({
      url: absUrl(c.path),
      lastModified: newest([c.updated, ...TOOLS.filter((t) => t.category === c.id).map((t) => t.updated)]),
    })),
    ...TOOLS.filter((t) => t.indexable).map((t) => ({ url: absUrl(t.path), lastModified: t.updated })),
    ...STATIC_PAGES.filter((p) => p.indexable).map((p) => ({ url: absUrl(p.path), lastModified: p.updated })),
  ];
  if (GUIDES.length >= 4) {
    entries.push({ url: absUrl("/blog/"), lastModified: newest(GUIDES.map((g) => g.dateModified)) });
    entries.push(...GUIDES.map((g) => ({ url: absUrl(g.path), lastModified: g.dateModified })));
  }
  return entries;
}
