import type { Metadata } from "next";
import { CategoryPage } from "@/components/CategoryPage";
import { CATEGORY_BY_ID } from "@/content/categories";
import { buildMetadata } from "@/lib/seo";

const cat = CATEGORY_BY_ID["text-tools"];

export const metadata: Metadata = buildMetadata({ path: cat.path, title: cat.title, description: cat.metaDescription });

export default function Page() {
  return <CategoryPage cat={cat} />;
}
