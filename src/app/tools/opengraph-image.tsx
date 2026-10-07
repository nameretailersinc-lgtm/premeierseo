import { ogImage, OG_SIZE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "All tools A–Z – Premier SEO Services";

export default function Image() {
  return ogImage({ eyebrow: "All tools", title: "Every tool, A–Z", subtitle: "Text, SEO, image, PDF, developer, website and calculator tools." });
}
