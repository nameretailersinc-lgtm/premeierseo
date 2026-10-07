import { ogImage, OG_SIZE } from "@/lib/og";
import { TOOLS, getToolByPath } from "@/content/tools";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Premier SEO Services";

export function generateStaticParams() {
  return TOOLS.filter((t) => t.path.startsWith("/text-tools/") && t.path.split("/").filter(Boolean).length === 2).map((t) => ({
    tool: t.path.split("/")[2],
  }));
}

export default async function Image({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  const t = getToolByPath(`/text-tools/${tool}/`);
  return ogImage({ eyebrow: "Text tools", title: t?.h1 ?? "Text tool", subtitle: t?.card });
}
