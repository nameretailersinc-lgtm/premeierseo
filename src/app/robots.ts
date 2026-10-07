import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/* No Crawl-delay (Google ignores it; it only slows Bing). Search and AI answer crawlers are allowed. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: `${SITE.origin}/sitemap.xml`,
    host: SITE.origin,
  };
}
