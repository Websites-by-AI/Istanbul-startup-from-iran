# RAG + knowledge base — design, names and what exists already

Status: **research + scraper done** (this step). Embeddings, the Hugging Face dataset push and the
answer-wiring are the **next step** — everything they need is prepared and named here.

Rule from the brief: **one dataset, one space, one vector index.** Never several. The names live in
exactly one place — `rag/sources.py` — and every module imports them from there.

```
daily scraper ──► data/kb/<date>/*.jsonl ──► ONE HF dataset ──► ONE Vectorize index
   (rag/)              (provenance)          (snapshot)          (embeddings)
                                                                     │
                       bot + website  ◄── rag.retrieve() ◄───────────┘
                       (citations, safety filter, disclaimer)
```

---

## 1. What already exists (verified 2026-09-12 — reuse, do not duplicate)

### Embedding models on Hugging Face (Turkish-capable)

| Model | Dims | Notes |
|---|---|---|
| [`eneSadi/turkuaz-embeddings`](https://huggingface.co/eneSadi/turkuaz-embeddings) | XLM-R large | built for Turkish **information retrieval**; +20% over multilingual models on Turkish retrieval benchmarks, evaluated on WikiRAG-TR, MSMARCO-TR, XQuAD-TR, SQuAD-TR. 126 downloads, 7 likes — exists, public |
| [`nezahatkorkmaz/turkce-embedding-bge-m3`](https://huggingface.co/nezahatkorkmaz/turkce-embedding-bge-m3) | 1024 | Turkish fine-tune of BAAI/bge-m3, 8192-token context, sentence-transformers |
| `embeddingmagibu-200m` (alibayram) | 768 | TR-MTEB 63.9 mean, 8192 context, 200M params — best cost/quality trade-off for batch work |
| [`KocLab-Bilkent/BERTurk-Legal`](https://huggingface.co/KocLab-Bilkent/BERTurk-Legal) | 768 | **legal-domain** Turkish encoder (Yargıtay retrieval), 7.2k downloads/month |
| [`fkuyumcu/turkish-wiki-rag-embeddings-v2`](https://huggingface.co/fkuyumcu/turkish-wiki-rag-embeddings-v2) | 384 | fine-tuned on WikiRAG-TR, small and fast |

**Decision:** no new model is trained or published for this project. Edge queries use Workers AI
`@cf/baai/bge-m3` (multilingual TR/FA/EN, 1024 dims, cheapest at 1075 neurons/M tokens); offline
batch embedding of the dataset uses `eneSadi/turkuaz-embeddings` with `KocLab-Bilkent/BERTurk-Legal`
as the legal-domain comparator. `@cf/baai/bge-reranker-base` re-ranks the top-K.

### Datasets on Hugging Face

| Dataset | Size | Use |
|---|---|---|
| [`Metin/WikiRAG-TR`](https://huggingface.co/datasets/Metin/WikiRAG-TR) | 5 999 QA pairs, apache-2.0 | Turkish **RAG evaluation** set — reused as-is for retrieval metrics |
| [`Turkish-NLI/legal_nli_TR_V1`](https://huggingface.co/datasets/Turkish-NLI/legal_nli_TR_V1) | 484 283 rows from Turkish commercial courts, apache-2.0 | legal-language seed / hard negatives |
| [`hasankursun/turkish-legislation-corpus`](https://huggingface.co/datasets/hasankursun/turkish-legislation-corpus) | 33.6 MB JSONL legislation | legislation backfill (see §3 caveats) |
| [`mtntasci/turkish-legal-rag`](https://huggingface.co/datasets/mtntasci/turkish-legal-rag) | small | the only "turkish legal rag" dataset found |
| [`OrionCAF/turkish_law_qa_dataset`](https://huggingface.co/datasets/OrionCAF/turkish_law_qa_dataset) | QA | Turkish law QA (+2 re-uploads by other users) |

### The gap this project fills (searched, not assumed)

Hub searches returning **nothing** on 2026-09-12: `turkish residence permit`, `iran turkey migration`,
`turkiye startup`, `startup landing`. So there is no existing corpus for *Iran → Türkiye startup
landing* (immigration procedure + company formation + sponsorship + academic work). Exactly **one**
new dataset is created for it; everything above is reused.

---

## 2. The names (single instances)

| Resource | Name | Where |
|---|---|---|
| HF dataset | `Websites-by-AI/iran-turkiye-startup-landing-kb` | one dataset, configs `news / academic / official / legislation / directory`, splits `chunks / sources / runs` |
| HF space | `Websites-by-AI/startup-landing-rag` | **only if** a hosted embedder/answer endpoint is wanted; retrieval on Cloudflare needs no space |
| Vector index | `startup-landing-kb` | Cloudflare Vectorize (≤1536 dims, 10M vectors/index) |
| Evaluation | `Metin/WikiRAG-TR` | reused |

`Websites-by-AI` is the GitHub organisation; the Hub returned **401** for that namespace, i.e. it does
not exist on Hugging Face yet. Before the push step, either create that HF org or set `HF_OWNER` in
`rag/sources.py` to the real account — one line, nothing else changes.

```bash
python3 -m rag.publish --check      # prints names, Hub status, duplicate scan, next steps
```

---

## 3. Daily scraper (built and running)

```bash
python3 -m rag.scrape --all --dry-run     # count only
python3 -m rag.scrape --all               # writes data/kb/<date>/*.jsonl + seen.json + manifest.json
python3 -m rag.scrape --source aa_tr --limit 25 --json
```

Pipeline: **fetch → relevance filter → PII scrub → sentence-aware chunking (900 chars, 120 overlap) →
dedup → JSONL**. First live run (2026-09-12): **48 chunks** from 3 sources in one pass; a full run
reached 84 chunks across 8 sources.

Every chunk keeps provenance so an answer can cite it and a human can verify it:

```json
{"id":"20d649db5ea75bbd60a2","chunk_id":"20d649db5ea75bbd60a2#0","source":"arxiv_migration",
 "kind":"academic","lang":"en","licence":"arXiv metadata CC0; abstracts © the authors — link + short quote",
 "url":"https://arxiv.org/pdf/2201.03543v1","title":"Investigating internal migration …: An application to Turkey",
 "authors":["Furkan Gürsoy","Bertan Badur"],"published":"2022-01-10T18:58:02Z",
 "scraped_at":"2026-09-12T08:43:30+00:00","text":"…","chars":878,
 "geo_hits":["turkey"],"topic_hits":["migration","startup"]}
```

### Source status (probed live on 2026-09-12)

| Source | Kind | Status |
|---|---|---|
| Anadolu Ajansı TR / EN (RSS) | news | ✅ 200 — 29 / 30 items |
| TRT Haber (RSS) | news | ✅ 200 — 50 items |
| arXiv API | academic | ✅ 200 (needs redirect following) — 7/9 relevant |
| Crossref API | academic | ✅ 200 — 241k results for the seed query |
| KOSGEB destek programları | official | ✅ 200 — 24 usable programme links |
| Invest in Türkiye (`invest.gov.tr`) | official | ✅ 200 via `html_text` (the `/en-us/pages/news` path is 404) |
| Göç İdaresi duyurular | official | ⏸️ **disabled** — the announcement list is rendered by a client-side `announcementList({...})` widget; raw HTML only yields navigation + KVKK boilerplate. Needs the internal endpoint or a headless fetch. Immigration news still arrives via AA/TRT |
| Resmî Gazete, Mevzuat (Bilgi Sistemi) | legislation | ⚠️ TLS: both serve a `*.tccb.gov.tr` certificate with an incomplete chain → `CERTIFICATE_VERIFY_FAILED` from this environment. Failures are **recorded, never ignored**; `hasankursun/turkish-legislation-corpus` covers the backfill |
| Semantic Scholar | academic | ⏸️ 429 without an API key → enable with `SEMANTICSCHOLAR_API_KEY` |
| Türkiye Barolar Birliği, technoparks | directory | organisation-level only (see §7) |

`goc.gov.tr` is served from the **TÜBİTAK Kamu SM** root CA, which not every runtime trusts — the
scraper reports that honestly instead of silently skipping it.

---

## 4. Running it every day

Cloudflare **Pages Functions have no `scheduled` handler** (cron requires a Worker), so pick one:

| Option | How | Cost | Notes |
|---|---|---|---|
| **A. Worker cron** (recommended) | one tiny Worker `startup-kb-scraper`, `triggers.crons = ["30 4 * * *"]`, fetches → writes chunks to Vectorize/D1 → pushes the daily snapshot to the HF dataset | Workers Free: 100k req/day; Workers AI free: 10k neurons/day (≈ a few hundred chunks/day) | the only fully serverless path; needs Workers:Edit on the API token |
| **B. Authenticated refresh endpoint** | `POST /api/rag/refresh` with a secret, called by any external cron (cron-job.org, GitHub schedule, a VPS crontab) | free | keeps everything inside the existing Pages project |
| **C. Self-hosted service** | `python -m rag.scrape --all` from `cron`/systemd on the VPS that already runs `bot/run.py` | free | also the only option that can deep-fetch JS-rendered pages (Playwright) |

`deploy.sh` already reads tokens from the environment only, so any option can be added without
committing a credential.

---

## 5. Next step: push + embeddings (exact sequence)

```bash
export HF_TOKEN=hf_...                              # write scope
pip install -U "huggingface_hub[cli]" datasets
python3 -m rag.publish --check                      # confirms names + shows what is missing

# 1) create the ONE dataset (idempotent)
python3 - <<'PY'
from huggingface_hub import HfApi
from rag import sources as S
api = HfApi(token=os.environ["HF_TOKEN"])
api.create_repo(S.HF_DATASET, repo_type="dataset", exist_ok=True)
PY

# 2) upload the daily snapshot as parquet/jsonl per config (kind) and a runs split
#    data/kb/<date>/*.jsonl → configs news|academic|official|legislation|directory

# 3) embed once per day with Workers AI @cf/baai/bge-m3 and upsert into Vectorize
#    (or offline with eneSadi/turkuaz-embeddings for the batch, then upsert)

# 4) evaluate retrieval on Metin/WikiRAG-TR before switching anything on
```

## 6. How the bot and website will consume it (next step)

* `rag/retrieve.py` → `search(query, lang, k=5)` → hybrid: Vectorize cosine top-20 →
  `@cf/baai/bge-reranker-base` → top-5, filtered by `lang` and `kind`.
* `POST /api/rag/query` (edge) and `GET /api/kb/stats`, mirroring `bot/server.py` exactly like the
  other endpoints do; the Python service keeps a local BM25 fallback so a VPS install works offline.
* `bot/core.handle()` injects retrieved chunks as *context*, not as advice: the answer still ends with
  the EN/FA/TR disclaimer, and retrieved text passes through `bot/safety.stripGuarantees()` — a
  news article that says "residence is guaranteed" must never reach a user unfiltered.
* Citations are mandatory in the UI and in channel replies: title + source + date + link.
* Website: the AI Navigator widget gets a "sources" line under each answer (it already carries
  `session`/`chat_id`, no other change needed).

## 7. Legal / KVKK guardrails (non-negotiable)

* **No personal data.** Directory sources are organisation-level: bar/firm names, city, public
  announcements. `rag/fetch.scrub_pii()` strips e-mail addresses, phone numbers and 11-digit ID
  numbers from *every* chunk before it is stored (tested in `tests/test_rag.py`).
* **Copyright.** News feeds are stored as headline + short quote + link; `licence` is recorded on
  every chunk. Academic metadata from Crossref/arXiv is CC0; abstracts stay short and attributed.
* **No legal advice.** Retrieval changes *sourcing*, never responsibility: a licensed lawyer (Turkish
  Bar member) or the authorised Legal Desk partner still determines the route. Nothing in the KB may
  be presented as a guarantee of residence, work permit, kimlik, visa or company registration.
* **Robots & rate.** One request per source per day, 1 s minimum interval, identifying User-Agent
  with a contact URL, 429/503 back-off, hard 4 MB response cap.

## 8. Tests

```bash
python3 -m pytest tests/test_rag.py -q      # 18 offline tests: parsers, chunking, PII, dedup, names
python3 -m rag.scrape --all --dry-run       # live smoke test of every enabled source
python3 -m rag.publish --check              # Hub names + duplicate scan
```
