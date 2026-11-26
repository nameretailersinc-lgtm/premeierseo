# Implementation report and roadmap

For the site owner. 26 November 2026. **Nothing here is deployed.** The changes are uncommitted in the local repository.

## What is done

| Area | Result |
| --- | --- |
| Keyword research | All 46,678 rows processed, each with a disposition; source metrics kept separate. Rules in [keyword-analysis-summary.md](keyword-analysis-summary.md) |
| Registry | 178 tools, 175 indexable. 3 limited tools stay `noindex`. Public counts come from the registry |
| New tool pages | APY, body fat, PDF to text, PDF to 200KB, PDF to 1MB, 3000×3000 image converter |
| Added to existing tools | Center logo for QR codes; target-size mode with 100KB–2MB buttons in Compress PDF; 600×600 and 300×300 resize presets |
| Blog | 18 earlier guides replaced by 13 keyword-based articles, each with a cover and an in-article image. Details in [content-plan.md](content-plan.md) |
| Homepage | New title and H1; age calculator and QR generator in the first row; calculators and generators section |
| Fixes | Decompressed-size cap and overall time limit on the server fetcher; QR quiet zone; early-year date handling; duplicate tool aliases; guide links; keyboard access to scrolling tables |
| Analytics | The eight requested events, with an allow-list so typed text, URLs and file names are not sent. Nothing is sent unless `NEXT_PUBLIC_GA_ID` is set |

Titles and descriptions of the existing priority tool pages were already unique and specific, so most were left alone. Change them when Search Console shows a reason.

## Verification

| Check | Result |
| --- | --- |
| Type check and production build | Pass |
| Lint | No errors (warnings only) |
| Content validation | No errors. 7 warnings: tool content names guides not yet written, and no link is shown |
| SEO, security and blog migration tests | Pass |
| Engine output tests | 23 of 23 ([functionality-verification.md](functionality-verification.md)) |
| Real browser tool tests | 17 of 17, in headless Chrome with made-up files |
| Phone width, light and dark, with automated accessibility rules | 36 of 36 page checks with no overflow or violations |
| Crawl of the local production build | 205 sitemap URLs, no errors; no orphans; all within 2 clicks of the homepage ([crawl-audit.md](crawl-audit.md)) |

**Not verified:** other browsers, physical phones, phone-camera QR scanning, HEIC conversion output, the live PageSpeed API, MongoDB itself (the migration was tested against an in-memory stand-in), analytics in a real property, and real-user Core Web Vitals. The local load timings are not field data. No before-and-after performance baseline was recorded. About 195 KB of compressed JavaScript loads on tool pages; PDF, HEIC, Word and QR libraries are not part of it. The crawl audit also estimates that many meta descriptions are long enough to be cut on desktop.

## Not built, and why

| Request | Reason |
| --- | --- |
| PDF to Word / DOCX (500,000 in the PDF export) | Needs layout reconstruction. Plain text extraction is not equivalent. Largest open opportunity; evaluate a server library or a licensed API |
| Domain authority checker | Needs a licensed metric and its real provider name |
| Keyword rank and keyword volume checkers | Need a licensed search-results or keyword data provider |
| Website traffic checker | Needs authorized analytics or a labeled estimate provider |
| Backlink discovery | Needs a backlink index. The current page only checks pages you supply and stays `noindex` |
| Extra size and QR landing pages | Handled by presets and modes inside existing tools, to avoid near-duplicate pages |
| Passport photo page | Needs checked, country-specific specifications |

## Keyword work still open

14,267 rows remain in manual review, many of them misspellings or ambiguous phrases. The classification is rule-based; not every query was read by a person. Candidates seen in that queue include GIF resizing and compression and WebP compression. The exports do not state geographic targeting, and no organic difficulty data was available.

## Deployment checklist

1. Export 90 days of Search Console data, especially `/blog/` URLs.
2. Back up the MongoDB blog collections. The first blog request after deployment runs a one-time migration.
3. Review the 13 articles.
4. Set what you use: `MONGODB_URI`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `PAGESPEED_API_KEY`, `IPINFO_TOKEN`, `REPORT_WEBHOOK_URL`. The `NEXT_PUBLIC_*` values are build arguments.
5. Deploy, then run `node scripts/seo-crawl-audit.mjs <staging address>`.
6. Open several earlier blog URLs and confirm the 301 and 410 responses.
7. In `/admin/`, check that the new articles are published and that any guide you had edited looks right.
8. In Search Console, resubmit the sitemap and use URL Inspection to request indexing of the main new URLs.

A page that allows indexing is only eligible. Google decides whether and when to index it.

Rate limiting is held in memory per server process. With more than one instance, enforce limits at the proxy or edge.

## Repository notes

- `admin-blog.patch`, `admin-blog-mongodb.patch` and Search Console exports under `docs/reaudit-2026-11-05/` are already committed. Ignore rules do not affect them. Decide whether they belong in the repository.
- Large generated keyword files and raw keyword exports are now ignored.

## Roadmap

| When | Work | Decide using |
| --- | --- | --- |
| Week 0 | Deploy with the checklist; set up Search Console and analytics | — |
| Weeks 1–4 | Weekly review in [monitoring-framework.md](monitoring-framework.md); establish baselines; watch old blog redirects | Coverage and 404 reports |
| Weeks 2–4 | Real-device pass for the priority tools and the two device articles | Test notes |
| Month 2 | Compare each article with its tool for split impressions; tighten long descriptions on pages with impressions | Query-by-page export |
| Month 2–3 | PDF to Word feasibility; GIF and WebP compression | Demand, quality tests, cost |
| Month 3 onward | Choose data providers only if their cost is justified; new articles only for queries current pages do not answer | Search Console, provider pricing |
