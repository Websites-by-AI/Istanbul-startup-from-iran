import { NextResponse } from "next/server";

/** Registers the webhook with Telegram once TELEGRAM_BOT_TOKEN is set. */
export async function POST(req: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return NextResponse.json({ ok: false, error: "TELEGRAM_BOT_TOKEN is not set" }, { status: 400 });
  const origin = new URL(req.url).origin;
  const url = `${origin}/api/telegram/webhook`;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, ...(secret ? { secret_token: secret } : {}), allowed_updates: ["message"] }),
  });
  const data = await res.json();
  return NextResponse.json({ ok: res.ok, url, telegram: data });
}
