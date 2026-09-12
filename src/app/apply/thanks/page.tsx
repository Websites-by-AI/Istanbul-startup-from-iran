import Link from "next/link";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function ThanksPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  const recent = await db.select().from(applications).orderBy(desc(applications.id)).limit(8);
  const next: Record<string, { text: string; href: string; cta: string }> = {
    startup: { text: "Your team is now in the Startup Pool. Corporates and the Business-Match AI can see your profile.", href: "/startups", cta: "View the pool" },
    hotel: { text: "Your hotel is now on the Startup Hotel Map as a pending partner.", href: "/hotels", cta: "Open the map" },
    corporate: { text: "We'll send a shortlist of 3 matching teams within 5 business days.", href: "/navigator?agent=match", cta: "Try Business Match AI" },
    investor: { text: "Welcome to the Investor Room. Expect corporate-validated deal flow.", href: "/investors", cta: "Investor Room" },
    legal: { text: "Thanks — we'll onboard you as a Market Entry Partner.", href: "/program", cta: "Landing Program" },
    media: { text: "Thanks — we'll share the demo-day calendar.", href: "/program", cta: "Landing Program" },
  };
  const n = next[kind ?? ""] ?? next.startup;

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="card text-center">
        <div className="text-5xl">🎉</div>
        <h1 className="mt-4 text-3xl font-black">Application received</h1>
        <p className="mt-2 text-slate-300">{n.text}</p>
        <Link href={n.href} className="mt-6 inline-block rounded-lg bg-amber-400 px-5 py-3 font-semibold text-slate-950">
          {n.cta} →
        </Link>
      </div>
      <div className="card mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Recent applications (pilot dashboard)</h2>
        <ul className="mt-3 divide-y divide-white/5 text-sm">
          {recent.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2">
              <span>
                <span className="badge me-2 bg-white/10 capitalize text-slate-300">{a.kind}</span>
                {a.organization} <span className="text-slate-500">· {a.contactName}</span>
              </span>
              <span className="text-xs text-slate-500">{a.createdAt.toISOString().slice(0, 10)}</span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
