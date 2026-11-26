import "server-only";
import { revalidatePath } from "next/cache";

/** Refresh every cached page that lists or shows posts. */
export function revalidateBlog(slugs: (string | undefined)[] = []) {
  revalidatePath("/");
  revalidatePath("/blog/");
  revalidatePath("/sitemap.xml");
  revalidatePath("/[slug]", "page");
  revalidatePath("/text-tools/[tool]", "page");
  for (const s of new Set(slugs.filter(Boolean))) revalidatePath(`/blog/${s}/`);
}
