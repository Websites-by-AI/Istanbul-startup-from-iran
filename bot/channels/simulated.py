"""Simulated transport — no network, no credentials.

Used by the test-suite and by the offline CLI demo (`python -m bot.cli`), so
"does the bot work?" can be answered even before any bot token exists.
"""

from __future__ import annotations

from ..models import Message, Reply
from .base import BaseAdapter, DeliveryResult


class SimulatedAdapter(BaseAdapter):
    channel = "simulated"

    def __init__(self, bot) -> None:
        super().__init__(bot)
        self.sent: list[dict] = []

    def deliver(self, message: Message, reply: Reply) -> DeliveryResult:
        payload = {
            "to": message.chat_id,
            "channel": message.channel,
            "text": reply.text,
            "buttons": [(b.label, b.action) for b in reply.buttons],
            "documents": [d.filename for d in reply.documents],
            "escalated": reply.escalated,
        }
        self.sent.append(payload)
        return DeliveryResult(ok=True, channel=message.channel, external_id=f"sim-{len(self.sent)}", rendered=payload)

    def say(self, text: str, chat_id: str = "sim-chat", user: str = "sim-user", channel: str = "simulated") -> Reply:
        msg = Message(channel=channel, chat_id=chat_id, user_id=user, text=text)  # type: ignore[arg-type]
        reply = self.bot.handle(msg)
        self.deliver(msg, reply)
        return reply

    def press(self, action: str, chat_id: str = "sim-chat") -> Reply:
        """Simulate a button press / slash command."""
        return self.say(action, chat_id=chat_id)
