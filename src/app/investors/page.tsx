import Link from "next/link";
import { db } from "@/db";
import { investors, startups } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { getT } from "@/lib/i18n";
import { PageHeader, money } from "@/lib/ui";
import { scoreInvestor } from "@/lib/matching";

export const dynamic = "force-dynamic";

const typeLabel: Record<string, string> = { vc: "VC", angel: "Angel Network", corporate: "Corporate VC", accelerator: "Accelerator" };

export default async function InvestorsPage() {
  await ensureSeeded();
  const { t } = await getT();
  const inv = await db.select().from(investors).orderBy(investors.name);
  const teams = await db.select().from(startups);

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <PageHeader
        eyebrow={t.p_inv_eyebrow}
        title={t.p_inv_title}
        desc={t.p_inv_desc}
      />
      <div className="grid gap-4 md:grid-cols-2">
        {inv.map((i) => {
          const matches = teams
            .map((t) => ({ t, score: scoreInvestor(t, i) }))
            .filter((x) => x.score >= 55)
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);
          return (
            <div key={i.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold">{i.name}</h3>
                  <p className="text-sm text-slate-400">
                    {typeLabel[i.type]} · {i.city}
                  </p>
                </div>
                <span className="badge bg-emerald-400/15 text-emerald-300">
                  {money(i.ticketMinUsd)} – {money(i.ticketMaxUsd)}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-300">{i.thesis}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {i.sectors.map((s) => (
                  <span key={s} className="badge bg-white/10 text-slate-200">
                    {s}
                  </span>
                ))}
                {i.stages.map((s) => (
                  <span key={s} className="badge bg-amber-400/15 capitalize text-amber-300">
                    {s}
                  </span>
                ))}
              </div>
              <div className="mt-4 border-t border-white/10 pt-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Matched deal flow</p>
                {matches.length === 0 && <p className="text-sm text-slate-500">No strong matches yet.</p>}
                {matches.map(({ t, score }) => (
                  <Link key={t.id} href={`/startups/${t.id}`} className="mt-1 flex items-center justify-between text-sm hover:text-amber-300">
                    <span>
                      {t.name} <span className="text-slate-500">· {t.sector}</span>
                    </span>
                    <span className="font-mono text-amber-300">{score}%</span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-8">
        <Link href="/apply?kind=investor" className="rounded-lg bg-amber-400 px-5 py-3 font-semibold text-slate-950 hover:bg-amber-300">
          {t.p_inv_cta}
        </Link>
      </div>
    </main>
  );
}
