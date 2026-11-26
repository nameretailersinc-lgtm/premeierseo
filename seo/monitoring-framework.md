# Weekly monitoring framework

For the person who reviews search performance and tool health each week. It needs access to Google Search Console, the analytics property and the hosting logs. **No baseline exists yet:** none of these data sources was available while this was written, so the first four weeks establish normal ranges. Do not set traffic targets before then.

## One-time setup

| Step | How | Done when |
| --- | --- | --- |
| Verify the domain in Search Console | DNS verification, or set `NEXT_PUBLIC_GSC_VERIFICATION` at build time | The property reports data |
| Submit the sitemap | `https://premierseoservices.com/sitemap.xml` | Search Console reads it without errors |
| Verify in Bing Webmaster Tools | Set `NEXT_PUBLIC_BING_VERIFICATION` | Site verified |
| Turn on analytics | Set `NEXT_PUBLIC_GA_ID` at build time. Without it, nothing is loaded or sent | `tool_open` appears in GA4 DebugView |
| Register custom dimensions in GA4 | `tool_id`, `action`, `error_code`, `stage`, `input_method`, `to`, `position`, `results_count`, `query_length`, `reached` | Reports can be split by tool |
| Mark releases | Note the date of every deployment in the weekly log | A change can be matched to a release |

All three `NEXT_PUBLIC_*` values are Docker build arguments, so changing one requires a rebuild.

## Event definitions

The site honors Global Privacy Control and Do Not Track, so analytics undercounts real use. Events carry only the dimensions listed in `src/lib/analytics.ts`; unknown keys and values that look like URLs or email addresses are dropped. File names, file contents, typed text, search text, QR contents, dates of birth and calculator inputs are never sent. Keep it that way when adding events.

| Event | Fires when | Read it as |
| --- | --- | --- |
| `tool_open` | A tool page mounts | Tool visits |
| `tool_start` | First interaction on that visit | The visitor tried the tool |
| `tool_success` | First successful result on that visit | The task worked at least once |
| `tool_error` | An error, including a missed size target (`TARGET_NOT_REACHED`) | Failure or limit reached |
| `file_download` | A result or ZIP is downloaded | The output was taken |
| `result_copy` | A result is copied | The output was taken |
| `related_tool_click` | A related-tool link is clicked (`tool_id` to `to`) | Whether the internal links are useful |
| `category_search` | A filter is used on a category or the all-tools page (length bucket and result count only) | `results_count = 0` suggests a missing tool or alias |

The older `tool_used` and `tool_completed` events still fire so existing reports keep working. Use the new names for new reports, and do not add the two sets together.

**Start rate** = `tool_start` ÷ `tool_open`. **Completion rate** = `tool_success` ÷ `tool_start`. Calculators and live text tools count a result as soon as it appears, so compare a tool with its own history, not with file converters.

## Weekly review (about 45 minutes)

Compare the last 7 complete days with the previous 7 and with the 28-day average. Search Console data lags by about two to three days.

| # | Check | Source | Investigate when (starting rule, tune after four weeks) |
| --- | --- | --- | --- |
| 1 | Organic clicks, impressions, CTR, average position | Search Console, Performance | Clicks or impressions fall more than 20% against the 28-day average |
| 2 | Top queries | Search Console, Queries | A query gains impressions but its CTR is far below others at a similar position |
| 3 | Top pages | Search Console, Pages | A priority page loses more than 30% of clicks |
| 4 | Indexed pages | Search Console, Page indexing | Indexed count drops, or a sitemap URL is "Crawled – currently not indexed" for four weeks |
| 5 | Country and device split | Search Console, Countries and Devices | One country or device moves differently from the rest |
| 6 | Tool usage and completion | GA4 events by `tool_id` | Completion rate falls more than 10 points |
| 7 | Tool errors | GA4 `tool_error` by `tool_id` and `error_code` | A new code appears, or one tool's error count doubles |
| 8 | Crawl errors | Search Console, Crawl stats and Page indexing; server logs | New 5xx or 404 URLs that are linked or were indexed |
| 9 | Core Web Vitals (75th percentile) | Search Console report or CrUX | LCP over 2.5 s, INP over 200 ms or CLS over 0.1. With too little traffic there is no field data; say so instead of substituting a lab result |
| 10 | Cannibalization | Search Console query × page export | Two URLs split impressions for the same query for two or more weeks |
| 11 | New keyword opportunities | Search Console queries with impressions and no matching page | A distinct task repeats for two or more weeks |
| 12 | Provider quotas | Google Cloud console (PageSpeed API), host logs | Quota above 80%, or rate-limit errors |

### Handling a cannibalization signal

Registry-level overlaps are listed in [keyword-cannibalization-report.csv](keyword-cannibalization-report.csv). They are intent overlaps, not proof that Google is splitting rankings. Before changing anything, confirm it in Search Console. Then, in this order: separate the two pages' titles and copy by task; link the weaker page to the stronger one; merge with a 301 redirect in `src/seo/migration.json` only if the two pages do the same job. Do not delete an indexed URL without a redirect.

## Monthly and per release

- Re-export Keyword Planner data when it is more than three months old and rerun the pipeline (commands in [keyword-analysis-summary.md](keyword-analysis-summary.md)). Record the geographic targeting chosen for each export; the November 2026 files do not include it.
- Work through 100 rows of the manual-review queue, highest volume first.
- Before each deployment: `npm run typecheck`, `npm run validate`, `npm run test:seo`, `node scripts/seo-engine-verification.mjs`.
- Against a production build: `node scripts/seo-crawl-audit.mjs <url>` and `node scripts/seo-tool-e2e.mjs <url>`.
- After deployment: spot-check the sitemap, `robots.txt`, one redirect, and URL Inspection on any new page.

## Weekly log template

| Week ending | Release | Clicks | Impressions | CTR | Avg. position | Indexed | Completion rate (top 10 tools) | CWV status | Actions |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | | | |
