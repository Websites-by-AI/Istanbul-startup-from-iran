"""Domain objects shared by every channel adapter."""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Literal

Channel = Literal["web", "telegram", "discord", "whatsapp", "simulated"]


def _id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


@dataclass
class Message:
    """An inbound message from any channel."""

    channel: Channel
    chat_id: str
    user_id: str
    text: str
    user_name: str = ""
    language: str = ""
    reply_to_message_id: str = ""
    raw: dict[str, Any] = field(default_factory=dict)
    ts: float = field(default_factory=time.time)

    @property
    def session_key(self) -> str:
        return f"{self.channel}:{self.chat_id}"


@dataclass
class Button:
    label: str
    action: str  # command sent back to the core when pressed
    url: str = ""


@dataclass
class Document:
    filename: str
    content: bytes
    mime_type: str = "application/octet-stream"


@dataclass
class Reply:
    """An outbound answer. Channels render what they support and ignore the rest."""

    text: str = ""
    buttons: list[Button] = field(default_factory=list)
    documents: list[Document] = field(default_factory=list)
    route: str = ""          # which module produced the answer (analytics/debug)
    intent: str = ""
    language: str = "en"
    escalated: bool = False  # a licensed human professional must take over
    advice_scope: bool = False  # the answer itself touches legal/immigration determinations
    meta: dict[str, Any] = field(default_factory=dict)

    def as_dict(self) -> dict[str, Any]:
        return {
            "text": self.text,
            "buttons": [{"label": b.label, "action": b.action, "url": b.url} for b in self.buttons],
            "documents": [{"filename": d.filename, "mime_type": d.mime_type, "bytes": len(d.content)} for d in self.documents],
            "route": self.route,
            "intent": self.intent,
            "language": self.language,
            "escalated": self.escalated,
            "advice_scope": self.advice_scope,
            "meta": self.meta,
        }


@dataclass
class Member:
    name: str = ""
    role: str = ""          # founder / technical / business
    nationality: str = ""
    needs_visa: bool = True


@dataclass
class Startup:
    """A pre-screened startup team (the unit the legal partner receives)."""

    id: str = field(default_factory=lambda: _id("st"))
    name: str = ""
    sector: str = ""
    stage: str = ""         # idea / mvp / revenue / scaling
    country_of_origin: str = "Iran"
    founders: list[Member] = field(default_factory=list)
    team_size: int = 3
    has_iran_entity: bool = False
    has_turkey_entity: bool = False
    ip_owned_by_company: bool | None = None
    funding_target_usd: int = 0
    intended_city: str = "Istanbul"
    intended_activity: str = ""
    source: str = ""        # elcom / gitex / university / accelerator / community
    notes: str = ""
    created_at: float = field(default_factory=time.time)

    def as_dict(self) -> dict[str, Any]:
        d = self.__dict__.copy()
        d["founders"] = [m.__dict__ for m in self.founders]
        return d


@dataclass
class LegalCase:
    """A startup moving through the Iran → Türkiye Legal Landing Desk."""

    id: str = field(default_factory=lambda: _id("lc"))
    startup_id: str = ""
    startup_name: str = ""
    channel: str = "web"
    step: int = 1
    layer: str = "layer1"           # layer1 = market entry, layer2 = investment & growth
    intake: dict[str, Any] = field(default_factory=dict)
    assessment_score: float = 0.0
    assessment_band: str = ""
    recommended_structures: list[str] = field(default_factory=list)
    checklist: list[str] = field(default_factory=list)
    commercial_model: str = ""
    assigned_to_human: bool = False
    history: list[dict[str, Any]] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)

    def log(self, event: str, **extra: Any) -> None:
        self.history.append({"ts": time.time(), "event": event, **extra})
