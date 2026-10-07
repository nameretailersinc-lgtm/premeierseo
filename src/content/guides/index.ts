import type { GuideDef } from "@/lib/types";
import { redirects301vs302 } from "./301-vs-302-redirects";
import { canonicalTagsExplained } from "./canonical-tags-explained";
import { characterLimitsCheatSheet } from "./character-limits-cheat-sheet";
import { crawlBudgetExplained } from "./crawl-budget-explained";
import { duplicateContentExplained } from "./duplicate-content-explained";
import { howManyPagesIs1000Words } from "./how-many-pages-is-1000-words";
import { hreflangImplementation } from "./hreflang-guide";
import { httpStatusCodesForSeo } from "./http-status-codes-seo";
import { httpsMigrationChecklist } from "./https-migration-checklist";
import { javascriptSeoBasics } from "./javascript-seo-basics";
import { jpgVsPngVsWebp } from "./jpg-vs-png-vs-webp";
import { noindexVsRobotsTxt } from "./noindex-vs-robots-txt";
import { reducePdfFileSize } from "./reduce-pdf-file-size";
import { reducePhotoSizeInKb } from "./reduce-photo-size-in-kb";
import { robotsTxtGuide } from "./robots-txt-guide";
import { writeTitleTagsMetaDescriptions } from "./write-title-tags-meta-descriptions";
import { xmlSitemapsExplained } from "./xml-sitemaps-explained";

/**
 * Published guides. Author is the organisation until named authors are supplied.
 * Each guide lives in its own file; `defineGuide` (./shared) derives path, dates, reading time and live tool ids.
 */
export const GUIDES: GuideDef[] = [
  reducePhotoSizeInKb,
  jpgVsPngVsWebp,
  reducePdfFileSize,
  howManyPagesIs1000Words,
  characterLimitsCheatSheet,
  writeTitleTagsMetaDescriptions,
  redirects301vs302,
  robotsTxtGuide,
  canonicalTagsExplained,
  hreflangImplementation,
  httpStatusCodesForSeo,
  xmlSitemapsExplained,
  noindexVsRobotsTxt,
  crawlBudgetExplained,
  duplicateContentExplained,
  javascriptSeoBasics,
  httpsMigrationChecklist,
];

export function getGuide(slug: string): GuideDef | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
