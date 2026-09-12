"""Runtime configuration.

Everything is read from environment variables so the same code runs locally,
in the sandbox preview and on a real server. Channel credentials are optional:
a channel without credentials falls back to the *simulated* transport, which is
what the test-suite uses.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path


def _env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


def _env_int(name: str, default: int) -> int:
    raw = _env(name)
    try:
        return int(raw) if raw else default
    except ValueError:
        return default


ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"


@dataclass
class TelegramConfig:
    token: str = field(default_factory=lambda: _env("TELEGRAM_BOT_TOKEN"))
    api_base: str = field(default_factory=lambda: _env("TELEGRAM_API_BASE", "https://api.telegram.org"))
    poll_timeout: int = field(default_factory=lambda: _env_int("TELEGRAM_POLL_TIMEOUT", 25))

    @property
    def enabled(self) -> bool:
        return bool(self.token)


@dataclass
class DiscordConfig:
    token: str = field(default_factory=lambda: _env("DISCORD_BOT_TOKEN"))
    gateway_url: str = field(
        default_factory=lambda: _env("DISCORD_GATEWAY_URL", "wss://gateway.discord.gg/?v=10&encoding=json")
    )
    api_base: str = field(default_factory=lambda: _env("DISCORD_API_BASE", "https://discord.com/api/v10"))

    @property
    def enabled(self) -> bool:
        return bool(self.token)


@dataclass
class WhatsAppConfig:
    token: str = field(default_factory=lambda: _env("WHATSAPP_TOKEN"))
    phone_number_id: str = field(default_factory=lambda: _env("WHATSAPP_PHONE_NUMBER_ID"))
    verify_token: str = field(default_factory=lambda: _env("WHATSAPP_VERIFY_TOKEN", "startup-landing"))
    app_secret: str = field(default_factory=lambda: _env("WHATSAPP_APP_SECRET"))
    api_version: str = field(default_factory=lambda: _env("WHATSAPP_API_VERSION", "v21.0"))
    api_base: str = field(default_factory=lambda: _env("WHATSAPP_API_BASE", "https://graph.facebook.com"))

    @property
    def enabled(self) -> bool:
        return bool(self.token and self.phone_number_id)


@dataclass
class ServerConfig:
    host: str = field(default_factory=lambda: _env("HOST", "0.0.0.0"))
    port: int = field(default_factory=lambda: _env_int("PORT", 8080))
    public_base_url: str = field(default_factory=lambda: _env("PUBLIC_BASE_URL"))


@dataclass
class AppConfig:
    telegram: TelegramConfig = field(default_factory=TelegramConfig)
    discord: DiscordConfig = field(default_factory=DiscordConfig)
    whatsapp: WhatsAppConfig = field(default_factory=WhatsAppConfig)
    server: ServerConfig = field(default_factory=ServerConfig)
    data_dir: Path = DATA_DIR
    state_dir: Path = field(default_factory=lambda: Path(_env("STATE_DIR", str(DATA_DIR))))
    default_language: str = field(default_factory=lambda: _env("DEFAULT_LANGUAGE", "en"))

    @property
    def channels_enabled(self) -> list[str]:
        out = ["web", "simulated"]
        if self.telegram.enabled:
            out.append("telegram")
        if self.discord.enabled:
            out.append("discord")
        if self.whatsapp.enabled:
            out.append("whatsapp")
        return out


def load_config() -> AppConfig:
    cfg = AppConfig()
    cfg.state_dir.mkdir(parents=True, exist_ok=True)
    return cfg
