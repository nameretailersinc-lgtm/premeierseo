import { promises as fs } from "node:fs";
import path from "node:path";
import { DATA_DIR } from "@/lib/server/blog-store";

const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif" };

/** Serves uploaded blog images from the data volume. Filenames are content-unique, so cache forever. */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const parts = (await params).path;
  if (parts[0] !== "uploads" || parts.some((p) => !/^[a-z0-9][a-z0-9._-]*$/i.test(p) || p.includes(".."))) {
    return new Response("Not found", { status: 404 });
  }
  const file = path.join(DATA_DIR, ...parts);
  if (!file.startsWith(path.join(DATA_DIR, "uploads") + path.sep)) return new Response("Not found", { status: 404 });
  const type = TYPES[path.extname(file).toLowerCase()];
  if (!type) return new Response("Not found", { status: 404 });
  try {
    const data = await fs.readFile(file);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": type,
        "Content-Length": String(data.length),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
