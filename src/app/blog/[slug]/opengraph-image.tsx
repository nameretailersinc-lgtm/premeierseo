import { ogImage, OG_SIZE } from "@/lib/og";
import { GUIDES, getGuide } from "@/content/guides";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Guide – Premier SEO Services";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = getGuide(slug);
  return ogImage({ eyebrow: g ? `Guide · ${g.cluster}` : "Guide", title: g?.h1 ?? "Guide" });
}
