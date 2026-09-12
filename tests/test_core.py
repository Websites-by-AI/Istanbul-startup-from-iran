"""End-to-end behaviour of the shared core (same brain for every channel)."""

from __future__ import annotations

import json

from bot import legal_desk
from bot.models import Message
from tests.conftest import GOOD_INTAKE


def test_help_lists_commands(sim):
    r = sim.say("/help")
    assert r.route == "help"
    for cmd in ("/legal", "/intake", "/assessment", "/journey", "/hotels", "/deck", "/pilot", "/human"):
        assert cmd in r.text


def test_greeting_has_menu_buttons(sim):
    r = sim.say("hello")
    assert r.route == "greeting"
    assert r.buttons and all(b.action.startswith("/") for b in r.buttons)


def test_legal_desk_answer_is_escalated_and_disclaimed(sim):
    r = sim.say("/legal")
    assert r.route == "legal_desk"
    assert "IRAN–TÜRKİYE STARTUP LEGAL DESK" in r.text
    assert "Layer 1" in r.text or "Market Entry Legal" in r.text
    assert r.escalated is True
    assert "not legal advice" in r.text
    assert r.meta["safety"]["triggered"]


def test_guarantee_question_is_refused_and_flagged(sim):
    r = sim.say("can you guarantee kimlik and a work permit for my team?")
    assert r.escalated is True
    assert r.meta["safety"]["refusal"] is True
    assert "guarantee kimlik" not in r.text.lower()
    assert "not legal advice" in r.text
    assert "licensed legal professional" in r.text


def test_residence_answer_never_promises_an_outcome(sim):
    r = sim.say("what residence permit should our 3-person startup apply for?")
    assert r.escalated
    assert "cannot tell you which permit applies" in r.text
    assert "guaranteed" not in r.text.split("---")[0].replace("not guaranteed", "")


def test_journey_answer(sim):
    r = sim.say("/journey")
    assert r.route == "journey"
    for i in range(1, 7):
        assert f"STEP {i}" in r.text
    assert "No guaranteed immigration result" in r.text


def test_hotel_answer_uses_seed_capacity(sim):
    r = sim.say("/hotels Istanbul")
    assert r.route == "hotels"
    assert "Hotel A" in r.text
    assert "Total sponsored room nights available" in r.text
    assert "Best match for a 3-person team" in r.text


def test_corporate_answer(sim):
    r = sim.say("/corporate")
    assert r.route == "corporate"
    assert "CORPORATE STARTUP SPONSORSHIP FLOW" in r.text
    assert "Turkish SaaS Scale-up" in r.text


def test_pilot_funnel_scales_with_input(sim):
    a = sim.say("/pilot", chat_id="c1")
    b = sim.say("/pilot 500", chat_id="c2")
    assert "ISTANBUL PILOT" in a.text
    assert b.text != a.text
    assert "projected for 500" in b.text


def test_deck_command_attaches_pdf(sim):
    r = sim.say("/deck Ankara Cross-Border Law Office")
    assert r.route == "deck"
    assert len(r.documents) == 1
    doc = r.documents[0]
    assert doc.mime_type == "application/pdf"
    assert doc.content.startswith(b"%PDF-")
    assert "ankara-cross-border-law-office" in doc.filename
    assert r.meta["format"] == "pdf"


def test_deck_html_and_md_formats(sim):
    r = sim.say("/deck html")
    assert r.documents[0].mime_type == "text/html"
    assert r.documents[0].content.startswith(b"<!doctype html>")
    r2 = sim.say("/deck markdown")
    assert r2.documents[0].mime_type == "text/markdown"


def test_full_intake_conversation_creates_a_case(bot, sim):
    sim.say("/intake", chat_id="lead-1")
    r = sim.say(json.dumps(GOOD_INTAKE), chat_id="lead-1")
    assert r.route == "intake_complete"
    assert "Intake complete" in r.text
    assert r.meta["band"] == "ready"
    assert r.escalated is True
    assert "ACCOMMODATION" in r.text and "CORPORATE SPONSOR CANDIDATE" in r.text

    cases = bot.store.list_cases()
    startups = bot.store.list_startups()
    assert len(cases) == 1 and len(startups) == 1
    assert cases[0].startup_name == "Pars Vision AI"
    assert cases[0].assigned_to_human is True
    assert startups[0].sector == "IndustrialTech"


def test_intake_step_by_step(bot, sim):
    chat = "step-by-step"
    first = sim.say("/intake", chat_id=chat)
    assert "0/12 answered" in first.text
    assert "Startup name" in first.text

    answers = [
        "startup_name: Aria Health",
        "sector: HealthTech",
        "stage: mvp",
        "team_size: 3",
        "team_roles: Founder / Technical / Business",
        "has_iran_entity: yes",
        "has_turkey_entity: no",
        "ip_owned_by_company: yes",
        "founder_agreement: no",
        "intended_city: Ankara",
        "intended_activity: telehealth platform for Turkish clinics with Iranian doctors",
        "residence_status: tourist entry for all three founders",
    ]
    reply = None
    for ans in answers:
        reply = sim.say(ans, chat_id=chat)
    assert reply is not None
    assert reply.route in ("intake_complete", "intake_incomplete")
    session = bot.store.get_session(f"simulated:{chat}")
    if reply.route == "intake_complete":
        assert session.get("case_id")
        assert "founder agreement" in reply.text.lower()


