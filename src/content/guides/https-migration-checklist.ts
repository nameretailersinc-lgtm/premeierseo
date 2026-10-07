import { defineGuide, toolLink as t } from "./shared";

export const httpsMigrationChecklist = defineGuide({
  slug: "https-migration-checklist",
  title: "Moving a Site to HTTPS: A Migration Checklist",
  h1: "Moving a site to HTTPS",
  metaDescription:
    "A step-by-step HTTPS migration: certificates, one-hop redirects, mixed content, canonical and sitemap updates, HSTS, and what to watch afterwards.",
  summary:
    "An HTTPS migration is a URL change, so it needs the same care as any site move: one **301 per URL to its exact https equivalent**, updated canonicals, sitemaps and internal links, and no mixed content. Google has treated HTTPS as a lightweight ranking signal since 2014, but the real gains are security and the browser features that require a secure context.",
  cluster: "Technical SEO",
  tools: ["redirect-checker", "http-status-checker", "htaccess-redirect-generator", "xml-sitemap-generator"],
  body: [
    {
      heading: "Before you start",
      body: `An HTTPS migration changes every URL on the site. Google treats it as a site move with URL changes, and the same risks apply: lost redirects, chains, and pages that quietly stop being indexed.

Three decisions to make first.

**The certificate.** A domain-validated certificate from a free authority such as Let's Encrypt is cryptographically identical to a paid one for search purposes; Google's guidance only asks for a modern certificate that browsers trust. Decide whether you need a wildcard certificate for subdomains, and set up automated renewal. An expired certificate makes the site unreachable, and a browser interstitial is worse for traffic than almost any ranking change.

**The canonical host.** Migration is the natural moment to settle \`www\` versus bare domain, because you are rewriting the redirect rules anyway. Pick one and make everything else redirect to it in a single hop.

**A full URL inventory.** Export every URL from your sitemap, analytics, Search Console performance report and server logs. The pages that get forgotten in migrations are the ones with no internal links and a few valuable backlinks, which only the log and backlink exports will show you.

Also check in advance that your CDN, payment provider, embedded widgets, ad scripts and any API you call are available over HTTPS. One third-party script that is http-only will either break or downgrade the page.`,
    },
    {
      heading: "The redirect rules",
      body: `This is where migrations are won or lost. Every http URL must redirect with a **301** to the same path on https, in **one hop**, and the host rule and the protocol rule must resolve together rather than chaining.

The chain to avoid:

\`\`\`
http://example.com/page/
  → 301 https://example.com/page/        (protocol rule)
  → 301 https://www.example.com/page/    (host rule)
  → 200
\`\`\`

Two hops for every visitor and every crawl. Written as one rule, on Apache:

\`\`\`
RewriteEngine On
RewriteCond %{HTTPS} off [OR]
RewriteCond %{HTTP_HOST} !^www\\. [NC]
RewriteRule ^(.*)$ https://www.example.com/$1 [R=301,L]
\`\`\`

On nginx, a dedicated server block for the redirect:

\`\`\`
server {
  listen 80;
  server_name example.com www.example.com;
  return 301 https://www.example.com$request_uri;
}
\`\`\`

Three rules worth stating plainly:

1. **Redirect to the equivalent URL**, not the homepage. A blanket redirect to \`/\` destroys the value of every inbound link and is reported as a soft 404.
2. **Keep the redirects permanently.** Old links never fully disappear. Google's site-move guidance suggests keeping redirects for at least a year; indefinitely is better.
3. **Do not redirect in HTML or JavaScript.** Use the server.

The ${t("htaccess-redirect-generator", ".htaccess redirect generator")} writes these rules with the status code set explicitly, and the ${t("redirect-checker", "redirect checker")} is how you verify the hop count afterwards — a one-line answer to the question that matters most here.`,
    },
    {
      heading: "Mixed content and in-page references",
      body: `A page served over HTTPS that loads a subresource over HTTP is **mixed content**. Browsers block active mixed content (scripts, stylesheets, iframes, XHR) outright, and either block or upgrade passive mixed content such as images. The visible symptom is a broken layout or a missing feature, not usually an error message.

What to update:

- **Internal links, image \`src\`, script and stylesheet URLs.** The durable fix is root-relative paths (\`/images/logo.png\`), which work on any protocol and host. Hard-coded absolute http URLs in the database are the usual culprit on CMS sites; a careful search-and-replace over post content and theme options is part of the job.
- **Canonical tags**, which must now point at the https URL. This is the single most important in-page change: a canonical still pointing at http tells Google to prefer the URL you just redirected away from.
- **Open Graph and Twitter card URLs and images**, since social platforms cache them and a stale http \`og:url\` keeps feeding shares to the redirect.
- **hreflang annotations**, which must use fully qualified https URLs.
- **Structured data** URLs, including \`@id\` values and image references.
- **XML sitemaps**, which should list only https URLs. Regenerate rather than edit; an ${t("xml-sitemap-generator", "XML sitemap generator")} produces the file from the new canonical forms.
- **robots.txt**, which is per protocol and host. The https site needs its own, and the \`Sitemap:\` directive inside it must use the https URL.

A useful backstop while you hunt for stragglers is the \`upgrade-insecure-requests\` Content-Security-Policy directive, which asks the browser to fetch http subresources over https instead. It is a safety net, not a substitute for fixing the references, because it does nothing for links and nothing for clients that ignore it.`,
    },
    {
      heading: "Launch, verify, and the weeks after",
      body: `**On launch day**, in this order:

1. Deploy the certificate and confirm the https site serves correctly **before** enabling any redirect.
2. Enable the redirects.
3. Add the https property to Search Console as a separate property, or use a Domain property, which covers both. The http property keeps reporting the old URLs as they decay, which is useful rather than a nuisance.
4. Submit the new sitemap.
5. Do **not** use the Change of Address tool: it is for domain changes, not protocol changes.

**Verify immediately:**

- A sample of URLs from every template returns 200 over https, with one redirect hop from http. Run the old URL list through an ${t("http-status-checker", "HTTP status checker")} to find the exceptions in bulk.
- \`http://example.com/robots.txt\` redirects, and \`https://example.com/robots.txt\` serves the intended file.
- Canonicals, hreflang and sitemaps reference https.
- No console warnings about mixed content on key templates.
- The certificate chain is complete, which is a frequent omission: a certificate that works in a desktop browser can fail on older clients when the intermediate certificate is missing.

**HSTS, once you are confident.** The \`Strict-Transport-Security\` header tells browsers to use https for the domain for a set period, which removes the http round trip entirely. Start with a short \`max-age\` and raise it. Treat \`includeSubDomains\` and preloading with caution, because both are hard to undo quickly: a preloaded domain stays in browser lists until the entry is removed and the new build ships.

**In the weeks after**, expect Search Console to show indexed URLs moving from the http property to the https one gradually, and some ranking fluctuation while Google recrawls. Watch for 404s in the new property (usually a redirect rule that lost a path segment), crawl errors on assets, and old URLs still receiving traffic, which confirms the redirects are still doing work.`,
    },
  ],
  sources: [
    { label: "Google Search Central: Secure your site with HTTPS", url: "https://developers.google.com/search/docs/crawling-indexing/https" },
    { label: "Google Search Central: Site moves with URL changes", url: "https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes" },
    { label: "Google Search Central Blog: HTTPS as a ranking signal", url: "https://developers.google.com/search/blog/2014/08/https-as-ranking-signal" },
    { label: "MDN: Mixed content", url: "https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content" },
    { label: "MDN: Strict-Transport-Security header", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security" },
  ],
});
