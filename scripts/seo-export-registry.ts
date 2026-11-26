import { writeFileSync, mkdirSync } from "node:fs";
import { TOOLS } from "../src/content/tools";
import { CATEGORIES } from "../src/content/categories";

mkdirSync("seo", { recursive: true });
writeFileSync("seo/tool-registry.json", JSON.stringify({ tools: TOOLS, categories: CATEGORIES }, null, 2) + "\n");
console.log(`Exported ${TOOLS.length} registry tools.`);
