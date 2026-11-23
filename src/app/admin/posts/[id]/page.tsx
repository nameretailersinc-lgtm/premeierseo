import { notFound } from "next/navigation";
import { PostEditor } from "@/components/admin/PostEditor";
import { editorContext } from "@/components/admin/editor-context";
import { requireAdminPage } from "@/lib/server/admin-auth";
import { getPostById } from "@/lib/server/blog-store";

export default async function EditPost({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const post = await getPostById((await params).id);
  if (!post) notFound();
  return <PostEditor {...await editorContext()} initial={post} />;
}
