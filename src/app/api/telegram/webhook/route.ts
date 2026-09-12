import { NextResponse } from "next/server";
import { processUpdate, sendTelegram, type TgUpdate } from "@/lib/telegram";

export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const update = (await req.json().catch(() => null)) as TgUpdate | null;
  if (!update) return NextResponse.json({ ok: true });
  try {
    const out = await processUpdate(update);
    if (out) await sendTelegram(out.chatId, out.reply);
  } catch (e) {
    console.error("telegram webhook error", e);
  }
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, configured: Boolean(process.env.TELEGRAM_BOT_TOKEN) });
}
