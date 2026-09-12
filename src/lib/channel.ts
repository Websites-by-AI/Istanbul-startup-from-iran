import { db } from "@/db";
import { channelPosts, supportRequests, pledges, startups, bootcamps } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { Lang } from "@/lib/navigator";

const NEED_LABEL: Record<string, Record<Lang, string>> = {
  accommodation: { fa: "اقامت", tr: "konaklama", en: "accommodation" },
  travel: { fa: "سفر/بلیت", tr: "seyahat", en: "travel" },
  legal: { fa: "حقوقی", tr: "hukuki", en: "legal" },
  documents: { fa: "مدارک/ترجمه", tr: "belgeler", en: "documents" },
  poc: { fa: "PoC شرکتی", tr: "kurumsal PoC", en: "corporate PoC" },
  office: { fa: "دفتر/کوورکینگ", tr: "ofis", en: "office" },
  mentoring: { fa: "منتورینگ/همراهی", tr: "mentorluk", en: "mentoring" },
  media: { fa: "رسانه", tr: "medya", en: "media" },
  investment: { fa: "سرمایه", tr: "yatırım", en: "investment" },
};
export const needLabel = (n: string, lang: Lang) => NEED_LABEL[n]?.[lang] ?? n;

const SPONSOR_LABEL: Record<string, Record<Lang, string>> = {
  hotel: { fa: "هتل", tr: "otel", en: "hotel" },
  corporate: { fa: "شرکت ترکیه‌ای", tr: "Türk şirketi", en: "Turkish corporate" },
  foreign: { fa: "شرکت خارجی", tr: "yabancı şirket", en: "foreign company" },
  legal: { fa: "دفتر حقوقی", tr: "hukuk bürosu", en: "legal firm" },
  ecosystem: { fa: "شریک اکوسیستم", tr: "ekosistem ortağı", en: "ecosystem partner" },
};
export const sponsorLabel = (s: string, lang: Lang) => SPONSOR_LABEL[s]?.[lang] ?? s;

const TAGS = "#StartupLandingTürkiye #IranTurkiyeBridge";