def test_intake_incomplete_lists_missing_fields(sim):
    r = sim.say("startup_name: Only Name\nsector: AI", chat_id="partial")
    assert r.route in ("intake", "intake_incomplete")
    assert "2/12 answered" in r.text
    assert "Funding / product stage" in r.text      # next unanswered field


def test_advance_moves_the_case(bot, sim):
    chat = "advance-1"
    sim.say("/intake", chat_id=chat)
    sim.say(json.dumps(GOOD_INTAKE), chat_id=chat)
    r = bot.advance_case(f"simulated:{chat}")
    assert r.route == "advance"
    assert "STEP 2 → STEP 3" in r.text
    assert r.escalated
    case = bot.store.get_case(bot.store.get_session(f"simulated:{chat}")["case_id"])
    assert case.step == 3


def test_advance_without_case(sim, bot):
    r = bot.advance_case("simulated:nobody")
    assert r.route == "advance_missing"


def test_metrics_include_live_counters(bot, sim):
    sim.say("/intake", chat_id="m1")
    sim.say(json.dumps(GOOD_INTAKE), chat_id="m1")
    r = sim.say("/metrics", chat_id="m2")
    assert r.route == "metrics"
    assert "startups in pipeline: 1" in r.text
    assert "legal cases open: 1" in r.text
    assert "sponsored room nights mapped: 24" in r.text


def test_persian_conversation_is_answered_in_context(bot, sim):
    r = sim.say("سلام، می‌خواهم برای استارتاپم در ترکیه شرکت ثبت کنم", chat_id="fa-1")
    session = bot.store.get_session("simulated:fa-1")
    assert session["language"] == "fa"
    assert r.escalated is True
    assert "مشاوره حقوقی نیست" in r.text
    assert r.route == "company_formation"


def test_turkish_conversation(bot, sim):
    r = sim.say("merhaba, otel sponsoru arıyoruz", chat_id="tr-1")
    assert r.route == "hotels"
    assert bot.store.get_session("simulated:tr-1")["language"] == "tr"


def test_unknown_input_falls_back_to_menu(sim):
    r = sim.say("zxqwv 12345 ???", chat_id="u1")
    assert r.route == "unknown"
    assert r.buttons


def test_state_is_shared_across_channels(bot):
    """A lead created on Telegram is visible when the same chat continues on WhatsApp."""
    payload = json.dumps(GOOD_INTAKE)
    tg = Message(channel="telegram", chat_id="shared-1", user_id="u1", text=payload)
    bot.store.put_session("telegram:shared-1", {"key": "telegram:shared-1", "language": "en", "intake_raw": payload})
    r1 = bot.handle(tg)
    assert r1.route == "intake_complete"

    wa = Message(channel="whatsapp", chat_id="shared-1", user_id="u1", text="/metrics")
    # bridge the session so both channels share one conversation
    bot.store.put_session("whatsapp:shared-1", bot.store.get_session("telegram:shared-1") | {"key": "whatsapp:shared-1"})
    r2 = bot.handle(wa)
    assert "startups in pipeline: 1" in r2.text


def test_stats(bot, sim):
    sim.say("/intake", chat_id="s1")
    sim.say(json.dumps(GOOD_INTAKE), chat_id="s1")
    stats = bot.stats()
    assert stats["startups"] == 1
    assert stats["legal_cases"] == 1
    assert stats["ready"] == 1
    assert stats["sponsored_rooms"] == 24
    assert "web" in stats["channels_enabled"]


def test_audit_log_records_escalations(bot, sim):
    sim.say("guarantee me a residence permit please", chat_id="a1")
    audit = bot.store.load("audit", [])
    assert any(e["event"] == "escalated_to_human" for e in audit)
    assert any(e["event"] == "reply" for e in audit)


def test_reply_buttons_are_channel_safe(sim):
    r = sim.say("/help")
    for b in r.buttons:
        assert len(b.label) <= 80          # Discord/Telegram button label limits
        assert len(b.action) <= 99


def test_language_continuity_for_slash_commands(bot, sim):
    """A Persian conversation stays Persian when the user taps a button (/legal)."""
    sim.say("سلام، می‌خواهم برای استارتاپم در ترکیه شرکت ثبت کنم", chat_id="fa-2")
    r = sim.say("/legal", chat_id="fa-2")
    assert r.language == "fa"
    assert "مشاوره حقوقی نیست" in r.text
    # an explicit Turkish sentence switches the conversation
    r2 = sim.say("merhaba, şirket kurmak istiyoruz", chat_id="fa-2")
    assert r2.language == "tr"
    r3 = sim.say("/journey", chat_id="fa-2")
    assert r3.language == "tr"


def test_lang_command_locks_the_language(bot, sim):
    sim.say("/lang en", chat_id="lk-1")
    assert bot.store.get_session("simulated:lk-1")["language"] == "en"
    r = sim.say("سلام", chat_id="lk-1")
    assert bot.store.get_session("simulated:lk-1")["language_locked"] is True
