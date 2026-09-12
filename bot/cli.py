"""Offline CLI demo — no credentials, no network.

    python -m bot.cli            # scripted demo of the whole flow
    python -m bot.cli --repl     # interactive chat with the core
"""

from __future__ import annotations

import argparse
import json
import sys

from .channels.simulated import SimulatedAdapter
from .config import load_config
from .core import Bot

DEMO = [
    "سلام! من یک استارتاپ هوش مصنوعی دارم و می‌خواهم به ترکیه بیایم",
    "/legal",
    "/journey",
    "/hotels Istanbul",
    "/corporate",
    "can you guarantee kimlik for my 3-person team?",
    "/intake",
    json.dumps(
        {
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
            "residence_status": "Three Iranian nationals, short-term tourist entry, no Turkish residence yet",
            "funding_target_usd": 250000,
            "source": "GITEX",
        }
    ),
    "/metrics",
    "/deck",
]


def banner(title: str) -> None:
    print("\n" + "=" * 78)
    print(title)
    print("=" * 78)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repl", action="store_true")
    ap.add_argument("--chat", default="demo-chat")
    args = ap.parse_args()

    cfg = load_config()
    bot = Bot(cfg)
    sim = SimulatedAdapter(bot)

    banner("Türkiye Startup Landing Platform — offline demo (simulated channel)")
    print("modules: Legal Desk · Intake · Assessment · Sponsors · Hotel map · Deck · Pilot · Safety")

    if args.repl:
        print("Type /help. Ctrl-D or 'exit' to quit.\n")
        for line in sys.stdin:
            line = line.rstrip("\n")
            if line.strip() in {"exit", "quit"}:
                break
            if not line.strip():
                continue
            reply = sim.say(line, chat_id=args.chat)
            print(f"\n[route={reply.route} intent={reply.intent} escalated={reply.escalated}]\n{reply.text}\n")
        return 0

    for text in DEMO:
        banner(f"USER → {text[:74]}{'…' if len(text) > 74 else ''}")
        reply = sim.say(text, chat_id=args.chat)
        print(reply.text)
        meta = reply.meta.get("safety", {})
        print(
            f"\n[route={reply.route} · intent={reply.intent} · lang={reply.language} · "
            f"escalated={reply.escalated} · triggers={meta.get('triggered')} · "
            f"removed={meta.get('removed_guarantees')} · docs={[d.filename for d in reply.documents]}]"
        )
        if reply.buttons:
            print("[buttons] " + " | ".join(f"{b.label}→{b.action}" for b in reply.buttons[:6]))

    banner("PLATFORM STATS")
    print(json.dumps(bot.stats(), indent=2, ensure_ascii=False))
    banner(f"messages delivered on the simulated channel: {len(sim.sent)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
