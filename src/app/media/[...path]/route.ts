import { readImage } from "@/lib/server/blog-store";

/** Serves blog images from MongoDB GridFS. Filenames carry a random suffix and never change, so cache forever. */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const parts = (await params).path;
  if (parts[0] !== "uploads" || parts.length > 5 || parts.some((p) => !/^[a-z0-9][a-z0-9._-]*$/.test(p) || p.includes(".."))) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const img = await readImage(parts.join("/"));
    if (!img || !img.mime.startsWith("image/")) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(img.data), {
      headers: {
        "Content-Type": img.mime,
        "Content-Length": String(img.data.length),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
      },
    });
  } catch (e) {
    console.error("[media] read failed", e);
    return new Response("Temporarily unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
