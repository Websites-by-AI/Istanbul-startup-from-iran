"use server";

import { revalidatePath } from "next/cache";
import { addRequest, addPledge, NEEDS } from "@/lib/sponsorship";
import type { Lang } from "@/lib/navigator";

const langOf = (v: unknown): Lang => (v === "en" || v === "tr" ? v : "fa");

export async function createRequest(formData: FormData) {
  const teamName = String(formData.get("teamName") ?? "").trim();
  if (!teamName) return;
  const startupId = Number(formData.get("startupId"));
  await addRequest({
    startupId: Number.isFinite(startupId) && startupId > 0 ? startupId : null,
    teamName,
    contact: String(formData.get("contact") ?? ""),
    needs: NEEDS.filter((n) => formData.get(`need_${n}`) === "on"),
    companions: Number(formData.get("companions")),
    fromDate: String(formData.get("fromDate") ?? ""),
    days: Number(formData.get("days")),
    city: String(formData.get("city") ?? "Istanbul"),
    budgetUsd: Number(formData.get("budgetUsd")),
    message: String(formData.get("message") ?? ""),
    lang: langOf(formData.get("lang")),
  });
  revalidatePath("/sponsorship");
  revalidatePath("/channel");
}

export async function createPledge(formData: FormData) {
  const requestId = Number(formData.get("requestId"));
  const sponsorName = String(formData.get("sponsorName") ?? "").trim();
  if (!Number.isFinite(requestId) || !sponsorName) return;
  await addPledge({
    requestId,
    sponsorType: String(formData.get("sponsorType") ?? "corporate"),
    sponsorName,
    country: String(formData.get("country") ?? ""),
    contact: String(formData.get("contact") ?? ""),
    covers: NEEDS.filter((n) => formData.get(`cover_${n}`) === "on"),
    amountUsd: Number(formData.get("amountUsd")),
    inKind: String(formData.get("inKind") ?? ""),
    note: String(formData.get("note") ?? ""),
    lang: langOf(formData.get("lang")),
  });
  revalidatePath("/sponsorship");
  revalidatePath("/channel");
}
