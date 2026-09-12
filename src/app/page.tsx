import Link from "next/link";
import { db } from "@/db";
import { hotels, corporates, startups, investors } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { sql, eq } from "drizzle-orm";
import { getT } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await ensureSeeded();
  const { t } = await getT();
  const [[h], [c], [s], [i], [rooms], [poc]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(hotels),
    db.select({ n: sql<number>`count(*)::int` }).from(corporates),
    db.select({ n: sql<number>`count(*)::int` }).from(startups),
    db.select({ n: sql<number>`count(*)::int` }).from(investors),
    db.select({ n: sql<number>`coalesce(sum(rooms_available),0)::int` }).from(hotels),
    db.select({ n: sql<number>`count(*)::int` }).from(startups).where(sql`status in ('poc','funded')`),
  ]);
  const sponsoredBudget = await db
    .select({ n: sql<number>`coalesce(sum(budget_usd),0)::int` })
    .from(corporates)
    .then((r) => r[0].n);
  const funded = await db.select({ n: sql<number>`count(*)::int` }).from(startups).where(eq(startups.status, "funded"));

  const stats = [
    { label: t.stat_hotels, value: h.n, href: "/hotels" },
    { label: t.stat_rooms, value: rooms.n, href: "/hotels" },
    { label: t.stat_corporates, value: c.n, href: "/corporates" },
    { label: t.stat_budget, value: `$${Math.round(sponsoredBudget / 1000)}K`, href: "/corporates" },
    { label: t.stat_startups, value: s.n, href: "/startups" },
    { label: t.stat_poc, value: `${poc.n} / ${funded[0].n}`, href: "/program" },
    { label: t.stat_investors, value: i.n, href: "/investors" },
  ];

  const funnel = [
    ["1000", "Startups reached"],
    ["100", "Selected"],
    ["30", "Teams landed"],
    ["10", "Corporate matches"],
    ["5", "PoCs"],
    ["2", "Investments"],
  ];

  const modules = [
    { href: "/hotels", title: "Startup Hotel Map", desc: "Istanbul / Ankara / İzmir hotels turning unsold rooms into landing infrastructure.", icon: "🏨" },
    { href: "/corporates", title: "Corporate Sponsors", desc: "Turkish companies sponsoring 3-person teams in exchange for innovation deal flow.", icon: "🏭" },
    { href: "/startups", title: "Startup Marketplace", desc: "Verified Iranian startup pool — Founder / Technical / Business.", icon: "🚀" },
    { href: "/program", title: "Landing Program", desc: "Visa, legal, company setup, housing — tracked step by step.", icon: "🛬" },
    { href: "/investors", title: "Investor Room", desc: "VCs, angels, corporate investors and accelerators.", icon: "💼" },
    { href: "/navigator", title: "AI Navigator", desc: "Legal, Investor, Market, Media and Business-Match agents for every team.", icon: "🤖" },
    { href: "/legal", title: t.legal_title, desc: t.legal_desc, icon: "⚖️" },
  ];

  return (
    <main>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.18),transparent_60%),radial-gradient(ellipse_at_bottom_left,rgba(239,68,68,0.15),transparent_55%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
          <p className="badge bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/30">
            {t.hero_badge}
          </p>
          <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
            {t.hero_title_1}{" "}
            <span className="bg-gradient-to-r from-amber-300 to-red-400 bg-clip-text text-transparent">{t.hero_title_2}</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-300">
            {t.hero_desc}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/apply?kind=startup" className="rounded-lg bg-amber-400 px-5 py-3 font-semibold text-slate-950 hover:bg-amber-300">
              {t.cta_startup}
            </Link>
            <Link href="/apply?kind=hotel" className="rounded-lg border border-white/20 px-5 py-3 font-semibold hover:bg-white/10">
              {t.cta_hotel}
            </Link>
            <Link href="/apply?kind=corporate" className="rounded-lg border border-white/20 px-5 py-3 font-semibold hover:bg-white/10">
              {t.cta_corporate}
            </Link>
            <Link href="/legal" className="rounded-lg border border-white/20 px-5 py-3 font-semibold hover:bg-white/10">
              {t.cta_legal}
            </Link>
          </div>
          <p className="mt-10 font-mono text-sm text-slate-500">
            Startup = supply · Turkish companies = demand · Hotels = infrastructure · Investors = capital · Platform = coordination
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          {stats.map((s) => (
            <Link key={s.label} href={s.href} className="card transition hover:border-amber-400/40">
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="mt-1 text-xs text-slate-400">{s.label}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <h2 className="text-2xl font-bold">{t.modules}</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <Link key={m.href} href={m.href} className="card group transition hover:border-amber-400/40 hover:bg-white/10">
              <div className="text-3xl">{m.icon}</div>
              <h3 className="mt-3 text-lg font-semibold group-hover:text-amber-300">{m.title}</h3>
              <p className="mt-1 text-sm text-slate-400">{m.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <div className="card">
          <h2 className="text-2xl font-bold">{t.funnel}</h2>
          <p className="mt-1 text-sm text-slate-400">{t.funnel_sub}</p>
          <div className="mt-6 flex flex-col gap-2 md:flex-row md:items-stretch">
            {funnel.map(([n, l], idx) => (
              <div key={l} className="flex flex-1 items-center gap-2">
                <div
                  className="flex-1 rounded-xl border border-white/10 p-4 text-center"
                  style={{ background: `rgba(251,191,36,${0.06 + idx * 0.05})` }}
                >
                  <p className="text-2xl font-black">{n}</p>
                  <p className="text-xs text-slate-300">{l}</p>
                </div>
                {idx < funnel.length - 1 && <span className="hidden text-slate-600 md:block rtl:rotate-180">→</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-20 grid max-w-7xl gap-4 px-4 sm:px-6 md:grid-cols-3">
        {[
          { t: "Hospitality Sponsor", d: "Hotels, hostels, residences contribute rooms, breakfast, meeting rooms, transfers.", tag: "Room-night inventory" },
          { t: "Corporate Sponsor", d: "Turkish companies fund travel, housing, PoC and office in return for qualified deal flow.", tag: "Innovation access" },
          { t: "Ecosystem Sponsor", d: "Accelerators, technoparks, universities, VCs, chambers provide mentoring and market access.", tag: "Network" },
        ].map((x) => (
          <div key={x.t} className="card">
            <span className="badge bg-white/10 text-slate-300">{x.tag}</span>
            <h3 className="mt-3 text-lg font-semibold">{x.t}</h3>
            <p className="mt-1 text-sm text-slate-400">{x.d}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto mt-20 max-w-7xl px-4 text-center sm:px-6">
        <h2 className="text-3xl font-black sm:text-4xl">{t.big_idea}</h2>
        <p className="mx-auto mt-3 max-w-xl text-slate-400">
          {t.big_idea_sub}
        </p>
        <Link href="/pitch" className="mt-6 inline-block rounded-lg bg-white px-5 py-3 font-semibold text-slate-950 hover:bg-slate-200">
          {t.view_pitch}
        </Link>
      </section>
    </main>
  );
}
