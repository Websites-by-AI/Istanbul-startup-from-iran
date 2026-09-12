"use server";

import { db } from "@/db";
import { startups } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const STEP_STATUS: Record<number, string> = {
  0: "pool",
  1: "selected",
  2: "selected",
  3: "selected",
  4: "landed",
  5: "landed",
  6: "poc",
  7: "poc",
  8: "funded",
  9: "funded",
};

export async function advanceStep(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return;
  const [s] = await db.select().from(startups).where(eq(startups.id, id));
  if (!s || s.landingStep >= 9) return;
  const next = s.landingStep + 1;
  await db.update(startups).set({ landingStep: next, status: STEP_STATUS[next] ?? s.status }).where(eq(startups.id, id));
  revalidatePath(`/startups/${id}`);
  revalidatePath("/startups");
  revalidatePath("/program");
  revalidatePath("/");
}
