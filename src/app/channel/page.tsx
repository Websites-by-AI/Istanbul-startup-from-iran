import { db } from "@/db";
import { channelPosts } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getT } from "@/lib/i18n";
import { PageHeader } from "@/lib/ui";
import { publishPost, deletePost } from "./actions";
import CopyButton from "./CopyButton";

export const dynamic = "force-dynamic";

const COPY = {
  fa: { eyebrow: "ماژول ۱۰ · کانال خودکار", title: "پست‌های کانال (خودکار)", desc: "هر درخواست حمایت، اسپانسری و بوت‌کمپ به‌صورت خودکار یک پیش‌نویس پست می‌سازد. با «انتشار» در صورت تنظیم TELEGRAM_CHANNEL_ID مستقیماً به کانال تلگرام ارسال می‌شود؛ در غیر این صورت متن را کپی کنید.", copy: "کپی", publish: "انتشار", delete: "حذف", draft: "پیش‌نویس", published: "منتشرشده", none: "هنوز پستی نیست — از /sponsorship یک درخواست ثبت کنید.", cfg: "تنظیمات تلگرام" },
  tr: { eyebrow: "Modül 10 · Otomatik Kanal", title: "Kanal gönderileri (otomatik)", desc: "Her destek talebi, sponsorluk ve bootcamp otomatik olarak taslak gönderi oluşturur. 'Yayınla' TELEGRAM_CHANNEL_ID ayarlıysa doğrudan Telegram kanalına gönderir; aksi hâlde metni kopyalayın.", copy: "Kopyala", publish: "Yayınla", delete: "Sil", draft: "taslak", published: "yayınlandı", none: "Henüz gönderi yok — /sponsorship üzerinden bir talep oluşturun.", cfg: "Telegram ayarları" },
  en: { eyebrow: "Module 10 · Auto Channel", title: "Channel posts (auto-generated)", desc: "Every support request, pledge and bootcamp automatically creates a draft post. 'Publish' pushes it to the Telegram channel when TELEGRAM_CHANNEL_ID is set; otherwise copy the text.", copy: "Copy", publish: "Publish", delete: "Delete", draft: "draft", published: "published", none: "No posts yet — file a request at /sponsorship.", cfg: "Telegram settings" },
};

export default async function ChannelPage() {
  const { locale } = await getT();
  const c = COPY[locale];
  const posts = await db.select().from(channelPosts).orderBy(desc(channelPosts.id));
  const configured = Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHANNEL_ID);
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <PageHeader eyebrow={c.eyebrow} title={c.title} desc={c.desc} />
      <p className="mb-6 text-xs text-slate-500">Telegram channel push: {configured ? "✅ configured" : "⚠️ not configured (TELEGRAM_BOT_TOKEN + TELEGRAM_CHANNEL_ID)"} · <a href="/telegram" className="text-sky-300 hover:underline">{c.cfg}</a></p>
      <div className="space-y-4">
        {posts.length === 0 && <p className="text-sm text-slate-500">{c.none}</p>}
        {posts.map((p) => (
          <article key={p.id} className="card" dir={p.lang === "fa" ? "rtl" : "ltr"}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold">{p.title}</h3>
              <div className="flex items-center gap-2">
                <span className="badge bg-white/10 uppercase text-slate-300">{p.kind} · {p.lang}</span>
                <span className={`badge ${p.status === "published" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>{p.status === "published" ? c.published : c.draft}</span>
              </div>
            </div>
            <pre className="mt-3 whitespace-pre-wrap font-sans text-sm text-slate-200">{p.body}</pre>
            <div className="mt-3 flex gap-2">
              <CopyButton text={`${p.title}\n\n${p.body}`} label={c.copy} />
              {p.status !== "published" && (
                <form action={publishPost}><input type="hidden" name="id" value={p.id} /><button className="rounded-lg bg-amber-400 px-3 py-1 text-xs font-semibold text-slate-950">{c.publish}</button></form>
              )}
              <form action={deletePost}><input type="hidden" name="id" value={p.id} /><button className="rounded-lg border border-red-400/40 px-3 py-1 text-xs text-red-300">{c.delete}</button></form>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
