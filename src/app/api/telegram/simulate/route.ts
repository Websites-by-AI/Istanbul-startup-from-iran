import { NextResponse } from "next/server";
import { handleTelegramText } from "@/lib/telegram";

/** Runs the exact Telegram command handler without Telegram — used by the in-site tester and automated tests. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { chatId?: string; text?: string; username?: string; language_code?: string } | null;
  if (!body?.text) return NextResponse.json({ error: "text required" }, { status: 400 });
  const chatId = body.chatId || "sim-1";
  const reply = await handleTelegramText(chatId, body.text, { username: body.username, language_code: body.language_code });
  return NextResponse.json({ reply });
}
