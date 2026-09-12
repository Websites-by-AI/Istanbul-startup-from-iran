# Deployment

## 🌍 Live now — two hosts, one build

| Host | URL | What runs there |
|---|---|---|
| **Cloudflare Pages** (primary) | https://istanbul-startup-from-iran.pages.dev | site + edge JSON API + Telegram/Discord/WhatsApp webhooks |
| **GitHub Pages** (static mirror) | https://websites-by-ai.github.io/Istanbul-startup-from-iran/ | the same site from branch `gh-pages`; API/chat calls go cross-origin to the Cloudflare origin |
| GitHub repo | https://github.com/Websites-by-AI/Istanbul-startup-from-iran | `main` = source (default branch), `gh-pages` = built mirror, `master` = the older Next.js draft, untouched |

Custom domain `startup.exhibition2world.ir` is registered on the Pages project and waiting on one DNS
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

### Three deployments, one brain

| Runtime | Where | Code | State |
|---|---|---|---|
| **Python service** | your VPS / local | `bot/` | JSON files in `data/` — full pipeline counters, audit log, cross-channel sessions, native document delivery |
| **Edge (Cloudflare Pages)** | 300+ cities | `functions/` (JS port) | stateless — the conversation state travels with the request and is kept in the browser's `localStorage` |
| **GitHub Pages mirror** | github.io | `public-gh/` (same static bundle) | no backend of its own — `window.API_BASE` points the widget at the Cloudflare origin, `window.BASE_PATH` prefixes local assets with `/Istanbul-startup-from-iran` |

The mirror works cross-origin because the edge API already sends
`Access-Control-Allow-Origin: *` and answers `OPTIONS` preflights with `204`
(verified by `scripts/production_check.mjs`).

`scripts/parity_check.mjs` + `tests/test_js_parity.py` run the **same expectations against both
implementations**, so the JS port cannot silently drift away from the Python core.

### Redeploy

```bash
export CLOUDFLARE_API_TOKEN="..."          # Pages:Edit permission
export CLOUDFLARE_ACCOUNT_ID="5b456a2b43bb367410c50b35b9e7f71f"

python3 build_static.py                    # rebuild public/ + functions/_core/data.js
node scripts/parity_check.mjs              # JS core sanity
pytest -q                                  # 171 tests
npx wrangler pages deploy public \
  --project-name istanbul-startup-from-iran --branch main --commit-dirty=true

export GH_TOKEN="..."                      # optional → also refresh the GitHub Pages mirror
./publish_gh_pages.sh                      # builds public-gh/ and pushes it to branch gh-pages
node scripts/production_check.mjs          # 27 live checks against both hosts
RUN_LIVE=1 pytest tests/test_live_production.py -q
```

`./deploy.sh` does all of the above (it reads the tokens from the environment — never from a file);
the GitHub Pages step runs automatically whenever `GH_TOKEN` is set.

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

## GitHub Pages details

* Source: branch **`gh-pages`**, folder `/` (Pages → *Deploy from a branch*). GitHub enables it
  automatically the first time a `gh-pages` branch is pushed.
* `.nojekyll` is included so files such as `_headers`/dotfiles are served as-is, and `404.html` is a
  copy of the site so deep links still render.
* The mirror is **built output only** — never edit `public-gh/`; change `web/index.html` or
  `build_static.py` and republish with `./publish_gh_pages.sh`.
* Serving from a sub-directory is why `web/index.html` builds URLs through `u()` (backend) and
  `loc()` (local assets) instead of hard-coding absolute paths.

## Notes

* `public/` and `public-gh/` are build artifacts (gitignored) — regenerate them with `build_static.py`.
* Cloudflare's bot protection rejects empty/`curl`-less user agents with `error code: 1010`;
  when scripting checks, send a browser-like `User-Agent`.
* R2 is not enabled on this Cloudflare account, so hosting is done with **Pages** (which is the
  better fit anyway: it runs the backend Functions next to the static site).
