import type { MetadataRoute } from "next";
import { CATEGORIES } from "@/content/categories";
import { TOOLS } from "@/content/tools";
import { STATIC_PAGES } from "@/content/pages";
import { postPath } from "@/lib/blog-types";
import { listPublishedPosts } from "@/lib/server/blog-store";
import { absUrl } from "@/lib/site";

// Blog posts come from /admin/ at runtime, so the sitemap is built per request.
export const dynamic = "force-dynamic";

/** Only indexable, 200, self-canonical URLs. lastModified = the content's real edit date, never build time. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const newest = (dates: string[]) => dates.sort().at(-1)!;
  const posts = (await listPublishedPosts()).filter((p) => !p.seo.noindex && !p.seo.canonicalUrl);
  const entries: MetadataRoute.Sitemap = [
    { url: absUrl("/"), lastModified: newest([...TOOLS.map((t) => t.updated), ...posts.map((p) => p.dateModified)]) },
    { url: absUrl("/tools/"), lastModified: newest(TOOLS.map((t) => t.updated)) },
    ...CATEGORIES.map((c) => ({
      url: absUrl(c.path),
      lastModified: newest([c.updated, ...TOOLS.filter((t) => t.category === c.id).map((t) => t.updated)]),
    })),
    ...TOOLS.filter((t) => t.indexable).map((t) => ({ url: absUrl(t.path), lastModified: t.updated })),
    ...STATIC_PAGES.filter((p) => p.indexable).map((p) => ({ url: absUrl(p.path), lastModified: p.updated })),
  ];
  if (posts.length) {
    entries.push({ url: absUrl("/blog/"), lastModified: newest(posts.map((p) => p.dateModified)) });
    entries.push(
      ...posts.map((p) => ({
        url: absUrl(postPath(p.slug)),
        lastModified: p.dateModified,
        ...(p.featuredImage ? { images: [absUrl(p.featuredImage.src).replace(/\/$/, "")] } : {}),
      })),
    );
  }
  return entries;
}
