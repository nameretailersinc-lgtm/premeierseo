import { requireAdminApi } from "@/lib/server/admin-auth";
import { ValidationError, deletePost, getPostById, savePost } from "@/lib/server/blog-store";
import { revalidateBlog } from "@/lib/server/blog-revalidate";
import type { BlogPost } from "@/lib/blog-types";

const H = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };
type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const deny = requireAdminApi(req);
  if (deny) return deny;
  const post = await getPostById((await params).id);
  return post ? Response.json({ post }, { headers: H }) : Response.json({ error: "Not found." }, { status: 404, headers: H });
}

export async function PUT(req: Request, { params }: Ctx) {
  const deny = requireAdminApi(req);
  if (deny) return deny;
  const { id } = await params;
  try {
    const before = await getPostById(id);
    const body = (await req.json()) as Partial<BlogPost>;
    const post = await savePost(body, id);
    revalidateBlog([before?.slug, post.slug]);
    return Response.json({ post }, { headers: H });
  } catch (e) {
    if (e instanceof ValidationError) return Response.json({ error: e.message }, { status: 400, headers: H });
    if (e instanceof SyntaxError) return Response.json({ error: "Invalid JSON." }, { status: 400, headers: H });
    console.error("[admin] update post failed", e);
    return Response.json({ error: "Could not save the post." }, { status: 500, headers: H });
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const deny = requireAdminApi(req);
  if (deny) return deny;
  let gone;
  try {
    gone = await deletePost((await params).id);
  } catch (e) {
    if (e instanceof ValidationError) return Response.json({ error: e.message }, { status: 503, headers: H });
    console.error("[admin] delete post failed", e);
    return Response.json({ error: "Could not delete the post." }, { status: 500, headers: H });
  }
  if (!gone) return Response.json({ error: "Not found." }, { status: 404, headers: H });
  revalidateBlog([gone.slug]);
  return Response.json({ ok: true }, { headers: H });
}
