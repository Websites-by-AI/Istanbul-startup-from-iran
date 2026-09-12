import Link from "next/link";
import { db } from "@/db";
import { startups } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { getT } from "@/lib/i18n";
import { PageHeader, statusColor, money, LANDING_STEPS } from "@/lib/ui";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function StartupsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await ensureSeeded();
  const { t } = await getT();
  const { status } = await searchParams;
  const all = await db.select().from(startups).orderBy(desc(startups.landingStep), startups.name);
  const rows = status ? all.filter((s) => s.status === status) : all;
  const statuses = ["pool", "selected", "landed", "poc", "funded"];

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <PageHeader
        eyebrow={t.p_startups_eyebrow}
        title={t.p_startups_title}
        desc={t.p_startups_desc}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <Link href="/startups" className={`rounded-lg px-3 py-1.5 text-sm ${!status ? "bg-white text-slate-950" : "bg-white/10 text-slate-300"}`}>
          {t.p_startups_all} ({all.length})
        </Link>
        {statuses.map((s) => (
          <Link
            key={s}
            href={`/startups?status=${s}`}
            className={`rounded-lg px-3 py-1.5 text-sm capitalize ${status === s ? "bg-white text-slate-950" : "bg-white/10 text-slate-300"}`}
          >
            {s} ({all.filter((x) => x.status === s).length})
          </Link>
        ))}
        <Link href="/apply?kind=startup" className="ms-auto rounded-lg bg-amber-400 px-3 py-1.5 text-sm font-semibold text-slate-950">
          {t.p_startups_add}
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((s) => (
          <Link key={s.id} href={`/startups/${s.id}`} className="card transition hover:border-amber-400/40">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-bold">{s.name}</h3>
              <span className={`badge capitalize ${statusColor(s.status)}`}>{s.status}</span>
            </div>
            <p className="mt-1 text-sm text-slate-300">{s.tagline}</p>
            <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
              <span className="badge bg-amber-400/15 text-amber-300">{s.sector}</span>
              <span className="badge bg-white/10 capitalize text-slate-300">{s.stage}</span>
              <span className="badge bg-white/10 text-slate-300">{s.sourceEvent}</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-1 text-[11px] text-slate-400">
              <div>
                <p className="text-slate-500">Founder</p>
                <p className="truncate text-slate-200">{s.founderName}</p>
              </div>
              <div>
                <p className="text-slate-500">Technical</p>
                <p className="truncate text-slate-200">{s.technicalName}</p>
              </div>
              <div>
                <p className="text-slate-500">Business</p>
                <p className="truncate text-slate-200">{s.businessName}</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>{LANDING_STEPS[s.landingStep]}</span>
                <span>Seeking {money(s.seekingUsd)}</span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-white/10">
                <div className="h-1.5 rounded-full bg-gradient-to-r from-amber-400 to-red-400" style={{ width: `${(s.landingStep / 9) * 100}%` }} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
