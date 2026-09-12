"""End-to-end tests against a real HTTP server (website + API + webhooks)."""

from __future__ import annotations

import json

import pytest

from tests.conftest import GOOD_INTAKE, WEAK_INTAKE


def test_health(live_server):
    status, body = live_server.json_get("/api/health")
    assert status == 200 and body["ok"] is True
    assert "web" in body["channels"]


def test_index_page_is_served(live_server):
    status, body, headers = live_server.get("/")
    assert status == 200
    html = body.decode("utf-8")
    assert "AI Startup Navigator" in html
    assert "Legal Desk" in html
    assert headers["Content-Type"].startswith("text/html")


def test_deck_page_is_printable_html(live_server):
    status, body, _ = live_server.get("/deck?group=Test+Group")
    html = body.decode("utf-8")
    assert status == 200 and "Test Group" in html
    assert "Startup Legal Landing Partnership" in html


def test_info_lists_modules_and_channels(live_server):
    _, body = live_server.json_get("/api/info")
    assert any("Legal Landing Desk" in m for m in body["modules"])
    names = {c["channel"] for c in body["channels"]}
    assert {"web", "telegram", "discord", "whatsapp", "simulated"} <= names


def test_chat_endpoint(live_server):
    status, body = live_server.json_post("/api/chat", {"text": "/legal", "chat_id": "e2e-1", "channel": "web"})
    assert status == 200
    assert body["route"] == "legal_desk"
    assert body["escalated"] is True
    assert "not legal advice" in body["text"]
    assert body["buttons"]


def test_chat_rejects_empty(live_server):
    status, _ = live_server.json_post("/api/chat", {"text": "  "})
    assert status == 400


def test_chat_rejects_unknown_channel_and_falls_back(live_server):
    status, body = live_server.json_post("/api/chat", {"text": "/help", "channel": "carrier-pigeon", "chat_id": "e2e-c"})
    assert status == 200 and body["route"] == "help"


def test_intake_endpoint_creates_case_and_matches(live_server):
    status, body = live_server.json_post("/api/intake", {"intake": GOOD_INTAKE, "channel": "web"})
    assert status == 201
    assert body["case_id"].startswith("lc_")
    assert body["startup"]["name"] == "Pars Vision AI"
    assert body["assessment"]["band"] == "ready"
    assert body["hotel_matches"] and body["hotel_matches"][0]["hotel"]["city"] == "Istanbul"
    assert body["corporate_matches"]
    assert "not legal advice" in body["disclaimer"]


def test_intake_validation_error(live_server):
    status, body = live_server.json_post("/api/intake", {"intake": {"startup_name": "x"}})
    assert status == 422
    assert "sector" in body["missing"]


def test_assessment_endpoint_without_saving(live_server):
    before = live_server.json_get("/api/stats")[1]["startups"]
    status, body = live_server.json_post("/api/assessment", {"intake": WEAK_INTAKE})
    assert status == 200
    assert body["assessment"]["band"] in {"not_ready", "needs_work"}
    assert live_server.json_get("/api/stats")[1]["startups"] == before


def test_hotels_endpoint(live_server):
    _, body = live_server.json_get("/api/hotels?city=Istanbul")
    assert body["total_sponsored_rooms"] == 15
    assert len(body["hotels"]) == 4
    assert body["matches"][0]["hotel"]["city"] == "Istanbul"
    assert set(body["sponsor_types"]) == {"A", "B", "C"}
    assert body["legal_partners"][0]["expertise"]


def test_deck_endpoints(live_server):
    status, body = live_server.json_post(
        "/api/deck", {"format": "md", "legal_group_name": "E2E Legal Group", "pilot_city": "Ankara"}
    )
    assert status == 200 and "E2E Legal Group" in body["markdown"]
    assert "Ankara Pilot" in body["markdown"]

    status, raw, headers = live_server.post("/api/deck", {"format": "pdf", "legal_group_name": "E2E Legal Group"})
    assert status == 200 and raw.startswith(b"%PDF-1.4")
    assert headers["Content-Type"] == "application/pdf"
    assert "attachment" in headers.get("Content-Disposition", "")

    status, raw, headers = live_server.post("/api/deck", {"format": "html"})
    assert status == 200 and raw.startswith(b"<!doctype html>")

    status, raw, headers = live_server.get("/api/deck.pdf")
    assert status == 200 and raw.startswith(b"%PDF-")
    status, raw, headers = live_server.get("/api/deck.md")
    assert status == 200 and b"Startup Legal Landing Partnership" in raw


def test_pilot_and_journey_endpoints(live_server):
    _, body = live_server.json_get("/api/pilot?applied=500")
    assert body["pilot"]["teams"] == 10 and body["pilot"]["people"] == 30
    assert body["funnel"][2]["projected"] == 50
    assert len(body["metrics"]) == 7
    _, j = live_server.json_get("/api/journey")
    assert len(j["journey"]) == 6 and set(j["layers"]) == {"layer1", "layer2"}
    _, f = live_server.json_get("/api/intake-form")
    assert len(f["required"]) == 12


