// Sponsor ecosystem + Istanbul/Ankara Startup Hotel Map — JS port of bot/sponsors.py
// Data source of truth: data/hotels.json (inlined at build time by build_static.py)

export const CITIES = ["Istanbul", "Ankara", "İzmir", "Antalya"];

export const SPONSOR_TYPES = {
  A: {
    name: "Hospitality Sponsor",
    who: "Hotel / hostel / serviced apartments",
    gives: ["Room nights (unused inventory)", "Breakfast", "Meeting room", "Internet", "Airport transfer"],
    gets: "Official Startup Accommodation Partner — startup-ecosystem visibility, direct corporate bookings",
  },
  B: {
    name: "Corporate Sponsor",
    who: "Turkish companies",
    gives: ["Travel cost", "Accommodation", "Workspace", "PoC", "Service purchase", "Seed capital"],
    gets: "Qualified deal flow: pre-screened technology teams matched to a real business problem",
  },
  C: {
    name: "Ecosystem Sponsor",
    who: "Accelerator / technopark / university / VC / angel / coworking / chamber of commerce",
    gives: ["Mentoring", "Investor meetings", "Office", "Market access"],
    gets: "International deal flow and program co-branding",
  },
};

export function matchHotels(data, { city = "Istanbul", sector = "", roomsNeeded = 1, needsWorkspace = false, needsTransfer = false } = {}) {
  const out = [];
  for (const h of data.hotels || []) {
    if (city && h.city.toLowerCase() !== city.toLowerCase()) continue;
    if (h.startup_rooms < roomsNeeded) continue;
    let score = 0;
    const why = [];
    if (sector && h.sectors.some((s) => s.toLowerCase().includes(sector.toLowerCase()))) {
      score += 3;
      why.push(`sector match: ${sector}`);
    }
    if (h.support_type === "free") {
      score += 2;
      why.push("free sponsored room nights");
    } else if (h.support_type === "50%") {
      score += 1;
      why.push("50% sponsored room nights");
    }
    if (needsWorkspace && h.coworking) {
      score += 1.5;
      why.push("coworking on site");
    }
    if (needsTransfer && h.airport_transfer) {
      score += 1;
      why.push("airport transfer");
    }
    if (h.meeting_room) {
      score += 0.5;
      why.push("meeting room");
    }
    score += Math.max(0, 3 - h.metro_min / 5);
    out.push({ hotel: h, score: Math.round(score * 100) / 100, why });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

export function matchCorporateSponsors(data, sector = "", city = "") {
  const out = [];
  for (const c of data.corporate_sponsors || []) {
    let score = 0;
    const why = [];
    if (sector && (c.sector_interest || []).some((s) => s.toLowerCase().includes(sector.toLowerCase()))) {
      score += 3;
      why.push(`sector interest: ${sector}`);
    }
    if (city && (c.city || "").toLowerCase() === city.toLowerCase()) {
      score += 2;
      why.push(`same city: ${city}`);
    }
    if (c.status === "confirmed") {
      score += 1.5;
      why.push("sponsor confirmed");
    }
    if ((c.offers || []).some((o) => o.includes("PoC"))) {
      score += 1;
      why.push("offers a PoC");
    }
    out.push({ sponsor: c, score: Math.round(score * 100) / 100, why });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

export function totalSponsoredRooms(data, city = "") {
  return (data.hotels || [])
    .filter((h) => !city || h.city.toLowerCase() === city.toLowerCase())
    .reduce((a, h) => a + h.startup_rooms, 0);
}

export function hotelTableText(data, city = "") {
  const rows = (data.hotels || []).filter((h) => !city || h.city.toLowerCase() === city.toLowerCase());
  const pad = (s, n) => String(s).padEnd(n);
  const lines = [
    "ISTANBUL / ANKARA STARTUP HOTEL MAP",
    "",
    `${pad("Hotel", 38)}${pad("City", 10)}${"Rooms".padStart(6)}  Support`,
    "-".repeat(74),
  ];
  for (const h of rows) lines.push(`${pad(h.name, 38)}${pad(h.city, 10)}${String(h.startup_rooms).padStart(6)}  ${h.support_type}`);
  lines.push("-".repeat(74));
  lines.push(`Total sponsored room nights available: ${totalSponsoredRooms(data, city)}`);
  return lines.join("\n");
}

export function sponsorModelText() {
  const out = ["SPONSOR MODEL — three layers, not just hotels", ""];
  for (const [k, s] of Object.entries(SPONSOR_TYPES)) {
    out.push(`${k}. ${s.name} — ${s.who}`);
    out.push(`   gives: ${s.gives.join(", ")}`);
    out.push(`   gets : ${s.gets}`);
    out.push("");
  }
  out.push("Key reframing: a hotel converts unused room-night inventory into a marketing and");
  out.push("startup-attraction asset — we ask for inventory, not cash.");
  return out.join("\n").trim();
}

export function corporateSponsorshipFlow() {
  return [
    "CORPORATE STARTUP SPONSORSHIP FLOW",
    "",
    "Turkish company states the problem it wants solved",
    "  ↓",
    "Platform searches the Iranian Startup Pool",
    "  ↓",
    "3 matched teams are presented",
    "  ↓",
    "Company selects one and sponsors the 3-person team",
    "  ↓",
    "Startup enters Türkiye (hotel + workspace + legal desk)",
    "  ↓",
    "Corporate Proof of Concept (PoC)",
    "  ↓",
    "Commercial contract / investment / strategic partnership",
    "",
    "For the Turkish company this is deal flow — not charity.",
  ].join("\n");
}

export function ecosystemText(data) {
  const out = [
    "LANDING ECOSYSTEM (deck §9)",
    "",
    "HOTEL (Accommodation Sponsor) → LEGAL PARTNER (Legal Landing Desk) →",
    "CORPORATE SPONSOR (Market / PoC Partner) → INVESTOR (Capital) →",
    "STARTUP (Technology + Team).  The platform coordinates the ecosystem.",
    "",
    "Ecosystem sponsors on record:",
  ];
  for (const e of data.ecosystem_sponsors || []) out.push(`  • ${e.name} [${e.type}] — ${e.offers.join(", ")}`);
  return out.join("\n");
}
