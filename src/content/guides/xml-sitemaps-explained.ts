import { defineGuide, toolLink as t } from "./shared";

export const xmlSitemapsExplained = defineGuide({
  slug: "xml-sitemaps-explained",
  title: "XML Sitemaps: What to Include and What to Leave Out",
  h1: "XML sitemaps: what to include and what to leave out",
  metaDescription:
    "How XML sitemaps work, the 50,000-URL and 50 MB limits, why Google ignores priority and changefreq, and which URLs belong in the file.",
  summary:
    "An XML sitemap is a list of the URLs you want indexed, used as a discovery hint rather than an instruction. Include only **canonical, indexable, 200-returning** URLs. One file holds up to **50,000 URLs and 50 MB uncompressed**; beyond that, split it and list the parts in a sitemap index. Google reads `lastmod` but ignores `priority` and `changefreq`.",
  cluster: "Technical SEO",
  tools: ["xml-sitemap-generator", "robots-txt-generator", "http-status-checker", "canonical-url-generator"],
  body: [
    {
      heading: "What a sitemap is for",
      body: `A sitemap tells search engines which URLs exist on a site and when each last changed. It is defined by the sitemaps.org protocol, version 0.9, which both Google and Bing support.

A sitemap helps most when:

- the site is large and some pages are not well linked internally;
- the site is new and has few inbound links;
- content changes often and you want new URLs found sooner;
- pages are rich in media or news, where extensions (image, video, news sitemaps) carry extra detail.

It helps least on a small, well-linked site, where crawlers find everything by following links anyway. It is worth being clear about the limits of the format, because sitemaps are often expected to do more than they can:

- **A sitemap does not force indexing.** Google's documentation calls it a discovery aid. Listing a thin page does not make it rank, and omitting a page does not deindex it.
- **It does not override other signals.** A URL in the sitemap that carries \`noindex\`, redirects, or canonicalises elsewhere is treated according to those signals, not the sitemap.
- **It is not a site structure.** Crawlers infer structure from links and breadcrumbs.

The minimum valid file is a \`<urlset>\` element with the protocol namespace and one \`<url>\` child per address:

\`\`\`xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.example.com/shoes/</loc>
    <lastmod>2026-09-14</lastmod>
  </url>
</urlset>
\`\`\``,
    },
    {
      heading: "The four tags, and which ones matter",
      body: `Each \`<url>\` entry may carry four child elements. Only two are worth your attention.

| Tag | Required | What Google does with it |
|---|---|---|
| \`<loc>\` | Yes | The URL. Must be absolute, fully qualified and URL-encoded. |
| \`<lastmod>\` | No | Used, if it is accurate and consistent. |
| \`<changefreq>\` | No | Ignored. |
| \`<priority>\` | No | Ignored. |

Google has stated plainly that it ignores \`priority\` and \`changefreq\`. Setting every page to priority 1.0 achieves nothing, and neither does setting a weekly \`changefreq\` on a page that never changes.

\`<lastmod>\` is different: Google does use it, on the condition that it is consistently accurate. It must be a W3C Datetime value, which means either a date (\`2026-09-14\`) or a full timestamp with a time zone offset (\`2026-09-14T09:30:00+01:00\`). The common failure is a CMS that stamps every URL with the time the sitemap was generated. If every \`lastmod\` changes nightly while the pages do not, the signal is noise and stops being used. Set it from the date the page's main content last changed meaningfully, not from a template tweak or a comment.

\`<loc>\` must be in the same form you want indexed: the right protocol, the right host, the right letter case and the right trailing slash. A sitemap full of URLs that redirect to the canonical form is a common and avoidable waste. The ${t("canonical-url-generator", "canonical URL generator")} normalises an address to a single form you can use in the sitemap, the canonical tag and internal links alike.`,
    },
    {
      heading: "Size limits and sitemap index files",
      body: `One sitemap file may contain at most **50,000 URLs** and must not exceed **50 MB uncompressed**. Files may be gzipped, and the 50 MB limit applies to the uncompressed size.

Larger sites split the list and publish a sitemap index, which is a sitemap of sitemaps:

\`\`\`xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://www.example.com/sitemap-products-1.xml</loc>
    <lastmod>2026-09-14</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://www.example.com/sitemap-articles.xml</loc>
    <lastmod>2026-09-12</lastmod>
  </sitemap>
</sitemapindex>
\`\`\`

An index file is subject to the same limits: 50,000 sitemap entries, 50 MB. Indexes may not nest inside other indexes.

Splitting by content type rather than arbitrarily is worth the small extra effort, because Search Console reports coverage per submitted sitemap. If products, articles and category pages are in separate files, an indexing problem shows up as one file's numbers moving rather than one large unexplained total.

Two delivery details:

1. **A sitemap can only list URLs on the host that serves it**, unless you verify cross-submission in Search Console. A sitemap at \`example.com/sitemap.xml\` cannot vouch for \`cdn.example.net\`.
2. **Declare it in robots.txt** with an absolute URL, which every major crawler reads: \`Sitemap: https://www.example.com/sitemap.xml\`. Submitting in Search Console additionally gives you the coverage report. The ${t("robots-txt-generator", "robots.txt generator")} writes that directive in the right place, outside any user-agent group.`,
    },
    {
      heading: "Which URLs belong in the file",
      body: `The test for every URL is a single question: *is this exactly the address I want to appear in search results?* That rules out more than people expect.

**Include:** canonical URLs that return 200, are indexable, and are useful landing pages.

**Exclude:**

- URLs that redirect. Put the destination in instead.
- URLs that return 404, 410 or 5xx.
- URLs carrying \`noindex\`, and URLs blocked by robots.txt. A blocked URL in a sitemap is a contradiction Search Console reports.
- Non-canonical duplicates: parameter variants, print versions, session URLs, tag archives that duplicate category pages.
- Paginated pages beyond the first, unless each page is a worthwhile landing page in its own right.
- Login, cart, checkout, search-result and thank-you pages.
- Staging and development hosts, which arrive by accident when a sitemap is copied between environments.

Keeping the file honest is maintenance work, not a one-off. Two checks catch most drift. Run the URLs through an ${t("http-status-checker", "HTTP status checker")} after any migration or URL change, so redirects and 404s in the file surface before Google reports them. Then watch the submitted-versus-indexed numbers in Search Console: a widening gap usually means the sitemap has started listing URLs the site itself no longer treats as canonical.

For generating the file in the first place, an ${t("xml-sitemap-generator", "XML sitemap generator")} produces a valid \`<urlset>\` with correctly encoded locations, which avoids the hand-editing mistakes that make a sitemap unparseable: unescaped ampersands in query strings, a missing namespace, or a byte-order mark before the XML declaration.`,
    },
  ],
  sources: [
    { label: "sitemaps.org: XML sitemap protocol 0.9", url: "https://www.sitemaps.org/protocol.html" },
    { label: "Google Search Central: Build and submit a sitemap", url: "https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap" },
    { label: "Google Search Central: Learn about sitemaps", url: "https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview" },
    { label: "W3C: Date and Time Formats (NOTE-datetime)", url: "https://www.w3.org/TR/NOTE-datetime" },
    { label: "Google Search Central: Sitemaps report in Search Console", url: "https://support.google.com/webmasters/answer/7451001" },
  ],
});
