import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolPage } from "@/components/tool/ToolPage";
import { TOOLS, getToolByPath } from "@/content/tools";
import { buildMetadata } from "@/lib/seo";

/* Tools whose indexed URL is nested under /text-tools/ (kept as-is: /text-tools/add-remove-line-breaks/). */
export const dynamicParams = false;

export function generateStaticParams() {
  return TOOLS.filter((t) => t.path.startsWith("/text-tools/") && t.path.split("/").filter(Boolean).length === 2).map((t) => ({
    tool: t.path.split("/")[2],
  }));
}

export async function generateMetadata({ params }: PageProps<"/text-tools/[tool]">): Promise<Metadata> {
  const { tool } = await params;
  const t = getToolByPath(`/text-tools/${tool}/`);
  if (!t) return {};
  return buildMetadata({ path: t.path, title: t.title, description: t.metaDescription, indexable: t.indexable });
}

export default async function Page({ params }: PageProps<"/text-tools/[tool]">) {
  const { tool } = await params;
  const t = getToolByPath(`/text-tools/${tool}/`);
  if (!t) notFound();
  return <ToolPage tool={t} />;
}
