import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { requireAdminApi } from "@/lib/server/admin-auth";
import { UPLOAD_DIR } from "@/lib/server/blog-store";
import { sniffImage } from "@/lib/server/image-meta";
import { LIMITS, slugifyPost } from "@/lib/blog-types";

const H = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

/** multipart/form-data: file (JPG, PNG, WebP or GIF, ≤ 5 MB), optional name (used for an SEO-friendly filename). */
export async function POST(req: Request) {
  const deny = requireAdminApi(req);
  if (deny) return deny;
  if (Number(req.headers.get("content-length") || 0) > LIMITS.imageBytes + 64 * 1024) {
    return Response.json({ error: "Image is larger than 5 MB." }, { status: 413, headers: H });
  }
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Expected a file upload." }, { status: 400, headers: H });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file received." }, { status: 400, headers: H });
  if (file.size > LIMITS.imageBytes) return Response.json({ error: "Image is larger than 5 MB." }, { status: 413, headers: H });
  const buf = Buffer.from(await file.arrayBuffer());
  const info = sniffImage(buf);
  if (!info) return Response.json({ error: "Only JPG, PNG, WebP and GIF images are accepted." }, { status: 415, headers: H });

  const base = slugifyPost(String(form.get("name") || file.name.replace(/\.[^.]+$/, ""))).slice(0, 60) || "image";
  const now = new Date();
  const dir = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const name = `${base}-${randomBytes(4).toString("hex")}.${info.ext}`;
  await fs.mkdir(path.join(UPLOAD_DIR, dir), { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, dir, name), buf, { flag: "wx" });
  return Response.json(
    { src: `/media/uploads/${dir}/${name}`, width: info.width, height: info.height, bytes: buf.length, mime: info.mime },
    { status: 201, headers: H },
  );
}
