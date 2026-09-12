"""RAG knowledge base for the Iran → Türkiye Startup Landing Platform.

One corpus, one dataset, one index — see `RAG.md` for the naming decisions.

    python3 -m rag.scrape --all --stats      # daily run: fetch → filter → chunk → dedup
    python3 -m rag.scrape --source aa_tr     # one source only
    python3 -m rag.publish --check           # dataset/space naming + HF readiness (next step: --push)

Modules
-------
sources     the source registry (news / academic / official / legislation / directory / seed datasets)
fetch       polite HTTP (timeouts, retries, rate limit) + RSS/Atom/HTML text extraction, stdlib only
scrape      the daily pipeline: fetch → relevance filter → chunk → dedup → JSONL knowledge base
publish     the single Hugging Face dataset/space contract (naming + readiness check)
"""

from __future__ import annotations

__all__ = ["sources", "fetch", "scrape", "publish"]
