# Push to GitHub

The repository is already initialised in this workspace, the remote `origin` is set, and there are
two commits on `main`:

```
1815ee9 feat: Türkiye Startup Landing Platform — Telegram + Discord + WhatsApp bots, website …
089b62d first commit
```

Pushing needs **your** GitHub credentials, so run this on your own machine (or paste a token into a
credential helper here — not recommended in chat).

## A. From this workspace

```bash
git remote -v                      # origin → https://github.com/Websites-by-AI/Istanbul-startup-from-iran.git
git push -u origin main
```

If GitHub asks for a password, use a **Personal Access Token** (Settings → Developer settings →
Personal access tokens → *repo* scope) as the password, or switch to SSH:

```bash
git remote set-url origin git@github.com:Websites-by-AI/Istanbul-startup-from-iran.git
git push -u origin main
```

## B. Copy the project to your machine instead

```bash
# 1) download/copy this folder, then:
cd Istanbul-startup-from-iran
pip install -r requirements.txt
pytest -q                          # expect 155 passed
python -m bot.run --port 8080      # website + API + chat widget

# 2) your original sequence (only needed if you start a fresh repo)
echo "# Istanbul-startup-from-iran" >> README.md
git init
git add README.md
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/Websites-by-AI/Istanbul-startup-from-iran.git
git push -u origin main

# 3) then the rest of the project
git add -A
git commit -m "feat: startup landing platform + legal landing desk module"
git push
```

> If the remote already contains a README created through the GitHub UI, use
> `git pull --rebase origin main` before the first push.

## Deploying the bots

| Channel | Needs | Command |
|---|---|---|
| Website + API + widget | nothing | `python -m bot.run --port 8080` |
| Telegram | `TELEGRAM_BOT_TOKEN` (@BotFather) | `python -m bot.run --telegram` |
| Discord | `DISCORD_BOT_TOKEN` + Message Content intent | `python -m bot.run --discord` |
| WhatsApp | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | webhook → `POST /webhook/whatsapp` |

All four share one core and one JSON state (`data/`), so a lead created on the website can continue
on Telegram. Copy `.env.example` to `.env` and fill in what you have; channels without credentials
stay disabled while their webhooks keep working.
