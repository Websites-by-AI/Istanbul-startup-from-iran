import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { startups, hotels, corporates, investors } from "@/db/schema";
import { eq } from "drizzle-orm";
import { statusColor, money, LANDING_STEPS, supportLabel } from "@/lib/ui";
import { scoreInvestor, scoreCorporate } from "@/lib/matching";
import { advanceStep } from "./actions";

export const dynamic = "force-dynamic";

export default async function StartupDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sid = Number(id);
  if (!Number.isFinite(sid)) notFound();
  const [s] = await db.select().from(startups).where(eq(startups.id, sid));
  if (!s) notFound();

  const [hotel] = s.hotelId ? await db.select().from(hotels).where(eq(hotels.id, s.hotelId)) : [];
  const [corp] = s.corporateId ? await db.select().from(corporates).where(eq(corporates.id, s.corporateId)) : [];
  const allInv = await db.select().from(investors);
  const allCorp = await db.select().from(corporates);
  const invMatches = allInv.map((i) => ({ i, score: scoreInvestor(s, i) })).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
  const corpMatches = allCorp.map((c) => ({ c, score: scoreCorporate(s, c) })).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <Link href="/startups" className="text-sm text-slate-400 hover:text-white">
        ← Startup pool
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">{s.name}</h1>
          <p className="mt-1 text-lg text-slate-300">{s.tagline}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className={`badge capitalize ${statusColor(s.status)}`}>{s.status}</span>
            <span className="badge bg-amber-400/15 text-amber-300">{s.sector}</span>
            <span className="badge bg-white/10 capitalize text-slate-300">{s.stage}</span>
            <span className="badge bg-white/10 text-slate-300">from {s.originCity}</span>
            <span className="badge bg-white/10 text-slate-300">{s.sourceEvent}</span>
          </div>
        </div>
        <Link href={`/navigator?startup=${s.id}`} className="rounded-lg bg-amber-400 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-300">
          Open AI Navigator →
        </Link>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card">
            <h2 className="font-bold">Landing progress</h2>
            <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {LANDING_STEPS.map((step, idx) => {
                const done = idx < s.landingStep;
                const cur = idx === s.landingStep;
                return (
                  <li
                    key={step}
                    className={`rounded-lg border p-2 text-xs ${
                      cur ? "border-amber-400 bg-amber-400/10 text-amber-200" : done ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-white/10 text-slate-500"
                    }`}
                  >
                    <span className="block text-[10px] opacity-70">Step {idx + 1}</span>
                    {step}
                  </li>
                );
              })}
            </ol>
            {s.landingStep < 9 && (
              <form action={advanceStep} className="mt-4">
                <input type="hidden" name="id" value={s.id} />
                <button className="rounded-lg border border-white/20 px-3 py-1.5 text-sm hover:bg-white/10">
                  Mark “{LANDING_STEPS[s.landingStep]}” complete →
                </button>
              </form>
            )}
          </div>

          <div className="card">
            <h2 className="font-bold">3-Person Core Team</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {[
                ["Founder / Business", s.founderName],
                ["Technology / Product", s.technicalName],
                ["Growth / Market", s.businessName],
              ].map(([r, n]) => (
                <div key={r} className="rounded-lg bg-white/5 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">{r}</p>
                  <p className="font-semibold">{n}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-white/5 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Traction</p>
                <p className="text-sm">{s.tractionSummary}</p>
              </div>
              <div className="rounded-lg bg-white/5 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Seeking</p>
                <p className="text-sm font-semibold">{money(s.seekingUsd)}</p>
                <p className="text-xs text-slate-400">Needs corporate in: {s.needsCorporate.join(", ")}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="font-bold">Suggested matches (Business Match AI)</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Corporate sponsors</p>
                {corpMatches.length === 0 && <p className="text-sm text-slate-500">No match yet.</p>}
                {corpMatches.map(({ c, score }) => (
                  <div key={c.id} className="mt-2 flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
                    <span>
                      {c.name} <span className="text-slate-500">· {c.industry}</span>
                    </span>
                    <span className="font-mono text-amber-300">{score}%</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Investors</p>
                {invMatches.length === 0 && <p className="text-sm text-slate-500">No match yet.</p>}
                {invMatches.map(({ i, score }) => (
                  <div key={i.id} className="mt-2 flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
                    <span>
                      {i.name} <span className="text-slate-500">· {i.type}</span>
                    </span>
                    <span className="font-mono text-amber-300">{score}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Hospitality sponsor</p>
            {hotel ? (
              <>
                <p className="mt-1 font-semibold">{hotel.name}</p>
                <p className="text-sm text-slate-400">
                  {hotel.district}, {hotel.city} · {supportLabel(hotel.supportType)}
                </p>
                <p className="mt-2 text-xs text-slate-500">Sponsored by {hotel.name} — Startup Partner Hotel</p>
              </>
            ) : (
              <p className="mt-1 text-sm text-slate-400">Not yet assigned. Awaiting sponsor matching.</p>
            )}
          </div>
          <div className="card">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Corporate sponsor</p>
            {corp ? (
              <>
                <p className="mt-1 font-semibold">{corp.name}</p>
                <p className="text-sm text-slate-400">
                  {corp.industry} · {corp.city}
                </p>
                <p className="mt-2 text-xs text-slate-500">PoC {corp.offersPoc ? "✓" : "–"} · Office {corp.offersOffice ? "✓" : "–"} · Investment {corp.offersInvestment ? "✓" : "–"}</p>
              </>
            ) : (
              <p className="mt-1 text-sm text-slate-400">Not yet sponsored.</p>
            )}
          </div>
          <div className="card">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Legal shield</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-300">
              <li>Team 1 · Entry &amp; Settlement — {s.landingStep >= 4 ? "engaged" : "pending"}</li>
              <li>Team 2 · Investment &amp; Growth — {s.landingStep >= 7 ? "engaged" : "pending"}</li>
            </ul>
            <p className="mt-2 text-xs text-slate-500">Support, not guarantees: no kimlik / work permit is promised.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
