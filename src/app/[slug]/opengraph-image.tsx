import { ogImage, OG_SIZE } from "@/lib/og";
import { CATEGORIES, CATEGORY_BY_ID } from "@/content/categories";
import { TOOLS, getToolByPath } from "@/content/tools";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Premier SEO Services";

export function generateStaticParams() {
  return [
    ...CATEGORIES.filter((c) => c.id !== "text-tools").map((c) => ({ slug: c.id })),
    ...TOOLS.filter((t) => t.path.split("/").filter(Boolean).length === 1).map((t) => ({ slug: t.id })),
  ];
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cat = CATEGORIES.find((c) => c.id === slug);
  if (cat) return ogImage({ eyebrow: "Tool category", title: cat.h1, subtitle: cat.card });
  const t = getToolByPath(`/${slug}/`);
  return ogImage({ eyebrow: t ? CATEGORY_BY_ID[t.category].label : "Tool", title: t?.h1 ?? "Premier SEO Services", subtitle: t?.card });
}
