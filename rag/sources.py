"""Source registry for the daily knowledge-base refresh.

Everything the RAG pipeline reads is declared here — one entry per source, with
its parser, language, licence and the status observed on the last manual probe
(2026-09-12). Adding a source = adding an entry; nothing else changes.

Kinds
-----
news        Turkish/English news feeds (RSS) — immigration, economy, startups
academic    papers/metadata (arXiv, Crossref, Semantic Scholar, DergiPark)
official    government announcements (Göç İdaresi, ministries, investment office)
legislation Resmi Gazete / mevzuat (law texts and amendments)
directory   bar associations, technoparks, accelerators — organisation level only
seed        existing Hugging Face datasets we reuse instead of re-collecting

⚠️ Personal data: `directory` sources are organisation-level only. We never store
individual lawyers' phone numbers, e-mail addresses or ID numbers — the Turkish
personal-data law (KVKK) and the bar associations' own rules apply. See RAG.md §7.
"""

from __future__ import annotations

import unicodedata
from dataclasses import dataclass, field


@dataclass(frozen=True)
class Source:
    key: str
    kind: str
    name: str
    url: str
    parser: str                       # rss | atom | html | crossref | arxiv | s2 | hf | none
    lang: str = "tr"
    licence: str = "see source"
    query: str = ""                   # API query, when the source is a search API
    probe: str = ""                   # last manual probe result, for honesty in the docs
    note: str = ""
    enabled: bool = True
    assume_relevant: bool = False     # query/source already guarantees topical relevance
    tags: tuple[str, ...] = field(default=())


