"""Pitch-deck generator for the legal group (deck §1–§24)."""

from __future__ import annotations

from bot import deck


def test_markdown_contains_the_reframed_offer():
    md = deck.deck_markdown()
    assert "Startup Legal Landing Partnership" in md
    assert "Iran–Türkiye Startup Legal Desk" in md
    # it must NOT read like the startup-attraction deck
    assert "Legal Landing Partner" in md or "Strategic Legal Landing Partner" in md
    for section in [
        "The Opportunity",
        "Why a Legal Partner Is Essential",
        "Two-Layer Legal Model",
        "Qualified Startup Client Pipeline",
        "Legal AI Safety Principle",
        "Proposed Commercial Model",
        "Pilot Proposal",
        "Success Metrics",
        "Proposed First Meeting",
    ]:
        assert section in md, f"missing section: {section}"


def test_markdown_carries_the_compliance_lines():
    md = deck.deck_markdown()
    assert "No guaranteed immigration result is promised." in md
    assert "AI does not replace the lawyer." in md
    assert "bar associations" in md
    assert "licensed legal professional remains responsible" in md


def test_personalisation():
    md = deck.deck_markdown(deck.DeckOptions(
        legal_group_name="Ankara Cross-Border Law Office",
        pilot_city="Ankara",
        cohort_size=6,
        team_size=4,
        contact="hello@example.com",
    ))
    assert "Ankara Cross-Border Law Office" in md
    assert "Ankara Pilot" in md
    assert "6 startup teams" in md
    assert "**24**" in md            # 6 teams x 4 people
    assert "hello@example.com" in md


def test_html_is_self_contained():
    html = deck.deck_html()
    assert html.startswith("<!doctype html>")
    assert "<style>" in html and "http://" not in html.split("<style>")[0]
    assert "<table>" in html                     # commercial models table rendered
    assert "AI information — not legal advice" in html
    assert "<script" not in html                 # no JS → prints cleanly


def test_pdf_is_valid_and_readable():
    pdf = deck.deck_pdf(deck.DeckOptions(legal_group_name="Test Grup Hukuk"))
    assert pdf.startswith(b"%PDF-1.4")
    assert pdf.rstrip().endswith(b"%%EOF")

    pypdf = __import__("pytest").importorskip("pypdf")
    import io

    reader = pypdf.PdfReader(io.BytesIO(pdf))
    assert len(reader.pages) >= 4
    text = "\n".join((p.extract_text() or "") for p in reader.pages)
    assert "Startup Legal Landing Partnership" in text
    assert "Test Grup Hukuk" in text
    assert "Two-Layer Legal Model" in text
    # markdown syntax must not leak into the PDF
    assert "**" not in text and "##" not in text


def test_pdf_handles_turkish_and_arabic_script_safely():
    pdf = deck.deck_pdf(deck.DeckOptions(legal_group_name="گروه وکلای ایران و ترکیه"))
    assert pdf.startswith(b"%PDF-1.4")
    pypdf = __import__("pytest").importorskip("pypdf")
    import io

    reader = pypdf.PdfReader(io.BytesIO(pdf))
    text = "\n".join((p.extract_text() or "") for p in reader.pages)
    assert "Türkiye" in text or "TÜRKIYE" in text.upper()
    # no arabic-script garbage in a WinAnsi PDF
    assert not any("\u0600" <= ch <= "\u06FF" for ch in text)


def test_build_all_and_filename():
    bundle = deck.build_all(deck.DeckOptions(legal_group_name="Iranian–Turkish Legal Group"))
    assert set(bundle) >= {"md", "html", "pdf", "filename", "generated_at"}
    assert bundle["filename"].endswith(".pdf")
    assert bundle["filename"].startswith("legal-landing-partnership-")
    assert len(bundle["pdf"]) > 4000
    assert deck.deck_filename(None, "md").endswith(".md")
