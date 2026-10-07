import type { Metadata } from "next";
import { SITE, absUrl } from "./site";

interface MetaInput {
  path: string;
  title: string;
  description: string;
  indexable?: boolean;
  ogType?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
}

/**
 * One helper for every page: absolute self canonical with trailing slash, robots,
 * Open Graph and Twitter. The og:image comes from the route's opengraph-image file.
 */
export function buildMetadata(p: MetaInput): Metadata {
  const url = absUrl(p.path);
  const indexable = p.indexable ?? true;
  return {
    title: { absolute: p.title },
    description: p.description,
    alternates: { canonical: url },
    robots: indexable
      ? { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 }
      : { index: false, follow: true },
    openGraph: {
      type: p.ogType ?? "website",
      url,
      siteName: SITE.name,
      title: p.title,
      description: p.description,
      locale: SITE.locale,
      // Fallback image; a route's own opengraph-image file takes precedence over this.
      images: [{ url: "/brand/og-default.png", width: 1200, height: 630, alt: SITE.name }],
      ...(p.ogType === "article" && p.publishedTime
        ? { publishedTime: p.publishedTime, modifiedTime: p.modifiedTime ?? p.publishedTime }
        : {}),
    },
    twitter: { card: "summary_large_image", title: p.title, description: p.description, images: ["/brand/og-default.png"] },
  };
}
