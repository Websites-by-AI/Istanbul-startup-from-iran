import { db } from "@/db";
import { telegramUsers, startups, supportRequests } from "@/db/schema";
import { eq } from "drizzle-orm";
import { runAgent, isAgent, agentsFor, detectLang, type Lang, type AgentKey } from "@/lib/navigator";
import { LEGAL_RULES } from "@/lib/legalRules";

export type TgUpdate = {
  update_id?: number;
  message?: { chat: { id: number | string; username?: string }; from?: { language_code?: string; username?: string }; text?: string };
};

const NEEDS = ["accommodation", "travel", "legal", "documents", "poc", "office", "mentoring", "media", "investment"] as const;

const HELP: Record<Lang, string> = {
  fa: "🤖 *دستیار لندینگ استارتاپی ترکیه*\n\n/lang fa|tr|en — زبان\n/agent — انتخاب عامل (legal, desk, match, investor, market, media, schedule)\n/team <نام> — انتخاب تیم\n/rules — قوانین ترکیه برای ورود مؤسسان ایرانی\n/need <نیازها> — ثبت درخواست حمایت (مثلاً: /need accommodation legal poc)\n/status — وضعیت درخواست شما\n/help — راهنما\n\nهر پیام دیگری مستقیماً از عامل فعلی پرسیده می‌شود.",
  tr: "🤖 *Türkiye Startup Landing Asistanı*\n\n/lang fa|tr|en — dil\n/agent — ajan seç (legal, desk, match, investor, market, media, schedule)\n/team <ad> — ekip seç\n/rules — İranlı kurucular için Türkiye kuralları\n/need <ihtiyaçlar> — destek talebi (ör. /need accommodation legal poc)\n/status — talebinizin durumu\n/help — yardım\n\nDiğer tüm mesajlar doğrudan mevcut ajana sorulur.",
  en: "🤖 *Türkiye Startup Landing Assistant*\n\n/lang fa|tr|en — language\n/agent — choose agent (legal, desk, match, investor, market, media, schedule)\n/team <name> — pick your team\n/rules — Türkiye rules for Iranian founders\n/need <needs> — file a support request (e.g. /need accommodation legal poc)\n/status — your request status\n/help — help\n\nAny other message is asked directly to the current agent.",
};

