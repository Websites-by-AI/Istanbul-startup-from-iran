import Link from "next/link";
import { db } from "@/db";
import { corporates, startups } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { getT } from "@/lib/i18n";
import { PageHeader, money } from "@/lib/ui";

export const dynamic = "force-dynamic";

const packages = [
  {
    name: "Hotel Partner",
    sub: "Startup Accommodation Partner",
    tiers: [
      ["Bronze", "3–4 rooms · 50% discount", "Map listing + logo"],
      ["Silver", "5–6 rooms · free or 50%", "+ Meeting room · sector tag · newsletter"],
      ["Gold", "10+ rooms · free", "+ Demo-day host · corporate intros · media package"],
    ],
  },
  {
    name: "Corporate Partner",
    sub: "Startup Innovation Partner",
    tiers: [
      ["Innovation", "1 team · ~$35–60K", "Curated shortlist of 3 · PoC coordination"],
      ["Strategic", "2–3 teams · $90–150K", "+ Office · investment option · sector deal-flow report"],
    ],
  },
  {
    name: "Ecosystem Partner",
    sub: "Startup Landing Partner",
    tiers: [["Ecosystem", "Legal · accelerator · coworking · mentoring", "Referral flow + visibility"]],
  },
];

export default async function CorporatesPage() {
  await ensureSeeded();
  const { t } = await getT();
  const rows = await db.select().from(corporates).orderBy(corporates.name);
  const teams = await db.select().from(startups);

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <PageHeader
        eyebrow={t.p_corp_eyebrow}
        title={t.p_corp_title}
        desc={t.p_corp_desc}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((c) => {
          const sponsored = teams.filter((t) => t.corporateId === c.id);
          return (
            <div key={c.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold">{c.name}</h3>
                  <p className="text-sm text-slate-400">
                    {c.industry} · {c.city}
                  </p>
                </div>
                <span
                  className={`badge ${
                    c.sponsorTier === "strategic" ? "bg-amber-400/20 text-amber-300" : "bg-sky-400/20 text-sky-300"
                  }`}
                >
                  {c.sponsorTier === "strategic" ? "Strategic Partner" : "Innovation Partner"}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-300">{c.description}</p>
              <div className="mt-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Looking for</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {c.lookingFor.map((l) => (
                    <span key={l} className="badge bg-white/10 text-slate-200">
                      {l}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-lg bg-white/5 py-2">
                  <p className="font-bold">{money(c.budgetUsd)}</p>
                  <p className="text-[11px] text-slate-500">Budget</p>
                </div>
                <div className="rounded-lg bg-white/5 py-2">
                  <p className="font-bold">{c.teamsSponsored}</p>
                  <p className="text-[11px] text-slate-500">Teams</p>
                </div>
                <div className="rounded-lg bg-white/5 py-2">
                  <p className="font-bold">
                    {[c.offersPoc && "PoC", c.offersOffice && "Office", c.offersInvestment && "Invest"]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <p className="text-[11px] text-slate-500">Offers</p>
                </div>
              </div>
              {sponsored.length > 0 && (
                <div className="mt-4 border-t border-white/10 pt-3 text-sm">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Sponsored teams</p>
                  {sponsored.map((s) => (
                    <Link key={s.id} href={`/startups/${s.id}`} className="mt-1 block text-amber-300 hover:underline">
                      {s.name} — {s.tagline}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <section className="mt-16">
        <h2 className="text-2xl font-bold">{t.p_corp_packages}</h2>
        <p className="mt-1 text-sm text-slate-400">Keep initial access free for startups; the ecosystem participants who receive economic value finance the infrastructure.</p>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {packages.map((p) => (
            <div key={p.name} className="card">
              <h3 className="text-lg font-bold">{p.name}</h3>
              <p className="text-sm text-amber-300">{p.sub}</p>
              <ul className="mt-4 space-y-3">
                {p.tiers.map(([t, a, b]) => (
                  <li key={t} className="rounded-lg bg-white/5 p-3">
                    <p className="font-semibold">{t}</p>
                    <p className="text-sm text-slate-300">{a}</p>
                    <p className="text-xs text-slate-500">{b}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/apply?kind=corporate" className="rounded-lg bg-amber-400 px-5 py-3 font-semibold text-slate-950 hover:bg-amber-300">
            {t.p_corp_cta}
          </Link>
          <Link href="/navigator?agent=match" className="rounded-lg border border-white/20 px-5 py-3 font-semibold hover:bg-white/10">
            Try the Business-Match AI
          </Link>
        </div>
      </section>
    </main>
  );
}
