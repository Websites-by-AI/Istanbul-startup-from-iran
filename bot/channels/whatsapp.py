"""WhatsApp Cloud API adapter.

Inbound: Meta sends a webhook to `POST /webhook/whatsapp` (verify with
`GET /webhook/whatsapp?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...`).
Outbound: `POST /{version}/{phone_number_id}/messages`.

Set WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID (+ WHATSAPP_APP_SECRET for
signature verification) and the channel switches on automatically.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
from typing import Any

from ..config import WhatsAppConfig
from ..models import Message, Reply
from .base import BaseAdapter, DeliveryResult

log = logging.getLogger("bot.whatsapp")

MAX_TEXT = 3000


class WhatsAppAdapter(BaseAdapter):
    channel = "whatsapp"

    def __init__(self, bot, cfg: WhatsAppConfig) -> None:
        super().__init__(bot)
        self.cfg = cfg
        self._http: Any = None

    def _client(self):
        if self._http is None:
            import httpx

            self._http = httpx.Client(timeout=30)
        return self._http

    # ------------------------------------------------------------- webhook
    def verify_webhook(self, mode: str, verify_token: str, challenge: str) -> str | None:
        if mode == "subscribe" and verify_token == self.cfg.verify_token:
            return challenge
        return None

    def verify_signature(self, body: bytes, header_signature: str) -> bool:
        if not self.cfg.app_secret:
            return True  # not configured → skip (log a warning at startup)
        expected = "sha256=" + hmac.new(self.cfg.app_secret.encode(), body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, header_signature or "")

    def parse_payload(self, payload: dict[str, Any]) -> list[Message]:
        """Extract every inbound text message from a WhatsApp webhook payload."""
        out: list[Message] = []
        for entry in payload.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value") or {}
                contacts = {c.get("wa_id"): c for c in value.get("contacts", [])}
                for msg in value.get("messages", []):
                    if msg.get("type") != "text":
                        continue
                    wa_id = msg.get("from", "")
                    contact = contacts.get(wa_id, {})
                    out.append(
                        Message(
                            channel="whatsapp",
                            chat_id=wa_id,          # 1:1 → the user's number is the conversation
                            user_id=wa_id,
                            text=(msg.get("text") or {}).get("body", ""),
                            user_name=(contact.get("profile") or {}).get("name", ""),
                            language=(contact.get("wa_id") and "") or "",
                            reply_to_message_id=msg.get("id", ""),
                            raw=payload,
                        )
                    )
        return out

    # ------------------------------------------------------------ outbound
    def render(self, reply: Reply) -> list[dict[str, Any]]:
        payloads: list[dict[str, Any]] = []
        for chunk in self.chunk(reply.text, MAX_TEXT):
            body = chunk
            buttons = [b for b in reply.buttons if b.label and not b.url][:3]
            if buttons:
                # interactive buttons keep the conversation tappable on WhatsApp
                payloads.append(
                    {
                        "type": "interactive",
                        "body": {"text": body},
                        "action": {
                            "buttons": [
                                {"type": "reply", "reply": {"id": b.action[:200], "title": b.label[:20]}}
                                for b in buttons
                            ]
                        },
                    }
                )
            else:
                payloads.append({"type": "text", "text": {"body": body, "preview_url": False}})
        return payloads or [{"type": "text", "text": {"body": "…"}}]

    def deliver(self, message: Message, reply: Reply) -> DeliveryResult:
        url = f"{self.cfg.api_base}/{self.cfg.api_version}/{self.cfg.phone_number_id}/messages"
        headers = {"Authorization": f"Bearer {self.cfg.token}", "Content-Type": "application/json"}
        last_id = ""
        try:
            for payload in self.render(reply):
                payload["to"] = message.chat_id
                r = self._client().post(url, headers=headers, json=payload)
                r.raise_for_status()
                data = r.json()
                last_id = (data.get("messages") or [{}])[0].get("id", "")
            return DeliveryResult(ok=True, channel=self.channel, external_id=last_id)
        except Exception as exc:  # pragma: no cover
            log.error("whatsapp delivery failed: %s", exc)
            return DeliveryResult(ok=False, channel=self.channel, error=str(exc))


def parse_button_reply(payload: dict[str, Any]) -> list[Message]:
    """WhatsApp sends button presses as type=interactive, not type=text."""
    out: list[Message] = []
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value") or {}
            for msg in value.get("messages", []):
                if msg.get("type") != "interactive":
                    continue
                reply_payload = (msg.get("interactive") or {}).get("button_reply") or {}
                text = reply_payload.get("id") or reply_payload.get("title") or ""
                out.append(
                    Message(
                        channel="whatsapp",
                        chat_id=msg.get("from", ""),
                        user_id=msg.get("from", ""),
                        text=text,
                        raw=payload,
                    )
                )
    return out
