import { defineGuide, toolLink as t } from "./shared";

export const noindexVsRobotsTxt = defineGuide({
  slug: "noindex-vs-robots-txt",
  title: "Noindex vs Robots.txt: Which One Blocks What",
  h1: "Noindex vs robots.txt: which one blocks what",
  metaDescription:
    "Robots.txt stops crawling; noindex stops indexing. Why combining them backfires, how blocked pages still appear in results, and which to use when.",
  summary:
    "Robots.txt controls **crawling**; a `noindex` rule controls **indexing**. They are not interchangeable, and using both on one URL cancels the `noindex`, because Google has to fetch a page to see the rule. Block crawling to save server work; use `noindex` to keep a page out of search results.",
  cluster: "Technical SEO",
  tools: ["robots-txt-generator", "robots-txt-tester", "meta-tags-analyzer", "xml-sitemap-generator"],
  body: [
    {
      heading: "Two different jobs",
      body: `These two mechanisms are confused constantly, and the confusion produces the single most common indexing bug: a page that is supposed to be hidden but appears in results anyway.

**robots.txt** is a crawling instruction, standardised as RFC 9309. A \`Disallow\` rule asks a crawler not to request the URL at all. The file is fetched once and applies site-wide.

\`\`\`
User-agent: *
Disallow: /cart/
\`\`\`

**A robots meta tag or X-Robots-Tag header** is an indexing instruction, delivered by the page itself:

\`\`\`html
<meta name="robots" content="noindex" />
\`\`\`

\`\`\`
X-Robots-Tag: noindex
\`\`\`

The distinction that matters: Google can index a URL it has never crawled. If other pages link to \`/cart/\` with descriptive anchor text, Google knows the URL exists and roughly what it is about, even while obeying the \`Disallow\`. It may list the URL with no snippet, or a snippet assembled from the links pointing at it. Search Console reports this as "Indexed, though blocked by robots.txt".

So the rule is:

- **Do not want it crawled** (wasteful, infinite, server-heavy): robots.txt.
- **Do not want it in search results**: \`noindex\`.
- **Do not want it crawled *or* in results**: \`noindex\` first, and only add the \`Disallow\` later, once the URL has dropped out.`,
    },
    {
      heading: "Why combining them backfires",
      body: `Putting a \`noindex\` on a page and also blocking it in robots.txt is self-defeating. Googlebot obeys the \`Disallow\`, never fetches the page, and therefore never sees the \`noindex\`. The rule you wrote is unreadable to the only party who needs to read it.

The correct sequence for removing a page from search results while eventually also stopping the crawling:

1. Serve \`noindex\` on the page and make sure it is **crawlable**.
2. Wait for Google to recrawl and drop it. Search Console's URL Inspection confirms when the page is "Excluded by 'noindex' tag".
3. Only then, if the crawling itself is a problem, add a \`Disallow\`.

Two related misconceptions:

**\`Noindex:\` in robots.txt does not work.** Google supported it unofficially for years and stopped honouring it on 1 September 2019, when the robots.txt parser was open-sourced and aligned with the draft standard. Lines like \`Noindex: /private/\` are ignored.

**Blocking a page does not remove it from the index.** Adding a \`Disallow\` to a page that is already indexed usually freezes it there, because Google can no longer fetch the page to discover that it has changed or gone.

For genuinely private content, neither tool is the answer. robots.txt is public and advertises the paths you consider sensitive; \`noindex\` is a request that only well-behaved crawlers honour. Use authentication. The ${t("robots-txt-tester", "robots.txt tester")} shows which rule matches a given URL and user-agent, which is how you verify a \`Disallow\` is not accidentally blocking a page you expect to be indexed.`,
    },
    {
      heading: "Robots.txt syntax that trips people up",
      body: `RFC 9309 defines the format, and a handful of details cause most real-world mistakes.

**Matching is by prefix, and \`*\` and \`$\` are the only wildcards.** \`Disallow: /print\` blocks \`/print/\`, \`/printers/\` and \`/print-queue\`. If you mean the directory, write \`/print/\`.

**The most specific rule wins, not the first.** Google resolves conflicts by the length of the matching path, with \`Allow\` winning ties. This makes the carve-out pattern work:

\`\`\`
User-agent: *
Disallow: /assets/
Allow: /assets/css/
\`\`\`

**A crawler obeys exactly one group.** It picks the most specific matching \`User-agent\` and ignores every other group, including \`*\`. So a group for \`Googlebot\` must repeat any rules from the \`*\` group that should still apply.

**\`Disallow:\` with an empty value allows everything**, while \`Disallow: /\` blocks the whole site. One character separates "open" from "closed".

**Case matters in paths** (\`/Admin/\` and \`/admin/\` are different) but not in field names.

**The file must be at the host root**, as \`/robots.txt\`, and applies per host and protocol. \`https://example.com\` and \`https://shop.example.com\` need their own files.

**\`Crawl-delay\` is ignored by Google.** Bing and some others honour it. To slow Google down, fix what makes crawling expensive or use the crawl-rate controls in Search Console.

Never block CSS or JavaScript that the page needs to render. Google renders pages, and blocking the assets makes it evaluate a broken layout. The ${t("robots-txt-generator", "robots.txt generator")} produces a file with correctly ordered groups and the \`Sitemap\` directive placed outside them, which is where every crawler expects it.`,
    },
    {
      heading: "Choosing the right control, page by page",
      body: `A short decision table for the cases that come up most:

| Page type | Right control | Why |
|---|---|---|
| Cart, checkout, account | \`noindex\`, crawlable | Keeps them out of results; no value in blocking the crawl |
| Internal search results | \`noindex\` | Near-infinite, thin, and duplicate the pages they list |
| Faceted filter URLs | \`Disallow\` the parameter patterns | The problem is crawl waste, not indexing |
| Staging site | HTTP authentication | A \`Disallow\` leaks the URLs and is not enforcement |
| Thank-you and confirmation pages | \`noindex\` | Should never be a landing page |
| Paginated pages 2+ | Indexable, self-canonical | They contain items found nowhere else |
| PDFs you do not want indexed | \`X-Robots-Tag: noindex\` header | A PDF has no HTML head for a meta tag |
| Tag archives duplicating categories | \`noindex\`, or consolidate | Removes duplication without hiding the content |
| Old campaign landing pages | 410, or 301 to a successor | Gone means gone; a redirect needs a real equivalent |

Two cross-checks are worth running after any change. First, confirm the page really sends what you think: read the live tags with the ${t("meta-tags-analyzer", "meta tags analyzer")}, since a plugin and a template can each add a robots meta tag and the stricter one wins. Second, make sure your ${t("xml-sitemap-generator", "XML sitemap")} does not list URLs you have just marked \`noindex\` or disallowed, because asking Google to index a page you have told it to ignore is a contradiction it reports back to you.

One useful extra value: \`noindex, follow\` keeps a page out of results while still letting Google use its outgoing links, which suits paginated or filtered views you want crawled but not listed.`,
    },
  ],
  sources: [
    { label: "RFC 9309: Robots Exclusion Protocol", url: "https://www.rfc-editor.org/rfc/rfc9309.html" },
    { label: "Google Search Central: Robots meta tag, data-nosnippet, and X-Robots-Tag specifications", url: "https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag" },
    { label: "Google Search Central: Introduction to robots.txt", url: "https://developers.google.com/search/docs/crawling-indexing/robots/intro" },
    { label: "Google Search Central: How to write and submit a robots.txt file", url: "https://developers.google.com/search/docs/crawling-indexing/robots/create-robots-txt" },
    { label: "Google Search Central Blog: A note on unsupported rules in robots.txt", url: "https://developers.google.com/search/blog/2019/07/a-note-on-unsupported-rules-in-robotstxt" },
  ],
});
