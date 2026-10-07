import { defineGuide, toolLink as t } from "./shared";

export const crawlBudgetExplained = defineGuide({
  slug: "crawl-budget-explained",
  title: "Crawl Budget: When It Matters and What Wastes It",
  h1: "Crawl budget: when it matters and what wastes it",
  metaDescription:
    "What crawl budget is, the two limits that set it, the site sizes where it actually matters, and the URL patterns that waste crawling on duplicates.",
  summary:
    "Crawl budget is how much crawling Google will do on your site, set by two things: the **crawl capacity limit** (how much your server can take) and **crawl demand** (how much Google wants your pages). It is only a practical concern for sites with roughly **a million or more pages**, or smaller sites with a lot of rapidly changing URLs. Most sites should fix speed and duplication instead.",
  cluster: "Technical SEO",
  tools: ["robots-txt-tester", "website-speed-checker", "http-status-checker", "redirect-checker"],
  body: [
    {
      heading: "What crawl budget actually is",
      body: `Google's documentation on managing crawl budget for large sites defines it as the product of two separate limits.

**Crawl capacity limit.** Googlebot tries to crawl without degrading your site. It watches response times and server errors: if the site answers quickly, the limit rises; if responses slow down or 5xx errors appear, it drops. This is a protective ceiling, not a reward.

**Crawl demand.** How much Google wants to crawl, driven by how many URLs it knows about, how popular they are, how stale its copy is, and whether the site has changed structurally. Pages that never change are crawled less often. Pages nobody links to and nobody visits generate little demand.

Crawl budget is the smaller of the two. That has a consequence people often miss: making your server faster raises the capacity limit, but if demand is low, nothing changes. A fast server does not persuade Google to crawl pages it has no interest in.

Google is explicit about who should care. If a site has **fewer than a few thousand URLs**, it will generally be crawled efficiently without intervention. The sites that need to manage crawl budget are large ones — on the order of a million or more unique pages — and medium sites (say 10,000 or more) whose content changes very frequently. If you have a 400-page site with pages missing from the index, crawl budget is almost certainly not the cause; the cause is usually duplication, thin content, or a technical block.`,
    },
    {
      heading: "What wastes crawling",
      body: `Waste is crawling that produces nothing new. The usual sources, roughly in order of how much damage they do:

**Faceted navigation and parameters.** Filters that combine freely produce a combinatorial explosion: \`?colour=red&size=10&sort=price&page=3\` is one of thousands of URLs serving reorderings of the same items. This is the biggest single source of waste on commerce sites.

**Infinite spaces.** Calendars with "next month" links forever, endless pagination, or session identifiers in URLs. Googlebot can follow these indefinitely.

**Duplicate URLs for one page.** The same content at http and https, with and without \`www\`, with and without a trailing slash, in mixed letter case, or with tracking parameters appended. Each variant is crawled separately before being consolidated.

**Redirect chains.** Every hop is a request. A chain of four redirects costs four crawls to reach one page.

**Soft 404s.** Pages that return 200 while saying nothing is there. Google keeps crawling them because, as far as the status code says, they are real pages.

**Internal search result pages.** Thin, infinite, and duplicative of the category pages they draw from.

**Non-content files.** Large assets that Google has no reason to fetch repeatedly, especially when cache headers tell it nothing.

The ${t("redirect-checker", "redirect checker")} shows the hop count for a URL, and an ${t("http-status-checker", "HTTP status checker")} run over a sample of URL patterns reveals how many of them resolve to the same final page — the quickest way to see duplication that a crawl log would otherwise have to tell you.`,
    },
    {
      heading: "What to do about it",
      body: `The fixes in Google's guidance, with the blunt ones first:

1. **Block infinite and low-value spaces in robots.txt.** This is the only method that actually prevents the request. \`Disallow: /*?sort=\` stops the crawl rather than discovering the duplicate and discarding it. Use it for sort orders, session parameters and calendar archives.
2. **Consolidate duplicates properly.** One canonical host and protocol, enforced with a single redirect hop; one trailing-slash convention; canonical tags that self-reference; consistent internal links. A duplicate Google never sees costs nothing.
3. **Return the right status codes.** 404 or 410 for pages that are gone, so Google stops asking. 304 for unchanged pages, so a check is cheap. 503 with \`Retry-After\` for maintenance, so a bad hour does not look like a bad site.
4. **Flatten redirect chains** so every rule points at the final URL.
5. **Keep sitemaps accurate**, with \`lastmod\` set from real content changes, so Google can prioritise what moved.
6. **Make the server fast and stable.** This is what raises the capacity limit. A ${t("website-speed-checker", "website speed checker")} measures the response the crawler experiences, which is server time rather than rendering time.

What **not** to do:

- \`Crawl-delay\` in robots.txt is ignored by Google.
- \`noindex\` does not save crawl budget: Google must fetch the page to read the tag, and keeps fetching it periodically.
- \`nofollow\` on internal links does not reliably stop discovery, since the URL is usually linked from elsewhere.
- Removing pages purely to "concentrate" crawl budget. Remove pages because they are not worth having, not for arithmetic.

Verify any robots.txt rule before shipping it. A pattern meant to block \`?sort=\` can easily block a whole category, and the ${t("robots-txt-tester", "robots.txt tester")} shows exactly which rule matches a URL.`,
    },
    {
      heading: "Measuring it honestly",
      body: `Two sources tell you whether crawling is really your constraint.

**The Crawl stats report in Search Console** shows total requests over time, average response time, and a breakdown by response code, file type, purpose (discovery versus refresh) and Googlebot type. The diagnostics worth looking for:

- A high share of **404 and 5xx** responses means crawling is being spent on nothing.
- **Average response time climbing** while total requests fall is the capacity limit tightening.
- A large share of requests to **parameter URLs or non-canonical variants** is quantified waste.
- Mostly **refresh** rather than **discovery** crawling on a site publishing new pages means new URLs are hard to find; check internal linking and sitemaps.

**Server logs** are the more complete record, since they show every request Googlebot made, including the URLs Search Console aggregates away. Filter to verified Googlebot requests by reverse DNS, then count requests per URL pattern. The finding that usually justifies the exercise is a parameter pattern or an old URL structure absorbing a large share of all crawling.

What to expect from a fix: changes in crawl behaviour show up over weeks, not days, because both the capacity limit and demand adjust gradually. Indexing improvements lag further behind. Measure before and after, and change one thing at a time.

A last point of proportion. For most sites, "crawl budget" is a distraction from the real problem. If pages are missing from the index on a site of a few thousand URLs, the likely causes are duplication, pages with no internal links, \`noindex\` left on by accident, or content that is not worth indexing. Each is cheaper to fix and more likely to help than anything in this guide.`,
    },
  ],
  sources: [
    { label: "Google Search Central: Large site owner's guide to managing crawl budget", url: "https://developers.google.com/search/docs/crawling-indexing/large-site-managing-crawl-budget" },
    { label: "Google Search Central: Crawl stats report", url: "https://support.google.com/webmasters/answer/9679690" },
    { label: "Google Search Central: Faceted navigation best practices", url: "https://developers.google.com/search/docs/crawling-indexing/crawling-managing-faceted-navigation" },
    { label: "Google Search Central: Verifying Googlebot and other Google crawlers", url: "https://developers.google.com/search/docs/crawling-indexing/verifying-googlebot" },
    { label: "RFC 9309: Robots Exclusion Protocol", url: "https://www.rfc-editor.org/rfc/rfc9309.html" },
  ],
});
