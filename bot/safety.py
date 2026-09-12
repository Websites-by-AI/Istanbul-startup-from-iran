"""Legal AI Safety Principle (deck sections 12 + 13).

The platform explicitly separates **AI information** from **professional legal
advice**. This module is the enforcement layer:

* it detects immigration/legal-advice style requests,
* it strips or refuses *guarantee* language ("kimlik guaranteed", "100% visa"),
* it appends the mandatory trilingual disclaimer,
* it marks a reply as escalated so a licensed professional takes over.

The AI never decides the legally appropriate route. It prepares, organises and
routes information; the licensed lawyer decides.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

DISCLAIMER = {
    "en": (
        "⚖️ AI information — not legal advice.\n"
        "The AI Startup Navigator organises documents, questions and options. "
        "Only a licensed legal professional (a lawyer admitted to a Turkish Bar, or the "
        "authorised partner of the Iran–Türkiye Startup Legal Desk) determines the legally "
        "appropriate route for a specific client. No residence permit, work permit, kimlik, "
        "visa or company-registration outcome is guaranteed."
    ),
    "fa": (
        "⚖️ این اطلاعات توسط هوش مصنوعی تولید شده و مشاوره حقوقی نیست.\n"
        "هوش مصنوعی فقط اسناد، پرسش‌ها و گزینه‌ها را آماده و دسته‌بندی می‌کند. "
        "تعیین مسیر حقوقی مناسب هر پرونده فقط بر عهده وکیل دارای پروانه (عضو کانون وکلای ترکیه) "
        "یا شریک حقوقی میز Iran–Türkiye Startup Legal Desk است. "
        "هیچ نتیجه‌ای درباره اقامت، کیملیک، اجازه کار، ویزا یا ثبت شرکت تضمین نمی‌شود."
    ),
    "tr": (
        "⚖️ Bu bir yapay zekâ bilgilendirmesidir, hukuki tavsiye değildir.\n"
        "Yapay zekâ yalnızca belgeleri, soruları ve seçenekleri hazırlar ve yönlendirir. "
        "Somut olay için hukuken uygun yolu yalnızca ruhsatlı avukat (Türkiye Barolar Birliği'ne "
        "kayıtlı) veya Iran–Türkiye Startup Legal Desk yetkili hukuk ortağı belirler. "
        "Oturum izni, çalışma izni, kimlik, vize veya şirket kuruluşu sonucu garanti edilmez."
    ),
}

# Words that must never survive into an outbound reply.
GUARANTEE_PATTERNS = [
    r"\bguarantee[sd]?\b", r"\bguaranteed\b", r"\b100\s*%", r"\bassured\b",
    r"\btazmin\b", r"\bgaranti(r)?\b", r"\bkesin lik?e\b",
    r"تضمین", r"قطعی است", r"۱۰۰٪", r"100%", r"حتماً (?:می‌?گیرید|صادر می‌?شود)",
    r"\bwe will get you\b", r"\bki?ml?ik (?:alırız|veririz)\b",
]

# Requests that require a licensed human, not the AI.
ADVICE_TRIGGERS = {
    "immigration": [
        "kimlik", "kımlık", "kiymik", "اقامت", "کیملیک", "residence permit", "oturum izni",
        "work permit", "اجازه کار", "çalışma izni", "visa", "ویزا", "vize", "deport", "دیپورت",
        "citizenship", "شهروندی", "vatandaşlık", "tech visa", "turquoise card",
    ],
    "legal_advice": [
        "is it legal", "can i legally", "should i sign", "legal opinion", "مشاوره حقوقی",
        "نظر حقوقی", "hukuki görüş", "tax advice", "مالیات", "vergi", "lawsuit", "دادگاه",
        "dava", "contract review", "بررسی قرارداد", "sözleşme incelemesi",
    ],
    "entity_choice": [
        "which company type", "anonim şirket", "limited şirket", "a.ş.", "ltd", "joint stock",
        "subsidiary", "branch", "نوع شرکت", "ثبت شرکت", "şirket kur", "company formation",
        "shareholders agreement", "قرارداد سهامداران", "hissedarlar sözleşmesi",
        "ثبت", "شرکت", "تأسیس", "تاسیس", "şirket",
    ],
}

REFUSAL = {
    "en": (
        "I can't answer that one myself — it is a legal determination, not information.\n"
        "What I *can* do: prepare the document list, the questions the lawyer will ask and the "
        "possible structures, then route the file to the Iran–Türkiye Startup Legal Desk."
    ),
    "fa": (
        "پاسخ به این پرسش در صلاحیت من نیست؛ این یک تعیین‌کننده حقوقی است، نه اطلاعات.\n"
        "کاری که می‌توانم انجام دهم: فهرست مدارک، پرسش‌های وکیل و ساختارهای ممکن را آماده کنم "
        "و پرونده را به میز حقوقی Iran–Türkiye Startup Legal Desk ارجاع دهم."
    ),
    "tr": (
        "Bu soruyu kendim yanıtlayamam; bu bir hukuki takdir konusudur, bilgilendirme değildir.\n"
        "Yapabileceklerim: belge listesini, avukatın soracağı soruları ve olası yapıları hazırlayıp "
        "dosyayı Iran–Türkiye Startup Legal Desk'e yönlendirmek."
    ),
}


@dataclass
class SafetyReport:
    triggered: list[str] = field(default_factory=list)   # categories detected
    removed_guarantees: list[str] = field(default_factory=list)
    must_escalate: bool = False
    must_disclaim: bool = False
    refusal: bool = False

    @property
    def is_clean(self) -> bool:
        return not self.triggered and not self.removed_guarantees


# Turkish-only Latin letters (never appear in English) and high-frequency words.
TR_CHARS = ("ı", "ş", "ğ", "İ", "ö", "ü", "ç", "â", "î")
TR_WORDS = (
    "merhaba", "selam", "nasıl", "icin", "için", "şirket", "sirket", "türkiye", "turkiye",
    "avukat", "hukuk", "vize", "otel", "konaklama", "istiyoruz", "yapmalı", "var mı", "varmi",
    "başvuru", "basvuru", "değerlendirme", "oturum", "çalışma", "calisma", "yatırım", "yatirim",
    "sponsoru", "takım", "takim", "giriş", "giris", "belge",
)
# Extra Turkish markers: suffixes and question forms that carry no diacritics
# ("sponsor modelleri nelerdir" has no ı/ş/ğ but is unambiguously Turkish).
TR_WORDS_EXTRA = (
    "nelerdir", "nedir", "modelleri", "hakkında", "hakkinda", "kimler", "istiyorum", "göster", "goster", "hazırla", "hazirla", "aktar", "yolculuk", "adımlı", "adimli", "sunum", "ekosistem", "haritası", "haritasi", "metrikleri", "başarı", "basari", "ilerlet", "izlenmeli", "kurmak", "kuruluş", "kurulus", "lütfen", "lutfen", "teşekkür", "tesekkur", "mısın", "misin", "hangi", "gerekli", "belgeleri", "aşamaları", "asamalari", "sponsorlu", "ön değerlendirme", "on degerlendirme",
)
TR_WORDS = TR_WORDS + TR_WORDS_EXTRA


EN_WORDS = (
    " the ", " and ", " for ", " with ", " what ", " which ", " how ", " our ", " your ",
    " in ", " is ", " are ", " want ", " need ", " please ", " startup ", " legal ", " can ",
)


def detect_language(text: str, default: str = "en") -> str:
    """Small script + diacritic + stop-word language detector (fa / tr / en).

    It only drives the *language of the answer*; intent routing is separate.
    """
    if not text or not text.strip():
        return default
    # 1) Arabic script → Persian (the platform's source market)
    if re.search(r"[\u0600-\u06FF]", text):
        return "fa"
    low = f" {text.lower()} "
    tr_score = sum(1 for c in TR_CHARS if c in text) + sum(1 for w in TR_WORDS if w in low)
    en_score = sum(1 for w in EN_WORDS if w in low)
    if tr_score and tr_score >= en_score:
        return "tr"
    return "en"


def scan(text: str) -> list[str]:
    """Return the advice categories present in *text*."""
    low = text.lower()
    found: list[str] = []
    for category, keywords in ADVICE_TRIGGERS.items():
        if any(k.lower() in low for k in keywords):
            found.append(category)
    return found


# Our own compliance sentences contain the word "guaranteed" on purpose
# ("nothing is guaranteed"), so they must survive the stripper untouched.
PROTECTED_PHRASES = [
    "No guaranteed immigration result is promised.",
    "No guaranteed immigration result.",
    "No residence permit, work permit, kimlik, visa or company-registration outcome is guaranteed.",
    "No guarantee is given about any outcome.",
    "هیچ نتیجه‌ای درباره اقامت، کیملیک، اجازه کار، ویزا یا ثبت شرکت تضمین نمی‌شود.",
    "Oturum izni, çalışma izni, kimlik, vize veya şirket kuruluşu sonucu garanti edilmez.",
]

REDACTION = "[outcome not guaranteed]"

# A guarantee word directly preceded by a negation is a *disclaimer*, not a promise.
NEGATIONS = (
    "no", "not", "never", "none", "without", "isn't", "aren't", "cannot", "can't", "don't", "doesn't",
    "هیچ", "نه", "نمی", "بدون",
    "garanti edilmez", "edilmez", "yoktur", "değildir", "degildir",
)


def _is_negated(text: str, start: int, end: int) -> bool:
    """True when the matched promise is actually a negated statement.

    "we guarantee kimlik"  → promise  → redact
    "no outcome is guaranteed" → disclaimer → keep
    """
    tail = text[max(0, start - 60) : start].lower()
    if re.search(
        r"\b(?:no|none|not|nothing|nobody|never|neither|isn't|aren't|wasn't|cannot|can't|don't|doesn't|won't)\s+(?:\w+\s+){0,6}$",
        tail,
    ):
        return True
    after = text[end : end + 30].lower()
    if re.search(r"^\s*(?:\w+\s+){0,3}?(?:نمی|نمي|edilmez|yoktur|değildir|degildir|نیست)", after):
        return True
    return any(n in tail[-25:] for n in ("هیچ", "نه ", "نمی"))


def strip_guarantees(text: str) -> tuple[str, list[str]]:
    """Remove promise language, keep our own disclaimers. Returns (safe, removed)."""
    safe = text or ""
    removed: list[str] = []
    tokens: dict[str, str] = {}

    for i, phrase in enumerate(PROTECTED_PHRASES):
        if phrase and phrase in safe:
            token = f"\x00P{i}\x00"
            safe = safe.replace(phrase, token)
            tokens[token] = phrase

    for pattern in GUARANTEE_PATTERNS:
        def _sub(m: "re.Match[str]") -> str:
            if _is_negated(safe, m.start(), m.end()):
                return m.group(0)
            removed.append(m.group(0))
            return "\x00R\x00"

        safe = re.sub(pattern, _sub, safe, flags=re.IGNORECASE)

    safe = safe.replace("\x00R\x00", REDACTION)
    for token, phrase in tokens.items():
        safe = safe.replace(token, phrase)
    return safe, removed


def review(text: str, *, allow_general_info: bool = True) -> SafetyReport:
    """Classify an outbound/inbound text against the safety principle."""
    report = SafetyReport()
    low = (text or "").lower()

    report.triggered = scan(low)
    safe_text, removed = strip_guarantees(text or "")
    report.removed_guarantees = removed

    if removed:
        report.must_disclaim = True
        report.must_escalate = True

    # A hard promise about an immigration outcome is never allowed through.
    hard_promise = re.search(
        r"(?:guarantee\w*|تضمین|garanti\w*)\s*[^.\n]{0,40}(?:kimlik|ki?ml?ik|residence|اقامت|oturum|visa|ویزا|vize|work permit|اجازه کار|citizenship|شهروندی)",
        low,
    )
    if hard_promise:
        report.refusal = True
        report.must_escalate = True
        report.must_disclaim = True
    elif report.triggered:
        report.must_disclaim = True
        # immigration + entity_choice questions are the ones a lawyer must own
        if not allow_general_info or {"immigration", "legal_advice"} & set(report.triggered):
            report.must_escalate = True
    return report


def safe_reply(text: str, language: str = "en", report: SafetyReport | None = None) -> tuple[str, SafetyReport]:
    """Return a compliance-safe version of *text* plus its report."""
    report = report or review(text)
    safe, _ = strip_guarantees(text)
    if report.refusal:
        safe = f"{REFUSAL.get(language, REFUSAL['en'])}\n\n{safe}".strip()
    if report.must_disclaim or report.triggered:
        safe = f"{safe}\n\n---\n{DISCLAIMER.get(language, DISCLAIMER['en'])}"
    return safe, report


def classify_inbound(text: str, language: str = "en") -> tuple[list[str], bool]:
    """What an inbound message touches, and whether a human must be looped in."""
    report = review(text, allow_general_info=True)
    needs_human = report.must_escalate
    return report.triggered, needs_human
