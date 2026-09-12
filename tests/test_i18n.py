"""Turkish / Persian language coverage — bot, website dictionary, Telegram profile.

The heavy lifting lives in `scripts/i18n_audit.py` so the same audit can be run
by hand; these tests pin the parts that matter most and fail loudly on drift.
"""

from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
AUDIT = ROOT / "scripts" / "i18n_audit.py"

spec = importlib.util.spec_from_file_location("i18n_audit", AUDIT)
audit = importlib.util.module_from_spec(spec)
sys.modules["i18n_audit"] = audit
spec.loader.exec_module(audit)  # type: ignore[union-attr]

from bot import safety  # noqa: E402
from bot.core import SUMMARY  # noqa: E402
from bot.navigator import top_intent  # noqa: E402


def run_audit() -> dict:
    proc = subprocess.run([sys.executable, str(AUDIT), "--quiet", "--json"], cwd=ROOT,
                          capture_output=True, text=True, timeout=300)
    payload = proc.stdout[proc.stdout.index("{"):]
    data = json.loads(payload)
    assert proc.returncode == 0, "\n".join(data.get("gaps", [])) or proc.stderr
    return data


def test_audit_reports_no_gaps() -> None:
    data = run_audit()
    assert data["ok"] is True
    assert data["gaps"] == []
    assert len(data["checks"]) >= 6


@pytest.mark.parametrize(
    "text",
    [
        "sponsor modelleri nelerdir",
        "otel haritası ve sponsorlu odalar hakkında bilgi verir misin",
        "hukuk bürosu için sunum hazırla",
        "ekosistem sponsorları kimler",
        "6 adımlı iniş yolculuğunu göster",
        "lisanslı bir avukata aktar",
    ],
)
def test_turkish_free_text_is_detected_as_turkish(text: str) -> None:
    assert safety.detect_language(text, "") == "tr"


@pytest.mark.parametrize(
    ("text", "intent"),
    [
        ("hukuk bürosu için sunum hazırla", "deck"),
        ("otel haritası ve sponsorlu odalar", "hotel"),
        ("ekosistem sponsorları kimler", "ecosystem"),
        ("6 adımlı iniş yolculuğunu göster", "journey"),
        ("lisanslı bir avukata aktar", "human"),
        ("iniş öncesi hukuki değerlendirme yapar mısın", "assessment"),
        ("kurumsal sponsorluk ve PoC akışı", "corporate_sponsor"),
        ("اسپانسرهای اکوسیستم چه کسانی هستند", "ecosystem"),
        ("برای گروه حقوقی ارائه بساز", "deck"),
        ("به وکیل دارای پروانه ارجاع بده", "human"),
        ("نقشه هتل و اتاق‌های اسپانسری", "hotel"),
        ("مسیر شش مرحله‌ای ورود را نشان بده", "journey"),
    ],
)
def test_tr_fa_free_text_routes_like_the_command(text: str, intent: str) -> None:
    assert top_intent(text) == intent


def test_slash_commands_stay_language_neutral() -> None:
    for command, intent in [("/legal", "legal_desk"), ("/hotels", "hotel"), ("/deck", "deck"),
                            ("/human", "human"), ("/ecosystem", "ecosystem"), ("/sponsor", "corporate_sponsor"),
                            ("/journey", "journey"), ("/metrics", "metrics"), ("/advance", "advance")]:
        assert top_intent(command) == intent, command


@pytest.mark.parametrize("route", ["greeting", "ecosystem", "advance", "legal_desk", "hotels", "deck"])
def test_every_prose_route_has_fa_and_tr_summaries(route: str) -> None:
    entry = SUMMARY.get(route) or {}
    assert entry.get("fa"), f"{route} has no Persian summary"
    assert entry.get("tr"), f"{route} has no Turkish summary"


def test_website_dictionary_covers_every_key() -> None:
    import re

    html = (ROOT / "web" / "index.html").read_text(encoding="utf-8")
    keys = set(re.findall(r'data-i18n="([^"]+)"', html))
    assert len(keys) >= 60
    for lang in ("fa", "tr"):
        block = re.search(rf"\n  {lang}:\{{(.*?)\n  \}},?", html, re.S)
        assert block, f"no {lang} block in I18N"
        have = set(re.findall(r'([a-z0-9_]+)\s*:\s*"', block.group(1)))
        assert keys - have == set(), f"{lang} is missing {sorted(keys - have)}"


def test_telegram_profile_strings_are_trilingual_and_within_limits() -> None:
    spec2 = importlib.util.spec_from_file_location("setup_telegram", ROOT / "scripts" / "setup_telegram.py")
    mod = importlib.util.module_from_spec(spec2)
    spec2.loader.exec_module(mod)  # type: ignore[union-attr]
    for table, limit in ((mod.NAME, 64), (mod.DESCRIPTION, 512), (mod.SHORT, 120), (mod.ANNOUNCEMENT, 4096)):
        for lang, value in table.items():
            assert len(value) <= limit, f"{lang} exceeds {limit}: {len(value)}"
    for lang in ("tr", "fa", "en"):
        assert lang in mod.ANNOUNCEMENT or (lang == "en" and "" in mod.ANNOUNCEMENT)
    assert len(mod.COMMANDS) >= 12
    for command, *descriptions in mod.COMMANDS:
        assert len(descriptions) == 3 and all(0 < len(d) <= 256 for d in descriptions), command


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(pytest.main([__file__, "-q"]))
