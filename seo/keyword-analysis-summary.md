# Keyword analysis: November 2025–October 2026

Processed **46,678 records**, **46,342 numeric-volume records** and **34,119 unique normalized numeric keywords** from all five exports. The counts exactly match the supplied research brief. The actual registry snapshot contains 178 tools, of which 175 are marked indexable. Registry membership alone is not proof of working browser functionality.

| Dataset | Original export | Records | Numeric volume |
|---|---|---:|---:|
| image-1 | Keyword Stats 2026-11-26 at 17_25_23.csv | 12,514 | 12,220 |
| image-2 | Keyword Stats 2026-11-26 at 17_26_36.csv | 12,486 | 12,466 |
| pdf | Keyword Stats 2026-11-26 at 17_27_52.csv | 11,154 | 11,132 |
| seo | Keyword Stats 2026-11-26 at 17_29_00.csv | 5,959 | 5,959 |
| general-tools | Keyword Stats 2026-11-26 at 17_29_29.csv | 4,565 | 4,565 |

## Evidence and metrics

`keyword-master.csv` preserves every original keyword and source field, including monthly columns and empty values, in `original_source_fields_json`, together with explicit source-specific metric columns. Two image sources overlap and remain distinct. Their volumes, bids and changes are never added together. Cluster summaries show the top observed keyword separately for each source; they are not cluster demand estimates or traffic forecasts. PKR is the bid currency and **does not establish geographic targeting**. Geographic targeting is not present in these exports. Google Ads competition and its index are preserved as advertising metrics, never organic difficulty. No organic difficulty, rank, competitor traffic or conversion estimate has been invented.

The source manifest and exact raw-file SHA-256 fingerprints are in `keyword-analysis-summary.json`. Repeated downloads with a different export timestamp are not additional datasets. Pasted attachments supplied through `--attachment` are reconciled without adding records.

## Decision rules

1. Normalize Unicode presentation, case, whitespace and invisible formatting; retain the unmodified keyword separately. Numeric volumes are not inferred for `--` or empty cells.
2. Exclude recognized competitor/product brand navigation, piracy, off-topic industrial compressor products, installed-app downloads and login intents from implementation. Unknown languages, accidental misspellings, ambiguous intents and unsupported requirements go to manual review rather than an indexable launch queue. Brand rules intentionally favor precision; manual review remains required.
3. Map exact registry names and aliases first. Specific byte targets and directional conversion requirements precede generic functional rules. Generic image/photo compression, PDF merge/combine, JSON formatting/viewing and Base64 encode/decode intents consolidate onto a functional canonical tool. Conservative token matches have medium confidence and require editorial review.
4. Keep informational queries in supporting-content briefs. Proposed article slugs are a planning suggestion, not new published pages. Existing relevant guides are preferred where a direct topical match exists.
5. Use one target per source keyword record. Multiple source records can legitimately map to the same canonical URL. All records receive a disposition, including manual review; automatic classification is not a claim that every query has been manually researched.
6. Existing tools with observed per-keyword volume at least 50,000 are P0 for optimization/validation; at least 5,000 is P1; at least 500 is P2; smaller opportunities are P3. A P2 task with an exported three-month or yearly increase of at least 100% moves to P1 when complexity is low/medium. Provider-dependent and high-complexity builds are capped at P2 until dependencies are resolved. These are transparent work-queue rules, not SEO difficulty scores or guaranteed return rankings. Trend values remain visible source by source; no volumes are extrapolated from them.
7. New pages require a useful functional distinction, working outputs, task-specific controls/examples, tests and indexable canonical metadata. Numeric variants without such a distinction stay in a consolidated tool. No report automatically creates a page.

## Dispositions

- target existing page: 134 records
- duplicate variant: 28,805 records
- manual review: 14,267 records
- branded navigational query: 2,577 records
- irrelevant: 95 records
- target new page: 798 records
- supporting content: 2 records

## Interpretation and implementation

- `keyword-page-mapping.csv` has one row per source record, including metrics, confidence and the reason for its target.
- `keyword-clusters.csv` groups mapped canonical intents and explicitly names unresolved review buckets. Review buckets are not validated SEO clusters.
- `keyword-cannibalization-report.csv` identifies registry alias/functional overlap. Actual ranking cannibalization is **unconfirmed** without Search Console query-by-page history.
- `missing-tool-opportunities.csv` records validated keyword demand for missing functions, plus implementation/dependency gates. It does not mark unfinished tools indexable.
- `implementation-priorities.csv` retains source-specific evidence and implementation complexity. Optimize existing image/PDF utilities, word/character counts, JSON, age, percentage, QR and barcode tools before launching large batches of pages.
- `tool-inventory.csv` preserves all canonical registry routes and configuration, with a clear verification-level label.

Pages launched from this research, each with its own working function: exact 3000×3000 square output (50 and 5,000 in the two image sources), PDF-to-200KB and PDF-to-1MB targets (5,000 each), plain PDF text extraction, and APY and body-fat calculators (representative keywords at 50,000 each). Format-preserving PDF-to-Word reconstruction and provider-backed authority, keyword-volume/rank and traffic tools need explicit capability/provider decisions. QR payload modes and batch image resizing should stay consolidated unless independently useful functionality warrants another page.

## Reproduce

```powershell
node --import tsx scripts/seo-export-registry.ts
python scripts/analyze-keywords.py --input-dir '<folder containing the five exports>'
python scripts/verify-keyword-analysis.py
```

The input folder must contain the five timestamped source files listed above. Scripts read inputs without modifying them. Generated CSVs use UTF-8 BOM and standard CSV quoting. `--attachment` can be supplied repeatedly to reconcile original pasted TSVs. Refresh the registry export before rerunning after functional registry changes. Review intent and observed SERP evidence before expanding or changing indexed URLs.
