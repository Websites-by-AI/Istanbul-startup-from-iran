import { db } from "@/db";
import { supportRequests, pledges } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createChannelPost } from "@/lib/channel";
import type { Lang } from "@/lib/navigator";

export const NEEDS = ["accommodation", "travel", "legal", "documents", "poc", "office", "mentoring", "media", "investment"] as const;
export const SPONSOR_TYPES = ["hotel", "corporate", "foreign", "legal", "ecosystem"] as const;

export type RequestInput = { startupId?: number | null; teamName: string; contact?: string; needs: string[]; companions?: number; fromDate?: string; days?: number; city?: string; budgetUsd?: number; message?: string; source?: string; lang?: Lang };
export type PledgeInput = { requestId: number; sponsorType: string; sponsorName: string; country?: string; contact?: string; covers: string[]; amountUsd?: number; inKind?: string; note?: string; lang?: Lang };

export async function addRequest(i: RequestInput) {
  const needs = i.needs.filter((n) => (NEEDS as readonly string[]).includes(n));
  const [r] = await db
    .insert(supportRequests)
    .values({
      startupId: i.startupId ?? null,
      teamName: i.teamName.trim(),
      contact: (i.contact ?? "").trim(),
      needs,
      companions: i.companions || 3,
      fromDate: i.fromDate ?? "",
      days: i.days || 14,
      city: i.city || "Istanbul",
      budgetUsd: i.budgetUsd || 0,
      message: (i.message ?? "").trim(),
      source: i.source ?? "web",
    })
    .returning();
  await createChannelPost("request", r.id, i.lang ?? "fa");
  return r;
}

export async function addPledge(i: PledgeInput) {
  const [r] = await db.select().from(supportRequests).where(eq(supportRequests.id, i.requestId));
  if (!r) throw new Error("request not found");
  const covers = i.covers.filter((n) => r.needs.includes(n));
  const [p] = await db
    .insert(pledges)
    .values({
      requestId: r.id,
      sponsorType: (SPONSOR_TYPES as readonly string[]).includes(i.sponsorType) ? i.sponsorType : "corporate",
      sponsorName: i.sponsorName.trim(),
      country: (i.country ?? "").trim() || "Türkiye",
      contact: (i.contact ?? "").trim(),
      covers,
      amountUsd: i.amountUsd || 0,
      inKind: (i.inKind ?? "").trim(),
      note: (i.note ?? "").trim(),
    })
    .returning();
  const all = await db.select().from(pledges).where(eq(pledges.requestId, r.id));
  const covered = new Set(all.flatMap((x) => x.covers));
  const status = r.needs.length > 0 && r.needs.every((n) => covered.has(n)) ? "matched" : "partially";
  await db.update(supportRequests).set({ status }).where(eq(supportRequests.id, r.id));
  await createChannelPost("pledge", p.id, i.lang ?? "fa");
  return { pledge: p, status };
}
