import { defineGuide, toolLink as t } from "./shared";

export const googleIndexingTroubleshooting = defineGuide({
  slug: "google-indexing-troubleshooting",
  title: "Website Not Showing on Google? Indexing Troubleshooting",
  h1: "How to investigate a website not showing on Google",
  metaDescription: "Diagnose Google indexing problems using HTTP status, robots rules, canonical tags, rendered content and Search Console. Follow a practical repair checklist.",
  summary: "Separate discovery, crawling, indexing and ranking before changing your site. Technical eligibility does not guarantee indexing. Start with one important URL and record evidence for each check.",
  cluster: "Technical SEO",
  datePublished: "2026-10-15",
  dateModified: "2026-10-15",
  tools: ["meta-tags-analyzer", "redirect-checker", "robots-txt-tester", "heading-tag-extractor"],
  body: [
    { heading: "Establish whether the URL is indexed", body: "Inspect the exact URL in a verified Search Console property. Record indexing status, last crawl and the user-declared and Google-selected canonical. Run a live test separately: successful current access does not establish that Google has indexed the page. A site: search is a spot check rather than an exhaustive index report. If the page is indexed, investigate query relevance and ranking rather than changing crawling rules at random." },
    { heading: "Check the response first", body: `Use the ${t("redirect-checker", "redirect checker")} to trace the final destination. A useful page should return 200 with meaningful content. An error template returning 200 can be treated as a soft 404. Preserve a 404 or 410 for removed content unless a genuinely equivalent replacement exists.\n\n| Finding | Next action |\n|---|---|\n| Redirect loop | Repair the chain and link to the final destination |\n| 401 or 403 | Check authentication and firewall rules |\n| 429 or 5xx | Investigate capacity and logs |\n| 200 with empty content | Restore useful content and inspect rendering |` },
    { heading: "Read robots and canonical signals together", body: `The ${t("meta-tags-analyzer", "meta tags analyzer")} reads response HTML without executing JavaScript. Check robots meta tags and X-Robots-Tag headers for noindex. Test the exact URL using the ${t("robots-txt-tester", "robots.txt tester")}. Google needs crawl access to read a new noindex directive; robots.txt blocking is not a reliable removal method. See [noindex versus robots.txt](/blog/noindex-vs-robots-txt/).\n\nCheck whether the preferred URL agrees across internal links, sitemap and canonical tags. Canonicals are signals and Google can choose a different URL. See the [canonical tag guide](/blog/canonical-tags-explained/).` },
    { heading: "Compare source and rendered content", body: "Static HTML tools do not run JavaScript. Compare response source with URL Inspection's rendered output and resource failures. Essential headings, content and ordinary anchor links should be available without login or clicking a load-more button. Where practical, render essential content on the server instead of depending on fragile browser requests. Follow the [JavaScript SEO guide](/blog/javascript-seo-basics/)." },
    { heading: "Separate discovery from content quality", body: "Link from a relevant guide or category with descriptive anchor text. Include canonical, indexable URLs in the sitemap and use genuine content-update dates. Submitting a sitemap does not guarantee indexing; see the [XML sitemap guide](/blog/xml-sitemaps-explained/).\n\nFor crawled-but-not-indexed pages, compare usefulness with overlapping pages. Remove boilerplate, resolve duplicate intent and supply specific examples the reader needs. Repeated indexing requests do not repair unhelpful content." },
    { heading: "Record repairs and verify", body: "1. Record the URL, observed status and date.\n2. Repair the identified cause and confirm the deployed response.\n3. Update internal links and sitemap if the preferred URL changes.\n4. Inspect important repaired URLs and request indexing where appropriate.\n5. Monitor indexing and organic performance without assuming a fixed deadline.\n\nFor example, a leaked staging noindex setting requires removing the directive, confirming the live response and checking crawl access. This is an illustrative workflow, not a claimed client result." },
  ],
  sources: [
    { label: "Google JavaScript SEO basics", url: "https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics" },
    { label: "Google robots.txt introduction", url: "https://developers.google.com/search/docs/crawling-indexing/robots/intro" },
    { label: "Google sitemap guidance", url: "https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap" },
  ],
});
