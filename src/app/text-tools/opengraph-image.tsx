import { ogImage, OG_SIZE } from "@/lib/og";
import { CATEGORY_BY_ID } from "@/content/categories";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Text tools – Premier SEO Services";

export default function Image() {
  const c = CATEGORY_BY_ID["text-tools"];
  return ogImage({ eyebrow: "Tool category", title: c.h1, subtitle: c.card });
}