export async function buildPost(kind: string, refId: number, lang: Lang): Promise<{ title: string; body: string } | null> {
  if (kind === "request") {
    const [r] = await db.select().from(supportRequests).where(eq(supportRequests.id, refId));
    if (!r) return null;
    const s = r.startupId ? (await db.select().from(startups).where(eq(startups.id, r.startupId)))[0] : null;
    const needs = r.needs.map((n) => needLabel(n, lang)).join(" · ");
    const title = { fa: `🙋 درخواست حمایت #${r.id} — ${r.teamName}`, tr: `🙋 Destek talebi #${r.id} — ${r.teamName}`, en: `🙋 Support request #${r.id} — ${r.teamName}` }[lang];
    const body = {
      fa: `🚀 ${r.teamName}${s ? ` — ${s.tagline} (${s.sector})` : ""}\n👥 ${r.companions} نفر · 📍 ${r.city} · 🗓 ${r.days} روز${r.fromDate ? ` از ${r.fromDate}` : ""}\n🎯 نیازها: ${needs}${r.budgetUsd ? `\n💵 بودجه موردنیاز: $${r.budgetUsd}` : ""}${r.message ? `\n📝 ${r.message}` : ""}\n\n🤝 هتل‌ها، شرکت‌های ترکیه‌ای و شرکای خارجی: برای اسپانسری این تیم به /sponsorship مراجعه کنید.\n⚖️ پشتیبانی حقوقی و مهاجرتی از طریق شرکای معتبر — بدون تضمین اقامت/کیملیک.\n${TAGS}`,
      tr: `🚀 ${r.teamName}${s ? ` — ${s.tagline} (${s.sector})` : ""}\n👥 ${r.companions} kişi · 📍 ${r.city} · 🗓 ${r.days} gün${r.fromDate ? ` (${r.fromDate})` : ""}\n🎯 İhtiyaçlar: ${needs}${r.budgetUsd ? `\n💵 Gerekli bütçe: $${r.budgetUsd}` : ""}${r.message ? `\n📝 ${r.message}` : ""}\n\n🤝 Oteller, Türk şirketleri ve yabancı ortaklar: bu ekibe sponsor olmak için /sponsorship.\n⚖️ Hukuki ve göç desteği doğrulanmış ortaklar aracılığıyla — ikamet/kimlik garantisi yok.\n${TAGS}`,
      en: `🚀 ${r.teamName}${s ? ` — ${s.tagline} (${s.sector})` : ""}\n👥 ${r.companions} people · 📍 ${r.city} · 🗓 ${r.days} days${r.fromDate ? ` from ${r.fromDate}` : ""}\n🎯 Needs: ${needs}${r.budgetUsd ? `\n💵 Budget needed: $${r.budgetUsd}` : ""}${r.message ? `\n📝 ${r.message}` : ""}\n\n🤝 Hotels, Turkish corporates and foreign partners: sponsor this team at /sponsorship.\n⚖️ Legal & immigration support via verified partners — no residence/kimlik guarantee.\n${TAGS}`,
    }[lang];
    return { title, body };
  }
  if (kind === "pledge") {
    const [p] = await db.select().from(pledges).where(eq(pledges.id, refId));
    if (!p) return null;
    const [r] = await db.select().from(supportRequests).where(eq(supportRequests.id, p.requestId));
    const covers = p.covers.map((n) => needLabel(n, lang)).join(" · ");
    const st = sponsorLabel(p.sponsorType, lang);
    const title = { fa: `💛 اسپانسر جدید برای ${r?.teamName}`, tr: `💛 ${r?.teamName} için yeni sponsor`, en: `💛 New sponsor for ${r?.teamName}` }[lang];
    const body = {
      fa: `🎉 ${p.sponsorName} (${st}، ${p.country}) حمایت از تیم ${r?.teamName} را پذیرفت.\n✅ پوشش: ${covers}${p.amountUsd ? ` · $${p.amountUsd}` : ""}${p.inKind ? ` · غیرنقدی: ${p.inKind}` : ""}${p.note ? `\n📝 ${p.note}` : ""}\n\nسپاس از شریکی که ظرفیت خالی را به فرصت استارتاپی تبدیل کرد.\n${TAGS}`,
      tr: `🎉 ${p.sponsorName} (${st}, ${p.country}) ${r?.teamName} ekibine destek verdi.\n✅ Kapsam: ${covers}${p.amountUsd ? ` · $${p.amountUsd}` : ""}${p.inKind ? ` · ayni: ${p.inKind}` : ""}${p.note ? `\n📝 ${p.note}` : ""}\n\nBoş kapasiteyi startup fırsatına dönüştüren ortağımıza teşekkürler.\n${TAGS}`,
      en: `🎉 ${p.sponsorName} (${st}, ${p.country}) is sponsoring ${r?.teamName}.\n✅ Covers: ${covers}${p.amountUsd ? ` · $${p.amountUsd}` : ""}${p.inKind ? ` · in-kind: ${p.inKind}` : ""}${p.note ? `\n📝 ${p.note}` : ""}\n\nThanks to a partner turning empty capacity into startup opportunity.\n${TAGS}`,
    }[lang];
    return { title, body };
  }
  if (kind === "bootcamp") {
    const [b] = await db.select().from(bootcamps).where(eq(bootcamps.id, refId));
    if (!b) return null;
    const title = { fa: `⚖️ بوت‌کمپ حقوقی: ${b.title}`, tr: `⚖️ Hukuk bootcamp: ${b.title}`, en: `⚖️ Legal bootcamp: ${b.title}` }[lang];
    const body = `${b.title}\n${b.firm} · ${b.city} · ${b.startDate} · ${b.days}d · ${b.capacity} seats · ${b.language.toUpperCase()}\n${b.topics.join(" · ")}\n${b.description}\n${TAGS}`;
    return { title, body };
  }
  return null;
}

export async function createChannelPost(kind: string, refId: number, lang: Lang) {
  const built = await buildPost(kind, refId, lang);
  if (!built) return null;
  const [row] = await db.insert(channelPosts).values({ kind, lang, refId, title: built.title, body: built.body }).returning();
  return row;
}
