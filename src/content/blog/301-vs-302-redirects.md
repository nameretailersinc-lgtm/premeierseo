---
{
  "title": "301 vs 302 Redirects: Which to Use and How to Check Them",
  "metaTitle": "301 vs 302 Redirects and How to Check Them",
  "metaDescription": "When to use a 301 or a 302, how Google treats each, and how to check for a 301 redirect, long chains and loops before and after you move your website pages.",
  "excerpt": "Choose the redirect that matches your intention, then verify every hop, including after an HTTPS or URL change.",
  "category": "Technical SEO",
  "focusKeyword": "check for 301 redirect",
  "secondaryKeywords": ["301 redirect checker", "check website for redirects"],
  "tags": ["redirects", "site migration", "https"],
  "relatedTools": ["redirect-checker", "http-status-checker", "htaccess-redirect-generator", "canonical-url-generator"],
  "cover": { "headline": "301 or 302?", "motif": "redirect" },
  "coverAlt": "Illustration comparing a permanent 301 redirect with a temporary 302 redirect",
  "faqs": [
    { "q": "How long should I keep a 301 redirect?", "a": "Google advises keeping redirects for as long as possible, generally at least one year. For visitors with old links, keeping them indefinitely is better still." },
    { "q": "Should every removed page redirect to the homepage?", "a": "No. Redirect only to a page that genuinely replaces the old one. If there is no replacement, returning 404 or 410 is clearer." }
  ]
}
---
A 301 says a page has moved permanently. A 302 says it is somewhere else for now. Pick the one that matches what you intend, then check for a 301 redirect actually behaving that way.

## What each code tells Google

![Diagram comparing how a 301 permanent redirect and a 302 temporary redirect are treated in search results](/blog-images/301-vs-302-redirects-example.jpg "Google's documented treatment of permanent and temporary redirects.")

Google's documentation says permanent redirects show the **new** address in search results, while temporary redirects keep showing the **original** one.

| Status | Meaning | Request method |
| --- | --- | --- |
| 301 | Moved permanently | Clients may change POST to GET |
| 308 | Moved permanently | Method is preserved |
| 302 | Found, temporary | Clients may change POST to GET |
| 307 | Temporary redirect | Method is preserved |

Use 301 or 308 for a changed URL, a merged page or a new domain. Use 302 or 307 for a short-term detour, such as a temporary maintenance page. If a "temporary" move becomes permanent, change the code.

## Prefer server redirects

Set redirects on the server or CDN. Google treats an instant meta refresh as permanent and a delayed one as temporary. It advises JavaScript redirects only when the other methods are not possible, because Google might not see them if rendering fails.

## Check every hop

1. Open the [Redirect Checker](/redirect-checker/).
2. Enter the full old address, including `http://` if you want to test the HTTPS step.
3. Confirm the first status code, each Location value and that the final response is 200.
4. Test several URLs together with bulk mode, up to 20 at a time.

The checker follows HTTP redirects. It does not detect meta refresh or JavaScript redirects, and a site may answer our server differently from your browser.

## Fix chains and loops

A **chain** sends visitors through several addresses, for example HTTP to HTTPS, then to www, then to the new path. Point each old URL directly at the final one. A **loop** returns to an address already visited; look for two rules that undo each other, often between a CDN and the origin server.

## Moving to HTTPS or new URLs

- List old URLs and map each to its closest equivalent. Do not send them all to the homepage.
- Update internal links, canonical tags and sitemaps to the new addresses.
- Install a valid certificate for every hostname that redirects.
- Test after deployment, then watch Search Console for errors.

For server rules, the [.htaccess redirect generator](/htaccess-redirect-generator/) creates Apache directives. Test them on a staging copy first. To control crawling rather than move pages, see [how to create a robots.txt file](/blog/robots-txt-guide/).
