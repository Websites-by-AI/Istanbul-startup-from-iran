import Link from "next/link";
import { getT } from "@/lib/i18n";
import { PageHeader } from "@/lib/ui";
import { LEGAL_RULES, recommendPathway } from "@/lib/legalRules";

export const dynamic = "force-dynamic";

const COPY = {
  en: { eyebrow: "Legal Desk · Türkiye Rulebook", title: "Turkish legal framework for Iran → Türkiye founders", desc: "Verified rules that shape the landing program. Each card states the rule, what it means for a 3-person team, and the primary source. Reviewed by the Desk; not legal advice.", advisor: "Pathway Advisor", advisor_desc: "Answer five questions to see which legal route fits a founder's situation.", days: "Planned days in Türkiye", work: "Will this founder actively work / manage the company in Türkiye?", entity: "Turkish entity already formed?", capital: "Paid-in capital (TL)", tech: "Tech background (software, AI, data, engineering)?", loi: "Corporate sponsor LOI / PoC agreement in hand?", run: "Recommend route", route: "Recommended route", rules: "Rules used", implication: "What it means for the program", source: "Source", verified: "Verified", yes: "Yes", no: "No", back: "← Legal Desk" },
  fa: { eyebrow: "میز حقوقی · قواعد ترکیه", title: "چارچوب حقوقی ترکیه برای مؤسسان ایران ← ترکیه", desc: "قواعد تأییدشده‌ای که برنامه لندینگ را شکل می‌دهند. هر کارت قاعده، معنای آن برای تیم ۳ نفره و منبع اصلی را بیان می‌کند. بازبینی‌شده توسط میز حقوقی؛ مشاوره حقوقی نیست.", advisor: "مشاور مسیر حقوقی", advisor_desc: "به پنج سؤال پاسخ دهید تا ببینید کدام مسیر حقوقی با وضعیت مؤسس می‌خواند.", days: "روزهای برنامه‌ریزی‌شده در ترکیه", work: "آیا این مؤسس فعالانه در ترکیه کار / مدیریت می‌کند؟", entity: "شرکت ترکیه‌ای قبلاً ثبت شده؟", capital: "سرمایه پرداخت‌شده (لیر)", tech: "پیشینه فنی (نرم‌افزار، AI، داده، مهندسی)؟", loi: "LOI اسپانسر شرکتی / قرارداد PoC در دست است؟", run: "پیشنهاد مسیر", route: "مسیر پیشنهادی", rules: "قواعد استفاده‌شده", implication: "معنای آن برای برنامه", source: "منبع", verified: "تأیید", yes: "بله", no: "خیر", back: "← میز حقوقی" },
  tr: { eyebrow: "Hukuk Masası · Türkiye Kural Kitabı", title: "İran → Türkiye kurucuları için Türk hukuki çerçevesi", desc: "Landing programını şekillendiren doğrulanmış kurallar. Her kart kuralı, 3 kişilik ekip için anlamını ve birincil kaynağı belirtir. Masa tarafından incelenmiştir; hukuki tavsiye değildir.", advisor: "Yol Danışmanı", advisor_desc: "Bir kurucunun durumuna hangi hukuki yolun uyduğunu görmek için beş soruyu yanıtlayın.", days: "Türkiye'de planlanan gün", work: "Bu kurucu Türkiye'de fiilen çalışacak / şirketi yönetecek mi?", entity: "Türk şirketi kuruldu mu?", capital: "Ödenmiş sermaye (TL)", tech: "Teknoloji geçmişi (yazılım, AI, veri, mühendislik)?", loi: "Kurumsal sponsor LOI / PoC sözleşmesi var mı?", run: "Yol öner", route: "Önerilen yol", rules: "Kullanılan kurallar", implication: "Program için anlamı", source: "Kaynak", verified: "Doğrulandı", yes: "Evet", no: "Hayır", back: "← Hukuk Masası" },
};

