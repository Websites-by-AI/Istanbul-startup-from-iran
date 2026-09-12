import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { navigatorMessages } from "@/db/schema";
import { runAgent, isAgent, type Lang } from "@/lib/navigator";
import { eq, and, asc } from "drizzle-orm";

async function localeFromCookie(): Promise<Lang> {
  const c = (await cookies()).get("locale")?.value;
  return c === "fa" || c === "tr" ? c : "en";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const startupId = Number(url.searchParams.get("startup"));
  const agent = url.searchParams.get("agent");
  if (!startupId || !isAgent(agent)) return NextResponse.json({ messages: [] });
  const messages = await db
    .select()
    .from(navigatorMessages)
    .where(and(eq(navigatorMessages.startupId, startupId), eq(navigatorMessages.agent, agent)))
    .orderBy(asc(navigatorMessages.id));
  return NextResponse.json({ messages });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { agent?: string; question?: string; startupId?: number | null; lang?: string } | null;
  if (!body || !isAgent(body.agent) || !body.question?.trim()) {
    return NextResponse.json({ error: "agent and question are required" }, { status: 400 });
  }
  const startupId = body.startupId ? Number(body.startupId) : null;
  const locale: Lang = body.lang === "fa" || body.lang === "tr" || body.lang === "en" ? body.lang : await localeFromCookie();
  const answer = await runAgent(body.agent, body.question.trim(), startupId, locale);
  if (startupId) {
    await db.insert(navigatorMessages).values([
      { startupId, agent: body.agent, role: "user", content: body.question.trim() },
      { startupId, agent: body.agent, role: "assistant", content: answer },
    ]);
  }
  return NextResponse.json({ answer });
}
