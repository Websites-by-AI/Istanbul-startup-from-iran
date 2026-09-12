import { NextResponse } from "next/server";
import { db } from "@/db";
import { supportRequests, pledges } from "@/db/schema";
import { desc } from "drizzle-orm";
import { addRequest, addPledge } from "@/lib/sponsorship";

export async function GET() {
  const [reqs, pls] = await Promise.all([db.select().from(supportRequests).orderBy(desc(supportRequests.id)), db.select().from(pledges)]);
  return NextResponse.json({ requests: reqs.map((r) => ({ ...r, pledges: pls.filter((p) => p.requestId === r.id) })) });
}

/** JSON API for integrations: { type: "request", ... } or { type: "pledge", ... } */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid json" }, { status: 400 });
  try {
    if (body.type === "request") {
      const r = await addRequest({ teamName: String(body.teamName ?? ""), needs: Array.isArray(body.needs) ? body.needs.map(String) : [], contact: String(body.contact ?? ""), companions: Number(body.companions), days: Number(body.days), city: String(body.city ?? "Istanbul"), budgetUsd: Number(body.budgetUsd), message: String(body.message ?? ""), startupId: body.startupId ? Number(body.startupId) : null, source: "api", lang: (body.lang as "fa" | "tr" | "en") ?? "fa" });
      return NextResponse.json({ ok: true, request: r });
    }
    if (body.type === "pledge") {
      const out = await addPledge({ requestId: Number(body.requestId), sponsorType: String(body.sponsorType ?? "corporate"), sponsorName: String(body.sponsorName ?? ""), country: String(body.country ?? ""), contact: String(body.contact ?? ""), covers: Array.isArray(body.covers) ? body.covers.map(String) : [], amountUsd: Number(body.amountUsd), inKind: String(body.inKind ?? ""), note: String(body.note ?? ""), lang: (body.lang as "fa" | "tr" | "en") ?? "fa" });
      return NextResponse.json({ ok: true, ...out });
    }
    return NextResponse.json({ error: "type must be request|pledge" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
