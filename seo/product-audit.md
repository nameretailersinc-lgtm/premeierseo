# Product, safety and measurement audit

Audit date: 26 November 2026. Baseline: the repository after blog recovery and AI discovery work (`2a1d1fe`). This document records source inspection; later implementation may resolve findings. It does not assert that every configured tool has passed end-to-end tests.

## Verified inventory and architecture

Evaluating `src/content/tools/index.ts` produced **172 registered tool configurations**, of which **169 are indexable**. The registry specifies 155 browser-local, 13 server and four third-party processing modes. The three deliberately nonindexable routes are `/sentence-rewriter/`, `/backlink-checker/` and `/cross-browser-tester/`. A registry entry and an existing widget establish implementation presence, not correctness for every input; output-level browser checks remain necessary.

Next.js App Router renders tool explanations and metadata on the server or statically. The widget registry loads each tool with `next/dynamic`. PDF libraries are imported inside processing functions; PDF.js uses a worker. Image PNG encoding/tracing has a worker with fallback. Image/PDF canvas rendering has a 16-million-pixel cap, file input defaults to 100 MiB, PDF loops yield to the event loop, and processing offers cancellation. These controls should be preserved and exercised on resource-limited devices rather than replaced with an unsupported performance guarantee.

Root/category/tool canonical routes derive from the registry. The recent blog migration had removed 18 published guides; the preceding recovery preserves their original content, dates and URLs, restores sitemap discovery and makes the populated blog indexable. Validate the deployed response and request Google recrawling through the actual Search Console property. Code changes alone do not establish indexing.

## Findings requiring implementation or verification

| Priority | Evidence and impact | Action and acceptance criterion |
| --- | --- | --- |
| P0 | `safe-fetch.ts` limits bytes received on the wire, then calls synchronous gzip/deflate/Brotli decompression without an output bound. A small compressed payload can expand far beyond the stated response cap. | Bound decompressed output with the same budget and map overflow to `TOO_LARGE`. Test a small gzip payload that expands past the configured budget and a valid compressed page. |
| P0 | `http.request` socket timeout is an inactivity timeout. The source comment calls it a hard timeout, but a slow response can continue sending data before each inactivity limit. Redirects also receive a fresh timeout. | Add an actual elapsed deadline and clean it up on all exit paths. Budget redirects against a documented overall limit. A trickle response should terminate without waiting indefinitely. |
| P1 | `ToolContext` emits `tool_used` and `tool_completed`; completion may also be triggered on copy/download or preview load. These events alone do not provide the requested start/success/action funnel. | Preserve compatibility as needed, but add well-defined `tool_open`, `tool_start`, `tool_success`, `tool_error`, `file_download`, `result_copy`, `related_tool_click` and `category_search`. Document whether success means processing succeeded, not merely that an interaction occurred. |
| P1 | `image-target-size.tsx` stores an unmet target as a completed result with a warning. Batch telemetry counts every row with status `done` as a success and does not distinguish a missed target. | Keep the downloadable best effort and warning, while reporting target attainment explicitly and excluding missed targets from successful target completion. Show actual output size and avoid “saved at or under target” as an unconditional promise. |
| P1 | QR output defaults to a four-module margin, but appearance controls permit zero through three; low contrast/inverted colors are warned about rather than prevented. | Keep at least four blank modules in ordinary exports, retain dark-on-light defaults, and decode generated PNG/SVG fixtures for URL, Unicode text, Wi-Fi, email and vCard before publishing stronger reliability claims. Warnings are useful but are not a scan test. |
| P1 | Tool/category supporting-guide links were removed during the admin-blog conversion. `ToolPage` still filters every contextual `/blog/` link, including restored relevant guides. | Restore links to published relevant articles using the same publication/canonical rules as the blog, without exposing drafts or linking unknown guide slugs. Check all generated links and preserve the main widget above explanations. |
| P2 | `daysInMonth` and `weekday` use `Date.UTC(year, ...)`; JavaScript interprets years 0–99 as 1900–1999. The ordinary date input's minimum of 1000 avoids this, but `parseISODate` accepts years 0001–0099. | Either align the parser's accepted range with the UI or use `setUTCFullYear` consistently. Add leap-century, leap-day, month-end, same-day and future-DOB cases. Do not change the documented 28-Feb birthday convention silently. |
| P2 | PDF reading/rendering rejects damaged/password-required documents and documents rasterization's loss of selectable text. Target compression already returns `reached` and produces a warning when it cannot meet the target. | Preserve this behavior. Test text PDFs, scanned PDFs, encrypted/corrupt files, already-small files and impossible targets. Do not advertise “lossless” for JPEG recompression or page rasterization. |
| P2 | Processing count is mixed: 17 configurations are server or third-party. Some general trust copy describes browser processing broadly. | Derive labels/counts from the verified registry, state server/third-party exceptions near inputs, and use an exact count rather than conflicting hardcoded totals. No “all tools work locally” claim is supportable. |

