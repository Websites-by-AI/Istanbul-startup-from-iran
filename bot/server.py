"""HTTP server: website + JSON API + channel webhooks (stdlib only).

Routes
------
GET  /                          landing page (web/index.html)
GET  /deck                      printable legal-partnership deck (HTML)
GET  /api/health                liveness + which channels are enabled
GET  /api/info                  platform/channels/config summary
POST /api/chat                  the website widget (and any HTTP client)
POST /api/intake                submit a full intake form as JSON
POST /api/assessment            score an intake form without saving it
GET  /api/hotels                hotel map + sponsors + ecosystem + legal partners
POST /api/deck                  generate the deck (md | html | pdf)
GET  /api/deck.pdf              download the default deck as PDF
GET  /api/pilot?applied=250     funnel projection
GET  /api/stats                 live counters
POST /api/notify                cross-channel broadcast (website → telegram/discord/whatsapp)
POST /webhook/telegram          Telegram update (alternative to long polling)
POST /webhook/whatsapp          WhatsApp Cloud API inbound
GET  /webhook/whatsapp          WhatsApp verification handshake
POST /webhook/discord           Discord interaction/event relay (optional)
"""

from __future__ import annotations

import json
import logging
import mimetypes
import threading
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

from . import channels as channels_pkg
from . import deck as deck_mod
from . import legal_desk, safety, sponsors
from .config import AppConfig, load_config
from .core import Bot
from .models import Message
from .store import Store

log = logging.getLogger("bot.server")
ROOT = Path(__file__).resolve().parent.parent
WEB_DIR = ROOT / "web"


class Platform:
    """Owns the bot + adapters so the website and the messaging bots share state."""

    def __init__(self, config: AppConfig | None = None) -> None:
        self.config = config or load_config()
        self.store = Store(self.config.state_dir)
        self.bot = Bot(self.config, self.store)
        self.adapters: dict[str, Any] = {
            name: channels_pkg.get_adapter(name, self.bot, self.config)
            for name in ("simulated", "telegram", "discord", "whatsapp")
        }

    def adapter(self, name: str):
        return self.adapters.get(name)

    def broadcast(self, text: str, targets: list[dict[str, str]]) -> list[dict[str, Any]]:
        """Send one message to many channels — how a lead captured on the website
        reaches the legal partner on Telegram/Discord/WhatsApp."""
        results = []
        for t in targets:
            channel = t.get("channel", "simulated")
            chat_id = str(t.get("chat_id", ""))
            if not chat_id:
                results.append({"channel": channel, "ok": False, "error": "missing chat_id"})
                continue
            adapter = self.adapters.get(channel)
            if adapter is None:
                results.append({"channel": channel, "ok": False, "error": "unknown channel"})
                continue
            msg = Message(channel=channel, chat_id=chat_id, user_id="platform", text=text)  # type: ignore[arg-type]
            from .models import Reply

            res = adapter.deliver(msg, Reply(text=text, route="broadcast"))
            results.append({"channel": channel, "ok": res.ok, "error": res.error, "external_id": res.external_id})
        return results


