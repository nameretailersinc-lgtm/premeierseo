import { defineGuide, toolLink as t } from "./shared";

export const javascriptSeoBasics = defineGuide({
  slug: "javascript-seo-basics",
  title: "JavaScript SEO: How Google Renders and Indexes Pages",
  h1: "JavaScript SEO: how Google renders and indexes pages",
  metaDescription:
    "How Googlebot crawls, renders and indexes JavaScript pages, the three-phase pipeline, and the patterns that stop content being indexed.",
  summary:
    "Google renders JavaScript, but in a separate, later phase than crawling: it crawls, queues the page for rendering, then indexes what the rendered HTML contains. Content that needs a click, a scroll, a cookie or a user-specific session to appear will not be indexed. Rendering also has to work **without state**, because Googlebot arrives fresh every time.",
  cluster: "Technical SEO",
  tools: ["html-viewer", "mobile-friendly-test", "website-speed-checker", "heading-tag-extractor"],
  body: [
    {
      heading: "The three-phase pipeline",
      body: `Google's documentation on JavaScript SEO basics describes processing in three distinct stages, and the gap between them explains most JavaScript indexing problems.

**1. Crawling.** Googlebot requests the URL and reads the response. It parses the HTML for links and queues them, without executing JavaScript yet.

**2. Rendering.** The page goes into a render queue. When capacity allows, a headless Chromium instance loads it, runs the JavaScript and produces the rendered DOM. Google has said the queue is usually short, but it is not instant and it is not guaranteed.

**3. Indexing.** Google indexes the rendered HTML. Links discovered only during rendering are queued for crawling at this point, which means a link that appears only after JavaScript runs is discovered one full cycle later than a link in the source HTML.

Two consequences follow directly:

- **Links must be real links.** A \`<a href="/page/">\` is crawlable. A \`<div onclick="router.push('/page/')">\` is not a link, and Google's documentation says so explicitly. If navigation is built from click handlers, whole sections of a site can be undiscoverable.
- **The rendered DOM is what counts, not the source.** Viewing source shows phase 1; the indexed content is phase 2's output. To see what Google sees, use Search Console's URL Inspection and read the rendered HTML it returns.

Googlebot renders with an **evergreen Chromium**, so modern JavaScript features are generally supported. What it does not do is behave like a returning visitor, which is the subject of the next section.`,
    },
    {
      heading: "What Googlebot will not do",
      body: `Googlebot is a stateless, non-interactive, impatient visitor. Each of those three words rules out a common pattern.

**Stateless.** Google's documentation states that Googlebot declines cookies and does not preserve state across page loads. \`localStorage\`, \`sessionStorage\`, IndexedDB and service-worker caches start empty and are cleared between pages. Anything that depends on a stored token, a dismissed banner or a saved preference will not work.

**Non-interactive.** It does not click, scroll, hover, type, or dismiss modals. So:

- Content behind a "read more" or "load more" button is not indexed.
- Tabbed content is indexed only if all tabs are in the DOM, which is usually the case when tabs merely hide panels with CSS, and not when a tab fetches its content on click.
- Infinite scroll loads nothing. Pair it with real paginated URLs that work on their own.
- A cookie or age consent wall that blocks content until accepted hides the content completely.

**Impatient.** There is no fixed timeout to design against, but slow pages risk being indexed before late content arrives. Anything essential should be in the initial render path, not behind a chain of client-side requests.

Two further blocks worth checking:

- **Blocked resources.** If robots.txt disallows your JavaScript bundle or API endpoints, rendering runs without them. Never block the assets a page needs to render.
- **Soft-404 routing.** A client-side router that renders "not found" while the server returns 200 produces a soft 404. Return a real 404 from the server, or at least \`noindex\` the error view.

The ${t("html-viewer", "HTML viewer")} shows the HTML a URL returns before any script runs, which is the quickest way to see how much of a page exists in phase 1 and how much depends on rendering.`,
    },
    {
      heading: "Rendering strategies compared",
      body: `The choice of rendering strategy decides how much of this you have to worry about.

| Strategy | What the crawler gets first | SEO risk |
|---|---|---|
| Static generation (SSG) | Complete HTML | Lowest |
| Server-side rendering (SSR) | Complete HTML per request | Low |
| Incremental or hybrid | Complete HTML, revalidated | Low |
| Client-side rendering (CSR) | An empty shell | Highest |
| Dynamic rendering | Prerendered HTML for bots | Legacy workaround |

**Static generation** is the safest option for content that does not change per visitor: the HTML exists before anyone asks for it.

**Server-side rendering** gives the crawler complete HTML too. Watch for hydration mismatches, where the server and client disagree and the client wipes out server-rendered content.

**Client-side rendering** puts all content behind phase 2. It can be indexed, and often is, but every failure mode above applies, and nothing is indexed if rendering fails.

**Dynamic rendering** — detecting crawlers and serving them prerendered HTML — was once Google's own recommendation and is now described as a workaround rather than a long-term solution. It doubles the surface area for bugs, because two code paths must stay in agreement.

Whichever you choose, these details matter:

- **Metadata must be in the rendered output**: title, meta description, canonical, robots and structured data. Setting the canonical by JavaScript is risky, because Google does not pick up a changed canonical reliably when the initial HTML already contains a different one.
- **Each view needs its own URL**, updated with the History API, returning the same content on a direct request.
- **Status codes come from the server**, not the router.

A quick sanity check: the ${t("heading-tag-extractor", "heading tag extractor")} reads the heading structure from the HTML as served, so a page whose H1 appears only after hydration shows up immediately as having none.`,
    },
    {
      heading: "Diagnosing a page that is not indexed",
      body: `Work through this in order; each step rules out a cause.

**1. Compare source with rendered HTML.** Use URL Inspection in Search Console, request indexing, and read both the HTML and the screenshot it produces. If content is missing from the rendered HTML, it is not an indexing problem but a rendering one.

**2. Check for blocked resources.** URL Inspection lists resources it could not load. Scripts or API routes blocked by robots.txt are the most common cause of a blank render.

**3. Test without JavaScript and without cookies.** Load the page with JavaScript disabled to see phase 1, then in a fresh private window to simulate statelessness. Content that disappears in the second case depends on state Googlebot does not have.

**4. Check the status code the server returns**, separately from what the page displays. A 200 on an error view is a soft 404.

**5. Look for client-side redirects.** A JavaScript redirect is followed only if rendering happens; a server redirect is always followed. Use the server where you can.

**6. Check for render-blocking failures.** A single JavaScript error can abort rendering and leave an empty page. Load the URL in a browser with the console open; any uncaught error in the critical path is a candidate.

**7. Confirm the page is linked.** A URL reachable only by a click handler, or only from a sitemap, has weak discovery. Add real \`<a href>\` links.

For a view of how the page behaves on a mobile crawl, the ${t("mobile-friendly-test", "mobile-friendly test")} loads the URL as a mobile device and reports what rendered, and a ${t("website-speed-checker", "website speed checker")} shows whether the critical content arrives early or late in the load. Neither replaces URL Inspection, which is the only tool that reports what Google itself rendered, but both are faster for iterating on a fix.`,
    },
  ],
  sources: [
    { label: "Google Search Central: Understand JavaScript SEO basics", url: "https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics" },
    { label: "Google Search Central: Fix search-related JavaScript problems", url: "https://developers.google.com/search/docs/crawling-indexing/javascript/fix-search-javascript" },
    { label: "Google Search Central: Dynamic rendering as a workaround", url: "https://developers.google.com/search/docs/crawling-indexing/javascript/dynamic-rendering" },
    { label: "Google Search Central: Links and JavaScript", url: "https://developers.google.com/search/docs/crawling-indexing/links-crawlable" },
    { label: "Google Search Central: URL Inspection tool", url: "https://support.google.com/webmasters/answer/9012289" },
  ],
});
