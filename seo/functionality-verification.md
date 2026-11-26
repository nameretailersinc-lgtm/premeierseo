# Processing-engine verification

Run date: 2026-11-26. Reproduce: `node scripts/seo-engine-verification.mjs`.

Result: **23/23 checks passed**; 0 failed. Raw results: [functionality-results.json](functionality-results.json). Tests use synthetic, nonprivate inputs and do not call production APIs.

| Area | Check | Result | Evidence / failure |
| --- | --- | --- | --- |
| Age | Leap-year parsing and invalid dates | PASS |  |
| Age | Same-day, leap-day anniversary and month end | PASS |  |
| Age | Leap-day totals, birthday and future-DOB comparison | PASS |  |
| Age | Early-year parser range consistency | PASS |  |
| Calculators | Percentage and reverse-percentage edge cases | PASS |  |
| Calculators | Discount, inclusive tax and zero-interest loan | PASS |  |
| Image target | Decimal/binary byte units and physical dimensions | PASS |  |
| Image target | Impossible JPEG target reports failure without resizing | PASS |  |
| Image target | PNG palette search reports an unmet target honestly | PASS |  |
| Image target | Cancellation interrupts encoding | PASS |  |
| Image target | Actual JPEG fixture reaches 5 KB with aspect ratio | PASS | 4912 bytes; 126 x 94; native canvas JPEG codec, not browser codec |
| JSON | Exact large integer, Unicode and exponent formatting | PASS |  |
| JSON | Invalid JSON gets line/column, duplicates are reported | PASS |  |
| JSON | Special keys preserve own properties without prototype changes | PASS |  |
| Encoding | Unicode Base64 round trip, URL-safe variant and invalid input | PASS |  |
| Encoding | UTF-8 binary round trip and ASCII rejection | PASS |  |
| QR | Escaping, units and static payloads | PASS |  |
| QR | Six real codes decode through independent OpenCV scanner | PASS | URL, Unicode text, escaped Wi-Fi, email, phone, vCard; default black/white, M correction, four-module margin |
| QR | Codes with the largest allowed logo still decode | PASS | 18/18 decoded with level H and a solid logo at the 22% cap (square and wide) |
| PDF | Actual PDF open, page selection, merge and reopen | PASS |  |
| PDF | Optimizer preserves pages and selectable text content | PASS | 1715 -> 1081 bytes; page text operator retained |
| PDF | Empty, non-PDF and damaged files rejected | PASS |  |
| PDF | Password-protected document rejected | PASS |  |

## Scope and limits

These are output-level engine checks, not proof that every registry configuration works in every browser. They cover the shared age/chronological-age date engine, percentage/discount/tax/EMI formulas, image byte target and resize helpers, JSON parsing/formatting/view conversion, Base64, UTF-8 binary conversion, static QR payload/encoding/rendering helpers (including the center logo), PDF opening/page ranges/merge primitives and text-preserving PDF optimization. Each area maps to multiple registry routes, but it is not counted as multiple independently tested tools.

The real JPEG test injects the installed native canvas codec into the actual search algorithm; browser JPEG/WebP/PNG output bytes can differ. PNG target logic uses controlled encoders here. QR outputs are decoded with Python OpenCV at safe defaults and with a solid logo at the size cap; this does not establish every color, print, damage, phone camera or scanner app. The encrypted fixture tests the library's encryption guard and does not claim password removal.

Real-browser output checks for the priority and new tools, phone-width layout and automated accessibility checks are in [browser-test-results.json](browser-test-results.json) (`node scripts/seo-tool-e2e.mjs <server>`). HEIC conversion, EXIF orientation, other browsers, physical devices and real-user Core Web Vitals are not covered by either script.
