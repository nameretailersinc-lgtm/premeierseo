# Blog content plan

For the site owner and whoever edits the blog. Updated 26 November 2026. It replaces the earlier plan: at the owner's request, the previous guides were removed and 13 new articles were written around phrases found in the Keyword Planner exports.

## Review before or soon after publishing

The articles are written from how this site's tools behave and from the sources below. **No person has edited them yet**, and the steps were not tried on a physical iPhone, Android phone, Mac or Windows PC. Please have someone:

1. Follow the steps in the phone PDF article and the HEIC article on real devices.
2. Read each article for tone and add first-hand detail where they have it.
3. Add a real author name in `/admin/` only if a real person wants the byline. Otherwise the page credits the team.

## The articles

Each URL, its target phrases and the volume reported by each source are in [blog-keyword-map.csv](blog-keyword-map.csv). Volumes are estimates for single phrases. They are not added together and do not predict traffic.

| Article | URL status | Tool it supports |
| --- | --- | --- |
| Reduce image size in KB for application forms | Rewritten at the same URL | `/reduce-image-size-in-kb/` |
| Reduce PDF file size, keep text readable | Rewritten at the same URL | `/compress-pdf/` |
| JPG vs PNG vs WebP | Rewritten at the same URL | `/png-to-jpg-converter/` |
| 301 vs 302 redirects | Rewritten at the same URL | `/redirect-checker/` |
| Create a robots.txt file | Rewritten at the same URL | `/robots-txt-generator/` |
| Merge PDF files on a phone | New | `/merge-pdf/` |
| Convert images into a PDF | New | `/jpg-to-pdf/` |
| Convert HEIC to JPG | New | `/heic-to-jpg-converter/` |
| QR code for a website | New | `/qr-code-generator/` |
| Calculate age from a date of birth | New | `/age-calculator/` |
| Calculate percentage increase | New | `/percentage-calculator/` |
| Count the words in an essay | New | `/word-counter/` |
| Fix invalid JSON | New | `/json-viewer/` |

## Risk to watch: articles competing with tools

The exports contain no query that starts with "how", "what" or "why", and several of the target phrases are requests to do a task, which a tool page also answers. Each headline is therefore written as an explanation and each article links to its tool. After four weeks, check Search Console for each pair. If an article and its tool split impressions for the same query, retitle the article, or merge it into the tool page and redirect it. Watch the age, percentage and JSON pairs first.

## Earlier guide URLs

The live site had 18 guides in its sitemap. Their traffic and rankings were not available. **Export 90 days of Search Console data for `/blog/` before deploying**, so you can compare afterwards.

| Earlier URL under `/blog/` | Now |
| --- | --- |
| `reduce-photo-size-in-kb`, `reduce-pdf-file-size`, `jpg-vs-png-vs-webp`, `301-vs-302-redirects`, `robots-txt-guide` | New article, same URL |
| `how-many-pages-is-1000-words` | 301 to the essay word count article |
| `noindex-vs-robots-txt`, `crawl-budget-explained` | 301 to the robots.txt article |
| `https-migration-checklist` | 301 to the redirects article |
| `character-limits-cheat-sheet` | 301 to `/character-counter/` |
| `write-title-tags-meta-descriptions` | 301 to `/serp-simulator/` |
| `canonical-tags-explained`, `duplicate-content-explained` | 301 to `/canonical-url-generator/` |
| `hreflang-guide` | 301 to `/hreflang-tags-generator/` |
| `http-status-codes-seo` | 301 to `/http-status-checker/` |
| `xml-sitemaps-explained` | 301 to `/xml-sitemap-generator/` |
| `google-indexing-troubleshooting`, `javascript-seo-basics` | 410 (no genuine replacement) |

Redirects to a tool page are weaker than a like-for-like article, and Google may treat a loose match as a soft 404. If one of those old URLs had real traffic, write a replacement article for it instead. The rules are in `src/seo/migration.json`, and they apply even if a post is republished at one of those URLs.

The earlier text is kept in `src/content/legacy-blog.json`. With MongoDB, the one-time migration replaces or drafts a guide only if nobody edited it; it deletes nothing.

## Editing and adding articles

1. Edit or add a Markdown file in `src/content/blog/` (the JSON block at the top holds the title, metadata, keywords and FAQs).
2. For a changed article, add `"updated": "YYYY-MM-DDT00:00:00.000Z"` to that block with the real edit date.
3. Run `node scripts/build-blog-images.mjs` for covers. Add a server address to retake tool screenshots.
4. Run `node --import tsx scripts/build-blog-seed.mjs`. It needs `seo/keyword-page-mapping.csv`, which is generated locally and not committed.

On a server with MongoDB the migration runs **once**. Later changes to these files do not update the database; make those edits in `/admin/`.

## Sources used

- [Google: Redirects and Google Search](https://developers.google.com/search/docs/crawling-indexing/301-redirects)
- [Google: Site moves with URL changes](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes)
- [Google: robots.txt introduction](https://developers.google.com/search/docs/crawling-indexing/robots/intro) and [how Google reads robots.txt](https://developers.google.com/search/reference/robots_txt)
- [Apple: HEIF and HEVC media](https://support.apple.com/en-us/116944)
- [Apple: Convert image file types in Preview](https://support.apple.com/guide/preview/convert-image-file-types-prvw1012/mac)

The Windows HEIC statement is deliberately general: no current official Microsoft page was confirmed.
