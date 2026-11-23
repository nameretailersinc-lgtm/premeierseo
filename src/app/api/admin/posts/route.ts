import { requireAdminApi } from "@/lib/server/admin-auth";
import { ValidationError, listAllPosts, savePost } from "@/lib/server/blog-store";
import { revalidateBlog } from "@/lib/server/blog-revalidate";
import type { BlogPost } from "@/lib/blog-types";

const H = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

export async function GET(req: Request) {
  const deny = requireAdminApi(req);
  if (deny) return deny;
  return Response.json({ posts: await listAllPosts() }, { headers: H });
}

export async function POST(req: Request) {
  const deny = requireAdminApi(req);
  if (deny) return deny;
  try {
    const body = (await req.json()) as Partial<BlogPost>;
    const post = await savePost({ ...body, id: undefined });
    revalidateBlog([post.slug]);
    return Response.json({ post }, { status: 201, headers: H });
  } catch (e) {
    if (e instanceof ValidationError) return Response.json({ error: e.message }, { status: 400, headers: H });
    if (e instanceof SyntaxError) return Response.json({ error: "Invalid JSON." }, { status: 400, headers: H });
    console.error("[admin] create post failed", e);
    return Response.json({ error: "Could not save the post." }, { status: 500, headers: H });
  }
}
