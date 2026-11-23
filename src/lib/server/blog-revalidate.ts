import "server-only";
import { revalidatePath } from "next/cache";

/** Refresh every cached page that lists or shows posts. */
export function revalidateBlog(slugs: (string | undefined)[] = []) {
  revalidatePath("/");
  revalidatePath("/blog/");
  revalidatePath("/sitemap.xml");
  for (const s of new Set(slugs.filter(Boolean))) revalidatePath(`/blog/${s}/`);
}
