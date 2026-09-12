"""AI Startup Navigator — intent routing + answer composition (deck §11, §12).

Rule-based (deterministic, offline-testable) intent classifier that understands
English, Persian and Turkish. It *prepares, organises and routes* — it never
gives legal advice (see :mod:`bot.safety`).
"""

from __future__ import annotations

import re
from dataclasses import dataclass

INTENTS: dict[str, list[str]] = {
    "greeting": ["hello", "hi ", "hey", "salam", "سلام", "درود", "merhaba", "selam", "good morning", "صبح بخیر", "خوش آمد"],
    "help": ["help", "menu", "commands", "کمک", "راهنما", "دستور", "yardım", "menü", "what can you do", "چه کاری"],
    "legal_desk": [
        "legal desk", "legal landing", "lawyer", "legal partner", "میز حقوقی", "وکیل", "حقوقی",
        "avukat", "hukuk", "hukuki", "legal", "bar association", "کانون وکلا",
    ],
    "intake": [
        "intake", "apply", "register my startup", "submit", "فرم", "ثبت نام", "درخواست", "نام‌نویسی",
        "başvuru", "kayıt", "form", "start application", "شروع",
    ],
    "assessment": [
        "assessment", "assessment score", "ready", "readiness", "ارزیابی", "آمادگی", "سنجش",
        "değerlendirme", "hazır mı", "pre-landing",
    ],
    "company_formation": [
        "company formation", "register a company", "şirket kur", "limited şirket", "anonim şirket",
        "ثبت شرکت", "تاسیس شرکت", "تأسیس شرکت", "subsidiary", "branch", "شرکت ترکیه", "a.ş.", "ltd",
        "ثبت", "شرکت", "تأسیس", "تاسیس", "şirket", "company", "register", "ثبت کنم", "company in turkey",
    ],
    "residence": [
        "kimlik", "kımlık", "residence permit", "oturum", "visa", "ویزا", "اقامت", "کیملیک", "vize",
        "work permit", "اجازه کار", "çalışma izni", "ikamet",
    ],
    "ip": ["ip ", "intellectual property", "trademark", "patent", "مالکیت فکری", "علامت تجاری", "fikri mülkiyet", "marka"],
    "investment": [
        "invest", "investor", "sرمایه", "سرمایه", "جذب سرمایه", "term sheet", "safe", "sha",
        "yatırım", "yatırımcı", "fundrais", "due diligence", "vc",
    ],
    "hotel": [
        "hotel", "hotels", "accommodation", "هتل", "اقامتگاه", "otel", "konaklama", "room", "اتاق", "oda",
        "hotel sponsor", "hotel map", "هتل اسپانسر", "هتل های اسپانسر", "هتل های", "نقشه هتل",
        "sponsor hotel", "room night", "otel sponsor",
    ],
    "corporate_sponsor": [
        "corporate sponsor", "sponsor", "اسپانسر", "اسپانسری", "شرکت اسپانسر", "kurumsal sponsor",
        "poc", "proof of concept", "corporate partner", "حامی", "اسپانسر شرکتی", "شرکت حامی",
    ],
    "ecosystem": [
        "accelerator", "technopark", "شتاب‌دهنده", "شتابدهنده", "پارک فناوری", "teknopark", "hızlandırıcı",
        "coworking", "university", "دانشگاه", "üniversite", "investor network",
    ],
    "deck": [
        "deck", "pitch", "pitch deck", "pdf", "proposal", "پیشنهاده", "پیشنهاد", "ارائه", "دک", "sunum", "teklif",
    ],
    "pilot": ["pilot", "cohort", "دوره", "پایلوت", "funnel", "قیف", "pilot program", "kademeli"],
    "journey": ["journey", "steps", "roadmap", "مسیر", "مراحل", "نقشه راه", "süreç", "adımlar", "yol haritası"],
    "metrics": ["metric", "kpi", "success", "شاخص", "معیار", "başarı", "metrik"],
    "human": ["human", "talk to a person", "agent", "انسان", "کارشناس", "تماس", "gerçek kişi", "insan", "call me"],
}

# Intents whose answers must always be escalated / disclaimed.
SENSITIVE_INTENTS = {"residence", "legal_desk", "company_formation", "investment", "ip"}

