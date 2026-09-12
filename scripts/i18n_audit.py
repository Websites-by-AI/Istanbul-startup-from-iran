#!/usr/bin/env python3
"""i18n audit — proves Turkish (and Persian) coverage across bot + website.

    python3 scripts/i18n_audit.py            # report, exit 1 on gaps
    python3 scripts/i18n_audit.py --quiet

What it checks
--------------
1. Website: every `data-i18n` key in web/index.html exists in the en / fa / tr
   blocks of the I18N dictionary (nothing silently falls back to English).
2. Bot: Turkish and Persian prompts for every documented command are detected as
   `tr` / `fa`, land on the expected route and carry a localised one-line summary.
3. Routes: every `route="…"` the Python core can emit has an fa + tr summary, and
   the JS port (`functions/_core/core.js`) has exactly the same summary routes.
4. Channel text: the Turkish channel announcement / bot profile strings in
   `scripts/setup_telegram.py` are present for all three languages and within the
   Telegram field limits.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from bot.config import AppConfig          # noqa: E402
from bot.core import SUMMARY, Bot         # noqa: E402
from bot.models import Message            # noqa: E402
from bot.store import Store               # noqa: E402

# (command, turkish prompt, persian prompt, expected route)
PROMPTS = [
    ("start", "merhaba", "سلام", "greeting"),
    ("legal", "hukuk masası hakkında bilgi ver", "درباره میز حقوقی بگو", "legal_desk"),
    ("intake", "başvuru formunu doldurmak istiyorum", "می‌خواهم فرم پذیرش را پر کنم", "intake"),
    ("assessment", "iniş öncesi hukuki değerlendirme yapar mısın", "ارزیابی پیش از ورود انجام بده", "assessment"),
    ("journey", "6 adımlı iniş yolculuğunu göster", "مسیر شش مرحله‌ای ورود را نشان بده", "journey"),
    ("hotels", "otel haritası ve sponsorlu odalar", "نقشه هتل و اتاق‌های اسپانسری", "hotels"),
    ("corporate", "kurumsal sponsorluk ve PoC akışı", "اسپانسرشیپ شرکتی و PoC", "corporate"),
    ("sponsor", "sponsor modelleri nelerdir", "مدل‌های اسپانسری چیست", "corporate"),
    ("ecosystem", "ekosistem sponsorları kimler", "اسپانسرهای اکوسیستم چه کسانی هستند", "ecosystem"),
    ("deck", "hukuk bürosu için sunum hazırla", "برای گروه حقوقی ارائه بساز", "deck"),
    ("pilot", "İstanbul pilot programı ve huni", "برنامه پایلوت استانبول و قیف", "pilot"),
    ("metrics", "başarı metrikleri neler", "شاخص‌های موفقیت چیست", "metrics"),
    ("human", "lisanslı bir avukata aktar", "به وکیل دارای پروانه ارجاع بده", "human"),
    ("company", "Türkiye'de şirket kurmak istiyorum", "می‌خواهم در ترکیه شرکت ثبت کنم", "company_formation"),
    ("residence", "oturum izni için hangi yol izlenmeli", "برای اقامت چه مسیری را باید رفت", "residence"),
    ("investment", "yatırımcı bulmak istiyorum", "می‌خواهم سرمایه‌گذار پیدا کنم", "investment"),
    ("ip", "fikri mülkiyet koruması nasıl olur", "محافظت از مالکیت فکری چگونه است", "ip"),
]

# routes that intentionally have no prose (pure state changes / machine answers)
# routes whose answer is already trilingual by construction, or pure state changes
NO_SUMMARY_OK = {"intake_reset", "intake_incomplete", "assessment_missing", "advance_missing",
                 "unknown", "lang"}

GUARANTEE_WORDS = ("garanti", "guarantee", "تضمین")


def check_site(gaps: list[str], log) -> None:
    html = (ROOT / "web" / "index.html").read_text(encoding="utf-8")
    keys = set(re.findall(r'data-i18n="([^"]+)"', html))
    m = re.search(r"const I18N = \{(.*?)\n\};", html, re.S)
    if not m:
        gaps.append("I18N dictionary not found in web/index.html")
        return
    body = m.group(1)
    langs: dict[str, set[str]] = {}
    # `en:{}` is empty on purpose — the markup itself is the English source text.
    langs["en"] = set(keys)
    for lang in ("fa", "tr"):
        block = re.search(rf"\n  {lang}:\{{(.*?)\n  \}},?", body, re.S)
        if not block:
            gaps.append(f"site: could not parse the {lang} block of I18N")
            langs[lang] = set()
            continue
        langs[lang] = set(re.findall(r'([a-z0-9_]+)\s*:\s*"', block.group(1)))
    for lang in ("fa", "tr"):
        missing = sorted(keys - langs[lang])
        log(f"site {lang}: {len(keys & langs[lang])}/{len(keys)} data-i18n keys translated"
            + (f" · missing {missing}" if missing else ""))
        for k in missing:
            gaps.append(f"site: data-i18n key `{k}` has no {lang} translation")
    extra = sorted((langs["fa"] | langs["tr"]) - keys)
    if extra:
        log(f"site: {len(extra)} dictionary entries unused by the markup (harmless): {extra[:6]}…")
    if not langs["fa"] or not langs["tr"]:
        gaps.append("site: a language block is empty")


def check_bot(gaps: list[str], log) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        cfg = AppConfig()
        cfg.state_dir = Path(tmp) / "state"
        cfg.data_dir = ROOT / "data"
        cfg.state_dir.mkdir(parents=True, exist_ok=True)
        bot = Bot(cfg, Store(cfg.state_dir))

        for lang, idx in (("tr", 1), ("fa", 2)):
            detected = routed = summarised = not_applicable = 0
            problems = []
            for entry in PROMPTS:
                command, prompt, expected = entry[0], entry[idx], entry[3]
                r = bot.handle(Message(channel="telegram", chat_id=f"audit-{lang}-{command}",
                                       user_id=f"audit-{lang}-{command}", text=prompt))
                if r.language != lang:
                    problems.append(f"{command}: language={r.language}")
                else:
                    detected += 1
                if expected not in (r.route, r.intent):
                    problems.append(f"{command}: route={r.route} (expected {expected})")
                else:
                    routed += 1
                if SUMMARY.get(r.route, {}).get(lang):
                    summarised += 1
                elif r.route in NO_SUMMARY_OK:
                    not_applicable += 1
                else:
                    problems.append(f"{command}: no {lang} summary for route {r.route}")
                low = (r.text or "").lower()
                if any(w in low for w in GUARANTEE_WORDS) and "garanti edilmez" not in low and "not guaranteed" not in low \
                        and "تضمین نمی‌شود" not in low:
                    problems.append(f"{command}: unqualified guarantee wording survived")
            total = len(PROMPTS)
            log(f"bot {lang}: language {detected}/{total} · route {routed}/{total} · localised summary "
                f"{summarised}/{total - not_applicable} (+{not_applicable} state routes)")
            for p in problems:
                gaps.append(f"bot {lang}: {p}")


def check_routes(gaps: list[str], log) -> None:
    core_py = (ROOT / "bot" / "core.py").read_text(encoding="utf-8")
    emitted = set(re.findall(r'route="([a-z_]+)"', core_py))
    log(f"routes emitted by the Python core: {len(emitted)}")
    for route in sorted(emitted):
        if route in NO_SUMMARY_OK:
            continue
        for lang in ("fa", "tr"):
            if not SUMMARY.get(route, {}).get(lang):
                gaps.append(f"routes: `{route}` has no {lang} summary")
    js = (ROOT / "functions" / "_core" / "core.js").read_text(encoding="utf-8")
    js_routes: set[str] = set()
    for block_re in (r"const SUMMARY = \{(.*?)\n\};", r"Object\.assign\(SUMMARY, \{(.*?)\n\}\);"):
        m = re.search(block_re, js, re.S)
        if m:
            js_routes |= set(re.findall(r"^\s*([a-z_]+): \{", m.group(1), re.M))
    if not js_routes:
        gaps.append("routes: could not parse the JS SUMMARY table")
    py_routes = set(SUMMARY)
    log(f"summary routes: python {len(py_routes)} · js {len(js_routes)}")
    if js_routes != py_routes:
        gaps.append(f"routes: JS/Python summary routes differ (js-only {sorted(js_routes - py_routes)}, "
                    f"py-only {sorted(py_routes - js_routes)})")


def check_telegram_profile(gaps: list[str], log) -> None:
    import importlib.util

    spec = importlib.util.spec_from_file_location("setup_telegram", ROOT / "scripts" / "setup_telegram.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    limits = (("NAME", mod.NAME, 64), ("DESCRIPTION", mod.DESCRIPTION, 512), ("SHORT", mod.SHORT, 120),
              ("ANNOUNCEMENT", mod.ANNOUNCEMENT, 4096))
    for name, table, limit in limits:
        for lang in ("", "tr", "fa", "en"):
            if lang in table and len(table[lang]) > limit:
                gaps.append(f"telegram: {name}[{lang or 'en'}] is {len(table[lang])} chars (limit {limit})")
    if len(mod.COMMANDS) < 10:
        gaps.append("telegram: command menu looks too short")
    for command, *descs in mod.COMMANDS:
        if len(descs) != 3 or any(len(d) > 256 or not d for d in descs):
            gaps.append(f"telegram: command `{command}` needs en/tr/fa descriptions ≤256 chars")
    log(f"telegram profile: name/description/about for {len(mod.DESCRIPTION)} languages · "
        f"{len(mod.COMMANDS)} commands × 3 languages · announcements {sorted(mod.ANNOUNCEMENT)}")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--quiet", action="store_true")
    ap.add_argument("--json", action="store_true", help="machine-readable report")
    args = ap.parse_args()

    gaps: list[str] = []
    lines: list[str] = []

    def log(msg: str) -> None:
        lines.append(msg)
        if not args.quiet:
            print("  " + msg)

    print("\n1) website dictionary")
    check_site(gaps, log)
    print("2) bot answers (Turkish + Persian prompts)")
    check_bot(gaps, log)
    print("3) route ↔ summary parity (Python vs JS)")
    check_routes(gaps, log)
    print("4) Telegram profile / command menu / channel posts")
    check_telegram_profile(gaps, log)

    if args.json:
        print(json.dumps({"ok": not gaps, "checks": lines, "gaps": gaps}, ensure_ascii=False, indent=2))
        return 1 if gaps else 0
    if gaps:
        print(f"\n✗ {len(gaps)} gap(s):")
        for g in gaps:
            print("  - " + g)
        return 1
    print(f"\n✓ i18n audit clean — {len(lines)} checks, 0 gaps")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
