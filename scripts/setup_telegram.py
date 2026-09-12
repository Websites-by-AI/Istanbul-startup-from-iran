#!/usr/bin/env python3
"""Configure the Telegram side of the platform — bot profile, trilingual command
menu, webhook and (optionally) a channel announcement.

    export TELEGRAM_BOT_TOKEN="..."          # from @BotFather
    export TELEGRAM_WEBHOOK_SECRET="..."     # optional, random; Telegram then signs every update
    python3 scripts/setup_telegram.py                       # profile + commands + webhook
    python3 scripts/setup_telegram.py --announce            # + post to the channel
    python3 scripts/setup_telegram.py --chat @AI_Turkish_startup --no-webhook

The token is read from the environment only — it is never written to a file, and
every response is printed without it.
"""

from __future__ import annotations

import argparse
import json
import os
import secrets
import sys
import urllib.error
import urllib.request

API = "https://api.telegram.org/bot{token}/{method}"
SITE = "https://istanbul-startup-from-iran.pages.dev"
MIRROR = "https://websites-by-ai.github.io/Istanbul-startup-from-iran/"
DEFAULT_CHANNEL = "@AI_Turkish_startup"

# ---------------------------------------------------------------- bot profile
NAME = {
    "": "Iran → Türkiye Startup Landing",
    "tr": "İran → Türkiye Startup İniş Masası",
    "fa": "پلتفرم ورود استارتاپ ایران → ترکیه",
}

DESCRIPTION = {
    "": (
        "AI Startup Navigator for teams entering Türkiye from Iran.\n\n"
        "6-step landing journey · two-layer legal model · Legal Intake Form · pre-landing assessment · "
        "sponsored hotel map (Istanbul/Ankara) · corporate sponsorship · pitch deck for legal groups "
        "(PDF).\n\n"
        "⚖️ AI information — not legal advice. Only a licensed lawyer (Turkish Bar) or the Legal Desk "
        "partner determines the route. No residence/work permit, kimlik, visa or registration outcome "
        "is guaranteed.\n\n" + SITE
    ),
    "tr": (
        "İran'dan Türkiye'ye açılan ekipler için yapay zekâ startup rehberi.\n\n"
        "6 adımlı iniş yolculuğu · iki katmanlı hukuk modeli · Hukuk Başvuru Formu · iniş öncesi "
        "değerlendirme · sponsorlu otel haritası (İstanbul/Ankara) · kurumsal sponsorluk · hukuk "
        "bürosu sunumu (PDF).\n\n"
        "⚖️ Yapay zekâ bilgilendirmesi — hukuki tavsiye değildir. Uygun yolu yalnızca ruhsatlı avukat "
        "belirler. Oturum/çalışma izni, kimlik, vize veya şirket kuruluşu sonucu garanti edilmez.\n\n" + SITE
    ),
    "fa": (
        "راهنمای هوش مصنوعی ورود استارتاپ از ایران به ترکیه.\n\n"
        "مسیر شش‌مرحله‌ای ورود · مدل حقوقی دو لایه · فرم پذیرش حقوقی · ارزیابی پیش از ورود · نقشه "
        "هتل‌های اسپانسری (استانبول/آنکارا) · اسپانسرشیپ شرکتی · پیچ‌دک برای گروه حقوقی (PDF) · "
        "قیف پایلوت استانبول.\n\n"
        "⚖️ این اطلاعات مشاوره حقوقی نیست. تعیین مسیر فقط با وکیل دارای پروانه (کانون وکلای ترکیه) است. "
        "هیچ نتیجه‌ای درباره اقامت، کیملیک، اجازه کار، ویزا یا ثبت شرکت تضمین نمی‌شود.\n\n" + SITE
    ),
}

SHORT = {
    "": "AI navigator for the Iran → Türkiye startup landing desk. Information, not legal advice.",
    "tr": "İran → Türkiye startup iniş masası için yapay zekâ rehberi. Bilgilendirme, hukuki tavsiye değil.",
    "fa": "راهنمای هوش مصنوعی میز حقوقی ورود استارتاپ ایران → ترکیه. اطلاع‌رسانی، نه مشاوره حقوقی.",
}