MENU = [
    ("🏛️ Legal Landing Desk", "/legal"),
    ("📝 Startup Legal Intake Form", "/intake"),
    ("🧭 Pre-Landing Assessment", "/assessment"),
    ("🗺️ Journey (6 steps)", "/journey"),
    ("🏨 Hotel map & sponsors", "/hotels"),
    ("🏭 Corporate sponsorship", "/corporate"),
    ("📄 Pitch deck for legal group", "/deck"),
    ("🧪 Istanbul pilot & funnel", "/pilot"),
    ("👤 Talk to a human", "/human"),
]


@dataclass
class Intent:
    name: str
    score: float
    matched: list[str]


def _pattern(keyword: str) -> str:
    """Short keywords (poc, ip, vc, ltd, hi) match on word boundaries only,
    longer keywords may match as substrings (e.g. 'invest' → 'investment')."""
    k = re.escape(keyword.lower().strip())
    if len(keyword.strip()) <= 4:
        return rf"\b{k}\b"
    return k


def normalize(text: str) -> str:
    """Lowercase and remove Persian zero-width non-joiners so that
    'هتل‌های اسپانسر' matches the keyword 'هتل های اسپانسر'."""
    return text.lower().replace("\u200c", " ").replace("\u200f", "")


def classify(text: str) -> list[Intent]:
    """Return intents sorted by keyword weight.

    Weight = keyword length, with a bonus for multi-word phrases: "hotel sponsor"
    is a much stronger signal than "sponsor" alone.
    """
    low = f" {normalize(text).strip()} "
    hits: list[Intent] = []
    for intent, keywords in INTENTS.items():
        matched = [k for k in keywords if re.search(_pattern(k), low)]
        if matched:
            score = sum(len(k.strip()) * (1.4 if " " in k.strip() else 1.0) for k in matched) / 10.0
            hits.append(Intent(intent, round(score, 2), matched))
    hits.sort(key=lambda i: i.score, reverse=True)
    return hits


def top_intent(text: str) -> str:
    """Best intent name, honouring explicit slash-commands."""
    t = text.strip()
    if t.startswith("/"):
        cmd = t.split()[0][1:].lower()
        aliases = {
            "start": "help", "legal": "legal_desk", "intake": "intake", "apply": "intake",
            "assessment": "assessment", "journey": "journey", "hotels": "hotel", "hotel": "hotel",
            "corporate": "corporate_sponsor", "sponsor": "corporate_sponsor", "deck": "deck",
            "pdf": "deck", "pilot": "pilot", "human": "human", "help": "help", "menu": "help",
            "invest": "investment", "investment": "investment", "ip": "ip", "kimlik": "residence",
            "visa": "residence", "residence": "residence", "company": "company_formation",
            "corporate": "corporate_sponsor", "sponsor": "corporate_sponsor",
            "metrics": "metrics", "advance": "advance", "ecosystem": "ecosystem",
            "lang": "lang", "language": "lang", "sponsors": "corporate_sponsor",
        }
        if cmd in aliases:
            return aliases[cmd]
    ranked = classify(t)
    if not ranked:
        return "unknown"
    # safety: a sensitive intent outranks a weaker generic one
    for cand in ranked:
        if cand.name in SENSITIVE_INTENTS and cand.score >= ranked[0].score * 0.6:
            return cand.name
    return ranked[0].name


def is_sensitive(intent: str) -> bool:
    return intent in SENSITIVE_INTENTS


def quick_replies(intent: str) -> list[tuple[str, str]]:
    """Buttons shown under an answer."""
    table = {
        "greeting": [("📝 Start intake", "/intake"), ("🏛️ Legal Desk", "/legal"), ("🗺️ Journey", "/journey")],
        "help": MENU[:6],
        "legal_desk": [("📝 Intake form", "/intake"), ("🧭 Assessment", "/assessment"), ("📄 Deck PDF", "/deck")],
        "intake": [("🧭 Run assessment", "/assessment"), ("👤 Human", "/human")],
        "assessment": [("🏨 Hotels", "/hotels"), ("🏭 Corporate sponsor", "/corporate"), ("👤 Human", "/human")],
        "company_formation": [("🏛️ Legal Desk", "/legal"), ("👤 Talk to a lawyer", "/human")],
        "residence": [("👤 Talk to a lawyer", "/human"), ("🏛️ Legal Desk", "/legal")],
        "ip": [("🏛️ Legal Desk", "/legal"), ("👤 Human", "/human")],
        "investment": [("🏛️ Legal Desk", "/legal"), ("📄 Deck", "/deck")],
        "hotel": [("🏭 Corporate sponsor", "/corporate"), ("📝 Intake", "/intake")],
        "corporate_sponsor": [("🏨 Hotels", "/hotels"), ("🏛️ Legal Desk", "/legal")],
        "deck": [("🧪 Pilot", "/pilot"), ("👤 Human", "/human")],
        "pilot": [("📊 Metrics", "/metrics"), ("📄 Deck", "/deck")],
        "journey": [("🏛️ Legal Desk", "/legal"), ("🧪 Pilot", "/pilot")],
        "metrics": [("🧪 Pilot", "/pilot")],
        "human": [("📝 Intake form", "/intake")],
    }
    return table.get(intent, MENU[:3])


