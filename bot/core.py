"""The bot core — one brain, four channels.

`Bot.handle(message)` is the single entry point used by Telegram, Discord,
WhatsApp, the website widget and the tests. Sessions are shared across channels
so a founder who starts on the website and continues on Telegram keeps the same
intake progress (session key = `channel:chat`, with an optional bridge id).
"""

from __future__ import annotations

import json
import time
from typing import Any, Callable

from . import deck as deck_mod
from . import legal_desk, navigator, safety, sponsors
from .config import AppConfig, load_config
from .models import Button, Document, LegalCase, Message, Reply, Startup
from .store import Store

T = {
    "greeting": {
        "en": "Hello 👋 I'm the AI Startup Navigator of the Türkiye Startup Landing Platform.",
        "fa": "سلام 👋 من «AI Startup Navigator» پلتفرم Startup Landing ترکیه هستم.",
        "tr": "Merhaba 👋 Ben Türkiye Startup Landing Platform'un Yapay Zekâ Startup Rehberiyim.",
    },
    "menu": {
        "en": "Here is what I can do:",
        "fa": "کارهایی که می‌توانم انجام دهم:",
        "tr": "Yapabileceklerim:",
    },
    "escalated": {
        "en": "👤 I've flagged this file for a licensed legal professional. The Legal Desk will continue with you.",
        "fa": "👤 این پرونده برای وکیل دارای پروانه علامت‌گذاری شد. میز حقوقی ادامه را با شما پیش می‌برد.",
        "tr": "👤 Bu dosya ruhsatlı bir hukukçu için işaretlendi. Hukuk Masası sizinle devam edecek.",
    },
    "unknown": {
        "en": "I didn't catch that. Pick an option below, or type /help.",
        "fa": "متوجه نشدم. یکی از گزینه‌های زیر را انتخاب کنید یا /help را بفرستید.",
        "tr": "Anlayamadım. Aşağıdaki seçeneklerden birini seçin veya /help yazın.",
    },
}


def tr(key: str, language: str) -> str:
    return T.get(key, {}).get(language) or T.get(key, {}).get("en", "")


