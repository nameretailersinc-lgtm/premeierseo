import { SITE, absUrl } from "./site";
import type { CategoryDef, ToolDef } from "./types";
import { effectiveDescription, effectiveMetaTitle, postPath, wordCount, type BlogPost } from "./blog-types";

/** JSON-LD graph builders. Only describe what is visible and true on the page. */

type Node = Record<string, unknown>;

const ORG_ID = `${SITE.origin}/#organization`;
const WEBSITE_ID = `${SITE.origin}/#website`;

export function organizationNode(full = false): Node {
  const base: Node = { "@type": "Organization", "@id": ORG_ID, name: SITE.name, url: absUrl("/") };
  if (!full) return base;
  return {
    ...base,
    logo: {
      "@type": "ImageObject",
      "@id": `${SITE.origin}/#logo`,
      url: absUrl("/brand/logo-512.png"),
      width: 512,
      height: 512,
      caption: SITE.name,
    },
    description: SITE.description,
    email: SITE.email,
    foundingDate: SITE.foundingYear,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: SITE.email,
      url: absUrl("/contact/"),
      availableLanguage: "English",
    },
  };
}

export function websiteNode(): Node {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: absUrl("/"),
    name: SITE.name,
    publisher: { "@id": ORG_ID },
    inLanguage: SITE.language,
  };
}

export interface Crumb {
  name: string;
  path?: string;
}

export function breadcrumbNode(pagePath: string, crumbs: Crumb[]): Node {
  return {
    "@type": "BreadcrumbList",
    "@id": `${absUrl(pagePath)}#breadcrumb`,
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      ...(c.path ? { item: absUrl(c.path) } : {}),
    })),
  };
}

function webPageNode(path: string, name: string, description: string, extra: Node = {}, type = "WebPage"): Node {
  const url = absUrl(path);
  return {
    "@type": type,
    "@id": `${url}#webpage`,
    url,
    name,
    description,
    isPartOf: { "@id": WEBSITE_ID },
    inLanguage: SITE.language,
    ...extra,
  };
}

export function homeGraph(title: string, description: string): Node[] {
  return [
    organizationNode(true),
    websiteNode(),
    webPageNode("/", title, description, { about: { "@id": ORG_ID } }),
  ];
}

export function toolGraph(tool: ToolDef, crumbs: Crumb[]): Node[] {
  const url = absUrl(tool.path);
  return [
    webPageNode(tool.path, tool.title, tool.metaDescription, {
      breadcrumb: { "@id": `${url}#breadcrumb` },
      mainEntity: { "@id": `${url}#app` },
      primaryImageOfPage: { "@id": `${url}#primaryimage` },
      dateModified: tool.updated,
    }),
    {
      "@type": "WebApplication",
      "@id": `${url}#app`,
      name: tool.name,
      url,
      description: tool.summary,
      applicationCategory: tool.appCategory,
      operatingSystem: "Any",
      browserRequirements: "Requires JavaScript and a current web browser",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      featureList: tool.features,
      provider: { "@id": ORG_ID },
    },
    breadcrumbNode(tool.path, crumbs),
    {
      "@type": "ImageObject",
      "@id": `${url}#primaryimage`,
      url: `${url}opengraph-image`,
      width: 1200,
      height: 630,
    },
    organizationNode(),
    websiteNode(),
  ];
}

export function categoryGraph(cat: CategoryDef, tools: ToolDef[], crumbs: Crumb[]): Node[] {
  const url = absUrl(cat.path);
  return [
    webPageNode(
      cat.path,
      cat.title,
      cat.metaDescription,
      { breadcrumb: { "@id": `${url}#breadcrumb` }, mainEntity: { "@id": `${url}#list` }, dateModified: cat.updated },
      "CollectionPage",
    ),
    {
      "@type": "ItemList",
      "@id": `${url}#list`,
      numberOfItems: tools.length,
      itemListElement: tools.map((t, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: absUrl(t.path),
        name: t.name,
      })),
    },
    breadcrumbNode(cat.path, crumbs),
    organizationNode(),
    websiteNode(),
  ];
}

export function collectionGraph(path: string, title: string, description: string, crumbs: Crumb[]): Node[] {
  const url = absUrl(path);
  return [
    webPageNode(path, title, description, { breadcrumb: { "@id": `${url}#breadcrumb` } }, "CollectionPage"),
    breadcrumbNode(path, crumbs),
    organizationNode(),
    websiteNode(),
  ];
}

/** Absolute image URL for a stored image src (site path or absolute). */
export function absImage(src: string): string {
  return /^https?:\/\//.test(src) ? src : `${SITE.origin}${src.startsWith("/") ? src : `/${src}`}`;
}

/** BlogPosting (or the chosen Article subtype) + WebPage + BreadcrumbList (+ FAQPage when the post has FAQs). */
export function blogPostGraph(p: BlogPost, crumbs: Crumb[]): Node[] {
  const path = postPath(p.slug);
  const url = absUrl(path);
  const title = effectiveMetaTitle(p);
  const description = effectiveDescription(p);
  const img = p.featuredImage ?? p.seo.ogImage;
  const author: Node = p.authorName
    ? { "@type": "Person", name: p.authorName, ...(p.authorUrl ? { url: absUrl(p.authorUrl) } : {}) }
    : { "@id": ORG_ID };
  const keywords = [p.seo.focusKeyword, ...p.seo.secondaryKeywords, ...p.tags].filter(Boolean);
  const graph: Node[] = [
    {
      "@type": p.seo.schemaType || "BlogPosting",
      "@id": `${url}#article`,
      mainEntityOfPage: { "@id": `${url}#webpage` },
      headline: p.title.slice(0, 110),
      description,
      image: img
        ? { "@type": "ImageObject", url: absImage(img.src), ...(img.width ? { width: img.width, height: img.height } : {}), ...(img.caption ? { caption: img.caption } : {}) }
        : `${url}og-image.png`,
      datePublished: p.datePublished,
      dateModified: p.dateModified,
      author,
      publisher: { "@id": ORG_ID },
      isPartOf: { "@id": WEBSITE_ID },
      inLanguage: SITE.language,
      articleSection: p.category,
      wordCount: wordCount(p.content),
      ...(keywords.length ? { keywords: [...new Set(keywords)].join(", ") } : {}),
    },
    webPageNode(path, title, description, {
      breadcrumb: { "@id": `${url}#breadcrumb` },
      ...(img ? { primaryImageOfPage: { "@type": "ImageObject", url: absImage(img.src) } } : {}),
    }),
    breadcrumbNode(path, crumbs),
    organizationNode(),
    websiteNode(),
  ];
  if (p.faqs.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      isPartOf: { "@id": `${url}#webpage` },
      mainEntity: p.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    });
  }
  return graph;
}

export function simplePageGraph(
  path: string,
  title: string,
  description: string,
  crumbs: Crumb[],
  type: "WebPage" | "AboutPage" | "ContactPage" = "WebPage",
): Node[] {
  const url = absUrl(path);
  const extra: Node = { breadcrumb: { "@id": `${url}#breadcrumb` } };
  if (type === "AboutPage") extra.mainEntity = { "@id": ORG_ID };
  return [
    webPageNode(path, title, description, extra, type),
    breadcrumbNode(path, crumbs),
    organizationNode(type !== "WebPage"),
    websiteNode(),
  ];
}
