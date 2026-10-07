export type CategoryId =
  | "text-tools"
  | "binary-tools"
  | "free-seo-tools"
  | "imaging-tools"
  | "development-tools"
  | "traffic-performance-tools"
  | "pdf-tools"
  | "calculator-tools"
  | "other-tools";

/** Where a tool's data goes. Drives the privacy statement shown on the page. */
export type Processing = "browser" | "server" | "third-party";

/** Layout archetype (docs/design-ux-audit.md §4.9). */
export type Archetype = "transform" | "analyzer" | "generator" | "file" | "url" | "calculator";

export type AppCategory =
  | "UtilitiesApplication"
  | "DeveloperApplication"
  | "MultimediaApplication"
  | "DesignApplication"
  | "BusinessApplication"
  | "FinanceApplication"
  | "EducationalApplication"
  | "HealthApplication";

export interface ContentSection {
  heading: string;
  /** Mini-markdown: paragraphs, "- " / "1. " lists, **bold**, `code`, [text](/path/), tables with | pipes. */
  body: string;
}

export interface Faq {
  q: string;
  a: string;
}

export interface ToolExample {
  title?: string;
  input: string;
  output: string;
  note?: string;
}

export interface ToolDef {
  /** Stable id = the slug (last path segment). */
  id: string;
  /** Public URL path with trailing slash. Frozen: changing it requires a redirect. */
  path: string;
  /** Short display name used in cards, links and breadcrumbs. */
  name: string;
  h1: string;
  title: string;
  metaDescription: string;
  /** Answer-first definition: 1–2 sentences under the H1 (≤ 200 chars). */
  summary: string;
  category: CategoryId;
  alsoIn?: CategoryId[];
  /** Hub subgroup heading this tool is listed under. */
  subgroup: string;
  /** One sentence, 40–100 chars, starting with a verb, used in cards and hub lists. */
  card: string;
  archetype: Archetype;
  /** Widget id in src/tools/registry.tsx. */
  widget: string;
  /** Serializable widget options (preset target size, mode, direction…). */
  config?: Record<string, string | number | boolean | string[] | null>;
  aliases: string[];
  keywords?: string[];
  processing: Processing;
  thirdParty?: { name: string; purpose: string; url: string };
  /** URL tool that also accepts pasted HTML/text, which is processed in the browser. */
  pasteMode?: boolean;
  /** Third-party tool whose extra checks also fetch the page from our server. */
  alsoServer?: boolean;
  limits?: string[];
  steps: string[];
  sections: ContentSection[];
  example?: ToolExample;
  useCases?: string[];
  faq: Faq[];
  sources?: { label: string; url: string }[];
  /** Related tool ids (4–8), curated by workflow. */
  related: string[];
  /** Contextual links from the keyword map (tools, hubs, guides). */
  links?: { href: string; anchor: string }[];
  guides?: string[];
  appCategory: AppCategory;
  features: string[];
  /** false → noindex, follow; excluded from sitemap and tool-to-tool links. */
  indexable: boolean;
  /** Date of the last meaningful change (ISO yyyy-mm-dd). */
  updated: string;
  /** Editorial prominence, not usage data. 1 = most important. */
  priority: 1 | 2 | 3;
  isNew?: boolean;
  /** Search-only: formats for "x to y" queries and N-KB presets. */
  formats?: { from?: string[]; to?: string[] };
  targetKB?: number;
  media?: "image" | "pdf";
}

export interface CategoryDef {
  id: CategoryId;
  path: string;
  label: string;
  /** Short label for nav. */
  navLabel: string;
  h1: string;
  title: string;
  metaDescription: string;
  intro: string;
  /** One-line description used in category cards. */
  card: string;
  icon: IconName;
  /** Ordered subgroups (headings on the hub). */
  groups: { id: string; heading: string; description?: string }[];
  sections: ContentSection[];
  faq: Faq[];
  related: CategoryId[];
  guides?: string[];
  updated: string;
}

export type IconName =
  | "type"
  | "binary"
  | "trending-up"
  | "image"
  | "file-text"
  | "braces"
  | "gauge"
  | "calculator"
  | "shapes"
  | "search"
  | "menu"
  | "x"
  | "chevron-right"
  | "chevron-down"
  | "copy"
  | "check"
  | "download"
  | "upload"
  | "rotate-ccw"
  | "trash"
  | "arrow-up"
  | "arrow-down"
  | "arrow-right"
  | "arrow-left-right"
  | "info"
  | "circle-check"
  | "triangle-alert"
  | "circle-alert"
  | "loader"
  | "shield-check"
  | "sun"
  | "moon"
  | "monitor"
  | "external-link"
  | "server"
  | "globe"
  | "clock"
  | "sparkles"
  | "play"
  | "refresh"
  | "eye"
  | "file"
  | "plus"
  | "minus"
  | "minimize"
  | "scissors"
  | "merge"
  | "rotate-cw"
  | "lock"
  | "key"
  | "hash"
  | "qr"
  | "link"
  | "code"
  | "palette"
  | "calendar"
  | "percent"
  | "list"
  | "shuffle"
  | "pen"
  | "crop"
  | "film"
  | "wifi"
  | "scan-text"
  | "repeat"
  | "folder"
  | "zap"
  | "mail"
  | "user-x"
  | "book-open"
  | "help-circle"
  | "layout-grid"
  | "message";

export interface GuideDef {
  slug: string;
  path: string;
  title: string;
  h1: string;
  metaDescription: string;
  summary: string;
  datePublished: string;
  dateModified: string;
  cluster: string;
  /** Tools used in this guide (ids). */
  tools: string[];
  body: ContentSection[];
  sources?: { label: string; url: string }[];
  readingMinutes?: number;
}