def parse_command(text: str) -> tuple[str, str]:
    """Split '/cmd args' → (cmd, args)."""
    t = text.strip()
    if t.startswith("/"):
        parts = t[1:].split(None, 1)
        return (parts[0].lower() if parts else "", parts[1] if len(parts) > 1 else "")
    return ("", t)


def looks_like_intake_answers(text: str) -> bool:
    """True when a free-text message already contains intake fields
    (`startup_name: X`, `sector=SaaS`, `نام: آریا` …)."""
    import re

    from . import legal_desk

    keys = set(legal_desk.REQUIRED_INTAKE_KEYS) | {"founder_agreement", "funding_target_usd", "notes"}
    keys |= set(
        k for k in (
            "name", "startup", "sector", "stage", "team", "roles", "city", "activity",
            "residence", "funding", "source", "ip", "نام", "حوزه", "مرحله", "تعداد", "شهر", "فعالیت", "اقامت", "سرمایه",
        )
    )
    hits = 0
    for line in text.splitlines():
        m = re.match(r"^\s*([\w\u0600-\u06FF ]+?)\s*[:=]\s*(.+)$", line)
        if m and m.group(1).strip().lower().replace(" ", "_") in keys:
            hits += 1
    return hits >= 1


def looks_like_intake_json(text: str) -> bool:
    t = text.strip()
    return t.startswith("{") and t.endswith("}") and "startup_name" in t


def extract_intake_from_text(text: str) -> dict[str, object]:
    """Very forgiving parser so people can paste answers in a chat message.

    Accepts `key: value` lines, `key=value`, or a JSON blob.
    """
    import json

    t = text.strip()
    if looks_like_intake_json(t):
        try:
            data = json.loads(t)
            if isinstance(data, dict):
                return data
        except json.JSONDecodeError:
            pass

    aliases = {
        "name": "startup_name", "startup": "startup_name", "نام": "startup_name",
        "sector": "sector", "حوزه": "sector", "stage": "stage", "مرحله": "stage",
        "team": "team_size", "team_size": "team_size", "تعداد": "team_size",
        "roles": "team_roles", "نقش": "team_roles",
        "iran_entity": "has_iran_entity", "شرکت ایران": "has_iran_entity",
        "turkey_entity": "has_turkey_entity", "شرکت ترکیه": "has_turkey_entity",
        "ip": "ip_owned_by_company", "مالکیت فکری": "ip_owned_by_company",
        "founder_agreement": "founder_agreement", "قرارداد بنیانگذار": "founder_agreement",
        "city": "intended_city", "شهر": "intended_city",
        "activity": "intended_activity", "فعالیت": "intended_activity",
        "residence": "residence_status", "اقامت": "residence_status",
        "funding": "funding_target_usd", "سرمایه": "funding_target_usd",
        "source": "source", "منبع": "source",
    }
    out: dict[str, object] = {}
    for line in t.splitlines():
        m = re.match(r"^\s*([\w\u0600-\u06FF ]+?)\s*[:=]\s*(.+?)\s*$", line)
        if not m:
            continue
        key = m.group(1).strip().lower().replace(" ", "_")
        key = aliases.get(key, key)
        value: object = m.group(2).strip()
        if key in {"team_size", "funding_target_usd"}:
            digits = re.sub(r"[^\d]", "", str(value))
            value = int(digits) if digits else value
        if key in {"has_iran_entity", "has_turkey_entity", "ip_owned_by_company", "founder_agreement"}:
            value = str(value).strip().lower() in {"yes", "y", "true", "1", "بله", "evet", "آره", "دارم", "var"}
        out[key] = value
    return out
