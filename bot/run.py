"""Entrypoint: website + API + any enabled channel bots.

    python -m bot.run                       # website/API only (port 8080)
    python -m bot.run --telegram            # + Telegram long polling
    python -m bot.run --discord             # + Discord gateway
    python -m bot.run --telegram --discord --port 8080

Channels without credentials stay disabled; the website, the API and the
webhooks keep working either way.
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import signal
import threading

from .config import load_config
from .server import Platform, serve

log = logging.getLogger("bot.run")


def main() -> None:
    ap = argparse.ArgumentParser(description="Türkiye Startup Landing Platform — bot + website")
    ap.add_argument("--host", default="")
    ap.add_argument("--port", type=int, default=None, help="default: $PORT or 8080")
    ap.add_argument("--telegram", action="store_true", help="run the Telegram long-polling loop")
    ap.add_argument("--discord", action="store_true", help="run the Discord gateway loop")
    ap.add_argument("--log-level", default="INFO")
    args = ap.parse_args()

    logging.basicConfig(
        level=getattr(logging, args.log_level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)-7s %(name)-16s %(message)s",
    )

    cfg = load_config()
    platform = Platform(cfg)
    log.info("channels enabled: %s", ", ".join(cfg.channels_enabled))
    for c in cfg.channels_enabled:
        if c not in ("web", "simulated"):
            log.info("  ✔ %s ready", c)
    if args.telegram and not cfg.telegram.enabled:
        log.warning("  ⚠ telegram requested but TELEGRAM_BOT_TOKEN is not set — webhook /webhook/telegram still works")
    if args.discord and not cfg.discord.enabled:
        log.warning("  ⚠ discord requested but DISCORD_BOT_TOKEN is not set — webhook /webhook/discord still works")

    threads = []
    if args.telegram and cfg.telegram.enabled:
        adapter = platform.adapter("telegram")

        def _tg() -> None:
            adapter.run_forever()

        threads.append(threading.Thread(target=_tg, daemon=True, name="telegram"))
    if args.discord and cfg.discord.enabled:
        adapter = platform.adapter("discord")

        def _dc() -> None:
            asyncio.run(adapter.run_forever())  # type: ignore[arg-type]

        threads.append(threading.Thread(target=_dc, daemon=True, name="discord"))
    for t in threads:
        t.start()

    httpd, port, _ = serve(args.host, args.port, cfg, platform)
    log.info("➜ website + API: http://0.0.0.0:%s  (health: /api/health)", port)
    if cfg.whatsapp.enabled:
        log.info("  WhatsApp webhook: POST /webhook/whatsapp (verify token: %s)", cfg.whatsapp.verify_token)

    stop = threading.Event()

    def _shutdown(*_: object) -> None:
        log.info("shutting down…")
        stop.set()
        httpd.shutdown()

    signal.signal(signal.SIGINT, _shutdown)
    signal.signal(signal.SIGTERM, _shutdown)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        _shutdown()


if __name__ == "__main__":
    main()
