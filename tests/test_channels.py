"""Channel adapters: rendering + inbound parsing for Telegram / Discord / WhatsApp.

No network calls: delivery is asserted on the rendered payload, and inbound
parsing is asserted on realistic platform payloads.
"""

from __future__ import annotations

import json

import pytest

from bot.channels.base import BaseAdapter
from bot.channels.discord import DiscordAdapter
from bot.channels.telegram import TelegramAdapter
from bot.channels.whatsapp import WhatsAppAdapter
from bot.config import DiscordConfig, TelegramConfig, WhatsAppConfig
from bot.models import Button, Document, Message, Reply


# ------------------------------------------------------------------ chunking
def test_chunking_respects_platform_limits():
    text = "\n".join(f"line {i} " + "x" * 40 for i in range(200))
    for chunk in BaseAdapter.chunk(text, 1000):
        assert len(chunk) <= 1000
    assert "\n".join(BaseAdapter.chunk(text, 1000)).replace("\n", "") == text.replace("\n", "")


def test_chunking_handles_one_giant_line():
    text = "y" * 5000
    chunks = BaseAdapter.chunk(text, 1000)
    assert all(len(c) <= 1000 for c in chunks)
    assert "".join(chunks) == text


# ------------------------------------------------------------------ telegram
@pytest.fixture
def tg(bot):
    return TelegramAdapter(bot, TelegramConfig(token="123:fake", api_base="http://127.0.0.1:1"))


def test_telegram_keyboard_rendering(tg):
    reply = Reply(text="ok", buttons=[Button("Legal Desk", "/legal"), Button("Site", "", url="https://example.com")])
    markup = tg._keyboard(reply)
    rows = markup["reply_markup"]["inline_keyboard"]
    assert rows[0][0] == {"text": "Legal Desk", "callback_data": "/legal"}
    assert rows[0][1]["url"] == "https://example.com"
    assert tg._keyboard(Reply(text="x")) == {}


def test_telegram_callback_data_is_within_limit(tg):
    reply = Reply(buttons=[Button("x", "/" + "a" * 200), Button("y", "", url="https://example.com")])
    rows = tg._keyboard(reply)["reply_markup"]["inline_keyboard"]
    assert len(rows[0][0]["callback_data"]) <= 64      # Telegram hard limit
    assert len(rows[0][1]["url"]) > 0


def test_telegram_parses_message_update(tg):
    update = {
        "update_id": 7,
        "message": {
            "message_id": 99,
            "date": 1700000000,
            "text": "/legal",
            "from": {"id": 555, "first_name": "Sara", "username": "sara", "language_code": "fa"},
            "chat": {"id": 555, "type": "private"},
        },
    }
    msg = tg.parse_update(update)
    assert msg.channel == "telegram" and msg.chat_id == "555" and msg.text == "/legal"
    assert msg.user_name == "sara" and msg.language == "fa"
    assert msg.session_key == "telegram:555"


def test_telegram_parses_callback_query(tg):
    update = {
        "update_id": 8,
        "callback_query": {
            "id": "cb1",
            "data": "/hotels",
            "from": {"id": 555, "first_name": "Sara"},
            "message": {"message_id": 100, "chat": {"id": 555}},
        },
    }
    msg = tg.parse_update(update)
    assert msg.text == "/hotels" and msg.reply_to_message_id == "100"


def test_telegram_ignores_unknown_updates(tg):
    assert tg.parse_update({"update_id": 1}) is None
    assert tg.parse_update({"update_id": 1, "message": {"chat": {"id": 1}}}) is None  # no text


def test_telegram_end_to_end_without_network(tg, bot):
    """Core + parse, delivery stubbed: proves the wiring, not the network."""
    sent = []
    tg._api = lambda method, **payload: sent.append((method, payload)) or {"ok": True, "result": {"message_id": 1}}
    update = {
        "update_id": 9,
        "message": {
            "message_id": 1, "date": 1, "text": "/journey",
            "from": {"id": 1, "first_name": "A"}, "chat": {"id": 1, "type": "private"},
        },
    }
    msg = tg.parse_update(update)
    reply, result = tg.handle(msg)
    assert reply.route == "journey"
    assert sent and sent[0][0] == "sendMessage"
    assert "STEP 6" in sent[0][1]["text"]


def test_telegram_delivery_failure_is_reported_not_raised(tg):
    msg = Message(channel="telegram", chat_id="1", user_id="1", text="hi")
    result = tg.deliver(msg, Reply(text="hello"))
    assert result.ok is False and result.error


# ------------------------------------------------------------------- discord
@pytest.fixture
def dc(bot):
    return DiscordAdapter(bot, DiscordConfig(token="fake"))


def test_discord_components(dc):
    reply = Reply(text="x", buttons=[Button(f"b{i}", f"/cmd{i}") for i in range(7)])
    comps = dc.components(reply)
    assert len(comps) == 2                      # 5 per row max
    assert len(comps[0]["components"]) == 5
    assert comps[0]["components"][0]["custom_id"] == "/cmd0"
    assert dc.components(Reply(text="x")) == []


def test_discord_render_splits_long_text_and_keeps_buttons_once(dc):
    reply = Reply(text="z" * 4200, buttons=[Button("a", "/a")])
    payloads = dc.render(reply)
    assert len(payloads) == 3
    assert all(len(p["content"]) <= 1900 for p in payloads)
    assert "components" in payloads[0] and "components" not in payloads[1]