# ------------------------------------------------------------- command menus
# (command, EN description, TR description, FA description)
COMMANDS = [
    ("start", "Menu & language", "Menü ve dil", "منو و زبان"),
    ("legal", "Iran–Türkiye Startup Legal Desk", "İran–Türkiye Startup Hukuk Masası", "میز حقوقی استارتاپ ایران–ترکیه"),
    ("intake", "Startup Legal Intake Form", "Startup Hukuk Başvuru Formu", "فرم پذیرش حقوقی استارتاپ"),
    ("assessment", "Pre-landing legal assessment", "İniş öncesi hukuki değerlendirme", "ارزیابی حقوقی پیش از ورود"),
    ("journey", "The 6-step landing journey", "6 adımlı iniş yolculuğu", "مسیر شش‌مرحله‌ای ورود"),
    ("hotels", "Hotel map & sponsored rooms", "Otel haritası ve sponsorlu odalar", "نقشه هتل و اتاق‌های اسپانسری"),
    ("corporate", "Corporate sponsorship & PoC", "Kurumsal sponsorluk ve PoC", "اسپانسرشیپ شرکتی و PoC"),
    ("sponsor", "Sponsor models (all types)", "Sponsor modelleri (tüm türler)", "مدل‌های اسپانسری (همه انواع)"),
    ("ecosystem", "Ecosystem sponsors & partners", "Ekosistem sponsorları ve ortaklar", "اسپانسرهای اکوسیستم و شرکا"),
    ("deck", "Pitch deck for the legal group", "Hukuk bürosu için sunum", "پیچ‌دک برای گروه حقوقی"),
    ("pilot", "Istanbul pilot & funnel", "İstanbul pilot programı ve huni", "پایلوت استانبول و قیف"),
    ("metrics", "Success metrics", "Başarı metrikleri", "شاخص‌های موفقیت"),
    ("advance", "Advance my legal case", "Hukuki dosyamı ilerlet", "پرونده حقوقی را جلو ببر"),
    ("lang", "Language: /lang en | fa | tr", "Dil: /lang en | fa | tr", "زبان: /lang en | fa | tr"),
    ("human", "Hand over to a licensed lawyer", "Ruhsatlı avukata aktar", "ارجاع به وکیل دارای پروانه"),
]

ANNOUNCEMENT = {
    "tr": (
        "🇹🇷 İran → Türkiye Startup İniş Masası yayında\n\n"
        "Yapay zekâ destekli Startup Rehberi artık Telegram'da: 6 adımlı iniş yolculuğu, iki katmanlı "
        "hukuk modeli, Startup Hukuk Başvuru Formu, iniş öncesi değerlendirme, İstanbul ve Ankara için "
        "sponsorlu otel haritası, kurumsal sponsorluk akışı ve hukuk büroları için hazır sunum (PDF).\n\n"
        "🤖 Bot: @AI_Turkish_startup_bot  ·  /legal ile başlayın\n"
        f"🌐 Site: {SITE}\n🪞 Ayna: {MIRROR}\n\n"
        "⚖️ Yapay zekâ bilgilendirmesi — hukuki tavsiye değildir. Somut olay için uygun yolu yalnızca "
        "ruhsatlı avukat belirler. Oturum izni, çalışma izni, kimlik, vize veya şirket kuruluşu sonucu "
        "garanti edilmez."
    ),
    "fa": (
        "🇮🇷→🇹🇷 میز حقوقی ورود استارتاپ ایران → ترکیه فعال شد\n\n"
        "راهنمای هوش مصنوعی استارتاپ حالا روی تلگرام در دسترس است: مسیر شش‌مرحله‌ای ورود، مدل حقوقی "
        "دو لایه، فرم پذیرش حقوقی استارتاپ، ارزیابی پیش از ورود، نقششه هتل‌های اسپانسری در استانبول و "
        "آنکارا، مسیر اسپانسرشیپ شرکتی و پیچ‌دک آماده برای گروه‌های حقوقی (PDF).\n\n"
        "🤖 بات: @AI_Turkish_startup_bot  ·  با /legal شروع کنید\n"
        f"🌐 سایت: {SITE}\n🪞 آینه: {MIRROR}\n\n"
        "⚖️ این اطلاعات توسط هوش مصنوعی تولید شده و مشاوره حقوقی نیست. تعیین مسیر حقوقی هر پرونده فقط "
        "با وکیل دارای پروانه (عضو کانون وکلای ترکیه) است. هیچ نتیجه‌ای درباره اقامت، کیملیک، اجازه کار، "
        "ویزا یا ثبت شرکت تضمین نمی‌شود."
    ),
    "en": (
        "🌍 Iran → Türkiye Startup Legal Landing Desk is live\n\n"
        "The AI Startup Navigator is now on Telegram: the 6-step landing journey, the two-layer legal "
        "model, the Startup Legal Intake Form, the pre-landing assessment, the sponsored hotel map for "
        "Istanbul & Ankara, the corporate sponsorship flow and a ready pitch deck for legal groups (PDF).\n\n"
        "🤖 Bot: @AI_Turkish_startup_bot  ·  start with /legal\n"
        f"🌐 Site: {SITE}\n🪞 Mirror: {MIRROR}\n\n"
        "⚖️ AI information — not legal advice. Only a licensed legal professional determines the legally "
        "appropriate route. No residence permit, work permit, kimlik, visa or company-registration "
        "outcome is guaranteed."
    ),
}