class Handler(BaseHTTPRequestHandler):
    server_version = "StartupLanding/1.0"
    platform: Platform  # injected by serve()

    # ------------------------------------------------------------- plumbing
    def log_message(self, fmt: str, *args: Any) -> None:  # quieter logs
        log.info("%s - %s", self.address_string(), fmt % args)

    def _cors(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Hub-Signature-256, X-Telegram-Bot-Api-Secret-Token")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")

    def _send(self, status: int, body: bytes, content_type: str, extra: dict[str, str] | None = None) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self._cors()
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _json(self, status: int, payload: Any) -> None:
        self._send(status, json.dumps(payload, ensure_ascii=False, default=str).encode("utf-8"), "application/json; charset=utf-8")

    def _read_body(self) -> bytes:
        length = int(self.headers.get("Content-Length") or 0)
        return self.rfile.read(length) if length else b""

    def _read_json(self) -> dict[str, Any]:
        raw = self._read_body()
        if not raw:
            return {}
        try:
            data = json.loads(raw.decode("utf-8"))
            return data if isinstance(data, dict) else {"value": data}
        except json.JSONDecodeError:
            return {}

    def do_OPTIONS(self) -> None:  # noqa: N802
        self._send(204, b"", "text/plain")

    # ------------------------------------------------------------------ GET
    def do_GET(self) -> None:  # noqa: N802
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"
        query = urllib.parse.parse_qs(parsed.query)
        p = self.platform

        if path in ("/", "/index.html"):
            return self._file(WEB_DIR / "index.html")
        if path == "/deck":
            opts = deck_mod.DeckOptions(
                legal_group_name=(query.get("group") or ["Iranian–Turkish Legal Group"])[0],
                pilot_city=(query.get("city") or ["Istanbul"])[0],
            )
            html = deck_mod.deck_html(opts)
            return self._send(200, html.encode("utf-8"), "text/html; charset=utf-8")
        if path == "/webhook/whatsapp":
            adapter = p.adapter("whatsapp")
            challenge = adapter.verify_webhook(
                (query.get("hub.mode") or [""])[0],
                (query.get("hub.verify_token") or [""])[0],
                (query.get("hub.challenge") or [""])[0],
            )
            if challenge is None:
                return self._json(403, {"error": "verification failed"})
            return self._send(200, challenge.encode("utf-8"), "text/plain; charset=utf-8")
        if path == "/api/health":
            return self._json(200, {"ok": True, "channels": self.config_channels(), "version": "1.0.0"})
        if path == "/api/info":
            return self._json(
                200,
                {
                    "platform": "Türkiye Startup Landing Platform",
                    "program": "Iran → Türkiye Startup Bridge",
                    "channels": channels_pkg.describe_adapters(p.config),
                    "modules": [
                        "Legal Landing Desk (Iran–Türkiye Startup Legal Desk)",
                        "Startup Legal Intake Form",
                        "Pre-Landing Legal Assessment",
                        "Two-Layer Legal Model",
                        "Sponsor model (hospitality / corporate / ecosystem)",
                        "Istanbul Startup Hotel Map",
                        "Corporate Startup Sponsorship + PoC flow",
                        "AI Startup Navigator with Legal AI Safety Principle",
                        "Pitch-deck generator for legal partners (MD/HTML/PDF)",
                    ],
                    "commands": [c for c in ["/legal", "/intake", "/assessment", "/journey", "/hotels", "/corporate", "/deck", "/pilot", "/metrics", "/human"]],
                },
            )
        if path == "/api/hotels":
            data = p.bot.sponsors
            city = (query.get("city") or [""])[0]
            return self._json(
                200,
                {
                    "cities": sponsors.CITIES,
                    "sponsor_types": sponsors.SPONSOR_TYPES,
                    "hotels": [h.as_dict() for h in data.hotels],
                    "corporate_sponsors": data.corporate,
                    "ecosystem_sponsors": data.ecosystem,
                    "legal_partners": data.legal_partners,
                    "total_sponsored_rooms": sponsors.total_sponsored_rooms(data, city),
                    "matches": sponsors.match_hotels(data, city=city or "Istanbul", rooms_needed=3, needs_workspace=True),
                },
            )
        if path == "/api/deck.pdf":
            opts = deck_mod.DeckOptions(legal_group_name=(query.get("group") or ["Iranian–Turkish Legal Group"])[0])
            pdf = deck_mod.deck_pdf(opts)
            return self._send(
                200, pdf, "application/pdf",
                {"Content-Disposition": f'inline; filename="{deck_mod.deck_filename(opts)}"'},
            )
        if path == "/api/deck.md":
            opts = deck_mod.DeckOptions(legal_group_name=(query.get("group") or ["Iranian–Turkish Legal Group"])[0])
            return self._send(200, deck_mod.deck_markdown(opts).encode("utf-8"), "text/markdown; charset=utf-8")
        if path == "/api/pilot":
            applied = int((query.get("applied") or ["100"])[0])
            return self._json(
                200,
                {
                    "pilot": legal_desk.PILOT,
                    "applied": applied,
                    "funnel": legal_desk.funnel_projection(applied),
                    "metrics": [dict(zip(("metric", "target"), m)) for m in legal_desk.SUCCESS_METRICS],
                },
            )
        if path == "/api/stats":
            return self._json(200, p.bot.stats())
        if path == "/api/journey":
            return self._json(200, {"journey": legal_desk.JOURNEY, "layers": legal_desk.LAYERS})
        if path == "/api/intake-form":
            return self._json(200, {"fields": legal_desk.INTAKE_FORM, "required": legal_desk.REQUIRED_INTAKE_KEYS})
        if path.startswith("/static/"):
            return self._file(WEB_DIR / Path(path[len("/static/"):]))
        # SPA-ish fallback: serve index for unknown non-API paths
        if not path.startswith("/api") and not path.startswith("/webhook"):
            return self._file(WEB_DIR / "index.html")
        return self._json(404, {"error": "not found", "path": path})

    def config_channels(self) -> list[str]:
        return self.platform.config.channels_enabled

    def _file(self, path: Path) -> None:
        path = Path(path)
        if not path.exists() or not path.is_file():
            return self._json(404, {"error": "file not found", "path": str(path)})
        ctype = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
        if ctype.startswith("text/") or ctype in ("application/javascript", "application/json"):
            ctype += "; charset=utf-8"
        return self._send(200, path.read_bytes(), ctype)

    # ----------------------------------------------------------------- POST
    def do_POST(self) -> None:  # noqa: N802
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"
        p = self.platform

        if path == "/api/chat":
            body = self._read_json()
            text = str(body.get("text", ""))
            if not text.strip():
                return self._json(400, {"error": "text is required"})
            channel = str(body.get("channel", "web"))
            if channel not in ("web", "telegram", "discord", "whatsapp", "simulated"):
                channel = "web"
            chat_id = str(body.get("chat_id") or body.get("session_id") or "web-anonymous")
            msg = Message(
                channel=channel,  # type: ignore[arg-type]
                chat_id=chat_id,
                user_id=str(body.get("user_id") or chat_id),
                text=text,
                user_name=str(body.get("user_name", "")),
                language=str(body.get("language", "")),
            )
            reply = p.bot.handle(msg)
            payload = reply.as_dict()
            payload["session_id"] = chat_id
            payload["documents"] = [
                {
                    "filename": d.filename,
                    "mime_type": d.mime_type,
                    "download_url": None,  # documents are delivered natively by each channel
                    "size": len(d.content),
                }
                for d in reply.documents
            ]
            return self._json(200, payload)

        if path == "/api/intake":
            body = self._read_json()
            intake = body.get("intake") if isinstance(body.get("intake"), dict) else body
            missing = legal_desk.validate_intake(intake)
            if missing:
                return self._json(422, {"error": "missing_fields", "missing": missing})
            startup = legal_desk.startup_from_intake(intake, channel=str(body.get("channel", "web")))
            assessment = legal_desk.pre_landing_assessment(intake)
            case = legal_desk.open_case(startup, intake, assessment, channel=str(body.get("channel", "web")))
            p.store.add_startup(startup)
            p.store.add_case(case)
            return self._json(
                201,
                {
                    "startup": startup.as_dict(),
                    "case_id": case.id,
                    "step": case.step,
                    "assessment": assessment.as_dict(),
                    "hotel_matches": sponsors.match_hotels(
                        p.bot.sponsors, city=startup.intended_city, sector=startup.sector,
                        rooms_needed=min(startup.team_size, 3), needs_workspace=True,
                    )[:3],
                    "corporate_matches": sponsors.match_corporate_sponsors(
                        p.bot.sponsors, startup.sector, startup.intended_city
                    )[:3],
                    "disclaimer": safety.DISCLAIMER["en"],
                },
            )

        if path == "/api/assessment":
            body = self._read_json()
            intake = body.get("intake") if isinstance(body.get("intake"), dict) else body
            assessment = legal_desk.pre_landing_assessment(intake)
            return self._json(200, {"assessment": assessment.as_dict(), "missing": legal_desk.validate_intake(intake)})

        if path == "/api/deck":
            body = self._read_json()
            opts = deck_mod.DeckOptions(
                legal_group_name=str(body.get("legal_group_name") or "Iranian–Turkish Legal Group"),
                pilot_city=str(body.get("pilot_city") or "Istanbul"),
                cohort_size=int(body.get("cohort_size") or 10),
                team_size=int(body.get("team_size") or 3),
                sender_name=str(body.get("sender_name") or ""),
                contact=str(body.get("contact") or ""),
            )
            fmt = str(body.get("format") or "md")
            bundle = deck_mod.build_all(opts)
            if fmt == "pdf":
                return self._send(
                    200, bundle["pdf"], "application/pdf",
                    {"Content-Disposition": f'attachment; filename="{bundle["filename"]}"'},
                )
            if fmt == "html":
                return self._send(200, bundle["html"].encode("utf-8"), "text/html; charset=utf-8")
            return self._json(200, {"format": "md", "filename": deck_mod.deck_filename(opts, "md"), "markdown": bundle["md"]})

        if path == "/api/notify":
            body = self._read_json()
            text = str(body.get("text", ""))
            targets = body.get("targets") or []
            if not text or not isinstance(targets, list):
                return self._json(400, {"error": "text and targets[] are required"})
            return self._json(200, {"results": p.broadcast(text, targets)})

        # ------------------------------------------------------- webhooks
        if path == "/webhook/telegram":
            update = self._read_json()
            adapter = p.adapter("telegram")
            msg = adapter.parse_update(update)
            if not msg:
                return self._json(200, {"ok": True, "ignored": True})
            if not p.config.telegram.enabled:
                # No token → we can still process and store the lead, we just can't reply.
                reply = p.bot.handle(msg)
                return self._json(200, {"ok": True, "delivered": False, "reply": reply.as_dict()})
            reply, result = adapter.handle(msg)
            return self._json(200, {"ok": result.ok, "error": result.error, "reply": reply.as_dict()})

        if path == "/webhook/whatsapp":
            from .channels import whatsapp as wa

            raw = self._read_body()
            adapter = p.adapter("whatsapp")
            sig = self.headers.get("X-Hub-Signature-256", "")
            if p.config.whatsapp.app_secret and not adapter.verify_signature(raw, sig):
                return self._json(401, {"error": "invalid signature"})
            try:
                payload = json.loads(raw.decode("utf-8")) if raw else {}
            except json.JSONDecodeError:
                return self._json(400, {"error": "invalid json"})
            messages = adapter.parse_payload(payload) + wa.parse_button_reply(payload)
            out = []
            for msg in messages:
                reply = p.bot.handle(msg)
                if p.config.whatsapp.enabled:
                    res = adapter.deliver(msg, reply)
                    out.append({"to": msg.chat_id, "ok": res.ok, "error": res.error})
                else:
                    out.append({"to": msg.chat_id, "ok": False, "error": "whatsapp credentials not configured", "reply": reply.as_dict()})
            return self._json(200, {"ok": True, "processed": out})

        if path == "/webhook/discord":
            payload = self._read_json()
            adapter = p.adapter("discord")
            msg, _interaction = adapter.parse_event({"t": payload.get("t", "MESSAGE_CREATE"), "d": payload.get("d", payload)})
            if not msg:
                return self._json(200, {"ok": True, "ignored": True})
            reply = p.bot.handle(msg)
            delivered = False
            error = ""
            if p.config.discord.enabled:
                res = adapter.deliver(msg, reply)
                delivered, error = res.ok, res.error
            return self._json(200, {"ok": True, "delivered": delivered, "error": error, "reply": reply.as_dict()})

        return self._json(404, {"error": "not found", "path": path})


def serve(
    host: str = "",
    port: int | None = None,
    config: AppConfig | None = None,
    platform: Platform | None = None,
):
    """Start the HTTP server (blocking).

    ``port=None`` → use PORT from the environment; ``port=0`` → any free port.
    """
    cfg = config or load_config()
    platform = platform or Platform(cfg)
    handler = type("BoundHandler", (Handler,), {"platform": platform})
    bind_port = cfg.server.port if port is None else port
    httpd = ThreadingHTTPServer((host or cfg.server.host, bind_port), handler)
    actual_port = httpd.server_address[1]
    log.info("website + API listening on %s:%s (channels: %s)", host or cfg.server.host, actual_port, ", ".join(cfg.channels_enabled))
    return httpd, actual_port, platform


def serve_in_thread(host: str = "0.0.0.0", port: int | None = 8080, config: AppConfig | None = None):
    httpd, actual_port, platform = serve(host, port, config)
    t = threading.Thread(target=httpd.serve_forever, daemon=True, name="http-server")
    t.start()
    return httpd, actual_port, platform
