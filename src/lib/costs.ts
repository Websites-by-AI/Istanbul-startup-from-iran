import type { Hotel } from "@/db/schema";

export const NIGHTS = 14;
export const ROOMS_PER_TEAM = 2;
export const ROOM_RATE = 100; // USD/night reference rate

export function teamCost(hotel?: Hotel | null) {
  const listedRoom = ROOMS_PER_TEAM * NIGHTS * ROOM_RATE; // 2800
  const factor = !hotel ? 1 : hotel.supportType === "free" ? 0 : hotel.supportType === "discount50" ? 0.5 : 0;
  const roomCash = Math.round(listedRoom * factor);
  const inKind = listedRoom - roomCash;
  const lines = [
    { item: "Flights (3 pax, return)", usd: 900, payer: "Corporate sponsor" },
    { item: `Hotel ${ROOMS_PER_TEAM} rooms × ${NIGHTS} nights`, usd: roomCash, payer: hotel ? `${hotel.name} (${inKind > 0 ? `$${inKind} in-kind` : "cash"})` : "TBD hotel" },
    { item: "Breakfast & local transport", usd: hotel?.breakfast ? 300 : 600, payer: "Hotel / corporate" },
    { item: "Coworking & meeting rooms", usd: hotel?.coworking || hotel?.meetingRoom ? 0 : 500, payer: "Hotel / ecosystem" },
    { item: "Legal Team 1 — entry & company setup", usd: 2500, payer: "Legal partner package" },
    { item: "AI Navigator + mentors", usd: 800, payer: "Platform" },
    { item: "Media & demo day", usd: 600, payer: "Media partner" },
  ];
  const total = lines.reduce((a, l) => a + l.usd, 0);
  return { lines, total, inKind, listed: total + inKind };
}

export function candidateHotels(hotels: Hotel[], city?: string | null, sector?: string | null) {
  return hotels
    .filter((h) => h.roomsAvailable >= ROOMS_PER_TEAM && (!city || h.city === city))
    .map((h) => {
      let score = h.roomsAvailable * 2;
      if (h.supportType === "free") score += 30;
      else if (h.supportType === "discount50") score += 15;
      if (h.meetingRoom) score += 10;
      if (h.coworking) score += 10;
      if (h.airportTransfer) score += 5;
      if (sector && (h.sectors.includes("All") || h.sectors.some((s) => sector.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(sector.toLowerCase().split(" ")[0])))) score += 20;
      score -= Math.round(h.exhibitionMinutes / 5);
      return { hotel: h, score };
    })
    .sort((a, b) => b.score - a.score);
}
