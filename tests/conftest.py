from __future__ import annotations

import sys
import threading
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from bot.channels.simulated import SimulatedAdapter  # noqa: E402
from bot.config import AppConfig  # noqa: E402
from bot.core import Bot  # noqa: E402
from bot.models import Message  # noqa: E402
from bot.server import Platform as _Platform, serve  # noqa: E402
from bot.store import Store  # noqa: E402


def make_config(tmp_path: Path, **over) -> AppConfig:
    cfg = AppConfig()
    cfg.state_dir = tmp_path / "state"
    cfg.data_dir = ROOT / "data"
    cfg.state_dir.mkdir(parents=True, exist_ok=True)
    for k, v in over.items():
        setattr(cfg, k, v)
    return cfg


@pytest.fixture
def cfg(tmp_path: Path) -> AppConfig:
    return make_config(tmp_path)


@pytest.fixture
def store(cfg: AppConfig) -> Store:
    return Store(cfg.state_dir)


@pytest.fixture
def bot(cfg: AppConfig, store: Store) -> Bot:
    return Bot(cfg, store)


@pytest.fixture
def sim(bot: Bot) -> SimulatedAdapter:
    return SimulatedAdapter(bot)


@pytest.fixture
def msg():
    def _make(text: str, channel: str = "web", chat_id: str = "chat-1") -> Message:
        return Message(channel=channel, chat_id=chat_id, user_id=f"u-{chat_id}", text=text)  # type: ignore[arg-type]

    return _make


@pytest.fixture(scope="session")
def live_server(tmp_path_factory):
    """A real HTTP server on an ephemeral port for end-to-end API tests."""
    import http.client
    import json as _json
    import urllib.parse

    tmp = tmp_path_factory.mktemp("srv")
    cfg = make_config(tmp)
    platform = _Platform(cfg)
    httpd, port, _ = serve("127.0.0.1", 0, cfg, platform)
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()

    _plat = platform
    _port = port

    class Client:
        base = f"http://127.0.0.1:{_port}"
        platform = _plat

        def get(self, path: str):
            c = http.client.HTTPConnection("127.0.0.1", port, timeout=15)
            c.request("GET", path)
            r = c.getresponse()
            body = r.read()
            c.close()
            return r.status, body, r.headers

        def post(self, path: str, payload=None, raw: bytes | None = None, headers: dict | None = None):
            c = http.client.HTTPConnection("127.0.0.1", port, timeout=15)
            data = raw if raw is not None else _json.dumps(payload or {}).encode()
            hdrs = {"Content-Type": "application/json"}
            hdrs.update(headers or {})
            c.request("POST", path, body=data, headers=hdrs)
            r = c.getresponse()
            body = r.read()
            c.close()
            return r.status, body, r.headers

        def json_get(self, path: str):
            status, body, _ = self.get(path)
            return status, _json.loads(body.decode("utf-8"))

        def json_post(self, path: str, payload=None, raw: bytes | None = None, headers: dict | None = None):
            status, body, _ = self.post(path, payload, raw, headers)
            try:
                return status, _json.loads(body.decode("utf-8"))
            except _json.JSONDecodeError:
                return status, body

    yield Client()
    httpd.shutdown()
    httpd.server_close()


GOOD_INTAKE = {
    "startup_name": "Pars Vision AI",
    "sector": "IndustrialTech",
    "stage": "revenue",
    "team_size": 3,
    "team_roles": "Founder / Technical / Business",
    "has_iran_entity": True,
    "has_turkey_entity": False,
    "ip_owned_by_company": True,
    "founder_agreement": True,
    "intended_city": "Istanbul",
    "intended_activity": "Sell industrial AI visual-inspection software to Turkish manufacturers and run PoCs",
    "residence_status": "Three Iranian nationals on short-term entry, no Turkish residence yet",
    "funding_target_usd": 250000,
    "source": "GITEX",
}

WEAK_INTAKE = {
    "startup_name": "Weak Idea",
    "sector": "AI",
    "stage": "idea",
    "team_size": 9,
    "team_roles": "-",
    "has_iran_entity": False,
    "has_turkey_entity": False,
    "ip_owned_by_company": False,
    "founder_agreement": False,
    "intended_city": "Istanbul",
    "intended_activity": "-",
    "residence_status": "-",
}
