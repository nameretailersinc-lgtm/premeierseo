import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryPage } from "@/components/CategoryPage";
import { ToolPage } from "@/components/tool/ToolPage";
import { CATEGORIES } from "@/content/categories";
import { TOOLS, getToolByPath } from "@/content/tools";
import { buildMetadata } from "@/lib/seo";

export const dynamicParams = false;

/** Root-level slugs: category hubs (except /text-tools/, which has its own route) and tools. */
export function generateStaticParams() {
  const cats = CATEGORIES.filter((c) => c.id !== "text-tools").map((c) => ({ slug: c.id }));
  const tools = TOOLS.filter((t) => t.path.split("/").filter(Boolean).length === 1).map((t) => ({ slug: t.id }));
  return [...cats, ...tools];
}

function resolve(slug: string) {
  const cat = CATEGORIES.find((c) => c.id === slug && c.id !== "text-tools");
  if (cat) return { cat } as const;
  const tool = getToolByPath(`/${slug}/`);
  if (tool) return { tool } as const;
  return null;
}

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const r = resolve(slug);
  if (!r) return {};
  if ("cat" in r && r.cat) return buildMetadata({ path: r.cat.path, title: r.cat.title, description: r.cat.metaDescription });
  const t = r.tool!;
  return buildMetadata({ path: t.path, title: t.title, description: t.metaDescription, indexable: t.indexable });
}

export default async function Page({ params }: PageProps<"/[slug]">) {
  const { slug } = await params;
  const r = resolve(slug);
  if (!r) notFound();
  if ("cat" in r && r.cat) return <CategoryPage cat={r.cat} />;
  return <ToolPage tool={r.tool!} />;
}
