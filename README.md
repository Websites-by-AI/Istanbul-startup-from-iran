# Iran → Türkiye · Startup Landing Platform

**From Exhibition → Legal Entry → Turkish Company → Corporate Partnership → Investment**

One shared bot core driving **four channels**: a **Telegram bot**, a **Discord bot**, a **WhatsApp bot**
and the **website + AI Startup Navigator widget**. A lead created on any channel lands in the same
pipeline and can continue on another channel.

> ⚖️ **AI information — not legal advice.** The AI prepares, organises and routes. Only a licensed
> legal professional (a lawyer admitted to a Turkish Bar, or the authorised Legal Desk partner)
> determines the legally appropriate route. No residence permit, work permit, kimlik, visa or
> company-registration outcome is guaranteed. This is enforced in code — see `bot/safety.py`.

---

## What is inside

| Module | File | What it does |
|---|---|---|
| **Iran–Türkiye Startup Legal Desk** *(new)* | `bot/legal_desk.py` | 6-step journey, 2-layer legal model, intake form, Pre-Landing Legal Assessment, structure options, commercial models A–D, pilot funnel |
| **Legal AI Safety Principle** *(new)* | `bot/safety.py` | Detects advice/immigration topics, strips guarantee language, appends the EN/FA/TR disclaimer, escalates to a licensed human |
| **AI Startup Navigator** | `bot/navigator.py` | EN/FA/TR intent routing, quick replies, forgiving intake parsing |
| **Sponsors + hotel map** | `bot/sponsors.py`, `data/hotels.json` | 3 sponsor types (hospitality / corporate / ecosystem), sponsored room-night capacity, hotel + corporate matching |
| **Pitch deck generator** | `bot/deck.py` | The *legal-group* deck (Legal Landing Partner + Cross-Border Startup Desk) as Markdown, printable HTML and real PDF — stdlib only |
| **Channels** | `bot/channels/` | Telegram (long polling + webhook), Discord (gateway + webhook), WhatsApp Cloud API (webhook), simulated transport for tests |
| **Website + API** | `bot/server.py`, `web/index.html` | Landing page, hotel map, intake form, deck generator, live self-test, chat widget |
| **Core + store** | `bot/core.py`, `bot/store.py` | Single `handle()` entry point, JSON persistence, audit log |

---

## Quick start

```bash
pip install -r requirements.txt

# 1) website + API + chat widget (all channels reachable via webhooks)
python -m bot.run --port 8080
#    → http://localhost:8080            (landing page, hotel map, intake, deck, live self-test)
#    → http://localhost:8080/api/health

# 2) offline demo in the terminal — no credentials, no network
python -m bot.cli                 # scripted end-to-end demo
python -m bot.cli --repl          # interactive chat with the core

# 3) tests
pytest -q                         # 150 tests: safety, legal desk, navigator, sponsors, deck, channels, HTTP API
```

## Connecting the three bots

```bash
# Telegram — token from @BotFather
export TELEGRAM_BOT_TOKEN="123456:ABC..."
python -m bot.run --telegram                   # long polling
# or webhook:  https://YOUR-DOMAIN/webhook/telegram

# Discord — enable "Server Messages" + "Message Content" intents
export DISCORD_BOT_TOKEN="..."
python -m bot.run --discord
# or webhook:  https://YOUR-DOMAIN/webhook/discord

# WhatsApp Cloud API
export WHATSAPP_TOKEN="EAAG..."
export WHATSAPP_PHONE_NUMBER_ID="1234567890"
export WHATSAPP_APP_SECRET="..."               # optional: verifies X-Hub-Signature-256
python -m bot.run --port 8080
# webhook:     https://YOUR-DOMAIN/webhook/whatsapp
# verify token: startup-landing   (override with WHATSAPP_VERIFY_TOKEN)

# everything at once
python -m bot.run --telegram --discord --port 8080
```

Channels without credentials stay **disabled but wired**: the webhooks still run the core and return
the answer, so you can test everything before creating a single bot account.

---

## Commands (identical on every channel)

```
/help        menu + command list          /hotels      hotel map + sponsored capacity
/legal       Iran–Türkiye Legal Desk      /corporate   corporate sponsorship → PoC flow
/intake      Startup Legal Intake Form    /deck        legal-partner deck (PDF/HTML/MD)
/assessment  Pre-Landing Legal Assessment /pilot       Istanbul pilot + funnel projection
/journey     the 6 steps                  /metrics     success metrics + live counters
/human       escalate to a professional   /lang en|fa|tr  answer language
```

Intake answers can be pasted as `key: value` lines or as JSON — on any channel.

---

## API

```
GET  /api/health                 GET  /api/hotels?city=Istanbul
GET  /api/info                   GET  /api/deck.pdf   /api/deck.md
POST /api/chat                   POST /api/deck       {"format":"pdf|html|md", "legal_group_name":"…"}
POST /api/intake                 GET  /api/pilot?applied=250
POST /api/assessment             GET  /api/stats
POST /api/notify                 cross-channel broadcast (website → telegram/discord/whatsapp)
POST /webhook/telegram           /webhook/whatsapp (+GET verify)   /webhook/discord
```

---

## The two-layer legal model

```
Layer 1 — Market Entry Legal (before arrival)      steps 2–4
  immigration · company · IP · contracts · compliance · founder structure
Layer 2 — Investment & Growth Legal (after landing) steps 5–6
  corporate agreements · PoC contracts · investment docs · SHA · due diligence · partnerships
```

## Istanbul pilot

10 teams × 3 people = **30 founders/team members** · funnel `100+ → 30–50 screened → 10 selected →
10 legal assessments → 10 landing plans → corporate matching → PoCs → investment/commercial deals`.

---

## Repository

```
bot/            core, safety, legal_desk, navigator, sponsors, deck, server, run, cli
bot/channels/   base, simulated, telegram, discord, whatsapp
web/index.html  website + chat widget (single file, no external assets)
data/hotels.json  seed: hotels, corporate sponsors, ecosystem sponsors, legal partners
tests/          150 tests incl. real HTTP server end-to-end
```

## Notes & boundaries

* Professional legal practice in Türkiye is regulated by the bar associations; the partnership is
  structured **with lawyers qualified in Türkiye**, and the legal partner defines every pathway.
* The platform asks hotels for **unused room-night inventory**, not cash.
* Company registration does **not** by itself confer a residence permit, work authorisation or
  citizenship; the bot never claims otherwise and strips such promises from its own output.
