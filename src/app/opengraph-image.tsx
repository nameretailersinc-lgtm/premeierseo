import { ogImage, OG_SIZE } from "@/lib/og";

export const alt = "Premier SEO Services – free online tools";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({ eyebrow: "Free online tools", title: "Tools for SEO, text, images and PDFs", subtitle: "Single-purpose tools that open ready to use. Most run in your browser." });
}
