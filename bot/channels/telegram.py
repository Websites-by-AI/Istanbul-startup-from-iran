"""Telegram adapter — long polling + sendMessage/sendDocument.

Set TELEGRAM_BOT_TOKEN (from @BotFather) and run `python -m bot.run --telegram`.
Only `httpx` is required; without a token the channel simply stays disabled and
the rest of the platform keeps working.
"""

from __future__ import annotations

import logging
import time
from typing import Any

from ..config import TelegramConfig
from ..models import Message, Reply
from .base import BaseAdapter, DeliveryResult

log = logging.getLogger("bot.telegram")

MAX_TEXT = 4000


class TelegramAdapter(BaseAdapter):
    channel = "telegram"

    def __init__(self, bot, cfg: TelegramConfig) -> None:
        super().__init__(bot)
        self.cfg = cfg
        self._offset = 0
        self._client: Any = None

    # ---------------------------------------------------------------- http
    def _http(self):
        if self._client is None:
            import httpx

            self._client = httpx.Client(timeout=self.cfg.poll_timeout + 15)
        return self._client

    def _url(self, method: str) -> str:
        return f"{self.cfg.api_base}/bot{self.cfg.token}/{method}"

    def _api(self, method: str, **payload: Any) -> dict[str, Any]:
        r = self._http().post(self._url(method), json=payload)
        r.raise_for_status()
        return r.json()

    # ------------------------------------------------------------ outbound
    def deliver(self, message: Message, reply: Reply) -> DeliveryResult:
        chat_id = message.chat_id
        try:
            last_id = ""
            for chunk in self.chunk(reply.text, MAX_TEXT):
                data = self._api("sendMessage", chat_id=chat_id, text=chunk, **self._keyboard(reply))
                last_id = str(data.get("result", {}).get("message_id", ""))
            for doc in reply.documents:
                files = {"document": (doc.filename, doc.content, doc.mime_type)}
                r = self._http().post(self._url("sendDocument"), data={"chat_id": chat_id}, files=files)
                r.raise_for_status()
                last_id = str(r.json().get("result", {}).get("message_id", last_id))
            return DeliveryResult(ok=True, channel=self.channel, external_id=last_id)
        except Exception as exc:  # pragma: no cover - network failure path
            log.error("telegram delivery failed: %s", exc)
            return DeliveryResult(ok=False, channel=self.channel, error=str(exc))

    @staticmethod
    def _keyboard(reply: Reply) -> dict[str, Any]:
        buttons = [b for b in reply.buttons if b.label]
        if not buttons:
            return {}
        rows = []
        for i in range(0, len(buttons), 2):
            row = []
            for b in buttons[i : i + 2]:
                if b.url:
                    row.append({"text": b.label, "url": b.url})
                else:
                    row.append({"text": b.label, "callback_data": b.action[:64]})
            rows.append(row)
        return {"reply_markup": {"inline_keyboard": rows}}

    # ------------------------------------------------------------- inbound
    def parse_update(self, update: dict[str, Any]) -> Message | None:
        """Convert a Telegram update (message or callback_query) into a Message."""
        if "callback_query" in update:
            cq = update["callback_query"]
            msg = cq.get("message") or {}
            chat = msg.get("chat") or {}
            frm = cq.get("from") or {}
            return Message(
                channel="telegram",
                chat_id=str(chat.get("id", "")),
                user_id=str(frm.get("id", "")),
                text=cq.get("data") or "",
                user_name=frm.get("username") or frm.get("first_name") or "",
                language=frm.get("language_code", "")[:2],
                reply_to_message_id=str(msg.get("message_id", "")),
                raw=update,
            )
        msg = update.get("message") or update.get("edited_message")
        if not msg:
            return None
        chat = msg.get("chat") or {}
        frm = msg.get("from") or {}
        text = msg.get("text") or msg.get("caption") or ""
        if not text and msg.get("document"):
            text = f"/document {msg['document'].get('file_name', '')}"
        if not text.strip():
            return None          # stickers, service messages, empty edits…
        return Message(
            channel="telegram",
            chat_id=str(chat.get("id", "")),
            user_id=str(frm.get("id", "")),
            text=text,
            user_name=frm.get("username") or frm.get("first_name") or "",
            language=(frm.get("language_code") or "")[:2],
            reply_to_message_id=str(msg.get("message_id", "")),
            raw=update,
        )

    def poll_once(self) -> int:
        """One long-polling cycle. Returns the number of updates processed."""
        data = self._api("getUpdates", offset=self._offset, timeout=self.cfg.poll_timeout, allowed_updates=["message", "callback_query"])
        processed = 0
        for update in data.get("result", []):
            self._offset = update["update_id"] + 1
            message = self.parse_update(update)
            if not message:
                continue
            processed += 1
            try:
                self.handle(message)
            except Exception as exc:  # pragma: no cover
                log.exception("handler error: %s", exc)
        return processed

    def run_forever(self, max_cycles: int | None = None) -> None:
        me = self._api("getMe").get("result", {})
        log.info("telegram connected as @%s (%s)", me.get("username"), me.get("id"))
        cycles = 0
        while max_cycles is None or cycles < max_cycles:
            try:
                self.poll_once()
            except Exception as exc:
                log.error("poll error: %s — retrying in 3s", exc)
                time.sleep(3)
            cycles += 1