export async function handleTelegramText(chatId: string, text: string, meta?: { username?: string; language_code?: string }): Promise<string> {
  let [u] = await db.select().from(telegramUsers).where(eq(telegramUsers.chatId, chatId));
  if (!u) {
    const lc = meta?.language_code?.slice(0, 2);
    const lang: Lang = lc === "fa" || lc === "tr" || lc === "en" ? lc : "fa";
    [u] = await db.insert(telegramUsers).values({ chatId, username: meta?.username ?? "", lang }).returning();
  }
  const lang = u.lang as Lang;
  const t = text.trim();
  const [cmdRaw, ...rest] = t.split(/\s+/);
  const cmd = cmdRaw.toLowerCase().replace(/@\w+$/, "");
  const arg = rest.join(" ").trim();

  if (cmd === "/start" || cmd === "/help") return HELP[lang];

  if (cmd === "/lang") {
    const l = arg.slice(0, 2).toLowerCase();
    if (l === "fa" || l === "tr" || l === "en") {
      await db.update(telegramUsers).set({ lang: l }).where(eq(telegramUsers.id, u.id));
      return { fa: "✅ زبان: فارسی", tr: "✅ Dil: Türkçe", en: "✅ Language: English" }[l];
    }
    return "Usage: /lang fa | tr | en";
  }

  if (cmd === "/agent") {
    const list = agentsFor(lang);
    if (isAgent(arg)) {
      await db.update(telegramUsers).set({ agent: arg }).where(eq(telegramUsers.id, u.id));
      const a = list.find((x) => x.key === arg)!;
      return `✅ ${a.icon} ${a.name}\n${a.desc}\n\n${a.prompts.map((p) => "• " + p).join("\n")}`;
    }
    return list.map((a) => `${a.icon} /agent ${a.key} — ${a.name}`).join("\n");
  }

  if (cmd === "/team") {
    const all = await db.select({ id: startups.id, name: startups.name, sector: startups.sector }).from(startups);
    if (!arg) return all.map((s) => `• ${s.name} (${s.sector})`).join("\n") + "\n\n/team <name>";
    const hit = all.find((s) => s.name.toLowerCase().includes(arg.toLowerCase()));
    if (!hit) return { fa: "تیمی با این نام پیدا نشد.", tr: "Bu adla ekip bulunamadı.", en: "No team with that name." }[lang];
    await db.update(telegramUsers).set({ startupId: hit.id }).where(eq(telegramUsers.id, u.id));
    return `✅ ${hit.name} — ${hit.sector}`;
  }

  if (cmd === "/rules") {
    return LEGAL_RULES.map((r, i) => `${i + 1}. *${r.title[lang]}*\n${r.implication[lang]}`).join("\n\n") + "\n\n" + { fa: "جزئیات و منابع: /legal/rules در سایت", tr: "Ayrıntılar ve kaynaklar: sitede /legal/rules", en: "Details & sources: /legal/rules on the site" }[lang];
  }

  if (cmd === "/need") {
    const needs = rest.map((x) => x.toLowerCase()).filter((x): x is (typeof NEEDS)[number] => (NEEDS as readonly string[]).includes(x));
    if (needs.length === 0) return { fa: `نیازها را بنویسید: ${NEEDS.join(", ")}\nمثال: /need accommodation legal poc`, tr: `İhtiyaçları yazın: ${NEEDS.join(", ")}\nÖrnek: /need accommodation legal poc`, en: `List needs: ${NEEDS.join(", ")}\nExample: /need accommodation legal poc` }[lang];
    const team = u.startupId ? (await db.select().from(startups).where(eq(startups.id, u.startupId)))[0] : null;
    const { addRequest } = await import("@/lib/sponsorship");
    const req = await addRequest({ startupId: team?.id ?? null, teamName: team?.name ?? (u.username ? "@" + u.username : "Telegram team"), contact: u.username ? "@" + u.username : `tg:${chatId}`, needs, source: "telegram", lang });
    return { fa: `✅ درخواست #${req.id} ثبت شد (${needs.join(", ")}). اسپانسرها در سایت /sponsorship آن را می‌بینند؛ با /status پیگیری کنید.`, tr: `✅ Talep #${req.id} kaydedildi (${needs.join(", ")}). Sponsorlar sitede /sponsorship üzerinden görür; /status ile takip edin.`, en: `✅ Request #${req.id} filed (${needs.join(", ")}). Sponsors see it at /sponsorship; track with /status.` }[lang];
  }

  if (cmd === "/status") {
    const reqs = await db.select().from(supportRequests).where(eq(supportRequests.contact, u.username ? "@" + u.username : `tg:${chatId}`));
    if (reqs.length === 0) return { fa: "درخواستی ندارید. با /need ثبت کنید.", tr: "Talebiniz yok. /need ile oluşturun.", en: "No requests yet. Use /need." }[lang];
    const { pledges } = await import("@/db/schema");
    const out: string[] = [];
    for (const r of reqs) {
      const ps = await db.select().from(pledges).where(eq(pledges.requestId, r.id));
      out.push(`#${r.id} · ${r.needs.join(", ")} · ${r.status}\n` + (ps.length ? ps.map((p) => `   💛 ${p.sponsorName} (${p.sponsorType}, ${p.country}) → ${p.covers.join(", ")}${p.amountUsd ? ` · $${p.amountUsd}` : ""}`).join("\n") : { fa: "   هنوز اسپانسری نیامده", tr: "   henüz sponsor yok", en: "   no sponsors yet" }[lang]));
    }
    return out.join("\n\n");
  }

  // free text → current agent
  const replyLang = detectLang(t, lang);
  const answer = await runAgent(u.agent as AgentKey, t, u.startupId, replyLang);
  return answer.replace(/\*\*(.+?)\*\*/g, "*$1*").replace(/^_(.+)_$/gm, "_$1_");
}

export async function processUpdate(update: TgUpdate): Promise<{ chatId: string; reply: string } | null> {
  const m = update.message;
  if (!m?.text) return null;
  const chatId = String(m.chat.id);
  const reply = await handleTelegramText(chatId, m.text, { username: m.from?.username ?? m.chat.username, language_code: m.from?.language_code });
  return { chatId, reply };
}

export async function sendTelegram(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, reason: "TELEGRAM_BOT_TOKEN not set" };
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown", disable_web_page_preview: true }),
  });
  return { ok: res.ok };
}
