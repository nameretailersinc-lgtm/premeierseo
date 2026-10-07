import type { ToolDef } from "@/lib/types";

/*
 * Free SEO tools. Titles, H1s, descriptions and H2 outlines follow docs/keyword-map.json; where the map promised
 * something the tool doesn't do (autocomplete data, crawling), the text was corrected to what it really does.
 * Examples are real outputs of the code in src/tools/lib/seo (run with tsx). URL examples use example.com and
 * are marked as illustrative.
 */

const UPDATED = "2026-09-30";

const GSC = {
  titleLinks: { label: "Google Search Central: Influencing title links", url: "https://developers.google.com/search/docs/appearance/title-link" },
  snippets: { label: "Google Search Central: Control your snippets in search results", url: "https://developers.google.com/search/docs/appearance/snippet" },
  specialTags: { label: "Google Search Central: Meta tags and attributes that Google supports", url: "https://developers.google.com/search/docs/crawling-indexing/special-tags" },
  robotsMeta: { label: "Google Search Central: Robots meta tag, data-nosnippet and X-Robots-Tag", url: "https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag" },
  canonical: { label: "Google Search Central: How to specify a canonical URL", url: "https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls" },
  keywordsTag: { label: "Google Search Central Blog: Google does not use the keywords meta tag in web ranking (2009)", url: "https://developers.google.com/search/blog/2009/09/google-does-not-use-keywords-meta-tag" },
  siteNames: { label: "Google Search Central: Site names in Google Search", url: "https://developers.google.com/search/docs/appearance/site-names" },
  favicon: { label: "Google Search Central: Define a favicon to show in search results", url: "https://developers.google.com/search/docs/appearance/favicon-in-search" },
  ogp: { label: "The Open Graph protocol (ogp.me)", url: "https://ogp.me/" },
  xCards: { label: "X Developer Platform: Cards markup reference", url: "https://developer.x.com/en/docs/x-for-websites/cards/overview/markup" },
};

