import Link from "next/link";
import { db } from "@/db";
import { hotels, corporates, startups } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { sql } from "drizzle-orm";
import { getT } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function PitchPage() {
  await ensureSeeded();
  const { t } = await getT();
  const [{ rooms }] = await db.select({ rooms: sql<number>`coalesce(sum(rooms_available),0)::int` }).from(hotels);
  const [{ budget }] = await db.select({ budget: sql<number>`coalesce(sum(budget_usd),0)::int` }).from(corporates);
  const [{ teams }] = await db.select({ teams: sql<number>`count(*)::int` }).from(startups);

  const slides: { n: number; title: string; body: React.ReactNode }[] = [
    {
      n: 1,
      title: "We bring startup demand to Türkiye",
      body: (
        <>
          <p className="text-xl text-slate-200">A cross-border startup landing infrastructure. Not a travel agency, not a visa agency, not an accelerator.</p>
          <p className="mt-4 font-mono text-sm text-amber-300">Exhibition → Landing → Company → PoC → Investment → Growth</p>
        </>
      ),
    },
    {
      n: 2,
      title: "The unit: one 3-person team, 14 days, $8,700",
      body: (
        <ul className="grid gap-2 sm:grid-cols-2">
          <Li k="Flights (3 pax)" v="$900" />
          <Li k="2 rooms × 14 nights" v="$2,800 (in-kind)" />
          <Li k="Breakfast, transport, coworking" v="$1,100 (in-kind)" />
          <Li k="Legal Team 1 package" v="$2,500" />
          <Li k="AI Navigator + mentors" v="$800" />
          <Li k="Media & demo day" v="$600" />
          <li className="col-span-full mt-2 text-amber-300">≈ 45% of the cost is unsold hotel inventory, not cash.</li>
        </ul>
      ),
    },
    {
      n: 3,
      title: "Hotel value: 28 room-nights → ecosystem asset",
      body: (
        <ul className="space-y-1 text-slate-200">
          <li>• Unsold inventory on weekdays converted to “Official Startup Accommodation Partner”.</li>
          <li>• Listing on the Startup Hotel Map + logo on every sponsored team's profile & press.</li>
          <li>• Corporate sponsors book meetings, demo days and future stays at the partner hotel.</li>
          <li>• Bronze 3–4 rooms · Silver 5–6 · Gold 10+ (hosts demo day).</li>
        </ul>
      ),
    },
    {
      n: 4,
      title: "Corporate value: qualified deal flow, not applications",
      body: (
        <ul className="space-y-1 text-slate-200">
          <li>• Innovation Partner ($35–60K): 1 team, shortlist of 3, PoC coordination.</li>
          <li>• Strategic Partner ($90–150K): 2–3 teams, office, investment option, sector report.</li>
          <li>• Output: Turkish company → sponsors team → PoC → partnership / investment / acquisition.</li>
        </ul>
      ),
    },
    {
      n: 5,
      title: "Istanbul pilot scenario",
      body: (
        <div className="grid gap-3 sm:grid-cols-4">
          <Big v="10–20" l="partner hotels" />
          <Big v="5–10" l="corporate sponsors" />
          <Big v="10" l="teams · 30 founders" />
          <Big v="≈$87K" l="total pilot cost" />
        </div>
      ),
    },
    {
      n: 6,
      title: "Platform revenue (pilot year)",
      body: (
        <ul className="grid gap-2 sm:grid-cols-2">
          <Li k="Corporate scouting (8 × $40K avg)" v="$320K" />
          <Li k="Hotel marketing packages (15 × $3K)" v="$45K" />
          <Li k="Legal partner referral" v="$25K" />
          <Li k="Media & demo-day packages" v="$30K" />
          <Li k="AI Navigator SaaS (post-landing)" v="$20K" />
          <Li k="Investor success fees (per legal framework)" v="variable" />
          <li className="col-span-full mt-2 text-amber-300">Startups pay nothing in Phase 1. Value receivers finance the infrastructure.</li>
        </ul>
      ),
    },
    {
      n: 7,
      title: "Legal shield — support, not guarantees",
      body: (
        <ul className="space-y-1 text-slate-200">
          <li>• Legal Team 1 — Entry & Settlement: visa pathways, company formation, tax, IP, founder agreement.</li>
          <li>• Legal Team 2 — Investment & Growth: term sheet, SAFE, SHA, due diligence, M&A.</li>
          <li className="text-red-300">• No “kimlik guarantee”. Company registration ≠ residence or work authorization.</li>
        </ul>
      ),
    },
    {
      n: 8,
      title: "AI Navigator — 5 agents + scheduler",
      body: <p className="text-slate-200">Legal · Investor · Market · Media · Business-Match · Schedule. It coordinates the information layer between lawyers, corporates, investors and media — it doesn't replace them.</p>,
    },
    {
      n: 9,
      title: "Why now",
      body: (
        <ul className="space-y-1 text-slate-200">
          <li>• Türkiye ecosystem raised ≈ $5.6B (2021 – Q3 2025, Investment Office).</li>
          <li>• Türkiye Tech Visa targets foreign tech talent and startups.</li>
          <li>• FDI Strategy 2024–2028 prioritises technology-driven investment.</li>
          <li>• GITEX AI Türkiye, Istanbul, 9–10 September 2026 — the recruitment moment.</li>
        </ul>
      ),
    },
    {
      n: 10,
      title: "Ask: launch the Istanbul pilot with us",
      body: (
        <>
          <p className="text-slate-200">
            Platform today: <b>{rooms}</b> startup rooms committed · <b>${Math.round(budget / 1000)}K</b> corporate sponsor budget · <b>{teams}</b> teams in pool.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/apply?kind=hotel" className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950">Hotels</Link>
            <Link href="/apply?kind=corporate" className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950">Corporates</Link>
            <Link href="/apply?kind=investor" className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold">Investors</Link>
            <Link href="/apply?kind=legal" className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold">Legal firms</Link>
          </div>
        </>
      ),
    },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">{t.p_pitch_eyebrow}</p>
      <h1 className="mt-2 text-3xl font-black sm:text-4xl">Startup Landing Türkiye</h1>
      <p className="mt-2 text-slate-400">{t.p_pitch_sub}</p>
      <div dir="ltr" className="mt-8 space-y-4 text-left">
        {slides.map((s) => (
          <section key={s.n} className="card relative overflow-hidden">
            <span className="absolute end-4 top-3 font-mono text-xs text-slate-600">
              {String(s.n).padStart(2, "0")} / 10
            </span>
            <h2 className="pe-16 text-xl font-bold sm:text-2xl">{s.title}</h2>
            <div className="mt-4">{s.body}</div>
          </section>
        ))}
      </div>
    </main>
  );
}

function Li({ k, v }: { k: string; v: string }) {
  return (
    <li className="flex justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
      <span className="text-slate-300">{k}</span>
      <span className="font-mono">{v}</span>
    </li>
  );
}
function Big({ v, l }: { v: string; l: string }) {
  return (
    <div className="rounded-xl bg-white/5 p-4 text-center">
      <p className="text-3xl font-black">{v}</p>
      <p className="text-xs text-slate-400">{l}</p>
    </div>
  );
}
