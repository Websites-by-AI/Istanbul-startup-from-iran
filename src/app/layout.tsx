import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { getT, LOCALES } from "@/lib/i18n";
import LangSwitcher from "./LangSwitcher";
import { Vazirmatn } from "next/font/google";
import "./globals.css";

const vazir = Vazirmatn({ subsets: ["arabic", "latin"], variable: "--font-vazir", display: "swap" });

export const metadata: Metadata = {
  title: "Startup Landing Türkiye — From Exhibition to Ecosystem",
  description:
    "Cross-border startup landing infrastructure: hotels × corporates × startups × investors × legal × AI. Iran → Türkiye.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { locale, t, dir } = await getT();
  const nav = [
    { href: "/hotels", label: t.nav_hotels },
    { href: "/corporates", label: t.nav_corporates },
    { href: "/startups", label: t.nav_startups },
    { href: "/program", label: t.nav_program },
    { href: "/investors", label: t.nav_investors },
    { href: "/navigator", label: t.nav_navigator },
    { href: "/legal", label: t.nav_legal },
    { href: "/sponsorship", label: t.nav_sponsorship },
    { href: "/telegram", label: t.nav_telegram },
    { href: "/pitch", label: t.nav_pitch },
  ];

  return (
    <html lang={locale} dir={dir}>
      <body className={`${vazir.variable} min-h-screen bg-slate-950 text-slate-100 antialiased ${locale === "fa" ? "font-fa" : ""}`}>
        <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-red-500 to-amber-400 text-sm font-black text-white">
                TR
              </span>
              <span className="hidden sm:inline">
                {t.brand} <span className="text-amber-400">Türkiye</span>
              </span>
            </Link>
            <nav className="flex flex-wrap items-center gap-1 text-sm">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className="rounded-md px-2.5 py-1.5 text-slate-300 transition hover:bg-white/10 hover:text-white">
                  {n.label}
                </Link>
              ))}
              <Link href="/apply" className="mx-1 rounded-md bg-amber-400 px-3 py-1.5 font-semibold text-slate-950 transition hover:bg-amber-300">
                {t.nav_apply}
              </Link>
              <LangSwitcher current={locale} locales={LOCALES.map((l) => ({ code: l.code, label: l.label }))} />
            </nav>
          </div>
        </header>
        {children}
        <footer className="mt-20 border-t border-white/10 py-10 text-center text-sm text-slate-500">
          <p className="font-medium text-slate-400">{t.footer_1}</p>
          <p className="mt-1">{t.footer_2}</p>
          <p className="mx-auto mt-3 max-w-2xl px-4 text-xs">{t.footer_disclaimer}</p>
        </footer>
      </body>
    </html>
  );
}
