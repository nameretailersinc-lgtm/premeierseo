import { defineGuide, toolLink as t } from "./shared";

export const writeTitleTagsMetaDescriptions = defineGuide({
  slug: "write-title-tags-meta-descriptions",
  title: "How to Write Title Tags and Meta Descriptions People Click",
  h1: "How to write title tags and meta descriptions",
  metaDescription:
    "Length in pixels, matching the query, brand placement, why Google rewrites titles and snippets, and examples for tool, product and blog pages.",
  summary:
    "Write a title that names the page's main task or topic in the words people search for, puts those words first and fits in about 600 pixels (roughly 50–60 characters). Write a meta description of about 120–155 characters that answers the query and gives one concrete reason to click. Google may rewrite either one, most often when it is vague, stuffed with keywords, repeated across pages or inaccurate.",
  cluster: "On-page SEO",
  tools: ["title-tag-generator", "meta-description-generator", "serp-simulator", "meta-tags-analyzer"],
  body: [
    {
      heading: "What title tags and descriptions do",
      body: `Both live in the page's \`<head>\`:

\`\`\`
<title>Compress PDF – Reduce PDF File Size Online</title>
<meta name="description" content="Reduce PDF file size by downsampling images and removing unused data. Pick a quality level, compare before and after sizes, and download.">
\`\`\`

The **title element** is Google's main source for the clickable headline in search results, which Google calls the title link. It also labels the browser tab and is the default text when someone bookmarks or shares the page. It tells search engines what the page is about, so it is worth writing deliberately for every indexable page.

The **meta description** is a summary that Google may show as the snippet under the title. Google has said since 2009 that it doesn't use the description in ranking, so its job is entirely to persuade: a searcher who reads it should know they have found the right page. Google often builds the snippet from the page text instead, especially for queries the description doesn't address.`,
    },
    {
      heading: "Length: pixels, not characters",
      body: `Google truncates title links and snippets "as needed, typically to fit the device width". It publishes no character limit. Snippet tools estimate the cut-off at about 600 px for a desktop title in Arial 20 px, about 920 px for a desktop description and about 680 px on mobile, at 13 px.

Because letters have different widths, the character count is only a proxy. We measured the 208 titles and descriptions in our own keyword plan with Arial-compatible widths. Titles averaged 9.5 px per character, so about 63 characters fit in 600 px; descriptions averaged 5.8 px per character, so about 158 fit in 920 px and 117 in 680 px. Individual strings vary a lot:

| Text at 20 px | Characters | Width |
|---|---|---|
| "WWWWWWWWWW" | 10 | 189 px |
| "iiiiiiiiii" | 10 | 44 px |
| "MB TO KB CONVERTER – CONVERT MEGABYTES TO KILOBYTES ONLINE" | 58 | about 700 px: cut off |
| "Compress PDF – Reduce PDF File Size Online" | 42 | about 420 px |

Practical targets: titles of 50–60 characters in normal sentence or title case, descriptions of 120–155 characters, with the most important words in the first 40 or so characters of each, since mobile layouts cut descriptions sooner. Going over is not a penalty; the end is simply replaced with an ellipsis. The ${t("serp-simulator", "SERP simulator")} draws both at desktop and mobile widths so you can see exactly where the cut falls.`,
    },
    {
      heading: "Matching the searcher's query",
      body: `A title earns the click when it repeats the searcher's task in their own words. Before writing, look at the results page for your main query and note the vocabulary people and competing pages use: "compress" or "reduce size", "KB" or "kilobytes", "how to" or a plain noun.

For titles:

1. Lead with the primary phrase, as a task or a name: "Compress PDF", "How Many Pages Is 1,000 Words?".
2. Add one differentiator after a separator: what the page does better or more specifically ("to 100KB", "words-to-pages table", "sizes 5–12").
3. Keep one topic per title. A title listing five keyword variations reads as spam and is a common trigger for a rewrite.

For descriptions:

1. Answer or restate the query in the first sentence.
2. Give concrete detail: numbers, formats, steps, price, delivery time, what is included.
3. End with what the reader can do on the page, if it isn't obvious.

Every indexable page needs its own title and description. Two pages that would share one usually target the same intent, and should probably be merged. The ${t("title-tag-generator", "title tag generator")} and ${t("meta-description-generator", "meta description generator")} build drafts from your keyword and a short summary of the page, and check each against the pixel limits.`,
    },
    {
      heading: "Brand names and separators",
      body: `Google's guidance is to include the site name "at the beginning or end" of the title, "separated from the rest of the text with a delimiter" such as a hyphen, en dash, colon or pipe. Put it at the end on most pages: searchers scan the first words, and the brand is the part you can most afford to lose to truncation.

Two exceptions:

- **The homepage** usually leads with the brand, because the brand is what people search for.
- **Well-known brands** sometimes lead with the brand everywhere, because the name itself earns the click.

Google also shows a separate site name above the title link, taken from \`WebSite\` structured data and other signals. If your site name appears there reliably, a brand suffix on every title repeats it and costs 15–25 characters; some sites, including this one, drop the suffix from tool and guide pages for that reason. Whatever you choose, keep the separator and brand form consistent across the site, since mixed patterns look like micro-boilerplate.`,
    },
    {
      heading: "Why Google rewrites them",
      body: `Google can build the title link from other sources: the main visible heading, other headings, \`og:title\`, anchor text in links to the page, and the site name. Its documentation lists the problems that most often lead it to do so:

| Problem | Example | Fix |
|---|---|---|
| Half-empty title | "Example Store" alone | Describe the page, then the brand |
| Obsolete | "Prices for 2024" in a page updated since | Update titles when content changes |
| Inaccurate | A title promising "free download" on a paid page | Make the title match the page |
| Micro-boilerplate | "Example Store – Shoes" on 40 shoe pages | Add the distinguishing detail: style, size, color |
| Unclear main heading | Several headings styled equally large | One prominent H1 that agrees with the title |
| Language mismatch | An English title on a Spanish page | Write the title in the page's language |

Keyword stuffing and very long titles are rewritten too. Descriptions are replaced more often than titles, because Google picks whichever text best matches each query; a page that ranks for many different queries will show different snippets for them. You can't force Google to use your text, but a specific, accurate description is used more often than a generic one. The \`nosnippet\` and \`max-snippet\` robots rules limit snippets, but they don't make Google prefer your description.

To check what you have actually published, the ${t("meta-tags-analyzer", "meta tag analyzer")} reads the title, description, robots and canonical tags from a live URL and shows the exact text behind each result.`,
    },
    {
      heading: "Examples by page type",
      body: `Widths are estimates for Arial 20 px titles and 13 px descriptions. "Example Store" and "Example Plumbing" are made-up businesses.

| Page type | Weak title | Better title | Width |
|---|---|---|---|
| Online tool | PDF Compressor PDF Compress PDF Reduce PDF Size PDF Tools Online PDF | Compress PDF – Reduce PDF File Size Online | about 420 px |
| Product | Product 4471 \\| Example Store | Waterproof Hiking Boots for Women – Sizes 5–12 \\| Example Store | about 585 px |
| Category | Shoes | Women's Running Shoes – Road, Trail and Wide Fit \\| Example Store | about 605 px: brand may be cut, which is acceptable |
| Blog post | Blog Post | How Many Pages Is 1,000 Words? Words-to-Pages Table | about 505 px |
| Local service | Plumber Leeds, Plumbers Leeds, Emergency Plumber Leeds, Cheap Plumber | 24-Hour Emergency Plumber in Leeds \\| Example Plumbing | about 525 px |

Descriptions for the same pages:

- **Tool:** "Reduce PDF file size by downsampling images and removing unused data. Pick a quality level, compare before and after sizes, and download." (137 characters, about 815 px)
- **Product:** "Waterproof leather hiking boots for women in sizes 5–12, including wide fit. 620 g per boot. Free returns within 30 days." (121 characters, about 680 px)
- **Blog post:** "Page counts for 500 to 10,000 words at single and double spacing, with the font and margin assumptions behind them, plus reading and speaking times." (148 characters, about 875 px)
- **Local service:** "Our plumbers are available around the clock. Fixed call-out fee shown before we arrive. Most leaks fixed on the first visit. Covering all LS postcodes." (151 characters, about 845 px)

Compare those with the description many sites still ship: "Welcome to our website. We offer a wide range of products and services for all your needs." It fits easily, and says nothing a searcher can use. For limits on social posts and other platforms, see the [character limits cheat sheet](/blog/character-limits-cheat-sheet/).`,
    },
  ],
  sources: [
    { label: "Google Search Central: Influencing title links in search results", url: "https://developers.google.com/search/docs/appearance/title-link" },
    { label: "Google Search Central: Control your snippets in search results", url: "https://developers.google.com/search/docs/appearance/snippet" },
    { label: "Google Search Central Blog: Google does not use the keywords meta tag in web ranking (2009)", url: "https://developers.google.com/search/blog/2009/09/google-does-not-use-keywords-meta-tag" },
    { label: "Google Search Central: Site names in Google Search", url: "https://developers.google.com/search/docs/appearance/site-names" },
    { label: "Google Search Central: Robots meta tag, data-nosnippet and X-Robots-Tag", url: "https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag" },
  ],
});