## Existing preset coverage

Registered image byte presets: 10 KB, 20 KB and 50 KB; JPEG-specific 30 KB, 100 KB and 200 KB; generic 1 MB. Registered PDF byte presets: 50 KB and 100 KB. The custom image-size tool already accepts other KB/MB targets and photo dimensions. A target difference alone does not justify a new indexable page; use the keyword mapping and genuine format/task-specific controls to decide.

The PDF engine accepts `config.targetKB`, so validated PDF 200 KB, 500 KB, 1 MB and 2 MB presets can reuse real target processing. Generic image 100/200 KB presets can reuse the image target engine, with format/transparency and dimension behavior made clear. Do not rename the working JPEG-specific routes when adding or consolidating variants.

PDF-to-text is a feasible distinct capability using PDF.js text content, with an explicit no-OCR limitation. PDF-to-Word/DOCX with faithful layout reconstruction, OCR, reading-order preservation and complex fonts is a larger product; plain extracted text is not an equivalent converter. Logo QR generation needs scannability validation and finder-pattern protection; an image overlay alone is insufficient evidence of reliability.

## SEO data dependencies

| Requested capability | Repository state and honest implementation boundary |
| --- | --- |
| Meta tags, headings, canonical, redirects, HTTP status, robots rules | Live HTML/header inspection and local parsing are implemented. State that static fetching does not execute JavaScript. Respect SSRF, size, rate and time budgets. |
| Website speed / page speed | `/api/pagespeed` calls Google's PageSpeed Insights API, keeps `PAGESPEED_API_KEY` server-side and distinguishes Lighthouse lab values from available CrUX p75 field metrics. Field data can be absent; do not synthesize it or treat one lab test as a p75 measurement. |
| Mobile-friendly check | Existing performance/viewport checks must be described as their actual checks, not the retired official Google Mobile-Friendly Test. A viewport preview is not device-browser compatibility testing. |
| Keyword ideas | The existing generator expands phrasings and explicitly has no search volume, CPC or difficulty provider. Imported Keyword Planner research may inform the site's content strategy; it is not a licensed live keyword-volume service for arbitrary users. |
| Backlinks | The nonindexable verifier checks user-supplied source pages. It does not discover the web's backlinks. Keep this distinct until a licensed backlink index is connected. |
| Domain authority | No licensed Moz Domain Authority integration was established. A third-party provider's Domain Rating or other score must use its actual licensed name; do not relabel it DA. |
| Keyword rank | Requires an authorized SERP/rank provider with location, device and freshness context. Do not substitute random positions or browser personalization. |
| Website traffic | First-party actual analytics require authorization; third-party estimates require a legitimate modeled dataset and must be labeled estimates. No traffic provider was established. |

## Security controls already present

The shared fetcher checks protocols, credentials, allowed ports, literal private IPs and local hostnames; validates DNS results at connection time; revalidates redirect destinations; rejects known IPv4/IPv6 private/reserved ranges; and enforces wire-byte and redirect limits. API guards bound JSON input, rate-limit callers, reject cross-origin requests and use `no-store`/`noindex` response headers. Rate limiting is in-memory and per process: production scale needs a shared or edge enforcement layer and trusted proxy/IP configuration. No external-service credentials should enter browser bundles.

## Validation limits and next checks

Source inspection confirms implementation paths and specific gaps. It does not establish real-user Core Web Vitals, every tool's output accuracy, accessibility on all devices, scanner compatibility, Google indexing or production provider availability. Record browser output fixtures and compare before/after lab measurements; obtain CrUX/Search Console/analytics evidence for field results. Keep uploaded files, text, filenames, private URLs, QR payloads, dates of birth and sensitive financial/medical values out of analytics.
