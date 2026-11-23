import "server-only";
import { TOOLS } from "@/content/tools";
import { listAllPosts } from "@/lib/server/blog-store";

/** Data the editor needs for pickers: live tools, existing categories/tags, and slugs already taken. */
export async function editorContext() {
  const posts = await listAllPosts();
  return {
    tools: TOOLS.filter((t) => t.indexable).map((t) => ({ id: t.id, name: t.name, path: t.path })),
    categories: [...new Set(["SEO", "Technical SEO", "Content", "Images", "PDF", "Web development", ...posts.map((p) => p.category)])].sort(),
    tags: [...new Set(posts.flatMap((p) => p.tags))].sort(),
    taken: posts.map((p) => ({ id: p.id, slug: p.slug })),
    internalLinks: [
      ...posts.filter((p) => p.status === "published").map((p) => ({ label: p.title, href: `/blog/${p.slug}/` })),
      ...TOOLS.filter((t) => t.indexable).map((t) => ({ label: t.name, href: t.path })),
    ],
  };
}
