import { defineGuide, toolLink as t } from "./shared";

export const robotsTxtGuide = defineGuide({
  slug: "robots-txt-guide",
  title: "Robots.txt: Syntax, Examples and Common Mistakes",
  h1: "Robots.txt guide with examples",
  metaDescription:
    "How robots.txt rules are read, copy-ready examples (WordPress, staging sites, AI crawlers), and the mistakes that accidentally block a whole site.",
  summary:
    "robots.txt is a plain-text file at the root of a host (example.com/robots.txt) that tells crawlers which paths they may fetch. Each crawler follows the one group of rules that names it most specifically, and within that group the longest matching rule wins. It controls crawling, not indexing: to keep a page out of search results, use `noindex` and let crawlers see it.",
  cluster: "Technical SEO",
  tools: ["robots-txt-generator", "robots-txt-tester", "xml-sitemap-generator", "meta-tag-generator"],
  body: [
    {
      heading: "How crawlers read robots.txt",
      body: `The Robots Exclusion Protocol is standardized as RFC 9309. Google, Bing and the main AI crawlers follow it, with small extensions.

**Where it goes.** At the top level of each host, over each protocol: \`https://www.example.com/robots.txt\` covers only that host. \`https://shop.example.com\` and \`http://example.com\` need their own files. A robots.txt inside a folder is ignored.

**Groups.** A group starts with one or more \`User-agent\` lines followed by \`Allow\` and \`Disallow\` rules. A crawler uses only the group that matches its name most specifically, and falls back to the \`User-agent: *\` group only if no group names it. Groups are not combined with the \`*\` group.

**Matching.** Rules match the start of the URL path, case-sensitively. \`*\` matches any run of characters and \`$\` anchors the end of the URL. When several rules match, the one with the longest path wins; on a tie, Google applies the less restrictive rule (Allow).

| Rules in the group | URL | Result | Why |
|---|---|---|---|
| \`Disallow: /shop/\` and \`Allow: /shop/sale/\` | /shop/cart | Blocked | Only the Disallow matches |
| Same rules | /shop/sale/boots | Allowed | /shop/sale/ (11 characters) is longer than /shop/ (6) |
| \`Allow: /page\` and \`Disallow: /*.php\` | /page.php | Blocked | \`/*.php\` (6 characters) is longer than \`/page\` (5) |
| \`Allow: /docs\` and \`Disallow: /docs\` | /docs/a | Allowed | Equal length, so the less restrictive rule applies |
| \`Disallow: /admin\` | /administrator-guide/ | Blocked | Rules are prefixes; use /admin/ for the folder only |

**Other details.** Google reads up to 500 KiB of the file and caches it for up to 24 hours. If robots.txt returns a 4xx error, Google assumes there are no restrictions; if it returns a 5xx error, Google treats the whole site as blocked for a while, so a broken robots.txt can stop crawling entirely. \`Sitemap:\` lines are supported anywhere in the file. Google ignores \`crawl-delay\`, and it stopped honoring \`noindex\` lines in robots.txt in 2019.`,
    },
    {
      heading: "Examples you can copy",
      body: `Replace example.com with your own host. Lines starting with \`#\` are comments.

**Allow everything and list the sitemap.** An empty \`Disallow\` blocks nothing:

\`\`\`
User-agent: *
Disallow:

Sitemap: https://www.example.com/sitemap.xml
\`\`\`

**Block internal search, the cart and sorted duplicates:**

\`\`\`
User-agent: *
Disallow: /search
Disallow: /cart/
Disallow: /*?sort=
Disallow: /*&sort=
\`\`\`

\`/search\` also blocks /search/ and /searching; add a trailing slash if you mean only the folder.

**Block PDFs only:**

\`\`\`
User-agent: *
Disallow: /*.pdf$
\`\`\`

**WordPress.** This matches the file WordPress generates by default, with the core sitemap that WordPress has included since version 5.5. Don't block /wp-content/ or /wp-includes/: they hold the CSS, JavaScript and images Google needs to render your pages.

\`\`\`
User-agent: *
Disallow: /wp-admin/
Allow: /wp-admin/admin-ajax.php

Sitemap: https://www.example.com/wp-sitemap.xml
\`\`\`

**Staging or development site.** Block crawling, but don't rely on it: put the site behind a password (HTTP authentication) too. robots.txt is public and voluntary, and blocked URLs can still be indexed if someone links to them.

\`\`\`
User-agent: *
Disallow: /
\`\`\`

The ${t("robots-txt-generator", "robots.txt generator")} builds these files from checkboxes, and the ${t("xml-sitemap-generator", "XML sitemap generator")} creates the sitemap the \`Sitemap:\` line should point to.`,
    },
    {
      heading: "Blocking AI crawlers",
      body: `AI companies publish separate user-agent tokens for training, for their search features and for fetches a user asks for. The main ones, as documented by each company in October 2026:

| Token | Company | What it is for | Follows robots.txt |
|---|---|---|---|
| GPTBot | OpenAI | Collecting content for model training | Yes |
| OAI-SearchBot | OpenAI | Showing sites in ChatGPT search | Yes |
| ChatGPT-User | OpenAI | Fetches a ChatGPT user asks for | OpenAI says robots.txt rules "may not apply" |
| ClaudeBot | Anthropic | Collecting content for model training | Yes |
| Claude-SearchBot | Anthropic | Indexing for Claude's search results | Yes |
| Claude-User | Anthropic | Fetches a Claude user asks for | Yes |
| Google-Extended | Google | Gemini training and grounding; not a separate crawler | Yes; doesn't affect Google Search |
| Applebot-Extended | Apple | Apple foundation-model training; doesn't crawl | Yes; Applebot still indexes for Apple search |
| PerplexityBot | Perplexity | Perplexity search results; not used for training | Yes |
| Perplexity-User | Perplexity | Fetches a Perplexity user asks for | Perplexity says it "generally ignores" robots.txt |
| CCBot | Common Crawl | The open Common Crawl dataset, widely used for AI training | Yes |

**How do I block GPTBot?** Give it its own group. This example opts out of training for the crawlers above while leaving search and AI-search crawlers alone:

\`\`\`
User-agent: GPTBot
User-agent: ClaudeBot
User-agent: Google-Extended
User-agent: Applebot-Extended
User-agent: CCBot
Disallow: /

User-agent: *
Disallow:
\`\`\`

Decide deliberately about the search bots. Blocking OAI-SearchBot, Claude-SearchBot or PerplexityBot removes your pages from those products' answers and citations, which may cost traffic. Blocking Google-Extended doesn't remove you from Google Search; AI features inside Google Search are governed by Googlebot and the usual snippet controls such as \`nosnippet\`.

robots.txt is a request, not an enforcement mechanism: RFC 9309 states that its rules "are not a form of access authorization". Crawlers that ignore it have to be blocked at the server or CDN.`,
    },
    {
      heading: "robots.txt vs noindex",
      body: `**Does robots.txt remove pages from Google?** No. It stops crawling, not indexing. Google's documentation says a disallowed page can still be indexed and shown "without a snippet" if other pages link to it.

| Goal | Use | Notes |
|---|---|---|
| Stop crawlers wasting time on endless URLs (filters, internal search) | robots.txt \`Disallow\` | URLs already indexed may remain for a while |
| Keep a page out of search results | \`<meta name="robots" content="noindex">\` | The page must be crawlable, or Google never sees the tag |
| Keep a PDF or image out of results | \`X-Robots-Tag: noindex\` HTTP header | Works for files that have no HTML head |
| Hide private content | Password protection | Neither robots.txt nor noindex is access control |
| Remove a URL urgently | Search Console Removals tool, then noindex or delete | Removals are temporary on their own |

The classic mistake is combining them: adding \`noindex\` to a page and also disallowing it. The crawler can't fetch the page, never sees the \`noindex\`, and the URL can stay indexed. Allow crawling until the page has dropped out, then block it if you still need to. The ${t("meta-tag-generator", "meta tag generator")} writes the robots meta tag for you.`,
    },
    {
      heading: "Common mistakes",
      body: `These are the errors that do the most damage, roughly in order:

1. **\`Disallow: /\` left over from staging.** One line blocks the whole site. Check robots.txt as part of every launch.
2. **A specific group that cancels the general one.** Adding \`User-agent: Googlebot\` with a single rule means Googlebot ignores everything in the \`*\` group. Repeat the shared rules in each named group.
3. **Blocking CSS, JavaScript or image folders.** Google renders pages like a browser; blocked resources can make pages look broken or empty to it.
4. **Using robots.txt to hide things.** The file is public, so a list of "secret" folders is a map for anyone curious. Use authentication.
5. **Prefix surprises.** \`Disallow: /blog\` also blocks /blog-archive/ and /blogroll. Paths are case-sensitive, so /Images/ and /images/ are different rules.
6. **Wrong place.** The file must be at the root of the exact host and protocol, and each subdomain needs its own.
7. **Server errors.** A robots.txt that returns 500 or times out can make Google treat the whole site as blocked until the file is reachable again.
8. **Unsupported lines.** \`Noindex:\` and \`Crawl-delay:\` in robots.txt do nothing for Google; use meta tags, headers and Search Console instead.

Before publishing changes, paste the new rules into the ${t("robots-txt-tester", "robots.txt tester")} and check important URLs against Googlebot and any AI crawlers you care about. It shows which rule decided each result, which catches mistakes 2 and 5 immediately.`,
    },
  ],
  sources: [
    { label: "RFC 9309: Robots Exclusion Protocol", url: "https://www.rfc-editor.org/rfc/rfc9309.html" },
    { label: "Google Search Central: How Google interprets the robots.txt specification", url: "https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt" },
    { label: "Google Search Central: Block Search indexing with noindex", url: "https://developers.google.com/search/docs/crawling-indexing/block-indexing" },
    { label: "Google Search Central Blog: A note on unsupported rules in robots.txt (2019)", url: "https://developers.google.com/search/blog/2019/07/a-note-on-unsupported-rules-in-robotstxt" },
    { label: "Google: Google's common crawlers (Google-Extended)", url: "https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers" },
    { label: "OpenAI: Overview of OpenAI crawlers", url: "https://developers.openai.com/api/docs/bots" },
    { label: "Anthropic: Does Anthropic crawl data from the web, and how can site owners block the crawler?", url: "https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler" },
    { label: "Apple Support: About Applebot", url: "https://support.apple.com/en-us/119829" },
    { label: "Perplexity: Perplexity crawlers", url: "https://docs.perplexity.ai/guides/bots" },
    { label: "Common Crawl: CCBot", url: "https://commoncrawl.org/ccbot" },
    { label: "WordPress Developer Resources: do_robots()", url: "https://developer.wordpress.org/reference/functions/do_robots/" },
  ],
});
