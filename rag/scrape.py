#!/usr/bin/env python3
"""Daily knowledge-base refresh — fetch, filter, chunk, dedup, store.

    python3 -m rag.scrape --all                # every enabled daily source
    python3 -m rag.scrape --source aa_tr --limit 25
    python3 -m rag.scrape --all --dry-run      # no writes, prints the stats
    python3 -m rag.scrape --all --json         # machine-readable summary

Output layout (all inside data/kb/, gitignored):

    data/kb/2026-09-12/aa_tr.jsonl       one JSON object per chunk
    data/kb/seen.json                    dedup index (chunk owner → first seen)
    data/kb/manifest.json                last run summary per source

Each chunk record:
    id, chunk_id, source, kind, lang, licence, url, title, authors, published,
    scraped_at, text, chars, geo_hits, topic_hits

The knowledge base is *evidence with provenance*: every chunk keeps its URL,
publication date and licence, so an answer can cite it and a human can verify it.
Nothing here produces legal advice — retrieved text is still passed through
bot/safety.py before it reaches a user (see RAG.md §6).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from rag import fetch as F                     # noqa: E402
from rag import sources as S                   # noqa: E402

KB_DIR = ROOT / "data" / "kb"
CHUNK_CHARS = 900
CHUNK_OVERLAP = 120
MAX_SEEN = 200_000


@dataclass
class Chunk:
    id: str
    chunk_id: str
    source: str
    kind: str
    lang: str
    licence: str
    url: str
    title: str
    authors: list[str]
    published: str
    scraped_at: str
    text: str
    chars: int
    geo_hits: list[str] = field(default_factory=list)
    topic_hits: list[str] = field(default_factory=list)


def chunk_text(text: str, size: int = CHUNK_CHARS, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """Sentence-aware chunking with overlap; never splits inside a word."""
    text = re.sub(r"\s+", " ", (text or "")).strip()
    if not text:
        return []
    if len(text) <= size:
        return [text]
    sentences = re.split(r"(?<=[.!?…۔])\s+", text)
    out: list[str] = []
    buf = ""
    for sentence in sentences:
        if len(sentence) > size:                       # one huge sentence → hard split
            for i in range(0, len(sentence), size - overlap):
                out.append(sentence[i:i + size].strip())
            continue
        if buf and len(buf) + len(sentence) + 1 > size:
            out.append(buf.strip())
            tail = buf[-overlap:] if overlap else ""
            buf = (tail + " " + sentence).strip() if tail else sentence
        else:
            buf = (buf + " " + sentence).strip()
    if buf:
        out.append(buf.strip())
    return [c for c in out if c]


def record_id(url: str, title: str) -> str:
    return hashlib.sha1(f"{url.strip().lower()}|{title.strip().lower()}".encode()).hexdigest()[:20]


def load_seen() -> dict[str, str]:
    path = KB_DIR / "seen.json"
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except json.JSONDecodeError:
        return {}


def save_seen(seen: dict[str, str]) -> None:
    KB_DIR.mkdir(parents=True, exist_ok=True)
    if len(seen) > MAX_SEEN:                            # keep the most recent entries
        seen = dict(sorted(seen.items(), key=lambda kv: kv[1], reverse=True)[:MAX_SEEN])
    (KB_DIR / "seen.json").write_text(json.dumps(seen, ensure_ascii=False), encoding="utf-8")


# --------------------------------------------------------------- per-source collect
def collect(source: S.Source, limit: int = 25) -> tuple[list[dict], str]:
    """Return (raw_items, error). Raw items use the uniform parser dict shape."""
    if source.parser == "none":
        return [], "parser=none (documentation-only source)"
    if source.parser == "hf":
        return [], "seed dataset — import with `datasets` on demand, not scraped daily"

    if source.parser == "crossref":
        res = F.fetch(source.url, {
            "query": source.query, "rows": min(limit, 20), "select": "title,abstract,URL,DOI,author,issued",
        })
        return (F.parse_crossref(res.text), res.error) if res.ok else ([], res.error or f"HTTP {res.status}")

    if source.parser == "s2":
        res = F.fetch(source.url, {"query": source.query, "limit": min(limit, 20), "fields": "title,abstract,year,authors,externalIds"})
        return (F.parse_semantic_scholar(res.text), res.error) if res.ok else ([], res.error or f"HTTP {res.status}")

    if source.parser == "arxiv":
        res = F.fetch(source.url, {"search_query": source.query, "start": 0, "max_results": min(limit, 20)})
        return (F.parse_arxiv(res.text), res.error) if res.ok else ([], res.error or f"HTTP {res.status}")

    res = F.fetch(source.url)
    if not res.ok:
        return [], res.error or f"HTTP {res.status}"
    if source.parser in ("rss", "atom"):
        return F.parse_feed(res.text, source.url), ""
    if source.parser == "html_text":
        text = F.html_to_text(res.text)
        if not text:
            return [], "no text extracted"
        return [{"title": source.name, "link": source.url, "published": "",
                 "text": text[:20000], "authors": []}], ""
    if source.parser == "html":
        pattern = {
            "goc_duyurular": r"/duyuru|/haber|detay",
            "kosgeb": r"destekdetay|duyuru|haber",
            "tbb": r"/Haber|/Duyuru|Detay",
            "teknoparklar": r"/(haber|duyuru|blog|program)",
        }.get(source.key)
        items = F.html_links(res.text, source.url, pattern, limit=limit)
        if not items:                                    # fall back to the page text itself
            text = F.html_to_text(res.text)
            if text:
                items = [{"title": source.name, "link": source.url, "published": "", "text": text[:6000], "authors": []}]
        return items, ""
    return [], f"unknown parser {source.parser!r}"


def build_chunks(item: dict, source: S.Source, now: str) -> list[Chunk] | None:
    """Filter for relevance, scrub personal data, then chunk."""
    title = (item.get("title") or "").strip()
    body = (item.get("text") or "").strip()
    blob = f"{title}\n{body}"
    relevant, geo, topic = S.is_relevant(blob)
    if not relevant and not source.assume_relevant:
        return None
    body, removed = F.scrub_pii(body)
    title, _ = F.scrub_pii(title)
    pieces = chunk_text(body) or [title]
    rid = record_id(item.get("link") or source.url, title)
    out = []
    for i, piece in enumerate(pieces):
        out.append(Chunk(
            id=rid, chunk_id=f"{rid}#{i}", source=source.key, kind=source.kind, lang=source.lang,
            licence=source.licence, url=item.get("link") or source.url, title=title[:300],
            authors=list(item.get("authors") or [])[:12], published=(item.get("published") or "")[:32],
            scraped_at=now, text=piece, chars=len(piece), geo_hits=geo[:6], topic_hits=topic[:8],
        ))
    if removed:
        out[0].text = out[0].text  # PII already scrubbed above
    return out


def run(keys: list[str] | None = None, limit: int = 25, dry_run: bool = False,
        out_dir: Path | None = None, max_chunks: int = 4000) -> dict:
    """Run the daily refresh. Returns a manifest dict."""
    now = datetime.now(timezone.utc)
    stamp = now.isoformat(timespec="seconds")
    day = now.strftime("%Y-%m-%d")
    target = (out_dir or KB_DIR) / day
    selected = [S.BY_KEY[k] for k in keys] if keys else [
        s for s in S.SOURCES if s.enabled and s.kind in S.DAILY_KINDS
    ]
    seen = {} if dry_run else load_seen()
    manifest: dict = {"run_at": stamp, "day": day, "dry_run": dry_run, "output": str(target), "sources": []}
    total_new = 0

    for source in selected:
        items, error = collect(source, limit=limit)
        relevant = new = dropped = 0
        records: list[dict] = []
        for item in items:
            chunks = build_chunks(item, source, stamp)
            if chunks is None:
                dropped += 1
                continue
            relevant += 1
            for ch in chunks:
                if ch.chunk_id in seen:
                    continue
                seen[ch.chunk_id] = stamp
                records.append(asdict(ch))
                new += 1
                if total_new + new > max_chunks:
                    break
        if records and not dry_run:
            target.mkdir(parents=True, exist_ok=True)
            path = target / f"{source.key}.jsonl"
            with path.open("a", encoding="utf-8") as fh:
                for rec in records:
                    fh.write(json.dumps(rec, ensure_ascii=False) + "\n")
        total_new += new
        manifest["sources"].append({
            "source": source.key, "kind": source.kind, "name": source.name,
            "fetched": len(items), "relevant": relevant, "not_relevant": dropped,
            "new_chunks": new, "error": error,
        })

    manifest["total_new_chunks"] = total_new
    manifest["seen_entries"] = len(seen)
    if not dry_run:
        KB_DIR.mkdir(parents=True, exist_ok=True)
        save_seen(seen)
        (KB_DIR / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return manifest


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--all", action="store_true", help="every enabled daily source (default)")
    ap.add_argument("--source", action="append", default=[], help="run one source key (repeatable)")
    ap.add_argument("--limit", type=int, default=25, help="items per source (default 25)")
    ap.add_argument("--dry-run", action="store_true", help="fetch and count, write nothing")
    ap.add_argument("--out", default=None, help="output directory (default data/kb)")
    ap.add_argument("--json", action="store_true", help="print the manifest as JSON")
    args = ap.parse_args()

    keys = args.source or None
    if keys:
        unknown = [k for k in keys if k not in S.BY_KEY]
        if unknown:
            print(f"unknown source(s): {unknown}\nknown: {', '.join(sorted(S.BY_KEY))}", file=sys.stderr)
            return 2

    manifest = run(keys=keys, limit=args.limit, dry_run=args.dry_run,
                   out_dir=Path(args.out) if args.out else None)
    if args.json:
        print(json.dumps(manifest, ensure_ascii=False, indent=2))
        return 0
    print(f"knowledge base run {manifest['run_at']} · dry_run={manifest['dry_run']}")
    for row in manifest["sources"]:
        status = f"error: {row['error']}" if row["error"] else (
            f"{row['fetched']} fetched → {row['relevant']} relevant → {row['new_chunks']} new chunks"
        )
        print(f"  {row['source']:<16}{row['kind']:<12}{status}")
    print(f"total new chunks: {manifest['total_new_chunks']} · dedup index: {manifest['seen_entries']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
