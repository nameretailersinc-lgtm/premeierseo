import { defineGuide, toolLink as t } from "./shared";

export const canonicalTagsExplained = defineGuide({
  slug: "canonical-tags-explained",
  title: "Canonical Tags Explained: Syntax, Rules and Mistakes",
  h1: "Canonical tags explained",
  metaDescription:
    "What rel=canonical does, the five signals Google weighs when picking a canonical URL, correct syntax for every case, and the mistakes that deindex pages.",
  summary:
    "A canonical tag tells search engines which URL you consider the main version of a page when several URLs show the same content. It is a **hint, not a directive**: Google weighs it alongside redirects, internal links, sitemaps and HTTPS when choosing the URL to index. Every page should carry a self-referencing canonical with an absolute URL.",
  cluster: "Technical SEO",
  tools: ["canonical-url-generator", "meta-tags-analyzer", "redirect-checker", "website-seo-score-checker"],
  body: [
    {
      heading: "What a canonical tag is for",
      body: `The canonical link relation was standardised in RFC 6596 to let a site name the preferred address for content reachable at more than one URL. It solves a problem that is easy to create by accident: the same product page served at \`?color=blue\`, \`?sessionid=…\`, \`/index.html\` and the bare directory path is four URLs with one page of content.

The tag goes in the \`<head>\`:

\`\`\`html
<link rel="canonical" href="https://www.example.com/shoes/" />
\`\`\`

Google's documentation on consolidating duplicate URLs explains what it does with that information. When it decides several URLs are duplicates, it groups them and picks one as canonical: the URL it crawls most, shows in search results and attributes links to. The others stay in the group but are not shown.

You can also send the same hint as an HTTP header, which is the only option for files that have no HTML head, such as a PDF:

\`\`\`
Link: <https://www.example.com/report.pdf>; rel="canonical"
\`\`\`

Two things the tag does **not** do. It does not stop a URL being crawled, and it does not remove a page from the index on its own. For those jobs you need robots.txt or a \`noindex\` rule, and the two must never be combined with a canonical pointing at the blocked page.`,
    },
    {
      heading: "How Google picks a canonical URL",
      body: `Google's canonicalization documentation lists the signals it weighs, and your tag is one of them, not the decision. The main inputs:

1. **Redirects.** A 301 from A to B is the strongest statement that B is the real address.
2. **The rel=canonical annotation**, in the HTML or the HTTP header.
3. **Internal links.** Which version the site itself links to, consistently.
4. **Sitemap inclusion.** Listing only canonical URLs in your XML sitemap is a mild signal.
5. **HTTPS and URL tidiness.** Google prefers the secure, cleaner-looking URL of a duplicate pair.

Because it is a hint, Search Console's Page indexing report sometimes says "Duplicate, Google chose different canonical than user". That means the signals disagreed with each other. The fix is almost never to repeat the tag more forcefully; it is to make the other four signals agree with it.

The two URLs in a canonical pair should have genuinely equivalent content. If they differ substantially, Google is likely to treat them as separate pages and ignore the tag. Use the ${t("meta-tags-analyzer", "meta tags analyzer")} to read the canonical a page actually sends, which is often not the one in the template you edited.`,
    },
    {
      heading: "The right canonical for each situation",
      body: `**Ordinary page.** Self-referencing, absolute, matching the exact URL you want indexed, including protocol, host, trailing slash and letter case.

**Paginated series.** Each page of a list canonicalises to itself, not to page one. Google retired \`rel=next\`/\`rel=prev\` support, and pointing page 3 at page 1 tells it to drop page 3's content, including links to items only listed there.

**Filtered and sorted views.** Canonicalise \`/shoes/?sort=price\` to \`/shoes/\`, because the sort order is the same set of items. Do not canonicalise \`/shoes/?colour=blue\` to \`/shoes/\` if the filtered page is a genuinely distinct, useful set that people search for.

**Syndicated or republished articles.** The copy canonicalises to the original. Google's guidance on syndication is to ask partners for a canonical or a \`noindex\` on their copy.

**Variant protocols and hosts.** Don't rely on the tag. Redirect http to https and the non-preferred host to the preferred one with a 301, then let every page self-canonicalise. The ${t("redirect-checker", "redirect checker")} shows whether those hops land in one step.

**Mobile URLs on a separate host.** The m-dot page canonicalises to the desktop URL and the desktop page carries \`rel="alternate"\` to the mobile one.

The ${t("canonical-url-generator", "canonical URL generator")} normalises a messy address into the single form you can then use everywhere.`,
    },
    {
      heading: "Mistakes that cost you indexing",
      body: `These are the failures worth checking for by hand, because most of them produce no error anywhere:

- **Every page canonicalising to the homepage.** A classic plugin misconfiguration. It asks Google to index one page and discard the rest of the site.
- **Relative URLs.** \`href="/shoes/"\` is legal but resolves against the current page, so a staging host or a URL with a stray path segment produces a canonical nobody intended. Use absolute URLs.
- **Two canonical tags on one page.** Google ignores both when they conflict. This happens when a theme and an SEO plugin each add one.
- **Canonical to a URL that redirects.** The hint and the redirect point in opposite directions; make the canonical the final destination.
- **Canonical to a page blocked by robots.txt or carrying noindex.** Google cannot confirm the duplicate relationship, so it falls back to its own choice.
- **Canonical in the \`<body>\`.** Only \`<head>\` counts, and an unclosed tag earlier in the head can push it out of the head in the parsed document.
- **Mixing canonical and hreflang incorrectly.** Each language version self-canonicalises; hreflang then connects the set. A canonical from the French page to the English one removes the French page.

A quick audit: fetch a sample of URL types (homepage, category, product, paginated page, filtered page, a PDF) and compare the canonical each one sends against the URL you want in the index. The ${t("website-seo-score-checker", "website SEO score checker")} flags missing and mismatched canonicals on a single page as part of its on-page checks.`,
    },
  ],
  sources: [
    { label: "RFC 6596: The Canonical Link Relation", url: "https://www.rfc-editor.org/rfc/rfc6596.html" },
    { label: "Google Search Central: How to specify a canonical URL", url: "https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls" },
    { label: "Google Search Central: Canonicalization", url: "https://developers.google.com/search/docs/crawling-indexing/canonicalization" },
    { label: "Google Search Central: Pagination best practices", url: "https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading" },
    { label: "Google Search Central: Syndicated content", url: "https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls#syndication" },
  ],
});
