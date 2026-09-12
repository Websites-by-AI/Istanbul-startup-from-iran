# Deployment

## 🌍 Live now — Cloudflare Pages

**https://istanbul-startup-from-iran.pages.dev**

Custom domain `startup.exhibition2world.ir` is registered on the project and waiting on one DNS
record — see [DOMAIN.md](DOMAIN.md) and `./domain-check.sh`.

| What | Where |
|---|---|
| Website + AI Navigator widget | `/` |
| Printable legal-partnership deck | `/deck` (also `/deck.pdf`, `/deck.md`) |
| JSON API | `/api/health`, `/api/info`, `/api/chat`, `/api/intake`, `/api/assessment`, `/api/hotels`, `/api/pilot`, `/api/deck`, `/api/stats`, `/api/safety` |
| Telegram webhook | `POST /webhook/telegram` |
| WhatsApp webhook | `POST /webhook/whatsapp` (+ `GET` verification handshake, token `startup-landing`) |
| Discord webhook | `POST /webhook/discord` |

Project: `istanbul-startup-from-iran` · account `5b456a2b43bb367410c50b35b9e7f71f` · production branch `main`.

### Two runtimes, one brain

| Runtime | Where | Code | State |
|---|---|---|---|
| **Python service** | your VPS / local | `bot/` | JSON files in `data/` — full pipeline counters, audit log, cross-channel sessions, native document delivery |
| **Edge (Cloudflare Pages)** | 300+ cities | `functions/` (JS port) | stateless — the conversation state travels with the request and is kept in the browser's `localStorage` |

`scripts/parity_check.mjs` + `tests/test_js_parity.py` run the **same expectations against both
implementations**, so the JS port cannot silently drift away from the Python core.

### Redeploy

```bash
export CLOUDFLARE_API_TOKEN="..."          # Pages:Edit permission
export CLOUDFLARE_ACCOUNT_ID="5b456a2b43bb367410c50b35b9e7f71f"

python3 build_static.py                    # rebuild public/ + functions/_core/data.js
node scripts/parity_check.mjs              # JS core sanity
pytest -q                                  # 169 tests
npx wrangler pages deploy public \
  --project-name istanbul-startup-from-iran --branch main --commit-dirty=true
```

`./deploy.sh` does all of the above (it reads the token from the environment — never from a file).

### Let the edge actually send messages

The webhooks already run the core and return the answer. To let Cloudflare *deliver* to the
messaging platforms, add the credentials as **Pages secrets** (not in the repo):

```bash
npx wrangler pages secret put TELEGRAM_BOT_TOKEN        --project-name istanbul-startup-from-iran
npx wrangler pages secret put DISCORD_BOT_TOKEN         --project-name istanbul-startup-from-iran
npx wrangler pages secret put WHATSAPP_TOKEN            --project-name istanbul-startup-from-iran
npx wrangler pages secret put WHATSAPP_PHONE_NUMBER_ID  --project-name istanbul-startup-from-iran
npx wrangler pages secret put WHATSAPP_APP_SECRET       --project-name istanbul-startup-from-iran  # optional
```

Then point each platform at the URL:

* **Telegram** — `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://istanbul-startup-from-iran.pages.dev/webhook/telegram`
* **WhatsApp** — App → WhatsApp → Configuration → Webhook URL `…/webhook/whatsapp`, verify token `startup-landing`, subscribe to the `messages` field
* **Discord** — Interactions Endpoint URL `…/webhook/discord` (for a full gateway bot use the Python service: `python -m bot.run --discord`)

## Self-hosted (full features)

```bash
pip install -r requirements.txt
cp .env.example .env            # fill in the tokens you have
python -m bot.run --telegram --discord --port 8080
```

Reverse-proxy it behind Caddy/nginx/Traefik with TLS, then use the same webhook URLs.

## Notes

* `public/` is a build artifact (gitignored) — regenerate it with `build_static.py`.
* Cloudflare's bot protection rejects empty/`curl`-less user agents with `error code: 1010`;
  when scripting checks, send a browser-like `User-Agent`.
* R2 is not enabled on this Cloudflare account, so hosting is done with **Pages** (which is the
  better fit anyway: it runs the backend Functions next to the static site).