def test_discord_parses_message_create(dc):
    event = {
        "t": "MESSAGE_CREATE",
        "d": {
            "id": "m1",
            "channel_id": "c1",
            "content": "/deck",
            "author": {"id": "u1", "username": "founder", "bot": False},
        },
    }
    msg, interaction = dc.parse_event(event)
    assert msg.channel == "discord" and msg.chat_id == "c1" and msg.text == "/deck"
    assert interaction is None


def test_discord_ignores_bots(dc):
    event = {"t": "MESSAGE_CREATE", "d": {"channel_id": "c", "content": "hi", "author": {"id": "b", "bot": True}}}
    assert dc.parse_event(event)[0] is None


def test_discord_parses_button_interaction(dc):
    event = {
        "t": "INTERACTION_CREATE",
        "d": {
            "id": "i1",
            "token": "tok",
            "channel_id": "c1",
            "data": {"component_type": 2, "custom_id": "/legal"},
            "member": {"user": {"id": "u1", "username": "founder"}},
        },
    }
    msg, interaction_id = dc.parse_event(event)
    assert msg.text == "/legal" and msg.user_id == "u1"
    assert interaction_id == "i1"


# ------------------------------------------------------------------ whatsapp
@pytest.fixture
def wa(bot):
    return WhatsAppAdapter(bot, WhatsAppConfig(token="fake", phone_number_id="123", app_secret="sekret"))


WA_PAYLOAD = {
    "object": "whatsapp_business_account",
    "entry": [
        {
            "id": "e1",
            "changes": [
                {
                    "value": {
                        "messaging_product": "whatsapp",
                        "contacts": [{"profile": {"name": "Ali"}, "wa_id": "989120000000"}],
                        "messages": [
                            {
                                "from": "989120000000",
                                "id": "wamid.1",
                                "timestamp": "1700000000",
                                "type": "text",
                                "text": {"body": "/hotels"},
                            }
                        ],
                    },
                    "field": "messages",
                }
            ],
        }
    ],
}


def test_whatsapp_parses_inbound(wa):
    messages = wa.parse_payload(WA_PAYLOAD)
    assert len(messages) == 1
    m = messages[0]
    assert m.channel == "whatsapp" and m.chat_id == "989120000000" and m.text == "/hotels"
    assert m.user_name == "Ali"


def test_whatsapp_ignores_non_text(wa):
    payload = json.loads(json.dumps(WA_PAYLOAD))
    payload["entry"][0]["changes"][0]["value"]["messages"][0]["type"] = "image"
    assert wa.parse_payload(payload) == []


def test_whatsapp_button_reply_parsing():
    from bot.channels.whatsapp import parse_button_reply

    payload = {
        "entry": [
            {
                "changes": [
                    {
                        "value": {
                            "messages": [
                                {
                                    "from": "989120000000",
                                    "type": "interactive",
                                    "interactive": {"type": "button_reply", "button_reply": {"id": "/legal", "title": "Legal Desk"}},
                                }
                            ]
                        }
                    }
                ]
            }
        ]
    }
    msgs = parse_button_reply(payload)
    assert len(msgs) == 1 and msgs[0].text == "/legal"


def test_whatsapp_render_uses_interactive_buttons(wa):
    reply = Reply(text="choose", buttons=[Button("Legal", "/legal"), Button("Hotels", "/hotels")])
    payloads = wa.render(reply)
    assert payloads[0]["type"] == "interactive"
    assert payloads[0]["action"]["buttons"][0]["reply"]["id"] == "/legal"
    assert len(payloads[0]["action"]["buttons"]) <= 3
    assert wa.render(Reply(text="plain"))[0]["type"] == "text"


def test_whatsapp_drops_url_buttons(wa):
    reply = Reply(text="x", buttons=[Button("Site", "", url="https://example.com")])
    assert reply is not None
    assert wa.render(reply)[0]["type"] == "text"


def test_whatsapp_webhook_verification(wa):
    assert wa.verify_webhook("subscribe", "startup-landing", "CHALLENGE123") == "CHALLENGE123"
    assert wa.verify_webhook("subscribe", "wrong", "x") is None


def test_whatsapp_signature_verification(wa):
    import hashlib
    import hmac

    body = b'{"hello":"world"}'
    sig = "sha256=" + hmac.new(b"sekret", body, hashlib.sha256).hexdigest()
    assert wa.verify_signature(body, sig) is True
    assert wa.verify_signature(body, "sha256=deadbeef") is False


def test_whatsapp_delivery_failure_is_reported(wa):
    msg = Message(channel="whatsapp", chat_id="1", user_id="1", text="hi")
    result = wa.deliver(msg, Reply(text="hello"))
    assert result.ok is False and result.error


# ----------------------------------------------------------------- simulated
def test_simulated_adapter_records_everything(sim, msg):
    reply = sim.bot.handle(msg("/legal"))
    result = sim.deliver(msg("/legal"), reply)
    assert result.ok and result.external_id.startswith("sim-")
    assert sim.sent[-1]["text"] == reply.text
    assert sim.sent[-1]["buttons"]


def test_documents_survive_the_pipeline(bot):
    from bot.channels.simulated import SimulatedAdapter

    sim = SimulatedAdapter(bot)
    reply = sim.say("/deck")
    assert reply.documents[0].content.startswith(b"%PDF-")
    assert sim.sent[-1]["documents"][0].endswith(".pdf")
