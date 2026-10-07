import type { ToolDef } from "@/lib/types";

/*
 * Website performance, uptime and network tools. Titles, H1s, descriptions and H2 outlines follow
 * docs/keyword-map.json; where the map described features we don't have (multi-engine screenshots, city-level IP
 * data, per-resource page weight breakdown), the text was corrected to what the tools actually do.
 * Examples are real outputs of the code in src/tools/lib/seo; site-specific values are marked illustrative.
 */

const UPDATED = "2026-09-30";

const PSI = {
  name: "Google PageSpeed Insights",
  purpose: "run a Lighthouse test and read Chrome UX Report data",
  url: "https://policies.google.com/privacy",
};

const WEBDEV = {
  vitals: { label: "web.dev: Web Vitals", url: "https://web.dev/articles/vitals" },
  lcp: { label: "web.dev: Largest Contentful Paint (LCP)", url: "https://web.dev/articles/lcp" },
  inp: { label: "web.dev: Interaction to Next Paint (INP)", url: "https://web.dev/articles/inp" },
  cls: { label: "web.dev: Cumulative Layout Shift (CLS)", url: "https://web.dev/articles/cls" },
  ttfb: { label: "web.dev: Time to First Byte (TTFB)", url: "https://web.dev/articles/ttfb" },
};

