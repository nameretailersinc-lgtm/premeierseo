import type { Metadata } from "next";
import { BLOG_DESCRIPTION, BLOG_TITLE, BlogIndexView, blogPage } from "@/components/blog/BlogIndexView";
import { buildMetadata } from "@/lib/seo";

// Posts are managed from /admin/ and read from MongoDB at request time.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { total } = await blogPage(1);
  return buildMetadata({ path: "/blog/", title: BLOG_TITLE, description: BLOG_DESCRIPTION, indexable: total > 0 });
}

export default function BlogIndex() {
  return <BlogIndexView page={1} />;
}