export const SEO_TOOLS: ToolDef[] = [
  /* ------------------------------------------------------------------ meta tags analyzer */
  {
    id: "meta-tags-analyzer",
    path: "/meta-tags-analyzer/",
    name: "Meta Tags Analyzer",
    h1: "Meta Tags Analyzer",
    title: "Meta Tag Analyzer – Check Title, Description and OG Tags",
    metaDescription:
      "Enter a URL to check its title, meta description, robots, canonical, Open Graph and X card tags, with length checks and a search snippet preview.",
    summary:
      "Check the title, meta description, robots, canonical, viewport, Open Graph and X card tags of any page, with pixel-width estimates and the exact tag text behind every result.",
    category: "free-seo-tools",
    subgroup: "onpage",
    card: "Check a page's title, description, robots, canonical and social tags.",
    archetype: "url",
    widget: "meta-tags",
    config: { mode: "analyze" },
    aliases: ["meta tag checker", "meta tags checker", "check meta tags", "seo meta tag checker", "meta description checker", "title tag checker", "meta analyzer", "head tag checker", "metatag analyser"],
    keywords: ["title", "description", "canonical", "robots", "open graph", "audit"],
    processing: "server",
    pasteMode: true,
    limits: [
      "Reads the HTML your server sends. Tags added later by JavaScript are not seen.",
      "Pixel widths are estimates based on Arial; Google doesn't publish exact limits.",
    ],
    steps: [
      "Choose **Check a URL** and enter the page address, or choose **Paste HTML** to check source code that isn't live yet.",
      "Press **Analyze tags** (or **Analyze HTML**).",
      "Read the **Checks** list: each line shows a pass, warning or problem with the tag text it found and what to change.",
      "Compare the desktop preview with what you expect, then use **All tags found** and **Copy table** to keep a record.",
    ],
    example: {
      title: "Example: checking a draft page (pasted HTML)",
      input:
        '<title>How to Make a Sourdough Starter From Scratch: Feeding, Storing and Reviving It</title>\n<meta name="description" content="Make a sourdough starter with flour and water.">\n<link rel="canonical" href="https://www.example.com/baking/sourdough-starter/">\n<meta property="og:image" content="/images/starter.jpg">',
      output:
        "Warning  Title tag: 78 characters, about 724 px. Wider than about 600 px, so desktop results will probably cut it off.\nWarning  Meta description: 46 characters, about 268 px. Short descriptions are more likely to be replaced.\nPass     Canonical tag: https://www.example.com/baking/sourdough-starter/\nProblem  og:image: “/images/starter.jpg”. Must be a full URL starting with https://.",
      note: "Output from the **Load sample HTML** button, shortened. The full report also checks robots, viewport, language, charset, og:title, og:description and twitter:card.",
    },
    sections: [
      {
        heading: "What the analyzer checks",
        body: "| Tag | What we look for |\n|---|---|\n| `<title>` | Present, only one, estimated width against ~600 px |\n| Meta description | Present, only one, length against ~920 px (desktop) and ~680 px (mobile) |\n| Robots meta and `X-Robots-Tag` | `noindex`, `nofollow` or `none`, in the HTML and in the HTTP header |\n| Canonical | Present, only one URL, and whether it points at the page you checked |\n| Viewport | `width=device-width`, and no settings that block zooming |\n| `lang`, charset, favicon | Declared, so text is read and shown correctly |\n| Open Graph and X cards | og:title, og:description, og:image (absolute URL), og:url, twitter:card |\n\nIn URL mode our server requests the page like a crawler, follows redirects and reports the status code and the final URL it analyzed.",
      },
      {
        heading: "Title and description length (pixels vs characters)",
        body: "Google cuts titles and snippets by the space they take on screen, not by a character count. A title of capital Ws runs out of room far sooner than one of lowercase i's. We estimate width from Arial character widths at 20 px for titles and 13 px for descriptions, then compare against the limits most snippet tools use: about **600 px** for a desktop title, **920 px** for a desktop description and **680 px** on mobile.\n\nThese are rules of thumb. Google publishes no limit, uses different fonts on different devices and rewrites many titles anyway. Treat \"likely truncated\" as a prompt to put the important words first, not as an error.",
      },
      {
        heading: "Robots and canonical tags",
        body: "A `noindex` in the robots meta tag or in an `X-Robots-Tag` HTTP header keeps the page out of search results; the analyzer flags it as a problem because it's rarely intended on a page someone is checking. `nofollow` on the whole page is flagged as a warning.\n\nFor canonicals, one absolute URL pointing at the page itself is the safe default. Two different canonical URLs on one page is a problem: Google may ignore both. A canonical pointing elsewhere is shown as a note, because it is correct on a duplicate page and harmful on the main one; only you know which this is.",
      },
      {
        heading: "Open Graph and X card tags",
        body: "Social platforms ignore the `<title>` and description when Open Graph tags exist. The analyzer checks `og:title`, `og:description`, `og:image` and `og:url`, and that the image and URL are absolute: platforms don't resolve `/images/photo.jpg` against your domain. It also reads `twitter:card`, which chooses the layout on X; X takes the text and image from Open Graph when the `twitter:` versions are missing. For image size checks and previews, use the [Open Graph checker](/open-graph-checker/).",
      },
      {
        heading: "Fixing common meta tag problems",
        body: "- **Title too wide:** lead with the topic, move the brand to the end or drop it.\n- **Duplicate title or description tags:** usually a theme and an SEO plugin both writing tags. Turn one off.\n- **Missing description:** write one that answers the searcher's question in one or two sentences.\n- **Unexpected noindex:** check staging settings (WordPress: Settings → Reading → \"Discourage search engines\").\n- **Relative og:image:** use the full `https://` URL.\n\nTo write replacements, use the [meta tag generator](/meta-tag-generator/) and preview them in the [SERP simulator](/serp-simulator/).",
      },
    ],
    faq: [
      {
        q: "Why does Google show a different title?",
        a: "Google rewrites title links when it judges the `<title>` to be too long, stuffed with keywords, boilerplate or not matching the page. It often uses the main heading or anchor text instead. A concise, unique title that matches the H1 is rewritten less often.",
      },
      {
        q: "Does Google use the meta keywords tag?",
        a: "No. Google said in 2009 that it ignores the keywords meta tag for ranking. The analyzer lists it as a note so you know it's there; removing it does no harm.",
      },
      {
        q: "What if a page has two canonical tags?",
        a: "If both point to the same URL, it's harmless duplication. If they point to different URLs, Google may ignore all of them and choose a canonical itself. Find which plugin or template adds the second tag and remove it.",
      },
      {
        q: "Why are some tags missing that I can see in my browser?",
        a: "Your browser's element inspector shows the page after JavaScript has run. The analyzer reads the HTML the server sends. If tags only appear after JavaScript runs, add them to the server-rendered HTML so every crawler sees them.",
      },
    ],
    sources: [GSC.titleLinks, GSC.snippets, GSC.specialTags, GSC.robotsMeta, GSC.canonical, GSC.keywordsTag],
    related: ["meta-tag-generator", "open-graph-checker", "serp-simulator", "heading-tag-extractor", "website-seo-score-checker"],
    links: [
      { href: "/meta-tag-generator/", anchor: "generate meta tags" },
      { href: "/open-graph-checker/", anchor: "Open Graph checker" },
      { href: "/serp-simulator/", anchor: "SERP simulator" },
      { href: "/heading-tag-extractor/", anchor: "heading checker" },
      { href: "/blog/write-title-tags-meta-descriptions/", anchor: "how to write title tags and meta descriptions" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "Fetches any public URL from our server, or analyzes pasted HTML in the browser",
      "Pixel-width estimates for title and meta description",
      "Robots meta, X-Robots-Tag and canonical checks",
      "Open Graph and X card tag checks",
      "Desktop search snippet preview",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 1,
  },

  /* ------------------------------------------------------------------ meta tag generator */
  {
    id: "meta-tag-generator",
    path: "/meta-tag-generator/",
    name: "Meta Tag Generator",
    h1: "Meta Tag Generator",
    title: "Meta Tag Generator – Create SEO, Open Graph and X Tags",
    metaDescription:
      "Fill in a short form to generate the head tags a page needs: title, description, robots, canonical, viewport, Open Graph and X card. Copy the HTML.",
    summary:
      "Fill in one short form to get the head tags a page needs (title, description, robots, canonical, viewport, Open Graph and X card) as HTML you can copy, with a live search preview.",
    category: "free-seo-tools",
    subgroup: "onpage",
    card: "Create title, description, robots, canonical and social tags in one form.",
    archetype: "generator",
    widget: "meta-tags",
    config: { mode: "generate" },
    aliases: ["meta tags generator", "seo meta tag generator", "html meta tags", "generate meta tags", "meta tag maker", "head tags generator", "robots meta tag generator", "metatag generator"],
    keywords: ["head", "html", "seo", "open graph", "twitter"],
    processing: "browser",
    steps: [
      "Type the **Title** and **Meta description**; the meters show the estimated width against Google's usual limits.",
      "Add the **Canonical URL** and choose the **Search engine settings** (indexing, link following, large image previews).",
      "Under **Social sharing**, add a **Share image URL**, **Site name** and **X handle**.",
      "Check the **Search result preview**, then press **Copy** or **Download** under **Your meta tags** and paste the code into the page's `<head>`.",
    ],
    example: {
      title: "Example output",
      input:
        "Title: Sourdough Starter: How to Make, Feed and Store It\nDescription: Make a sourdough starter with flour and water in 7 days. Learn when to feed it, how to store it and how to revive a neglected starter.\nCanonical: https://www.example.com/baking/sourdough-starter/\nog:type: article · Image: https://www.example.com/images/starter-1200x630.jpg\nSite name: Bread Notes · X handle: breadnotes",
      output:
        '<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>Sourdough Starter: How to Make, Feed and Store It</title>\n<meta name="description" content="Make a sourdough starter with flour and water in 7 days. Learn when to feed it, how to store it and how to revive a neglected starter.">\n<link rel="canonical" href="https://www.example.com/baking/sourdough-starter/">\n<meta property="og:title" content="Sourdough Starter: How to Make, Feed and Store It">\n<meta property="og:description" content="Make a sourdough starter with flour and water in 7 days. Learn when to feed it, how to store it and how to revive a neglected starter.">\n<meta property="og:type" content="article">\n<meta property="og:url" content="https://www.example.com/baking/sourdough-starter/">\n<meta property="og:image" content="https://www.example.com/images/starter-1200x630.jpg">\n<meta property="og:site_name" content="Bread Notes">\n<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:site" content="@breadnotes">',
      note: "With indexing and link following allowed (the defaults) no robots tag is written, because index, follow is what search engines assume. The title measures about 457 px, comfortably inside 600 px.",
    },
    sections: [
      {
        heading: "Tags every page needs",
        body: "Only a few head tags matter for search:\n\n- `<meta charset=\"utf-8\">` first in the head, so characters display correctly.\n- `<meta name=\"viewport\" …>` so phones render the page at device width.\n- `<title>`, unique per page: Google's main source for the result title.\n- `<meta name=\"description\">`: often used as the snippet text. It's not a ranking factor, but it affects whether people click.\n- `<link rel=\"canonical\">` when the same content is reachable at more than one URL.\n\nThe generator writes them in that order.",
      },
      {
        heading: "Robots and canonical settings",
        body: "With both **Allow indexing** and **Allow following links** ticked, the generator writes no robots tag at all, because `index, follow` is the default. Untick indexing to add `noindex` (thank-you pages, internal search results), or untick link following to add `nofollow`. **Allow large image previews** adds `max-image-preview:large`, which lets Google show big images from the page in Discover.\n\nIf you set noindex, leave the canonical empty: \"don't index this\" and \"index that URL instead\" send mixed signals, and the generator warns you.",
      },
      {
        heading: "Social tags: Open Graph and X cards",
        body: "Facebook, LinkedIn, Slack, WhatsApp and most chat apps read Open Graph tags. The generator copies your title and description into `og:title` and `og:description`, uses the canonical as `og:url` and adds your share image. X reads Open Graph too, so for X it only adds `twitter:card` (layout) and `twitter:site` (your handle).\n\nFor a share image, 1200 × 630 px (1.91:1) displays well on Facebook, LinkedIn and X large cards. Use an absolute `https://` URL. To fine-tune social tags separately, use the [Open Graph generator](/open-graph-generator/).",
      },
      {
        heading: "Where to paste the code (HTML, WordPress, Next.js)",
        body: "- **Plain HTML:** inside `<head>`, before stylesheets and scripts.\n- **WordPress:** an SEO plugin (Yoast, Rank Math, SEOPress) already writes title, description, canonical and Open Graph tags. Enter your text in the plugin's fields rather than pasting code, or you'll get duplicates.\n- **Next.js (App Router):** use the `metadata` export or `generateMetadata` in `layout.tsx`/`page.tsx`; the framework writes the tags.\n- **Shopify, Wix, Squarespace:** use each page's SEO settings panel.\n\nAfterwards, run the page through the [meta tags analyzer](/meta-tags-analyzer/) to confirm there's exactly one of each tag.",
      },
      {
        heading: "Tags you can skip",
        body: "`keywords`, `revisit-after`, `distribution` and `generator` have no effect on Google. The generator keeps keywords and revisit-after under **Legacy, ignored by Google**, collapsed and off by default, for the rare system that still reads them. You also don't need `<meta name=\"robots\" content=\"index, follow\">`, `<meta http-equiv=\"content-language\">` (use `<html lang>`), or a `googlebot` tag that repeats the robots tag.",
      },
    ],
    faq: [
      {
        q: "Does the meta keywords tag help SEO?",
        a: "No. Google has ignored it for ranking since at least 2009, and Bing has said a stuffed keywords tag can count as a spam signal. That's why it sits under the collapsed legacy section, off by default.",
      },
      {
        q: "Where do I put meta tags in WordPress?",
        a: "Use your SEO plugin's fields for each post or page rather than editing the theme's header.php. Pasting code alongside a plugin produces duplicate titles and descriptions.",
      },
      {
        q: "What image size is best for Open Graph?",
        a: "1200 × 630 pixels, under 5 MB, as JPG or PNG. That ratio fills Facebook and LinkedIn link cards and X's large image card without cropping.",
      },
    ],
    sources: [GSC.specialTags, GSC.robotsMeta, GSC.canonical, GSC.keywordsTag, GSC.ogp, GSC.xCards],
    related: ["meta-tags-analyzer", "title-tag-generator", "meta-description-generator", "open-graph-generator", "serp-simulator"],
    links: [
      { href: "/meta-tags-analyzer/", anchor: "check existing tags" },
      { href: "/open-graph-generator/", anchor: "Open Graph generator" },
      { href: "/title-tag-generator/", anchor: "title tag generator" },
      { href: "/robots-txt-generator/", anchor: "robots.txt generator" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "Title, description, robots, canonical, viewport and charset tags",
      "Open Graph and X card tags from the same fields",
      "Live title and description width meters",
      "Desktop and mobile search preview",
      "Copy or download the HTML",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 1,
  },

  /* ------------------------------------------------------------------ SERP simulator */
  {
    id: "serp-simulator",
    path: "/serp-simulator/",
    name: "SERP Simulator",
    h1: "SERP Simulator",
    title: "SERP Simulator – Preview Your Google Search Snippet",
    metaDescription:
      "Preview how your title, URL and description may appear in Google on desktop and mobile, with pixel-based truncation, dates and breadcrumbs.",
    summary:
      "Type a title, description and URL to preview how the result may look in Google on desktop and mobile, with truncation estimated in pixels rather than characters.",
    category: "free-seo-tools",
    subgroup: "onpage",
    card: "Preview a Google result on desktop and mobile before you publish.",
    archetype: "generator",
    widget: "serp-preview",
    config: { mode: "simulate" },
    aliases: ["serp preview tool", "google snippet preview", "google search result preview", "search snippet tool", "serp preview", "snippet simulator", "google preview tool", "serp checker preview"],
    keywords: ["title", "meta description", "pixel", "truncation", "mobile"],
    processing: "browser",
    limits: ["An estimate of layout and truncation; Google may rewrite titles and snippets."],
    steps: [
      "Type your **Title** and **Meta description**. The meters show estimated pixel width and whether it fits.",
      "Add the **Page URL**; it becomes the breadcrumb line under the site name.",
      "Optionally fill **Site name**, **Date** and **Bold keyword** (Google bolds words that match the search).",
      "Switch the preview between **Desktop** and **Mobile**, then **Copy** the HTML.",
    ],
    example: {
      title: "Example: one description, two devices",
      input:
        "Title: Sourdough Starter: How to Make, Feed and Store It\nDescription: Make a sourdough starter with just flour and water in 7 days. Learn when to feed it, how to store it in the fridge and how to revive a neglected starter.",
      output:
        "Title: 49 characters, ~457 px → fits on desktop\nDescription: 153 characters, ~853 px\nDesktop (920 px): shown in full\nMobile (680 px): “Make a sourdough starter with just flour and water in 7 days. Learn when to feed it, how to store it in the fridge and ...”",
      note: "The same description fits on desktop but is cut on mobile, so the most important point belongs in the first sentence.",
    },
    sections: [
      {
        heading: "Desktop vs mobile snippets",
        body: "On desktop, Google shows the title on one line and cuts it with an ellipsis when it runs out of room; descriptions get roughly two lines. On mobile, titles can wrap onto a second line, so they are cut less often, but descriptions have less room. The preview shows both: desktop truncates the title at about 600 px; mobile wraps it and cuts the description at about 680 px.\n\nBoth layouts show the site name and a breadcrumb-style URL above the title, built here from your page URL (`example.com › baking › sourdough-starter`).",
      },
      {
        heading: "How truncation is calculated",
        body: "Each character has a width: in Arial at 20 px, `W` is about 19 px wide and `i` about 4 px. The simulator adds up character widths (standard Arial metrics) and compares the total with:\n\n| Element | Font size used | Limit |\n|---|---|---|\n| Title | 20 px | ~600 px |\n| Description, desktop | 13 px | ~920 px |\n| Description, mobile | 13 px | ~680 px |\n\nWhen text is over the limit, it's cut at the last whole word that fits and \" ...\" is added. Google publishes none of these numbers; they are the benchmarks snippet tools converge on from observing results.",
      },
      {
        heading: "Site name, favicon and breadcrumbs",
        body: "Google chooses the site name from `WebSite` structured data, `og:site_name`, the title and other signals; enter yours under **Site name** to see it, or leave it empty to show the domain. The favicon is a placeholder here: Google recommends a square favicon of at least 48 × 48 px that Googlebot is allowed to crawl. The URL line can be replaced by your breadcrumb trail if you add `BreadcrumbList` markup with the [schema markup generator](/schema-markup-generator/).",
      },
      {
        heading: "Why the live result may differ",
        body: "- Google rewrites a large share of titles, often using the H1 or anchor text, when the title is long, repetitive or boilerplate.\n- The snippet text is chosen per query. If another passage answers the search better, Google uses that instead of your description.\n- Dates come from the page or structured data, and appear only for some content.\n- Rich results (stars, prices, FAQs) change the layout entirely.\n\nTo see what Google actually shows, search for your page or use the Performance report in Search Console.",
      },
    ],
    faq: [
      {
        q: "Why is my snippet cut off?",
        a: "Because it's wider than the space Google gives it. Widths depend on the letters: wide capitals and symbols use up room fast. Shorten the text or move the key words to the start so the cut falls on less important words.",
      },
      {
        q: "Does Google show the same snippet on mobile?",
        a: "Usually the same text, but mobile has less room for descriptions and lets titles wrap to two lines. A description that fits on desktop is often cut on a phone, which the mobile preview shows.",
      },
      {
        q: "Can I preview rich results?",
        a: "No. This simulator shows the standard blue-link result. For rich results, add structured data and test the live page with Google's Rich Results Test.",
      },
    ],
    sources: [GSC.titleLinks, GSC.snippets, GSC.siteNames, GSC.favicon],
    related: ["title-tag-generator", "meta-description-generator", "meta-tag-generator", "meta-tags-analyzer", "schema-markup-generator"],
    links: [
      { href: "/title-tag-generator/", anchor: "title tag generator" },
      { href: "/meta-description-generator/", anchor: "meta description generator" },
      { href: "/meta-tags-analyzer/", anchor: "meta tag analyzer" },
      { href: "/schema-markup-generator/", anchor: "schema markup generator" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "Desktop and mobile search result previews",
      "Pixel-width truncation for titles and descriptions",
      "Site name, breadcrumb URL, date and keyword bolding",
      "Copy the title and description as HTML",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 2,
  },

  /* ------------------------------------------------------------------ title tag generator */
  {
    id: "title-tag-generator",
    path: "/title-tag-generator/",
    name: "Title Tag Generator",
    h1: "Title Tag Generator",
    title: "Title Tag Generator and Checker – Pixel Width Preview",
    metaDescription:
      "Draft title tag variations from your keyword and topic, check each against Google's pixel width, and preview how they look in desktop and mobile results.",
    summary:
      "Turn a keyword and a short description of the page into title tag patterns, check each against the ~600 px desktop limit, edit your favorite and preview it as a Google result.",
    category: "free-seo-tools",
    subgroup: "onpage",
    card: "Draft title tags from patterns and check their pixel width.",
    archetype: "generator",
    widget: "serp-preview",
    config: { mode: "title" },
    aliases: ["seo title generator", "title tag checker", "page title length checker", "meta title generator", "title generator", "seo title checker", "title length checker", "page title generator"],
    keywords: ["title", "pixel width", "length", "seo title"],
    processing: "browser",
    steps: [
      "Enter the **Main keyword** and **What the page offers**, then choose the **Page type**.",
      "Add a **Brand or site name** and, for local pages, a **Location**.",
      "Read the **Suggestions**: each shows its character count, estimated width and whether it fits.",
      "Press **Use this** on one, edit it under **Your title**, check the preview and press **Copy**.",
    ],
    example: {
      title: "Example: article patterns",
      input: "Main keyword: sourdough starter\nWhat the page offers: Make, Feed and Store It\nPage type: Article or guide\nBrand: Bread Notes",
      output:
        "Sourdough Starter: Make, Feed and Store It (42 chars, ~389 px)\nWhat Is Sourdough Starter? Make, Feed and Store It (50 chars, ~468 px)\nSourdough Starter Explained, With Examples (42 chars, ~401 px)\nSourdough Starter: Make, Feed and Store It | Bread Notes (56 chars, ~517 px)\nA Practical Guide to Sourdough Starter (38 chars, ~346 px)",
      note: "Patterns are filled in a fixed order; the same input always gives the same list. Some read better than others (\"What Is Sourdough Starter?\" needs an \"a\"), which is why you edit before copying.",
    },
    sections: [
      {
        heading: "What makes a title tag work",
        body: "A good title says what the page is, in the words a searcher would use, and gives a reason to pick it over the nine other results. In practice:\n\n- Lead with the topic or main keyword.\n- Add the angle: the format (guide, checklist, calculator), the benefit or the scope.\n- Keep it unique across your site; repeated titles look like boilerplate and get rewritten.\n- Match the page: a title that promises more than the page delivers gets clicks, then quick returns to the results.",
      },
      {
        heading: "Pixel width vs character count",
        body: "Google truncates desktop titles at roughly 600 pixels, not at a set number of characters. That's about 50–60 characters of typical text, but \"WWW\" takes about three times the room of \"iii\". The meter estimates width with Arial character widths at 20 px. Treat the 600 px line as a guide: going over isn't a ranking problem, it just means the end may be replaced by \"...\".",
      },
      {
        heading: "Title patterns for tools, products and articles",
        body: "| Page type | Pattern | Example |\n|---|---|---|\n| Article | Topic: angle | Sourdough Starter: Make, Feed and Store It |\n| Product | Product – key detail \\| Brand | Rye Flour 1 kg – Stone-Ground \\| Bread Notes |\n| Category | Shop category \\| Brand | Shop Baking Tins \\| Bread Notes |\n| Local | Service in place \\| Brand | Bakery in Leeds \\| Bread Notes |\n| Tool | Tool – what it does | Hydration Calculator – Find Dough Water Ratio |\n\nThe generator uses these and a few variants. Patterns that need a field you left empty are skipped.",
      },
      {
        heading: "Why Google rewrites titles",
        body: "Google generates its own title link when the `<title>` is missing, very long, stuffed with keywords, the same across many pages, or doesn't describe the page. It then uses text from the H1, other headings, anchor text or `og:title`. Keeping the title close to the H1 and specific to the page is the most reliable way to have yours shown.",
      },
      {
        heading: "Brand names in titles",
        body: "Adding \"| Brand\" helps recognition on the homepage and when the brand is well known, but it uses up 80–120 px. Google often shows a separate site name above the result, so on long article titles the brand can go. If you keep it, put it at the end and use a short separator (`|` or `–`).",
      },
    ],
    faq: [
      {
        q: "How long should a title tag be?",
        a: "Short enough to fit in about 600 pixels on desktop, which is usually 50–60 characters. Longer titles aren't penalized; they're cut off, so the words after the cut aren't seen.",
      },
      {
        q: "Why does Google change my title?",
        a: "Google rewrites titles it considers too long, repetitive, keyword-stuffed or unrepresentative of the page. Matching the title to the H1 and keeping it specific reduces rewrites.",
      },
      {
        q: "Should the title match the H1?",
        a: "They should describe the same thing but needn't be identical. The H1 can be longer and more conversational; the title should be tighter and include the main keyword.",
      },
      {
        q: "Are these titles written by AI?",
        a: "No. They are fill-in-the-blank patterns built from the words you type, listed in a fixed order. Nothing is sent anywhere.",
      },
    ],
    sources: [GSC.titleLinks, GSC.siteNames],
    related: ["meta-description-generator", "serp-simulator", "meta-tags-analyzer", "meta-tag-generator", "url-slug-generator"],
    links: [
      { href: "/meta-description-generator/", anchor: "meta description generator" },
      { href: "/serp-simulator/", anchor: "SERP simulator" },
      { href: "/meta-tags-analyzer/", anchor: "meta tag analyzer" },
      { href: "/blog/write-title-tags-meta-descriptions/", anchor: "title tag guide" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "Title patterns for articles, products, categories, services, local pages, tools and homepages",
      "Character count and pixel-width estimate for every suggestion",
      "Editable title with desktop and mobile preview",
      "Copies the finished <title> tag",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 2,
  },

  /* ------------------------------------------------------------------ meta description generator */
  {
    id: "meta-description-generator",
    path: "/meta-description-generator/",
    name: "Meta Description Generator",
    h1: "Meta Description Generator",
    title: "Meta Description Generator – Draft and Check Length",
    metaDescription:
      "Draft meta descriptions from your page summary and keyword, then check each one's length in pixels and preview the snippet before you publish.",
    summary:
      "Build meta description drafts from your keyword, a one-line summary and a call to action, check each against desktop and mobile widths, and preview the snippet.",
    category: "free-seo-tools",
    subgroup: "onpage",
    card: "Draft meta descriptions and check their length in pixels.",
    archetype: "generator",
    widget: "serp-preview",
    config: { mode: "description" },
    aliases: ["meta description checker", "meta description length", "seo description generator", "meta description length checker", "description generator", "meta desc generator", "snippet generator", "meta description writer"],
    keywords: ["description", "snippet", "pixel", "length"],
    processing: "browser",
    steps: [
      "Enter the **Main keyword** and, under **What the page gives the reader**, the answer or benefit in plain words.",
      "Choose the **Page type** and optionally add a **Brand or site name**, **Location** and **Call to action**.",
      "Compare the **Suggestions** by length and press **Use this** on the best one.",
      "Edit it under **Your description**, check the desktop and mobile preview, then press **Copy**.",
    ],
    example: {
      title: "Example: article drafts",
      input:
        "Main keyword: sourdough starter\nWhat the page gives the reader: make a starter with flour and water in 7 days, then learn when to feed it and how to store it\nCall to action: Read the step-by-step guide\nBrand: Bread Notes",
      output:
        "1. Make a starter with flour and water in 7 days, then learn when to feed it and how to store it. Read the step-by-step guide. (123 chars, ~692 px)\n2. Sourdough starter: make a starter with flour and water in 7 days, then learn when to feed it and how to store it. Read the step-by-step guide. (142 chars, ~804 px)\n3. A guide to sourdough starter: … Read the step-by-step guide. (153 chars, ~863 px)",
      note: "All three fit the ~920 px desktop width; the second and third will be cut on mobile, where about 680 px is shown.",
    },
    sections: [
      {
        heading: "What a meta description does and doesn't do",
        body: "The meta description is a summary you suggest for the snippet under your title. Google may use it when it describes the page better than any passage on it. It isn't a ranking factor: a better description doesn't move you up, but a clear one can make more of the people who see the result click it. Each page should have its own; duplicated descriptions are usually ignored.",
      },
      {
        heading: "Length in pixels and characters",
        body: "Snippets are cut by width. Most snippet tools use about **920 px** for desktop and **680 px** for mobile at Google's snippet font size, which is roughly 150–160 and 110–120 characters of ordinary text. The meter estimates width from Arial character widths at 13 px. A description that's \"too long\" isn't penalized; the end just isn't seen. Very short descriptions give Google little to work with, so it's more likely to pick text from the page instead; the meter marks anything under 70 characters as short.",
      },
      {
        heading: "Writing for the searcher's question",
        body: "Write the description as the answer to the query you want the page to win. Put the concrete answer or benefit first (\"Make a starter with flour and water in 7 days\"), then a detail that sets the page apart, then what to do next. Use the keyword once, naturally: Google bolds the words that match the search, which helps the result stand out. If you use double quotes, they must be escaped as `&quot;` inside the attribute (the generator does this); an unescaped quote ends the description early.",
      },
      {
        heading: "When Google ignores your description",
        body: "Google picks snippet text per query. It's likely to use your description when the search closely matches the page's main topic, and a passage from the body when the search is about a detail. It also ignores descriptions that are missing, duplicated across pages, a list of keywords or unrelated to the content. Check what's shown for your main queries in Search Console's Performance report.",
      },
      {
        heading: "Examples by page type",
        body: "| Page type | Example |\n|---|---|\n| Product | Stone-ground rye flour in 1 kg bags, milled weekly. Free delivery over £30. Order today. |\n| Local business | Bread Notes bakes sourdough in Leeds every morning. Collect from 7 am or order for delivery. |\n| Article | Make a sourdough starter with flour and water in 7 days. Learn when to feed it and how to store it. |\n| Tool | Work out the water you need for any dough hydration. Enter the flour weight and target percentage. |",
      },
    ],
    faq: [
      {
        q: "How long should a meta description be?",
        a: "Long enough to make the point, short enough to fit: aim for about 120–155 characters so the key part shows on mobile and the whole text fits on desktop.",
      },
      {
        q: "Is the meta description a ranking factor?",
        a: "No. Google has said it doesn't use the meta description for ranking. It matters because a relevant description can be shown as the snippet and affects whether people click.",
      },
      {
        q: "Why does Google show different text?",
        a: "Google chooses snippet text for each search. If a passage on the page matches the query better than your description, it shows that passage instead.",
      },
      {
        q: "Are the suggestions written by AI?",
        a: "No. They are fixed sentence patterns filled with your words, so the same input always gives the same drafts. Edit the best one so it reads naturally.",
      },
    ],
    sources: [GSC.snippets],
    related: ["title-tag-generator", "serp-simulator", "meta-tag-generator", "meta-tags-analyzer", "character-counter"],
    links: [
      { href: "/title-tag-generator/", anchor: "title tag generator" },
      { href: "/serp-simulator/", anchor: "SERP simulator" },
      { href: "/character-counter/", anchor: "character counter" },
      { href: "/meta-tags-analyzer/", anchor: "meta tag analyzer" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "Description patterns by page type",
      "Character count and pixel width for desktop and mobile",
      "Editable draft with search preview",
      "Copies the finished meta description tag",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 2,
  },

  /* ------------------------------------------------------------------ Open Graph checker */
  {
    id: "open-graph-checker",
    path: "/open-graph-checker/",
    name: "Open Graph Checker",
    h1: "Open Graph Checker",
    title: "Open Graph Checker – Preview Links on Facebook, LinkedIn, X",
    metaDescription:
      "Check a URL's Open Graph and X card tags and preview how the link will look when shared on Facebook, LinkedIn, X and chat apps. Flags missing tags.",
    summary:
      "Check a page's Open Graph and X card tags, see approximate previews for Facebook, LinkedIn, X and chat apps, and find missing or broken tags such as a relative og:image.",
    category: "free-seo-tools",
    subgroup: "social",
    card: "Check og: and X card tags and preview how a shared link looks.",
    archetype: "url",
    widget: "social-tags",
    config: { mode: "check" },
    aliases: ["og tag checker", "link preview checker", "twitter card validator", "facebook link preview test", "og image checker", "open graph debugger", "x card validator", "social preview checker", "og checker"],
    keywords: ["og:image", "facebook", "linkedin", "twitter", "preview", "share"],
    processing: "server",
    pasteMode: true,
    limits: [
      "Previews are approximations; each platform caches links and changes its layout over time.",
      "We confirm the share image loads and its file size, but can't read its pixel dimensions.",
    ],
    steps: [
      "Enter the page address under **Check a URL** (or paste the page source under **Paste HTML**).",
      "Press **Check tags**.",
      "Look at **Link previews**. Press **Show images** to load the share image (your browser then requests it from the image's server).",
      "Fix anything marked as a warning or problem in **Checks**, then re-check. Use **Copy table** to keep a list of the tags found.",
    ],
    example: {
      title: "Example: a page with a relative image URL (illustrative)",
      input:
        '<meta property="og:title" content="How to make a sourdough starter">\n<meta property="og:description" content="Seven days, two ingredients, one jar.">\n<meta property="og:image" content="/images/starter.jpg">\n<meta name="twitter:card" content="summary_large_image">',
      output:
        "Pass     og:title “How to make a sourdough starter”\nPass     og:description “Seven days, two ingredients, one jar.”\nProblem  og:image “/images/starter.jpg”: must be a full URL starting with https://\nNote     og:url missing\nNote     og:type missing (platforms assume website)\nPass     twitter:card “summary_large_image”",
      note: "Output for the **Load sample HTML** example. In URL mode the checker also requests the share image from our server and reports its status code, content type and size.",
    },
    sections: [
      {
        heading: "Required Open Graph tags",
        body: "The Open Graph protocol requires four properties on every page: `og:title`, `og:type`, `og:image` and `og:url`. `og:description` is optional in the protocol but every major platform shows it. Platforms fall back to the `<title>` and meta description when og: tags are missing, but they pick an image themselves (or none), which is the most common cause of bad previews.\n\nAll URLs must be absolute. `/images/photo.jpg` works in your HTML but not in og:image, because the platform fetching your page doesn't resolve it.",
      },
      {
        heading: "X (Twitter) card tags",
        body: "X reads `twitter:card` to choose a layout (`summary_large_image` for a wide image, `summary` for a small square one) and `twitter:site`/`twitter:creator` for handles. For the title, description and image it uses `twitter:title`, `twitter:description` and `twitter:image` if present, and the Open Graph equivalents otherwise. A page with complete Open Graph tags needs only `twitter:card` to get a large card.",
      },
      {
        heading: "Image size and aspect ratio",
        body: "| Platform | Shape | Practical size |\n|---|---|---|\n| Facebook | 1.91:1 | 1200 × 630 px; under 600 × 315 px shows as a small thumbnail |\n| LinkedIn | 1.91:1 | 1200 × 627 px |\n| X large card | 2:1 | at least 300 × 157 px, under 5 MB |\n| X summary card | 1:1 | at least 144 × 144 px, under 5 MB |\n\nOne 1200 × 630 px JPG or PNG works everywhere; keep text and faces away from the edges because some apps crop to a square. Add `og:image:width` and `og:image:height` so Facebook can render the preview on the first share without downloading the image first.",
      },
      {
        heading: "Why previews don't update (caching)",
        body: "Platforms store a copy of your tags the first time a link is shared and reuse it, sometimes for weeks. After you fix tags, ask each platform to fetch the page again:\n\n- **Facebook:** Sharing Debugger → Scrape Again.\n- **LinkedIn:** Post Inspector → Inspect.\n- **X:** no manual refresh; the card updates after its cache expires (about a week). Adding a query string such as `?v=2` creates a new cache entry.\n- **Slack, WhatsApp, iMessage:** cache per conversation; a new query string forces a fresh preview.",
      },
      {
        heading: "Fixing wrong or missing previews",
        body: "- **Wrong image:** set `og:image` explicitly; without it, platforms guess from images on the page.\n- **No image at all:** the image URL is relative, blocked by robots.txt, behind a login, or too large. The image check shows its status code and size.\n- **Old title:** clear the platform cache (above).\n- **Tags present in the browser but not here:** they're added by JavaScript. Most social crawlers don't run JavaScript, so the tags must be in the server HTML.\n\nTo write a complete set, use the [Open Graph generator](/open-graph-generator/) and the [X card generator](/twitter-card-generator/).",
      },
    ],
    faq: [
      {
        q: "Why is the wrong image showing when I share my link?",
        a: "Either og:image is missing and the platform picked another image from the page, or it cached an older version of your tags. Set og:image to an absolute URL, then use Facebook's Sharing Debugger or LinkedIn's Post Inspector to refresh.",
      },
      {
        q: "Is there still an official Twitter Card Validator?",
        a: "X removed the preview from its Card Validator in 2022. To see the real card, start composing a post with the link (you don't have to publish it). This checker shows the tags X reads and an approximate layout.",
      },
      {
        q: "What size should og:image be?",
        a: "1200 × 630 pixels, under 5 MB, in JPG or PNG. That fills a Facebook or LinkedIn card and works as an X large image card, which is cropped slightly to 2:1.",
      },
    ],
    sources: [
      GSC.ogp,
      GSC.xCards,
      { label: "Meta for Developers: Images in link shares", url: "https://developers.facebook.com/docs/sharing/webmasters/images/" },
      { label: "Meta for Developers: Sharing Debugger", url: "https://developers.facebook.com/tools/debug/" },
      { label: "LinkedIn Post Inspector", url: "https://www.linkedin.com/post-inspector/" },
    ],
    related: ["open-graph-generator", "twitter-card-generator", "meta-tags-analyzer", "meta-tag-generator"],
    links: [
      { href: "/open-graph-generator/", anchor: "Open Graph generator" },
      { href: "/twitter-card-generator/", anchor: "X card generator" },
      { href: "/meta-tags-analyzer/", anchor: "meta tag analyzer" },
      { href: "/blog/open-graph-tags-guide/", anchor: "Open Graph tags guide" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "Reads og: and twitter: tags from any public URL or pasted HTML",
      "Approximate Facebook, LinkedIn, X and chat-app previews",
      "Checks that og:image and og:url are absolute",
      "Requests the share image and reports status, type and size",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 1,
  },

  /* ------------------------------------------------------------------ Open Graph generator */
  {
    id: "open-graph-generator",
    path: "/open-graph-generator/",
    name: "Open Graph Generator",
    h1: "Open Graph Generator",
    title: "Open Graph Generator – Create og: Meta Tags",
    metaDescription:
      "Create Open Graph tags for a page (title, description, image, type, URL) with a live Facebook and LinkedIn preview, then copy the HTML into your head.",
    summary:
      "Create Open Graph tags (title, description, image, type, URL and article details) with live Facebook, LinkedIn and X previews, then copy the HTML into your page's head.",
    category: "free-seo-tools",
    subgroup: "social",
    card: "Create og: tags with a live preview of the shared link.",
    archetype: "generator",
    widget: "social-tags",
    config: { mode: "og" },
    aliases: ["og tag generator", "open graph meta tags", "og meta tag generator", "og image tag generator", "open graph tags", "facebook meta tags generator", "og generator", "opengraph generator"],
    keywords: ["og:title", "og:image", "facebook", "linkedin", "share"],
    processing: "browser",
    steps: [
      "Choose the **og:type**: **article** for posts, **website** for everything else.",
      "Fill in **Title**, **Description**, **Page URL** and **Image URL**; add an **Image description** for screen-reader users.",
      "Add **Image width** and **Image height**, **Site name** and **Locale**; for articles, the dates, section and tags.",
      "Check the **Preview** (press **Show images** to load your image), read any warnings, then **Copy** or **Download** the tags.",
    ],
    example: {
      title: "Example output for an article",
      input:
        "og:type: article\nTitle: How to make a sourdough starter\nDescription: Seven days, two ingredients, one jar: a starter you can bake with by next weekend.\nURL: https://www.example.com/baking/sourdough-starter/\nImage: https://www.example.com/images/starter-1200x630.jpg (1200 × 630)\nSite name: Bread Notes · Locale: en_US · Published: 2026-09-12 · Section: Baking · Tags: sourdough, bread",
      output:
        '<meta property="og:type" content="article">\n<meta property="og:title" content="How to make a sourdough starter">\n<meta property="og:description" content="Seven days, two ingredients, one jar: a starter you can bake with by next weekend.">\n<meta property="og:url" content="https://www.example.com/baking/sourdough-starter/">\n<meta property="og:image" content="https://www.example.com/images/starter-1200x630.jpg">\n<meta property="og:image:alt" content="A jar of bubbly sourdough starter on a kitchen counter">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta property="og:site_name" content="Bread Notes">\n<meta property="og:locale" content="en_US">\n<meta property="article:published_time" content="2026-09-12">\n<meta property="article:section" content="Baking">\n<meta property="article:tag" content="sourdough">\n<meta property="article:tag" content="bread">',
    },
    sections: [
      {
        heading: "Core og: properties",
        body: "| Property | What to put in it |\n|---|---|\n| `og:title` | The headline for the shared card; can be shorter or punchier than the `<title>` |\n| `og:type` | `website` or `article` (others below) |\n| `og:url` | The canonical URL, so shares of variants count together |\n| `og:image` | Absolute URL of the share image |\n| `og:description` | One or two sentences |\n| `og:site_name` | Your site or brand name |\n| `og:locale` | Language and territory, e.g. `en_US`, `en_GB` |\n\nThe first four are required by the protocol. The generator warns when one is missing.",
      },
      {
        heading: "Choosing og:type",
        body: "Use **article** for blog posts, news and guides: it unlocks `article:published_time`, `article:modified_time`, `article:author`, `article:section` and `article:tag`. Use **website** for the homepage, product pages, tools and anything else. **profile** suits a person's page, **book** a single book, **video.other** a page built around a video. Facebook and LinkedIn render all of them the same way; the type mainly describes the content to apps that read it.",
      },
      {
        heading: "Image requirements",
        body: "Use one image of 1200 × 630 px (1.91:1), under 5 MB, as JPG or PNG, on an absolute `https://` URL that isn't blocked by robots.txt or a login. Under 600 × 315 px, Facebook shows a small thumbnail instead of a full-width image. Declaring `og:image:width` and `og:image:height` lets platforms lay out the card before they download the image, and `og:image:alt` describes it for screen-reader users.",
      },
      {
        heading: "Adding the tags to your site",
        body: "Paste the tags inside `<head>`. If you use WordPress, Shopify or a framework, prefer its built-in fields: Yoast, Rank Math and SEOPress have a Social tab per post; Next.js accepts an `openGraph` object in the `metadata` export. Make sure only one system writes og: tags, because duplicate tags make platforms pick one unpredictably.",
      },
      {
        heading: "Testing after publishing",
        body: "Once the page is live, run it through the [Open Graph checker](/open-graph-checker/) to confirm the tags are in the server HTML and the image loads. Then use Facebook's Sharing Debugger (**Scrape Again**) and LinkedIn's Post Inspector to make them fetch the new version, since both cache previews.",
      },
    ],
    faq: [
      {
        q: "Do I need both Open Graph and X card tags?",
        a: "You need Open Graph tags; X reads them too. Add `twitter:card` to choose X's layout (and `twitter:site` for your handle). Separate `twitter:title` and `twitter:image` are only needed if you want X to show something different.",
      },
      {
        q: "How is og:title different from the title tag?",
        a: "The `<title>` is written for search results and often ends with your brand. `og:title` is shown on social cards, where the site name appears separately, so it can drop the brand and read more like a headline.",
      },
      {
        q: "Can LinkedIn show a different image?",
        a: "LinkedIn uses the same og:image as Facebook; there is no LinkedIn-specific tag. When you write a post you can upload a different image manually.",
      },
    ],
    sources: [GSC.ogp, { label: "Meta for Developers: Images in link shares", url: "https://developers.facebook.com/docs/sharing/webmasters/images/" }, GSC.xCards],
    related: ["open-graph-checker", "twitter-card-generator", "meta-tag-generator", "meta-tags-analyzer"],
    links: [
      { href: "/open-graph-checker/", anchor: "check the live tags" },
      { href: "/twitter-card-generator/", anchor: "X card generator" },
      { href: "/meta-tag-generator/", anchor: "meta tag generator" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "All core og: properties plus image size, alt text, locale and site name",
      "Article dates, author, section and tags",
      "Approximate Facebook, LinkedIn, X and chat-app previews",
      "Warnings for missing required tags and relative URLs",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 2,
  },

  /* ------------------------------------------------------------------ X card generator */
  {
    id: "twitter-card-generator",
    path: "/twitter-card-generator/",
    name: "Twitter Card Generator",
    h1: "Twitter Card Generator",
    title: "X (Twitter) Card Generator – Summary and Large Image Cards",
    metaDescription:
      "Generate X (Twitter) card tags for summary and large-image cards with a live preview, and see which Open Graph tags X falls back on.",
    summary:
      "Generate the tags X (formerly Twitter) uses to show a card for your link, for summary and large-image cards, and see which values X can take from your Open Graph tags instead.",
    category: "free-seo-tools",
    subgroup: "social",
    card: "Generate X card tags for summary and large-image cards.",
    archetype: "generator",
    widget: "social-tags",
    config: { mode: "twitter" },
    aliases: ["x card generator", "twitter card meta tags", "twitter summary card", "summary_large_image", "twitter meta tags", "twitter card tags", "x meta tags", "twiter card generator"],
    keywords: ["twitter", "x", "card", "summary_large_image"],
    processing: "browser",
    steps: [
      "Choose the **Card type**: **Large image** or **Summary (small square image)**.",
      "Answer **Does the page already have Open Graph tags?** Choose **Yes, reuse them** if it does, so only X-specific tags are written.",
      "Enter your **Site handle** and **Author handle**, and, if needed, the title, description and **Image URL**.",
      "Check the preview and warnings, then **Copy** or **Download** the tags.",
    ],
    example: {
      title: "Example: page without Open Graph tags",
      input:
        "Card type: Large image\nSite handle: @breadnotes · Author handle: @ana_bakes\nTitle: How to make a sourdough starter\nDescription: Seven days, two ingredients, one jar.\nImage: https://www.example.com/images/starter-1200x600.jpg",
      output:
        '<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:site" content="@breadnotes">\n<meta name="twitter:creator" content="@ana_bakes">\n<meta name="twitter:title" content="How to make a sourdough starter">\n<meta name="twitter:description" content="Seven days, two ingredients, one jar.">\n<meta name="twitter:image" content="https://www.example.com/images/starter-1200x600.jpg">\n<meta name="twitter:image:alt" content="A jar of bubbly sourdough starter">',
      note: "With **Yes, reuse them**, the same input gives only twitter:card, twitter:site, twitter:creator and twitter:image:alt; X takes the title, description and image from og:title, og:description and og:image. Handles can be typed with or without @, or pasted as an x.com profile URL.",
    },
    sections: [
      {
        heading: "Summary vs summary_large_image",
        body: "**summary_large_image** shows a wide image (2:1) across the full width of the post: the better choice for articles, products and anything visual. **summary** shows a small square thumbnail next to the title and is better for profile pages or when you don't have a good wide image. App and player cards also exist, but player cards need approval from X, so this generator covers the two cards any site can use.",
      },
      {
        heading: "Required and optional twitter: tags",
        body: "| Tag | Needed? | Notes |\n|---|---|---|\n| `twitter:card` | Yes | `summary` or `summary_large_image` |\n| `twitter:title` | Yes, unless og:title exists | Max 70 characters |\n| `twitter:description` | Optional | Max 200 characters |\n| `twitter:image` | Optional | Falls back to og:image |\n| `twitter:image:alt` | Recommended | Alt text, max 420 characters |\n| `twitter:site` | Optional | The site's @handle |\n| `twitter:creator` | Optional | The author's @handle |\n\nTwitter tags use `name=`, while Open Graph tags use `property=`.",
      },
      {
        heading: "How X falls back to Open Graph",
        body: "When a `twitter:` tag is missing, X uses the Open Graph equivalent: `og:title` for the title, `og:description` for the description and `og:image` for the image. So a page that already has complete Open Graph tags needs only `twitter:card` (plus handles if you want them). Writing both sets doubles the work of keeping them in sync; write twitter: versions only when X should show something different.",
      },
      {
        heading: "Image size and file limits",
        body: "From X's card documentation:\n\n- **Large image card:** 2:1 ratio, at least 300 × 157 px, at most 4096 × 4096 px.\n- **Summary card:** 1:1 ratio, at least 144 × 144 px, at most 4096 × 4096 px.\n- Under 5 MB; JPG, PNG, WEBP or GIF (only the first frame of an animated GIF is used).\n\nA 1200 × 630 px Open Graph image also works for the large card; X crops it slightly to 2:1.",
      },
      {
        heading: "Testing cards now the validator is gone",
        body: "X removed the preview from its Card Validator in 2022. To check a card: publish the page, run it through the [Open Graph checker](/open-graph-checker/) to confirm the tags are in the server HTML, then start composing a post with the link on X and look at the card before posting. X caches cards for about a week; adding a query string (`?v=2`) to the shared URL forces a fresh fetch.",
      },
    ],
    faq: [
      {
        q: "Does X still have a card validator?",
        a: "Not one that shows a preview. Since 2022 the official way is to paste the link into a new post and look at the card before publishing.",
      },
      {
        q: "Do I need twitter:title if I have og:title?",
        a: "No. X uses og:title when twitter:title is missing. Choose **Yes, reuse them** in the generator to leave the duplicates out.",
      },
      {
        q: "What image size works for large cards?",
        a: "1200 × 600 px (2:1) fits exactly; 1200 × 630 px, the usual Open Graph size, also works with a slight crop. Keep it under 5 MB.",
      },
    ],
    sources: [
      GSC.xCards,
      { label: "X Developer Platform: Summary card with large image", url: "https://developer.x.com/en/docs/x-for-websites/cards/overview/summary-card-with-large-image" },
      GSC.ogp,
    ],
    related: ["open-graph-generator", "open-graph-checker", "meta-tag-generator", "meta-tags-analyzer"],
    links: [
      { href: "/open-graph-generator/", anchor: "Open Graph generator" },
      { href: "/open-graph-checker/", anchor: "preview how X shows your link" },
      { href: "/meta-tag-generator/", anchor: "meta tag generator" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "Summary and large-image card tags",
      "Leaves out tags X can take from Open Graph",
      "Accepts handles with or without @, or as profile URLs",
      "Length warnings at X's 70 and 200 character limits",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 3,
  },

  /* ------------------------------------------------------------------ schema markup generator */
  {
    id: "schema-markup-generator",
    path: "/schema-markup-generator/",
    name: "Schema Markup Generator",
    h1: "Schema Markup Generator",
    title: "Schema Markup Generator – Create JSON-LD Structured Data",
    metaDescription:
      "Build JSON-LD structured data for articles, products, local businesses, FAQs, breadcrumbs, events and more with a form, then copy it into your page.",
    summary:
      "Fill in a form to build JSON-LD structured data for articles, blog posts, products, local businesses, organizations, people, events, breadcrumbs, FAQs and websites, ready to paste into a page.",
    category: "free-seo-tools",
    subgroup: "schema",
    card: "Build JSON-LD for articles, products, local businesses and more.",
    archetype: "generator",
    widget: "schema-markup",
    config: { mode: "generate" },
    aliases: ["json-ld generator", "structured data generator", "schema generator", "local business schema generator", "product schema generator", "article schema generator", "breadcrumb schema generator", "faq schema generator", "schema markup creator", "jsonld generator"],
    keywords: ["json-ld", "structured data", "rich results", "schema.org"],
    processing: "browser",
    steps: [
      "Choose a **Schema type**, such as Article, Product or Local business.",
      "Fill in the fields. **required** marks what Google needs for a rich result; **recommended** marks what improves it. Use **Add** to add more questions, breadcrumb levels or opening hours.",
      "Read the **JSON-LD** panel as you type; empty fields are left out automatically.",
      "Press **Copy** or **Download**, paste the script into the page, then use **Check it in the schema validator**.",
    ],
    example: {
      title: "Example: Article",
      input:
        "Headline: How to make a sourdough starter\nDescription: Seven days, two ingredients, one jar.\nPage URL: https://www.example.com/baking/sourdough-starter/\nImages: …/starter-16x9.jpg, …/starter-1x1.jpg\nPublished: 2026-09-12 · Modified: 2026-09-20\nAuthor (Person): Ana Baker, https://www.example.com/about/ana/\nPublisher: Bread Notes, logo https://www.example.com/logo.png",
      output:
        '<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "Article",\n  "headline": "How to make a sourdough starter",\n  "description": "Seven days, two ingredients, one jar.",\n  "mainEntityOfPage": "https://www.example.com/baking/sourdough-starter/",\n  "image": [\n    "https://www.example.com/images/starter-16x9.jpg",\n    "https://www.example.com/images/starter-1x1.jpg"\n  ],\n  "datePublished": "2026-09-12",\n  "dateModified": "2026-09-20",\n  "author": {\n    "@type": "Person",\n    "name": "Ana Baker",\n    "url": "https://www.example.com/about/ana/"\n  },\n  "publisher": {\n    "@type": "Organization",\n    "name": "Bread Notes",\n    "logo": {\n      "@type": "ImageObject",\n      "url": "https://www.example.com/logo.png"\n    }\n  }\n}\n</script>',
      note: "This output passes the [schema markup validator](/schema-markup-validator/) with no errors or warnings.",
    },
    sections: [
      {
        heading: "Supported schema types",
        body: "| Type | Use it for |\n|---|---|\n| Article, BlogPosting | News, guides and blog posts |\n| Product | A single product with price and availability |\n| LocalBusiness (and subtypes such as Bakery or Dentist) | A business with a physical location |\n| Organization | Your company: name, logo, profiles |\n| Person | An author or team member page |\n| Event | Concerts, workshops, webinars |\n| BreadcrumbList | The trail from the homepage to the page |\n| FAQPage | A page of questions and answers |\n| WebSite | Your site name for Google's results |",
      },
      {
        heading: "Required vs recommended properties",
        body: "**Required** properties are the minimum for a page to be eligible for a rich result. Without them, Google reports an error and shows no rich result. **Recommended** properties make the result more complete (an image, a rating, an end date) and missing ones are reported as warnings. For example, an Event needs `name`, `startDate` and `location`; a Product needs `name` plus at least one of `offers`, `review` or `aggregateRating`.\n\nEverything you mark up must be visible on the page. For products, only add ratings that come from real reviews shown on the page.",
      },
      {
        heading: "Adding JSON-LD to your site",
        body: "Paste the `<script type=\"application/ld+json\">` block anywhere in the page's HTML; `<head>` is usual. In WordPress, an SEO plugin already outputs Article, Organization and BreadcrumbList; add other types with the plugin's schema settings or a custom HTML block rather than duplicating what it writes. In Next.js, render the script in the page component with `dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}`. Markup added by Google Tag Manager works for Google but not for crawlers that don't run JavaScript.",
      },
      {
        heading: "Which types can earn rich results",
        body: "Product, Event, LocalBusiness, Article, BreadcrumbList, Recipe, VideoObject, JobPosting and Review snippets can still change how a result looks. Organization and WebSite markup feed the knowledge panel, logo and site name rather than a visible snippet. FAQ rich results were first limited to government and health sites in 2023 and retired in 2026, and HowTo rich results were removed in 2023, so FAQPage markup is still valid but no longer changes the result. Eligibility never guarantees a rich result; Google decides per search.",
      },
      {
        heading: "Testing before you publish",
        body: "Use **Check it in the schema validator** to send the code to our [schema markup validator](/schema-markup-validator/), which checks the JSON syntax, types and required properties in your browser. After publishing, test the live URL with Google's Rich Results Test to see which rich results Google considers the page eligible for, then watch the Enhancements reports in Search Console for errors at scale.",
      },
    ],
    faq: [
      {
        q: "Does schema markup improve rankings?",
        a: "Not directly. Google says structured data isn't a ranking factor. It helps Google understand the page and can make it eligible for rich results, which can make a result more visible and more clicked.",
      },
      {
        q: "Is FAQ schema still shown in Google?",
        a: "No. Google limited FAQ rich results to authoritative government and health sites in 2023 and stopped showing them in 2026. The markup is still valid schema.org, so it does no harm, but it won't change your result.",
      },
      {
        q: "JSON-LD or microdata?",
        a: "JSON-LD. Google recommends it because it sits in one script block, separate from the visible HTML, so it's easier to add and maintain. Microdata still works but has to be woven into the page's markup.",
      },
    ],
    sources: [
      { label: "Google Search Central: Introduction to structured data markup", url: "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data" },
      { label: "Google Search Central: General structured data guidelines", url: "https://developers.google.com/search/docs/appearance/structured-data/sd-policies" },
      { label: "Google Search Central: Structured data markup that Google Search supports", url: "https://developers.google.com/search/docs/appearance/structured-data/search-gallery" },
      { label: "Google Search Central Blog: Changes to HowTo and FAQ rich results (2023)", url: "https://developers.google.com/search/blog/2023/08/howto-faq-changes" },
      { label: "Google Search Central Blog: Sitelinks search box retirement (2024)", url: "https://developers.google.com/search/blog/2024/10/sitelinks-search-box" },
      { label: "Schema.org vocabulary", url: "https://schema.org/" },
    ],
    related: ["schema-markup-validator", "serp-simulator", "meta-tag-generator", "review-link-generator"],
    links: [
      { href: "/schema-markup-validator/", anchor: "schema markup validator" },
      { href: "/blog/schema-markup-examples/", anchor: "JSON-LD examples" },
      { href: "/serp-simulator/", anchor: "SERP simulator" },
      { href: "/meta-tag-generator/", anchor: "meta tag generator" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "Ten types: Article, BlogPosting, Product, LocalBusiness, Organization, Person, Event, BreadcrumbList, FAQPage, WebSite",
      "Required and recommended fields marked from Google's documentation",
      "Repeatable rows for questions, breadcrumbs and opening hours",
      "Empty fields left out of the JSON-LD automatically",
      "Hands the code to the schema validator in one click",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 1,
  },

  /* ------------------------------------------------------------------ schema markup validator */
  {
    id: "schema-markup-validator",
    path: "/schema-markup-validator/",
    name: "Schema Markup Validator",
    h1: "Schema Markup Validator",
    title: "Schema Markup Validator – Check JSON-LD Structured Data",
    metaDescription:
      "Paste JSON-LD or enter a URL to find syntax errors, unknown types and missing properties in structured data before you run Google's Rich Results Test.",
    summary:
      "Find syntax errors (with line and column), misspelled types, missing required properties and badly formatted values in JSON-LD, from pasted code or a live URL.",
    category: "free-seo-tools",
    subgroup: "schema",
    card: "Find syntax errors and missing properties in JSON-LD.",
    archetype: "analyzer",
    widget: "schema-markup",
    config: { mode: "validate" },
    aliases: ["structured data validator", "json-ld validator", "schema checker", "structured data testing tool", "schema validator", "rich snippet checker", "json ld checker", "structured data checker", "schema test"],
    keywords: ["json-ld", "structured data", "rich results", "errors"],
    processing: "server",
    pasteMode: true,
    limits: [
      "Checks JSON-LD only, not microdata or RDFa.",
      "Checks the properties Google requires for common rich results, not the whole schema.org vocabulary.",
    ],
    steps: [
      "Choose **Paste code** and paste JSON-LD or a page's HTML, or choose **Check a URL** and press **Validate page**.",
      "Read the totals: **Errors** stop the markup working, **Warnings** are missing recommended properties or badly formatted values.",
      "For a syntax error, look at the highlighted line and the caret under the column where parsing stopped.",
      "Fix the code and watch the results update, then confirm with **Google's Rich Results Test**.",
    ],
    example: {
      title: "Example: three common mistakes",
      input:
        '<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "product",\n  "name": "Stone-ground rye flour, 1 kg",\n  "offers": {\n    "@type": "Offer",\n    "price": "£4.50",\n    "priceCurrency": "GBP",\n  }\n}\n</script>',
      output:
        "Syntax error at line 10, column 3: Trailing comma: remove the comma before the closing }.\n\nAfter removing the comma:\nError    @type “product” should be “Product”: type names are case-sensitive.\nWarning  price “£4.50” should be a plain number such as 19.99, without currency symbols.\nWarning  Offer: missing recommended property availability.\nWarning  Offer: missing recommended property url.",
      note: "This is the **Example** in the tool. Pasted code is checked in your browser; only the URL mode uses our server.",
    },
    sections: [
      {
        heading: "Syntax errors vs vocabulary errors",
        body: "A **syntax error** means the text isn't valid JSON, so nothing in that block can be read at all. The usual causes: a trailing comma before `}` or `]`, single quotes instead of double quotes, curly quotes pasted from a word processor, a missing comma between properties, or comments. The validator stops at the first one and shows its line and column.\n\nA **vocabulary error** means the JSON is fine but the content isn't: a misspelled or wrongly capitalized `@type` (`product` instead of `Product`), a missing `@context`, a date in the wrong format or a price with a currency symbol.",
      },
      {
        heading: "Missing required and recommended properties",
        body: "For the types Google documents rich results for, the validator checks the properties Google lists:\n\n| Type | Required |\n|---|---|\n| Product | name, plus offers, review or aggregateRating |\n| Offer | price |\n| Event | name, startDate, location |\n| LocalBusiness and subtypes | name, address |\n| BreadcrumbList | itemListElement, each with position and name |\n| AggregateRating | ratingValue, plus ratingCount or reviewCount |\n| Recipe | name, image |\n| VideoObject | name, thumbnailUrl, uploadDate |\n| JobPosting | title, description, datePosted, hiringOrganization, jobLocation |\n\nRecommended properties (Article headline, image and dates; Offer availability) appear as warnings. It also checks dates are ISO 8601, URLs are absolute, prices are plain numbers and currencies are three-letter codes.",
      },
      {
        heading: "Checking a live URL",
        body: "In **Check a URL** mode our server fetches the page and reads every `<script type=\"application/ld+json\">` in the HTML it receives. Markup inserted later by JavaScript or Google Tag Manager isn't in that HTML, so it won't appear here even though Google, which renders JavaScript, may see it. If the page uses microdata instead, the validator lists the microdata types it found but doesn't check them.",
      },
      {
        heading: "This tool vs Schema.org's validator vs the Rich Results Test",
        body: "- **This validator:** quick feedback while you edit, plain-English syntax errors with line numbers, and Google's required properties for common types. Pasted code never leaves your browser.\n- **Schema.org's Schema Markup Validator** (validator.schema.org, which replaced Google's Structured Data Testing Tool in 2021): checks against the full schema.org vocabulary, including microdata and RDFa, but not Google's requirements.\n- **Google's Rich Results Test:** the final word on which rich results a page is eligible for, rendered as Googlebot sees it.\n\nUse this one while writing, then confirm with the Rich Results Test.",
      },
    ],
    faq: [
      {
        q: "What replaced Google's Structured Data Testing Tool?",
        a: "Google retired it in 2021. Its general checks moved to the Schema Markup Validator at validator.schema.org, and Google's rich-result checks are in the Rich Results Test.",
      },
      {
        q: "Why doesn't valid schema show rich results?",
        a: "Valid markup only makes a page eligible. Google shows rich results when it judges them useful for a search, the content follows its guidelines, and the page is indexed. Some types, such as FAQ and HowTo, no longer produce rich results at all.",
      },
      {
        q: "Can I validate microdata?",
        a: "Not here; this tool checks JSON-LD. Use validator.schema.org for microdata and RDFa, or convert the markup to JSON-LD with the [schema markup generator](/schema-markup-generator/).",
      },
    ],
    sources: [
      { label: "Google Search Central: General structured data guidelines", url: "https://developers.google.com/search/docs/appearance/structured-data/sd-policies" },
      { label: "Google Search Central: Structured data markup that Google Search supports", url: "https://developers.google.com/search/docs/appearance/structured-data/search-gallery" },
      { label: "Google Rich Results Test", url: "https://search.google.com/test/rich-results" },
      { label: "Schema Markup Validator (schema.org)", url: "https://validator.schema.org/" },
      { label: "RFC 8259: The JavaScript Object Notation (JSON) Data Interchange Format", url: "https://www.rfc-editor.org/rfc/rfc8259" },
    ],
    related: ["schema-markup-generator", "meta-tags-analyzer", "website-seo-score-checker", "serp-simulator"],
    links: [
      { href: "/schema-markup-generator/", anchor: "schema markup generator" },
      { href: "/blog/schema-markup-examples/", anchor: "JSON-LD examples" },
      { href: "/meta-tags-analyzer/", anchor: "meta tag analyzer" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "JSON syntax errors with line, column and a plain-English fix",
      "Case-sensitive @type and @context checks",
      "Google's required and recommended properties for common rich result types",
      "Date, URL, price and currency format checks",
      "Paste code (checked in the browser) or validate a live URL",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 2,
  },

  /* ------------------------------------------------------------------ URL slug generator */
  {
    id: "url-slug-generator",
    path: "/url-slug-generator/",
    name: "URL Slug Generator",
    h1: "URL Slug Generator",
    title: "URL Slug Generator – Turn Titles Into Clean URLs",
    metaDescription:
      "Turn titles into clean URL slugs: lowercase, hyphenated, accents converted and stop words optionally removed. Process a whole list of titles at once.",
    summary:
      "Turn page titles into clean URL slugs: lowercase, hyphen-separated, accents converted and punctuation removed, with optional stop-word removal and a length limit. Works on a whole list at once.",
    category: "free-seo-tools",
    subgroup: "onpage",
    card: "Turn titles into short, lowercase, hyphenated URL slugs.",
    archetype: "transform",
    widget: "seo-generators",
    config: { tool: "slug" },
    aliases: ["slug generator", "seo friendly url generator", "slugify online", "permalink generator", "url slug maker", "title to slug", "slugify", "clean url generator"],
    keywords: ["slug", "permalink", "url", "hyphen"],
    processing: "browser",
    steps: [
      "Paste one title, or many titles one per line, into **Titles (one per line)**.",
      "Choose the **Separator**, a **Maximum length** and whether to **Remove stop words** or **Convert accents**.",
      "Copy a single slug with its **Copy** button, or every slug with **Copy all**.",
    ],
    example: {
      title: "Example: three titles",
      input: "10 Tips for Crème Brûlée & Other French Desserts!\nWhat Is the Best Way to Store a Sourdough Starter?\nStraße in München: Ein Überblick",
      output: "10-tips-for-creme-brulee-and-other-french-desserts\nwhat-is-the-best-way-to-store-a-sourdough-starter\nstrasse-in-munchen-ein-uberblick",
      note: "With **Remove stop words** ticked, the first two become `10-tips-creme-brulee-other-french-desserts` and `best-way-store-sourdough-starter`. The & becomes “and”, ß becomes “ss”.",
    },
    sections: [
      {
        heading: "What makes a good slug",
        body: "A slug is the part of the URL that names the page: `/blog/sourdough-starter/`. Good slugs are short, readable and describe the page in a few words, because the URL appears in search results, in shared links and in browser history. Rules of thumb:\n\n- Lowercase only. Paths are case-sensitive on most servers, so `/Shoes` and `/shoes` can be two pages.\n- Hyphens between words. Google treats hyphens as word separators; underscores join words together.\n- No dates or IDs unless they're needed, so the URL still fits when you update the page.\n- Three to five meaningful words is usually enough.",
      },
      {
        heading: "Stop words: remove or keep?",
        body: "Removing \"a\", \"the\", \"of\" and \"to\" shortens slugs without losing meaning: `best-way-store-sourdough-starter` is still clear. Keep them when removing changes the meaning or reads badly (`how-to-fix` versus `fix`, or a brand name such as \"The Body Shop\"). Search engines don't need the stop words removed; it's purely about length and readability. If removing every stop word would leave nothing, the generator keeps the original words.",
      },
      {
        heading: "Accents and non-Latin characters",
        body: "**Convert accents** turns é into e, ü into u, ß into ss, æ into ae and ø into o, which keeps URLs plain ASCII and easy to type and share. Letters with no Latin equivalent (Cyrillic, Greek, Arabic, Chinese) are kept as they are: browsers display them, and they are sent as percent-encoded UTF-8. Turn conversion off for sites in languages where readers expect the original spelling, such as German or French sites that keep umlauts and accents in URLs.",
      },
      {
        heading: "Changing slugs on live pages",
        body: "Changing the URL of a page that's already indexed or linked loses those signals unless you add a 301 redirect from the old URL to the new one. Update internal links to the new URL too, so visitors and crawlers don't go through the redirect. Only change a live slug when the old one is misleading or wrong; a slightly long slug isn't worth the risk. Check the redirect afterwards with the [redirect checker](/redirect-checker/).",
      },
    ],
    faq: [
      {
        q: "Should I remove stop words from URLs?",
        a: "It's optional. Removing them makes slugs shorter; it doesn't change rankings. Keep them where the slug would be confusing without them.",
      },
      {
        q: "Hyphens or underscores?",
        a: "Hyphens. Google's URL guidelines recommend hyphens to separate words, because underscores can join the words into one. Underscores are available here only for systems that need them.",
      },
      {
        q: "Should I change old URLs to match new slugs?",
        a: "Usually not. Each change needs a permanent redirect and updated internal links. Use clean slugs for new pages, and change old ones only if they're genuinely wrong.",
      },
    ],
    sources: [{ label: "Google Search Central: URL structure best practices", url: "https://developers.google.com/search/docs/crawling-indexing/url-structure" }, { label: "RFC 3986: Uniform Resource Identifier (URI) syntax", url: "https://www.rfc-editor.org/rfc/rfc3986" }],
    related: ["title-tag-generator", "canonical-url-generator", "redirect-checker", "remove-letter-accents"],
    links: [
      { href: "/remove-letter-accents/", anchor: "remove accents" },
      { href: "/htaccess-redirect-generator/", anchor: "set up a redirect" },
      { href: "/redirect-checker/", anchor: "redirect checker" },
      { href: "/title-tag-generator/", anchor: "title tag generator" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "Bulk: one slug per line of titles",
      "Hyphen or underscore separator and a word-boundary length limit",
      "Accent conversion (é → e, ß → ss) that keeps non-Latin scripts",
      "Optional stop-word removal",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 2,
  },

  /* ------------------------------------------------------------------ hreflang generator */
  {
    id: "hreflang-tags-generator",
    path: "/hreflang-tags-generator/",
    name: "Hreflang Tags Generator",
    h1: "Hreflang Tags Generator",
    title: "Hreflang Tag Generator – HTML, Sitemap and HTTP Header",
    metaDescription:
      "Generate hreflang annotations for every language and region version of a page, including x-default, as link tags, XML sitemap entries or HTTP headers.",
    summary:
      "Generate hreflang annotations for every language and region version of a page, including x-default, as HTML link tags, XML sitemap entries or HTTP Link headers, with the codes checked as you type.",
    category: "free-seo-tools",
    subgroup: "crawl",
    card: "Generate hreflang tags for language and region versions of a page.",
    archetype: "generator",
    widget: "seo-generators",
    config: { tool: "hreflang" },
    aliases: ["hreflang generator", "hreflang tags", "hreflang sitemap generator", "x-default", "hreflang tag builder", "alternate language tags", "multilingual seo tags", "href lang generator"],
    keywords: ["international", "language", "region", "multilingual"],
    processing: "browser",
    steps: [
      "Enter a **Code** and **URL** for every language or region version, including the page you're on. Use **Add language** for more rows.",
      "Keep the **x-default** row and point it at the page for everyone else (often the homepage or a language picker).",
      "Fix anything flagged under a row, such as en-UK or en_US.",
      "Choose the **Output format** and press **Copy** or **Download**. Add the same set to every version.",
    ],
    example: {
      title: "Example: English, UK English and German",
      input: "en → https://www.example.com/\nen-GB → https://www.example.com/uk/\nde → https://www.example.com/de/\nx-default → https://www.example.com/",
      output:
        '<link rel="alternate" hreflang="en" href="https://www.example.com/">\n<link rel="alternate" hreflang="en-GB" href="https://www.example.com/uk/">\n<link rel="alternate" hreflang="de" href="https://www.example.com/de/">\n<link rel="alternate" hreflang="x-default" href="https://www.example.com/">',
      note: "Typing `en-UK` instead shows: “UK isn't an ISO 3166-1 country code. Use en-GB.” Codes are normalized, so `en-gb` becomes `en-GB`.",
    },
    sections: [
      {
        heading: "Language and region codes",
        body: "An hreflang value is a language, optionally followed by a region: `de` (German, anywhere), `de-AT` (German for Austria), `zh-Hant-TW` (Traditional Chinese for Taiwan). The language must be a two-letter ISO 639-1 code and the region a two-letter ISO 3166-1 country code. A region on its own (`GB`) isn't valid. The generator checks both parts and shows the language and country names so you can spot typos.",
      },
      {
        heading: "Return links: every version lists every version",
        body: "Hreflang works only as a complete, two-way set. If the English page says the German page is its `de` version, the German page must link back to the English page, and each page must also list itself. When the links don't match, search engines ignore the annotations for those pages. In practice: generate the set once, then put the identical block on every version.",
      },
      {
        heading: "x-default explained",
        body: "`x-default` tells search engines which URL to show to searchers whose language or region doesn't match any version you list. It's usually the homepage that redirects by language, a language picker, or your main international version. It isn't required, but without it, someone searching in Italian on a site with only English and German may land on either one.",
      },
      {
        heading: "HTML vs sitemap vs HTTP header",
        body: "| Method | Best for | Notes |\n|---|---|---|\n| `<link>` tags in `<head>` | Small and medium sites | Adds a few lines to every page |\n| XML sitemap | Large sites, many languages | Keeps page HTML small; each `<url>` lists all versions |\n| HTTP `Link` header | PDFs and other non-HTML files | Needs server configuration |\n\nUse one method per page. Mixing them is allowed but makes mistakes harder to find.",
      },
      {
        heading: "Common hreflang mistakes",
        body: "- **Wrong codes:** `en-UK` (should be `en-GB`), `en_US` (underscore), `es-LA` (no such country), or region numbers such as `es-419`, which Google doesn't support.\n- **Missing return links** or missing self-references.\n- **Pointing to redirects or non-canonical URLs:** each URL should return 200 and be the canonical version.\n- **Relative URLs:** hreflang needs absolute URLs.\n- **One code, two URLs:** each code may appear once per set.",
      },
    ],
    faq: [
      {
        q: "Do hreflang pages need to link back to each other?",
        a: "Yes. Each version must list all versions, including itself. If page A points to B but B doesn't point back to A, the annotation is ignored.",
      },
      {
        q: "Is en-UK a valid code?",
        a: "No. The ISO 3166-1 code for the United Kingdom is GB, so use `en-GB`. `UK` is reserved but not assigned as a country code.",
      },
      {
        q: "Does hreflang replace canonical tags?",
        a: "No, they work together. Each language version should have a self-referencing canonical; don't point all versions' canonicals at one language, or the others may drop out of the index.",
      },
    ],
    sources: [
      { label: "Google Search Central: Tell Google about localized versions of your page", url: "https://developers.google.com/search/docs/specialty/international/localized-versions" },
      { label: "ISO 639 language codes (Library of Congress)", url: "https://www.loc.gov/standards/iso639-2/php/code_list.php" },
      { label: "ISO 3166 country codes (ISO Online Browsing Platform)", url: "https://www.iso.org/obp/ui/#search" },
      { label: "RFC 8288: Web Linking (the HTTP Link header)", url: "https://www.rfc-editor.org/rfc/rfc8288" },
    ],
    related: ["canonical-url-generator", "xml-sitemap-generator", "meta-tags-analyzer", "robots-txt-generator"],
    links: [
      { href: "/canonical-url-generator/", anchor: "canonical tag generator" },
      { href: "/xml-sitemap-generator/", anchor: "XML sitemap generator" },
      { href: "/blog/hreflang-guide/", anchor: "hreflang implementation guide" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "HTML link tags, XML sitemap entries or HTTP Link headers",
      "Language and country codes validated, with names shown",
      "Catches en-UK, underscores, duplicates and relative URLs",
      "x-default row included by default",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 3,
  },

  /* ------------------------------------------------------------------ canonical URL generator */
  {
    id: "canonical-url-generator",
    path: "/canonical-url-generator/",
    name: "Canonical URL Generator",
    h1: "Canonical URL Generator",
    title: "Canonical Tag Generator – rel=canonical for Any URL",
    metaDescription:
      "Generate rel=canonical tags or HTTP Link headers, normalise URLs (protocol, www, trailing slash, parameters) and see when a canonical is the right fix.",
    summary:
      "Turn messy URLs into clean canonical ones (https, www, trailing slash, tracking parameters removed) and get the rel=canonical tag or HTTP Link header for each, one URL or a whole list.",
    category: "free-seo-tools",
    subgroup: "crawl",
    card: "Clean up URLs and generate rel=canonical tags or Link headers.",
    archetype: "transform",
    widget: "seo-generators",
    config: { tool: "canonical" },
    aliases: ["canonical url generator", "rel canonical tag", "canonical link generator", "canonical http header", "canonical tag creator", "url normalizer", "remove utm parameters", "canonical generator"],
    keywords: ["duplicate content", "canonical", "utm", "parameters"],
    processing: "browser",
    steps: [
      "Paste one or more **Page URLs**, one per line.",
      "Set the **Normalization rules**: **www**, **Trailing slash** and **Query parameters** (add any parameter to **Always keep these parameters** if it changes the content).",
      "Pick the **Output**: a `<link>` tag, an HTTP header or the bare URL. Each line shows what was changed.",
      "Press **Copy** and add the tag to the page's `<head>` (or the header in your server configuration).",
    ],
    example: {
      title: "Example (www: Add, Trailing slash: Add, Remove tracking)",
      input: "http://Example.com/Shoes/index.html?utm_source=news&color=red&gclid=abc#reviews\nexample.com/blog/post",
      output:
        '<link rel="canonical" href="https://www.example.com/Shoes/?color=red">\n  Changed: http → https; added www; removed #fragment; removed utm_source, gclid; removed index file\n<link rel="canonical" href="https://www.example.com/blog/post/">\n  Changed: added www; added trailing slash',
      note: "`color=red` is kept because it isn't a tracking parameter: it may show different products. Choose **Remove all** if your parameters never change the content.",
    },
    sections: [
      {
        heading: "What a canonical tag tells search engines",
        body: "`<link rel=\"canonical\" href=\"…\">` says \"of all the URLs that show this content, this is the one to index\". It consolidates signals such as links from duplicates into the chosen URL. It's a strong hint, not an order: Google also weighs redirects, internal links, sitemaps and HTTPS when choosing the canonical, so keep those consistent with the tag.",
      },
      {
        heading: "Self-referencing canonicals",
        body: "Every indexable page should usually point its canonical at its own clean URL. That way, when someone links to `?utm_source=newsletter` or a session ID gets appended, the variants still consolidate to the right address. Generate the canonical from the page's preferred URL, not from whatever URL the visitor arrived at.",
      },
      {
        heading: "Parameters, trailing slashes and www",
        body: "Search engines treat each of these as a different URL: `http://` and `https://`, with and without `www.`, with and without a trailing slash, different upper and lower case in the path, and any change in the query string. The generator's rules pick one version of each:\n\n- **Remove tracking** strips `utm_*`, `gclid`, `fbclid`, `msclkid`, `mc_cid` and similar click identifiers.\n- **Remove all** drops every parameter except those you list to keep (pagination or product IDs).\n- Fragments (`#reviews`) are always removed; they never reach the server.\n- File URLs such as `guide.pdf` never get a trailing slash.",
      },
      {
        heading: "HTTP header canonicals for PDFs",
        body: "PDFs, images and other files have no `<head>`, so the canonical goes in the HTTP response instead: `Link: <https://www.example.com/guide.pdf>; rel=\"canonical\"`. Use it when the same PDF is available at several URLs, or to point a PDF at the HTML page with the same content. Set it in your server configuration (Apache `Header add Link`, Nginx `add_header Link`).",
      },
      {
        heading: "Canonical vs redirect vs noindex",
        body: "| Situation | Use |\n|---|---|\n| Old URL replaced by a new one | 301 redirect |\n| Variants that must stay reachable (tracking, sort order, print view) | Canonical to the main URL |\n| Page that shouldn't appear in search at all | noindex |\n| http/https or www/non-www versions | 301 redirect, plus canonicals |\n\nDon't combine noindex and a canonical on the same page: one says \"don't index\", the other \"index that one instead\".",
      },
    ],
    faq: [
      {
        q: "Should every page have a self-referencing canonical?",
        a: "It's a good default for indexable pages. It protects against parameters, tracking codes and other duplicates created by links you don't control.",
      },
      {
        q: "Can Google ignore my canonical?",
        a: "Yes. If other signals disagree (internal links, redirects or the sitemap point elsewhere, or the pages aren't really duplicates), Google may choose a different canonical. Search Console's URL Inspection shows which one it picked.",
      },
      {
        q: "When should I use a 301 instead?",
        a: "When visitors don't need the duplicate URL any more, for example after moving a page or switching to HTTPS. A redirect is a stronger signal than a canonical and also sends people to the right place.",
      },
    ],
    sources: [GSC.canonical, { label: "RFC 6596: The Canonical Link Relation", url: "https://www.rfc-editor.org/rfc/rfc6596" }, { label: "RFC 8288: Web Linking", url: "https://www.rfc-editor.org/rfc/rfc8288" }],
    related: ["hreflang-tags-generator", "redirect-checker", "meta-tags-analyzer", "url-slug-generator", "xml-sitemap-generator"],
    links: [
      { href: "/hreflang-tags-generator/", anchor: "hreflang generator" },
      { href: "/redirect-checker/", anchor: "redirect checker" },
      { href: "/meta-tags-analyzer/", anchor: "check a page's canonical" },
      { href: "/blog/canonical-tags-explained/", anchor: "canonical tags explained" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "Normalizes protocol, www, trailing slash, index files and case",
      "Removes tracking parameters or all parameters, with a keep list",
      "Outputs link tags, HTTP Link headers or bare URLs",
      "Works on a list of up to 500 URLs and explains each change",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 3,
  },

  /* ------------------------------------------------------------------ robots.txt generator */
  {
    id: "robots-txt-generator",
    path: "/robots-txt-generator/",
    name: "Robots.txt Generator",
    h1: "Robots.txt Generator",
    title: "Robots.txt Generator – Rules for Search and AI Crawlers",
    metaDescription:
      "Build a robots.txt file with allow and disallow rules per crawler, including AI crawlers such as GPTBot, add your sitemap and download the file.",
    summary:
      "Build a robots.txt file with allow and disallow rules for any crawler, block AI crawlers such as GPTBot, ClaudeBot and Google-Extended, add your sitemap and download the file.",
    category: "free-seo-tools",
    subgroup: "crawl",
    card: "Build a robots.txt with crawler rules, AI bot blocks and sitemaps.",
    archetype: "generator",
    widget: "seo-generators",
    config: { tool: "robots" },
    aliases: ["robots txt generator", "create robots.txt", "robots.txt file generator", "robots.txt for wordpress", "block gptbot", "robots.txt maker", "block ai crawlers", "robot txt generator", "robots.txt creator"],
    keywords: ["crawler", "disallow", "gptbot", "ai", "sitemap"],
    processing: "browser",
    steps: [
      "Choose **All crawlers**: **Allow, with exceptions below** for a normal site.",
      "Tick **WordPress defaults** if you use WordPress, and add **Allow and disallow rules** for paths to keep out of crawling.",
      "Under **AI crawlers**, tick the bots to block; each one says what it does.",
      "Add your **Sitemap URLs**, then **Download** the file and upload it to your domain's root. Use **Test these rules in the robots.txt tester** to check URLs against it.",
    ],
    example: {
      title: "Example: WordPress site blocking three AI crawlers",
      input: "All crawlers: Allow · WordPress defaults: on\nDisallow: /cart/ · Disallow: search\nAI crawlers: GPTBot, CCBot, Google-Extended\nSitemap: https://www.example.com/sitemap.xml",
      output:
        "User-agent: *\nDisallow: /wp-admin/\nAllow: /wp-admin/admin-ajax.php\nDisallow: /cart/\nDisallow: /search\n\n# AI crawlers\nUser-agent: GPTBot\nUser-agent: CCBot\nUser-agent: Google-Extended\nDisallow: /\n\nSitemap: https://www.example.com/sitemap.xml",
      note: "The path `search` was typed without a slash; the generator adds it. Several user-agent lines above one rule form a single group, as RFC 9309 allows.",
    },
    sections: [
      {
        heading: "User-agent groups and rules",
        body: "A robots.txt file is a list of groups. Each group starts with one or more `User-agent:` lines naming crawlers, followed by `Allow:` and `Disallow:` rules. A crawler follows the group that names it most specifically and ignores the rest; `User-agent: *` covers every crawler without its own group. Within a group, the longest matching rule wins, so `Allow: /wp-admin/admin-ajax.php` beats `Disallow: /wp-admin/`. Paths are case-sensitive; `*` matches any characters and `$` marks the end of the URL.",
      },
      {
        heading: "Blocking or allowing AI crawlers",
        body: "AI companies use separate user agents for training, search and user-triggered fetches, so you can block one without the others:\n\n| Token | Purpose |\n|---|---|\n| GPTBot, ClaudeBot, CCBot, Meta-ExternalAgent | Collect training data |\n| OAI-SearchBot, Claude-SearchBot, PerplexityBot | Index pages for AI search answers |\n| ChatGPT-User, Claude-User | Fetch a page a user asked about |\n| Google-Extended, Applebot-Extended | Control tokens: not crawlers; they govern AI use of content Googlebot/Applebot already crawl |\n\nBlocking Google-Extended doesn't affect Google Search rankings or AI Overviews in Search. robots.txt is a request; well-behaved crawlers follow it, but it isn't access control.",
      },
      {
        heading: "Adding your sitemap",
        body: "`Sitemap: https://www.example.com/sitemap.xml` can go anywhere in the file and applies to all crawlers. Use the full URL, and list several sitemaps or a sitemap index if you have more than one. It's the easiest way for crawlers other than Google and Bing (where you can also submit sitemaps directly) to find your sitemap. Need one? Use the [XML sitemap generator](/xml-sitemap-generator/).",
      },
      {
        heading: "Crawl-delay: who respects it",
        body: "`Crawl-delay: 10` asks a crawler to wait 10 seconds between requests. Bing and Yandex honor it; Google ignores it and adjusts its crawl rate automatically based on how your server responds (slow responses and 5xx/429 errors slow it down). If Googlebot really overloads your server, return 503 or 429 temporarily rather than relying on crawl-delay.",
      },
      {
        heading: "Mistakes that block a whole site",
        body: "- `Disallow: /` under `User-agent: *`, often left over from a staging site.\n- Blocking CSS and JavaScript folders, which stops Google rendering pages properly.\n- Using robots.txt to hide a page from search: a blocked URL can still be indexed (without content) if other sites link to it. Use `noindex` instead, and don't block the page, or crawlers will never see the noindex.\n- Typos in field names (`Disalow`), which crawlers silently ignore.\n- Serving robots.txt with a 5xx error, which makes Google pause crawling the whole site.",
      },
    ],
    faq: [
      {
        q: "Does robots.txt stop pages being indexed?",
        a: "No. It stops crawling, not indexing. A blocked URL can still appear in results if it's linked from elsewhere. To keep a page out of search, allow crawling and add a noindex robots meta tag.",
      },
      {
        q: "How do I block GPTBot?",
        a: "Add a group with `User-agent: GPTBot` and `Disallow: /`, or tick GPTBot under AI crawlers. That stops OpenAI's training crawler; OAI-SearchBot and ChatGPT-User are separate tokens.",
      },
      {
        q: "Does Google support crawl-delay?",
        a: "No. Googlebot ignores Crawl-delay. Bing and Yandex respect it.",
      },
    ],
    sources: [
      { label: "RFC 9309: Robots Exclusion Protocol", url: "https://www.rfc-editor.org/rfc/rfc9309" },
      { label: "Google Search Central: How Google interprets the robots.txt specification", url: "https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt" },
      { label: "Google: Common crawlers and user-triggered fetchers (incl. Google-Extended)", url: "https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers" },
      { label: "OpenAI: Overview of OpenAI crawlers", url: "https://platform.openai.com/docs/bots" },
    ],
    related: ["robots-txt-tester", "xml-sitemap-generator", "meta-tag-generator", "http-status-checker"],
    links: [
      { href: "/robots-txt-tester/", anchor: "robots.txt tester" },
      { href: "/xml-sitemap-generator/", anchor: "XML sitemap generator" },
      { href: "/blog/robots-txt-guide/", anchor: "robots.txt guide with examples" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "Allow and disallow rules per user agent",
      "One-click blocks for 13 AI crawlers and control tokens, each explained",
      "WordPress defaults, sitemap lines and optional crawl-delay",
      "Download robots.txt or send it straight to the tester",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 1,
  },

  /* ------------------------------------------------------------------ robots.txt tester */
  {
    id: "robots-txt-tester",
    path: "/robots-txt-tester/",
    name: "Robots.txt Tester",
    h1: "Robots.txt Tester",
    title: "Robots.txt Tester – Check if a URL Is Blocked",
    metaDescription:
      "Fetch a site's robots.txt or paste your own, then test any URL against Googlebot, Bingbot or another user agent to see which rule allows or blocks it.",
    summary:
      "Fetch a site's live robots.txt or paste your own rules, then test URLs as Googlebot, Bingbot, GPTBot or any crawler to see whether each is allowed and exactly which rule decided it.",
    category: "free-seo-tools",
    subgroup: "crawl",
    card: "Test URLs against robots.txt and see which rule decides.",
    archetype: "analyzer",
    widget: "robots-tester",
    aliases: ["robots.txt checker", "robots.txt validator", "test robots.txt", "is url blocked by robots.txt", "robots txt tester", "robots.txt test tool", "googlebot blocked checker", "robots checker"],
    keywords: ["robots.txt", "blocked", "googlebot", "disallow", "crawl"],
    processing: "server",
    limits: ["The live fetch runs from our server; pasted rules are tested in your browser. Matching follows RFC 9309 and Google's documented rules."],
    steps: [
      "Enter a domain under **Site address** and press **Fetch robots.txt**, or paste rules into **robots.txt rules**.",
      "Pick a **User agent** (or **Other…** for any crawler token).",
      "List the **URLs or paths** to test, one per line.",
      "Read **Results**: each URL says Allowed or Blocked and quotes the rule and line number that decided it. Check **Syntax notes** for ignored or misspelled lines.",
    ],
    example: {
      title: "Example: one file, five URLs (illustrative)",
      input:
        "User-agent: *\nDisallow: /search\nDisallow: /*.pdf$\nAllow: /search/help\n\nUser-agent: Googlebot\nDisallow: /private/\nAllow: /private/press/",
      output:
        "As Bingbot:\nBlocked  /search?q=bread       ← Disallow: /search (line 2)\nAllowed  /search/help          ← Allow: /search/help (line 4), the longer match\nBlocked  /files/menu.pdf       ← Disallow: /*.pdf$ (line 3)\nAllowed  /files/menu.pdf?v=2   ← no rule matches ($ needs the URL to end in .pdf)\n\nAs Googlebot:\nAllowed  /search?q=bread       ← Googlebot has its own group, which has no /search rule\nAllowed  /private/press/2026.html ← Allow: /private/press/ (line 9)\nBlocked  /private/report.html  ← Disallow: /private/ (line 8)",
      note: "These are the tool's results for the **Example** button. Googlebot ignores the `*` group entirely because a group names it; Googlebot-News, which has no group, falls back to the Googlebot group.",
    },
    sections: [
      {
        heading: "How rule matching works (longest match wins)",
        body: "1. **Pick the group.** The crawler looks for groups whose `User-agent` matches its token (case-insensitive). If several groups name it, they're combined. Google's specialised crawlers fall back to `Googlebot`. If no group names it, the `*` group applies; if there's no `*` group either, everything is allowed.\n2. **Find matching rules.** Each `Allow`/`Disallow` path is compared with the start of the URL path and query.\n3. **Longest wins.** The rule with the longest path decides. If an Allow and a Disallow are equally long, Allow wins.\n4. `/robots.txt` itself is always allowed, and an empty `Disallow:` matches nothing.",
      },
      {
        heading: "Wildcards and $ anchors",
        body: "| Pattern | Matches | Doesn't match |\n|---|---|---|\n| `/shop` | /shop, /shop/, /shopping, /shop?id=2 | /Shop |\n| `/shop/` | /shop/, /shop/shoes | /shop |\n| `/*.pdf` | /a.pdf, /a.pdf?x=1, /x/a.pdf.html | /a.PDF |\n| `/*.pdf$` | /a.pdf | /a.pdf?x=1 |\n| `/*?` | any URL with a query string | /page |\n\nPaths are case-sensitive and matched from the start. `*` matches any characters, including `/`.",
      },
      {
        heading: "Testing different user agents",
        body: "The same file can treat crawlers very differently, which is why the tester asks for the user agent. A common surprise: adding a `User-agent: Googlebot` group makes Googlebot ignore every rule under `User-agent: *`, so rules meant for everyone have to be repeated in the Googlebot group. Test both your search crawlers (Googlebot, Bingbot) and any AI crawlers (GPTBot, ClaudeBot, PerplexityBot) you meant to block.",
      },
      {
        heading: "Syntax errors and unsupported lines",
        body: "Crawlers skip lines they don't understand without telling you. The tester flags them: misspelled fields (`Disalow`), rules placed before any `User-agent`, sitemap lines without a full URL, and directives Google doesn't support (`Crawl-delay`, `Noindex`, `Host`). It also warns when a file is larger than 500 KiB, the most Google reads. When fetching a live file it explains the status: a 404 means everything is allowed; a 5xx makes Google pause crawling the site.",
      },
      {
        heading: "Blocked vs not indexed",
        body: "Blocking a URL in robots.txt stops crawlers reading it; it doesn't remove it from search. Google can still index a blocked URL from links, shown without a description (\"No information is available for this page\"). If you want a page out of search, allow crawling and use a `noindex` meta tag, then check it with the [meta tags analyzer](/meta-tags-analyzer/). And if a page you want indexed shows as \"Blocked by robots.txt\" in Search Console, this tester shows which line is responsible.",
      },
    ],
    faq: [
      {
        q: "Why is my page 'blocked by robots.txt' in Search Console?",
        a: "A Disallow rule in the group that applies to Googlebot matches the URL. Test the URL here as Googlebot to see the exact line, then remove or narrow that rule, or add a longer Allow rule.",
      },
      {
        q: "Do Allow rules override Disallow?",
        a: "Only when they're at least as long. The longest matching rule wins regardless of order in the file; Allow wins a tie.",
      },
      {
        q: "Is robots.txt case-sensitive?",
        a: "The paths are: `Disallow: /Private/` doesn't block `/private/`. Field names (`Disallow`, `user-agent`) and crawler names aren't. The file must be named robots.txt in lowercase.",
      },
    ],
    sources: [
      { label: "RFC 9309: Robots Exclusion Protocol", url: "https://www.rfc-editor.org/rfc/rfc9309" },
      { label: "Google Search Central: How Google interprets the robots.txt specification", url: "https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt" },
      { label: "Google Search Central: Block indexing with noindex", url: "https://developers.google.com/search/docs/crawling-indexing/block-indexing" },
    ],
    related: ["robots-txt-generator", "http-status-checker", "meta-tags-analyzer", "xml-sitemap-generator"],
    links: [
      { href: "/robots-txt-generator/", anchor: "robots.txt generator" },
      { href: "/blog/robots-txt-guide/", anchor: "robots.txt guide" },
      { href: "/http-status-checker/", anchor: "HTTP status checker" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "Fetches the live robots.txt from our server or tests pasted rules",
      "RFC 9309 matching: longest match, Allow wins ties, * and $ wildcards",
      "Per-crawler group selection, including Googlebot fallbacks",
      "Names the rule and line number behind every result",
      "Flags misspelled fields and directives Google ignores",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 1,
  },

  /* ------------------------------------------------------------------ XML sitemap generator */
  {
    id: "xml-sitemap-generator",
    path: "/xml-sitemap-generator/",
    name: "XML Sitemap Generator",
    h1: "XML Sitemap Generator",
    title: "XML Sitemap Generator – Create sitemap.xml for Your Site",
    metaDescription:
      "Paste a list of URLs to create a valid sitemap.xml with optional lastmod dates. Large lists are split with an index. Download and submit it in Search Console.",
    summary:
      "Paste a list of page URLs to create a valid sitemap.xml with optional lastmod dates; duplicates are removed and lists over 50,000 URLs are split into files with a sitemap index.",
    category: "free-seo-tools",
    subgroup: "crawl",
    card: "Turn a list of URLs into a valid sitemap.xml file.",
    archetype: "generator",
    widget: "seo-generators",
    config: { tool: "sitemap" },
    aliases: ["sitemap generator", "create xml sitemap", "sitemap.xml generator", "free sitemap generator", "sitemap maker", "url list to sitemap", "xml sitemap builder", "site map generator"],
    keywords: ["sitemap", "xml", "lastmod", "search console"],
    processing: "browser",
    limits: ["Doesn't crawl your site: paste the URLs (export them from your CMS, a crawler or a spreadsheet)."],
    steps: [
      "Paste absolute URLs into **Page URLs**, one per line. Add a date after a URL (space or tab, YYYY-MM-DD) to set its lastmod.",
      "Choose **lastmod**: **Dates from my list**, **Today for all** or **None**. Leave changefreq and priority out unless another system needs them.",
      "Check the counts and any **Lines not used**.",
      "Press **Download** (or **Download all (ZIP)** for split sitemaps), upload to your site and submit the URL in Search Console.",
    ],
    example: {
      title: "Example",
      input:
        "https://www.example.com/\nhttps://www.example.com/about/ 2026-09-01\nhttps://www.example.com/blog/sourdough-starter/\t2026-09-20\nhttps://www.example.com/about/\n/contact/",
      output:
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>https://www.example.com/</loc>\n  </url>\n  <url>\n    <loc>https://www.example.com/about/</loc>\n    <lastmod>2026-09-01</lastmod>\n  </url>\n  <url>\n    <loc>https://www.example.com/blog/sourdough-starter/</loc>\n    <lastmod>2026-09-20</lastmod>\n  </url>\n</urlset>',
      note: "The second /about/ is dropped as a duplicate, and `/contact/` is listed under **Lines not used** because sitemap URLs must be absolute.",
    },
    sections: [
      {
        heading: "Crawling vs pasting URLs",
        body: "This generator builds the sitemap from a list you provide; it doesn't crawl your site. That's deliberate: a crawler only finds pages that are linked, and it would include pages you don't want indexed. Get the list from the most reliable source you have: your CMS (most can export all published URLs), a spreadsheet of products, or a desktop crawler such as Screaming Frog. Many platforms (WordPress 5.5+, Shopify, Wix, Squarespace) already generate a sitemap automatically at `/sitemap.xml` or `/wp-sitemap.xml`.",
      },
      {
        heading: "Which URLs belong in a sitemap",
        body: "Only the canonical URLs you want in search results:\n\n- **Include:** pages that return 200, are indexable and are their own canonical.\n- **Leave out:** redirects, 404s, `noindex` pages, URLs blocked by robots.txt, parameter variants and duplicates that canonicalize elsewhere.\n\nA sitemap full of non-canonical URLs teaches search engines to trust it less. Check a sample with the [HTTP status checker](/http-status-checker/) before submitting.",
      },
      {
        heading: "lastmod, changefreq and priority",
        body: "Google uses `<lastmod>` when it's consistently accurate, meaning the date the page's main content last changed, not the date the sitemap was generated. Setting today's date on every URL every day is the quickest way to have it ignored. Google ignores `<changefreq>` and `<priority>` completely, so the generator leaves them out unless you choose a value. Dates use the W3C format: `2026-09-20` or `2026-09-20T14:30:00+00:00`.",
      },
      {
        heading: "Large sites: sitemap index files",
        body: "One sitemap may hold at most **50,000 URLs** and **50 MB** uncompressed (sitemaps.org protocol). Above 50,000 URLs, the generator splits the list into `sitemap-1.xml`, `sitemap-2.xml` and so on, plus a `sitemap-index.xml` that lists them, and offers them as one ZIP. Upload all files to the same folder and submit only the index. All URLs in a sitemap must be on the same host as the sitemap, which is why mixed hosts are flagged.",
      },
      {
        heading: "Submitting your sitemap",
        body: "1. Upload the file to your site, usually `https://www.example.com/sitemap.xml`.\n2. Add `Sitemap: https://www.example.com/sitemap.xml` to robots.txt (the [robots.txt generator](/robots-txt-generator/) does this), so every crawler can find it.\n3. Submit it in Google Search Console (Indexing → Sitemaps) and Bing Webmaster Tools.\n4. Check the reports a few days later for URLs that couldn't be fetched or indexed.",
      },
    ],
    faq: [
      {
        q: "Does Google use changefreq and priority?",
        a: "No. Google has said it ignores both. It uses lastmod if the dates are consistently accurate.",
      },
      {
        q: "How many URLs can one sitemap hold?",
        a: "50,000 URLs or 50 MB uncompressed, whichever comes first. Larger sites need several sitemaps and a sitemap index, which this generator creates automatically.",
      },
      {
        q: "Should noindex pages be in a sitemap?",
        a: "No. A sitemap says \"please index these\"; listing noindex pages sends a contradictory signal and shows up as errors in Search Console.",
      },
    ],
    sources: [
      { label: "sitemaps.org: Sitemaps XML format", url: "https://www.sitemaps.org/protocol.html" },
      { label: "Google Search Central: Build and submit a sitemap", url: "https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap" },
      { label: "Google Search Central: Manage your sitemaps with sitemap index files", url: "https://developers.google.com/search/docs/crawling-indexing/sitemaps/large-sitemaps" },
    ],
    related: ["robots-txt-generator", "hreflang-tags-generator", "http-status-checker", "canonical-url-generator"],
    links: [
      { href: "/robots-txt-generator/", anchor: "robots.txt generator" },
      { href: "/hreflang-tags-generator/", anchor: "hreflang generator" },
      { href: "/http-status-checker/", anchor: "check URLs return 200" },
      { href: "/rss-feed-parser/", anchor: "RSS feed parser" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "Builds sitemap.xml from a pasted URL list",
      "Per-URL lastmod dates from the list, or one date for all",
      "Removes duplicates and flags relative URLs and mixed hosts",
      "Splits lists over 50,000 URLs and creates a sitemap index (ZIP download)",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 2,
  },

  /* ------------------------------------------------------------------ keyword density checker */
  {
    id: "keyword-density-checker",
    path: "/keyword-density-checker/",
    name: "Keyword Density Checker",
    h1: "Keyword Density Checker",
    title: "Keyword Density Checker – Word and Phrase Frequency",
    metaDescription:
      "Paste text or enter a URL to see how often words and 2-3 word phrases appear and their share of the total. Spot repetition before it reads as stuffing.",
    summary:
      "See how often each word and two- or three-word phrase appears in your text or on a web page, and what share of the text it makes up, so you can spot repetition before it reads as keyword stuffing.",
    category: "free-seo-tools",
    alsoIn: ["text-tools"],
    subgroup: "keywords",
    card: "Count how often words and phrases appear in text or on a page.",
    archetype: "analyzer",
    widget: "keyword-density",
    aliases: ["keyword density", "keyword frequency checker", "word frequency counter", "keyword density analyzer", "keyword stuffing checker", "phrase frequency", "keyword counter", "keyword density tool", "word density checker"],
    keywords: ["frequency", "repetition", "stuffing", "phrases"],
    processing: "server",
    pasteMode: true,
    limits: ["Pasted text is analyzed in your browser; only **Check a URL** uses our server.", "URL mode counts all visible text in the HTML, including menus and footers."],
    steps: [
      "Choose **Paste text** and paste your copy, or choose **Check a URL** and press **Fetch text**.",
      "Pick a **Phrase length**: **1 word**, **2 words** or **3 words**.",
      "Adjust **Minimum occurrences** and **Ignore stop words**; add phrases under **Track specific keywords** to count them exactly.",
      "Read the table, then **Copy** it or download it as **CSV**.",
    ],
    example: {
      title: "Example",
      input: "A sourdough starter is a mix of flour and water. Feed your sourdough starter every day. A healthy sourdough starter doubles in size. Keep the starter in a warm place, and feed the starter flour and water.",
      output: "Total words: 37\n\n1 word:  starter 5 (13.51%) · sourdough 3 (8.11%) · feed 2 (5.41%) · flour 2 (5.41%) · water 2 (5.41%)\n2 words: sourdough starter 3 (16.22%)\n3 words: flour and water 2 (16.22%)",
      note: "\"Starter\" makes up 13.5% of a short paragraph: a sign to vary the wording (\"it\", \"the culture\") if it reads repetitively. Stop words are ignored and the minimum count is 2.",
    },
    sections: [
      {
        heading: "How keyword density is calculated",
        body: "**Density = occurrences × words in the phrase ÷ total words × 100.** It's the share of your text that the word or phrase takes up. In a 37-word paragraph, a word used 5 times has a density of 5 ÷ 37 = 13.5%; a two-word phrase used 3 times covers 6 of the 37 words, 16.2%.\n\nWords are runs of letters or digits; hyphenated words and contractions count as one word, and matching ignores capital letters. Phrases are counted within sentences only, so a phrase never spans a full stop.",
      },
      {
        heading: "One-, two- and three-word phrases",
        body: "Single words show which terms dominate, but people search in phrases. Switch to **2 words** to see pairs such as \"sourdough starter\", and **3 words** for longer phrases (\"flour and water\"). If a two-word phrase appears far more often than its words do separately, you may be repeating an exact keyword where a natural variation would read better. To count specific phrases regardless of the table, list them under **Track specific keywords**.",
      },
      {
        heading: "Stop words and filters",
        body: "Stop words (the, and, of, to, is…) are the most common words in any English text and say nothing about the topic. With **Ignore stop words** on, single stop words are hidden and phrases that start or end with one are skipped; phrases with a stop word in the middle (\"flour and water\") are kept. **Minimum occurrences** hides one-off words, and **Minimum word length** hides very short words. The total word count always includes every word.",
      },
      {
        heading: "Is there an ideal keyword density?",
        body: "No. Google doesn't use a target density, and nothing in its documentation suggests one. Repeating a keyword unnaturally is listed as **keyword stuffing** in Google's spam policies, but there's no percentage where that starts; it depends on the length and type of text. Use the numbers to find words you've overused, not to hit a figure such as \"2%\".",
      },
      {
        heading: "Better signals than density",
        body: "What helps a page rank for a topic is covering it well: answering the question the searcher has, using the vocabulary people naturally use (synonyms, related terms, specific details), and putting the main topic in the title, H1 and opening paragraph. Check those with the [meta tags analyzer](/meta-tags-analyzer/) and [heading checker](/heading-tag-extractor/), and find related phrasings with the [keyword ideas generator](/keyword-ideas-generator/).",
      },
    ],
    faq: [
      {
        q: "What is a good keyword density?",
        a: "There isn't one. Write naturally; if a word reads as repetitive when you read the text aloud, it's overused, whatever the percentage.",
      },
      {
        q: "Does Google use keyword density?",
        a: "Not as a target. Google understands topics through language models and related terms. Excessive repetition can be treated as keyword stuffing, which is a spam policy violation.",
      },
      {
        q: "Should stop words be counted?",
        a: "In the total word count, yes, and they are. In the frequency table they're usually noise, so they're hidden by default. Untick **Ignore stop words** to see them.",
      },
    ],
    sources: [
      { label: "Google Search Central: Spam policies, keyword stuffing", url: "https://developers.google.com/search/docs/essentials/spam-policies#keyword-stuffing" },
      { label: "Google Search Central: Creating helpful, reliable, people-first content", url: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content" },
    ],
    related: ["word-counter", "keyword-ideas-generator", "remove-duplicate-words", "meta-tags-analyzer", "heading-tag-extractor"],
    links: [
      { href: "/word-counter/", anchor: "word counter" },
      { href: "/keyword-ideas-generator/", anchor: "keyword ideas generator" },
      { href: "/remove-duplicate-words/", anchor: "remove duplicate words" },
    ],
    appCategory: "UtilitiesApplication",
    features: [
      "Frequency of single words and 2- and 3-word phrases",
      "Density as share of total words, with the formula shown",
      "Paste text or fetch a page's visible text from a URL",
      "Stop-word, minimum-count and word-length filters",
      "Track specific phrases; export CSV",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 2,
  },

  /* ------------------------------------------------------------------ keyword ideas generator */
  {
    id: "keyword-ideas-generator",
    path: "/keyword-ideas-generator/",
    name: "Keyword Ideas Generator",
    h1: "Keyword Ideas Generator",
    title: "Keyword Ideas Generator – Long-Tail Ideas and Questions",
    metaDescription:
      "Expand a seed keyword into long-tail ideas and questions with question, preposition, comparison and A–Z modifiers. Export to CSV. No made-up volumes.",
    summary:
      "Expand a seed keyword into long-tail phrasings and questions using question words, prepositions, comparisons, buying and learning modifiers and an A–Z list, then export the ideas to validate elsewhere.",
    category: "free-seo-tools",
    subgroup: "keywords",
    card: "Expand a seed keyword into questions and long-tail ideas.",
    archetype: "generator",
    widget: "keyword-ideas",
    aliases: ["keyword generator", "free keyword research tool", "long tail keyword generator", "keyword suggestion tool", "question keywords generator", "keyword expander", "keyword idea tool", "seo keyword ideas", "keyword modifier tool"],
    keywords: ["long tail", "questions", "modifiers", "keyword research"],
    processing: "browser",
    limits: ["No search volume, CPC or difficulty: these are phrasings to check, not search data."],
    steps: [
      "Type a **Seed keyword** of two or three words.",
      "Optionally add **Compare with** (for vs and or ideas) and a **Location** (for local ideas), and untick any **Modifier groups** you don't need.",
      "Narrow the list with **Filter ideas**; press **Search** beside an idea to see Google's results and suggestions for it.",
      "Press **Copy all** or **Export CSV** and check the promising ideas in Search Console, Keyword Planner or Google Trends.",
    ],
    example: {
      title: "Example: “sourdough starter”, compared with “yeast”, in Leeds",
      input: "Seed: sourdough starter · Compare with: yeast · Location: Leeds",
      output:
        "105 ideas in 7 groups, including:\nQuestions: what is sourdough starter · how does sourdough starter work · how much does sourdough starter cost\nComparisons: sourdough starter vs yeast · difference between sourdough starter and yeast\nLearning: sourdough starter guide · sourdough starter mistakes\nLocal: sourdough starter in leeds\nA–Z: sourdough starter apps · sourdough starter brands · sourdough starter course",
      note: "Some combinations won't make sense for every topic (\"sourdough starter login\"); that's expected from a modifier list, and the filter and Search links make them quick to discard.",
    },
    sections: [
      {
        heading: "Where the ideas come from",
        body: "Every idea is your seed keyword combined with a modifier from fixed lists that reflect how people phrase searches: question words (what, how, why, which), prepositions (for beginners, without, at home), comparisons (vs, or, alternatives), buying words (price, reviews, cheap), learning words (guide, examples, checklist) and an A–Z list of common modifiers. Nothing is fetched from a search engine and nothing is estimated. The same seed always gives the same list.",
      },
      {
        heading: "Question and preposition modifiers",
        body: "Question phrasings (\"how does a sourdough starter work\") map to informational pages and FAQ sections, and they're how people speak to voice assistants and AI search. Preposition phrasings narrow the audience or situation: \"for beginners\", \"without a scale\", \"at home\". These long-tail variations usually have less competition than the seed itself and tell you what a page should cover. Group related questions into one thorough page rather than one thin page each.",
      },
      {
        heading: "Grouping and filtering ideas",
        body: "Ideas are grouped by modifier type, which roughly matches search intent: **Questions** and **Learning** are informational, **Buying** is commercial, **Local** is local intent, **Comparisons** sit between research and purchase. Use **Filter ideas** to keep only ideas containing a word (\"how\", \"price\"), and the group checkboxes to hide what doesn't fit your site. The CSV includes the group and modifier for each idea, ready to sort in a spreadsheet.",
      },
      {
        heading: "Why there are no search volumes here",
        body: "Search volume, cost per click and keyword difficulty need licensed data from a search engine or a commercial provider. We don't have such a source, and an earlier version of this page showed numbers that weren't real. Rather than estimate, we give you phrasings and point you to where real data lives:\n\n- **Google Search Console:** the queries your own site already appears for, with impressions and clicks.\n- **Google Keyword Planner** (free with a Google Ads account): volume ranges.\n- **Google Trends:** relative interest over time and by region.",
      },
      {
        heading: "Turning ideas into pages",
        body: "1. Search the idea on Google (the **Search** link) and look at what ranks: guides, product pages, videos? Match that format.\n2. Note the \"People also ask\" questions and the suggestions in the search box; they're real queries.\n3. Cluster ideas that share an intent into one page; use the rest as H2s and FAQs.\n4. Write the title with the [title tag generator](/title-tag-generator/), then check repetition with the [keyword density checker](/keyword-density-checker/).",
      },
    ],
    faq: [
      {
        q: "Does this show search volume?",
        a: "No. It generates phrasings only. For volume, use Google Keyword Planner; for queries your site already gets, use the Performance report in Google Search Console.",
      },
      {
        q: "Which country's suggestions do I see?",
        a: "None: the ideas don't come from a search engine, so they're the same everywhere. Add a **Location** for local phrasings, and use the **Search** link to see what Google suggests where you are.",
      },
      {
        q: "How is this different from Google Keyword Planner?",
        a: "Keyword Planner shows search volume ranges from Google's data for ideas it chooses. This tool systematically lists phrasings around your seed, including questions Keyword Planner often leaves out, so you can check them there.",
      },
    ],
    sources: [
      { label: "Google Ads Help: Use Keyword Planner", url: "https://support.google.com/google-ads/answer/7337243" },
      { label: "Search Console Help: Performance report", url: "https://support.google.com/webmasters/answer/7576553" },
      { label: "Google Trends", url: "https://trends.google.com/trends/" },
    ],
    related: ["keyword-density-checker", "title-tag-generator", "word-combiner", "meta-description-generator"],
    links: [
      { href: "/keyword-density-checker/", anchor: "keyword density checker" },
      { href: "/blog/find-long-tail-keywords-free/", anchor: "finding long-tail keywords for free" },
      { href: "/title-tag-generator/", anchor: "title tag generator" },
      { href: "/word-combiner/", anchor: "combine keyword lists" },
    ],
    appCategory: "BusinessApplication",
    features: [
      "Seven modifier groups: questions, prepositions, comparisons, buying, learning, local and A–Z",
      "Optional comparison term and location",
      "Filter, copy and CSV export with group and modifier",
      "One-click Google search for each idea",
      "No invented volume, CPC or difficulty figures",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 1,
  },

  /* ------------------------------------------------------------------ review link generator */
  {
    id: "review-link-generator",
    path: "/review-link-generator/",
    name: "Review Link Generator",
    h1: "Review Link Generator",
    title: "Google Review Link Generator – Direct Link and QR Code",
    metaDescription:
      "Create a direct link that opens your business's Google review form, plus Facebook and Trustpilot links, a printable QR code and an email template.",
    summary:
      "Turn your Google Place ID into a link that opens your business's review form directly, with a printable QR code, an email template and optional Facebook and Trustpilot review links.",
    category: "free-seo-tools",
    subgroup: "local",
    card: "Create a direct Google review link and QR code for customers.",
    archetype: "generator",
    widget: "review-link",
    aliases: ["google review link", "write a review link", "google review qr code", "google review link generator", "place id review link", "review link", "get google reviews link", "google business review link", "review qr code"],
    keywords: ["google business profile", "reviews", "place id", "qr"],
    processing: "browser",
    steps: [
      "Find your Place ID with Google's **Place ID Finder** (linked under the field) and paste it into **Google Place ID or review link**.",
      "Optionally add your **Business name**, **Facebook page** and **Website domain for Trustpilot**.",
      "Use **Open to test** to check the Google link opens your review form, then **Copy** it.",
      "Press **Make QR code** and download it as **SVG** or **PNG** for print, and copy the **Email template**.",
    ],
    example: {
      title: "Example: Google's documentation Place ID",
      input: "Place ID: ChIJN1t_tDeuEmsRUsoyG83frY4\nFacebook page: breadnotesbakery\nTrustpilot domain: example.com",
      output: "Google: https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4\nFacebook: https://www.facebook.com/breadnotesbakery/reviews\nTrustpilot: https://www.trustpilot.com/evaluate/example.com",
      note: "ChIJN1t_tDeuEmsRUsoyG83frY4 is the sample Place ID used in Google's Places documentation; use your own business's ID.",
    },
    sections: [
      {
        heading: "Finding your Google Place ID",
        body: "A Place ID is Google's unique code for a place on Maps, usually starting with `ChIJ`. To find yours, open Google's Place ID Finder, type your business name as it appears on Maps, select it, and copy the ID from the info box. Service-area businesses that hide their address are listed too. Place IDs can occasionally change when a listing is merged or moved, so if an old link stops opening the review form, look the ID up again.",
      },
      {
        heading: "Building the review link",
        body: "The link format is `https://search.google.com/local/writereview?placeid=` followed by your Place ID. Opening it shows your business with the star rating and review box already open; on phones with the Google Maps app it may open in the app. Google Business Profile also offers its own short link (Business Profile → Ask for reviews), which looks like `g.page/r/…/review`. Either works, and you can paste that short link into the field to make a QR code from it.",
      },
      {
        heading: "Review links for other platforms",
        body: "- **Facebook:** `facebook.com/your-page/reviews` opens the page's reviews section, which Facebook now calls recommendations. Reviews must be turned on in the page settings.\n- **Trustpilot:** `trustpilot.com/evaluate/yourdomain.com` opens the review form for your company profile.\n- **Yelp:** there's no link here on purpose. Yelp asks businesses not to solicit reviews and may penalize listings that do.",
      },
      {
        heading: "Printing a review QR code",
        body: "The QR code encodes the Google review link, so customers can scan it at the counter, on a receipt or on a table card. Download the **SVG** for print (it stays sharp at any size) or the **PNG** for documents and screens. Print it at least 2 cm (0.8 in) wide with a quiet margin around it, keep it dark on a light background, and test it with two or three phones before ordering a print run.",
      },
      {
        heading: "Asking for reviews within platform rules",
        body: "Ask every customer the same way, and let them choose what to write. Google's policies prohibit:\n\n- **Incentives:** discounts, gifts or entries into a draw in exchange for reviews.\n- **Review gating:** asking only happy customers, or screening people before sending the link.\n- **Reviews from staff or owners**, or writing reviews for customers.\n\nIn the US, the FTC's 2024 rule on consumer reviews also bans buying reviews and suppressing negative ones. Reply to reviews, good and bad; it shows future customers you're listening.",
      },
    ],
    faq: [
      {
        q: "How do I get a direct link to my Google reviews?",
        a: "Paste your Place ID into this tool, or open your Google Business Profile and use \"Ask for reviews\" to copy Google's short link. Both open the review form directly.",
      },
      {
        q: "Can I offer incentives for reviews?",
        a: "No. Google's policies forbid offering anything in exchange for reviews, and in the US the FTC can fine businesses for it. Asking politely is allowed; rewarding is not.",
      },
      {
        q: "Does the link open the app on mobile?",
        a: "Often, yes. On phones with the Google Maps app installed the link may open the app; otherwise it opens the review form in the browser. Customers need to be signed in to a Google account to post.",
      },
    ],
    sources: [
      { label: "Google Maps Platform: Place IDs and the Place ID Finder", url: "https://developers.google.com/maps/documentation/places/web-service/place-id" },
      { label: "Google Business Profile Help: Get more reviews", url: "https://support.google.com/business/answer/3474122" },
      { label: "Google Maps user contributed content policy: Prohibited and restricted content", url: "https://support.google.com/contributionpolicy/answer/7400114" },
      { label: "FTC: Trade Regulation Rule on the Use of Consumer Reviews and Testimonials (2024)", url: "https://www.ftc.gov/legal-library/browse/rules/rule-use-consumer-reviews-testimonials" },
    ],
    related: ["qr-code-generator", "schema-markup-generator", "url-slug-generator", "meta-tag-generator"],
    links: [
      { href: "/qr-code-generator/", anchor: "QR code generator" },
      { href: "/schema-markup-generator/", anchor: "local business schema" },
      { href: "/free-seo-tools/", anchor: "free SEO tools" },
    ],
    appCategory: "BusinessApplication",
    features: [
      "Google review link from a Place ID or Business Profile short link",
      "Facebook and Trustpilot review links",
      "QR code as SVG or PNG for print",
      "Email template with your link",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 2,
  },

  /* ------------------------------------------------------------------ heading tag extractor */
  {
    id: "heading-tag-extractor",
    path: "/heading-tag-extractor/",
    name: "Heading Tag Extractor",
    h1: "Heading Tag Extractor",
    title: "Heading Checker – Extract the H1-H6 Outline of Any URL",
    metaDescription:
      "Enter a URL to extract its H1-H6 headings as an indented outline. Spot missing or multiple H1s, skipped levels and empty headings, then export the list.",
    summary:
      "Extract the H1 to H6 headings of any page as an indented outline, and spot missing or multiple H1s, skipped heading levels and empty headings. Export the outline as text or CSV.",
    category: "free-seo-tools",
    subgroup: "onpage",
    card: "Extract a page's H1–H6 outline and spot heading problems.",
    archetype: "url",
    widget: "url-check",
    config: { mode: "headings" },
    aliases: ["heading checker", "heading tag checker", "h1 checker", "extract headings from url", "header tag checker", "h1 h2 h3 checker", "heading structure checker", "headings outline", "multiple h1 checker"],
    keywords: ["h1", "h2", "outline", "structure", "accessibility"],
    processing: "server",
    pasteMode: true,
    limits: ["Reads the HTML the server sends; headings added by JavaScript aren't seen. Hidden headings in the HTML are included."],
    steps: [
      "Enter a page address under **Check a URL** and press **Extract headings**, or paste source code under **Paste HTML**.",
      "Check the counts per level and the **Issues** list.",
      "Read the **Outline**: headings are indented by level, with problems marked inline. Use the level menu to show only H2s, for example.",
      "Press **Copy outline** for an indented text version or **CSV** for a spreadsheet.",
    ],
    example: {
      title: "Example: the sample page",
      input: "<h1>How to make a sourdough starter</h1>\n<h3>What you need</h3>\n<h2>Day 1</h2>\n<h2></h2>",
      output: "H1 How to make a sourdough starter\n    H3 What you need      ⚠ Jumps from H1 to H3.\n  H2 Day 1\n  H2 (empty)            ⚠ Empty H2.",
      note: "Output of **Load sample HTML** → **Extract from HTML**.",
    },
    sections: [
      {
        heading: "Reading the heading outline",
        body: "Headings form the table of contents of a page: the H1 names the page, H2s are its main sections, H3s are subsections of an H2, and so on. The outline indents each heading by its level so you can read the page's structure at a glance and see whether it matches the content: a section that should be an H2 but is marked H4, a sidebar widget title that interrupts the main outline, or a heading used only to make text big.",
      },
      {
        heading: "One H1 or several?",
        body: "HTML allows several H1s and Google has said multiple H1s are not a problem for ranking. The checker still notes them, because one H1 that states what the page is about is clearer for readers, for screen-reader users who jump to the H1, and for anyone scanning search snippets built from headings. A missing H1 is flagged as a warning: the page has no explicit main heading.",
      },
      {
        heading: "Skipped levels and empty headings",
        body: "A **skipped level** is a jump down by more than one step, such as H2 straight to H4. Going back up (H4 to H2) is fine; it starts a new section. Skips usually mean a heading was chosen for its size rather than its role; fix the level and restyle it with CSS. An **empty heading** contains no text (often an icon or an image without alt text); screen readers announce it as a blank heading, so add text or remove the heading element.",
      },
      {
        heading: "Headings, accessibility and SEO",
        body: "Screen-reader users commonly navigate by headings, jumping from one to the next to find the section they need, which is why WCAG asks for headings that describe their sections (Success Criterion 2.4.6) and a structure that reflects the content (1.3.1). Search engines use headings as one signal of what each part of the page covers, and Google may build a title link from a heading when the title tag is poor. Descriptive headings help both.",
      },
      {
        heading: "Exporting headings for content audits",
        body: "**Copy outline** gives indented plain text you can paste into a document or brief. **CSV** gives one row per heading with its position, level, text and any issue, ready for a spreadsheet: useful for comparing your page's sections with competitors' pages, or auditing several pages of a site one by one. Pair it with the [meta tags analyzer](/meta-tags-analyzer/) for titles and descriptions and the [website SEO checker](/website-seo-score-checker/) for a full page audit.",
      },
    ],
    faq: [
      {
        q: "Is having multiple H1 tags bad for SEO?",
        a: "No. Google has said it handles pages with several H1s fine. One clear H1 is still the better default for readers and accessibility.",
      },
      {
        q: "Do heading levels need to be in order?",
        a: "They should go down one level at a time (H2 then H3), though you can jump back up to any higher level. Skipping down (H2 to H4) isn't an error to search engines but confuses screen-reader users.",
      },
      {
        q: "Are hidden headings counted?",
        a: "Yes, if they're in the HTML. The extractor reads the source, so headings hidden with CSS (for example in collapsed menus or visually-hidden labels) are listed too.",
      },
    ],
    sources: [
      { label: "W3C WAI: Headings tutorial", url: "https://www.w3.org/WAI/tutorials/page-structure/headings/" },
      { label: "WCAG 2.2: Success Criterion 2.4.6 Headings and Labels", url: "https://www.w3.org/WAI/WCAG22/Understanding/headings-and-labels.html" },
      { label: "HTML Living Standard: The h1–h6 elements", url: "https://html.spec.whatwg.org/multipage/sections.html#the-h1,-h2,-h3,-h4,-h5,-and-h6-elements" },
      GSC.titleLinks,
    ],
    related: ["meta-tags-analyzer", "website-seo-score-checker", "word-counter", "keyword-density-checker"],
    links: [
      { href: "/meta-tags-analyzer/", anchor: "meta tag analyzer" },
      { href: "/website-seo-score-checker/", anchor: "website SEO checker" },
      { href: "/word-counter/", anchor: "word counter" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "H1–H6 outline from any public URL or pasted HTML",
      "Flags missing or multiple H1s, skipped levels and empty headings",
      "Filter by heading level",
      "Copy as indented text or export CSV",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 2,
  },

  /* ------------------------------------------------------------------ redirect checker */
  {
    id: "redirect-checker",
    path: "/redirect-checker/",
    name: "Redirect Checker",
    h1: "Redirect Checker",
    title: "Redirect Checker – Trace 301/302 Chains and Loops",
    metaDescription:
      "Trace every hop a URL takes, with status codes (301, 302, 307, 308), headers and final destination. Flags loops, long chains and HTTP/HTTPS mixing.",
    summary:
      "Trace every hop a URL takes before it reaches its final page, with the status code, Location header and time of each, and find redirect loops, long chains and HTTPS downgrades. Check one URL or up to 20.",
    category: "free-seo-tools",
    subgroup: "redirects",
    card: "Trace every redirect hop and find loops and long chains.",
    archetype: "url",
    widget: "url-check",
    config: { mode: "redirects" },
    aliases: ["301 redirect checker", "redirect chain checker", "url redirect checker", "check redirects", "redirect tracer", "redirect loop checker", "302 checker", "where does this link go", "redirect path checker"],
    keywords: ["301", "302", "chain", "loop", "https"],
    processing: "server",
    limits: ["Follows HTTP redirects only; meta refresh and JavaScript redirects aren't detected.", "Requests come from our server's network, which some sites treat differently from visitors."],
    steps: [
      "Choose **One URL** or **Bulk (up to 20)**, and a **User agent** (for example **Googlebot**).",
      "Enter the address, including http:// if you want to test the HTTP-to-HTTPS redirect, and press **Trace redirects**.",
      "Read the **Redirect chain**: one row per request with its status code, the Location it pointed to and the time it took.",
      "Check **Findings** for long chains, temporary redirects, downgrades and loops; press **Copy chain** or download the bulk **CSV**.",
    ],
    example: {
      title: "Example chain (illustrative)",
      input: "http://example.com/old-page",
      output:
        "1  301  http://example.com/old-page        → https://example.com/old-page\n2  301  https://example.com/old-page       → https://www.example.com/old-page\n3  302  https://www.example.com/old-page   → https://www.example.com/new-page/\n4  200  https://www.example.com/new-page/\n\nWarning: 3 redirects in a chain. Point the first URL straight at the final one.\nNote: 1 temporary redirect (302). If the move is permanent, use 301 or 308.\nPass: HTTP is redirected to HTTPS.",
      note: "The findings are the checker's real messages for this chain. A single rule redirecting `http://example.com/old-page` straight to `https://www.example.com/new-page/` with a 301 would fix all three.",
    },
    sections: [
      {
        heading: "Reading a redirect chain",
        body: "Each row is one HTTP request. A 3xx status with a `Location` header means \"go there instead\"; the checker follows it and records the next request, until it reaches a non-redirect status (ideally 200) or gives up after 10. **Time** is the round trip for that request alone. **Total time** adds them up, which is roughly the delay a visitor experiences before the page starts loading. If the final URL isn't the one you expected, the chain shows exactly which rule sent it elsewhere.",
      },
      {
        heading: "301 vs 302 vs 307 vs 308",
        body: "| Code | Meaning | Use for |\n|---|---|---|\n| 301 | Moved permanently | Changed URLs, domain moves, HTTP→HTTPS |\n| 308 | Permanent, method kept | Same as 301, for forms and APIs that POST |\n| 302 | Found (temporary) | Short-term moves, A/B tests, geo or login redirects |\n| 307 | Temporary, method kept | Same as 302, keeping POST as POST |\n| 303 | See other | After a form submission |\n\nGoogle treats permanent redirects as a strong signal to index the target, and temporary ones as a weak signal that may keep the old URL indexed. A long-standing 302 is eventually treated like a 301, but it's clearer to use the right code from the start.",
      },
      {
        heading: "Redirect loops and long chains",
        body: "A **loop** is a chain that returns to a URL it already visited (A → B → A), so it never ends; browsers show \"too many redirects\". When our server stops after 10 redirects, the checker re-traces the chain one hop at a time to show where it turns back. Loops are usually two rules fighting: one adds a trailing slash, another removes it; or the CMS forces www while the server forces non-www. **Long chains** build up as sites are migrated several times. Googlebot follows up to 10 hops, but each one slows visitors down; update old redirects to point straight at the final URL.",
      },
      {
        heading: "Checking http, https, www and non-www",
        body: "Test all four versions of your homepage: `http://example.com`, `http://www.example.com`, `https://example.com` and `https://www.example.com`. Three of them should redirect, in one hop each, to the fourth. Paste all four into **Bulk** to check them together. A redirect from `https://` to `http://` is flagged as a problem: it removes encryption and browsers may warn about it.",
      },
      {
        heading: "Meta refresh and JavaScript redirects",
        body: "Some pages redirect with `<meta http-equiv=\"refresh\" content=\"0; url=…\">` or with JavaScript (`location.href = …`). Those run in the browser after the page loads, so an HTTP checker sees a 200 response and stops. Google follows both in most cases, but treats them as weaker signals and they're slower for visitors. Replace them with server-side 301s where you can; to write the rule, use the [.htaccess redirect generator](/htaccess-redirect-generator/).",
      },
    ],
    faq: [
      {
        q: "How many redirects in a chain is too many?",
        a: "More than one is worth fixing. Googlebot follows up to 10, but each hop adds a round trip for visitors, and some tools and crawlers give up sooner.",
      },
      {
        q: "Does a 302 pass link equity?",
        a: "Google has said that all 3xx redirects pass PageRank. The difference is which URL gets indexed: a 301 tells Google to index the target, a 302 suggests keeping the original.",
      },
      {
        q: "Why does my redirect loop?",
        a: "Two rules send the URL back and forth, often trailing slash or www rules in the server configuration fighting with the CMS settings. The hop-by-hop trace shows which two URLs alternate.",
      },
    ],
    sources: [
      { label: "Google Search Central: Redirects and Google Search", url: "https://developers.google.com/search/docs/crawling-indexing/301-redirects" },
      { label: "RFC 9110: HTTP Semantics, section 15.4 (Redirection 3xx)", url: "https://www.rfc-editor.org/rfc/rfc9110#section-15.4" },
      { label: "Google Search Central: HTTP status codes and network errors (redirect limit)", url: "https://developers.google.com/search/docs/crawling-indexing/http-network-errors" },
    ],
    related: ["http-status-checker", "htaccess-redirect-generator", "canonical-url-generator", "url-slug-generator"],
    links: [
      { href: "/http-status-checker/", anchor: "HTTP status checker" },
      { href: "/htaccess-redirect-generator/", anchor: ".htaccess redirect generator" },
      { href: "/blog/301-vs-302-redirects/", anchor: "301 vs 302 redirects" },
      { href: "/canonical-url-generator/", anchor: "canonical tag generator" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "Every hop with status code, Location header and timing",
      "Loop detection with a hop-by-hop trace",
      "Flags long chains, temporary redirects and HTTPS-to-HTTP downgrades",
      "Choose the user agent: our bot, Googlebot, desktop Chrome or iPhone Safari",
      "Bulk mode for up to 20 URLs with CSV export",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 1,
  },

  /* ------------------------------------------------------------------ HTTP status checker */
  {
    id: "http-status-checker",
    path: "/http-status-checker/",
    name: "HTTP Status Checker",
    h1: "HTTP Status Checker",
    title: "HTTP Status Checker – Bulk Status Codes and Headers",
    metaDescription:
      "Check the HTTP status code, response time and headers for one URL or a whole list. Spot 404s, redirects and 5xx server errors before search engines do.",
    summary:
      "Check the HTTP status code, response time, headers and HTTPS certificate of one URL, or the status of up to 20 URLs at once, with the request method and user agent you choose.",
    category: "free-seo-tools",
    alsoIn: ["traffic-performance-tools"],
    subgroup: "redirects",
    card: "Check status codes, headers and response time for one or 20 URLs.",
    archetype: "url",
    widget: "url-check",
    config: { mode: "status" },
    aliases: ["http status code checker", "server status checker", "bulk url status checker", "check server status", "response header checker", "404 checker", "status code checker", "http header checker", "check http status"],
    keywords: ["status code", "404", "500", "headers", "server"],
    processing: "server",
    limits: ["Requests are sent from our server, not from your browser or network."],
    steps: [
      "Choose **One URL** or **Bulk (up to 20)**.",
      "Pick the **Request method** (**GET** downloads the page, **HEAD** asks for headers only), a **User agent**, and whether to **Follow redirects**.",
      "Enter the address and press **Check status** (or paste a list and press **Check**).",
      "Read the status and its meaning, the timings, the **Response headers** and the **HTTPS certificate**. In bulk mode, download the **CSV**.",
    ],
    example: {
      title: "Example: what a single check reports (illustrative)",
      input: "https://www.example.com/old-offer/  ·  GET  ·  Googlebot  ·  Follow redirects: off",
      output:
        "410 Gone: the page was removed on purpose. Search engines drop it slightly faster than a 404.\nTime to first byte: 84 ms · Total time: 86 ms\nHeaders: content-type: text/html; charset=utf-8 · cache-control: no-cache · x-robots-tag: noindex\nHTTPS certificate: valid, TLSv1.3, expires in 61 days",
      note: "Status meanings are the tool's own text. Timings and headers vary by site.",
    },
    sections: [
      {
        heading: "Status code classes: 2xx to 5xx",
        body: "| Class | Meaning | Common codes |\n|---|---|---|\n| 2xx | Success | 200 OK, 204 No Content |\n| 3xx | Redirect | 301, 302, 304 Not Modified, 307, 308 |\n| 4xx | Client error: the request can't be served | 401, 403, 404 Not Found, 410 Gone, 429 Too Many Requests |\n| 5xx | Server error: the server failed | 500, 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout |\n\nThe checker explains each code it receives in plain English, including Cloudflare's 52x codes.",
      },
      {
        heading: "Checking a list of URLs",
        body: "Bulk mode checks up to 20 URLs per run, five at a time, and lists the final status, the number of redirects, the final URL and the total time for each, with a CSV download. Use it after a migration (do the old URLs redirect?), before submitting a sitemap (do all URLs return 200?), or to test the four http/https and www/non-www versions of your homepage. The method and user agent you choose apply to every URL; redirects are always followed in bulk mode.",
      },
      {
        heading: "Response headers worth checking",
        body: "- `x-robots-tag`: a `noindex` here hides the page from search even if the HTML allows indexing.\n- `cache-control`, `etag`, `last-modified`, `age`: how long browsers and CDNs keep the page.\n- `content-encoding`: gzip or br means the response is compressed.\n- `strict-transport-security`: forces HTTPS on return visits.\n- `link`: can carry a canonical or hreflang for non-HTML files.\n- `server`, `via`, `cf-cache-status`, `x-cache`: which server, proxy or CDN answered.\n\nThe table shows these and other SEO-, cache- and security-related headers; cookies and others are left out.",
      },
      {
        heading: "Server errors and timeouts",
        body: "A **5xx** status means the server answered but failed. A **timeout** (no answer in 10 seconds), a **DNS failure** (the domain doesn't resolve), a **refused connection** or a **certificate error** means it didn't answer properly at all. All of these are results about the site and are shown as such. If instead our own checker fails, the page says so separately, so a problem on our side is never reported as your site being down. For a plain up-or-down answer, use [is it down](/is-it-down/).",
      },
      {
        heading: "Status codes and SEO",
        body: "Only 200 pages are indexed. Search engines drop 404 and 410 pages over time (410 slightly faster), follow 301/308 redirects to the new URL, and treat 5xx and 429 as temporary, slowing crawling and retrying later; if errors persist for days, pages start dropping out. A **soft 404**, a missing page that returns 200 with \"not found\" text, wastes crawling and can't be detected from the status code; Search Console reports them.",
      },
    ],
    faq: [
      {
        q: "What does a 403 mean?",
        a: "Forbidden: the server understood the request but refused it. It's common when a firewall or bot protection blocks automated requests, so a 403 here doesn't always mean visitors are blocked. Try the Chrome user agent.",
      },
      {
        q: "Is a soft 404 a status code?",
        a: "No. It's Google's name for a page that returns 200 but looks like an error or empty page. Fix it by returning a real 404 or 410, or by adding real content.",
      },
      {
        q: "How do I check if my server is down?",
        a: "Check the homepage here: a 5xx status, a timeout or a connection error from our server means it's failing for everyone, not just you. The [website uptime checker](/website-uptime-checker/) gives a plain verdict.",
      },
      {
        q: "Why choose HEAD instead of GET?",
        a: "HEAD asks for headers only, so it's lighter, but some servers answer HEAD differently or not at all (405). GET is what browsers and crawlers use, so it's the default.",
      },
    ],
    sources: [
      { label: "RFC 9110: HTTP Semantics (status codes)", url: "https://www.rfc-editor.org/rfc/rfc9110#section-15" },
      { label: "Google Search Central: How HTTP status codes and network errors affect Google Search", url: "https://developers.google.com/search/docs/crawling-indexing/http-network-errors" },
      { label: "MDN: HTTP response status codes", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Status" },
    ],
    related: ["redirect-checker", "is-it-down", "website-uptime-checker", "robots-txt-tester", "xml-sitemap-generator"],
    links: [
      { href: "/redirect-checker/", anchor: "redirect checker" },
      { href: "/is-it-down/", anchor: "is a site down for everyone?" },
      { href: "/website-uptime-checker/", anchor: "website uptime checker" },
      { href: "/blog/http-status-codes-seo/", anchor: "HTTP status codes for SEO" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "Status code with a plain-English explanation",
      "GET or HEAD, four user agents, redirects followed or not",
      "Time to first byte, total time and transferred size",
      "SEO, cache and security response headers",
      "HTTPS certificate issuer, protocol and expiry",
      "Bulk check of up to 20 URLs with CSV export",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 1,
  },

  /* ------------------------------------------------------------------ website SEO score checker */
  {
    id: "website-seo-score-checker",
    path: "/website-seo-score-checker/",
    name: "Website SEO Score Checker",
    h1: "Website SEO Score Checker",
    title: "Website SEO Checker – Free On-Page SEO Audit",
    metaDescription:
      "Audit a single page for on-page SEO: titles, headings, content, links, images, structured data, indexability and speed basics, with a prioritised fix list.",
    summary:
      "Audit one page for on-page SEO (indexability, title and description, headings, content, links, images, structured data, mobile and speed basics) with the evidence behind every check and a fix-first list.",
    category: "free-seo-tools",
    subgroup: "onpage",
    card: "Audit one page's on-page SEO with evidence and a fix list.",
    archetype: "url",
    widget: "url-check",
    config: { mode: "seo-audit" },
    aliases: ["seo checker", "seo score checker", "free seo audit", "on page seo checker", "seo analyzer", "website seo checker", "seo audit tool", "check seo of my website", "seo test", "seo grader"],
    keywords: ["audit", "on-page", "score", "checklist"],
    processing: "server",
    limits: ["Checks one page per run; it doesn't crawl the site.", "No result is shown if the page can't be fetched."],
    steps: [
      "Enter the page address and press **Audit page**.",
      "Read the **Checklist score** and the counts of passes, warnings and problems.",
      "Work through **Fix first**: problems come before warnings, heaviest checks first.",
      "Open **Full checklist with evidence** to see what was found for every check, such as the exact title text and its width.",
    ],
    example: {
      title: "Example: the sample page (illustrative URL)",
      input: "https://www.example.com/baking/sourdough-starter/  (the tool's sample HTML, served with Brotli, 310 ms TTFB)",
      output:
        "Checklist score 82/100 (71 of 87 points) · 15 passed · 5 warnings · 1 problem · 5 notes\n\nFix first:\nProblem  og:image: relative URL “/images/starter.jpg”\nWarning  Title tag: ~724 px, likely truncated\nWarning  Meta description: 46 characters, short\nWarning  Visible text: 27 words\nWarning  Heading structure: jumps from H1 to H3; empty H2\nWarning  Image alt attributes: 1 of 1 image has no alt",
      note: "Computed by the tool's checklist on the sample HTML with the response details shown. A real URL's result depends on what its server returns.",
    },
    sections: [
      {
        heading: "What the audit checks",
        body: "Our server requests the page as a crawler would, then checks what it received:\n\n- **Indexability:** HTTP status, redirects, robots meta, X-Robots-Tag, canonical.\n- **Title and description:** present, unique in the page, estimated pixel width.\n- **Content and headings:** H1, heading order, amount of visible text.\n- **Links and images:** internal links, empty links, alt attributes, image dimensions.\n- **Structured data:** JSON-LD present and parseable.\n- **Mobile and document:** viewport, `lang`, charset, favicon.\n- **Speed basics:** server response time, compression, HTTPS.\n- **Social sharing:** Open Graph and X card tags.\n\nEach check shows its evidence, so you can verify it yourself.",
      },
      {
        heading: "How the score is calculated",
        body: "Every scored check has a weight. A pass earns the full weight, a warning half, a problem nothing; notes aren't scored. **Score = points earned ÷ points available × 100.**\n\n| Weight | Checks |\n|---|---|\n| 10 | HTTP status, robots meta tag, X-Robots-Tag (when it blocks), title tag |\n| 6 | Meta description, viewport |\n| 5 | H1 |\n| 4 | Canonical, visible text, HTTPS |\n| 3 | Heading structure, links, image alt, structured data, server response time, og:image, redirect chains of 2+ hops |\n| 2 | Single title, page language, HTML compression, empty links, og:title, og:description |\n| 1 | Single description, charset, favicon, twitter:card |\n\nThe score summarises this checklist. It isn't a Google metric and doesn't predict rankings.",
      },
      {
        heading: "Indexability: robots, canonical, status",
        body: "These checks carry the most weight because any one of them can keep a page out of search entirely: a non-200 status, a `noindex` in the HTML or in an `X-Robots-Tag` header, or a canonical pointing somewhere else. If the address redirects, the audit runs on the final URL and lists the hops; two or more redirects in a row cost points. If the page can't be fetched at all, the tool shows the error and no score, rather than a misleading number.",
      },
      {
        heading: "Content and headings",
        body: "The audit counts the words in the HTML body and flags pages under 150 words, a point where the HTML may be a JavaScript shell or a thin page. That isn't a Google rule; there's no minimum word count. It also checks for one descriptive H1 and headings that go down one level at a time. For the full outline use the [heading checker](/heading-tag-extractor/), and for titles and social tags in more detail, the [meta tags analyzer](/meta-tags-analyzer/).",
      },
      {
        heading: "Prioritising fixes",
        body: "**Fix first** lists problems before warnings, heaviest first. A reasonable order of work:\n\n1. Anything that blocks indexing (status, noindex, canonical).\n2. Title and description, which shape how the result looks.\n3. Headings, content and internal links.\n4. Structured data, images and social tags.\n5. Speed: the audit only measures the HTML response; run the [website speed test](/website-speed-checker/) for Core Web Vitals.\n\nThen validate structured data with the [schema markup validator](/schema-markup-validator/).",
      },
    ],
    faq: [
      {
        q: "Is an SEO score a Google ranking factor?",
        a: "No. Google doesn't compute or use any SEO score. This score summarises our checklist so you can track fixes; the individual checks and their evidence are what matter.",
      },
      {
        q: "Why do SEO checkers give different scores?",
        a: "Each tool chooses its own checks and weights. Ours are published on this page, so you can see exactly why a page scored what it did.",
      },
      {
        q: "Does it crawl my whole site?",
        a: "No. It audits the one URL you enter. Run it on your most important templates (homepage, a category, a product or article) to find site-wide issues.",
      },
    ],
    sources: [
      { label: "Google Search Central: SEO Starter Guide", url: "https://developers.google.com/search/docs/fundamentals/seo-starter-guide" },
      GSC.robotsMeta,
      GSC.canonical,
      GSC.titleLinks,
      { label: "web.dev: Time to First Byte (TTFB)", url: "https://web.dev/articles/ttfb" },
    ],
    related: ["meta-tags-analyzer", "heading-tag-extractor", "website-speed-checker", "schema-markup-validator", "open-graph-checker"],
    links: [
      { href: "/meta-tags-analyzer/", anchor: "meta tag analyzer" },
      { href: "/heading-tag-extractor/", anchor: "heading checker" },
      { href: "/website-speed-checker/", anchor: "website speed test" },
      { href: "/schema-markup-validator/", anchor: "schema validator" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "About 25 on-page checks, each with the evidence found",
      "Published scoring formula and weights",
      "Fix-first list ordered by severity and weight",
      "Indexability checks across HTML and HTTP headers",
      "No score shown when the page can't be fetched",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 1,
  },

  /* ------------------------------------------------------------------ backlink checker (verifier, noindex) */
  {
    id: "backlink-checker",
    path: "/backlink-checker/",
    name: "Backlink Checker",
    h1: "Backlink Checker",
    title: "Backlink Checker – How to Check Your Backlinks",
    metaDescription:
      "Verify that specific pages still link to your site, with anchor text and rel attributes, and learn how to see all your backlinks in Search Console.",
    summary:
      "Verify whether up to 10 pages you name still link to your domain, with the anchor text and rel attribute of each link, and learn where to find your full backlink list for free.",
    category: "free-seo-tools",
    subgroup: "keywords",
    card: "Verify that named pages still link to your site.",
    archetype: "url",
    widget: "url-check",
    config: { mode: "backlinks" },
    aliases: ["check backlinks", "free backlink checker", "backlink verifier", "link checker", "check if a page links to me", "backlink analysis", "verify backlinks"],
    keywords: ["backlinks", "links", "nofollow", "anchor text"],
    processing: "server",
    limits: ["Checks only the pages you list; it can't discover who links to you.", "No domain authority or link counts: we don't have that data and won't estimate it."],
    steps: [
      "Enter **Your domain**.",
      "List up to 10 **Pages that should link to you**, such as a guest post or directory listing.",
      "Press **Verify links**.",
      "For each page, read whether a link was found, its anchor text and whether it is followed, nofollow, sponsored or ugc. Download the **CSV** to keep a record.",
    ],
    sections: [
      {
        heading: "Checking your own backlinks in Search Console",
        body: "The most complete free list of links to your site is in **Google Search Console → Links**: top linking sites, top linked pages and top anchor text, from Google's own crawl. **Bing Webmaster Tools → Backlinks** shows Bing's view and lets you compare with other domains. Both require verifying that you own the site. Export the lists, then use this verifier to confirm that the links you care most about are still in place.",
      },
      {
        heading: "Checking a competitor's backlinks",
        body: "Neither Google nor Bing shows other sites' backlinks in detail. Commercial tools (Ahrefs, Semrush, Majestic, Moz) crawl the web themselves and sell that index; their free tiers show a sample. Their totals differ because each crawls a different part of the web. This page doesn't estimate backlink counts or authority scores: without a crawl of the web, any such number would be invented.",
      },
      {
        heading: "Why we don't show estimated numbers",
        body: "An earlier version of this page displayed backlink totals, authority scores and \"toxic links\" that were randomly generated. They have been removed. What the verifier reports is checked live: our server fetches each page you list and reads its HTML for `<a href>` links to your domain and subdomains, with their text and `rel` values (`nofollow`, `sponsored`, `ugc`, or none, which means followed). It also flags pages marked `noindex`, whose links may be dropped by search engines. Links inserted by JavaScript after load aren't in the HTML and won't be found.",
      },
    ],
    faq: [
      {
        q: "How do I see who links to my website for free?",
        a: "Verify your site in Google Search Console and open the Links report, and do the same in Bing Webmaster Tools. Both are free and use the search engines' own crawl data.",
      },
      {
        q: "Why do backlink tools show different totals?",
        a: "Each tool crawls a different part of the web, at different times, and counts links differently (per page, per domain, with or without nofollow). None of them sees every link.",
      },
    ],
    sources: [
      { label: "Search Console Help: Links report", url: "https://support.google.com/webmasters/answer/9049606" },
      { label: "Bing Webmaster Tools: Backlinks", url: "https://www.bing.com/webmasters/help/backlinks-58d3aa21" },
      { label: "Google Search Central: Qualify your outbound links (nofollow, sponsored, ugc)", url: "https://developers.google.com/search/docs/crawling-indexing/qualify-outbound-links" },
    ],
    related: ["redirect-checker", "http-status-checker", "meta-tags-analyzer", "keyword-ideas-generator"],
    links: [
      { href: "/free-seo-tools/", anchor: "free SEO tools" },
      { href: "/keyword-ideas-generator/", anchor: "keyword ideas generator" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "Checks up to 10 pages for links to your domain",
      "Anchor text and rel (followed, nofollow, sponsored, ugc)",
      "Flags noindex pages",
      "CSV export",
    ],
    indexable: false,
    updated: UPDATED,
    priority: 3,
  },
];
