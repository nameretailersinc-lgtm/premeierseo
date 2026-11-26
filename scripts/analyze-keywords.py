"""Source-preserving Keyword Planner analysis; no external packages required.

Run after: node --import tsx scripts/seo-export-registry.ts
python scripts/analyze-keywords.py --input-dir <folder containing the five CSVs>
Outputs are evidence and review queues, never an instruction to auto-publish pages.
"""
from __future__ import annotations

import argparse
import collections
import csv
import hashlib
import io
import json
from pathlib import Path
import re
import unicodedata

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "seo"
SOURCES = [
    ("image-1", "17_25_23"), ("image-2", "17_26_36"),
    ("pdf", "17_27_52"), ("seo", "17_29_00"), ("general-tools", "17_29_29"),
]


def normalize(value: str) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", value).replace("\u200b", "").strip().casefold())


def integer(value: str):
    return int(value.replace(",", "")) if re.fullmatch(r"[\d,]+", value.strip()) else None


def write_csv(name: str, records: list[dict], fields=None):
    with (OUT / name).open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields or list(records[0]), extrasaction="ignore")
        writer.writeheader()
        writer.writerows(records)


BRANDS = re.compile(r"\b(?:ilovepdf|i love pdf|smallpdf|small pdf|pdf24|adobe|acrobat|tinypng|tiny png|tinyjpg|canva|picwish|fotor|squoosh|imagify|compressjpeg|freeconvert|cloudconvert|convertio|zamzar|iloveimg|i love img|resizepixel|imageresizer|wordcounter\.net|word counter net|calculator\.net|qr ?code monkey|qrcode monkey|ahrefs|semrush|moz|ubersuggest|seobility|screaming frog|small seo tools|smallseotools|duplichecker|prepostseo|seoptimer|neil patel|quillbot|grammarly|chatgpt|photshop|photoshop|microsoft|nitro pdf|foxit|wondershare|sodapdf|soda pdf|pdf candy|pdfcandy|sejda|lightpdf|img2go|11zon)\b")
IRRELEVANT = re.compile(r"\b(?:air compressor|tyre compressor|tire compressor|refrigerator|refrigerant|ac compressor|compressor oil|compressor pump|compressor motor|vacuum pump|hydraulic|pneumatic|compressor parts|compressor price|image comics|image comic|image dental|image skincare|qr code tattoo|qr code scanner app download|crack|cracked|serial key|keygen|pirated|porn|nude|xxx)\b")
INFO = re.compile(r"^(?:how (?:to|do|can|does)|what (?:is|are|does)|why (?:is|are|does)|when (?:to|is)|difference between|which (?:is|format)|tutorial|guide (?:to|for))\b")
DOWNLOAD = re.compile(r"\b(?:apk|mod apk|download for (?:pc|windows)|software download|exe download|windows (?:7|8|10|11) download|premium account|login|sign in|log in)\b")
STOP = {"free", "online", "best", "tool", "tools", "a", "an", "the", "for", "in", "with", "and", "converter", "generator"}


