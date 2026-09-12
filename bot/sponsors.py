"""Sponsor ecosystem + Istanbul Startup Hotel Map (deck §2, §3, §4, §9, §10, §11).

Three sponsor types instead of "just hotels":

A. Hospitality Sponsor — hotels / hostels: room-nights instead of cash.
B. Corporate Sponsor   — Turkish companies: travel, workspace, PoC, purchase.
C. Ecosystem Sponsor   — accelerators, technoparks, universities, VCs, coworking.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

SPONSOR_TYPES = {
    "A": {
        "name": "Hospitality Sponsor",
        "who": "Hotel / hostel / serviced apartments",
        "gives": ["Room nights (unused inventory)", "Breakfast", "Meeting room", "Internet", "Airport transfer"],
        "gets": "Official Startup Accommodation Partner — startup-ecosystem visibility, direct corporate bookings",
    },
    "B": {
        "name": "Corporate Sponsor",
        "who": "Turkish companies",
        "gives": ["Travel cost", "Accommodation", "Workspace", "PoC", "Service purchase", "Seed capital"],
        "gets": "Qualified deal flow: pre-screened technology teams matched to a real business problem",
    },
    "C": {
        "name": "Ecosystem Sponsor",
        "who": "Accelerator / technopark / university / VC / angel / coworking / chamber of commerce",
        "gives": ["Mentoring", "Investor meetings", "Office", "Market access"],
        "gets": "International deal flow and program co-branding",
    },
}

CITIES = ["Istanbul", "Ankara", "İzmir", "Antalya"]


@dataclass
class Hotel:
    id: str
    name: str
    city: str
    district: str
    lat: float
    lng: float
    startup_rooms: int
    support_type: str
    support: list[str]
    sectors: list[str]
    metro_min: int
    exhibition: str
    meeting_room: bool
    coworking: bool
    airport_transfer: bool
    corporate_sponsorship: bool
    sponsor_level: str

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "Hotel":
        return cls(**{k: d[k] for k in cls.__annotations__ if k in d})

    def as_dict(self) -> dict[str, Any]:
        return dict(self.__dict__)


class SponsorData:
    def __init__(self, path: str | Path) -> None:
        self.path = Path(path)
        self._raw: dict[str, Any] = {}
        self.reload()

    def reload(self) -> None:
        self._raw = json.loads(self.path.read_text(encoding="utf-8"))

    @property
    def hotels(self) -> list[Hotel]:
        return [Hotel.from_dict(h) for h in self._raw.get("hotels", [])]

    @property
    def corporate(self) -> list[dict[str, Any]]:
        return self._raw.get("corporate_sponsors", [])

    @property
    def ecosystem(self) -> list[dict[str, Any]]:
        return self._raw.get("ecosystem_sponsors", [])

    @property
    def legal_partners(self) -> list[dict[str, Any]]:
        return self._raw.get("legal_partners", [])

    def as_dict(self) -> dict[str, Any]:
        return self._raw


def match_hotels(
    data: SponsorData,
    *,
    city: str = "Istanbul",
    sector: str = "",
    rooms_needed: int = 1,
    needs_workspace: bool = False,
    needs_transfer: bool = False,
) -> list[dict[str, Any]]:
    """Rank hotels for a team. Never over-allocates sponsored room nights."""
    results = []
    for h in data.hotels:
        if city and h.city.lower() != city.lower():
            continue
        if h.startup_rooms < rooms_needed:
            continue
        score = 0.0
        why = []
        if sector and any(sector.lower() in s.lower() for s in h.sectors):
            score += 3
            why.append(f"sector match: {sector}")
        if h.support_type == "free":
            score += 2
            why.append("free sponsored room nights")
        elif h.support_type == "50%":
            score += 1
            why.append("50% sponsored room nights")
        if needs_workspace and h.coworking:
            score += 1.5
            why.append("coworking on site")
        if needs_transfer and h.airport_transfer:
            score += 1
            why.append("airport transfer")
        if h.meeting_room:
            score += 0.5
            why.append("meeting room")
        score += max(0, 3 - h.metro_min / 5)
        results.append({"hotel": h.as_dict(), "score": round(score, 2), "why": why})
    results.sort(key=lambda r: r["score"], reverse=True)
    return results


def match_corporate_sponsors(data: SponsorData, sector: str = "", city: str = "") -> list[dict[str, Any]]:
    out = []
    for c in data.corporate:
        score = 0.0
        why = []
        if sector and any(sector.lower() in s.lower() for s in c.get("sector_interest", [])):
            score += 3
            why.append(f"sector interest: {sector}")
        if city and c.get("city", "").lower() == city.lower():
            score += 2
            why.append(f"same city: {city}")
        if c.get("status") == "confirmed":
            score += 1.5
            why.append("sponsor confirmed")
        offers = c.get("offers", [])
        if any("PoC" in o for o in offers):
            score += 1
            why.append("offers a PoC")
        out.append({"sponsor": c, "score": round(score, 2), "why": why})
    out.sort(key=lambda r: r["score"], reverse=True)
    return out


def total_sponsored_rooms(data: SponsorData, city: str = "") -> int:
    return sum(h.startup_rooms for h in data.hotels if not city or h.city.lower() == city.lower())


def hotel_table_text(data: SponsorData, city: str = "") -> str:
    rows = [h for h in data.hotels if not city or h.city.lower() == city.lower()]
    lines = [
        "ISTANBUL / ANKARA STARTUP HOTEL MAP",
        "",
        f"{'Hotel':<38}{'City':<10}{'Rooms':>6}  Support",
        "-" * 74,
    ]
    for h in rows:
        lines.append(f"{h.name:<38}{h.city:<10}{h.startup_rooms:>6}  {h.support_type}")
    lines.append("-" * 74)
    lines.append(f"Total sponsored room nights available: {total_sponsored_rooms(data, city)}")
    return "\n".join(lines)


def sponsor_model_text() -> str:
    out = ["SPONSOR MODEL — three layers, not just hotels", ""]
    for key, s in SPONSOR_TYPES.items():
        out.append(f"{key}. {s['name']} — {s['who']}")
        out.append("   gives: " + ", ".join(s["gives"]))
        out.append(f"   gets : {s['gets']}")
        out.append("")
    out.append("Key reframing: a hotel converts unused room-night inventory into a marketing and")
    out.append("startup-attraction asset — we ask for inventory, not cash.")
    return "\n".join(out).strip()


def corporate_sponsorship_flow() -> str:
    return "\n".join(
        [
            "CORPORATE STARTUP SPONSORSHIP FLOW",
            "",
            "Turkish company states the problem it wants solved",
            "  ↓",
            "Platform searches the Iranian Startup Pool",
            "  ↓",
            "3 matched teams are presented",
            "  ↓",
            "Company selects one and sponsors the 3-person team",
            "  ↓",
            "Startup enters Türkiye (hotel + workspace + legal desk)",
            "  ↓",
            "Corporate Proof of Concept (PoC)",
            "  ↓",
            "Commercial contract / investment / strategic partnership",
            "",
            "For the Turkish company this is deal flow — not charity.",
        ]
    )


def ecosystem_text(data: SponsorData) -> str:
    out = ["LANDING ECOSYSTEM (deck §9)", ""]
    out.append("HOTEL (Accommodation Sponsor) → LEGAL PARTNER (Legal Landing Desk) →")
    out.append("CORPORATE SPONSOR (Market / PoC Partner) → INVESTOR (Capital) →")
    out.append("STARTUP (Technology + Team).  The platform coordinates the ecosystem.")
    out.append("")
    out.append("Ecosystem sponsors on record:")
    for e in data.ecosystem:
        out.append(f"  • {e['name']} [{e['type']}] — {', '.join(e['offers'])}")
    return "\n".join(out)