def test_stats_reflect_activity(live_server):
    live_server.json_post("/api/intake", {"intake": dict(GOOD_INTAKE, startup_name="Stats Co")})
    _, body = live_server.json_get("/api/stats")
    assert body["startups"] >= 1
    assert body["sponsored_rooms"] == 24
    assert body["hotels"] == 4


def test_notify_cross_channel(live_server):
    status, body = live_server.json_post(
        "/api/notify",
        {"text": "New qualified lead for the Legal Desk", "targets": [{"channel": "simulated", "chat_id": "desk-1"}]},
    )
    assert status == 200 and body["results"][0]["ok"] is True
    adapter = live_server.platform.adapter("simulated")
    assert adapter.sent[-1]["text"] == "New qualified lead for the Legal Desk"


def test_notify_validates_targets(live_server):
    status, body = live_server.json_post("/api/notify", {"text": "x", "targets": [{"channel": "simulated"}]})
    assert status == 200 and body["results"][0]["ok"] is False
    status, _ = live_server.json_post("/api/notify", {"text": ""})
    assert status == 400


def test_notify_reports_unconfigured_channels(live_server):
    status, body = live_server.json_post(
        "/api/notify", {"text": "hi", "targets": [{"channel": "telegram", "chat_id": "1"}]}
    )
    assert status == 200
    assert body["results"][0]["ok"] is False       # no token configured in tests
    assert body["results"][0]["error"]


def test_whatsapp_webhook_end_to_end(live_server):
    payload = {
        "entry": [
            {
                "changes": [
                    {
                        "value": {
                            "contacts": [{"profile": {"name": "E2E"}, "wa_id": "900000000000"}],
                            "messages": [{"from": "900000000000", "id": "wamid.x", "type": "text", "text": {"body": "/journey"}}],
                        }
                    }
                ]
            }
        ]
    }
    status, body = live_server.json_post("/webhook/whatsapp", payload)
    assert status == 200
    assert body["processed"][0]["to"] == "900000000000"
    # without credentials we still run the core and return the answer
    assert body["processed"][0]["reply"]["route"] == "journey"


def test_whatsapp_webhook_verification_get(live_server):
    status, body, _ = live_server.get(
        "/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=startup-landing&hub.challenge=12345"
    )
    assert status == 200 and body.strip() == b"12345"
    status, _, _ = live_server.get("/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=1")
    assert status == 403


def test_telegram_webhook_end_to_end(live_server):
    update = {
        "update_id": 1,
        "message": {
            "message_id": 1, "date": 1, "text": "/hotels",
            "from": {"id": 7, "first_name": "E2E"}, "chat": {"id": 7, "type": "private"},
        },
    }
    status, body = live_server.json_post("/webhook/telegram", update)
    assert status == 200
    assert body["reply"]["route"] == "hotels"
    assert body["delivered"] is False        # no token in the test env


def test_discord_webhook_end_to_end(live_server):
    payload = {
        "t": "MESSAGE_CREATE",
        "d": {"id": "m1", "channel_id": "c1", "content": "/pilot", "author": {"id": "u1", "username": "e2e", "bot": False}},
    }
    status, body = live_server.json_post("/webhook/discord", payload)
    assert status == 200
    assert body["reply"]["route"] == "pilot"


def test_404_for_unknown_api(live_server):
    status, body = live_server.json_get("/api/nope")
    assert status == 404 and body["error"] == "not found"


def test_cors_headers_present(live_server):
    _, _, headers = live_server.get("/api/health")
    assert headers.get("Access-Control-Allow-Origin") == "*"


def test_same_lead_visible_from_every_channel(live_server):
    """The whole point: one core, one shared pipeline, four channels."""
    chat = "shared-e2e"
    before = live_server.json_get("/api/stats")[1]["startups"]
    live_server.json_post("/api/chat", {"text": "/intake", "chat_id": chat, "channel": "telegram"})
    _, tg = live_server.json_post(
        "/api/chat",
        {
            "text": json.dumps(GOOD_INTAKE),
            "chat_id": chat,
            "channel": "telegram",
        },
    )
    tg = tg if isinstance(tg, dict) else json.loads(tg)
    assert tg["route"] == "intake_complete"

    # bridge the session across channels (this is what a real "continue on WhatsApp" does)
    store = live_server.platform.store
    session = store.get_session(f"telegram:{chat}")
    for channel in ("whatsapp", "discord", "web"):
        store.put_session(f"{channel}:{chat}", dict(session, key=f"{channel}:{chat}"))
        _, r = live_server.json_post("/api/chat", {"text": "/metrics", "chat_id": chat, "channel": channel})
        assert f"startups in pipeline: {before + 1}" in r["text"], channel
        assert "sponsored room nights mapped: 24" in r["text"], channel
