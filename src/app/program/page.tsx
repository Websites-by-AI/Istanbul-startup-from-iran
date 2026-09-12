import Link from "next/link";
import { db } from "@/db";
import { startups } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { getT } from "@/lib/i18n";
import { PageHeader, LANDING_STEPS, statusColor } from "@/lib/ui";

export const dynamic = "force-dynamic";

const costModel = [
  ["Flights Tehran → Istanbul (3 pax, return)", 900, "Corporate sponsor"],
  ["Hotel: 2 rooms × 14 nights", 2800, "Hotel partner (in-kind)"],
  ["Breakfast & local transport", 600, "Hotel partner / corporate"],
  ["Coworking & meeting rooms", 500, "Hotel / ecosystem partner"],
  ["Legal Team 1 — entry & company setup", 2500, "Legal partner package"],
  ["Market & investor prep (AI Navigator + mentors)", 800, "Platform"],
  ["Media & demo day", 600, "Media partner"],
];

export default async function ProgramPage() {
  await ensureSeeded();
  const { t } = await getT();
  const rows = await db.select().from(startups);
  const total = costModel.reduce((a, [, v]) => a + (v as number), 0);
  const inKind = 2800 + 600 + 500;

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <PageHeader
        eyebrow={t.p_program_eyebrow}
        title={t.p_program_title}
        desc={t.p_program_desc}
      />

      <section className="card overflow-x-auto">
        <h2 className="font-bold">{t.p_program_pipeline}</h2>
        <div dir="ltr" className="mt-4 flex min-w-[1100px] gap-2">
          {LANDING_STEPS.map((step, idx) => {
            const inStep = rows.filter((r) => r.landingStep === idx);
            return (
              <div key={step} className="flex-1 rounded-xl border border-white/10 bg-white/5 p-2">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Step {idx + 1}</p>
                <p className="text-xs font-semibold">{step}</p>
                <div className="mt-2 space-y-1.5">
                  {inStep.map((r) => (
                    <Link key={r.id} href={`/startups/${r.id}`} className="block rounded-md bg-slate-900 p-1.5 text-[11px] hover:bg-slate-800">
                      <p className="truncate font-medium">{r.name}</p>
                      <span className={`badge mt-0.5 !px-1.5 !py-0 !text-[9px] capitalize ${statusColor(r.status)}`}>{r.status}</span>
                    </Link>
                  ))}
                  {inStep.length === 0 && <p className="text-[10px] text-slate-600">—</p>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="font-bold">{t.p_program_cost}</h2>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {costModel.map(([item, v, who]) => (
                <tr key={item as string} className="border-t border-white/5">
                  <td className="py-2 pe-2">{item}</td>
                  <td className="py-2 text-end font-mono">${(v as number).toLocaleString()}</td>
                  <td className="py-2 ps-3 text-xs text-slate-500">{who}</td>
                </tr>
              ))}
              <tr className="border-t border-white/20 font-bold">
                <td className="py-2">Total per team</td>
                <td className="py-2 text-end font-mono">${total.toLocaleString()}</td>
                <td className="py-2 ps-3 text-xs font-normal text-slate-500">≈ ${inKind.toLocaleString()} covered in-kind by hotels</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 text-xs text-slate-500">
            Istanbul pilot: 10 teams × ${total.toLocaleString()} ≈ ${(total * 10).toLocaleString()}, of which ~{Math.round((inKind / total) * 100)}% is unsold hotel inventory rather than cash.
          </p>
        </div>

        <div className="space-y-4">
          <div className="card">
            <span className="badge bg-sky-400/20 text-sky-300">Legal Team 1</span>
            <h3 className="mt-2 font-bold">Entry &amp; Settlement</h3>
            <p className="mt-1 text-sm text-slate-400">Visa pathways · residence · company formation · tax · contracts · employment · IP · founder agreement.</p>
          </div>
          <div className="card">
            <span className="badge bg-emerald-400/20 text-emerald-300">Legal / Investment Team 2</span>
            <h3 className="mt-2 font-bold">Investment &amp; Growth</h3>
            <p className="mt-1 text-sm text-slate-400">Investor readiness · term sheet · SAFE / convertible · SHA · due diligence · corporate partnership · M&amp;A.</p>
          </div>
          <div className="card border-red-400/30">
            <h3 className="font-bold text-red-300">Important principle</h3>
            <p className="mt-1 text-sm text-slate-300">
              We offer <b>Legal &amp; Immigration Support</b>, never a &quot;Kimlik Guarantee&quot;. Company registration does not automatically grant residence, work authorization or citizenship. Structure (Turkish subsidiary / sister company / operating company) is decided case-by-case with lawyers and accountants.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {[
          ["Model A — Turkish Subsidiary", "Turkish entity owned by the original structure."],
          ["Model B — Sister Company", "Independent company with contractual / ownership relationship."],
          ["Model C — Turkish Operating Company", "New company created specifically for Türkiye operations."],
        ].map(([t, d]) => (
          <div key={t} className="card">
            <h3 className="font-semibold">{t}</h3>
            <p className="mt-1 text-sm text-slate-400">{d}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
