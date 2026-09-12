"""Polite fetching + parsing for the knowledge-base scraper. Stdlib only.

Every network call goes through :func:`fetch`, which enforces a minimum interval
between requests, retries with backoff, sends an identifying User-Agent and never
raises — a failed source is reported as a status so the run summary stays honest.

Parsers return a uniform list of dicts:
    {"title": str, "link": str, "published": str, "text": str, "authors": [str]}
"""

from __future__ import annotations

import gzip
import io
import json
import re
import ssl
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from html.parser import HTMLParser

USER_AGENT = (
    "StartupLandingKB/1.0 (+https://istanbul-startup-from-iran.pages.dev; research crawler, "
    "1 request per source per day, headlines and metadata only)"
)
MIN_INTERVAL = 1.0          # seconds between any two requests
MAX_BYTES = 4_000_000       # per response
_last_call = 0.0
_lock = threading.Lock()


class FetchResult:
    __slots__ = ("status", "text", "error", "url", "elapsed")

    def __init__(self, status: int, text: str = "", error: str = "", url: str = "", elapsed: float = 0.0) -> None:
        self.status = status
        self.text = text
        self.error = error
        self.url = url
        self.elapsed = elapsed

    @property
    def ok(self) -> bool:
        return 200 <= self.status < 300 and not self.error


def _throttle() -> None:
    global _last_call
    with _lock:
        wait = MIN_INTERVAL - (time.time() - _last_call)
        if wait > 0:
            time.sleep(wait)
        _last_call = time.time()


