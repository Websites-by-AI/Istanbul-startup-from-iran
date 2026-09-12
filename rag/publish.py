#!/usr/bin/env python3
"""The single Hugging Face contract for this project — naming + readiness check.

    python3 -m rag.publish --check          # what exists, what is named, what is missing
    python3 -m rag.publish --check --json

Rule (from the project brief): **one dataset, one space, one vector index** for this
project — never several. This module is the only place those names are defined; the
scraper, the future embedding step and the bot all import them from
`rag.sources` (`HF_DATASET`, `HF_SPACE`, `VECTOR_INDEX`).

`--push` (uploading the daily snapshot to the dataset) is intentionally NOT
implemented yet: it is the next step and needs an HF token with write access.
The exact call sequence it will use is documented in RAG.md §5.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from rag import sources as S  # noqa: E402
from rag.fetch import fetch   # noqa: E402

HF_API = "https://huggingface.co/api"

# One dataset, several configs — the daily snapshots stay queryable by kind/date.
DATASET_CONFIGS = ("news", "academic", "official", "legislation", "directory")
DATASET_SPLITS = ("chunks", "sources", "runs")


def exists(kind: str, repo_id: str) -> dict:
    """Ask the Hub whether a repo exists. `kind` = datasets | models | spaces."""
    res = fetch(f"{HF_API}/{kind}/{repo_id}", tries=2)
    if res.status == 404:
        return {"exists": False, "status": 404}
    if not res.ok:
        return {"exists": None, "status": res.status, "error": res.error}
    try:
        data = json.loads(res.text)
    except json.JSONDecodeError:
        return {"exists": None, "status": res.status, "error": "unparsable response"}
    return {
        "exists": True,
        "status": res.status,
        "id": data.get("id"),
        "last_modified": data.get("lastModified"),
        "downloads": data.get("downloads"),
        "likes": data.get("likes"),
        "private": data.get("private"),
    }


def duplicates(search: str, kind: str = "datasets", limit: int = 10) -> list[str]:
    """Names already taken by someone else — checked so we do not create a second one."""
    res = fetch(f"{HF_API}/{kind}", {"search": search, "limit": limit}, tries=2)
    if not res.ok:
        return []
    try:
        return [x.get("id", "") for x in json.loads(res.text) if x.get("id")]
    except json.JSONDecodeError:
        return []


def kb_stats() -> dict:
    kb = ROOT / "data" / "kb"
    files = sorted(kb.glob("*/*.jsonl"))
    chunks = sum(1 for f in files for _ in f.open(encoding="utf-8"))
    manifest = kb / "manifest.json"
    return {
        "kb_dir": str(kb.relative_to(ROOT)) if kb.exists() else "",
        "snapshot_days": len({f.parent.name for f in files}),
        "jsonl_files": len(files),
        "chunks": chunks,
        "manifest": json.loads(manifest.read_text(encoding="utf-8")) if manifest.exists() else None,
        "seen_entries": len(json.loads((kb / "seen.json").read_text(encoding="utf-8")))
        if (kb / "seen.json").exists() else 0,
    }


def check() -> dict:
    token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")
    report: dict = {
        "names": {
            "dataset": S.HF_DATASET,
            "space": S.HF_SPACE,
            "vector_index": S.VECTOR_INDEX,
            "embedding_edge": S.EMBEDDING_EDGE,
            "embedding_hf": S.EMBEDDING_HF,
            "embedding_hf_alt": S.EMBEDDING_HF_ALT,
            "reranker": S.RERANKER_EDGE,
            "eval_dataset": S.EVAL_DATASET,
        },
        "hf_token_present": bool(token),
        "knowledge_base": kb_stats(),
        "hub": {},
        "duplicate_scan": {},
        "next_step": [],
    }
    report["hub"]["dataset"] = exists("datasets", S.HF_DATASET)
    report["hub"]["space"] = exists("spaces", S.HF_SPACE)
    report["hub"]["embedding_model"] = exists("models", S.EMBEDDING_HF)
    report["hub"]["eval_dataset"] = exists("datasets", S.EVAL_DATASET)

    # The point of the scan: prove we are reusing what exists and adding only ONE dataset.
    for term in ("turkish legal rag", "turkish residence permit", "iran turkey migration",
                 "turkiye startup", "turkish law qa"):
        report["duplicate_scan"][term] = duplicates(term)

    if report["hub"]["dataset"].get("exists") is not True:
        report["next_step"].append(
            f"create the single dataset `{S.HF_DATASET}` (configs: {', '.join(DATASET_CONFIGS)}; "
            f"splits: {', '.join(DATASET_SPLITS)})")
    if not token:
        report["next_step"].append("export HF_TOKEN (write scope) — required to push the daily snapshot")
    if report["hub"]["space"].get("exists") is not True:
        report["next_step"].append(
            f"only if a hosted embedder/answer endpoint is wanted: one space `{S.HF_SPACE}` "
            "(otherwise retrieval runs on Cloudflare Workers AI + Vectorize and no space is needed)")
    report["next_step"].append("wire rag.retrieve into bot/core.handle + POST /api/rag/query (RAG.md §6)")
    report["next_step"].append("schedule the daily run (RAG.md §4: Worker cron or POST /api/rag/refresh)")
    return report


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true", help="report names, Hub status and duplicates")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--push", action="store_true", help="upload the snapshot (implemented in the next step)")
    args = ap.parse_args()

    if args.push:
        print("push is deliberately not implemented yet — see RAG.md §5 for the exact sequence.", file=sys.stderr)
        return 3
    if not args.check:
        ap.print_help()
        return 0

    report = check()
    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 0

    n = report["names"]
    print("\nOne dataset · one space · one vector index (never more)")
    print(f"  dataset        {n['dataset']}")
    print(f"  space          {n['space']}   (only if a hosted endpoint is wanted)")
    print(f"  vector index   {n['vector_index']}   (Cloudflare Vectorize, ≤1536 dims)")
    print(f"  embeddings     {n['embedding_edge']} on the edge · {n['embedding_hf']} offline")
    print(f"  reranker       {n['reranker']}")
    print(f"  evaluation     {n['eval_dataset']} (reused, not re-created)")

    kb = report["knowledge_base"]
    print(f"\nlocal knowledge base: {kb['chunks']} chunks · {kb['jsonl_files']} files · "
          f"{kb['snapshot_days']} day(s) · dedup index {kb['seen_entries']}")

    print("\nHub status")
    for key, value in report["hub"].items():
        state = {True: "EXISTS", False: "not created", None: "unknown"}[value.get("exists")]
        extra = ""
        if value.get("exists"):
            extra = f" · downloads={value.get('downloads')} likes={value.get('likes')} modified={str(value.get('last_modified'))[:10]}"
        elif value.get("error"):
            extra = f" · {value.get('error')}"
        print(f"  {key:<16}{state}{extra}")

    print("\nAlready on the Hub (reuse instead of duplicating)")
    for term, ids in report["duplicate_scan"].items():
        print(f"  {term:<26}{', '.join(ids[:4]) if ids else '(nothing)'}")

    print(f"\nHF_TOKEN present: {report['hf_token_present']}")
    print("\nNext step")
    for i, step in enumerate(report["next_step"], 1):
        print(f"  {i}. {step}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
