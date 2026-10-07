import { ogImage } from "@/lib/og";

export const dynamic = "force-static";

/** Default 1200×630 social image for pages without their own opengraph-image file. */
export function GET() {
  return ogImage({ eyebrow: "Free online tools", title: "Premier SEO Services", subtitle: "Tools for SEO, text, images, PDFs and code. Most run in your browser." });
}
