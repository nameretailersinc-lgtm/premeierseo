# Crawl audit of the production build

Run: 2026-11-26T15:23:04.257Z. Reproduce with `node scripts/seo-crawl-audit.mjs <server>` against `next start`.

| Check | Result |
| --- | --- |
| Sitemap URLs | 205 |
| Pages inspected (200) | 205 |
| Distinct internal link targets | 207 |
| Click depth from the homepage | 0: 1, 1: 48, 2: 156 |
| Blog articles in the sitemap | 13 |
| Distinct images that were loaded | 139 |
| Earlier guide URLs | 5 rewritten in place, 11 redirected (301), 2 removed (410) |
| Errors | 0 |
| Warnings | 0 |

## JavaScript referenced by the HTML

Gzip sizes are computed locally; production compression may differ. This is a lab measure of transfer weight, not Core Web Vitals.

| Page | Files | Raw KB | Gzip KB |
| --- | --- | --- | --- |
| `/` | 10 | 609 | 190 |
| `/tools/` | 11 | 612 | 192 |
| `/pdf-tools/` | 11 | 627 | 195 |
| `/word-counter/` | 11 | 627 | 195 |
| `/image-compressor/` | 11 | 627 | 195 |
| `/merge-pdf/` | 11 | 627 | 195 |
| `/qr-code-generator/` | 11 | 627 | 195 |
| `/json-viewer/` | 11 | 627 | 195 |
| `/age-calculator/` | 11 | 627 | 195 |
| `/apy-calculator/` | 11 | 627 | 195 |

Processing libraries found in initial scripts: none of pdf-lib, PDF.js, heic2any, mammoth or qrcode-generator (checked by library-specific strings).

## Estimated snippet widths

Measured in Arial at 20 px (titles, about 600 px) and 14 px (descriptions, about 920 px over two lines). Text past these widths is likely to be cut on desktop. Google may rewrite either field.

- Titles estimated over 600 px: 0
- Descriptions estimated over 920 px: 88 (`/binary-tools/`, `/traffic-performance-tools/`, `/free-seo-tools/`, `/development-tools/`, `/`, `/other-tools/`, `/pdf-tools/`, `/remove-duplicate-lines/`, `/remove-duplicate-words/`, `/remove-punctuation/`, `/add-repeats-tool/`, `/rot13-caesar-cipher/`, `/morse-code-translator/`, `/uppercase-to-lowercase/`, `/small-text-generator/`)

## Linked pages that are not in the sitemap

- `/tool-complain/`
- `/write-for-us/`

## Errors

None.

## Warnings

None.