# ------------------------------------------------------------------ live feeds
SOURCES: tuple[Source, ...] = (
    Source(
        key="aa_tr",
        kind="news",
        name="Anadolu Ajansı — güncel",
        url="https://www.aa.com.tr/tr/rss/default?cat=guncel",
        parser="rss",
        lang="tr",
        licence="© AA — headlines + link only, no full-text redistribution",
        probe="200 OK, 20 KB RSS (2026-09-12)",
        note="State news agency; the widest Turkish coverage.",
        tags=("news", "tr"),
    ),
    Source(
        key="aa_en",
        kind="news",
        name="Anadolu Ajansı — English (Türkiye)",
        url="https://www.aa.com.tr/en/rss/default?cat=turkiye",
        parser="rss",
        lang="en",
        licence="© AA — headlines + link only",
        tags=("news", "en"),
    ),
    Source(
        key="trt_tr",
        kind="news",
        name="TRT Haber — son dakika",
        url="https://www.trthaber.com/sondakika.rss",
        parser="rss",
        lang="tr",
        licence="© TRT — headlines + link only",
        probe="200 OK, 52 KB RSS (2026-09-12)",
        tags=("news", "tr"),
    ),
    Source(
        key="goc_duyurular",
        kind="official",
        name="Göç İdaresi Başkanlığı — duyurular",
        url="https://www.goc.gov.tr/duyurular",
        parser="html",
        lang="tr",
        licence="Public sector information; quote with link",
        probe="200 OK, 169 KB HTML — but the announcement list is rendered client-side by an "
              "`announcementList({...})` widget that POSTs to an internal endpoint, so the raw HTML "
              "only yields navigation + KVKK/cookie boilerplate (checked 2026-09-12).",
        note="Disabled until either that internal endpoint is reverse-engineered or a headless fetch "
             "is used. Immigration news still arrives daily through aa_tr / aa_en / trt_tr. "
             "TLS note: goc.gov.tr is served by the TÜBİTAK Kamu SM root — some runtimes do not "
             "trust it, so failures are recorded, never silently ignored.",
        enabled=False,
        tags=("official", "immigration", "tr"),
    ),
    Source(
        key="invest_office",
        kind="official",
        name="Invest in Türkiye — investment office",
        url="https://www.invest.gov.tr/",
        parser="html_text",
        lang="en",
        licence="Public promotional material; quote with link",
        probe="200 OK, 14.6 KB of text, passes the relevance filter (2026-09-12). "
              "/en-us/pages/news returns 404 — the root page is the working entry point.",
        tags=("official", "investment", "en"),
    ),
    Source(
        key="kosgeb",
        kind="official",
        name="KOSGEB — girişimci ve KOBİ destek programları",
        url="https://www.kosgeb.gov.tr/site/tr/genel/duyurular",
        parser="html",
        lang="tr",
        licence="Public sector information; quote with link",
        probe="200 OK, 24 usable programme/announcement links (2026-09-12)",
        note="Grants and support programmes that a landing startup may be eligible for. Listing pages "
             "yield titles only, so relevance is assumed (a Turkish state agency's own programme pages).",
        assume_relevant=True,
        tags=("official", "incentives", "tr"),
    ),
    Source(
        key="resmigazete",
        kind="legislation",
        name="Resmî Gazete — günlük",
        url="https://www.resmigazete.gov.tr/rss.xml",
        parser="rss",
        lang="tr",
        licence="Legislation texts are public (Resmî Gazete)",
        probe="TLS: server presents a *.tccb.gov.tr certificate with an incomplete chain — "
              "curl/python in the sandbox report 'unable to get local issuer certificate'. "
              "Keep enabled: the scraper records the failure and the seed dataset "
              "hasankursun/turkish-legislation-corpus covers the backfill.",
        assume_relevant=True,
        tags=("legislation", "tr"),
    ),
    Source(
        key="mevzuat",
        kind="legislation",
        name="Mevzuat Bilgi Sistemi (consolidated laws)",
        url="https://www.mevzuat.gov.tr/",
        parser="html",
        lang="tr",
        licence="Legislation texts are public",
        probe="TLS: same incomplete-chain problem as Resmî Gazete",
        assume_relevant=True,
        tags=("legislation", "tr"),
    ),
    # ------------------------------------------------------------- academic
    Source(
        key="arxiv_migration",
        kind="academic",
        name="arXiv — Türkiye / migration / entrepreneurship",
        url="https://arxiv.org/api/query",
        parser="arxiv",
        lang="en",
        query='all:Turkey AND (all:migration OR all:entrepreneurship OR all:"residence permit")',
        licence="arXiv metadata CC0; abstracts © the authors — link + short quote",
        probe="200 OK after following the redirect (2026-09-12)",
        tags=("academic", "en"),
    ),
    Source(
        key="crossref_startup",
        kind="academic",
        name="Crossref — startup / immigration / company law Türkiye",
        url="https://api.crossref.org/works",
        parser="crossref",
        lang="en",
        query="startup Turkey immigration company formation residence permit",
        licence="Crossref metadata CC0",
        probe="200 OK, 241k results for the seed query (2026-09-12). Metadata only — most rows "
              "have no abstract, so the API query itself is the relevance filter.",
        assume_relevant=True,
        tags=("academic", "en"),
    ),
    Source(
        key="s2_turkish_law",
        kind="academic",
        name="Semantic Scholar — Turkish law & migration",
        url="https://api.semanticscholar.org/graph/v1/paper/search",
        parser="s2",
        lang="en",
        query="Turkish immigration law foreign entrepreneur",
        licence="S2 API — metadata; abstracts © publishers",
        probe="429 without an API key — enabled but rate-limited to 1 request/run with backoff",
        enabled=False,
        note="Enable once a free S2 API key is available (SEMANTICSCHOLAR_API_KEY).",
        assume_relevant=True,
        tags=("academic", "en"),
    ),
    # ------------------------------------------------------------ directories
    Source(
        key="tbb",
        kind="directory",
        name="Türkiye Barolar Birliği — bar associations & announcements",
        url="https://www.barobirlik.org.tr/",
        parser="html",
        lang="tr",
        licence="Organisation-level public information only",
        probe="302 → error page for /rss (2026-09-12); scrape the announcement list instead",
        note="⚠️ No personal data: we store bar/firm names, city and public announcements — never "
             "individual lawyers' phone/e-mail/ID (KVKK).",
        tags=("directory", "legal", "tr"),
    ),
    Source(
        key="teknoparklar",
        kind="directory",
        name="Technoparks & accelerators (İstanbul/Ankara) — programme announcements",
        url="https://www.itucekirdek.com/",
        parser="html",
        lang="tr",
        licence="Public programme information",
        note="⚠️ Organisation level only — no personal data (KVKK): programme names, cities and "
             "public announcements, never individual contact details.",
        tags=("directory", "ecosystem", "tr"),
    ),
    # ------------------------------------------------------- HF seed datasets
    Source(
        key="hf_wikirag_tr",
        kind="seed",
        name="Metin/WikiRAG-TR",
        url="https://huggingface.co/datasets/Metin/WikiRAG-TR",
        parser="hf",
        lang="tr",
        licence="apache-2.0",
        probe="exists · 5 999 TR question/answer pairs built for RAG (2026-09-12)",
        note="Retrieval training/eval set — reuse, do not duplicate.",
        tags=("seed", "rag-eval", "tr"),
    ),
    Source(
        key="hf_legal_nli_tr",
        kind="seed",
        name="Turkish-NLI/legal_nli_TR_V1",
        url="https://huggingface.co/datasets/Turkish-NLI/legal_nli_TR_V1",
        parser="hf",
        lang="tr",
        licence="apache-2.0",
        probe="exists · 484 283 rows from Turkish commercial courts (2026-09-12)",
        tags=("seed", "legal", "tr"),
    ),
    Source(
        key="hf_legislation_tr",
        kind="seed",
        name="hasankursun/turkish-legislation-corpus",
        url="https://huggingface.co/datasets/hasankursun/turkish-legislation-corpus",
        parser="hf",
        lang="tr",
        licence="see dataset card",
        probe="exists · 33.6 MB JSONL of Turkish legislation (2026-09-12)",
        note="Backfills Resmî Gazete while that feed has TLS problems.",
        tags=("seed", "legislation", "tr"),
    ),
    Source(
        key="hf_legal_rag_tr",
        kind="seed",
        name="mtntasci/turkish-legal-rag",
        url="https://huggingface.co/datasets/mtntasci/turkish-legal-rag",
        parser="hf",
        lang="tr",
        licence="see dataset card",
        probe="exists (77 downloads) — the only 'turkish legal rag' dataset found (2026-09-12)",
        tags=("seed", "legal", "tr"),
    ),
    Source(
        key="hf_law_qa_tr",
        kind="seed",
        name="OrionCAF/turkish_law_qa_dataset",
        url="https://huggingface.co/datasets/OrionCAF/turkish_law_qa_dataset",
        parser="hf",
        lang="tr",
        licence="see dataset card",
        probe="exists · 130 downloads, 5 likes (2026-09-12); two re-uploads also exist",
        tags=("seed", "legal-qa", "tr"),
    ),
)

