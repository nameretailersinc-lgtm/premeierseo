import { defineGuide, toolLink as t } from "./shared";

export const redirects301vs302 = defineGuide({
  slug: "301-vs-302-redirects",
  title: "301 vs 302 Redirects: Which to Use and When",
  h1: "301 vs 302 redirects",
  metaDescription:
    "The difference between 301, 302, 307 and 308 redirects, how search engines treat each, when a temporary redirect is right, and how to avoid chains.",
  summary:
    "Use a **301** (or **308**) when a URL has moved for good: Google treats it as a strong signal that the new URL should be indexed instead of the old one. Use a **302** (or **307**) when the move is temporary and the original URL should stay in search results, as in an A/B test. In every case, redirect straight to the final URL in one hop.",
  cluster: "Technical SEO",
  tools: ["redirect-checker", "htaccess-redirect-generator", "http-status-checker", "htaccess-tester"],
  body: [
    {
      heading: "The four redirect codes",
      body: `HTTP defines several redirect status codes in RFC 9110. Four matter for moving pages; they differ on two questions: is the move permanent, and may the browser change a POST request into a GET?

| Code | Name | Permanent | Request method kept | Typical use |
|---|---|---|---|---|
| 301 | Moved Permanently | Yes | Not guaranteed: clients may switch POST to GET | Page or site moved for good |
| 302 | Found | No | Not guaranteed | Short-term moves, tests, login hand-offs |
| 307 | Temporary Redirect | No | Yes | Temporary moves where forms or APIs POST to the URL |
| 308 | Permanent Redirect | Yes | Yes | Permanent moves of URLs that receive POST requests |

For ordinary pages that people visit with GET, 301 and 308 behave the same, as do 302 and 307. The method rule matters for form endpoints and APIs: a 301 on a URL that receives a POST may arrive at the destination as a GET with the form data dropped. A fifth code, 303 See Other, is the deliberate "now GET this page" response after a form submission.

One practical difference: browsers may cache a 301 or 308 without being told to, so a mistaken permanent redirect can keep sending visitors to the wrong place after you fix the server. Test new rules with a 302, or send \`Cache-Control: no-store\` with the 301, and switch once you are sure.`,
    },
    {
      heading: "How search engines treat them",
      body: `Google's documentation describes the difference as a canonicalization signal:

- **301 and 308:** Googlebot follows the redirect, and the indexing pipeline uses it as a strong signal that the target should be the canonical URL, the one shown in results.
- **302, 303 and 307:** Googlebot follows the redirect, but it is only a weak signal for the target. The original URL usually stays indexed, though the target can still be chosen if other signals point to it.

**Does a 302 pass link value?** Google's documentation doesn't describe either type as losing value. What it describes is which URL ends up canonical, and that is where links and other signals are consolidated. With a 302, that is usually the old URL; with a 301, the new one. So if you want the new address to rank, use a permanent redirect.

When temporary is the right choice:

- **A/B and multivariate tests.** Google's testing guidance explicitly says to use a 302, not a 301, and to remove the test when it ends.
- **Short-lived swaps:** a seasonal page standing in for a product that will return, or a campaign URL that forwards to a page that will change.
- **Login and session flows,** where the destination depends on the visitor.

For planned downtime, a redirect is the wrong tool: return 503 Service Unavailable so crawlers come back later instead of following a redirect.`,
    },
    {
      heading: "Site migrations and URL changes",
      body: `For a domain move, an HTTPS switch or a new URL structure:

1. **Map every old URL to its closest new equivalent,** one-to-one. Export old URLs from your sitemap, analytics and server logs so pages with backlinks aren't missed.
2. **Use server-side permanent redirects** (301 or 308). Google's site-move guide recommends them over other methods.
3. **Update everything that points to old URLs:** internal links, canonical tags, hreflang, XML sitemaps and structured data should all use the new URLs, so the redirect is only needed for outside links and bookmarks.
4. **Keep the redirects for as long as possible,** in Google's words "generally at least 1 year". Many sites keep them indefinitely, since old links never fully disappear.
5. **Don't send everything to the homepage.** A page with no equivalent should return 404 or 410; a redirect to an unrelated page helps nobody find what they were looking for.

On Apache, the ${t("htaccess-redirect-generator", ".htaccess redirect generator")} writes these rules in the right order. Two hand-written examples:

\`\`\`
# One page (RedirectMatch anchors the whole path)
RedirectMatch 301 ^/old-page/$ https://www.example.com/new-page/

# Whole domain to a new one, keeping each path
RewriteEngine On
RewriteCond %{HTTP_HOST} ^(www\\.)?old-example\\.com$ [NC]
RewriteRule ^(.*)$ https://www.example.com/$1 [R=301,L]
\`\`\`

A common Apache pitfall: the simpler \`Redirect 301 /old-page/ …\` matches by prefix, so it also redirects /old-page/anything-else. On nginx, use \`return 301\` inside an exact-match location: \`location = /old-page/ { return 301 https://www.example.com/new-page/; }\`. To try rules against sample URLs before uploading them, use the ${t("htaccess-tester", ".htaccess tester")}.`,
    },
    {
      heading: "Redirect chains and loops",
      body: `A chain is a redirect that lands on another redirect. Google's crawlers follow up to 10 hops, but its site-move guide advises redirecting "to the final destination directly", and otherwise keeping chains short: "ideally no more than 3 and fewer than 5". Every hop also adds a round trip for visitors on slow connections.

Chains usually build up from separate rules that each do one job:

\`\`\`
http://example.com/blog/post
  → 301 https://example.com/blog/post        (HTTPS rule)
  → 301 https://www.example.com/blog/post    (www rule)
  → 301 https://www.example.com/blog/post/   (trailing-slash rule)
  → 200
\`\`\`

The fix is to make each rule redirect straight to the final form (HTTPS, preferred host and trailing slash in one go), and to point old migration redirects at the current URL rather than at an address that now redirects again.

A **loop** is a chain that never ends: two rules undo each other, for example a server adding a trailing slash while the CMS strips it, or an HTTPS redirect behind a CDN that talks to the origin over plain HTTP. Browsers stop with an error such as "too many redirects", and crawlers give up.

**Is a meta refresh a redirect?** Yes, a client-side one. Google treats an instant \`<meta http-equiv="refresh" content="0; url=…">\` as a permanent redirect and a delayed one as temporary. Use it only when you can't configure the server; JavaScript redirects are a last resort, because they only work if the page is rendered. Timed refreshes are also an accessibility problem: WCAG lists a refresh users can't control as a failure.`,
    },
    {
      heading: "Checking your redirects",
      body: `After any change, check the old URLs, not just the new ones. For each, you want exactly one redirect, with the intended status code, to a final URL that returns 200, isn't blocked by robots.txt or noindex, and has a canonical tag pointing to itself.

From a terminal, curl shows every hop:

\`\`\`
curl -sIL http://example.com/old-page | grep -iE "^(HTTP|location)"
\`\`\`

Without the command line, the ${t("redirect-checker", "redirect checker")} lists each hop with its status code and Location header, which makes chains and the wrong code (a 302 where you meant 301) easy to spot. For a list of URLs, such as the old URLs from a migration map, an ${t("http-status-checker", "HTTP status checker")} reports the status of each in one pass.

Then keep watching: Search Console's Page indexing report shows "Page with redirect" for URLs Google has seen redirecting, and server logs show which old URLs still get traffic, which tells you the redirects are still earning their keep.`,
    },
  ],
  sources: [
    { label: "RFC 9110: HTTP Semantics, section 15.4 Redirection 3xx", url: "https://www.rfc-editor.org/rfc/rfc9110.html#name-redirection-3xx" },
    { label: "Google Search Central: Redirects and Google Search", url: "https://developers.google.com/search/docs/crawling-indexing/301-redirects" },
    { label: "Google Search Central: Site moves with URL changes", url: "https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes" },
    { label: "Google Search Central: How HTTP status codes and network errors affect Google Search", url: "https://developers.google.com/search/docs/crawling-indexing/http-network-errors" },
    { label: "Google Search Central: Minimize A/B testing impact in Google Search", url: "https://developers.google.com/search/docs/crawling-indexing/website-testing" },
    { label: "Apache HTTP Server: mod_alias (Redirect, RedirectMatch)", url: "https://httpd.apache.org/docs/2.4/mod/mod_alias.html" },
    { label: "nginx: ngx_http_rewrite_module (return)", url: "https://nginx.org/en/docs/http/ngx_http_rewrite_module.html#return" },
    { label: "W3C WCAG 2.2 Technique F41: Failure due to using meta refresh to reload or redirect", url: "https://www.w3.org/WAI/WCAG22/Techniques/failures/F41" },
  ],
});
