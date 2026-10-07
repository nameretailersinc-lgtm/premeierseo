import { PATHS } from "@/components/icon-paths";

export const dynamic = "force-static";

/** One SVG sprite with every icon as a <symbol>; <Icon> references it with <use href="/icons.svg#name">. */
export function GET() {
  const symbols = Object.entries(PATHS)
    .map(([name, d]) => `<symbol id="${name}" viewBox="0 0 24 24">${d}</symbol>`)
    .join("");
  return new Response(`<svg xmlns="http://www.w3.org/2000/svg">${symbols}</svg>`, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
  });
}