CHANNEL_DESCRIPTION = (
    "İran → Türkiye Startup İniş Masası · میز حقوقی ورود استارتاپ ایران → ترکیه\n\n"
    "🇹🇷 Yapay zekâ destekli startup rehberi: 6 adımlı iniş yolculuğu, iki katmanlı hukuk modeli, "
    "başvuru formu, sponsorlu otel haritası, kurumsal sponsorluk, hukuk bürosu sunumu.\n"
    "🇮🇷 راهنمای هوش مصنوعی: مسیر شش‌مرحله‌ای ورود، مدل حقوقی دو لایه، فرم پذیرش، نقشه هتل‌های "
    "اسپانسری، اسپانسرشیپ شرکتی، پیچ‌دک حقوقی.\n\n"
    f"🤖 @AI_Turkish_startup_bot · 🌐 {SITE}\n\n"
    "⚖️ AI information — not legal advice. No residence / work permit / kimlik / visa / company "
    "registration outcome is guaranteed.\n"
    "⚖️ Yapay zekâ bilgilendirmesi — hukuki tavsiye değildir. Hiçbir oturum / çalışma izni / kimlik / "
    "vize / şirket kuruluşu sonucu garanti edilmez."
)


LIMITS = {"setMyName": ("name", 64), "setMyDescription": ("description", 512),
          "setMyShortDescription": ("short_description", 120)}


