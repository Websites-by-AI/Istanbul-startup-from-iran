"""Discord adapter — gateway websocket (receive) + REST (send).

Set DISCORD_BOT_TOKEN and run `python -m bot.run --discord`.
Requires the `websockets` package (already in requirements.txt). Intents needed
in the Discord developer portal: Server Messages + Message Content.
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from ..config import DiscordConfig
from ..models import Message, Reply
from .base import BaseAdapter, DeliveryResult

log = logging.getLogger("bot.discord")

MAX_TEXT = 1900


class DiscordAdapter(BaseAdapter):
    channel = "discord"

    def __init__(self, bot, cfg: DiscordConfig) -> None:
        super().__init__(bot)
        self.cfg = cfg
        self._session_id: str | None = None
        self._resume_url: str | None = None
        self._seq: int | None = None
        self._http: Any = None

    # ---------------------------------------------------------------- http
    def _client(self):
        if self._http is None:
            import httpx

            self._http = httpx.AsyncClient(
                base_url=self.cfg.api_base,
                headers={"Authorization": f"Bot {self.cfg.token}", "User-Agent": "StartupLandingBot (1.0)"},
                timeout=30,
            )
        return self._http

    async def post_message(self, channel_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        r = await self._client().post(f"/channels/{channel_id}/messages", json=payload)
        r.raise_for_status()
        return r.json()

    # ------------------------------------------------------------ outbound
    @staticmethod
    def components(reply: Reply) -> list[dict[str, Any]]:
        buttons = [b for b in reply.buttons if b.label][:10]
        if not buttons:
            return []
        rows = []
        for i in range(0, len(buttons), 5):
            comps = []
            for b in buttons[i : i + 5]:
                if b.url:
                    comps.append({"type": 2, "style": 5, "label": b.label[:80], "url": b.url})
                else:
                    # style 1 = primary, custom_id must be <=100 chars
                    comps.append({"type": 2, "style": 1, "label": b.label[:80], "custom_id": b.action[:99]})
            rows.append({"type": 1, "components": comps})
        return rows

    def render(self, reply: Reply) -> list[dict[str, Any]]:
        """Turn a Reply into one or more Discord message payloads."""
        payloads: list[dict[str, Any]] = []
        chunks = self.chunk(reply.text, MAX_TEXT)
        for i, chunk in enumerate(chunks):
            payload: dict[str, Any] = {"content": chunk}
            if i == 0:
                comps = self.components(reply)
                if comps:
                    payload["components"] = comps
            payloads.append(payload)
        return payloads or [{"content": "…"}]

    def deliver(self, message: Message, reply: Reply) -> DeliveryResult:
        """Sync façade (used by tests / webhook flows)."""
        return asyncio.run(self.adeliver(message, reply))

    async def adeliver(self, message: Message, reply: Reply) -> DeliveryResult:
        last_id = ""
        try:
            for payload in self.render(reply):
                data = await self.post_message(message.chat_id, payload)
                last_id = str(data.get("id", ""))
            for doc in reply.documents:
                files = {"file": (doc.filename, doc.content, doc.mime_type)}
                r = await self._client().post(f"/channels/{message.chat_id}/messages", files=files)
                r.raise_for_status()
                last_id = str(r.json().get("id", last_id))
            return DeliveryResult(ok=True, channel=self.channel, external_id=last_id)
        except Exception as exc:  # pragma: no cover
            log.error("discord delivery failed: %s", exc)
            return DeliveryResult(ok=False, channel=self.channel, error=str(exc))

    # ------------------------------------------------------------- inbound
    def parse_event(self, event: dict[str, Any]) -> tuple[Message | None, str | None]:
        """MESSAGE_CREATE → Message; INTERACTION_CREATE button → Message."""
        t = event.get("t")
        d = event.get("d") or {}
        if t == "MESSAGE_CREATE":
            author = d.get("author") or {}
            if author.get("bot"):
                return None, None
            return (
                Message(
                    channel="discord",
                    chat_id=str(d.get("channel_id", "")),
                    user_id=str(author.get("id", "")),
                    text=d.get("content", ""),
                    user_name=author.get("username", ""),
                    language="",
                    raw=event,
                ),
                None,
            )
        if t == "INTERACTION_CREATE":
            data = d.get("data") or {}
            if data.get("component_type") == 2:  # button
                member = (d.get("member") or {}).get("user") or d.get("user") or {}
                msg = Message(
                    channel="discord",
                    chat_id=str(d.get("channel_id", "")),
                    user_id=str(member.get("id", "")),
                    text=data.get("custom_id", ""),
                    user_name=member.get("username", ""),
                    raw=event,
                )
                return msg, d.get("id")
        return None, None

    async def run_forever(self) -> None:  # pragma: no cover - needs a real token
        import websockets

        url = self.cfg.gateway_url
        while True:
            try:
                async with websockets.connect(url) as ws:
                    hello = json.loads(await ws.recv())
                    interval = hello["d"]["heartbeat_interval"] / 1000
                    identify = {
                        "op": 2,
                        "d": {
                            "token": self.cfg.token,
                            "intents": (1 << 15) | (1 << 9) | (1 << 0),  # message content + guild messages + guilds
                            "properties": {"os": "linux", "browser": "startup-landing", "device": "startup-landing"},
                        },
                    }
                    if self._session_id and self._resume_url:
                        identify = {"op": 6, "d": {"token": self.cfg.token, "session_id": self._session_id, "seq": self._seq}}
                        url = self._resume_url
                    await ws.send(json.dumps(identify))

                    async def heartbeat() -> None:
                        while True:
                            await asyncio.sleep(interval)
                            await ws.send(json.dumps({"op": 1, "d": self._seq}))

                    hb = asyncio.create_task(heartbeat())
                    async for raw in ws:
                        event = json.loads(raw)
                        op = event.get("op")
                        if op == 11:
                            continue
                        if op == 7 or op == 9:      # reconnect / invalid session
                            break
                        if event.get("s") is not None:
                            self._seq = event["s"]
                        if event.get("t") == "READY":
                            self._session_id = (event.get("d") or {}).get("session_id")
                            self._resume_url = (event.get("d") or {}).get("resume_gateway_url") or url
                            log.info("discord ready as %s", (event["d"].get("user") or {}).get("username"))
                        message, interaction_id = self.parse_event(event)
                        if not message:
                            continue
                        try:
                            reply = self.bot.handle(message)
                            if interaction_id:
                                # acknowledge the button, then answer as a normal message
                                await self._client().post(
                                    f"/interactions/{interaction_id}/{event['d'].get('token', '')}/callback",
                                    json={"type": 6},
                                )
                            await self.adeliver(message, reply)
                        except Exception:
                            log.exception("discord handler error")
                    hb.cancel()
            except Exception as exc:
                log.error("discord gateway error: %s — reconnecting in 5s", exc)
                await asyncio.sleep(5)