def semantic_tokens(value: str) -> set[str]:
    return {w for w in re.findall(r"[a-z0-9]+", value) if w not in STOP}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-dir", default=str(Path.home() / "Downloads"))
    parser.add_argument("--attachment", action="append", default=[], help="Optional original pasted export for reconciliation")
    args = parser.parse_args()
    OUT.mkdir(exist_ok=True)
    registry = json.loads((OUT / "tool-registry.json").read_text(encoding="utf-8"))
    tools = registry["tools"]
    by_id = {t["id"]: t for t in tools}
    by_path = {t["path"]: t for t in tools}
    alias = collections.defaultdict(set)
    for t in tools:
        if not t["indexable"]:
            continue
        for text in [t["name"], t["h1"], t["id"].replace("-", " "), *t["aliases"]]:
            alias[normalize(text)].add(t["path"])
    for c in registry["categories"]:
        alias[normalize(c["label"])].add(c["path"])
    alias_token_sets = [(semantic_tokens(phrase), targets) for phrase, targets in alias.items() if len(semantic_tokens(phrase)) >= 2]

    # Specific functional requirements precede generic aliases. Unsupported features
    # become reviewed opportunities rather than misleading mappings to unrelated tools.
    rules = [
        (r"\bpdf\b.*\b(?:to|into)\b.*\b(?:word|docx?|text|txt)\b", None, "pdf-tools", "high", "Text extraction is feasible; Word layout reconstruction needs a separate fidelity assessment"),
        (r"\b(?:body fat|bodyfat)\b", "/body-fat-calculator/", "calculator-tools", "medium", "Requires documented equation, sex-specific inputs and measurement validation"),
        (r"\bapy\b|annual percentage yield", "/apy-calculator/", "calculator-tools", "medium", "Requires compounding-frequency controls and clear nominal-rate assumptions"),
        (r"\b(?:domain authority|domain rating|website authority|page authority)\b", "/domain-authority-checker/", "free-seo-tools", "provider-dependent", "Licensed authority metric provider and credentials required; never invent Moz DA"),
        (r"\b(?:keyword|search)\b.*\b(?:rank|ranking|position)\b", "/keyword-rank-checker/", "free-seo-tools", "provider-dependent", "Requires legitimate SERP provider, quotas and explicit location/device settings"),
        (r"\b(?:keyword|search)\b.*\bvolume\b", "/keyword-volume-checker/", "free-seo-tools", "provider-dependent", "Requires legitimate keyword-volume provider, quotas and geographic targeting metadata"),
        (r"\b(?:website|web site|site) traffic\b|traffic checker", "/website-traffic-checker/", "traffic-performance-tools", "provider-dependent", "Requires authorized analytics or a licensed traffic-estimate provider with clear labels"),
        (r"\b(?:3000\s*[x×]\s*3000)\b", "/3000x3000-image-converter/", "imaging-tools", "medium", "Exact square dimensions require explicit crop/pad/stretch behavior"),
        (r"\b(?:1920\s*[x×]\s*1080|600\s*[x×]\s*600|300\s*[x×]\s*300)\b", "/image-resizer/", "imaging-tools", "low", "Consolidate dimension variants into configurable image resizer until distinct utility is demonstrated"),
        (r"\b(?:passport|instagram)\b.*\b(?:photo|image|resize|resizer)\b", "/image-resizer/", "imaging-tools", "medium", "Use dimensions and crop controls; country/platform specifications require verification"),
        (r"\b(?:wifi|wi fi|wi-fi|vcard|v card|email|e-mail|url|text|static|no expiration|without expiration)\b.*\bqr\b|\bqr\b.*\b(?:wifi|wi fi|wi-fi|vcard|v card|email|e-mail|url|text|static|no expiration|without expiration)\b", "/qr-code-generator/", "other-tools", "low", "Consolidate payload types into working QR generator modes; no near-duplicate pages"),
        (r"\bqr\b.*\blogo\b", "/qr-code-generator/", "other-tools", "medium", "Consolidate into QR generator; logo support needs scan testing and error-correction control"),
        (r"\b(?:json formatter|format json|json beautifier|json validator|json viewer)\b", "/json-viewer/", "development-tools", "low", "Existing viewer formats and validates JSON; consolidate synonymous intents"),
        (r"\b(?:seo checker|website seo checker|seo audit|seo score|website checker seo)\b", "/website-seo-score-checker/", "free-seo-tools", "low", "Describe measured on-page checks rather than a search engine ranking score"),
        (r"\b(?:website|site|page|webpage|web page)\b.*\b(?:speed|pagespeed)\b|\bpage speed\b", "/website-speed-checker/", "traffic-performance-tools", "provider-dependent", "Existing PageSpeed integration requires a usable API key/quota; lab versus field data must be distinguished"),
        (r"\b(?:combine|merge|join|concatenate)\b.*\bpdf\b|\bpdf\b.*\b(?:combine|merge|join|combiner|merger)\b", "/merge-pdf/", "pdf-tools", "low", "One canonical PDF merge/combine tool"),
        (r"\b(?:compress|reduce|reducer|shrink|smaller)\b.*\bpdf\b|\bpdf\b.*\b(?:compress|compression|compressor|reduce|reducer|shrink|smaller)\b", "/compress-pdf/", "pdf-tools", "medium", "Requested byte targets are best-effort, and success must use actual output bytes"),
        (r"\b(?:image|photo|picture|pic)\b.*\b(?:compress|compression|compressor)\b|\b(?:compress|compression|compressor)\b.*\b(?:image|photo|picture|pic)\b", "/image-compressor/", "imaging-tools", "low", "Consolidate generic image/photo/picture compression intent"),
        (r"\b(?:image|photo|picture|pic)\b.*\b(?:size|kb|mb)\b.*\b(?:reduce|reducer|smaller)\b|\breduce\b.*\b(?:image|photo|picture|pic)\b", "/reduce-image-size-in-kb/", "imaging-tools", "low", "Custom target-size engine covers arbitrary byte limits"),
        (r"\b(?:bulk|batch|multiple)\b.*\b(?:image|photo|picture)\b.*\b(?:resize|resizer)\b|\b(?:image|photo|picture) resiz", "/image-resizer/", "imaging-tools", "low", "Consolidate batch and general resizing in current resizer"),
        (r"\b(?:png|heic|avif|webp|jpg|jpeg|svg)\b.*\b(?:to|into|2)\b.*\b(?:png|heic|avif|webp|jpg|jpeg|svg)\b", None, "imaging-tools", "medium", "Format-direction mapping requires both input and output support"),
        (r"\bbase ?64\b.*\b(?:decode|decoder|encode|encoder)\b|\b(?:decode|decoder|encode|encoder)\b.*\bbase ?64\b", "/base64-encoder-decoder/", "development-tools", "low", "One bidirectional Base64 tool"),
        (r"\b(?:word count|word counter|count words|words counter)\b", "/word-counter/", "text-tools", "low", "Existing counter intent"),
        (r"\b(?:character count|character counter|letter count|letter counter|count characters)\b", "/character-counter/", "text-tools", "low", "Existing character count intent"),
        (r"\b(?:case converter|change case|uppercase to lowercase|lowercase to uppercase)\b", "/uppercase-to-lowercase/", "text-tools", "low", "One case-conversion interface"),
        (r"\b(?:age calculator|calculate age|age calculation|birthday calculator)\b", "/age-calculator/", "calculator-tools", "low", "Existing exact calendar-age calculator; preserve separate professional chronological-age intent"),
        (r"\b(?:barcode|bar code)\b.*\b(?:generator|generate|maker|create)\b|\bgenerate barcode\b", "/barcode-generator/", "other-tools", "low", "Existing barcode generator"),
        (r"\bqr\b.*\b(?:generator|generate|maker|create)\b|\bgenerate qr\b", "/qr-code-generator/", "other-tools", "low", "Existing QR generator"),
    ]
    compiled = [(re.compile(p), *rest) for p, *rest in rules]

    def category(k, source):
        for pattern, cat in [(r"\bpdf\b", "pdf-tools"), (r"\b(?:image|photo|picture|jpg|jpeg|png|heic|webp|avif)\b", "imaging-tools"), (r"\b(?:seo|keyword|backlink|sitemap|robots|canonical|serp)\b", "free-seo-tools"), (r"\b(?:calculator|calculate|apy|bmi)\b", "calculator-tools"), (r"\b(?:json|xml|html|css|javascript|base64|regex)\b", "development-tools"), (r"\b(?:binary|hexadecimal|octal|ascii)\b", "binary-tools"), (r"\b(?:text|word|character|sentence|essay|grammar|letter)\b", "text-tools"), (r"\b(?:qr|barcode|password|generator)\b", "other-tools")]:
            if re.search(pattern, k): return cat
        return "unclassified"

    def resolve(k, source):
        cat = category(k, source)
        if IRRELEVANT.search(k): return "irrelevant", "", cat, "none", "Unrelated product, unsafe piracy query or off-topic intent", "high"
        if BRANDS.search(k): return "branded navigational query", "", cat, "none", "Competitor/product brand; excluded from implementation queue", "high"
        if DOWNLOAD.search(k): return "irrelevant", "", cat, "none", "Installed-app, download or login intent does not fit browser utility", "high"
        exact = alias.get(k, set())
        if len(exact) == 1: return "target existing page", next(iter(exact)), cat, "low", "Exact existing registry name or alias", "high"
        if len(exact) > 1: return "manual review", "", cat, "review", "Registry aliases overlap across different canonical pages", "low"
        if INFO.search(k):
            target = "/blog/" + re.sub(r"[^a-z0-9]+", "-", k).strip("-")[:75] + "/"
            if re.search(r"(?:image|photo).*(?:compress|reduce|size)|(?:compress|reduce).*(?:image|photo)", k): target = "/blog/reduce-photo-size-in-kb/"
            elif re.search(r"pdf.*(?:compress|reduce)|(?:compress|reduce).*pdf", k): target = "/blog/reduce-pdf-file-size/"
            elif re.search(r"robots|crawl", k): target = "/blog/robots-txt-guide/"
            return "supporting content", target, cat, "editorial", "Informational prefix; editorial brief only, validate SERP intent before publishing", "medium"
        # Specific PDF target-size requirements override generic compression.
        size = re.search(r"\b(\d+)\s*(kb|mb)\b", k)
        if size and re.search(r"\b(?:compress|reduce|reducer|compression|shrink)\b", k):
            n = int(size.group(1)) * (1000 if size.group(2) == "mb" else 1)
            if "pdf" in k:
                target = {50: "/compress-pdf-to-50kb/", 100: "/compress-pdf-to-100kb/", 200: "/compress-pdf-to-200kb/", 1000: "/compress-pdf-to-1mb/"}.get(n, "/compress-pdf/")
                return ("target existing page" if target in by_path else "target new page"), target, "pdf-tools", "medium", "Byte-limit task; reusable preset; other limits remain in consolidated PDF compressor", "high"
            if re.search(r"\b(?:image|photo|picture|jpg|jpeg|png|pic)\b", k):
                target = {10: "/compress-image-to-10kb/", 20: "/compress-image-to-20kb/", 30: "/compress-jpeg-to-30kb/", 50: "/compress-image-to-50kb/", 100: "/compress-jpeg-to-100kb/", 200: "/compress-jpeg-to-200kb/", 1000: "/compress-image-to-1mb/"}.get(n, "/reduce-image-size-in-kb/")
                return "target existing page", target, "imaging-tools", "low", "Use existing preset or custom target engine; do not create numeric doorway variants", "high"
        conversion = re.search(r"\b(pdf|word|docx?|text|txt|jpg|jpeg|png|image|photo|picture)\b.*?\b(?:to|into|2)\b.*?\b(pdf|word|docx?|text|txt|jpg|jpeg|png|image|photo|picture)\b", k)
        if conversion:
            a, b = conversion.groups()
            if a in {"word", "doc", "docx"} and b == "pdf": return "target existing page", "/word-to-pdf/", "pdf-tools", "low", "Directional DOCX-to-PDF conversion; do not confuse with PDF-to-Word reconstruction", "high"
            if a in {"jpg", "jpeg", "png", "image", "photo", "picture"} and b == "pdf": return "target existing page", "/jpg-to-pdf/", "pdf-tools", "low", "Existing image-to-PDF tool supports this image input", "high"
            if a == "pdf" and b in {"jpg", "jpeg"}: return "target existing page", "/pdf-to-jpg/", "pdf-tools", "low", "Directional PDF-page rendering to JPEG", "high"
            if a == "pdf" and b in {"text", "txt"}: return ("target existing page" if "/pdf-to-text/" in by_path else "target new page"), "/pdf-to-text/", "pdf-tools", "medium", "Selectable-text extraction only; image-only scans require separate OCR", "high"
            if a == "pdf" and b in {"word", "doc", "docx"}: return "target new page", "/pdf-to-word/", "pdf-tools", "high", "Editable Word layout reconstruction needs a separate fidelity assessment; text extraction alone is not equivalent", "high"
        for pat, target, c, complexity, reason in compiled:
            if not pat.search(k): continue
            if target is None and c == "pdf-tools":
                target = "/pdf-to-text/" if re.search(r"\b(?:text|txt)\b", k) else "/pdf-to-word/"
            elif target is None and c == "imaging-tools":
                formats = re.search(r"\b(png|heic|avif|webp|jpg|jpeg|svg)\b.*?\b(?:to|into|2)\b.*?\b(png|heic|avif|webp|jpg|jpeg|svg)\b", k)
                if formats:
                    a, b = ("jpg" if x == "jpeg" else x for x in formats.groups())
                    candidates = [t for t in tools if t.get("config", {}).get("from") == a and t.get("config", {}).get("to") in [b, "jpeg" if b == "jpg" else b]]
                    if candidates: target = candidates[0]["path"]
                    else: return "manual review", "", c, complexity, "Format pair not supported by current registry; validate implementation demand", "medium"
                else: continue
            if target:
                return ("target existing page" if target in by_path else "target new page"), target, c, complexity, reason, "medium"
        if re.search(r"\b(?:downsize|minimize|decrease|lower|shrink|lessen)\b", k) and re.search(r"\b(?:image|photo|picture|pic|jpg|jpeg)\b", k):
            return "target existing page", "/reduce-image-size-in-kb/", "imaging-tools", "low", "Source-observed reduction synonym consolidated in custom byte-target tool", "medium"
        if re.search(r"\b(?:resize|resizer|re size|redimension|dimensions?|resolution)\b", k) and re.search(r"\b(?:image|photo|picture|pic)\b", k):
            return "target existing page", "/image-resizer/", "imaging-tools", "low", "Source-observed pixel-dimension resize intent consolidated in current resizer", "medium"
        # Colloquial families seen in the review queue. Each needs both the object and the task, and
        # excludes neighbouring intents (scanning, video, GIF) the target tool does not perform.
        # Misspellings are deliberately not matched: they stay in manual review.
        if not re.search(r"\b(?:scan|scanner|scanning|reader|read|decode|decoder|video|videos|gif|gifs|3d|print|printer)\b", k):
            if re.search(r"\b(?:qr|qrcode|qr-code|2d code)\b", k) and re.search(r"\b(?:gen|generator|generate|maker|make|builder|build|creator|create|design)\b", k):
                return "target existing page", "/qr-code-generator/", "other-tools", "low", "QR creation synonym consolidated in the QR generator", "medium"
            picture = r"\b(?:image|images|photo|photos|photograph|picture|pictures|pic|pics|jpg|jpeg|png|foto)\b"
            if re.search(picture, k):
                if re.search(r"\b(?:pdf)\b", k):
                    if re.search(r"\b(?:pics?|photos?|pictures?|images?)\b.*\b(?:to|into)\b.*\bpdf\b", k):
                        return "target existing page", "/jpg-to-pdf/", "pdf-tools", "low", "Image-to-PDF synonym", "medium"
                elif re.search(r"\b(?:size|quality|kb|mb)\b.*\breducer\b|\breducer\b.*\bsize\b", k):
                    return "target existing page", "/reduce-image-size-in-kb/", "imaging-tools", "low", "Byte-size reduction synonym consolidated in the custom target tool", "medium"
                elif not re.search(r"\b(?:png|jpg|jpeg|heic|webp)\b.*\b(?:png|jpg|jpeg|heic|webp)\b", k) and (
                    re.search(r"\b(?:change|modify|adjust|edit)\b.*\bsize\b|\bsize\b.*\b(?:change|changer|converter|convert|editor)\b|\bresizing\b", k)
                ):
                    return "target existing page", "/image-resizer/", "imaging-tools", "low", "Picture size-change synonym; pixel and byte-size controls remain distinct tools", "medium"
            if re.search(r"\b(?:char|chars|letter|letters)\b.*\b(?:counter|count)\b", k):
                return "target existing page", "/character-counter/", "text-tools", "low", "Character counting synonym", "medium"
            if re.search(r"\bpercent(?:age)?\b", k) and re.search(r"\b(?:increase|decrease|change|difference|finder)\b", k):
                return "target existing page", "/percentage-calculator/", "calculator-tools", "low", "Percentage change is a mode of the percentage calculator", "medium"
            if re.search(r"\b(?:backlinks?|back links?|incoming links?|inbound links?)\b", k) and re.search(r"\b(?:check|checker|find|finder|analy[sz]er|analysis|lookup)\b", k):
                return "target existing page", "/backlink-checker/", "free-seo-tools", "provider-dependent", "Existing page only verifies supplied source pages and stays noindex; discovery needs a licensed backlink index", "medium"
        # Conservative token subset match: all substantial alias tokens must appear,
        # and at most two additional tokens are tolerated to avoid changing the task.
        candidates = set()
        tokens = semantic_tokens(k)
        for pt, targets in alias_token_sets:
            if pt <= tokens and len(tokens - pt) <= 2:
                candidates.update(targets)
        if len(candidates) == 1:
            return "target existing page", next(iter(candidates)), cat, "low", "Conservative registry-token match; page-level editorial review required", "medium"
        return "manual review", "", cat, "review", "Unverified intent, language, misspelling or unsupported functional requirement; not an implementation recommendation", "low"

    master, source_info = [], []
    numeric_unique = set()
    for source, stamp in SOURCES:
        path = Path(args.input_dir) / f"Keyword Stats 2026-11-26 at {stamp}.csv"
        raw = path.read_bytes()
        text = raw.decode("utf-16") if raw.startswith((b"\xff\xfe", b"\xfe\xff")) else raw.decode("utf-8-sig")
        lines = text.splitlines()
        reader = csv.DictReader(lines[2:], delimiter="\t")
        data = list(reader)
        source_info.append({"dataset": source, "file": path.name, "sha256": hashlib.sha256(raw).hexdigest(), "content_sha256_without_export_title": hashlib.sha256("\n".join(lines[1:]).encode()).hexdigest(), "period": lines[1].strip('"'), "rows": len(data), "numeric_volume_rows": sum(integer(r.get("Avg. monthly searches", "")) is not None for r in data), "geographic_targeting": "Not supplied in export; PKR identifies bid currency only"})
        seen = {}
        for i, rawrow in enumerate(data, 1):
            keyword = rawrow.get("Keyword", "")
            k = normalize(keyword)
            volume = integer(rawrow.get("Avg. monthly searches", ""))
            if volume is not None: numeric_unique.add(k)
            disposition, target, cat, complexity, reason, confidence = resolve(k, source)
            base_disposition = disposition
            prior = seen.get(k)
            seen.setdefault(k, f"{source}:{i}")
            if prior and disposition in {"target existing page", "target new page", "supporting content"}:
                disposition, reason = "duplicate variant", f"Same normalized keyword within this dataset as {prior}; retain separate source row and metrics"
            existing = target if target in by_path or any(c["path"] == target for c in registry["categories"]) else ""
            if disposition == "target existing page" and target in by_path:
                canonical_names = {normalize(by_path[target][f]) for f in ["name", "h1"]} | {normalize(by_path[target]["id"].replace("-", " "))}
                if k not in canonical_names:
                    disposition = "duplicate variant"
                    reason += "; synonym/modifier variant maps to the existing canonical task, not another page"
            intent = "informational" if disposition == "supporting content" else "navigational" if disposition == "branded navigational query" else "utility/task" if target else "unverified"
            priority = "review" if disposition in {"manual review", "irrelevant", "branded navigational query"} else "P3"
            if volume is not None and target:
                priority = "P0" if existing and volume >= 50000 else "P1" if volume >= 5000 and complexity != "provider-dependent" else "P2" if volume >= 500 else "P3"
            trend_values = [rawrow.get("Three month change", ""), rawrow.get("YoY change", "")]
            rising = any(re.fullmatch(r"\+?\d+(?:\.\d+)?%", v.strip()) and float(v.strip().rstrip("%")) >= 100 for v in trend_values)
            if priority == "P2" and rising and complexity not in {"high", "provider-dependent"}:
                priority = "P1"
            if complexity in {"high", "provider-dependent"} and priority in {"P0", "P1"}: priority = "P2"
            master.append({
                "record_id": f"{source}:{i}", "keyword": keyword, "normalized_keyword": k,
                "average_monthly_searches": rawrow.get("Avg. monthly searches", ""), "three_month_change": rawrow.get("Three month change", ""), "year_over_year_change": rawrow.get("YoY change", ""),
                "advertising_competition": rawrow.get("Competition", ""), "competition_index": rawrow.get("Competition (indexed value)", ""),
                "low_range_bid": rawrow.get("Top of page bid (low range)", ""), "high_range_bid": rawrow.get("Top of page bid (high range)", ""), "currency": rawrow.get("Currency", ""),
                "source_dataset": source, "source_file": path.name, "source_row": i + 3, "research_period": lines[1].strip('"'), "geographic_targeting": "not exported",
                "search_intent": intent, "tool_category": cat, "existing_target_url": existing, "recommended_target_url": target,
                "implementation_priority": priority, "disposition": disposition, "implementation_complexity": complexity,
                "base_disposition": base_disposition,
                "rising_trend": "yes; at least one exported change is +100% or greater" if rising else "not established by supplied change fields",
                "mapping_confidence": confidence, "decision_rule": reason, "organic_competition_evidence": "unverified; Ads competition is not organic difficulty",
                "cluster_id": target.rstrip("/").replace("/", ":").lstrip(":") if target else f"review:{cat}",
                "original_source_fields_json": json.dumps(rawrow, ensure_ascii=False, separators=(",", ":")),
            })

    assert len(master) == 46678, f"Unexpected row total: {len(master)}"
    assert sum(integer(r["average_monthly_searches"]) is not None for r in master) == 46342
    assert len(numeric_unique) == 34119, f"Unexpected normalized unique total: {len(numeric_unique)}"
    write_csv("keyword-master.csv", master)
    mapping_fields = ["record_id", "keyword", "normalized_keyword", "source_dataset", "average_monthly_searches", "three_month_change", "year_over_year_change", "advertising_competition", "competition_index", "low_range_bid", "high_range_bid", "currency", "geographic_targeting", "search_intent", "tool_category", "existing_target_url", "recommended_target_url", "disposition", "implementation_priority", "mapping_confidence", "decision_rule"]
    write_csv("keyword-page-mapping.csv", master, mapping_fields)
    groups = collections.defaultdict(list)
    for row in master: groups[row["cluster_id"]].append(row)
    clusters, opportunities, priorities = [], [], []
    for cluster, rows in sorted(groups.items()):
        numeric = [r for r in rows if integer(r["average_monthly_searches"]) is not None]
        representative = max(numeric or rows, key=lambda r: integer(r["average_monthly_searches"]) or -1)
        source_metrics = []
        for src in sorted({r["source_dataset"] for r in rows}):
            relevant = [r for r in rows if r["source_dataset"] == src and integer(r["average_monthly_searches"]) is not None]
            top = max(relevant, key=lambda r: integer(r["average_monthly_searches"]), default=None)
            source_metrics.append({"source": src, "row_count": sum(r["source_dataset"] == src for r in rows), "representative_keyword": top["keyword"] if top else "", "representative_keyword_volume": top["average_monthly_searches"] if top else "", "three_month_change": top["three_month_change"] if top else "", "year_over_year_change": top["year_over_year_change"] if top else ""})
        item = {"cluster_id": cluster, "representative_keyword": representative["keyword"], "recommended_target_url": representative["recommended_target_url"], "tool_category": representative["tool_category"], "keyword_rows": len(rows), "unique_keywords": len({r["normalized_keyword"] for r in rows}), "source_specific_representatives_json": json.dumps(source_metrics), "aggregation_method": "No search-volume sums; each source retains its own top keyword metric; this is not cluster traffic", "dispositions": "; ".join(sorted({r["disposition"] for r in rows})), "priority": min((r["implementation_priority"] for r in rows), key=lambda p: {"P0":0,"P1":1,"P2":2,"P3":3,"review":4}[p]), "complexity": representative["implementation_complexity"], "evidence": representative["decision_rule"]}
        clusters.append(item)
        if representative["recommended_target_url"]:
            priorities.append({**item, "implementation_status": "existing registry page; optimize and verify" if representative["existing_target_url"] else "research-backed opportunity; validate before indexable launch", "next_action": representative["decision_rule"]})
        if any(r["disposition"] == "target new page" for r in rows):
            opportunities.append({**item, "launch_gate": "Working distinct functionality, accessible UI, privacy statement, meaningful example, tests and canonical metadata required", "provider_dependency": representative["decision_rule"] if representative["implementation_complexity"] == "provider-dependent" else "No search-data provider implied; inspect actual processing requirements", "indexable_now": "no; opportunity report does not authorize unfinished pages"})
    write_csv("keyword-clusters.csv", clusters)
    write_csv("missing-tool-opportunities.csv", opportunities)
    write_csv("implementation-priorities.csv", sorted(priorities, key=lambda r: (r["priority"], r["recommended_target_url"])))

    # This is structural intent overlap, not a claim that Google rankings cannibalize.
    conflicts = []
    for phrase, paths in sorted(alias.items()):
        if len(paths) > 1:
            matches = [r for r in master if r["normalized_keyword"] == phrase]
            conflicts.append({"keyword_or_intent": phrase, "candidate_urls": "; ".join(sorted(paths)), "evidence_type": "registry alias overlap", "dataset_rows": len(matches), "recommended_action": "Review functional distinction and pick one target; retain working URLs unless redirect justified", "ranking_cannibalization_confirmed": "no; requires Search Console query-page evidence"})
    for intent, paths, action in [
        ("general image target-size reduction", ["/reduce-image-size-in-kb/", "/photo-resizer-in-kb/"], "Differentiate explicit portrait/photo workflows or consolidate only after URL performance review"),
        ("calendar age", ["/age-calculator/", "/chronological-age-calculator/"], "Preserve professional chronological-age task; primary general age intent targets age-calculator"),
        ("image compression versus target bytes", ["/image-compressor/", "/reduce-image-size-in-kb/", "/compress-jpg-image/"], "Separate adjustable quality, hard byte limit and JPEG-specific behavior; cross-link with descriptive task labels"),
    ]:
        conflicts.append({"keyword_or_intent": intent, "candidate_urls": "; ".join(paths), "evidence_type": "functional intent overlap review", "dataset_rows": "see master mapping", "recommended_action": action, "ranking_cannibalization_confirmed": "no; requires Search Console query-page evidence"})
    write_csv("keyword-cannibalization-report.csv", conflicts)

    # Complete inventory, not a claim of browser-tested correctness.
    inventory = [{"tool_id": t["id"], "name": t["name"], "canonical_url": t["path"], "category": t["category"], "widget": t["widget"], "indexable": t["indexable"], "processing": t["processing"], "configuration_json": json.dumps(t.get("config", {})), "verification_level": "registry implementation reference; browser functionality validation reported separately"} for t in tools]
    write_csv("tool-inventory.csv", inventory)
    attachments = []
    for filename in args.attachment:
        p = Path(filename)
        raw = p.read_bytes()
        txt = raw.decode("utf-8-sig").replace("\r\n", "\n").strip()
        matches = []
        # Pasted text may differ in export title, line endings, trailing whitespace,
        # or omit empty monthly columns; compare complete nonempty TSV metric cells.
        def cells(s):
            return [tuple(x.rstrip().split("\t")[:9]) for x in s.splitlines() if "\t" in x and not x.startswith("Keyword\t")]
        for source, stamp in SOURCES:
            source_path = Path(args.input_dir) / f"Keyword Stats 2026-11-26 at {stamp}.csv"
            s = source_path.read_text(encoding="utf-16")
            a, b = cells(txt), cells(s)
            if a == b: matches.append(source)
        attachments.append({"file": str(p), "sha256": hashlib.sha256(raw).hexdigest(), "complete_metric_row_match": matches, "rows_detected": len(cells(txt)), "double_counted": False})
    summary = {"record_count": len(master), "numeric_volume_records": sum(integer(r["average_monthly_searches"]) is not None for r in master), "unique_normalized_numeric_keywords": len(numeric_unique), "sources": source_info, "dispositions": dict(collections.Counter(r["disposition"] for r in master)), "mapping_confidence": dict(collections.Counter(r["mapping_confidence"] for r in master)), "registry_tools": len(tools), "indexable_registry_tools": sum(t["indexable"] for t in tools), "attachment_reconciliation": attachments}
    (OUT / "keyword-analysis-summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf8")
    disposition_lines = "\n".join(f"- {k}: {v:,} records" for k, v in summary["dispositions"].items())
    sources_lines = "\n".join(f"| {s['dataset']} | {s['file']} | {s['rows']:,} | {s['numeric_volume_rows']:,} |" for s in source_info)
    md = f"""# Keyword analysis: November 2025–October 2026

Processed **{len(master):,} records**, **{summary['numeric_volume_records']:,} numeric-volume records** and **{len(numeric_unique):,} unique normalized numeric keywords** from all five exports. The counts exactly match the supplied research brief. The actual registry snapshot contains {len(tools)} tools, of which {summary['indexable_registry_tools']} are marked indexable. Registry membership alone is not proof of working browser functionality.

| Dataset | Original export | Records | Numeric volume |
|---|---|---:|---:|
{sources_lines}

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

{disposition_lines}

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
"""
    (OUT / "keyword-analysis-summary.md").write_text(md, encoding="utf8")
    print(json.dumps({k:v for k,v in summary.items() if k not in {"sources", "attachment_reconciliation"}}, indent=2))


if __name__ == "__main__":
    main()