# One-line localised summary per route. The detailed tables stay in English
# (they are the shared operating documents); every answer is introduced in the
# user's own language.
SUMMARY: dict[str, dict[str, str]] = {
    "legal_desk": {
        "fa": "میز حقوقی استارتاپ ایران–ترکیه: اولین نقطه تماس حقوقی تیم‌های انتخاب‌شده، در دو لایه (ورود به بازار / سرمایه‌گذاری و رشد).",
        "tr": "İran–Türkiye Startup Hukuk Masası: seçilen takımların ilk hukuki temas noktası; iki katman (pazara giriş / yatırım ve büyüme).",
    },
    "residence": {
        "fa": "درباره ویزا، اقامت، کیملیک و اجازه کار هیچ نتیجه‌ای تضمین نمی‌شود؛ پرونده شما به وکیل دارای پروانه ارجاع شد.",
        "tr": "Vize, oturum, kimlik ve çalışma izni konusunda hiçbir sonuç garanti edilmez; dosyanız ruhsatlı avukata iletildi.",
    },
    "company_formation": {
        "fa": "انواع ساختار شرکت در ترکیه فقط به‌صورت «گزینه» ارائه می‌شود؛ انتخاب نهایی با وکیل و حسابدار است.",
        "tr": "Türkiye'deki şirket yapıları yalnızca seçenek olarak listelenir; nihai karar avukat ve mali müşavire aittir.",
    },
    "investment": {
        "fa": "لایه ۲ — حقوق سرمایه‌گذاری و رشد: از آمادگی جذب سرمایه تا قرارداد سهامداران و diligence.",
        "tr": "Katman 2 — Yatırım ve Büyüme Hukuku: yatırım hazırlığından hissedarlar sözleşmesine kadar.",
    },
    "ip": {
        "fa": "فهرست آماده‌سازی مالکیت فکری؛ مسیر انتقال یا مجوز IP را وکیل تعیین می‌کند.",
        "tr": "Fikri mülkiyet hazırlık listesi; devir veya lisans yolunu avukat belirler.",
    },
    "intake": {
        "fa": "فرم پذیرش حقوقی استارتاپ — پاسخ‌ها مستقیماً به پرونده میز حقوقی می‌رود.",
        "tr": "Startup Hukuk Başvuru Formu — yanıtlar doğrudan Hukuk Masası dosyasına gider.",
    },
    "intake_complete": {
        "fa": "فرم پذیرش کامل شد؛ ارزیابی پیش از فرود تولید و پرونده به وکیل ارجاع شد.",
        "tr": "Başvuru tamamlandı; ön iniş değerlendirmesi oluşturuldu ve dosya avukata iletildi.",
    },
    "assessment": {
        "fa": "ارزیابی آمادگی پیش از فرود: امتیاز، پرچم‌های قرمز، فهرست مدارک و پرسش‌هایی که وکیل باید پاسخ دهد.",
        "tr": "Ön iniş hazırlık değerlendirmesi: puan, kritik noktalar, belge listesi ve avukatın yanıtlayacağı sorular.",
    },
    "journey": {
        "fa": "مسیر شش‌مرحله‌ای: انتخاب → ارزیابی حقوقی → ورود → ساختار شرکت → شروع تجاری → سرمایه‌گذاری.",
        "tr": "Altı adımlı süreç: seçim → hukuki değerlendirme → giriş → şirket yapısı → ticari başlangıç → yatırım.",
    },
    "hotels": {
        "fa": "نقشه هتل‌های اسپانسر: ظرفیت اتاق رایگان/تخفیف‌دار به‌جای پول نقد، به همراه خدمات هر هتل.",
        "tr": "Sponsor otel haritası: nakit yerine ücretsiz/indirimli oda kapasitesi ve otel hizmetleri.",
    },
    "corporate": {
        "fa": "اسپانسری شرکتی: شرکت ترکیه‌ای یک تیم سه‌نفره را اسپانسر می‌کند و پس از PoC به قرارداد یا سرمایه‌گذاری می‌رسد.",
        "tr": "Kurumsal sponsorluk: Türk şirketi üç kişilik takımı destekler, PoC sonrası sözleşme veya yatırıma dönüşür.",
    },
    "pilot": {
        "fa": "پایلوت استانبول: ۱۰ تیم سه‌نفره (۳۰ نفر) با قیف قابل اندازه‌گیری.",
        "tr": "İstanbul pilotu: üçer kişilik 10 takım (30 kişi), ölçülebilir huni.",
    },
    "metrics": {
        "fa": "شاخص‌های موفقیت پایلوت + شمارنده‌های زنده پلتفرم.",
        "tr": "Pilot başarı metrikleri + platform canlı sayaçları.",
    },
    "human": {
        "fa": "پرونده شما به انسان (وکیل دارای پروانه یا تیم عملیات) تحویل شد.",
        "tr": "Dosyanız bir insana (ruhsatlı avukat veya operasyon ekibi) devredildi.",
    },
    "deck": {
        "fa": "دک شراکت مخصوص گروه حقوقی تولید شد (بازتعریف‌شده به‌جای دک جذب استارتاپ).",
        "tr": "Hukuk grubuna özel ortaklık sunumu oluşturuldu (startup sunumunun yeniden çerçevelenmiş hâli).",
    },
    "help": {
        "fa": "فهرست دستورهای ربات — در همه کانال‌ها (وب، تلگرام، دیسکورد، واتساپ) یکسان است.",
        "tr": "Bot komut listesi — tüm kanallarda (web, Telegram, Discord, WhatsApp) aynıdır.",
    },
}


def summary_for(route: str, language: str) -> str:
    """Localised one-liner for a route ('' when English or unknown)."""
    if language == "en":
        return ""
    return SUMMARY.get(route, {}).get(language, "")


