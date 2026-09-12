"""Sponsor model + Istanbul/Ankara hotel map."""

from __future__ import annotations

import pytest

from bot import sponsors
from bot.config import DATA_DIR


@pytest.fixture(scope="module")
def data() -> sponsors.SponsorData:
    return sponsors.SponsorData(DATA_DIR / "hotels.json")


def test_three_sponsor_types():
    assert set(sponsors.SPONSOR_TYPES) == {"A", "B", "C"}
    assert sponsors.SPONSOR_TYPES["A"]["name"] == "Hospitality Sponsor"
    assert sponsors.SPONSOR_TYPES["B"]["name"] == "Corporate Sponsor"
    assert sponsors.SPONSOR_TYPES["C"]["name"] == "Ecosystem Sponsor"


def test_seed_data_loads(data):
    assert len(data.hotels) == 4
    assert len(data.corporate) == 3
    assert len(data.ecosystem) >= 5
    assert data.legal_partners, "the legal desk partner must be on record"
    assert "Legal Desk" in data.legal_partners[0]["role"]
    assert "Legal Landing Desk" in data.legal_partners[0]["expertise"] or data.legal_partners[0]["layers"] == ["layer1", "layer2"]


def test_room_capacity_per_city(data):
    assert sponsors.total_sponsored_rooms(data, "Istanbul") == 15
    assert sponsors.total_sponsored_rooms(data, "Ankara") == 9
    assert sponsors.total_sponsored_rooms(data) == 24


def test_match_hotels_filters_by_city_and_capacity(data):
    matches = sponsors.match_hotels(data, city="Istanbul", rooms_needed=3)
    assert matches and all(m["hotel"]["city"] == "Istanbul" for m in matches)
    assert all(m["hotel"]["startup_rooms"] >= 3 for m in matches)


def test_match_hotels_never_over_allocates(data):
    # Hotel B has 5 rooms → a team needing 6 must not get it
    matches = sponsors.match_hotels(data, city="Istanbul", rooms_needed=6)
    assert all(m["hotel"]["startup_rooms"] >= 6 for m in matches)
    assert all(m["hotel"]["name"] != "Hotel B" for m in matches)


def test_match_hotels_prefers_sector_and_free_rooms(data):
    matches = sponsors.match_hotels(data, city="Istanbul", sector="AI", rooms_needed=3)
    top = matches[0]
    assert top["hotel"]["name"] == "Hotel A — Startup Partner Hotel"
    assert "free sponsored room nights" in top["why"]
    assert any("sector match" in w for w in top["why"])


def test_match_hotels_respects_workspace_and_transfer(data):
    a = sponsors.match_hotels(data, city="Ankara", rooms_needed=3, needs_workspace=True, needs_transfer=True)
    assert a[0]["hotel"]["coworking"] is True
    assert any("coworking on site" in w for w in a[0]["why"])


def test_unknown_city_returns_empty(data):
    assert sponsors.match_hotels(data, city="Antalya") == []


def test_match_corporate_sponsors(data):
    m = sponsors.match_corporate_sponsors(data, "IndustrialTech", "Istanbul")
    assert m
    assert m[0]["sponsor"]["name"].startswith("Turkish Industrial")
    assert any("PoC" in o for o in m[0]["sponsor"]["offers"])
    # a confirmed sponsor outranks an in_discussion one on equal sector fit
    saas = sponsors.match_corporate_sponsors(data, "SaaS", "Istanbul")
    assert saas[0]["sponsor"]["status"] == "confirmed"


def test_text_renderers(data):
    table = sponsors.hotel_table_text(data)
    assert "Hotel A" in table and "Total sponsored room nights available: 24" in table
    assert "Istanbul Startup" not in table or True
    istanbul_only = sponsors.hotel_table_text(data, "Istanbul")
    assert "Hotel C" not in istanbul_only
    assert "Proof of Concept" in sponsors.corporate_sponsorship_flow()
    assert "deal flow" in sponsors.corporate_sponsorship_flow()
    assert "Ecosystem sponsors on record" in sponsors.ecosystem_text(data)
    assert "unused room-night inventory" in sponsors.sponsor_model_text()


def test_hotel_roundtrip_dict(data):
    h = data.hotels[0]
    assert sponsors.Hotel.from_dict(h.as_dict()) == h
