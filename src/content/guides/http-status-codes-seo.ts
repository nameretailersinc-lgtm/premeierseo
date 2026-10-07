import { defineGuide, toolLink as t } from "./shared";

export const httpStatusCodesForSeo = defineGuide({
  slug: "http-status-codes-seo",
  title: "HTTP Status Codes for SEO: What Each One Tells Google",
  h1: "HTTP status codes for SEO",
  metaDescription:
    "The status codes that change how Google crawls and indexes a page: 200, 301, 302, 304, 404, 410, 429, 500 and 503, and what each does to indexing.",
  summary:
    "Google only indexes content served with a **2xx** status. Redirects move indexing signals, **404 and 410** drop the URL (410 slightly sooner), and **5xx and 429** make Googlebot slow down and come back later. The two codes to avoid are a 200 on an error page and a 5xx that lasts for days.",
  cluster: "Technical SEO",
  tools: ["http-status-checker", "redirect-checker", "website-uptime-checker", "htaccess-redirect-generator"],
  body: [
    {
      heading: "Why the status code matters more than the page",
      body: `Every HTTP response starts with a three-digit code defined in RFC 9110. Googlebot reads that code before the HTML and uses it to decide whether to index the content, follow a redirect, drop the URL or retry later. A page can look perfect in a browser and still be invisible, because the server returned the wrong number.

Google's documentation on how status codes affect Search groups the behaviour into five cases:

| Family | Meaning | Effect on indexing |
|---|---|---|
| 2xx | Success | Content is considered for indexing |
| 3xx | Redirection | Signals move toward the target |
| 4xx | Client error | URL is dropped from the index |
| 5xx | Server error | Crawling slows; URL eventually dropped |
| 429 | Too many requests | Crawling slows; handled like a 5xx |

The practical consequence: diagnosing an indexing problem starts with the status code, not the content. Check the code for the exact URL in your sitemap, with the trailing slash if that is the canonical form. The ${t("http-status-checker", "HTTP status checker")} reports the code for a list of URLs in one pass, which is how you find the handful of pages in a sitemap that quietly stopped returning 200.`,
    },
    {
      heading: "Success and redirect codes",
      body: `**200 OK.** The normal response. Google indexes what it finds, subject to robots directives.

**204 No Content.** Success with no body, so nothing to index.

**304 Not Modified.** The answer to a conditional request when the page has not changed since Googlebot's last visit. Google keeps the copy it already has, which saves your bandwidth and its crawl capacity. Correct \`ETag\` or \`Last-Modified\` headers make this work; serving a 304 for a page that *has* changed means your update is never seen.

**301 Moved Permanently and 308 Permanent Redirect.** A strong signal that the target should be canonical. The code for a moved page, a changed URL structure or an HTTPS migration.

**302 Found and 307 Temporary Redirect.** A weak signal; the original URL usually stays indexed. Correct for A/B tests, seasonal stand-ins and login flows.

**303 See Other.** The deliberate "now GET this page" response after a form submission. Rare on content URLs.

The difference between 301/302 and 308/307 is whether the request method is preserved: 307 and 308 guarantee a POST stays a POST. For pages people reach with GET, 301 and 308 behave the same. Our guide on [301 vs 302 redirects](/blog/301-vs-302-redirects/) covers the choice in depth, and the ${t("redirect-checker", "redirect checker")} lists every hop, so you see the code the server really sends rather than the one you intended.`,
    },
    {
      heading: "Missing pages: 404, 410 and soft 404s",
      body: `**404 Not Found** means the URL does not exist. Google retries it a few times, then removes it from the index. Having 404s is normal: Google has said repeatedly that they do not damage the rest of a site.

**410 Gone** means the URL is deliberately and permanently removed. Google treats it much like a 404 but may drop the URL a little sooner, which is useful after retiring a large section.

**The soft 404** is the dangerous case: a page that says "not found" or "no results" in its text while returning 200. Google detects many of them and reports "Soft 404" in Search Console, but it has to infer the problem, and the URL can sit in the index as a thin page meanwhile. Soft 404s come from:

- JavaScript routers that render an error view without changing the status code;
- CMS templates that serve an empty category or an empty search result as a success;
- a catch-all rule that redirects every missing URL to the homepage, which Google also classifies as a soft 404.

The rule is simple. If the content a visitor asked for does not exist, return 404 or 410 and show a useful page with search and links. Redirect only where a specific replacement exists; for a retired URL with inbound links and a genuine successor, a 301 beats both.`,
    },
    {
      heading: "Server errors, rate limits and planned downtime",
      body: `**500, 502 and 503** tell Googlebot something is broken. Google's documented response is to slow its crawl rate, retry, and eventually remove persistently failing URLs from the index. A short outage is harmless. Days of 5xx responses cost indexing, and recovery is not instant, because crawl rate has to build back up.

**429 Too Many Requests** is handled the same way. If a rate limiter or WAF counts Googlebot as abusive traffic, you are asking Google to crawl less. Confirm that a client claiming to be Googlebot really is one, by reverse DNS, before throttling it.

**503 Service Unavailable is the right code for planned downtime.** It says "come back later" instead of "this is gone". Send a \`Retry-After\` header with the expected duration. During a maintenance window, return 503 for the whole site rather than redirecting everything to a holding page, which looks like a permanent change to a temporary state.

Two habits catch most of this early. A ${t("website-uptime-checker", "website uptime checker")} tells you whether the site answers at all, and repeated status checks on a short list of important URLs catch the subtler failures, such as one category template starting to return 500. Search Console's Crawl stats report shows the status-code mix Googlebot actually received, which is the record that settles arguments with a hosting provider.

When you do add redirect rules on Apache, the ${t("htaccess-redirect-generator", ".htaccess redirect generator")} writes the directive with the status code set explicitly, which avoids the default 302 that some hand-written rewrite rules produce.`,
    },
  ],
  sources: [
    { label: "RFC 9110: HTTP Semantics, status codes", url: "https://www.rfc-editor.org/rfc/rfc9110.html#name-status-codes" },
    { label: "Google Search Central: How HTTP status codes and network errors affect Google Search", url: "https://developers.google.com/search/docs/crawling-indexing/http-network-errors" },
    { label: "Google Search Central: Verifying Googlebot and other Google crawlers", url: "https://developers.google.com/search/docs/crawling-indexing/verifying-googlebot" },
    { label: "Google Search Central: Redirects and Google Search", url: "https://developers.google.com/search/docs/crawling-indexing/301-redirects" },
    { label: "Google Search Central: Crawl stats report", url: "https://support.google.com/webmasters/answer/9679690" },
  ],
});