export default async function RulesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { locale } = await getT();
  const c = COPY[locale];
  const sp = await searchParams;
  const ran = sp.run === "1";
  const input = {
    days: Number(sp.days ?? 14) || 14,
    willWork: sp.work === "1",
    hasEntity: sp.entity === "1",
    capitalTl: Number(sp.capital ?? 50000) || 0,
    techFounder: sp.tech !== "0",
    hasCorporateLoi: sp.loi === "1",
  };
  const rec = ran ? recommendPathway(input, locale) : null;

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <Link href="/legal" className="text-sm text-slate-400 hover:text-white">{c.back}</Link>
      <div className="mt-4">
        <PageHeader eyebrow={c.eyebrow} title={c.title} desc={c.desc} />
      </div>

      <section className="card mb-10 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <form className="space-y-3">
          <input type="hidden" name="run" value="1" />
          <h2 className="text-xl font-bold">{c.advisor}</h2>
          <p className="text-sm text-slate-400">{c.advisor_desc}</p>
          <label className="block text-sm"><span className="text-slate-400">{c.days}</span><input name="days" type="number" defaultValue={input.days} className="input mt-1" /></label>
          <YN name="work" label={c.work} value={input.willWork} yes={c.yes} no={c.no} />
          <YN name="entity" label={c.entity} value={input.hasEntity} yes={c.yes} no={c.no} />
          <label className="block text-sm"><span className="text-slate-400">{c.capital}</span><input name="capital" type="number" defaultValue={input.capitalTl} className="input mt-1" /></label>
          <YN name="tech" label={c.tech} value={input.techFounder} yes={c.yes} no={c.no} />
          <YN name="loi" label={c.loi} value={input.hasCorporateLoi} yes={c.yes} no={c.no} />
          <button className="rounded-lg bg-amber-400 px-4 py-2 font-semibold text-slate-950">{c.run}</button>
        </form>
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
          {rec ? (
            <>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">{c.route}</p>
              <h3 className="mt-1 text-lg font-bold text-amber-300">{rec.route}</h3>
              <ol className="mt-3 list-decimal space-y-2 ps-5 text-sm text-slate-200">
                {rec.steps.map((s) => <li key={s}>{s}</li>)}
              </ol>
              <p className="mt-4 text-[11px] uppercase tracking-wide text-slate-500">{c.rules}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {rec.rulesUsed.map((k) => (
                  <a key={k} href={`#${k}`} className="badge bg-white/10 text-slate-200 hover:bg-white/20">{LEGAL_RULES.find((r) => r.key === k)?.title[locale]}</a>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">—</p>
          )}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {LEGAL_RULES.map((r) => (
          <article key={r.key} id={r.key} className="card scroll-mt-24">
            <h3 className="text-lg font-bold">{r.title[locale]}</h3>
            <p className="mt-2 text-sm text-slate-300">{r.summary[locale]}</p>
            <div className="mt-3 rounded-lg bg-amber-400/10 p-3 text-sm">
              <p className="text-[11px] uppercase tracking-wide text-amber-300">{c.implication}</p>
              <p className="mt-1 text-slate-200">{r.implication[locale]}</p>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {c.source}: <a href={r.source.url} target="_blank" rel="noreferrer" className="text-sky-300 hover:underline" dir="ltr">{r.source.label}</a> · {c.verified} {r.verified}
            </p>
          </article>
        ))}
      </div>
    </main>
  );
}

function YN({ name, label, value, yes, no }: { name: string; label: string; value: boolean; yes: string; no: string }) {
  return (
    <div className="text-sm">
      <span className="text-slate-400">{label}</span>
      <div className="mt-1 flex gap-4">
        <label className="flex items-center gap-1.5"><input type="radio" name={name} value="1" defaultChecked={value} className="accent-amber-400" /> {yes}</label>
        <label className="flex items-center gap-1.5"><input type="radio" name={name} value="0" defaultChecked={!value} className="accent-amber-400" /> {no}</label>
      </div>
    </div>
  );
}
