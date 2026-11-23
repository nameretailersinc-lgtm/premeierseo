import { ogImage } from "@/lib/og";
import { getPublishedPost } from "@/lib/server/blog-store";

export const dynamic = "force-dynamic";

/** Generated 1200×630 share card for posts without their own social / featured image. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const p = await getPublishedPost((await params).slug);
  if (!p) return new Response("Not found", { status: 404 });
  const res = ogImage({ eyebrow: `Blog · ${p.category}`, title: p.title });
  res.headers.set("Cache-Control", "public, max-age=3600");
  return res;
}