def fit(text: str, limit: int) -> str:
    """Telegram rejects over-long profile fields — trim on a word/newline boundary."""
    text = str(text)
    if len(text) <= limit:
        return text
    cut = text[: limit - 1]
    for sep in ("\n", " "):
        if sep in cut[len(cut) // 2:]:
            cut = cut[: cut.rfind(sep)]
            break
    return cut.rstrip() + "…"


def call(token: str, method: str, **payload) -> dict:
    if method in LIMITS:
        field, limit = LIMITS[method]
        if field in payload:
            payload[field] = fit(payload[field], limit)
    url = API.format(token=token, method=method)
    data = json.dumps(payload).encode() if payload else None
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            body = json.loads(r.read().decode())
    except urllib.error.HTTPError as exc:  # Telegram returns 4xx with a JSON body
        body = json.loads(exc.read().decode() or "{}")
    if not body.get("ok"):
        print(f"  ✗ {method}: {body.get('description')}", file=sys.stderr)
    return body


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--chat", default=DEFAULT_CHANNEL, help="channel/chat for --announce")
    ap.add_argument("--webhook-url", default=SITE + "/webhook/telegram")
    ap.add_argument("--no-webhook", action="store_true", help="only set the profile + commands")
    ap.add_argument("--announce", action="store_true", help="post the TR/FA/EN announcement to --chat")
    ap.add_argument("--pin", action="store_true", help="pin an announcement post")
    ap.add_argument("--pin-lang", default="tr", choices=("tr", "fa", "en"), help="which post to pin (default tr)")
    ap.add_argument("--channel-info", action="store_true", help="also set the channel title/description")
    args = ap.parse_args()

    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        print("set TELEGRAM_BOT_TOKEN", file=sys.stderr)
        return 2

    me = call(token, "getMe").get("result") or {}
    print(f"bot: @{me.get('username')} (id {me.get('id')})")

    # ---- profile: name / description / about in every language we support ----
    for code, value in NAME.items():
        payload = {"name": value}
        if code:
            payload["language_code"] = code
        call(token, "setMyName", **payload)
    for code, value in DESCRIPTION.items():
        payload = {"description": value}
        if code:
            payload["language_code"] = code
        call(token, "setMyDescription", **payload)
    for code, value in SHORT.items():
        payload = {"short_description": value}
        if code:
            payload["language_code"] = code
        call(token, "setMyShortDescription", **payload)
    print("profile: name + description + about set for en/tr/fa")

    # ---- command menu, one per language -------------------------------------
    for code, index in (("", 0), ("tr", 1), ("fa", 2)):
        commands = [{"command": c, "description": desc[index]} for c, *desc in COMMANDS]
        payload = {"commands": commands}
        if code:
            payload["language_code"] = code
        call(token, "setMyCommands", **payload)
    print(f"commands: {len(COMMANDS)} commands × 3 languages")
    for label, field, limit in (("name", NAME, 64), ("description", DESCRIPTION, 512), ("about", SHORT, 120)):
        sizes = " · ".join(f"{k or 'en'}={len(v)}" for k, v in field.items())
        flag = "" if all(len(v) <= limit for v in field.values()) else f"  (trimmed to {limit})"
        print(f"  {label}: {sizes}{flag}")

    # ---- webhook ------------------------------------------------------------
    if not args.no_webhook:
        secret = os.environ.get("TELEGRAM_WEBHOOK_SECRET") or secrets.token_hex(24)
        call(token, "setWebhook", url=args.webhook_url, secret_token=secret,
             allowed_updates=["message", "edited_message", "callback_query", "channel_post"],
             max_connections=40, drop_pending_updates=True)
        info = call(token, "getWebhookInfo").get("result") or {}
        print(f"webhook: {info.get('url')} · pending {info.get('pending_update_count')}")
        if not os.environ.get("TELEGRAM_WEBHOOK_SECRET"):
            print(f"  ↳ generated secret_token — store it on the hosting side as TELEGRAM_WEBHOOK_SECRET: {secret}")
        else:
            print("  ↳ signed with the TELEGRAM_WEBHOOK_SECRET from the environment")

    # ---- channel ------------------------------------------------------------
    if args.channel_info:
        call(token, "setChatDescription", chat_id=args.chat, description=CHANNEL_DESCRIPTION)
        print(f"channel: description updated for {args.chat}")

    if args.announce:
        ids = {}
        for code in (args.pin_lang, *[c for c in ("tr", "fa", "en") if c != args.pin_lang]):
            r = call(token, "sendMessage", chat_id=args.chat, text=ANNOUNCEMENT[code], disable_web_page_preview=False)
            res = r.get("result") or {}
            if res.get("message_id"):
                ids[code] = res["message_id"]
            print(f"  → {code} announcement: {'ok' if r.get('ok') else r.get('description')} (message_id {res.get('message_id')})")
        if args.pin and ids.get(args.pin_lang):
            p = call(token, "pinChatMessage", chat_id=args.chat, message_id=ids[args.pin_lang], disable_notification=True)
            print(f"  → pinned the {args.pin_lang} post: {p.get('ok') or p.get('description')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
