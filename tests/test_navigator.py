"""AI Startup Navigator — intent routing in EN / FA / TR."""

from __future__ import annotations

import pytest

from bot import navigator


@pytest.mark.parametrize(
    "text,expected",
    [
        ("/legal", "legal_desk"),
        ("/intake", "intake"),
        ("/hotels", "hotel"),
        ("/deck", "deck"),
        ("I want to talk to a lawyer about our legal desk options", "legal_desk"),
        ("how do I register a company in Turkey, limited şirket or anonim?", "company_formation"),
        ("can we get kimlik and residence permit?", "residence"),
        ("we want to raise investment and sign a term sheet", "investment"),
        ("which hotel sponsors rooms in Istanbul?", "hotel"),
        ("a Turkish corporate sponsor for a PoC", "corporate_sponsor"),
        ("send me the pitch deck pdf for the legal group", "deck"),
        ("what are the 6 steps of the journey?", "journey"),
        ("tell me about the Istanbul pilot cohort", "pilot"),
        ("hello", "greeting"),
        ("help", "help"),
        ("asdf qwer zxcv", "unknown"),
    ],
)
def test_intent_english(text, expected):
    assert navigator.top_intent(text) == expected


@pytest.mark.parametrize(
    "text,expected",
    [
        ("سلام، راهنما می‌خواهم", "help"),
        ("برای ثبت شرکت در ترکیه چه کنم؟", "company_formation"),
        ("شرایط اقامت و کیملیک چیست؟", "residence"),
        ("می‌خواهم جذب سرمایه انجام دهم", "investment"),
        ("هتل‌های اسپانسر در استانبول کدام‌اند؟", "hotel"),
        ("فرم پذیرش را بفرست", "intake"),
        ("مسیر شش مرحله‌ای را توضیح بده", "journey"),
        ("اسپانسر شرکتی برای PoC", "corporate_sponsor"),
    ],
)
def test_intent_persian(text, expected):
    assert navigator.top_intent(text) == expected


@pytest.mark.parametrize(
    "text,expected",
    [
        ("merhaba yardım menü", "help"),
        ("Türkiye'de şirket kurmak istiyoruz", "company_formation"),
        ("oturum izni ve çalışma izni nasıl alınır", "residence"),
        ("yatırımcı görüşmesi ve term sheet", "investment"),
        ("otel konaklama sponsoru var mı", "hotel"),
        ("başvuru formu", "intake"),
    ],
)
def test_intent_turkish(text, expected):
    assert navigator.top_intent(text) == expected


def test_sensitive_intents_are_flagged():
    for intent in ("residence", "company_formation", "investment", "ip", "legal_desk"):
        assert navigator.is_sensitive(intent)
    assert not navigator.is_sensitive("hotel")
    assert not navigator.is_sensitive("pilot")


def test_quick_replies_always_exist_and_are_valid_commands():
    for intent in list(navigator.INTENTS) + ["unknown"]:
        buttons = navigator.quick_replies(intent)
        assert buttons, f"no buttons for {intent}"
        for label, action in buttons:
            assert label and action.startswith("/")


def test_parse_command():
    assert navigator.parse_command("/deck Some Legal Group") == ("deck", "Some Legal Group")
    assert navigator.parse_command("/legal") == ("legal", "")
    assert navigator.parse_command("hello") == ("", "hello")


def test_extract_intake_from_key_value_text():
    text = """
    startup_name: Pars Vision
    sector: AI
    stage: mvp
    team_size: 3
    has_iran_entity: yes
    ip_owned_by_company: no
    funding_target_usd: 250000
    intended_city = Istanbul
    """
    data = navigator.extract_intake_from_text(text)
    assert data["startup_name"] == "Pars Vision"
    assert data["team_size"] == 3
    assert data["has_iran_entity"] is True
    assert data["ip_owned_by_company"] is False
    assert data["funding_target_usd"] == 250000
    assert data["intended_city"] == "Istanbul"


def test_extract_intake_handles_persian_keys():
    data = navigator.extract_intake_from_text("نام: آریا\nحوزه: SaaS\nشهر: Ankara\nتعداد: 3")
    assert data["startup_name"] == "آریا"
    assert data["sector"] == "SaaS"
    assert data["intended_city"] == "Ankara"
    assert data["team_size"] == 3


def test_json_detection():
    assert navigator.looks_like_intake_json('{"startup_name": "X"}')
    assert not navigator.looks_like_intake_json("startup_name: X")
