import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { BLOG_DESCRIPTION, BLOG_TITLE, BlogIndexView, blogPage, blogPagePath } from "@/components/blog/BlogIndexView";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

function pageNum(n: string) {
  return /^\d{1,4}$/.test(n) ? Number(n) : NaN;
}

export async function generateMetadata({ params }: { params: Promise<{ n: string }> }): Promise<Metadata> {
  const n = pageNum((await params).n);
  if (!(n > 1)) return {};
  return buildMetadata({ path: blogPagePath(n), title: `${BLOG_TITLE.replace(" | ", ` – Page ${n} | `)}`, description: BLOG_DESCRIPTION });
}

export default async function BlogPaged({ params }: { params: Promise<{ n: string }> }) {
  const n = pageNum((await params).n);
  if (n === 1) permanentRedirect("/blog/");
  if (!(n > 1)) notFound();
  // A page number that no longer exists (the list got shorter) leads back to the blog, not to a 404.
  if (n > (await blogPage(n)).pages) permanentRedirect("/blog/");
  return <BlogIndexView page={n} />;
}
