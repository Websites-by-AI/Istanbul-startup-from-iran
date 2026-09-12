"use server";

import { db } from "@/db";
import { applications, startups, hotels } from "@/db/schema";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const KINDS = ["startup", "hotel", "corporate", "investor", "legal", "media"] as const;

export async function submitApplication(formData: FormData) {
  const kind = String(formData.get("kind") ?? "");
  if (!(KINDS as readonly string[]).includes(kind)) redirect("/apply?error=kind");
  const organization = String(formData.get("organization") ?? "").trim();
  const contactName = String(formData.get("contactName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  if (!organization || !contactName || !email.includes("@")) redirect(`/apply?kind=${kind}&error=required`);

  const city = String(formData.get("city") ?? "").trim();
  const sector = String(formData.get("sector") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  const payload: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) {
    if (!["kind", "organization", "contactName", "email", "city", "sector", "message"].includes(k)) payload[k] = String(v);
  }

  await db.insert(applications).values({ kind, organization, contactName, email, city, sector, message, payload });

  if (kind === "startup") {
    await db.insert(startups).values({
      name: organization,
      tagline: String(formData.get("tagline") ?? "").trim() || "New startup from the Iranian pool",
      sector: sector || "General",
      stage: String(formData.get("stage") ?? "idea"),
      originCity: city || "Tehran",
      founderName: contactName,
      technicalName: String(formData.get("technicalName") ?? "").trim() || "TBD",
      businessName: String(formData.get("businessName") ?? "").trim() || "TBD",
      tractionSummary: message,
      seekingUsd: Number(formData.get("seekingUsd") ?? 0) || 0,
      needsCorporate: String(formData.get("needsCorporate") ?? "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      sourceEvent: String(formData.get("sourceEvent") ?? "Website"),
    });
  }

  if (kind === "hotel") {
    const rooms = Number(formData.get("rooms") ?? 0) || 0;
    const cityName = ["Istanbul", "Ankara", "İzmir"].includes(city) ? city : "Istanbul";
    const base = cityName === "Ankara" ? { lat: 39.9, lng: 32.83 } : cityName === "İzmir" ? { lat: 38.43, lng: 27.14 } : { lat: 41.03, lng: 28.95 };
    await db.insert(hotels).values({
      name: organization,
      city: cityName,
      district: String(formData.get("district") ?? "").trim() || "Center",
      lat: base.lat + (Math.random() - 0.5) * 0.06,
      lng: base.lng + (Math.random() - 0.5) * 0.08,
      sponsorLevel: rooms >= 10 ? "gold" : rooms >= 5 ? "silver" : "bronze",
      supportType: String(formData.get("supportType") ?? "discount50"),
      startupRooms: rooms,
      roomsAvailable: rooms,
      meetingRoom: formData.get("meetingRoom") === "on",
      coworking: formData.get("coworking") === "on",
      airportTransfer: formData.get("airportTransfer") === "on",
      sectors: sector ? sector.split(",").map((x) => x.trim()).filter(Boolean) : ["All"],
      description: message || "New Startup Partner Hotel — pending verification.",
    });
  }

  revalidatePath("/");
  revalidatePath("/hotels");
  revalidatePath("/startups");
  redirect(`/apply/thanks?kind=${kind}`);
}
