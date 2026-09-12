import Link from "next/link";
import { db } from "@/db";
import { supportRequests, pledges, startups } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { desc } from "drizzle-orm";
import { getT } from "@/lib/i18n";
import { PageHeader } from "@/lib/ui";
import { needLabel, sponsorLabel } from "@/lib/channel";
import { createRequest, createPledge } from "./actions";

export const dynamic = "force-dynamic";

const NEEDS = ["accommodation", "travel", "legal", "documents", "poc", "office", "mentoring", "media", "investment"];
const SPONSORS = ["hotel", "corporate", "foreign", "legal", "ecosystem"];

const COPY = {
  fa: { eyebrow: "ماژول ۹ · درخواست حمایت و اسپانسری", title: "همراهی تیم‌های ایرانی در ورود به ترکیه", desc: "تیم ایرانی می‌گوید دقیقاً چه حمایتی می‌خواهد (اقامت، مدارک، حقوقی، PoC، همراهی/منتورینگ…). هتل‌ها، شرکت‌های ترکیه‌ای و شرکای خارجی بخشی از آن را تعهد می‌کنند. هر درخواست و هر اسپانسری به‌صورت خودکار پست کانال می‌سازد.", new: "ثبت درخواست تیم", team: "نام تیم", link: "اتصال به پروفایل استارتاپ", contact: "تماس (تلگرام/ایمیل)", companions: "تعداد همراهان", from: "از تاریخ", days: "روز", city: "شهر", budget: "بودجه موردنیاز (دلار)", needs: "نیازها", msg: "توضیح", submit: "ثبت درخواست", open: "درخواست‌های باز", pledge: "اسپانسر می‌شوم", sponsorType: "نوع اسپانسر", sponsorName: "نام اسپانسر", country: "کشور", covers: "چه چیزی را پوشش می‌دهید", amount: "مبلغ (دلار)", inkind: "غیرنقدی (مثلاً ۲ اتاق × ۱۴ شب)", note: "یادداشت", send: "ثبت تعهد", sponsors: "اسپانسرها", none: "هنوز اسپانسری ندارد", status: { open: "باز", partially: "بخشی پوشش داده شده", matched: "کامل شد", closed: "بسته" }, tg: "یا از تلگرام: /need accommodation legal poc", channel: "← مشاهده پست‌های کانال" },
  tr: { eyebrow: "Modül 9 · Destek Talebi ve Sponsorluk", title: "İranlı ekiplerin Türkiye'ye girişinde eşlik", desc: "İranlı ekip tam olarak hangi desteği istediğini söyler (konaklama, belgeler, hukuki, PoC, mentorluk…). Oteller, Türk şirketleri ve yabancı ortaklar bir kısmını taahhüt eder. Her talep ve sponsorluk otomatik kanal gönderisi oluşturur.", new: "Ekip talebi oluştur", team: "Ekip adı", link: "Startup profiline bağla", contact: "İletişim (Telegram/e-posta)", companions: "Kişi sayısı", from: "Başlangıç", days: "Gün", city: "Şehir", budget: "Gerekli bütçe (USD)", needs: "İhtiyaçlar", msg: "Açıklama", submit: "Talep oluştur", open: "Açık talepler", pledge: "Sponsor ol", sponsorType: "Sponsor türü", sponsorName: "Sponsor adı", country: "Ülke", covers: "Neyi karşılıyorsunuz", amount: "Tutar (USD)", inkind: "Ayni (ör. 2 oda × 14 gece)", note: "Not", send: "Taahhüt gönder", sponsors: "Sponsorlar", none: "Henüz sponsor yok", status: { open: "açık", partially: "kısmen karşılandı", matched: "tamamlandı", closed: "kapalı" }, tg: "veya Telegram'dan: /need accommodation legal poc", channel: "Kanal gönderilerini gör →" },
  en: { eyebrow: "Module 9 · Support Requests & Sponsorship", title: "Accompanying Iranian teams into Türkiye", desc: "An Iranian team states exactly what support it needs (accommodation, documents, legal, PoC, mentoring…). Hotels, Turkish corporates and foreign partners pledge parts of it. Every request and pledge auto-generates a channel post.", new: "File a team request", team: "Team name", link: "Link to startup profile", contact: "Contact (Telegram/email)", companions: "Companions", from: "From date", days: "Days", city: "City", budget: "Budget needed (USD)", needs: "Needs", msg: "Message", submit: "File request", open: "Open requests", pledge: "Sponsor this team", sponsorType: "Sponsor type", sponsorName: "Sponsor name", country: "Country", covers: "What you cover", amount: "Amount (USD)", inkind: "In-kind (e.g. 2 rooms × 14 nights)", note: "Note", send: "Submit pledge", sponsors: "Sponsors", none: "No sponsors yet", status: { open: "open", partially: "partially covered", matched: "fully matched", closed: "closed" }, tg: "or via Telegram: /need accommodation legal poc", channel: "View channel posts →" },
};

