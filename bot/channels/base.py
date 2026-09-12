"""Adapter interface."""

from __future__ import annotations

import abc
from dataclasses import dataclass, field
from typing import Any

from ..models import Message, Reply


@dataclass
class DeliveryResult:
    ok: bool
    channel: str
    external_id: str = ""
    error: str = ""
    rendered: dict[str, Any] = field(default_factory=dict)


class BaseAdapter(abc.ABC):
    """Every channel adapter implements :meth:`deliver`."""

    channel: str = "base"

    def __init__(self, bot) -> None:
        self.bot = bot

    @abc.abstractmethod
    def deliver(self, message: Message, reply: Reply) -> DeliveryResult:
        """Render + send *reply* on this channel."""

    def handle(self, message: Message) -> tuple[Reply, DeliveryResult]:
        """Core + delivery in one call (used by webhooks/polling loops)."""
        reply = self.bot.handle(message)
        return reply, self.deliver(message, reply)

    # --- shared helpers ---------------------------------------------------
    @staticmethod
    def chunk(text: str, limit: int) -> list[str]:
        """Split long text on line boundaries so no platform truncates it."""
        if len(text) <= limit:
            return [text]
        out: list[str] = []
        cur = ""
        for line in text.split("\n"):
            if len(cur) + len(line) + 1 > limit:
                if cur:
                    out.append(cur)
                while len(line) > limit:
                    out.append(line[:limit])
                    line = line[limit:]
                cur = line
            else:
                cur = f"{cur}\n{line}" if cur else line
        if cur:
            out.append(cur)
        return out or [""]
