import { db } from "@/db";
import { startups } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { PageHeader } from "@/lib/ui";
import { agentsFor, isAgent } from "@/lib/navigator";
import { getT } from "@/lib/i18n";
import NavigatorClient from "./NavigatorClient";

export const dynamic = "force-dynamic";

const COPY = {
  en: { eyebrow: "Module 7 · AI Startup Navigator", title: "AI Startup Navigator", desc: "Not a chatbot — six specialised agents plus a scheduler that coordinate the information layer between lawyers, corporates, investors and media. Every answer is grounded in the team's live profile and answers in your language.", team: "Team", none: "— No team (generic) —", ask: "Ask", send: "Send", thinking: "is thinking…", start: "Ask something, or start with a suggestion:", error: "Network error. Please try again." },
  fa: { eyebrow: "ماژول ۷ · دستیار هوشمند استارتاپ", title: "دستیار هوشمند استارتاپ", desc: "یک چت‌بات ساده نیست — شش عامل تخصصی به‌علاوه برنامه‌ریز که لایه اطلاعات را بین وکلا، شرکت‌ها، سرمایه‌گذاران و رسانه هماهنگ می‌کنند. هر پاسخ بر اساس پروفایل زنده تیم و به زبان شماست.", team: "تیم", none: "— بدون تیم (عمومی) —", ask: "بپرسید از", send: "ارسال", thinking: "در حال فکر کردن…", start: "سؤالی بپرسید یا با یک پیشنهاد شروع کنید:", error: "خطای شبکه. دوباره تلاش کنید." },
  tr: { eyebrow: "Modül 7 · AI Startup Navigatör", title: "AI Startup Navigatör", desc: "Bir chatbot değil — avukatlar, kurumsallar, yatırımcılar ve medya arasındaki bilgi katmanını koordine eden altı uzman ajan ve bir planlayıcı. Her yanıt ekibin canlı profiline dayanır ve sizin dilinizdedir.", team: "Ekip", none: "— Ekip yok (genel) —", ask: "Sor:", send: "Gönder", thinking: "düşünüyor…", start: "Bir şey sorun veya bir öneriyle başlayın:", error: "Ağ hatası. Lütfen tekrar deneyin." },
};

export default async function NavigatorPage({ searchParams }: { searchParams: Promise<{ startup?: string; agent?: string }> }) {
  await ensureSeeded();
  const { locale } = await getT();
  const { startup, agent } = await searchParams;
  const list = await db.select({ id: startups.id, name: startups.name, sector: startups.sector }).from(startups).orderBy(startups.name);
  const c = COPY[locale];
  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <PageHeader eyebrow={c.eyebrow} title={c.title} desc={c.desc} />
      <NavigatorClient
        startups={list}
        agents={agentsFor(locale)}
        lang={locale}
        copy={c}
        initialStartup={startup ? Number(startup) : list[0]?.id ?? null}
        initialAgent={isAgent(agent) ? agent : "schedule"}
      />
    </main>
  );
}
