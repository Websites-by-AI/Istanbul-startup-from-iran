import Link from "next/link";
import { db } from "@/db";
import { startups, hotels, bootcamps, legalAssessments } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { desc } from "drizzle-orm";
import { getT } from "@/lib/i18n";
import { PageHeader, money } from "@/lib/ui";
import { teamCost, candidateHotels } from "@/lib/costs";
import { createBootcamp, deleteBootcamp, upsertAssessment } from "./actions";

export const dynamic = "force-dynamic";

const PATHWAYS = ["unassessed", "business_visa", "tech_visa", "short_term_residence", "work_permit_via_entity", "other"];
const STRUCTURES = ["undecided", "subsidiary", "sister", "operating", "branch_or_liaison"];
const STATUSES = ["intake", "in_review", "plan_ready", "engaged"];

export default async function LegalPage({ searchParams }: { searchParams: Promise<{ team?: string }> }) {
  await ensureSeeded();
  const { t, locale } = await getT();
  const { team } = await searchParams;
  const [teams, allHotels, camps, assessments] = await Promise.all([
    db.select().from(startups).orderBy(desc(startups.landingStep)),
    db.select().from(hotels),
    db.select().from(bootcamps).orderBy(desc(bootcamps.id)),
    db.select().from(legalAssessments),
  ]);
  const byStartup = new Map(assessments.map((a) => [a.startupId, a]));
  const selected = teams.find((s) => s.id === Number(team)) ?? teams[0];
  const selHotel = selected?.hotelId ? allHotels.find((h) => h.id === selected.hotelId) : null;
  const cost = teamCost(selHotel);
  const candidates = candidateHotels(allHotels, selHotel?.city ?? "Istanbul", selected?.sector).slice(0, 4);
  const a = selected ? byStartup.get(selected.id) : undefined;
  const kpi = (s: string) => assessments.filter((x) => x.status === s).length;

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <PageHeader eyebrow={t.legal_eyebrow} title={t.legal_title} desc={t.legal_desc} />
      <Link href="/legal/rules" className="mb-6 inline-block rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-400/20">
        {locale === "fa" ? "⚖️ قواعد حقوقی ترکیه + مشاور مسیر ←" : locale === "tr" ? "⚖️ Türkiye kural kitabı + Yol Danışmanı →" : "⚖️ Türkiye rulebook + Pathway Advisor →"}
      </Link>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          [t.legal_kpi_intake, teams.length - assessments.length + kpi("intake")],
          [t.legal_kpi_review, kpi("in_review")],
          [t.legal_kpi_ready, kpi("plan_ready")],
          [t.legal_kpi_engaged, kpi("engaged")],
        ].map(([l, v]) => (
          <div key={l as string} className="card">
            <p className="text-2xl font-bold">{v}</p>
            <p className="text-xs text-slate-400">{l}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="card p-2">
          <p className="px-3 pb-2 pt-1 text-xs uppercase tracking-wide text-slate-500">{t.legal_queue}</p>
          {teams.map((s) => {
            const st = byStartup.get(s.id)?.status ?? "intake";
            return (
              <Link
                key={s.id}
                href={`/legal?team=${s.id}`}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${selected?.id === s.id ? "bg-amber-400/15 text-amber-200" : "hover:bg-white/5"}`}
              >
                <span className="truncate">{s.name}</span>
                <span className="badge bg-white/10 text-[10px] text-slate-300">{st.replace("_", " ")}</span>
              </Link>
            );
          })}
        </aside>

        {selected && (
          <div className="space-y-6">
            <div className="card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold">{selected.name}</h2>
                  <p className="text-sm text-slate-400">
                    {selected.sector} · {selected.stage} · {selected.founderName} / {selected.technicalName} / {selected.businessName}
                  </p>
                </div>
                <Link href={`/navigator?startup=${selected.id}&agent=legal`} className="rounded-lg border border-white/20 px-3 py-1.5 text-sm hover:bg-white/10">
                  Legal AI →
                </Link>
              </div>
              <form action={upsertAssessment} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <input type="hidden" name="startupId" value={selected.id} />
                <L label={t.legal_lawyer}>
                  <input name="lawyer" defaultValue={a?.lawyer ?? ""} className="input" placeholder="Av. …" />
                </L>
                <L label={t.legal_layer}>
                  <select name="layer" defaultValue={a?.layer ?? "entry"} className="input">
                    <option value="entry">Layer 1 — Entry & Settlement</option>
                    <option value="growth">Layer 2 — Investment & Growth</option>
                  </select>
                </L>
                <L label={t.legal_status}>
                  <select name="status" defaultValue={a?.status ?? "intake"} className="input">
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s.replace("_", " ")}</option>
                    ))}
                  </select>
                </L>
                <L label={t.legal_pathway}>
                  <select name="pathway" defaultValue={a?.pathway ?? "unassessed"} className="input">
                    {PATHWAYS.map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </L>
                <L label={t.legal_structure}>
                  <select name="structure" defaultValue={a?.structure ?? "undecided"} className="input">
                    {STRUCTURES.map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </L>
                <L label={t.legal_notes}>
                  <input name="notes" defaultValue={a?.notes ?? ""} className="input" />
                </L>
                <div className="sm:col-span-2 lg:col-span-3">
                  <button className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950">{t.legal_save}</button>
                  <span className="ms-3 text-xs text-slate-500">{t.legal_disclaimer}</span>
                </div>
              </form>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="card">
                <h3 className="font-bold">{t.legal_cost}</h3>
                <table className="mt-2 w-full text-sm">
                  <tbody>
                    {cost.lines.map((l) => (
                      <tr key={l.item} className="border-t border-white/5">
                        <td className="py-1.5">{l.item}<span className="block text-[10px] text-slate-500">{l.payer}</span></td>
                        <td className="py-1.5 text-end font-mono">${l.usd.toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-white/20 font-bold">
                      <td className="py-2">Cash total</td>
                      <td className="py-2 text-end font-mono">${cost.total.toLocaleString()}</td>
                    </tr>
                    <tr className="text-xs text-slate-400">
                      <td>In-kind from hotel</td>
                      <td className="text-end font-mono">${cost.inKind.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="card">
                <h3 className="font-bold">{t.legal_candidates}</h3>
                <p className="text-xs text-slate-500">{selHotel ? `Current: ${selHotel.name}` : "No hotel assigned yet"} · ranked by support type, facilities, sector, exhibition proximity</p>
                <ul className="mt-2 space-y-2">
                  {candidates.map(({ hotel: h, score }) => (
                    <li key={h.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
                      <span>
                        <span className="font-medium">{h.name}</span>
                        <span className="block text-[11px] text-slate-500">
                          {h.district} · {h.roomsAvailable} rooms · {h.supportType} · {h.exhibitionMinutes} min to expo · team cost ${teamCost(h).total.toLocaleString()}
                        </span>
                      </span>
                      <span className="font-mono text-amber-300">{score}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      <section className="mt-12 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div>
          <h2 className="text-2xl font-bold">{t.legal_bootcamps}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {camps.length === 0 && <p className="text-sm text-slate-500">—</p>}
            {camps.map((c) => {
              const venue = c.hotelId ? allHotels.find((h) => h.id === c.hotelId) : null;
              return (
                <div key={c.id} className="card">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold">{c.title}</h3>
                    <span className="badge bg-white/10 uppercase text-slate-300">{c.language}</span>
                  </div>
                  <p className="text-sm text-slate-400">{c.firm} · {c.city}{venue ? ` · ${venue.name}` : ""}</p>
                  <p className="mt-1 text-sm text-slate-300">{c.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {c.topics.map((x) => (
                      <span key={x} className="badge bg-amber-400/15 text-amber-300">{x}</span>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                    <span>{c.startDate} · {c.days}d · {c.capacity} {t.legal_seats} · {c.priceUsd ? money(c.priceUsd) : "free"}</span>
                    <form action={deleteBootcamp}>
                      <input type="hidden" name="id" value={c.id} />
                      <button className="text-red-400 hover:underline">✕</button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <form action={createBootcamp} className="card space-y-3 self-start">
          <h3 className="font-bold">{t.legal_new_bootcamp}</h3>
          <L label={t.legal_title_f}><input name="title" required className="input" placeholder={locale === "fa" ? "بوت‌کمپ ثبت شرکت در ترکیه" : "Türkiye Company Setup Bootcamp"} /></L>
          <L label={t.legal_firm}><input name="firm" required className="input" placeholder="Iran–Türkiye Legal Group" /></L>
          <div className="grid grid-cols-2 gap-3">
            <L label={t.legal_city}>
              <select name="city" className="input">{["Istanbul", "Ankara", "İzmir", "Online"].map((c) => <option key={c}>{c}</option>)}</select>
            </L>
            <L label={t.legal_hotel}>
              <select name="hotelId" className="input">
                <option value="">—</option>
                {allHotels.filter((h) => h.meetingRoom).map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </L>
            <L label={t.legal_start}><input name="startDate" type="date" className="input" /></L>
            <L label={t.legal_days}><input name="days" type="number" defaultValue={2} className="input" /></L>
            <L label={t.legal_capacity}><input name="capacity" type="number" defaultValue={10} className="input" /></L>
            <L label={t.legal_lang}>
              <select name="language" className="input"><option value="fa">فارسی</option><option value="tr">Türkçe</option><option value="en">English</option></select>
            </L>
          </div>
          <L label={t.legal_topics}><input name="topics" className="input" placeholder="Company formation, Tech Visa, IP, Founder agreement" /></L>
          <L label={t.legal_price}><input name="priceUsd" type="number" defaultValue={0} className="input" /></L>
          <L label={t.legal_desc_f}><textarea name="description" rows={3} className="input" /></L>
          <button className="w-full rounded-lg bg-amber-400 px-4 py-2 font-semibold text-slate-950">{t.legal_save}</button>
        </form>
      </section>
    </main>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-slate-400">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
