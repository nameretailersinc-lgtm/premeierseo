"""Verify record preservation and concrete intent distinctions in generated reports."""
import collections
import csv
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1] / "seo"
with (root / "keyword-master.csv").open(encoding="utf-8-sig", newline="") as f:
    rows = list(csv.DictReader(f))
assert len(rows) == 46678
assert len({r["record_id"] for r in rows}) == len(rows)
summary = json.loads((root / "keyword-analysis-summary.json").read_text(encoding="utf8"))
assert sum(r["average_monthly_searches"].isdigit() for r in rows) == 46342
assert len({r["normalized_keyword"] for r in rows if r["average_monthly_searches"].isdigit()}) == 34119
allowed = {"target existing page", "target new page", "supporting content", "duplicate variant", "irrelevant", "branded navigational query", "manual review"}
assert all(r["disposition"] in allowed for r in rows)
assert any(r["disposition"] == "duplicate variant" for r in rows)
assert all(r["geographic_targeting"] == "not exported" for r in rows)
for row in rows:
    original = json.loads(row["original_source_fields_json"])
    for out, raw in [("keyword", "Keyword"), ("average_monthly_searches", "Avg. monthly searches"), ("low_range_bid", "Top of page bid (low range)"), ("high_range_bid", "Top of page bid (high range)"), ("three_month_change", "Three month change"), ("year_over_year_change", "YoY change"), ("advertising_competition", "Competition"), ("competition_index", "Competition (indexed value)")]:
        assert row[out] == original[raw], (row["record_id"], out)
    if row["disposition"] in {"manual review", "irrelevant", "branded navigational query"}:
        assert not row["recommended_target_url"], row["keyword"]
for keyword, target in {
    "image compressor": "/image-compressor/",
    "photo compressor": "/image-compressor/",
    "combine pdf": "/merge-pdf/",
    "pdf to word": "/pdf-to-word/",
    "word to pdf": "/word-to-pdf/",
    "pdf to docx": "/pdf-to-word/",
    "json formatter": "/json-viewer/",
    "keyword rank checker": "/keyword-rank-checker/",
}.items():
    selected = [r for r in rows if r["normalized_keyword"] == keyword]
    assert selected, keyword
    assert all(r["recommended_target_url"] == target for r in selected), keyword
image = [r for r in rows if r["normalized_keyword"] == "3000x3000 image converter"]
assert {r["source_dataset"]: r["average_monthly_searches"] for r in image} == {"image-1": "50", "image-2": "5000"}
assert len(summary["attachment_reconciliation"]) == 5
assert all(len(a["complete_metric_row_match"]) == 1 and not a["double_counted"] for a in summary["attachment_reconciliation"])
assert sum(collections.Counter(r["disposition"] for r in rows).values()) == 46678
print("Keyword research checks passed: all 46,678 source records retained; five attachments reconciled; source metrics and conversion directions preserved.")
