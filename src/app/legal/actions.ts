"use server";

import { db } from "@/db";
import { bootcamps, legalAssessments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createBootcamp(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const firm = String(formData.get("firm") ?? "").trim();
  if (!title || !firm) return;
  const hotelId = Number(formData.get("hotelId"));
  await db.insert(bootcamps).values({
    title,
    firm,
    city: String(formData.get("city") ?? "Istanbul"),
    hotelId: Number.isFinite(hotelId) && hotelId > 0 ? hotelId : null,
    startDate: String(formData.get("startDate") ?? "") || new Date().toISOString().slice(0, 10),
    days: Number(formData.get("days") ?? 2) || 2,
    capacity: Number(formData.get("capacity") ?? 10) || 10,
    language: String(formData.get("language") ?? "fa"),
    topics: String(formData.get("topics") ?? "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean),
    priceUsd: Number(formData.get("priceUsd") ?? 0) || 0,
    description: String(formData.get("description") ?? "").trim(),
  });
  revalidatePath("/legal");
  revalidatePath("/navigator");
}

export async function deleteBootcamp(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return;
  await db.delete(bootcamps).where(eq(bootcamps.id, id));
  revalidatePath("/legal");
}

export async function upsertAssessment(formData: FormData) {
  const startupId = Number(formData.get("startupId"));
  if (!Number.isFinite(startupId)) return;
  const data = {
    lawyer: String(formData.get("lawyer") ?? "").trim(),
    layer: String(formData.get("layer") ?? "entry"),
    pathway: String(formData.get("pathway") ?? "unassessed"),
    structure: String(formData.get("structure") ?? "undecided"),
    status: String(formData.get("status") ?? "intake"),
    notes: String(formData.get("notes") ?? "").trim(),
    updatedAt: new Date(),
  };
  const [existing] = await db.select().from(legalAssessments).where(eq(legalAssessments.startupId, startupId));
  if (existing) await db.update(legalAssessments).set(data).where(eq(legalAssessments.id, existing.id));
  else await db.insert(legalAssessments).values({ startupId, ...data });
  revalidatePath("/legal");
  revalidatePath(`/startups/${startupId}`);
}
