import { defineGuide, toolLink as t } from "./shared";

export const openGraphTagsGuide = defineGuide({
  slug: "open-graph-tags-guide",
  title: "Open Graph and X Card Tags: A Practical Guide",
  h1: "Open Graph and X card tags",
  metaDescription:
    "Which Open Graph tags are required, how X cards fall back to them, the image sizes that work, and why your link preview shows the wrong thing.",
  summary:
    "Open Graph tags tell social platforms what title, description and image to show when someone shares your URL. Four properties are required by the protocol: **og:title, og:type, og:image and og:url**. X reads its own `twitter:` tags first and falls back to Open Graph, so most sites need only one extra tag. Use a **1200×630** image and absolute URLs.",
  cluster: "On-page SEO",
  tools: ["open-graph-generator", "open-graph-checker", "twitter-card-generator", "meta-tags-analyzer"],
  body: [
    {
      heading: "What the tags do and where they go",
      body: `The Open Graph protocol was published by Facebook in 2010 and is now read by most platforms that render link previews: Facebook, LinkedIn, WhatsApp, Slack, Discord, Signal and X among them. Without these tags, a platform guesses from the page, and the guess is often the navigation text and the first image it finds, which may be your logo or a tracking pixel.

Tags are \`<meta>\` elements in the \`<head>\`, using the \`property\` attribute rather than \`name\`:

\`\`\`html
<meta property="og:title" content="Open Graph and X card tags" />
<meta property="og:type" content="article" />
<meta property="og:url" content="https://www.example.com/blog/open-graph/" />
<meta property="og:image" content="https://www.example.com/img/og-open-graph.png" />
<meta property="og:description" content="Which tags are required, the image sizes that work, and why previews go wrong." />
<meta property="og:site_name" content="Example" />
\`\`\`

The protocol defines the first four as required. In practice \`og:description\` is close to required too, because the alternative is the platform choosing its own text.

Three rules that cause most failures:

- **Absolute URLs only.** \`og:image\` and \`og:url\` must include the scheme and host. Relative paths are not resolved by most crawlers.
- **The tags must be server-rendered.** Social crawlers do not execute JavaScript. Tags added by a client-side framework after load are invisible to every platform.
- **\`og:url\` should be the canonical URL**, matching your canonical tag. It is the identity the platform uses to aggregate shares, so a mismatch splits the counts for one page across several entries.`,
    },
    {
      heading: "X cards and the fallback chain",
      body: `X uses its own \`twitter:\` meta tags, declared with \`name\` rather than \`property\`, and falls back to Open Graph for anything missing. That fallback is what keeps the markup short: in most cases a single tag is all you need to add.

\`\`\`html
<meta name="twitter:card" content="summary_large_image" />
\`\`\`

With that one tag plus a complete Open Graph set, X uses \`og:title\`, \`og:description\` and \`og:image\`. Add the others only when you want them to differ from the Open Graph values:

| Tag | Falls back to | When to set it |
|---|---|---|
| \`twitter:card\` | nothing — required | Always |
| \`twitter:title\` | \`og:title\` | Only to differ |
| \`twitter:description\` | \`og:description\` | Only to differ |
| \`twitter:image\` | \`og:image\` | Only to differ |
| \`twitter:image:alt\` | \`og:image:alt\` | Accessibility, worth setting |
| \`twitter:site\` | nothing | Attribution to an account |

The two card types that matter: \`summary\` renders a small square thumbnail beside the text, and \`summary_large_image\` renders a wide image above it. The second gets far more visual space, which is why it is the usual choice for articles.

The ${t("twitter-card-generator", "X card generator")} writes the tag set for a chosen card type, and the ${t("open-graph-generator", "Open Graph generator")} does the same for the \`og:\` properties. Generating both from the same title, description and image keeps them consistent, which matters because a half-updated set is how pages end up showing an old headline on one platform and the new one on another.`,
    },
    {
      heading: "Images: sizes, formats and the parts that go wrong",
      body: `The image is the part of a preview people actually notice, and it is the part most often broken.

**Dimensions.** Use **1200 × 630 pixels**, a ratio of roughly 1.91:1. This is what Facebook's sharing documentation recommends for large previews, and it is also a safe source image for X's \`summary_large_image\`, which prefers a 2:1 crop. One image at 1200 × 630 serves every platform acceptably; chasing per-platform perfection rarely repays the effort.

**Minimums.** Images below 200 × 200 are generally ignored. Below 600 pixels wide, platforms often fall back to the small card regardless of your card type.

**File size.** Keep it under about 1 MB. Large files time out during the platform's fetch and leave the preview blank, which is a failure mode that looks exactly like a missing tag. A ${t("image-compressor", "image compressor")} brings a typical preview image well under the limit without visible loss at this size.

**Format.** PNG and JPEG are universally supported. Support for WebP in link previews is inconsistent, so it is not the place to use it. Avoid animated formats.

**Safe area.** Platforms crop. X crops a 1.91:1 image toward 2:1, and some apps crop to a square in compact layouts. Keep text and faces away from the outer edges, and do not put essential words in the bottom strip.

**Accessibility.** Set \`og:image:alt\` with a real description. Screen-reader users on social platforms get that text.

The last detail is the one that wastes the most time: **platforms cache aggressively.** After changing an image or title, the old preview persists, sometimes for days. Facebook's Sharing Debugger and LinkedIn's Post Inspector both have a "scrape again" action that forces a refetch. Before assuming your tags are wrong, confirm what the page is actually serving with the ${t("open-graph-checker", "Open Graph checker")}, which fetches the live URL and shows the tags as a crawler sees them.`,
    },
    {
      heading: "Diagnosing a wrong preview",
      body: `When a shared link shows the wrong thing, the cause is nearly always one of six things. In the order worth checking:

**1. The platform cached an old version.** Most likely if the preview matches what the page used to say. Force a refetch with the platform's own debugger.

**2. The tags are rendered client-side.** View the page source rather than the inspector's DOM. If the \`og:\` tags appear in the DOM but not in the source, no social crawler will ever see them.

**3. Duplicate tags.** A theme and a plugin both emitting \`og:title\` gives platforms two values; they generally take the first, which may not be the one you edited. The ${t("meta-tags-analyzer", "meta tags analyzer")} lists every tag a page returns, including the duplicates, which is the fastest way to spot this.

**4. A relative image URL.** Common after a CMS migration. The image path resolves in a browser and fails for the crawler.

**5. The crawler is blocked.** Social crawlers obey robots.txt and need access to both the page and the image. A \`Disallow\` on your image directory, or a CDN rule that blocks unknown user agents, produces a text-only preview. Bot-protection services are a frequent cause.

**6. \`og:url\` points somewhere else.** A redirecting or non-canonical \`og:url\` makes the platform fetch the destination and show that page's tags.

A short pre-publication routine avoids most of this: check the live URL with the ${t("open-graph-checker", "Open Graph checker")}, confirm the image loads in a logged-out private window, and share the link into a private channel once before it goes out publicly. That last step costs nothing and catches the cases where everything looks right in the markup and still renders badly.`,
    },
  ],
  sources: [
    { label: "The Open Graph protocol", url: "https://ogp.me/" },
    { label: "X: Cards markup reference", url: "https://developer.x.com/en/docs/x-for-websites/cards/overview/markup" },
    { label: "Meta for Developers: Sharing webmasters guide", url: "https://developers.facebook.com/docs/sharing/webmasters/" },
    { label: "Meta for Developers: Sharing Debugger", url: "https://developers.facebook.com/tools/debug/" },
    { label: "LinkedIn: Post Inspector", url: "https://www.linkedin.com/post-inspector/" },
  ],
});