class Bot:
    """Channel-agnostic conversation engine."""

    def __init__(self, config: AppConfig | None = None, store: Store | None = None) -> None:
        self.config = config or load_config()
        self.store = store or Store(self.config.state_dir)
        self.sponsors = sponsors.SponsorData(self.config.data_dir / "hotels.json")
        self._handlers: dict[str, Callable[[Message, dict[str, Any]], Reply]] = {
            "greeting": self.h_greeting,
            "help": self.h_help,
            "legal_desk": self.h_legal_desk,
            "intake": self.h_intake,
            "assessment": self.h_assessment,
            "company_formation": self.h_company_formation,
            "residence": self.h_residence,
            "ip": self.h_ip,
            "investment": self.h_investment,
            "hotel": self.h_hotel,
            "corporate_sponsor": self.h_corporate,
            "ecosystem": self.h_ecosystem,
            "deck": self.h_deck,
            "pilot": self.h_pilot,
            "journey": self.h_journey,
            "metrics": self.h_metrics,
            "human": self.h_human,
            "lang": self.h_lang,
            "advance": self.h_advance,
            "unknown": self.h_unknown,
        }
        self.on_reply: list[Callable[[Message, Reply], None]] = []   # observability hooks

    # ------------------------------------------------------------------ main
    def handle(self, message: Message) -> Reply:
        session = self.store.get_session(message.session_key)

        # explicit language switch wins over auto-detection
        if message.text.strip().lower() in ("/lang fa", "/lang en", "/lang tr"):
            session["language"] = message.text.strip().lower()[-2:]
            session["language_locked"] = True
        previous = session.get("language") or ""
        if session.get("language_locked"):
            language = previous or self.config.default_language
        else:
            detected = safety.detect_language(message.text, "")
            if message.text.startswith("/"):
                # slash-commands carry no natural language → keep the conversation language
                language = previous if detected in ("", "en") else detected
            else:
                language = detected or previous or self.config.default_language
        session["language"] = language
        session["last_text"] = message.text[:500]
        session["last_intent"] = ""

        # a pasted JSON intake form always wins over intent classification
        if navigator.looks_like_intake_json(message.text):
            intent = "intake"
            session["intake_raw"] = message.text
        elif "intake_draft" in session and not message.text.startswith("/"):
            # an intake form is already open → treat the message as the next answer
            intent = "intake"
        elif not message.text.startswith("/") and navigator.looks_like_intake_answers(message.text):
            # "startup_name: X" style answers open the form automatically
            intent = "intake"
        else:
            intent = navigator.top_intent(message.text)

        handler = self._handlers.get(intent, self.h_unknown)
        reply = handler(message, session)
        reply.intent = intent
        reply.language = language
        lead = summary_for(reply.route, language)
        if lead:
            reply.text = f"{lead}\n\n{reply.text}"
        if not reply.buttons:
            reply.buttons = [Button(label, action) for label, action in navigator.quick_replies(intent)]

        # ---- Legal AI Safety Principle enforcement (single choke point) ----
        # 1) the *question* is scanned: a promise-seeking or advice-seeking inbound
        #    message always reaches a licensed professional, whatever we answer.
        inbound = safety.review(message.text)
        # 2) the *answer* is scanned: guarantee language is stripped, sensitive
        #    answers get the disclaimer.
        outbound = safety.review(reply.text)
        sensitive = (
            reply.advice_scope
            or navigator.is_sensitive(intent)
            or bool(inbound.triggered)
            or bool(outbound.triggered)
            or bool(outbound.removed_guarantees)
        )
        if sensitive:
            reply.text, _ = safety.safe_reply(reply.text, language, outbound)
        report = safety.SafetyReport(
            triggered=sorted(set(inbound.triggered) | set(outbound.triggered)),
            removed_guarantees=inbound.removed_guarantees + outbound.removed_guarantees,
            must_escalate=inbound.must_escalate or outbound.must_escalate,
            must_disclaim=inbound.must_disclaim or outbound.must_disclaim,
            refusal=inbound.refusal or outbound.refusal,
        )
        if report.refusal or inbound.must_escalate or (reply.advice_scope and report.must_escalate):
            reply.escalated = True
        if reply.escalated:
            reply.text = f"{reply.text}\n\n{tr('escalated', language)}"
            self.store.audit(
                "escalated_to_human",
                channel=message.channel,
                chat=message.chat_id,
                intent=intent,
                triggers=report.triggered,
                removed=report.removed_guarantees,
            )
        reply.meta["safety"] = {
            "triggered": report.triggered,
            "removed_guarantees": report.removed_guarantees,
            "escalated": reply.escalated,
            "refusal": report.refusal,
            "inbound": inbound.triggered,
            "outbound": outbound.triggered,
        }

        session["last_intent"] = intent
        session["messages"] = int(session.get("messages", 0)) + 1
        session["last_reply_route"] = reply.route
        self.store.put_session(message.session_key, session)
        self.store.audit("reply", channel=message.channel, chat=message.chat_id, intent=intent, route=reply.route)
        for hook in self.on_reply:
            hook(message, reply)
        return reply

    # ------------------------------------------------------------- handlers
    def h_greeting(self, m: Message, s: dict[str, Any]) -> Reply:
        lang = s["language"]
        text = f"{tr('greeting', lang)}\n\n{tr('menu', lang)}"
        return Reply(text=text, route="greeting", buttons=[Button(l, a) for l, a in navigator.MENU])

    def h_help(self, m: Message, s: dict[str, Any]) -> Reply:
        lines = [
            f"{tr('menu', s['language'])}",
            "",
            "COMMANDS",
            "/legal      Iran–Türkiye Startup Legal Desk",
            "/intake     Startup Legal Intake Form",
            "/assessment Pre-Landing Legal Assessment",
            "/journey    6-step startup journey",
            "/hotels     Hotel map + sponsor capacity",
            "/corporate  Corporate sponsorship / PoC flow",
            "/deck       Pitch deck for a legal group (PDF/HTML/MD)",
            "/pilot      Istanbul pilot + funnel projection",
            "/metrics    Success metrics",
            "/human      Escalate to a licensed professional",
            "/lang en|fa|tr  Answer language",
        ]
        return Reply(text="\n".join(lines), route="help", buttons=[Button(l, a) for l, a in navigator.MENU])

    def h_legal_desk(self, m: Message, s: dict[str, Any]) -> Reply:
        partners = self.sponsors.legal_partners
        text = "\n".join(
            [
                "IRAN–TÜRKİYE STARTUP LEGAL DESK",
                "",
                "The Desk is the first legal point of contact for selected startup teams entering",
                "Türkiye. Two legal layers:",
                "",
                legal_desk.layers_text(),
                "",
                "Partner expertise:",
            ]
            + [f"  • {e}" for p in partners for e in p["expertise"]]
            + [
                "",
                f"Partner note: {partners[0]['note']}" if partners else "",
                "",
                "What we ask from the legal group:",
            ]
            + [f"  {i}. {a}" for i, a in enumerate(legal_desk.ASKS_FROM_LEGAL_GROUP, 1)]
            + ["", "What the platform provides:", "  " + " · ".join(legal_desk.PLATFORM_PROVIDES)]
        )
        return Reply(text=text.strip(), route="legal_desk", escalated=True, advice_scope=True)

    def h_journey(self, m: Message, s: dict[str, Any]) -> Reply:
        return Reply(text=legal_desk.journey_text(s["language"]), route="journey")

    def h_intake(self, m: Message, s: dict[str, Any]) -> Reply:
        """Start / continue / finish the Startup Legal Intake Form."""
        raw = s.pop("intake_raw", "")
        if raw:
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                data = navigator.extract_intake_from_text(raw)
            return self._finish_intake(m, s, data)

        parsed = navigator.extract_intake_from_text(m.text) if not m.text.startswith("/") else {}
        draft: dict[str, Any] = dict(s.get("intake_draft") or {})
        draft.update(parsed)
        missing = legal_desk.validate_intake(draft)

        if not missing:
            return self._finish_intake(m, s, draft)

        s["intake_draft"] = draft
        self.store.put_session(m.session_key, s)
        field = next(f for f in legal_desk.INTAKE_FORM if f["key"] == missing[0])
        progress = len(legal_desk.REQUIRED_INTAKE_KEYS) - len(missing)
        lines = [
            "STARTUP LEGAL INTAKE FORM",
            f"({progress}/{len(legal_desk.REQUIRED_INTAKE_KEYS)} answered)",
            "",
            f"➡️ {field['label']}" + (f"  —  {field['fa']}" if s["language"] == "fa" else ""),
        ]
        if field["type"] == "choice":
            lines.append("   options: " + " | ".join(field["options"]))
        lines += [
            "",
            "You can answer one by one, or paste everything at once like:",
            "  startup_name: Pars Vision",
            "  sector: AI",
            "  stage: mvp",
            "  team_size: 3",
            "  team_roles: Founder / Technical / Business",
            "  has_iran_entity: yes",
            "  has_turkey_entity: no",
            "  ip_owned_by_company: yes",
            "  founder_agreement: yes",
            "  intended_city: Istanbul",
            "  intended_activity: sell industrial AI inspection software to Turkish manufacturers",
            "  residence_status: all three on tourist visa exemption, 90 days",
            "  funding_target_usd: 250000",
            "  source: GITEX",
            "",
            "Tip: send `/intake reset` to start over.",
        ]
        return Reply(text="\n".join(lines), route="intake")

    def _finish_intake(self, m: Message, s: dict[str, Any], data: dict[str, Any]) -> Reply:
        if "reset" in str(m.text).lower() and not data:
            s.pop("intake_draft", None)
            return Reply(text="Intake cleared. Send /intake to start again.", route="intake_reset")
        missing = legal_desk.validate_intake(data)
        if missing:
            s["intake_draft"] = data
            labels = {f["key"]: f["label"] for f in legal_desk.INTAKE_FORM}
            text = "Almost there — still missing:\n" + "\n".join(f"  • {labels.get(k, k)}" for k in missing)
            return Reply(text=text, route="intake_incomplete")

        s.pop("intake_draft", None)
        startup = legal_desk.startup_from_intake(data, channel=m.channel)
        assessment = legal_desk.pre_landing_assessment(data)
        case = legal_desk.open_case(startup, data, assessment, channel=m.channel)
        self.store.add_startup(startup)
        self.store.add_case(case)
        s["startup_id"] = startup.id
        s["case_id"] = case.id

        hotel_matches = sponsors.match_hotels(
            self.sponsors,
            city=startup.intended_city,
            sector=startup.sector,
            rooms_needed=min(startup.team_size, 3),
            needs_workspace=True,
        )
        corp_matches = sponsors.match_corporate_sponsors(self.sponsors, startup.sector, startup.intended_city)

        lines = [
            f"✅ Intake complete — {startup.name or 'startup'} is now in the pipeline.",
            f"Startup ID: {startup.id}",
            f"Legal case ID: {case.id}  (journey step {case.step}: {legal_desk.next_step(case)['title']})",
            "",
            legal_desk.assessment_text(assessment, startup.name, s["language"]),
        ]
        if hotel_matches:
            top = hotel_matches[0]
            lines += [
                "",
                "ACCOMMODATION (hotel sponsor inventory, not cash):",
                f"  Best match: {top['hotel']['name']} — {top['hotel']['city']}/{top['hotel']['district']}, "
                f"{top['hotel']['startup_rooms']} sponsored rooms, support: {top['hotel']['support_type']}",
                f"  Why: {', '.join(top['why'])}",
            ]
        if corp_matches:
            top = corp_matches[0]
            lines += [
                "",
                "CORPORATE SPONSOR CANDIDATE:",
                f"  {top['sponsor']['name']} — offers: {', '.join(top['sponsor']['offers'])}",
                f"  Why: {', '.join(top['why']) or 'sector/city proximity'}",
            ]
        lines += [
            "",
            "Next: a licensed lawyer from the Legal Desk reviews the file and answers the questions above.",
        ]
        return Reply(
            text="\n".join(lines),
            route="intake_complete",
            escalated=True,
            advice_scope=True,
            meta={"startup_id": startup.id, "case_id": case.id, "band": assessment.band, "score": round(assessment.score, 3)},
        )

    def h_assessment(self, m: Message, s: dict[str, Any]) -> Reply:
        case_id = s.get("case_id")
        case = self.store.get_case(case_id) if case_id else None
        if not case:
            return Reply(
                text="No assessment yet. Send /intake to fill the Startup Legal Intake Form first — "
                     "the Pre-Landing Legal Assessment is generated from it.",
                route="assessment_missing",
            )
        assessment = legal_desk.pre_landing_assessment(case.intake)
        text = "\n".join(
            [
                legal_desk.assessment_text(assessment, case.startup_name, s["language"]),
                "",
                f"Journey position: STEP {case.step} — {legal_desk.next_step(case)['title']}",
                "Send /advance to move the case to the next step (logged for the legal partner).",
            ]
        )
        return Reply(text=text, route="assessment", escalated=True)

    def h_company_formation(self, m: Message, s: dict[str, Any]) -> Reply:
        text = "\n".join(
            [
                "TURKISH BUSINESS STRUCTURE — OPTIONS ONLY (step 4)",
                "",
                "The platform can list the structures; the lawyer picks one.",
            ]
            + [f"  • {v}" for v in legal_desk.STRUCTURES.values()]
            + [
                "",
                "What the AI prepares before the meeting:",
                "  [ ] cap table + shareholding",
                "  [ ] Iranian entity documents (if any)",
                "  [ ] IP ownership chain",
                "  [ ] intended activity description",
                "  [ ] 12-month financial projection",
                "",
                "What only the lawyer/accountant decides:",
                "  → entity type, order of steps (entity vs residence first), tax registrations,",
                "    employment contracts, and what may be promised in writing.",
            ]
        )
        return Reply(text=text, route="company_formation", escalated=True, advice_scope=True)

    def h_residence(self, m: Message, s: dict[str, Any]) -> Reply:
        text = "\n".join(
            [
                "TÜRKİYE ENTRY (step 3) — what I can and cannot do",
                "",
                "I can organise the file: passports, current status of each of the three team members,",
                "purpose of stay, intended activity, company plans, and the document checklist.",
                "",
                "I cannot tell you which permit applies. No residence, kimlik, work-authorization or",
                "visa outcome is guaranteed by this platform — that determination belongs to a lawyer",
                "qualified in Türkiye.",
                "",
                "Route: your file goes to the Iran–Türkiye Startup Legal Desk, which reviews the",
                "applicable visa / residence / work-authorization / company-formation pathways.",
            ]
        )
        return Reply(text=text, route="residence", escalated=True, advice_scope=True)

    def h_ip(self, m: Message, s: dict[str, Any]) -> Reply:
        text = "\n".join(
            [
                "INTELLECTUAL PROPERTY — preparation list",
                "",
                "  [ ] Who created the code/design/content, and under which contract?",
                "  [ ] Written assignment from every individual contributor to the company",
                "  [ ] Trademark search + filing strategy for Türkiye",
                "  [ ] Open-source licence audit",
                "  [ ] How IP moves into the Turkish structure (assignment vs licence)",
                "  [ ] Domain, repositories, cloud accounts, data-ownership clauses",
                "",
                "The legal partner decides the correct transfer/licence route.",
            ]
        )
        return Reply(text=text, route="ip", escalated=True, advice_scope=True)

    def h_investment(self, m: Message, s: dict[str, Any]) -> Reply:
        text = "\n".join(
            [
                "LAYER 2 — INVESTMENT & GROWTH LEGAL",
                "",
                "  • Investor readiness (data room, cap table, financials)",
                "  • Term sheet review",
                "  • SAFE / convertible instrument",
                "  • Shareholders agreement",
                "  • Due diligence",
                "  • Fundraising process",
                "  • Corporate partnership / PoC contract",
                "  • M&A",
                "",
                "The same startup stays inside the legal partner's ecosystem as it grows.",
            ]
        )
        return Reply(text=text, route="investment", escalated=True, advice_scope=True)

    def h_hotel(self, m: Message, s: dict[str, Any]) -> Reply:
        city = ""
        for c in sponsors.CITIES:
            if c.lower() in m.text.lower():
                city = c
                break
        table = sponsors.hotel_table_text(self.sponsors, city)
        matches = sponsors.match_hotels(self.sponsors, city=city or "Istanbul", rooms_needed=3, needs_workspace=True)
        lines = [
            table,
            "",
            sponsors.sponsor_model_text(),
        ]
        if matches:
            lines += ["", "Best match for a 3-person team:"]
            for mm in matches[:3]:
                h = mm["hotel"]
                lines.append(
                    f"  {h['name']} ({h['city']}/{h['district']}) — {h['startup_rooms']} rooms, {h['support_type']}, "
                    f"metro {h['metro_min']} min, coworking={'yes' if h['coworking'] else 'no'} → score {mm['score']}"
                )
        return Reply(text="\n".join(lines), route="hotels")

    def h_corporate(self, m: Message, s: dict[str, Any]) -> Reply:
        rows = [
            f"  • {c['name']} ({c['city']}) — interests: {', '.join(c['sector_interest'])} — slots: {c['startup_slots']} — {c['status']}"
            for c in self.sponsors.corporate
        ]
        text = "\n".join(
            [
                sponsors.corporate_sponsorship_flow(),
                "",
                "CORPORATE SPONSORS ON RECORD:",
                *rows,
                "",
                "Legal partner's role: build the contractual framework for the PoC and for whatever",
                "follows (commercial contract / investment / strategic partnership).",
            ]
        )
        return Reply(text=text, route="corporate", escalated=True, advice_scope=True)

    def h_ecosystem(self, m: Message, s: dict[str, Any]) -> Reply:
        return Reply(text=sponsors.ecosystem_text(self.sponsors), route="ecosystem")

    def h_deck(self, m: Message, s: dict[str, Any]) -> Reply:
        """Generate the *legal-group* pitch deck and attach it."""
        args = m.text.split(None, 1)[1] if " " in m.text.strip() else ""
        group = args.strip() or "Iranian–Turkish Legal Group"
        fmt = "pdf"
        lowered = m.text.lower()
        if "html" in lowered:
            fmt = "html"
        elif " md" in lowered or "markdown" in lowered:
            fmt = "md"
        opts = deck_mod.DeckOptions(legal_group_name=group, sender_name=s.get("user_name", ""), contact=s.get("contact", ""))
        bundle = deck_mod.build_all(opts)
        if fmt == "pdf":
            doc = Document(bundle["filename"], bundle["pdf"], "application/pdf")
            text = (
                f"📄 Pitch deck for a legal group — personalised for \"{group}\".\n"
                f"{len(bundle['md'].split())} words · reframed as Legal Landing Partner + Cross-Border Startup Desk "
                "(not the startup-attraction deck).\n"
                "Open the site → /deck to preview it in the browser or download HTML/Markdown."
            )
        elif fmt == "html":
            doc = Document(deck_mod.deck_filename(opts, "html"), bundle["html"].encode("utf-8"), "text/html")
            text = f"🌐 HTML deck for \"{group}\" — printable to PDF from the browser."
        else:
            doc = Document(deck_mod.deck_filename(opts, "md"), bundle["md"].encode("utf-8"), "text/markdown")
            text = f"📝 Markdown deck for \"{group}\"."
        return Reply(text=text, route="deck", documents=[doc], meta={"format": fmt, "group": group})

    def h_pilot(self, m: Message, s: dict[str, Any]) -> Reply:
        applied = 100
        digits = "".join(ch for ch in m.text if ch.isdigit())
        if digits:
            applied = max(1, min(100000, int(digits)))
        rows = legal_desk.funnel_projection(applied)
        p = legal_desk.PILOT
        lines = [
            f"{p['city'].upper()} PILOT",
            f"  first cohort: {p['teams']} teams × {p['team_size']} people = {p['people']} founders/team members",
            "  ecosystem: " + ", ".join(p["ecosystem"]),
            "",
            f"FUNNEL (projected for {applied} inbound startups):",
            f"  {'stage':<38}{'pilot':>7}{'projected':>11}",
        ]
        for r in rows:
            lines.append(f"  {r['stage']:<38}{r['pilot']:>7}{r['projected']:>11}")
        lines += [
            "",
            "The goal is not simply to bring people to Türkiye.",
            "The goal is to create successful business cases.",
        ]
        return Reply(text="\n".join(lines), route="pilot")

    def h_metrics(self, m: Message, s: dict[str, Any]) -> Reply:
        lines = ["SUCCESS METRICS — Istanbul pilot", ""]
        lines += [f"  {label:<42}{value}" for label, value in legal_desk.SUCCESS_METRICS]
        cases = self.store.list_cases()
        startups = self.store.list_startups()
        lines += [
            "",
            "LIVE PLATFORM COUNTERS",
            f"  startups in pipeline: {len(startups)}",
            f"  legal cases open: {len(cases)}",
            f"  cases ready (band=ready): {sum(1 for c in cases if c.assessment_band == 'ready')}",
            f"  escalated to a licensed professional: {sum(1 for c in cases if c.assigned_to_human)}",
            f"  sponsored room nights mapped: {sponsors.total_sponsored_rooms(self.sponsors)}",
        ]
        return Reply(text="\n".join(lines), route="metrics")

    def h_human(self, m: Message, s: dict[str, Any]) -> Reply:
        text = "\n".join(
            [
                "👤 Handing you to a human.",
                "",
                "Who takes over:",
                "  • Legal questions, residence/visa/work authorization, entity choice, contracts,",
                "    IP transfer, investment documents → the licensed Legal Desk partner.",
                "  • Hotel/sponsor logistics → the platform operations team.",
                "",
                "What is transferred: your startup profile, intake answers, assessment score,",
                "red flags and the document checklist — so the lawyer enters the process early",
                "instead of starting from zero.",
            ]
        )
        return Reply(text=text, route="human", escalated=True, advice_scope=True)

    def h_advance(self, m: Message, s: dict[str, Any]) -> Reply:
        return self.advance_case(m.session_key)

    def h_lang(self, m: Message, s: dict[str, Any]) -> Reply:
        names = {"en": "English", "fa": "فارسی (Persian)", "tr": "Türkçe (Turkish)"}
        text = "\n".join(
            [
                f"Answer language: {names.get(s['language'], s['language'])}",
                "",
                "Send /lang en, /lang fa or /lang tr at any time.",
                "زبان پاسخ: فارسی — /lang en یا /lang tr برای تغییر.",
                "Yanıt dili: Türkçe — /lang en veya /lang fa ile değiştirebilirsiniz.",
            ]
        )
        return Reply(text=text, route="lang")

    def h_unknown(self, m: Message, s: dict[str, Any]) -> Reply:
        return Reply(
            text=tr("unknown", s["language"]),
            route="unknown",
            buttons=[Button(l, a) for l, a in navigator.MENU[:5]],
        )

    # ------------------------------------------------------------ utilities
    def advance_case(self, session_key: str) -> Reply:
        s = self.store.get_session(session_key)
        case = self.store.get_case(s.get("case_id", "")) if s.get("case_id") else None
        if not case:
            return Reply(text="No open legal case. Send /intake first.", route="advance_missing")
        before = case.step
        legal_desk.advance(case)
        self.store.update_case(case)
        step = legal_desk.next_step(case)
        return Reply(
            text=(
                f"Legal case {case.id}: STEP {before} → STEP {case.step} ({step['title']}).\n"
                f"Owner of this step: {step['owner']}\nLegal layer: {legal_desk.LAYERS[case.layer]['name']}\n"
                f"Output expected: {step['output']}"
            ),
            route="advance",
            escalated=True,
            advice_scope=True,
        )

    def stats(self) -> dict[str, Any]:
        cases = self.store.list_cases()
        return {
            "startups": len(self.store.list_startups()),
            "legal_cases": len(cases),
            "ready": sum(1 for c in cases if c.assessment_band == "ready"),
            "needs_work": sum(1 for c in cases if c.assessment_band == "needs_work"),
            "not_ready": sum(1 for c in cases if c.assessment_band == "not_ready"),
            "sponsored_rooms": sponsors.total_sponsored_rooms(self.sponsors),
            "hotels": len(self.sponsors.hotels),
            "corporate_sponsors": len(self.sponsors.corporate),
            "channels_enabled": self.config.channels_enabled,
            "uptime_started": time.strftime("%Y-%m-%d %H:%M:%S"),
        }