def fetch(url: str, params: dict | None = None, timeout: int = 25, tries: int = 3) -> FetchResult:
    """GET *url* (optionally with query params). Returns a FetchResult, never raises."""
    if params:
        url = url + ("&" if "?" in url else "?") + urllib.parse.urlencode(params)
    last_error = ""
    started = time.time()
    for attempt in range(1, tries + 1):
        _throttle()
        req = urllib.request.Request(url, headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/rss+xml, application/atom+xml, application/json, text/html;q=0.9, */*;q=0.5",
            "Accept-Encoding": "gzip",
            "Accept-Language": "tr,en;q=0.8,fa;q=0.6",
        })
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310 - fixed https URLs
                raw = resp.read(MAX_BYTES)
                if (resp.headers.get("Content-Encoding") or "").lower() == "gzip" or raw[:2] == b"\x1f\x8b":
                    raw = gzip.GzipFile(fileobj=io.BytesIO(raw)).read()
                charset = resp.headers.get_content_charset() or "utf-8"
                text = raw.decode(charset, errors="replace")
                return FetchResult(resp.status, text, "", url, time.time() - started)
        except urllib.error.HTTPError as exc:
            last_error = f"HTTP {exc.code}"
            if exc.code in (429, 503):                       # rate limited → back off and retry
                time.sleep(min(30, 3 * attempt ** 2))
                continue
            return FetchResult(exc.code, "", last_error, url, time.time() - started)
        except ssl.SSLCertVerificationError as exc:
            return FetchResult(0, "", f"tls: {exc.verify_message or exc}", url, time.time() - started)
        except Exception as exc:  # noqa: BLE001 - network paths are many
            last_error = f"{type(exc).__name__}: {exc}"
            time.sleep(2 * attempt)
    return FetchResult(0, "", last_error or "failed", url, time.time() - started)


# ------------------------------------------------------------------ HTML → text
class _TextExtract(HTMLParser):
    SKIP = {"script", "style", "noscript", "svg", "head"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.chunks: list[str] = []
        self.links: list[tuple[str, str]] = []
        self._skip = 0
        self._href = ""

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in self.SKIP:
            self._skip += 1
        if tag == "a" and a.get("href"):
            self._href = a["href"]
        if tag in ("p", "br", "li", "div", "h1", "h2", "h3", "h4", "tr"):
            self.chunks.append("\n")

    def handle_endtag(self, tag):
        if tag in self.SKIP and self._skip:
            self._skip -= 1
        if tag == "a" and self._href:
            text = " ".join("".join(self.chunks[-6:]).split())
            if text:
                self.links.append((text, self._href))
            self._href = ""

    def handle_data(self, data):
        if not self._skip and data.strip():
            self.chunks.append(data)


def html_to_text(html: str) -> str:
    p = _TextExtract()
    try:
        p.feed(html)
    except Exception:  # noqa: BLE001 - malformed markup is common
        pass
    return re.sub(r"\n{3,}", "\n\n", "".join(p.chunks)).strip()


def html_links(html: str, base_url: str, pattern: str | None = None, limit: int = 40) -> list[dict]:
    """Anchor text + absolute href from a listing page (optionally filtered)."""
    p = _TextExtract()
    try:
        p.feed(html)
    except Exception:  # noqa: BLE001
        pass
    out, seen = [], set()
    rx = re.compile(pattern) if pattern else None
    self_url = base_url.split("#")[0].rstrip("/")
    for text, href in p.links:
        href = href.strip()
        if href.startswith("#"):                       # in-page navigation
            continue
        url = urllib.parse.urljoin(base_url, href)
        if not url.startswith(("http://", "https://")) or url in seen:
            continue
        if "#" in url or url.split("#")[0].rstrip("/") == self_url:
            continue
        if rx and not rx.search(url):
            continue
        seen.add(url)
        out.append({"title": text[:300], "link": url, "published": "", "text": "", "authors": []})
        if len(out) >= limit:
            break
    return out


# ------------------------------------------------------------------- RSS / Atom
def _strip_ns(tag: str) -> str:
    return tag.rsplit("}", 1)[-1].lower()


def parse_feed(xml_text: str, base_url: str = "") -> list[dict]:
    """RSS 2.0 and Atom in one pass."""
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return []
    items: list[dict] = []
    for node in root.iter():
        if _strip_ns(node.tag) not in ("item", "entry"):
            continue
        rec = {"title": "", "link": "", "published": "", "text": "", "authors": []}
        for child in node:
            tag = _strip_ns(child.tag)
            value = (child.text or "").strip()
            if tag == "title":
                rec["title"] = _clean(value)
            elif tag == "link":
                rec["link"] = value or child.attrib.get("href", "")
            elif tag in ("description", "summary", "content", "encoded"):
                body = html_to_text(value) if "<" in value else value
                if len(body) > len(rec["text"]):
                    rec["text"] = _clean(body)
            elif tag in ("pubdate", "published", "updated", "date"):
                rec["published"] = value
            elif tag in ("creator", "author"):
                name = "".join(t.text or "" for t in child).strip()
                if name:
                    rec["authors"].append(_clean(name))
        if rec["link"] and base_url:
            rec["link"] = urllib.parse.urljoin(base_url, rec["link"])
        if rec["title"]:
            items.append(rec)
    return items


def parse_arxiv(xml_text: str) -> list[dict]:
    """arXiv Atom with authors, categories and the abstract as text."""
    out = []
    for rec in parse_feed(xml_text):
        out.append(rec)
    return out


# ------------------------------------------------------------------ JSON APIs
def parse_crossref(payload: str) -> list[dict]:
    try:
        data = json.loads(payload)
    except json.JSONDecodeError:
        return []
    out = []
    for it in (data.get("message", {}) or {}).get("items", []) or []:
        title = " ".join(it.get("title") or []) or ""
        abstract = html_to_text(it.get("abstract") or "")
        published = ""
        for key in ("published-print", "published-online", "issued", "created"):
            parts = (it.get(key) or {}).get("date-parts") or [[]]
            if parts and parts[0]:
                published = "-".join(str(p).zfill(2) if i else str(p) for i, p in enumerate(parts[0]))
                break
        out.append({
            "title": _clean(title),
            "link": it.get("URL") or (f"https://doi.org/{it['DOI']}" if it.get("DOI") else ""),
            "published": published,
            "text": _clean(abstract),
            "authors": [f"{a.get('given', '')} {a.get('family', '')}".strip() for a in (it.get("author") or [])][:12],
            "doi": it.get("DOI", ""),
        })
    return [r for r in out if r["title"]]


def parse_semantic_scholar(payload: str) -> list[dict]:
    try:
        data = json.loads(payload)
    except json.JSONDecodeError:
        return []
    out = []
    for it in data.get("data", []) or []:
        out.append({
            "title": _clean(it.get("title") or ""),
            "link": (it.get("externalIds") or {}).get("DOI", "") and f"https://doi.org/{it['externalIds']['DOI']}"
                    or f"https://www.semanticscholar.org/paper/{it.get('paperId', '')}",
            "published": str(it.get("year") or ""),
            "text": _clean(it.get("abstract") or ""),
            "authors": [a.get("name", "") for a in (it.get("authors") or [])][:12],
        })
    return [r for r in out if r["title"]]


def parse_hf(payload: str) -> list[dict]:
    """Hugging Face API responses (datasets/models search) → uniform records."""
    try:
        data = json.loads(payload)
    except json.JSONDecodeError:
        return []
    rows = data if isinstance(data, list) else data.get("items", [])
    out = []
    for it in rows or []:
        ident = it.get("id") or it.get("modelId") or ""
        if not ident:
            continue
        out.append({
            "title": _clean(ident),
            "link": f"https://huggingface.co/{'datasets/' if it.get('downloads') is not None and 'datasetId' not in it else ''}{ident}",
            "published": str(it.get("lastModified") or it.get("createdAt") or "")[:10],
            "text": _clean(f"downloads={it.get('downloads')} likes={it.get('likes')} tags={','.join((it.get('tags') or [])[:8])}"),
            "authors": [ident.split("/")[0]],
        })
    return out


# ---------------------------------------------------------------- PII / cleanup
_EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
_PHONE = re.compile(r"(?<!\d)(?:\+?\d{1,3}[-\s.]?)?(?:\(?0?\d{3}\)?[-\s.]?)\d{3}[-\s.]?\d{2}[-\s.]?\d{2}(?!\d)")
_TC_ID = re.compile(r"(?<!\d)\d{11}(?!\d)")          # Turkish national ID shape
_WS = re.compile(r"[ \t\u200f\u200e]{2,}")


def scrub_pii(text: str) -> tuple[str, int]:
    """Remove e-mail addresses, phone numbers and 11-digit ID numbers.

    KVKK: directory sources are organisation-level only — individual contact data
    never enters the knowledge base, even if a public page contains it.
    Returns (cleaned_text, number_of_removals).
    """
    removed = 0
    for rx, tag in ((_EMAIL, "[redacted-email]"), (_TC_ID, "[redacted-id]"), (_PHONE, "[redacted-phone]")):
        text, n = rx.subn(tag, text)
        removed += n
    return text, removed


def _clean(text: str) -> str:
    text = (text or "").replace("\u00a0", " ").replace("\u200b", "")
    text = _WS.sub(" ", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()
