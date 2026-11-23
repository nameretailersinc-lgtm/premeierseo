import { PostEditor } from "@/components/admin/PostEditor";
import { editorContext } from "@/components/admin/editor-context";
import { requireAdminPage } from "@/lib/server/admin-auth";

export default async function NewPost() {
  await requireAdminPage();
  return <PostEditor {...await editorContext()} />;
}