BY_KEY = {s.key: s for s in SOURCES}

# Searchable kinds are fetched by the daily run; `seed` and `directory` entries are
# documentation + one-off imports, not daily traffic.
DAILY_KINDS = ("news", "official", "legislation", "academic")

# ------------------------------------------------------------------- relevance
# A collected item only enters the knowledge base when it is about Türkiye (or Iran
# → Türkiye movement) AND about one of the platform's subjects. Both lists must hit.
GEO_TERMS = (
    "türkiye", "turkiye", "turkey", "istanbul", "ankara", "izmir", "antalya", "bursa",
    "ترکیه", "استانبول", "آنکارا", "türk", "turk", "iran", "ایران", "tehran", "تهران",
)
TOPIC_TERMS = (
    "startup", "start-up", "girişim", "girisim", "şirket", "sirket", "company", "ticaret",
    "investment", "yatırım", "yatirim", "fon", "fund", "venture", "teknopark", "technopark",
    "ar-ge", "arge", "r&d", "incubation", "kuluçka", "kulucka", "accelerator", "hızlandırıcı",
    "residence", "oturum", "ikamet", "work permit", "çalışma izni", "calisma izni", "visa",
    "vize", "ویزا", "kimlik", "کیملیک", "migration", "göç", "goc", "immigration", "yabancı",
    "yabanci", "foreign", "patent", "marka", "trademark", "fikri mülkiyet", "intellectual",
    "tax", "vergi", "teşvik", "tesvik", "incentive", "law", "kanun", "mevzuat", "yönetmelik",
    "regulation", "hukuk", "legal", "avukat", "lawyer", "بار", "kanton", "sanayi", "ihracat",
    "export", "istihdam", "employment", "asgari", "sermaye", "capital", "anonim", "limited",
    "şube", "branch", "irtibat", "liaison", "tech visa", "teknoloji vizesi",
    "استارتاپ", "شرکت", "اقامت", "سرمایه", "مالکیت فکری", "حقوقی", "وکیل",
)


# Turkish capital İ lowercases to "i̇" (i + U+0307) in Python, which silently breaks
# keyword matching — transliterate first, then casefold and drop the combining dot.
_TR_FOLD = str.maketrans({"İ": "i", "I": "ı", "Ş": "ş", "Ğ": "ğ", "Ü": "ü", "Ö": "ö", "Ç": "ç",
                          "Â": "â", "Î": "î"})


def normalize(text: str) -> str:
    """Lowercase for Turkish/Persian matching (İ→i, ZWNJ removed, marks folded)."""
    out = (text or "").translate(_TR_FOLD).lower().replace("\u0307", "")
    out = unicodedata.normalize("NFC", out)
    return out.replace("\u200c", " ").replace("\u200f", "")


def is_relevant(text: str) -> tuple[bool, list[str], list[str]]:
    """True when *text* mentions a geography term AND a topic term."""
    low = normalize(text)
    geo = [t for t in GEO_TERMS if t in low]
    topic = [t for t in TOPIC_TERMS if t in low]
    return bool(geo and topic), geo, topic


# --------------------------------------------------------------- HF contracts
# One dataset, one space, one vector index — never more (RAG.md §3).
HF_OWNER = "Websites-by-AI"                 # change to the real Hugging Face account/org
HF_DATASET = f"{HF_OWNER}/iran-turkiye-startup-landing-kb"
HF_SPACE = f"{HF_OWNER}/startup-landing-rag"

# Embedding + retrieval stack (existing models — we do not train or publish one).
EMBEDDING_EDGE = "@cf/baai/bge-m3"          # Workers AI: TR/FA/EN, 1024 dims ≤ Vectorize's 1536 cap
EMBEDDING_HF = "eneSadi/turkuaz-embeddings"  # Turkish retrieval-optimised, for offline/batch runs
EMBEDDING_HF_ALT = "nezahatkorkmaz/turkce-embedding-bge-m3"
RERANKER_EDGE = "@cf/baai/bge-reranker-base"
VECTOR_INDEX = "startup-landing-kb"         # Cloudflare Vectorize index name (one)
EVAL_DATASET = "Metin/WikiRAG-TR"           # reuse for retrieval evaluation
