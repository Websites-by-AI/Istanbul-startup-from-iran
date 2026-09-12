"""Channel adapters: web widget, Telegram, Discord, WhatsApp + a simulated
transport used by tests and the CLI demo. Every adapter converts a native
inbound event into :class:`bot.models.Message`, calls the shared core, and
renders the :class:`bot.models.Reply` back into native primitives.
"""

from .base import BaseAdapter, DeliveryResult

__all__ = ["BaseAdapter", "DeliveryResult", "get_adapter", "describe_adapters"]


def get_adapter(name: str, bot, config):
    """Factory — import heavy/optional deps lazily."""
    name = name.lower()
    if name == "simulated":
        from .simulated import SimulatedAdapter

        return SimulatedAdapter(bot)
    if name == "telegram":
        from .telegram import TelegramAdapter

        return TelegramAdapter(bot, config.telegram)
    if name == "discord":
        from .discord import DiscordAdapter

        return DiscordAdapter(bot, config.discord)
    if name == "whatsapp":
        from .whatsapp import WhatsAppAdapter

        return WhatsAppAdapter(bot, config.whatsapp)
    raise ValueError(f"unknown channel adapter: {name}")


def describe_adapters(config) -> list[dict]:
    return [
        {"channel": "web", "status": "ready", "transport": "HTTP /api/chat (website widget)"},
        {"channel": "simulated", "status": "ready", "transport": "in-process (tests + CLI demo)"},
        {
            "channel": "telegram",
            "status": "ready" if config.telegram.enabled else "needs TELEGRAM_BOT_TOKEN",
            "transport": "long polling getUpdates / sendMessage",
        },
        {
            "channel": "discord",
            "status": "ready" if config.discord.enabled else "needs DISCORD_BOT_TOKEN",
            "transport": "gateway websocket + REST channels/messages",
        },
        {
            "channel": "whatsapp",
            "status": "ready" if config.whatsapp.enabled else "needs WHATSAPP_TOKEN + PHONE_NUMBER_ID",
            "transport": "Cloud API webhook /messages",
        },
    ]
