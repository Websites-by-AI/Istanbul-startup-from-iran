import { getT } from "@/lib/i18n";
import { PageHeader } from "@/lib/ui";
import Simulator from "./Simulator";

export const dynamic = "force-dynamic";

const COPY = {
  fa: { eyebrow: "ماژول ۱۱ · ربات تلگرام", title: "دستیار در تلگرام", desc: "همان هفت عامل هوشمند + قوانین ترکیه + ثبت درخواست حمایت، از داخل تلگرام. در زیر می‌توانید دقیقاً همان هندلر ربات را بدون تلگرام تست کنید.", setup: "راه‌اندازی", s1: "با @BotFather یک ربات بسازید و توکن را بگیرید.", s2: "متغیرهای محیطی را تنظیم کنید: TELEGRAM_BOT_TOKEN (الزامی)، TELEGRAM_WEBHOOK_SECRET (اختیاری)، TELEGRAM_CHANNEL_ID (برای انتشار خودکار در کانال، مثلاً @IranTurkiyeBridge).", s3: "دکمه زیر را بزنید تا وب‌هوک روی این دامنه ثبت شود.", register: "ثبت وب‌هوک", status: "وضعیت", placeholder: "پیام یا دستور…", send: "ارسال", sim: "شبیه‌ساز ربات (همان کد وب‌هوک)" },
  tr: { eyebrow: "Modül 11 · Telegram Botu", title: "Asistan Telegram'da", desc: "Aynı yedi AI ajanı + Türkiye kuralları + destek talebi, Telegram içinden. Aşağıda bot işleyicisini Telegram olmadan birebir test edebilirsiniz.", setup: "Kurulum", s1: "@BotFather ile bot oluşturun ve token alın.", s2: "Ortam değişkenleri: TELEGRAM_BOT_TOKEN (zorunlu), TELEGRAM_WEBHOOK_SECRET (isteğe bağlı), TELEGRAM_CHANNEL_ID (kanala otomatik yayın için, ör. @IranTurkiyeBridge).", s3: "Webhook'u bu alan adına kaydetmek için aşağıdaki düğmeye basın.", register: "Webhook kaydet", status: "Durum", placeholder: "Mesaj veya komut…", send: "Gönder", sim: "Bot simülatörü (webhook ile aynı kod)" },
  en: { eyebrow: "Module 11 · Telegram Bot", title: "The assistant on Telegram", desc: "The same seven AI agents + Türkiye rules + support requests, inside Telegram. Below you can test the exact bot handler without Telegram.", setup: "Setup", s1: "Create a bot with @BotFather and copy the token.", s2: "Set env vars: TELEGRAM_BOT_TOKEN (required), TELEGRAM_WEBHOOK_SECRET (optional), TELEGRAM_CHANNEL_ID (for auto-publishing to a channel, e.g. @IranTurkiyeBridge).", s3: "Press the button below to register the webhook on this domain.", register: "Register webhook", status: "Status", placeholder: "Message or command…", send: "Send", sim: "Bot simulator (same code as the webhook)" },
};

export default async function TelegramPage() {
  const { locale } = await getT();
  const c = COPY[locale];
  const token = Boolean(process.env.TELEGRAM_BOT_TOKEN);
  const channel = process.env.TELEGRAM_CHANNEL_ID ?? "";
  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <PageHeader eyebrow={c.eyebrow} title={c.title} desc={c.desc} />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="card space-y-3 self-start text-sm">
          <h2 className="font-bold">{c.setup}</h2>
          <ol className="list-decimal space-y-2 ps-5 text-slate-300">
            <li>{c.s1}</li>
            <li>{c.s2}</li>
            <li>{c.s3}</li>
          </ol>
          <p className="text-xs text-slate-400">{c.status}: TELEGRAM_BOT_TOKEN {token ? "✅" : "❌"} · TELEGRAM_CHANNEL_ID {channel ? `✅ ${channel}` : "❌"}</p>
          <form action="/api/telegram/setup" method="post">
            <button disabled={!token} className="rounded-lg bg-amber-400 px-4 py-2 font-semibold text-slate-950 disabled:opacity-40">{c.register}</button>
          </form>
          <p className="font-mono text-xs text-slate-500" dir="ltr">POST /api/telegram/webhook</p>
        </div>
        <div>
          <h2 className="mb-2 font-bold">{c.sim}</h2>
          <Simulator placeholder={c.placeholder} send={c.send} />
        </div>
      </div>
    </main>
  );
}