export const PERFORMANCE_TOOLS: ToolDef[] = [
  /* ------------------------------------------------------------------ website speed checker */
  {
    id: "website-speed-checker",
    path: "/website-speed-checker/",
    name: "Website Speed Checker",
    h1: "Website Speed Checker",
    title: "Website Speed Test – Core Web Vitals and Load Time",
    metaDescription:
      "Test a page's speed on mobile and desktop with Lighthouse lab data and, where available, real-user Core Web Vitals (LCP, INP, CLS). Get specific fixes.",
    summary:
      "Test a page's speed on mobile or desktop with Google PageSpeed Insights: real-user Core Web Vitals (LCP, INP, CLS) where Chrome has enough data, plus a Lighthouse lab test with specific fixes.",
    category: "traffic-performance-tools",
    alsoIn: ["free-seo-tools"],
    subgroup: "speed",
    card: "Test page speed and Core Web Vitals with PageSpeed Insights.",
    archetype: "url",
    widget: "pagespeed",
    config: { mode: "speed" },
    aliases: ["website speed checker", "page speed test", "check website speed", "site speed test", "core web vitals test", "pagespeed insights", "page load time checker", "lighthouse test", "website speed test online"],
    keywords: ["lcp", "inp", "cls", "lighthouse", "core web vitals", "load time"],
    processing: "third-party",
    thirdParty: PSI,
    limits: ["Powered by Google PageSpeed Insights; a test takes 20–60 seconds and may be rate-limited at busy times."],
    steps: [
      "Choose **Mobile** or **Desktop** (Google ranks with mobile data, so start there).",
      "Enter the page URL and press **Test speed**.",
      "Read **Core Web Vitals from real users** first: these are what visitors actually experienced.",
      "Then check the Lighthouse scores, **Lab metrics** and **What would help most**, and open the full report on pagespeed.web.dev for details.",
    ],
    example: {
      title: "Example: how field data is read",
      input: "Chrome UX Report, 75th percentile for a page:\nLCP 2,840 ms (AVERAGE) · INP 160 ms (FAST) · CLS 4 (FAST) · overall AVERAGE",
      output: "Largest Contentful Paint: 2.8 s · Needs improvement (good ≤ 2.5 s)\nInteraction to Next Paint: 160 ms · Good (good ≤ 200 ms)\nCumulative Layout Shift: 0.04 · Good (good ≤ 0.1)\nCore Web Vitals: not passed",
      note: "PageSpeed Insights reports CLS multiplied by 100, so 4 is a CLS of 0.04. A page passes only when all three metrics are good at the 75th percentile.",
    },
    sections: [
      {
        heading: "Lab data vs field data",
        body: "**Field data** comes from the Chrome UX Report: anonymised timings from real Chrome users who visited the page (or the whole site, when the page has too little traffic) over the last 28 days. It's what Google uses for Core Web Vitals in Search. **Lab data** comes from one Lighthouse run on Google's servers, on an emulated mid-range phone with a throttled connection (or a desktop profile). Lab data is repeatable and explains why a page is slow; field data tells you whether real visitors noticed. When they disagree, trust the field data for the verdict and the lab data for the diagnosis.",
      },
      {
        heading: "Core Web Vitals: LCP, INP and CLS",
        body: "| Metric | Measures | Good | Poor |\n|---|---|---|---|\n| LCP, Largest Contentful Paint | When the main content (largest image or text block) appears | ≤ 2.5 s | > 4 s |\n| INP, Interaction to Next Paint | How quickly the page responds to taps, clicks and key presses | ≤ 200 ms | > 500 ms |\n| CLS, Cumulative Layout Shift | How much content jumps around while loading | ≤ 0.1 | > 0.25 |\n\nEach is judged at the 75th percentile of visits. INP replaced First Input Delay (FID) in March 2024. Lab tests can't measure INP because nobody interacts with the page; Total Blocking Time is the lab indicator for it.",
      },
      {
        heading: "What slows pages down",
        body: "- **Slow server response (TTFB):** uncached pages, slow hosting or database queries; fix with caching and a CDN.\n- **Large images:** the most common cause of slow LCP. Compress them with the [image compressor](/image-compressor/), serve WebP or AVIF, size them for the screen, and don't lazy-load the main image.\n- **Render-blocking CSS and JavaScript:** minify, defer non-critical scripts and inline critical CSS.\n- **Heavy JavaScript:** long tasks block the main thread and hurt INP; remove unused code and third-party tags.\n- **Layout shifts:** images, ads and embeds without reserved space, and late-loading web fonts.",
      },
      {
        heading: "Mobile vs desktop results",
        body: "Mobile scores are almost always lower: the Lighthouse mobile profile emulates a mid-range phone with a slower CPU and a throttled network, while desktop uses a fast connection and full CPU. That's deliberate: many visitors use exactly such phones. Google uses mobile data for ranking with mobile-first indexing, so fix mobile first. Field data is reported separately for phones and desktops too.",
      },
      {
        heading: "Re-testing after changes",
        body: "Lab scores vary a few points between runs because of network and server timing; run the test two or three times before deciding a change worked. Field data is a 28-day rolling window, so improvements take up to four weeks to show fully in the Core Web Vitals figures and in Search Console's Core Web Vitals report. Check the HTML weight with the [page size checker](/page-size-checker/) and phone rendering with the [mobile-friendly test](/mobile-friendly-test/).",
      },
    ],
    faq: [
      {
        q: "What is a good LCP?",
        a: "2.5 seconds or less for at least 75% of visits. Between 2.5 and 4 seconds needs improvement; over 4 seconds is poor.",
      },
      {
        q: "Why do results change between tests?",
        a: "Each lab test is a single run, affected by server load, network conditions and third-party scripts at that moment. Field data changes slowly because it averages 28 days of real visits.",
      },
      {
        q: "Does page speed affect rankings?",
        a: "Core Web Vitals are part of Google's page experience signals, but relevance matters far more. A faster page mostly pays off in visitors who stay; it rarely outranks a more relevant page on speed alone.",
      },
    ],
    sources: [
      WEBDEV.vitals,
      WEBDEV.lcp,
      WEBDEV.inp,
      WEBDEV.cls,
      { label: "Google for Developers: About PageSpeed Insights", url: "https://developers.google.com/speed/docs/insights/v5/about" },
      { label: "Chrome for Developers: Chrome UX Report", url: "https://developer.chrome.com/docs/crux" },
      { label: "Google Search Central: Understanding page experience", url: "https://developers.google.com/search/docs/appearance/page-experience" },
    ],
    related: ["page-size-checker", "mobile-friendly-test", "image-compressor", "website-seo-score-checker", "http-status-checker"],
    links: [
      { href: "/page-size-checker/", anchor: "page size checker" },
      { href: "/image-compressor/", anchor: "compress images" },
      { href: "/mobile-friendly-test/", anchor: "mobile-friendly test" },
      { href: "/javascript-minifier/", anchor: "JavaScript minifier" },
      { href: "/blog/optimize-images-for-web/", anchor: "optimising images for speed" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "Real-user Core Web Vitals (LCP, INP, CLS) from the Chrome UX Report",
      "Lighthouse lab test on mobile or desktop",
      "Performance, accessibility, best-practices and SEO scores",
      "Top opportunities with estimated time savings",
      "Final screenshot and a link to the full report",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 1,
  },

  /* ------------------------------------------------------------------ page size checker */
  {
    id: "page-size-checker",
    path: "/page-size-checker/",
    name: "Page Size Checker",
    h1: "Page Size Checker",
    title: "Page Size Checker – HTML Size and Total Page Weight",
    metaDescription:
      "Check how heavy a web page is: compressed and uncompressed HTML size, plus total weight and request count of everything it loads, via PageSpeed Insights.",
    summary:
      "Measure a page's HTML size as transferred and uncompressed, see whether compression is on, and optionally measure the total weight and number of requests of everything the page loads.",
    category: "traffic-performance-tools",
    subgroup: "speed",
    card: "Measure HTML size, compression and total page weight.",
    archetype: "url",
    widget: "url-check",
    config: { mode: "page-size" },
    aliases: ["web page size checker", "page weight checker", "website page size", "check page size in kb", "html size checker", "page size test", "webpage size", "total page weight"],
    keywords: ["page weight", "kb", "compression", "html size"],
    processing: "third-party",
    alsoServer: true,
    thirdParty: { ...PSI, purpose: "measure the total weight of everything the page loads, only when you run the optional full-page test (the HTML check itself runs on our server)" },
    limits: ["The HTML check runs on our server. Total page weight comes from an optional Google PageSpeed Insights test."],
    steps: [
      "Enter the page address and press **Check page size**.",
      "Read **HTML document**: **Transferred** is what crossed the network, **Uncompressed HTML** is the decoded size.",
      "Press **Measure total page weight** to include images, scripts, CSS and fonts (via PageSpeed Insights, 20–60 seconds).",
      "Compare the totals and fix the biggest part first.",
    ],
    example: {
      title: "Example: how the numbers relate (illustrative values)",
      input: "Transferred: 18,412 bytes with content-encoding: br\nDecoded HTML: 96,830 bytes",
      output: "Transferred: 18 KB (br compressed)\nUncompressed HTML: 97 KB\nSaved by compression: 81%",
      note: "Saved = 1 − transferred ÷ uncompressed. Sizes use 1 KB = 1,000 bytes.",
    },
    sections: [
      {
        heading: "HTML size vs total page weight",
        body: "The **HTML document** is the first file the browser downloads; everything else (images, CSS, JavaScript, fonts, video) is listed inside it and fetched afterwards. On most sites the HTML is a small part of the total; images and JavaScript dominate. This checker measures the HTML directly from our server and counts the scripts, stylesheets, images and iframes it references. For the full total, it runs a Lighthouse test through PageSpeed Insights, which loads the page in a real browser and adds up every request.",
      },
      {
        heading: "Breakdown by resource type",
        body: "The HTML check lists how many external scripts, stylesheets, images and iframes the page references, which hints where the weight is. A per-type breakdown in bytes, and the largest individual files, are in the full PageSpeed Insights report (the \"Avoid enormous network payloads\" audit) and in your browser's developer tools: open the Network tab, reload, and sort by size.",
      },
      {
        heading: "Compressed vs uncompressed bytes",
        body: "Servers can compress text files (HTML, CSS, JavaScript, SVG, JSON) with gzip or Brotli before sending them; the browser unpacks them. **Transferred** size affects download time; **uncompressed** size affects how much the browser has to parse. HTML usually compresses very well, so if `content-encoding` is missing, turning compression on is one of the cheapest speed wins there is. Images and video are already compressed and don't shrink further.",
      },
      {
        heading: "Largest resources to fix first",
        body: "1. **Images:** usually the heaviest. Resize to the displayed size and compress; the [image compressor](/image-compressor/) converts to WebP.\n2. **JavaScript:** large bundles and third-party tags; remove what you don't use and minify the rest.\n3. **Fonts:** subset them and limit weights and styles.\n4. **CSS:** remove unused rules and minify with the [CSS minifier](/css-minifier/).\n5. **HTML:** inline data and huge menus inflate it; minify with the [HTML minifier](/html-minifier/).",
      },
      {
        heading: "What is a reasonable page size?",
        body: "There's no official limit for visitors. Lighthouse flags pages whose total transfer exceeds about 5,000 KiB (\"Avoid enormous network payloads\") and treats lighter pages as better. For HTML specifically, Googlebot reads only the first 15 MB of an HTML file, so content past that point isn't indexed; real pages rarely come close. A lighter page loads faster on slow mobile connections and costs visitors on metered plans less.",
      },
    ],
    faq: [
      {
        q: "What is a good page size?",
        a: "As small as the content allows. Under about 1–2 MB total transfer loads comfortably on mobile; Lighthouse starts warning above roughly 5 MB.",
      },
      {
        q: "Does Googlebot have an HTML size limit?",
        a: "Yes: Googlebot fetches the first 15 MB of an HTML file (or other supported text file). Anything after that isn't used for indexing. Each image or script referenced is fetched separately with its own limit.",
      },
      {
        q: "Why is the transferred size smaller?",
        a: "Because the server compressed the file with gzip or Brotli. The browser downloads the smaller version and decompresses it.",
      },
    ],
    sources: [
      { label: "Google Search Central: Googlebot (file size limits)", url: "https://developers.google.com/search/docs/crawling-indexing/googlebot" },
      { label: "Chrome for Developers: Avoid enormous network payloads (Lighthouse)", url: "https://developer.chrome.com/docs/lighthouse/performance/total-byte-weight" },
      { label: "MDN: Compression in HTTP", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Compression" },
    ],
    related: ["website-speed-checker", "image-compressor", "mobile-friendly-test", "http-status-checker"],
    links: [
      { href: "/website-speed-checker/", anchor: "website speed test" },
      { href: "/image-compressor/", anchor: "image compressor" },
      { href: "/css-minifier/", anchor: "CSS minifier" },
      { href: "/html-minifier/", anchor: "HTML minifier" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "Transferred and uncompressed HTML size measured from our server",
      "Compression detection and savings",
      "Counts of referenced scripts, stylesheets, images and iframes",
      "Optional total page weight and request count via PageSpeed Insights",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 2,
  },

  /* ------------------------------------------------------------------ mobile-friendly test */
  {
    id: "mobile-friendly-test",
    path: "/mobile-friendly-test/",
    name: "Mobile-Friendly Test",
    h1: "Mobile-Friendly Test",
    title: "Mobile-Friendly Test – Check Any Page on Phone Screens",
    metaDescription:
      "Check whether a page works on phones: viewport tag, zoom settings and Lighthouse mobile audits for text size, with a screenshot and a phone-size preview.",
    summary:
      "Check whether a page is set up for phones (viewport tag, zoom, language, embeds) and, optionally, run Google's Lighthouse mobile test for text size, a mobile score and a screenshot, plus a phone-size preview.",
    category: "traffic-performance-tools",
    alsoIn: ["free-seo-tools"],
    subgroup: "mobile",
    card: "Check a page's viewport, text size and layout on phones.",
    archetype: "url",
    widget: "pagespeed",
    config: { mode: "mobile" },
    aliases: ["mobile friendly checker", "mobile friendly test tool", "responsive test", "google mobile friendly test alternative", "mobile site viewer", "mobile responsive checker", "is my site mobile friendly", "mobile test"],
    keywords: ["mobile", "viewport", "responsive", "phone"],
    processing: "third-party",
    alsoServer: true,
    thirdParty: { ...PSI, purpose: "run a Lighthouse mobile test, only when you press Run Lighthouse mobile test (the HTML checks run on our server)" },
    steps: [
      "Enter the page address and press **Test page** to run the HTML checks from our server.",
      "Read **Mobile checks**: viewport tag, zoom settings, page language, embeds and image dimensions.",
      "Press **Run Lighthouse mobile test** for font-size results, a mobile performance score and a screenshot.",
      "Optionally choose a **Device size** and press **Show preview** to see the page at that width in your own browser.",
    ],
    example: {
      title: "Example: a viewport that blocks zoom",
      input: '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">',
      output: "Warning  Viewport meta tag\nuser-scalable=no blocks pinch zoom; maximum-scale=1 limits zoom. Use width=device-width, initial-scale=1 and allow zooming (WCAG 1.4.4).",
    },
    sections: [
      {
        heading: "What mobile-friendly means today",
        body: "A mobile-friendly page renders at the phone's width without sideways scrolling, uses text that's readable without zooming, has buttons and links big enough to tap, and still lets people zoom in when they need to. Since Google switched to mobile-first indexing, it indexes and ranks the mobile version of every page, so content or links missing on mobile are missing for Google too.",
      },
      {
        heading: "Viewport, font size and tap targets",
        body: "- **Viewport:** `<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">` tells phones to use their real width. Without it, they render a 980 px desktop layout and shrink it. `user-scalable=no` or `maximum-scale=1` block zooming, which fails WCAG 1.4.4.\n- **Font size:** Lighthouse's \"legible font sizes\" audit checks that most text is at least 12 px; 16 px body text is a comfortable default.\n- **Tap targets:** WCAG 2.5.8 asks for targets of at least 24 × 24 CSS px or enough spacing; 44–48 px is a common design guideline. Newer Lighthouse versions no longer report tap targets, so the tool shows the check only when Lighthouse returns it.",
      },
      {
        heading: "Screenshots on common phone sizes",
        body: "The Lighthouse test returns a screenshot taken on Google's emulated phone, which works even when a site refuses to be embedded. The **phone-size preview** loads the page in your own browser at a phone's width (iPhone SE 375 px, iPhone 15 393 px, Pixel 8 412 px, Galaxy S24 360 px). It shows the responsive layout but isn't a different browser or a touch device, and many sites forbid embedding; the tool warns when the site's headers will block it.",
      },
      {
        heading: "Google's retired Mobile-Friendly Test and what replaced it",
        body: "Google retired its Mobile-Friendly Test tool, its API and Search Console's Mobile Usability report in December 2023, pointing people to Lighthouse instead. This page combines the checks it covered: the viewport tag and zoom settings from the HTML (from our server) and Lighthouse's mobile audits, mobile performance score and screenshot (from PageSpeed Insights). For a deeper look, the device mode in Chrome's developer panel emulates phones on your own computer.",
      },
      {
        heading: "Fixing common mobile problems",
        body: "- **Content wider than the screen:** fixed-width containers, wide tables or images without `max-width: 100%`.\n- **Tiny text:** set a base font size of 16 px and use relative units.\n- **Crowded links:** add padding to menu items and buttons.\n- **Pop-ups covering content:** intrusive interstitials on mobile are a page-experience problem.\n- **Slow loading:** check the [website speed test](/website-speed-checker/) on the mobile setting and the [page size checker](/page-size-checker/).",
      },
    ],
    faq: [
      {
        q: "Does Google still have a Mobile-Friendly Test?",
        a: "No. Google retired it, together with the Mobile Usability report, in December 2023 and recommends Lighthouse. This page runs similar checks and a Lighthouse mobile test.",
      },
      {
        q: "Is mobile-friendliness a ranking factor?",
        a: "Mobile usability is part of page experience, and Google indexes the mobile version of pages. A page that's unusable on phones loses visitors regardless of rankings.",
      },
      {
        q: "Why does my site look different on a real phone?",
        a: "Real phones differ in browser engine (all iOS browsers use WebKit), fonts, notches, browser toolbars and touch behavior. The preview here only resizes your current browser; test important pages on real devices.",
      },
    ],
    sources: [
      { label: "Google Search Central: Mobile-first indexing best practices", url: "https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing" },
      { label: "MDN: Viewport meta tag", url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Viewport_meta_tag" },
      { label: "WCAG 2.2: 1.4.4 Resize Text", url: "https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html" },
      { label: "WCAG 2.2: 2.5.8 Target Size (Minimum)", url: "https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html" },
      { label: "Chrome for Developers: Lighthouse font-size audit", url: "https://developer.chrome.com/docs/lighthouse/seo/font-size" },
    ],
    related: ["website-speed-checker", "page-size-checker", "meta-tags-analyzer", "what-is-my-browser"],
    links: [
      { href: "/website-speed-checker/", anchor: "website speed test" },
      { href: "/page-size-checker/", anchor: "page size checker" },
      { href: "/meta-tags-analyzer/", anchor: "check the viewport tag" },
      { href: "/what-is-my-browser/", anchor: "what is my browser" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "Viewport and zoom checks from the page's HTML",
      "Optional Lighthouse mobile audits, score and screenshot",
      "Phone-size preview in your browser, with an embedding warning",
      "Explains Google's 2023 retirement of its own test",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 1,
  },

  /* ------------------------------------------------------------------ cross-browser tester (noindex) */
  {
    id: "cross-browser-tester",
    path: "/cross-browser-tester/",
    name: "Cross Browser Tester",
    h1: "Cross Browser Tester",
    title: "Cross-Browser Tester – Responsive Preview in Your Browser",
    metaDescription:
      "Preview a page at phone, tablet and desktop sizes in your own browser, and learn which cross-browser differences need real devices to check.",
    summary:
      "Preview a page at several phone, tablet and desktop sizes side by side in the browser you're using now. It doesn't test other browser engines; the notes explain how to do that.",
    category: "traffic-performance-tools",
    subgroup: "mobile",
    card: "Preview a page at phone, tablet and desktop sizes side by side.",
    archetype: "url",
    widget: "viewport-preview",
    aliases: ["cross browser testing", "browser compatibility test", "responsive preview", "test website in different browsers", "responsive design checker", "screen size tester"],
    keywords: ["responsive", "viewport", "devices"],
    processing: "browser",
    limits: ["Uses your current browser only; your browser loads the page directly from the site.", "Sites that forbid embedding show a blank frame."],
    steps: [
      "Enter the page URL.",
      "Tick the **Screen sizes** to compare, or add a **Custom size**.",
      "Press **Show previews**. Use **Reload** on a frame or **Open in new tab** if a site won't embed.",
    ],
    sections: [
      {
        heading: "Rendering engines vs browser brands",
        body: "There are three browser engines in wide use: **Blink** (Chrome, Edge, Opera, Samsung Internet, Brave), **WebKit** (Safari, and every browser on iPhone and iPad) and **Gecko** (Firefox). Cross-browser bugs come from engine differences, not brand names. This preview uses whichever engine you're running now, so it tests layouts at different widths, not engines. Open the page in each engine, or use a testing service that runs real browsers, to catch engine-specific problems.",
      },
      {
        heading: "What screenshots can and can't show",
        body: "A resized frame shows breakpoints, overflowing content, wrapped navigation and images that don't scale. It can't show touch behavior, the on-screen keyboard, notches and browser toolbars, real device fonts, or performance on slower hardware. It also loads the page as a frame, so cookie banners and logins may behave differently than in a normal tab.",
      },
      {
        heading: "Common cross-browser layout bugs",
        body: "- `100vh` sections hidden behind mobile browser toolbars (use `100dvh`).\n- Form controls and date pickers that look different in each engine.\n- Newer CSS (for example `:has()`, container queries, subgrid) in older browser versions.\n- Flexbox `gap` and sticky positioning quirks in older Safari.\n- Fonts that fall back differently when a web font fails.\n\nCheck support on MDN's compatibility tables before relying on a feature.",
      },
      {
        heading: "Testing on real devices",
        body: "For a quick check, borrow phones from people around you: one iPhone (WebKit) and one Android phone (Blink) cover most visitors. Desktop browsers' device modes (Chrome DevTools, Firefox Responsive Design Mode, Safari's Responsive Design Mode) emulate sizes and touch on your computer. Commercial services provide real browsers and devices remotely when you need older versions or many combinations.",
      },
    ],
    faq: [
      {
        q: "Is Safari the same as WebKit?",
        a: "Safari is built on WebKit, and on iPhone and iPad every browser, including Chrome and Firefox, must use WebKit. So testing in iOS Chrome is effectively testing WebKit.",
      },
      {
        q: "Can I test old Internet Explorer?",
        a: "Not here. Microsoft ended support for Internet Explorer in 2022; Edge has an IE mode for old intranet sites, and few public sites still need to support IE.",
      },
      {
        q: "Why does my site look different on iPhone?",
        a: "iPhones use WebKit, have different default fonts and form controls, and their toolbars change the visible height. Test in Safari on a real iPhone or in Safari's Responsive Design Mode on a Mac.",
      },
    ],
    sources: [
      { label: "MDN: Introduction to cross-browser testing", url: "https://developer.mozilla.org/en-US/docs/Learn/Tools_and_testing/Cross_browser_testing/Introduction" },
      { label: "MDN: X-Frame-Options", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options" },
    ],
    related: ["mobile-friendly-test", "what-is-my-browser", "website-speed-checker", "page-size-checker"],
    links: [
      { href: "/mobile-friendly-test/", anchor: "mobile-friendly test" },
      { href: "/what-is-my-browser/", anchor: "what is my browser" },
    ],
    appCategory: "DeveloperApplication",
    features: ["Side-by-side previews at seven device sizes plus a custom size", "Scales frames to fit the screen", "Reload and open-in-new-tab per frame", "States clearly that it uses your own browser"],
    indexable: false,
    updated: UPDATED,
    priority: 3,
  },

  /* ------------------------------------------------------------------ website uptime checker */
  {
    id: "website-uptime-checker",
    path: "/website-uptime-checker/",
    name: "Website Uptime Checker",
    h1: "Website Uptime Checker",
    title: "Website Uptime Checker – Is Your Site Up Right Now?",
    metaDescription:
      "Check whether your site responds right now, with status code, response time and page title. Learn what uptime percentages mean and how monitoring works.",
    summary:
      "Check whether your website responds right now, from our server: status code, response time, time to first byte and page title, with a plain verdict. A one-off check, not continuous monitoring.",
    category: "traffic-performance-tools",
    subgroup: "uptime",
    card: "Check if your site responds right now, with status and timing.",
    archetype: "url",
    widget: "url-check",
    config: { mode: "uptime" },
    aliases: ["uptime checker", "website uptime test", "check website uptime", "website availability checker", "uptime monitor", "free website uptime test", "site uptime check", "server uptime checker"],
    keywords: ["uptime", "availability", "response time", "downtime"],
    processing: "server",
    limits: ["One check from one location (our server) each time you press the button. It doesn't monitor or alert."],
    steps: [
      "Enter your site's address and press **Check uptime**.",
      "Read the verdict, then the **Status**, **Response time**, **Time to first byte** and **Page title**.",
      "Press **Check again** to repeat; earlier results stay under **Checks in this session** until you leave the page.",
    ],
    example: {
      title: "Example: how results are worded",
      input: "Four different outcomes of a check",
      output: "200 → Up: it's responding for us\n503 → Down: the server returns an error\nDNS lookup failed → Down: the domain doesn't resolve\nNo answer in 10 s → Down: no response",
      note: "These are the tool's verdicts. A failure of our own checker is reported separately as “We couldn't tell”, never as your site being down.",
    },
    sections: [
      {
        heading: "One-off checks vs continuous monitoring",
        body: "This tool answers one question: does the site respond right now? Our server requests the page once, follows redirects and reports what happened. **Monitoring** repeats that check every minute or few minutes, from several locations, records the history and alerts you by email or SMS when it fails twice in a row. Use this checker to confirm a suspected outage or test a fix; use a monitoring service to know about outages before your customers do.",
      },
      {
        heading: "Reading status and response time",
        body: "- **Status 2xx:** up. **3xx** redirects are followed and the final page is reported.\n- **4xx:** the server is up but this URL fails (404) or refuses automated requests (403, 429).\n- **5xx:** the server or application is failing: down for visitors.\n- **Response time** is the total for every request including redirects; **time to first byte** is how long the server took to start answering the final request. web.dev considers a TTFB up to 0.8 s good. Times are measured from our server, so your own will differ by network distance.",
      },
      {
        heading: "What uptime percentages mean in minutes",
        body: "| Uptime | Downtime per month (30.4 days) | Downtime per year |\n|---|---|---|\n| 99% | 7 h 18 min | 3 days 15 h |\n| 99.5% | 3 h 39 min | 1 day 20 h |\n| 99.9% | 43 min 50 s | 8 h 46 min |\n| 99.95% | 21 min 55 s | 4 h 23 min |\n| 99.99% | 4 min 23 s | 52 min 36 s |\n\nHosting SLAs usually exclude planned maintenance, and they compensate with credits rather than preventing downtime.",
      },
      {
        heading: "Checking from more than one location",
        body: "Every check here comes from our server, in one location. A site can be up for us and down in another region, for example when a CDN edge, a DNS provider or a regional network fails, or when a firewall blocks certain countries. Monitoring services that check from several continents catch those partial outages. If visitors report problems you can't reproduce, ask them for the error message and the result of [is it down](/is-it-down/) from their side.",
      },
      {
        heading: "Setting up free monitoring",
        body: "Several monitoring services have free plans that check a handful of URLs every five minutes and alert by email. When choosing one, check the interval, how many locations confirm an outage before alerting (fewer false alarms), whether it checks for a keyword on the page (catches \"200 OK\" error pages), and whether it watches HTTPS certificate expiry. Monitor the homepage plus one page that hits the database, such as search or a product page.",
      },
    ],
    faq: [
      {
        q: "What does 99.9% uptime mean per month?",
        a: "About 43 minutes and 50 seconds of downtime in an average month, or 8 hours 46 minutes a year.",
      },
      {
        q: "Why is my site up here but down for me?",
        a: "The problem is between you and the site: your DNS cache, network, ISP, VPN, firewall or a regional CDN problem. Try another network (mobile data) and clear your DNS cache.",
      },
      {
        q: "How often should uptime be checked?",
        a: "Monitoring services typically check every 1–5 minutes. Shorter intervals find outages sooner; alerting after two failed checks from different locations avoids false alarms.",
      },
    ],
    sources: [
      WEBDEV.ttfb,
      { label: "RFC 9110: HTTP Semantics, status codes", url: "https://www.rfc-editor.org/rfc/rfc9110#section-15" },
    ],
    related: ["is-it-down", "http-status-checker", "website-speed-checker", "redirect-checker"],
    links: [
      { href: "/is-it-down/", anchor: "is it down for everyone?" },
      { href: "/http-status-checker/", anchor: "HTTP status checker" },
      { href: "/website-speed-checker/", anchor: "website speed test" },
      { href: "/redirect-checker/", anchor: "redirect checker" },
    ],
    appCategory: "DeveloperApplication",
    features: [
      "Plain verdict from a live request",
      "Status code, response time, TTFB and page title",
      "Separates site failures from checker failures",
      "Recheck button and session history",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 2,
  },

  /* ------------------------------------------------------------------ is it down */
  {
    id: "is-it-down",
    path: "/is-it-down/",
    name: "Is It Down? Website Down Checker",
    h1: "Is It Down? Website Down Checker",
    title: "Is It Down? Check if a Website Is Down for Everyone",
    metaDescription:
      "Find out if a website is down for everyone or just you. We request the page from our server and show the status, response time and what to try next.",
    summary:
      "Find out whether a website is down for everyone or just for you: we request it from our server, show what happened, and list what to try next.",
    category: "traffic-performance-tools",
    subgroup: "uptime",
    card: "Check if a website is down for everyone or just you.",
    archetype: "url",
    widget: "url-check",
    config: { mode: "down" },
    aliases: ["is it down for everyone or just me", "website down checker", "is the site down", "check if website is down", "down for everyone", "is website down", "site not loading", "down or not"],
    keywords: ["down", "outage", "not loading", "dns"],
    processing: "server",
    limits: ["Checked from one location (our server). A regional outage may not show up here."],
    steps: [
      "Enter the website address and press **Check now**.",
      "Read the verdict: up, refusing our request, returning an error, or not responding at all.",
      "Follow the list under the verdict: what to try if it works for us but not for you, or what to do if it's down.",
      "Press **Check again** after a few minutes to see whether it has come back.",
    ],
    example: {
      title: "Example verdicts",
      input: "Results from our server for four sites (illustrative)",
      output: "200 → Up: it's responding for us (the problem is likely on your side)\n403 → Up, but it refused our request\n503 → Down: the server returns an error\nDNS lookup failed → Down: the domain doesn't resolve",
    },
    sections: [
      {
        heading: "Down for everyone or just you?",
        body: "If our server can load the site but you can't, the site is up and something between you and it is failing: your connection, DNS, browser, VPN or a block on your network or country. If our server can't load it either (no DNS answer, no response, a 5xx error), it's very likely down for everyone. One caveat: we check from a single location, so a regional outage at a CDN or ISP can look fine from here.",
      },
      {
        heading: "What the result means",
        body: "| Verdict | Meaning |\n|---|---|\n| Up | The server answered normally (2xx or a redirect to a working page). |\n| Up, but refused | 401, 403 or 429: it's running but blocks automated or unauthenticated requests. |\n| Page returns 4xx | The server works but that page doesn't exist (404) or was removed (410). |\n| Server error | 5xx: the site or its hosting is failing. |\n| Doesn't resolve | DNS failed: expired domain, typo, or broken DNS. |\n| No response / refused | Server offline, overloaded or firewalled. |\n| Certificate invalid | It answers, but browsers show a security warning. |",
      },
      {
        heading: "Fixes when a site is only down for you",
        body: "1. Hard-refresh (Ctrl+F5, or Cmd+Shift+R on a Mac) or open a private window.\n2. Try another network: switch your phone between Wi-Fi and mobile data.\n3. Turn off VPN, proxy and ad-blocking extensions.\n4. Restart your router if nothing loads on your Wi-Fi.\n5. Check your device's date and time; a wrong clock breaks HTTPS.",
      },
      {
        heading: "DNS, cache and network checks",
        body: "Your computer remembers DNS answers. If a site moved servers, your cached answer may be out of date. Flush it with `ipconfig /flushdns` on Windows or `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder` on macOS, or switch to a public DNS resolver. The [IP address lookup](/ip-address-lookup/) shows your public IP and network, which helps when a site blocks certain networks, and [what is my browser](/what-is-my-browser/) gives details to send to a site's support team.",
      },
      {
        heading: "Reporting an outage",
        body: "If the site is down for everyone, look for its status page (often `status.` plus the domain) or its social media accounts before reporting. When you contact support, include the time, what you saw (error message or code), the result from this page and your location. If it's your own site, check your hosting dashboard, the domain's expiry date and DNS records, and the server's error logs; then use the [website uptime checker](/website-uptime-checker/) to confirm it's back.",
      },
    ],
    faq: [
      {
        q: "Why can others open a site I can't?",
        a: "Something specific to your connection is failing: cached DNS, your ISP, a VPN or firewall, a browser extension, or a block on your network or region.",
      },
      {
        q: "How do I flush my DNS?",
        a: "On Windows, run `ipconfig /flushdns` in Command Prompt. On macOS, run `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder` in Terminal. On phones, toggling airplane mode usually clears it.",
      },
      {
        q: "Could the site be blocking my country?",
        a: "Yes. Some sites restrict access by region for legal or licensing reasons, and some networks block sites. If it works for us but shows an access-denied page for you, that's a likely cause.",
      },
    ],
    sources: [
      { label: "RFC 9110: HTTP Semantics, status codes", url: "https://www.rfc-editor.org/rfc/rfc9110#section-15" },
      { label: "MDN: HTTP response status codes", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Status" },
    ],
    related: ["website-uptime-checker", "http-status-checker", "ip-address-lookup", "what-is-my-browser"],
    links: [
      { href: "/website-uptime-checker/", anchor: "website uptime checker" },
      { href: "/http-status-checker/", anchor: "HTTP status checker" },
      { href: "/ip-address-lookup/", anchor: "check your IP address" },
      { href: "/what-is-my-browser/", anchor: "what is my browser" },
    ],
    appCategory: "UtilitiesApplication",
    features: [
      "Live check from our server with a plain verdict",
      "Distinguishes DNS failures, timeouts, server errors, blocks and certificate problems",
      "What-to-try list for each outcome",
      "Recheck with session history",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 1,
  },

  /* ------------------------------------------------------------------ what is my browser */
  {
    id: "what-is-my-browser",
    path: "/what-is-my-browser/",
    name: "What Is My Browser?",
    h1: "What Is My Browser?",
    title: "What Is My Browser? Version, OS and User Agent",
    metaDescription:
      "See which browser and version you're using, your operating system, screen size, language and full user-agent string, and whether key features are on.",
    summary:
      "See which browser and version you're using, your operating system, device type, screen size, language and full user-agent string, and copy the details for a support request.",
    category: "traffic-performance-tools",
    subgroup: "network",
    card: "See your browser, version, OS, screen size and user agent.",
    archetype: "analyzer",
    widget: "browser-info",
    aliases: ["what browser am i using", "browser version checker", "my user agent", "what is my user agent", "check my browser version", "browser detector", "which browser do i have", "user agent string"],
    keywords: ["user agent", "browser version", "operating system"],
    processing: "browser",
    steps: [
      "Open the page: your browser, operating system, device type and engine appear at the top.",
      "Press **Copy user agent** for the raw user-agent string.",
      "Press **Copy details for support** to copy everything (browser, screen, settings) as text for a help desk.",
    ],
    example: {
      title: "Example: reading a user-agent string",
      input: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.2792.65",
      output: "Browser: Microsoft Edge 129.0.2792.65\nEngine: Blink\nOperating system: Windows 10 or 11\nDevice: Desktop or laptop",
      note: "Windows 11 still reports \"Windows NT 10.0\" in the user agent, so the string alone can't tell 10 from 11; Client Hints can.",
    },
    sections: [
      {
        heading: "Your browser and version",
        body: "The browser name and version are read from your user-agent string and, in Chrome, Edge and other Chromium browsers, from User-Agent Client Hints, which report the full version more reliably. The order of checks matters because browsers imitate each other: Edge's string also contains \"Chrome\" and \"Safari\", so the detector looks for the most specific name first.",
      },
      {
        heading: "Operating system and device",
        body: "The operating system comes from the platform part of the user agent (`Windows NT 10.0`, `Mac OS X 10_15_7`, `Android 14`, `iPhone OS 18_0`). Modern browsers freeze or reduce some of these values for privacy: macOS always reports 10.15.7 in Chrome and Safari, and Windows 11 reports itself as Windows NT 10.0. Where Client Hints are available, the **Platform** row shows the real version. Device type (phone, tablet, desktop) is inferred from the same string.",
      },
      {
        heading: "The user-agent string explained",
        body: "Almost every user agent starts with `Mozilla/5.0`, a leftover from the 1990s when sites served better pages to Netscape (\"Mozilla\") and other browsers started claiming to be it. Then come the platform in brackets, the engine (`AppleWebKit/537.36` or `Gecko/20100101`), and browser tokens. Sites use the string for statistics and occasional workarounds; support teams use it to reproduce problems.",
      },
      {
        heading: "Cookies, JavaScript and other settings",
        body: "The settings panel shows whether cookies are enabled, your screen and window size and pixel ratio, color-scheme and reduced-motion preferences, languages, time zone, touch support, CPU threads and approximate memory (some browsers don't report these), and the Do Not Track and Global Privacy Control signals. JavaScript is obviously on if you can see the details. Everything is read locally; nothing is sent to our server.",
      },
      {
        heading: "How to update your browser",
        body: "- **Chrome:** menu ⋮ → Help → About Google Chrome.\n- **Edge:** menu … → Help and feedback → About Microsoft Edge.\n- **Firefox:** menu ☰ → Help → About Firefox.\n- **Safari (Mac):** System Settings → General → Software Update.\n- **iPhone/iPad:** Settings → General → Software Update (Safari updates with iOS).\n- **Android:** Google Play → your browser → Update.\n\nThis page doesn't say whether your version is the latest, because that needs an up-to-date version list we don't maintain; the About pages above check for you.",
      },
    ],
    faq: [
      {
        q: "How do I check my browser version?",
        a: "It's shown at the top of this page. You can also open your browser's About page (for Chrome: menu → Help → About Google Chrome), which also checks for updates.",
      },
      {
        q: "Why does my user agent say Mozilla?",
        a: "For compatibility. In the 1990s sites checked for \"Mozilla\" (Netscape) before serving modern pages, so every browser added it, and it has stayed ever since.",
      },
      {
        q: "Is my browser up to date?",
        a: "We don't check, because that needs a maintained list of current versions. Your browser's About page compares your version with the latest and installs updates.",
      },
    ],
    sources: [
      { label: "MDN: User-Agent header", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/User-Agent" },
      { label: "MDN: User-Agent Client Hints API", url: "https://developer.mozilla.org/en-US/docs/Web/API/User-Agent_Client_Hints_API" },
      { label: "Chrome for Developers: User-Agent reduction", url: "https://developer.chrome.com/docs/privacy-security/user-agent-reduction" },
    ],
    related: ["ip-address-lookup", "is-it-down", "mobile-friendly-test", "website-speed-checker"],
    links: [
      { href: "/ip-address-lookup/", anchor: "what is my IP address" },
      { href: "/is-it-down/", anchor: "is a site down for everyone?" },
      { href: "/mobile-friendly-test/", anchor: "mobile-friendly test" },
    ],
    appCategory: "UtilitiesApplication",
    features: [
      "Browser, version, engine, OS and device type",
      "User-Agent Client Hints where supported",
      "Screen, window, language, time zone and privacy settings",
      "Copy the user agent or a full support report",
      "Runs locally; nothing is uploaded",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 2,
  },

  /* ------------------------------------------------------------------ IP address lookup */
  {
    id: "ip-address-lookup",
    path: "/ip-address-lookup/",
    name: "IP Address Lookup",
    h1: "IP Address Lookup",
    title: "IP Address Lookup – Location, ISP and ASN for Any IP",
    metaDescription:
      "Look up any IPv4 or IPv6 address to see its country and network owner (ASN), or view your own public IP. Data source and accuracy limits explained.",
    summary:
      "See your own public IP address, or look up any IPv4 or IPv6 address to find its country, network (ASN) and the organization that operates it, with the data source named.",
    category: "traffic-performance-tools",
    subgroup: "network",
    card: "See your public IP or look up any IP's country and network.",
    archetype: "url",
    widget: "ip-lookup",
    aliases: ["ip lookup", "ip location lookup", "geo ip lookup", "ip geolocation", "what is my ip", "geo ip locator", "my ip address", "ip address location", "asn lookup", "ip checker"],
    keywords: ["ip", "ipv4", "ipv6", "asn", "isp", "geolocation"],
    processing: "third-party",
    thirdParty: {
      name: "ipinfo.io",
      purpose: "look up the country and network of an IP address (your own when the page loads, or the one you enter), when lookups are configured",
      url: "https://ipinfo.io/privacy-policy",
    },
    limits: ["Country-level location and network owner only; no city, street address or person can be identified from an IP."],
    steps: [
      "Open the page: **Your public IP address** appears with its approximate location and network.",
      "Press **Copy IP** to copy it.",
      "To check another address, type it under **IP address** and press **Look up IP** (or **Use my IP**).",
    ],
    example: {
      title: "Example: a private address",
      input: "192.168.1.10",
      output: "192.168.1.10 is a private or reserved address\nThis is a private, local or reserved address. It isn't routed on the public internet, so it has no public location.",
      note: "That's the server's real answer for any address in the private ranges (10.x, 172.16–31.x, 192.168.x). Public addresses return the country and network from ipinfo.io when lookups are configured.",
    },
    sections: [
      {
        heading: "Your public IP address",
        body: "The address shown is the one websites see when you connect: usually your router's public address, shared by every device on your network, or your mobile carrier's. Your device's own address on the home network (such as 192.168.1.20) is different and private. If you use a VPN or iCloud Private Relay, sites see the VPN's address instead. The approximate location comes from our hosting provider's edge network and, when configured, from ipinfo.io.",
      },
      {
        heading: "What IP geolocation can and can't tell you",
        body: "IP location databases map address ranges to the place where the network operator registered or uses them. Country is usually right; anything finer is an estimate. This tool reports the **country** and the **network** only. It can't reveal a street address, a name or who was using an address at a given moment; only the network operator knows that, and only discloses it under legal process.",
      },
      {
        heading: "ISP, ASN and connection type",
        body: "An **ASN** (Autonomous System Number, such as AS15169) identifies a network that routes its own block of IP addresses on the internet: an ISP, a mobile carrier, a cloud provider or a large company. The lookup shows the ASN, the organization that operates it and its domain. That tells you, for example, whether traffic comes from a home broadband provider or a data center, which is useful when investigating suspicious traffic or a blocked visitor.",
      },
      {
        heading: "IPv4 vs IPv6",
        body: "| | IPv4 | IPv6 |\n|---|---|---|\n| Example | 203.0.113.42 | 2001:db8::8a2e:370:7334 |\n| Size | 32 bits, about 4.3 billion addresses | 128 bits, about 3.4 × 10³⁸ addresses |\n| Sharing | Often shared through NAT | Usually one per device |\n\nMany connections have both. Sites that support IPv6 see your IPv6 address; others see IPv4. The tool tells you which version you're connected with.",
      },
      {
        heading: "Why the location looks wrong",
        body: "- Your ISP registered the address block in another city or region.\n- Mobile carriers route traffic through a few central gateways, often far from you.\n- VPNs, proxies, corporate networks and privacy relays show their exit location.\n- Address blocks are reassigned and databases update with a delay.\n\nIf a site blocks you based on a wrong location, contacting your ISP or the database provider (ipinfo.io has a correction form) is the fix.",
      },
    ],
    faq: [
      {
        q: "Can someone find my home address from my IP?",
        a: "Not from public data. An IP lookup shows the network operator and roughly where it is. Only your ISP can link an address to a subscriber, and it discloses that only under legal process.",
      },
      {
        q: "Why does my IP show the wrong city?",
        a: "Location databases record where address blocks are registered or routed, not where you are. Mobile and VPN connections especially appear far away. This tool shows country level only for that reason.",
      },
      {
        q: "What is an ASN?",
        a: "An Autonomous System Number identifies a network that manages its own IP address ranges on the internet, such as an ISP, mobile carrier or cloud provider.",
      },
    ],
    sources: [
      { label: "ipinfo.io privacy policy", url: "https://ipinfo.io/privacy-policy" },
      { label: "RFC 1918: Address allocation for private internets", url: "https://www.rfc-editor.org/rfc/rfc1918" },
      { label: "RFC 8200: Internet Protocol, Version 6 (IPv6)", url: "https://www.rfc-editor.org/rfc/rfc8200" },
      { label: "RFC 1930: Guidelines for creation, selection and registration of an Autonomous System", url: "https://www.rfc-editor.org/rfc/rfc1930" },
    ],
    related: ["what-is-my-browser", "is-it-down", "website-uptime-checker", "http-status-checker"],
    links: [
      { href: "/what-is-my-browser/", anchor: "what is my browser" },
      { href: "/is-it-down/", anchor: "is it down checker" },
      { href: "/website-uptime-checker/", anchor: "website uptime checker" },
    ],
    appCategory: "UtilitiesApplication",
    features: [
      "Shows your public IPv4 or IPv6 address on load",
      "Country, ASN and network owner for any public IP",
      "Recognizes private and reserved ranges",
      "Names the data provider (ipinfo.io) and degrades gracefully when it isn't configured",
    ],
    indexable: true,
    updated: UPDATED,
    priority: 1,
  },
];
