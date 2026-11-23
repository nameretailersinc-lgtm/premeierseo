import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { PostTable } from "@/components/admin/PostTable";
import { seoChecks, seoScore } from "@/lib/blog-types";
import { requireAdminPage } from "@/lib/server/admin-auth";
import { listAllPosts } from "@/lib/server/blog-store";

export default async function AdminHome() {
  await requireAdminPage();
  const posts = await listAllPosts();
  const rows = posts.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    status: p.status,
    category: p.category,
    datePublished: p.datePublished,
    dateModified: p.dateModified,
    noindex: p.seo.noindex,
    image: p.featuredImage?.src ?? "",
    score: seoScore(seoChecks(p)),
  }));
  return (
    <>
      <AdminHeader title="Posts">
        <Link href="/blog/" className="btn btn-secondary btn-sm" target="_blank">
          View blog
        </Link>
        <Link href="/admin/posts/new/" className="btn btn-primary btn-sm">
          + New post
        </Link>
      </AdminHeader>
      <PostTable rows={rows} />
    </>
  );
}
