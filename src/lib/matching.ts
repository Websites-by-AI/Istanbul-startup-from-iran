import type { Startup, Investor, Corporate } from "@/db/schema";

const norm = (s: string) => s.toLowerCase();

function overlap(a: string[], b: string[]) {
  const A = a.map(norm);
  const B = b.map(norm);
  let hits = 0;
  for (const x of A) for (const y of B) if (x.includes(y) || y.includes(x) || x.split(" ").some((w) => w.length > 3 && y.includes(w))) hits++;
  return hits;
}

export function scoreInvestor(s: Startup, i: Investor): number {
  let score = 0;
  const sectorHit = i.sectors.includes("All") || overlap([s.sector, ...s.needsCorporate], i.sectors) > 0;
  if (sectorHit) score += 45;
  if (i.stages.includes(s.stage)) score += 30;
  if (s.seekingUsd >= i.ticketMinUsd && s.seekingUsd <= i.ticketMaxUsd * 2) score += 25;
  return Math.min(100, score);
}

export function scoreCorporate(s: Startup, c: Corporate): number {
  let score = 0;
  const industryHit = overlap(s.needsCorporate, [c.industry]) > 0;
  if (industryHit) score += 50;
  const lf = overlap([s.sector, s.tagline], c.lookingFor);
  score += Math.min(40, lf * 20);
  if (c.offersPoc) score += 10;
  return Math.min(100, score);
}
