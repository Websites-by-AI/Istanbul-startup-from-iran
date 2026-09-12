"""RAG knowledge-base pipeline — offline tests (no network).

Live scraping is exercised by `python3 -m rag.scrape --all --dry-run`; these tests
pin the parsing, chunking, relevance, PII-scrubbing, dedup and naming contracts.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from rag import sources as S  # noqa: E402
from rag.fetch import (  # noqa: E402
    html_links,
    html_to_text,
    parse_crossref,
    parse_feed,
    parse_semantic_scholar,
    scrub_pii,
)
from rag.scrape import build_chunks, chunk_text, record_id, run  # noqa: E402

RSS = """<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0"><channel><title>Test</title>
<item><title>Türkiye'de startup yatırımı rekor kırdı</title>
<link>https://example.tr/haber/1</link><pubDate>Fri, 12 Sep 2026 06:00:00 +0300</pubDate>
<description>&lt;p&gt;İstanbul'da girişim sermayesi fonları şirket kurmak isteyen yabancı
girişimcilere yönelik oturum izni sürecini de etkileyen yeni bir program açıkladı.&lt;/p&gt;</description></item>
<item><title>Unrelated football result</title><link>https://example.tr/spor/2</link>
<description>Match ended 2-1.</description></item>
</channel></rss>"""

ATOM = """<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
<entry><title>Company formation by Iranian founders in Turkey</title>
<id>http://arxiv.org/abs/2201.00001v1</id><updated>2026-01-10T18:58:02Z</updated>
<author><name>Furkan Gürsoy</name></author><author><name>Bertan Badur</name></author>
<summary>We study residence permit applications and startup investment in Türkiye.</summary>
</entry></feed>"""

CROSSREF = json.dumps({"status": "ok", "message": {"items": [{
    "title": ["Startup immigration policy in Türkiye"], "DOI": "10.1/xyz",
    "URL": "https://doi.org/10.1/xyz", "abstract": "<p>Company formation, residence permit and "
    "work permit rules for foreign founders in Istanbul.</p>",
    "author": [{"given": "Ayşe", "family": "Yılmaz"}],
    "issued": {"date-parts": [[2025, 3, 7]]}}]}})

S2 = json.dumps({"total": 1, "data": [{"title": "Iranian entrepreneurs in Turkey",
                                       "year": 2024, "abstract": "Migration, startup and visa policy.",
                                       "authors": [{"name": "A. Author"}], "externalIds": {"DOI": "10.2/abc"},
                                       "paperId": "deadbeef"}]})

HTML = """<html><body>
<a href="/destekdetay/1231/girisimci-destek-programi">Girişimci Destek Programı</a>
<a href="/site/tr/genel/duyurular#filter">Filtrele</a>
<a href="https://example.org/duyuru/42">KOBİ dijital dönüşüm desteği</a>
<a href="/site/tr/genel/duyurular">Aynı sayfa</a>
<script>var x = "gizli";</script><p>Türkiye'de şirket kuran yabancı girişimciler için destek.</p>
</body></html>"""


# ------------------------------------------------------------------- chunking
def test_chunk_text_short_input_is_one_chunk() -> None:
    assert chunk_text("Kısa metin.") == ["Kısa metin."]
    assert chunk_text("") == []
    assert chunk_text("   \n ") == []


def test_chunk_text_respects_size_and_keeps_sentences() -> None:
    text = " ".join(f"Cümle numara {i}." for i in range(300))
    chunks = chunk_text(text, size=200, overlap=40)
    assert len(chunks) > 5
    assert all(len(c) <= 240 for c in chunks)                 # overlap tolerance
    assert all(not c.startswith(" ") and not c.endswith(" ") for c in chunks)
    assert "".join(chunks).count("Cümle") >= 300               # nothing dropped


def test_chunk_text_hard_splits_one_huge_sentence() -> None:
    chunks = chunk_text("x" * 2500, size=900, overlap=120)
    assert len(chunks) >= 3 and all(len(c) <= 900 for c in chunks)


# ---------------------------------------------------------------------- PII
def test_scrub_pii_removes_contacts_but_keeps_dates_and_amounts() -> None:
    text = ("İletişim ahmet@ornek.com · +90 555 123 45 67 · TC 12345678901 · "
            "Başvuru 2026-09-12 · tutar 250000 USD · Resmî Gazete 12.09.2026")
    clean, removed = scrub_pii(text)
    assert removed == 3
    assert "ahmet@ornek.com" not in clean and "12345678901" not in clean
    assert "[redacted-email]" in clean and "[redacted-id]" in clean and "[redacted-phone]" in clean
    assert "2026-09-12" in clean and "250000" in clean and "12.09.2026" in clean


def test_no_pii_survives_into_a_chunk() -> None:
    src = S.BY_KEY["tbb"]
    item = {"title": "Avukatlık bürosu iletişim", "link": "https://example.org/x",
            "text": "Türkiye'de şirket kurmak için arayın: 0212 444 12 34, bilgi@ornek.com, TC 12345678901.",
            "authors": [], "published": ""}
    chunks = build_chunks(item, src, "2026-09-12T00:00:00+00:00")
    assert chunks
    blob = " ".join(c.text for c in chunks)
    assert "@ornek.com" not in blob and "12345678901" not in blob and "444 12 34" not in blob


# ------------------------------------------------------------------- parsers
def test_parse_rss_and_filters_unrelated_items() -> None:
    items = parse_feed(RSS)
    assert len(items) == 2
    assert "startup" in items[0]["title"].lower()
    assert items[0]["text"].startswith("İstanbul")            # HTML in <description> was stripped
    assert items[0]["published"].startswith("Fri, 12 Sep 2026")


def test_parse_atom_with_authors() -> None:
    items = parse_feed(ATOM)
    assert items[0]["title"].startswith("Company formation")
    assert items[0]["authors"] == ["Furkan Gürsoy", "Bertan Badur"]
    assert "residence permit" in items[0]["text"]


def test_parse_crossref_and_semantic_scholar() -> None:
    cr = parse_crossref(CROSSREF)
    assert cr[0]["doi"] == "10.1/xyz" and cr[0]["authors"] == ["Ayşe Yılmaz"]
    assert cr[0]["published"] == "2025-03-07" and "residence permit" in cr[0]["text"]
    s2 = parse_semantic_scholar(S2)
    assert s2[0]["link"] == "https://doi.org/10.2/abc" and s2[0]["published"] == "2024"


def test_html_to_text_drops_scripts() -> None:
    text = html_to_text(HTML)
    assert "gizli" not in text and "Girişimci Destek Programı" in text


def test_html_links_skips_fragments_and_self_links() -> None:
    links = html_links(HTML, "https://example.org/site/tr/genel/duyurular")
    urls = [l["link"] for l in links]
    assert "https://example.org/destekdetay/1231/girisimci-destek-programi" in urls
    assert "https://example.org/duyuru/42" in urls
    assert all("#" not in u for u in urls)
    assert "https://example.org/site/tr/genel/duyurular" not in urls


# ---------------------------------------------------------------- relevance
def test_relevance_needs_geography_and_topic() -> None:
    ok, geo, topic = S.is_relevant("İstanbul'da şirket kurmak isteyen İranlı girişimciler")
    assert ok and geo and topic
    assert not S.is_relevant("Football results in Spain")[0]
    assert not S.is_relevant("Türkiye'de hava durumu")[0]           # geo only


def test_irrelevant_item_is_dropped_and_assume_relevant_is_kept() -> None:
    now = "2026-09-12T00:00:00+00:00"
    item = {"title": "Unrelated football result", "link": "https://example.tr/spor/2",
            "text": "Match ended 2-1.", "authors": [], "published": ""}
    assert build_chunks(item, S.BY_KEY["aa_tr"], now) is None
    assert build_chunks(item, S.BY_KEY["crossref_startup"], now) is not None


# -------------------------------------------------------------------- dedup
@pytest.fixture
def fake_sources(monkeypatch, tmp_path):
    """Two runs of the pipeline over a fixed set of items, with no network."""
    import rag.scrape as scrape

    items = [
        {"title": "Türkiye'de startup yatırımı", "link": "https://example.tr/a",
         "text": "İstanbul'da şirket kurmak isteyen girişimciler için oturum izni süreci. " * 6,
         "authors": [], "published": "2026-09-12"},
        {"title": "Ankara'da teknopark desteği", "link": "https://example.tr/b",
         "text": "Yabancı yatırımcı için teşvik ve vergi avantajı açıklandı.", "authors": [], "published": ""},
        {"title": "Unrelated", "link": "https://example.tr/c", "text": "nothing here", "authors": [], "published": ""},
    ]
    calls = {"n": 0}

    def fake_collect(source, limit=25):
        calls["n"] += 1
        return list(items), ""

    monkeypatch.setattr(scrape, "collect", fake_collect)
    monkeypatch.setattr(scrape, "KB_DIR", tmp_path / "kb")
    return tmp_path / "kb", calls


def test_second_run_adds_nothing(fake_sources) -> None:
    kb, calls = fake_sources
    first = run(keys=["aa_tr"], out_dir=kb)
    second = run(keys=["aa_tr"], out_dir=kb)
    assert first["total_new_chunks"] > 0
    assert second["total_new_chunks"] == 0
    assert calls["n"] == 2
    assert (kb / "seen.json").exists()
    day_dir = next(d for d in kb.iterdir() if d.is_dir())
    lines = (day_dir / "aa_tr.jsonl").read_text(encoding="utf-8").strip().splitlines()
    assert len(lines) == first["total_new_chunks"]
    record = json.loads(lines[0])
    for key in ("id", "chunk_id", "source", "kind", "lang", "licence", "url", "title",
                "published", "scraped_at", "text", "chars", "geo_hits", "topic_hits"):
        assert key in record, key
    assert record["url"].startswith("https://") and record["chars"] == len(record["text"])


def test_dry_run_writes_nothing(fake_sources) -> None:
    kb, _ = fake_sources
    report = run(keys=["aa_tr"], dry_run=True, out_dir=kb)
    assert report["total_new_chunks"] > 0
    assert not kb.exists()


def test_record_ids_are_stable_and_unique() -> None:
    a = record_id("https://x/A", "Title")
    assert a == record_id("https://x/a ", " title ")
    assert a != record_id("https://x/B", "Title")
    assert re.fullmatch(r"[0-9a-f]{20}", a)


# ------------------------------------------------------------------ contract
def test_exactly_one_dataset_one_space_one_index() -> None:
    names = [S.HF_DATASET, S.HF_SPACE, S.VECTOR_INDEX]
    assert all(names)
    assert len(set(names)) == 3
    assert S.HF_DATASET.count("/") == 1 and S.HF_SPACE.count("/") == 1
    assert S.HF_DATASET != S.HF_SPACE
    # embedding choices must fit Cloudflare Vectorize (max 1536 dimensions)
    assert S.EMBEDDING_EDGE.startswith("@cf/")
    assert S.EVAL_DATASET and "/" in S.EVAL_DATASET


def test_source_registry_is_consistent() -> None:
    keys = [s.key for s in S.SOURCES]
    assert len(keys) == len(set(keys)), "duplicate source keys"
    for s in S.SOURCES:
        assert s.kind in ("news", "academic", "official", "legislation", "directory", "seed")
        assert s.url.startswith("https://"), s.key
        assert s.lang in ("tr", "en", "fa")
        assert s.parser in ("rss", "atom", "html", "html_text", "crossref", "arxiv", "s2", "hf", "none")
        assert s.licence and s.name
    daily = [s for s in S.SOURCES if s.enabled and s.kind in S.DAILY_KINDS]
    assert len(daily) >= 5
    assert all(s.parser != "hf" for s in daily)
    # organisation-level directories must never be a personal-data source
    for s in S.SOURCES:
        if s.kind == "directory":
            assert "personal data" in s.note.lower() or "KVKK" in s.note


def test_seeds_reuse_existing_hub_datasets() -> None:
    seeds = [s for s in S.SOURCES if s.kind == "seed"]
    assert len(seeds) >= 4
    assert any("WikiRAG-TR" in s.name for s in seeds)
    assert any("legislation" in s.name for s in seeds)
    assert all(s.url.startswith("https://huggingface.co/datasets/") for s in seeds)
