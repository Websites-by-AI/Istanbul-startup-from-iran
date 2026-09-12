"""Legal AI Safety Principle (deck §12/§13) — the compliance core."""

from __future__ import annotations

from bot import safety


def test_guarantee_language_is_stripped():
    text = "We guarantee kimlik and residence permit for your whole team, 100%."
    safe, report = safety.safe_reply(text, "en")
    assert "We guarantee kimlik" not in safe          # the promise itself is gone
    assert "[outcome not guaranteed]" in safe         # replaced by the safe placeholder
    assert report.removed_guarantees
    assert report.must_escalate
    assert report.refusal                             # a promise about kimlik is refused outright
    assert "not legal advice" in safe


def test_persian_guarantee_is_caught():
    text = "ما برای تیم شما کیملیک را تضمین می‌کنیم و اقامت قطعی است."
    report = safety.review(text)
    assert "immigration" in report.triggered
    assert report.refusal
    assert report.must_escalate
    safe, _ = safety.safe_reply(text, "fa")
    assert "مشاوره حقوقی نیست" in safe


def test_turkish_guarantee_is_caught():
    report = safety.review("Oturum izni ve çalışma izni garanti edilir.")
    assert report.must_escalate
    assert report.removed_guarantees


def test_immigration_question_escalates_but_is_not_refused():
    report = safety.review("which residence permit applies to a 3-person startup team?")
    assert "immigration" in report.triggered
    assert report.must_escalate
    assert not report.refusal  # we can still organise the file


def test_plain_operational_text_is_clean():
    report = safety.review("Istanbul pilot: 10 teams, 3 people each, hotels and corporate sponsors.")
    assert report.is_clean
    assert not report.must_escalate


def test_language_detection():
    assert safety.detect_language("سلام، می‌خواهم شرکت ثبت کنم") == "fa"
    assert safety.detect_language("merhaba, şirket kurmak için ne yapmalıyım") == "tr"
    assert safety.detect_language("hello, how do we land in Turkiye") == "en"


def test_disclaimer_exists_in_three_languages():
    assert set(safety.DISCLAIMER) == {"en", "fa", "tr"}
    for text in safety.DISCLAIMER.values():
        assert "guarantee" in text.lower() or "تضمین" in text or "garanti" in text.lower()


def test_safe_reply_is_idempotent_on_clean_text():
    text = "Hotels contribute unused room nights instead of cash."
    safe, report = safety.safe_reply(text)
    assert safe == text
    assert report.is_clean


def test_entity_choice_is_detected_and_disclaimed():
    report = safety.review("should we open a limited şirket or an anonim şirket subsidiary?")
    assert "entity_choice" in report.triggered
    assert report.must_disclaim


def test_negated_statements_are_not_redacted():
    """Our own compliance sentences must survive — they are disclaimers, not promises."""
    for text in (
        "no outcome is guaranteed by this platform",
        "nothing about visa outcomes is guaranteed.",
        "No guaranteed immigration result is promised.",
        "we never guarantee a residence permit",
        "هیچ نتیجه‌ای درباره اقامت تضمین نمی‌شود.",
    ):
        safe, removed = safety.strip_guarantees(text)
        assert safe == text, text
        assert removed == [], text


def test_posITIVE_promises_are_always_redacted():
    for text in (
        "We guarantee kimlik for your team.",
        "Our service guarantees a residence permit, 100%.",
        "ما کیملیک را تضمین می‌کنیم",
        "Oturum izni garanti edilir.",
    ):
        safe, removed = safety.strip_guarantees(text)
        assert removed, text
        assert "[outcome not guaranteed]" in safe, text


def test_redaction_is_stable_when_applied_twice():
    text = "We guarantee kimlik and nothing is guaranteed about the outcome."
    once, _ = safety.strip_guarantees(text)
    twice, removed = safety.strip_guarantees(once)
    assert twice == once
    assert removed == []
    assert "[outcome not [" not in twice
