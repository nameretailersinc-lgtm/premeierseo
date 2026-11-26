---
{
  "title": "How to Create a robots.txt File Without Blocking Your Site",
  "metaTitle": "Creating a robots.txt File: A Safe Step-by-Step Guide",
  "metaDescription": "Creating a robots.txt file: write the rules, add your sitemap, test URLs before publishing and learn why robots.txt cannot remove a page from Google.",
  "excerpt": "Write a small robots.txt file, test it before it goes live, and use noindex when the goal is to keep a page out of search results.",
  "category": "Technical SEO",
  "focusKeyword": "creating a robots txt",
  "secondaryKeywords": ["robots txt file generator", "create robots file"],
  "tags": ["robots.txt", "crawling", "noindex"],
  "relatedTools": ["robots-txt-generator", "robots-txt-tester", "xml-sitemap-generator", "http-status-checker"],
  "cover": { "headline": "A safe robots.txt file", "motif": "robots" },
  "coverAlt": "Illustration of a robots.txt file with allow and disallow rules",
  "faqs": [
    { "q": "Does Disallow remove a page from Google?", "a": "No. It limits crawling. A blocked address can still appear in results if other pages link to it. Use noindex or require a password." },
    { "q": "Do small websites need crawl budget tuning?", "a": "Usually not. Google's crawl budget guidance is aimed at very large or rapidly changing sites. Fix errors and duplicate URL traps before writing special rules." }
  ]
}
---
Creating a robots.txt file takes a few lines. The risk is that one wrong line can stop search engines crawling your whole site. This guide keeps the file small and tests it first.

## What robots.txt does

It asks crawlers which addresses they may request. It is public, and it is not access control: anyone can read it, and some bots ignore it. Never use it to protect private information.

## Where it goes

The file must be at the root of the host, such as `https://example.com/robots.txt`. Each subdomain and protocol has its own. Google states it reads up to 500 KiB and ignores content after that.

## A sensible starting file

`User-agent: *` applies rules to all crawlers that have no more specific group.

```
User-agent: *
Disallow: /admin/
Disallow: /cart/

Sitemap: https://example.com/sitemap.xml
```

Replace the paths with your own. An empty `Disallow:` blocks nothing. `Disallow: /` blocks everything, which is a common accident when a staging file is copied to a live site.

## Build and test it

1. Create the rules with the [robots.txt generator](/robots-txt-generator/).
2. Send them to the [robots.txt tester](/robots-txt-tester/).
3. Test important pages, one page that should be blocked, and CSS and JavaScript files.
4. Upload the file, then fetch the live version and check it again.

![The robots.txt generator showing allow and disallow rules and the resulting file](/blog-images/robots-txt-guide-example.jpg "Review the generated file before uploading it to your domain's root.")

Do not block the CSS or JavaScript a page needs to render.

## noindex is not the same as Disallow

| Goal | Use |
| --- | --- |
| Reduce crawling of unimportant URLs | robots.txt Disallow |
| Keep a public page out of search results | `noindex` meta tag or `X-Robots-Tag` header |
| Keep content private | A login or password |
| Remove a deleted page | A 404 or 410 response |

For `noindex` to work, the crawler must be able to fetch the page and see it. If robots.txt blocks the page, Google cannot read the instruction. To remove an indexed page, allow crawling, add `noindex`, and wait for it to be recrawled.

## AI crawlers

Some AI services publish their own user-agent names, so you can write separate rules for them. Check each provider's current documentation, because names and purposes change. Blocking one crawler does not block the others.

## After publishing

- Confirm the file returns 200 at the root.
- Watch the robots.txt report and indexing report in Search Console.
- Keep a copy of the previous version so you can restore it.

If URLs are moving rather than being hidden, use redirects. See [301 vs 302 redirects](/blog/301-vs-302-redirects/).