export default async function SponsorshipPage() {
  await ensureSeeded();
  const { locale } = await getT();
  const c = COPY[locale];
  const [reqs, allPledges, teams] = await Promise.all([
    db.select().from(supportRequests).orderBy(desc(supportRequests.id)),
    db.select().from(pledges),
    db.select({ id: startups.id, name: startups.name }).from(startups).orderBy(startups.name),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <PageHeader eyebrow={c.eyebrow} title={c.title} desc={c.desc} />
      <div className="mb-6 flex flex-wrap gap-3 text-sm">
        <Link href="/channel" className="rounded-lg border border-white/20 px-3 py-1.5 hover:bg-white/10">{c.channel}</Link>
        <Link href="/telegram" className="rounded-lg border border-white/20 px-3 py-1.5 hover:bg-white/10">Telegram bot</Link>
        <span className="self-center text-slate-500">{c.tg}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <form action={createRequest} className="card space-y-3 self-start">
          <input type="hidden" name="lang" value={locale} />
          <h2 className="font-bold">{c.new}</h2>
          <L l={c.team}><input name="teamName" required className="input" /></L>
          <L l={c.link}>
            <select name="startupId" className="input"><option value="">—</option>{teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          </L>
          <L l={c.contact}><input name="contact" className="input" placeholder="@telegram" dir="ltr" /></L>
          <div className="grid grid-cols-2 gap-3">
            <L l={c.companions}><input name="companions" type="number" defaultValue={3} className="input" /></L>
            <L l={c.days}><input name="days" type="number" defaultValue={14} className="input" /></L>
            <L l={c.from}><input name="fromDate" type="date" className="input" /></L>
            <L l={c.city}><select name="city" className="input">{["Istanbul", "Ankara", "İzmir"].map((x) => <option key={x}>{x}</option>)}</select></L>
          </div>
          <L l={c.budget}><input name="budgetUsd" type="number" className="input" placeholder="5100" /></L>
          <fieldset>
            <legend className="text-xs text-slate-400">{c.needs}</legend>
            <div className="mt-1 grid grid-cols-2 gap-1 text-sm">
              {NEEDS.map((n) => (
                <label key={n} className="flex items-center gap-2"><input type="checkbox" name={`need_${n}`} className="accent-amber-400" defaultChecked={["accommodation", "legal", "poc"].includes(n)} /> {needLabel(n, locale)}</label>
              ))}
            </div>
          </fieldset>
          <L l={c.msg}><textarea name="message" rows={3} className="input" /></L>
          <button className="w-full rounded-lg bg-amber-400 px-4 py-2 font-semibold text-slate-950">{c.submit}</button>
        </form>

        <section>
          <h2 className="mb-3 font-bold">{c.open} ({reqs.length})</h2>
          <div className="space-y-4">
            {reqs.length === 0 && <p className="text-sm text-slate-500">—</p>}
            {reqs.map((r) => {
              const ps = allPledges.filter((p) => p.requestId === r.id);
              const covered = new Set(ps.flatMap((p) => p.covers));
              return (
                <div key={r.id} className="card">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-bold">#{r.id} · {r.teamName}</h3>
                      <p className="text-xs text-slate-400">👥 {r.companions} · 📍 {r.city} · 🗓 {r.days}d{r.fromDate ? ` · ${r.fromDate}` : ""}{r.budgetUsd ? ` · $${r.budgetUsd}` : ""} · {r.source}</p>
                    </div>
                    <span className={`badge ${r.status === "matched" ? "bg-emerald-500/20 text-emerald-300" : r.status === "partially" ? "bg-sky-500/20 text-sky-300" : "bg-amber-500/20 text-amber-300"}`}>{c.status[r.status as keyof typeof c.status] ?? r.status}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {r.needs.map((n) => (
                      <span key={n} className={`badge ${covered.has(n) ? "bg-emerald-500/20 text-emerald-300 line-through" : "bg-white/10 text-slate-200"}`}>{needLabel(n, locale)}</span>
                    ))}
                  </div>
                  {r.message && <p className="mt-2 text-sm text-slate-300">{r.message}</p>}
                  <div className="mt-3 border-t border-white/10 pt-2 text-sm">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">{c.sponsors}</p>
                    {ps.length === 0 && <p className="text-slate-500">{c.none}</p>}
                    {ps.map((p) => (
                      <p key={p.id} className="mt-1">💛 <b>{p.sponsorName}</b> <span className="text-slate-400">({sponsorLabel(p.sponsorType, locale)}, {p.country})</span> → {p.covers.map((x) => needLabel(x, locale)).join(", ")}{p.amountUsd ? ` · $${p.amountUsd}` : ""}{p.inKind ? ` · ${p.inKind}` : ""}</p>
                    ))}
                  </div>
                  {r.status !== "matched" && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-semibold text-amber-300">{c.pledge}</summary>
                      <form action={createPledge} className="mt-3 grid gap-3 sm:grid-cols-2">
                        <input type="hidden" name="requestId" value={r.id} />
                        <input type="hidden" name="lang" value={locale} />
                        <L l={c.sponsorType}><select name="sponsorType" className="input">{SPONSORS.map((s) => <option key={s} value={s}>{sponsorLabel(s, locale)}</option>)}</select></L>
                        <L l={c.sponsorName}><input name="sponsorName" required className="input" /></L>
                        <L l={c.country}><input name="country" defaultValue="Türkiye" className="input" /></L>
                        <L l={c.contact}><input name="contact" className="input" dir="ltr" /></L>
                        <fieldset className="sm:col-span-2">
                          <legend className="text-xs text-slate-400">{c.covers}</legend>
                          <div className="mt-1 flex flex-wrap gap-3 text-sm">
                            {r.needs.filter((n) => !covered.has(n)).map((n) => (
                              <label key={n} className="flex items-center gap-1.5"><input type="checkbox" name={`cover_${n}`} className="accent-amber-400" /> {needLabel(n, locale)}</label>
                            ))}
                          </div>
                        </fieldset>
                        <L l={c.amount}><input name="amountUsd" type="number" className="input" /></L>
                        <L l={c.inkind}><input name="inKind" className="input" /></L>
                        <L l={c.note}><input name="note" className="input" /></L>
                        <div className="sm:col-span-2"><button className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950">{c.send}</button></div>
                      </form>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

function L({ l, children }: { l: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs text-slate-400">{l}</span><div className="mt-1">{children}</div></label>;
}
