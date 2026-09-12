import { db } from "@/db";
import { startups, corporates, investors, hotels, bootcamps, legalAssessments } from "@/db/schema";
import { teamCost, candidateHotels } from "@/lib/costs";
import { eq } from "drizzle-orm";
import { scoreCorporate, scoreInvestor } from "@/lib/matching";
import { LANDING_STEPS, money } from "@/lib/ui";
import type { Startup } from "@/db/schema";

export type AgentKey = "legal" | "desk" | "investor" | "market" | "media" | "match" | "schedule";
export type Lang = "en" | "fa" | "tr";
type Tri = Record<Lang, string>;
const T = (lang: Lang, en: string, fa: string, tr: string) => ({ en, fa, tr })[lang];

export type AgentMeta = { key: AgentKey; name: string; icon: string; desc: string; prompts: string[] };

const AGENT_DEFS: Record<AgentKey, { icon: string; name: Tri; desc: Tri; prompts: Record<Lang, string[]> }> = {
  schedule: {
    icon: "🗓️",
    name: { en: "Schedule AI", fa: "دستیار برنامه", tr: "Program AI" },
    desc: { en: "Your landing-week agenda.", fa: "برنامه روزانه هفته لندینگ.", tr: "Landing haftası ajandanız." },
    prompts: { en: ["What's our plan for today?", "Show the 14-day landing schedule"], fa: ["برنامه امروز ما چیست؟", "برنامه ۱۴ روزه لندینگ را نشان بده"], tr: ["Bugünkü planımız ne?", "14 günlük landing programını göster"] },
  },
  legal: {
    icon: "⚖️",
    name: { en: "Legal AI", fa: "دستیار حقوقی", tr: "Hukuk AI" },
    desc: { en: "Documents, entity structure, visa pathways (guidance only).", fa: "مدارک، ساختار شرکت، مسیرهای ویزا (فقط راهنمایی).", tr: "Belgeler, şirket yapısı, vize yolları (yalnızca rehberlik)." },
    prompts: { en: ["What documents do we need before landing?", "Subsidiary or sister company?", "Can the sponsor guarantee a kimlik?"], fa: ["قبل از ورود چه مدارکی لازم است؟", "زیرمجموعه یا Sister Company؟", "آیا اسپانسر می‌تواند کیملیک تضمین کند؟"], tr: ["Landing öncesi hangi belgeler gerekli?", "Bağlı ortaklık mı kardeş şirket mi?", "Sponsor kimlik garanti edebilir mi?"] },
  },
  desk: {
    icon: "🏛️",
    name: { en: "Legal Desk AI", fa: "دستیار میز حقوقی", tr: "Hukuk Masası AI" },
    desc: { en: "Iran–Türkiye Legal Desk: bootcamps, assessment status, cost & candidate hotels.", fa: "میز حقوقی ایران–ترکیه: بوت‌کمپ‌ها، وضعیت ارزیابی، هزینه و هتل‌های کاندید.", tr: "İran–Türkiye Hukuk Masası: bootcampler, değerlendirme durumu, maliyet ve aday oteller." },
    prompts: { en: ["How does the Legal Desk work?", "Show upcoming legal bootcamps", "What is our legal assessment status?", "Cost and candidate hotels for our team"], fa: ["میز حقوقی چطور کار می‌کند؟", "بوت‌کمپ‌های حقوقی را نشان بده", "وضعیت ارزیابی حقوقی ما چیست؟", "هزینه و هتل‌های کاندید تیم ما"], tr: ["Hukuk Masası nasıl çalışır?", "Yaklaşan hukuk bootcamplerini göster", "Hukuki değerlendirme durumumuz ne?", "Ekibimiz için maliyet ve aday oteller"] },
  },
  match: {
    icon: "🤝",
    name: { en: "Business Match AI", fa: "دستیار تطبیق کسب‌وکار", tr: "İş Eşleştirme AI" },
    desc: { en: "Which Turkish company should we introduce you to?", fa: "شما را به کدام شرکت ترکیه‌ای معرفی کنیم؟", tr: "Sizi hangi Türk şirketiyle tanıştıralım?" },
    prompts: { en: ["Which corporate should sponsor us?", "Rank corporates for a PoC"], fa: ["کدام شرکت باید اسپانسر ما شود؟", "شرکت‌ها را برای PoC رتبه‌بندی کن"], tr: ["Hangi kurumsal bize sponsor olmalı?", "PoC için kurumsalları sırala"] },
  },
  investor: {
    icon: "💼",
    name: { en: "Investor AI", fa: "دستیار سرمایه‌گذار", tr: "Yatırımcı AI" },
    desc: { en: "Find VCs, angels and corporate investors that fit.", fa: "یافتن VC، فرشته و سرمایه‌گذار شرکتی مناسب.", tr: "Uygun VC, melek ve kurumsal yatırımcıları bulun." },
    prompts: { en: ["Which investors fit our stage?", "How should we prepare for due diligence?"], fa: ["کدام سرمایه‌گذاران با مرحله ما می‌خوانند؟", "برای Due Diligence چطور آماده شویم؟"], tr: ["Hangi yatırımcılar aşamamıza uygun?", "Due diligence'a nasıl hazırlanmalıyız?"] },
  },
  market: {
    icon: "📊",
    name: { en: "Market AI", fa: "دستیار بازار", tr: "Pazar AI" },
    desc: { en: "Türkiye market intelligence for your sector.", fa: "اطلاعات بازار ترکیه برای حوزه شما.", tr: "Sektörünüz için Türkiye pazar bilgisi." },
    prompts: { en: ["How big is our market in Türkiye?", "Who are local competitors?"], fa: ["بازار ما در ترکیه چقدر بزرگ است؟", "رقبای محلی چه کسانی هستند؟"], tr: ["Türkiye'de pazarımız ne kadar büyük?", "Yerel rakipler kimler?"] },
  },
  media: {
    icon: "📣",
    name: { en: "Media AI", fa: "دستیار رسانه", tr: "Medya AI" },
    desc: { en: "LinkedIn, press release, pitch and demo-day support.", fa: "لینکدین، بیانیه مطبوعاتی، پیچ و دمو دی.", tr: "LinkedIn, basın bülteni, pitch ve demo günü desteği." },
    prompts: { en: ["Draft our LinkedIn landing announcement", "Write a 30-second pitch"], fa: ["پست لینکدین اعلام ورود را بنویس", "یک پیچ ۳۰ ثانیه‌ای بنویس"], tr: ["LinkedIn landing duyurumuzu yaz", "30 saniyelik pitch yaz"] },
  },
};

export const AGENT_KEYS = Object.keys(AGENT_DEFS) as AgentKey[];
export function isAgent(k: unknown): k is AgentKey {
  return typeof k === "string" && k in AGENT_DEFS;
}
export function agentsFor(lang: Lang): AgentMeta[] {
  return AGENT_KEYS.map((key) => {
    const d = AGENT_DEFS[key];
    return { key, icon: d.icon, name: d.name[lang], desc: d.desc[lang], prompts: d.prompts[lang] };
  });
}

/** Language of the reply: script wins; otherwise clear Turkish/English markers; otherwise the site locale. */
export function detectLang(q: string, fallback: Lang = "en"): Lang {
  if (/[\u0600-\u06FF]/.test(q)) return "fa";
  const t = q.trim();
  if (/[çğışöüÇĞİŞÖÜ]/.test(t)) return "tr";
  if (/\b(nasıl|nedir|hangi|için|bize|bizim|ekibimiz|garanti|edebilir|göster|misiniz|mısınız|ne kadar|kimler)\b/i.test(t) || /\s(mi|mı|mu|mü)\s*\?*$/i.test(t)) return "tr";
  if (/\b(what|which|how|our|we|show|the|should|can|who|do|is|are)\b/i.test(t)) return "en";
  return fallback;
}

const DISCLAIMER: Tri = {
  en: "\n\n_AI information, not legal advice. No residence / work permit / kimlik is guaranteed; a Türkiye-licensed attorney decides the route._",
  fa: "\n\n_این اطلاعات هوش مصنوعی است، نه مشاوره حقوقی. هیچ اقامت / اجازه کار / کیملیکی تضمین نمی‌شود؛ مسیر را وکیل دارای پروانه ترکیه تعیین می‌کند._",
  tr: "\n\n_Bu AI bilgisidir, hukuki tavsiye değildir. İkamet / çalışma izni / kimlik garanti edilmez; yolu Türkiye'de ruhsatlı avukat belirler._",
};

const SECTOR_INTEL: Record<string, Tri> = {
  energy: {
    en: "Türkiye targets ~60% renewables and runs a liberalized electricity market (EPİAŞ). Utilities and EPCs procure forecasting, grid analytics and O&M AI. Clusters: Istanbul (HQs), Ankara (EPDK, TEİAŞ), İzmir (wind).",
    fa: "ترکیه هدف ~۶۰٪ تجدیدپذیر دارد و بازار برق آزاد (EPİAŞ) را اداره می‌کند. شرکت‌های برق و EPCها پیش‌بینی تولید، تحلیل شبکه و هوش مصنوعی O&M می‌خرند. خوشه‌ها: استانبول (دفاتر مرکزی)، آنکارا (EPDK، TEİAŞ)، ازمیر (باد).",
    tr: "Türkiye ~%60 yenilenebilir hedefliyor ve serbest elektrik piyasası (EPİAŞ) işletiyor. Dağıtım şirketleri ve EPC'ler tahminleme, şebeke analitiği ve O&M AI satın alıyor. Kümeler: İstanbul (merkezler), Ankara (EPDK, TEİAŞ), İzmir (rüzgâr).",
  },
  logistics: {
    en: "Türkiye is the Europe–Asia–Middle East land bridge; ~1M freight trucks, hubs at Ambarlı, Mersin and the Istanbul Airport cargo city. Customs digitization and route AI are hot procurement topics.",
    fa: "ترکیه پل زمینی اروپا–آسیا–خاورمیانه است؛ حدود ۱ میلیون کامیون باری، هاب‌های آمبارلی، مرسین و کارگو سیتی فرودگاه استانبول. دیجیتالی‌سازی گمرک و هوش مصنوعی مسیریابی موضوعات داغ خرید هستند.",
    tr: "Türkiye Avrupa–Asya–Orta Doğu kara köprüsü; ~1M yük kamyonu, Ambarlı, Mersin ve İstanbul Havalimanı kargo şehri. Gümrük dijitalleşmesi ve rota AI'ı öncelikli tedarik konuları.",
  },
  construction: {
    en: "Turkish contractors rank #2 globally by international projects (ENR). Digital twins, BIM, site safety and material tracking are priority spends.",
    fa: "پیمانکاران ترک از نظر پروژه‌های بین‌المللی رتبه دوم جهان هستند (ENR). دوقلوی دیجیتال، BIM، ایمنی کارگاه و ردیابی مصالح اولویت هزینه‌کرد است.",
    tr: "Türk müteahhitler uluslararası projelerde dünyada 2. (ENR). Dijital ikiz, BIM, şantiye güvenliği ve malzeme takibi öncelikli harcama alanları.",
  },
  agri: {
    en: "Türkiye is a top-10 agri producer; Aegean and Çukurova export clusters. Precision irrigation and crop analytics benefit from TKDK/IPARD-style subsidies.",
    fa: "ترکیه جزو ۱۰ تولیدکننده برتر کشاورزی است؛ خوشه‌های صادراتی اژه و چوکوروا. آبیاری دقیق و تحلیل محصول از یارانه‌های TKDK/IPARD بهره می‌برند.",
    tr: "Türkiye ilk 10 tarım üreticisinden; Ege ve Çukurova ihracat kümeleri. Hassas sulama ve ürün analitiği TKDK/IPARD tipi desteklerden yararlanır.",
  },
  health: {
    en: "Health tourism brings 1M+ international patients yearly; private groups (Acıbadem, Medical Park, Memorial) invest in imaging AI and patient flow.",
    fa: "گردشگری سلامت سالانه بیش از ۱ میلیون بیمار خارجی می‌آورد؛ گروه‌های خصوصی (Acıbadem، Medical Park، Memorial) روی هوش مصنوعی تصویربرداری و جریان بیمار سرمایه‌گذاری می‌کنند.",
    tr: "Sağlık turizmi yılda 1M+ uluslararası hasta getiriyor; özel gruplar (Acıbadem, Medical Park, Memorial) görüntüleme AI ve hasta akışına yatırım yapıyor.",
  },
  manufacturing: {
    en: "OSB industrial zones host 50K+ factories; automotive, machinery and white goods lead. Predictive maintenance and CV-based QC have clear ROI.",
    fa: "مناطق صنعتی OSB بیش از ۵۰ هزار کارخانه دارند؛ خودرو، ماشین‌آلات و لوازم خانگی پیشتازند. نگهداری پیش‌بینانه و کنترل کیفیت با بینایی ماشین ROI روشنی دارند.",
    tr: "OSB'lerde 50K+ fabrika; otomotiv, makine ve beyaz eşya öncü. Kestirimci bakım ve görüntü tabanlı kalite kontrol net ROI sunuyor.",
  },
  travel: {
    en: "50M+ tourist arrivals; boutique hotels are fragmented — SaaS concierge tools have low CAC via hotel associations (TÜROB).",
    fa: "بیش از ۵۰ میلیون گردشگر؛ هتل‌های بوتیک پراکنده‌اند — ابزارهای SaaS کانسیرج از طریق انجمن‌های هتلداری (TÜROB) CAC پایینی دارند.",
    tr: "50M+ turist; butik oteller dağınık — SaaS concierge araçları otel dernekleri (TÜROB) üzerinden düşük CAC sunuyor.",
  },
  fintech: {
    en: "BDDK/TCMB regulate payments; a very active fintech scene (Papara, Param, iyzico). Cross-border SME payments need a licensed partner.",
    fa: "BDDK/TCMB پرداخت را تنظیم می‌کنند؛ صحنه فین‌تک بسیار فعال است (Papara، Param، iyzico). پرداخت فرامرزی SME نیاز به شریک دارای مجوز دارد.",
    tr: "Ödemeleri BDDK/TCMB düzenler; çok aktif fintek sahnesi (Papara, Param, iyzico). Sınır ötesi KOBİ ödemeleri lisanslı ortak gerektirir.",
  },
  default: {
    en: "Türkiye's ecosystem raised ~$5.6B (2021–Q3 2025, Investment Office); Tech Visa and technopark incentives target foreign founders. Istanbul concentrates ~70% of deals.",
    fa: "اکوسیستم ترکیه حدود ۵.۶ میلیارد دلار جذب کرده (۲۰۲۱ تا سه‌ماهه سوم ۲۰۲۵، دفتر سرمایه‌گذاری)؛ Tech Visa و مشوق‌های تکنوپارک مؤسسان خارجی را هدف گرفته‌اند. حدود ۷۰٪ معاملات در استانبول است.",
    tr: "Türkiye ekosistemi ~5,6 milyar $ yatırım aldı (2021–2025 Ç3, Yatırım Ofisi); Tech Visa ve teknopark teşvikleri yabancı kurucuları hedefliyor. İşlemlerin ~%70'i İstanbul'da.",
  },
};

function intelFor(sector: string, lang: Lang) {
  const s = sector.toLowerCase();
  for (const k of Object.keys(SECTOR_INTEL)) if (k !== "default" && s.includes(k)) return SECTOR_INTEL[k][lang];
  if (s.includes("industrial") || s.includes("iot")) return SECTOR_INTEL.manufacturing[lang];
  if (s.includes("agri")) return SECTOR_INTEL.agri[lang];
  if (s.includes("edu")) return SECTOR_INTEL.default[lang];
  return SECTOR_INTEL.default[lang];
}

export async function loadStartup(id?: number | null): Promise<Startup | null> {
  if (!id) return null;
  const [s] = await db.select().from(startups).where(eq(startups.id, id));
  return s ?? null;
}

const STEPS_FA = ["نمایشگاه", "انتخاب", "تطبیق اسپانسر", "سفر و هتل", "راه‌اندازی حقوقی", "جلسات شرکتی", "PoC", "جلسات سرمایه‌گذار", "سرمایه‌گذاری", "مقیاس‌پذیری"];
const STEPS_TR = ["Fuar", "Seçim", "Sponsor Eşleştirme", "Seyahat ve Otel", "Hukuki Kurulum", "Kurumsal Toplantılar", "PoC", "Yatırımcı Toplantıları", "Yatırım", "Ölçeklenme"];
const stepName = (i: number, lang: Lang) => (lang === "fa" ? STEPS_FA : lang === "tr" ? STEPS_TR : LANDING_STEPS)[i];

const NO_TEAM: Tri = {
  en: "Select a team first so I can answer from its live profile.",
  fa: "ابتدا یک تیم انتخاب کنید تا از پروفایل زنده آن پاسخ بدهم.",
  tr: "Önce bir ekip seçin; canlı profilinden yanıt vereyim.",
};

const DESK_INTRO: Tri = {
  en: "**Iran–Türkiye Startup Legal Desk** — the first legal point of contact for selected teams.\n1. Pre-Landing Legal Assessment (founder structure, IP, contracts, intended activity)\n2. Türkiye entry pathways (visa / residence / work authorization — case by case)\n3. Turkish business structure (subsidiary / sister / operating / branch)\n4. Commercial launch (PoC, corporate contracts, employment, IP)\n5. Investment documentation (SHA, SAFE, due diligence)\nLayer 1 = Entry & Settlement · Layer 2 = Investment & Growth. Foreign counsel works with Türkiye-licensed attorneys (TBB rules).",
  fa: "**میز حقوقی استارتاپی ایران–ترکیه** — اولین نقطه تماس حقوقی تیم‌های منتخب.\n۱. ارزیابی حقوقی پیش از ورود (ساختار مؤسسان، IP، قراردادها، فعالیت موردنظر)\n۲. مسیرهای ورود به ترکیه (ویزا / اقامت / اجازه کار — مورد به مورد)\n۳. ساختار شرکت ترکیه‌ای (زیرمجموعه / Sister / عملیاتی / شعبه)\n۴. راه‌اندازی تجاری (PoC، قرارداد با شرکت‌ها، استخدام، IP)\n۵. اسناد سرمایه‌گذاری (SHA، SAFE، Due Diligence)\nلایه ۱ = ورود و استقرار · لایه ۲ = سرمایه‌گذاری و رشد. وکلای خارجی طبق مقررات TBB با وکلای دارای پروانه ترکیه همکاری می‌کنند.",
  tr: "**İran–Türkiye Startup Hukuk Masası** — seçilen ekipler için ilk hukuki temas noktası.\n1. Ön hukuki değerlendirme (kurucu yapısı, fikri mülkiyet, sözleşmeler, planlanan faaliyet)\n2. Türkiye'ye giriş yolları (vize / ikamet / çalışma izni — vaka bazında)\n3. Türk şirket yapısı (bağlı ortaklık / kardeş şirket / işletme şirketi / şube)\n4. Ticari başlangıç (PoC, kurumsal sözleşmeler, istihdam, fikri mülkiyet)\n5. Yatırım belgeleri (SHA, SAFE, due diligence)\nKatman 1 = Giriş & Yerleşim · Katman 2 = Yatırım & Büyüme. Yabancı danışmanlar TBB kuralları gereği Türkiye'de ruhsatlı avukatlarla çalışır.",
};

export async function runAgent(agent: AgentKey, question: string, startupId?: number | null, locale: Lang = "en"): Promise<string> {
  const s = await loadStartup(startupId);
  const lang = detectLang(question, locale);
  const name = s?.name ?? T(lang, "your team", "تیم شما", "ekibiniz");
  const q = question.toLowerCase();
  const has = (re: RegExp) => re.test(question);

  switch (agent) {
    case "desk": {
      if (has(/bootcamp|بوت|kamp|workshop|کارگاه|eğitim/i)) {
        const camps = await db.select().from(bootcamps).orderBy(bootcamps.startDate);
        const head = T(lang, "**Upcoming legal bootcamps**", "**بوت‌کمپ‌های حقوقی پیش‌رو**", "**Yaklaşan hukuk bootcampleri**");
        if (camps.length === 0) return head + "\n" + T(lang, "No bootcamps yet — the legal group can create one at /legal.", "هنوز بوت‌کمپی ثبت نشده — گروه حقوقی می‌تواند در /legal بسازد.", "Henüz bootcamp yok — hukuk grubu /legal adresinden oluşturabilir.") + DISCLAIMER[lang];
        const seats = T(lang, "seats", "صندلی", "koltuk");
        const day = T(lang, "days", "روز", "gün");
        const free = T(lang, "free", "رایگان", "ücretsiz");
        return head + "\n" + camps.map((c, i) => `${i + 1}. **${c.title}** — ${c.firm}, ${c.city} · ${c.startDate} · ${c.days} ${day} · ${c.capacity} ${seats} · ${c.language.toUpperCase()} · ${c.priceUsd ? "$" + c.priceUsd : free}${c.topics.length ? " · " + c.topics.join(", ") : ""}`).join("\n") + DISCLAIMER[lang];
      }
      if (has(/cost|hotel|هزینه|هتل|maliyet|otel|price|قیمت/i)) {
        if (!s) return NO_TEAM[lang];
        const all = await db.select().from(hotels);
        const cur = s.hotelId ? all.find((h) => h.id === s.hotelId) : null;
        const cost = teamCost(cur);
        const cands = candidateHotels(all, cur?.city ?? "Istanbul", s.sector).slice(0, 3);
        const head = T(lang, `**Cost & candidate hotels — ${s.name}**`, `**هزینه و هتل‌های کاندید — ${s.name}**`, `**Maliyet ve aday oteller — ${s.name}**`);
        const curTxt = cur ? T(lang, ` (current hotel: ${cur.name})`, ` (هتل فعلی: ${cur.name})`, ` (mevcut otel: ${cur.name})`) : "";
        const costLine = T(lang,
          `14-day landing, 3 people: cash **$${cost.total.toLocaleString()}** + in-kind hotel **$${cost.inKind.toLocaleString()}**${curTxt}.`,
          `لندینگ ۱۴ روزه، ۳ نفر: نقدی **$${cost.total.toLocaleString()}** + غیرنقدی هتل **$${cost.inKind.toLocaleString()}**${curTxt}.`,
          `14 günlük landing, 3 kişi: nakit **$${cost.total.toLocaleString()}** + ayni otel **$${cost.inKind.toLocaleString()}**${curTxt}.`);
        const rooms = T(lang, "rooms", "اتاق", "oda");
        const expo = T(lang, "min to expo", "دقیقه تا نمایشگاه", "dk fuara");
        const tc = T(lang, "team cost", "هزینه تیم", "ekip maliyeti");
        const sc = T(lang, "score", "امتیاز", "puan");
        return `${head}\n${costLine}\n${T(lang, "Candidate hotels:", "هتل‌های کاندید:", "Aday oteller:")}\n` + cands.map(({ hotel: h, score }, i) => `${i + 1}. **${h.name}** (${h.district}) · ${h.roomsAvailable} ${rooms} · ${h.supportType} · ${h.exhibitionMinutes} ${expo} · ${tc} $${teamCost(h).total.toLocaleString()} · ${sc} ${score}`).join("\n") + DISCLAIMER[lang];
      }
      if (has(/status|assessment|وضعیت|ارزیابی|durum|değerlendirme/i)) {
        if (!s) return NO_TEAM[lang];
        const [a] = await db.select().from(legalAssessments).where(eq(legalAssessments.startupId, s.id));
        const head = T(lang, `**Legal assessment — ${s.name}**`, `**ارزیابی حقوقی — ${s.name}**`, `**Hukuki değerlendirme — ${s.name}**`);
        if (!a) return head + "\n" + T(lang, "Status: intake (not yet reviewed). Next: the desk opens the Pre-Landing Legal Assessment at /legal.", "وضعیت: ورودی (هنوز بررسی نشده). گام بعد: میز حقوقی ارزیابی پیش از ورود را در /legal باز می‌کند.", "Durum: giriş (henüz incelenmedi). Sonraki adım: masa /legal üzerinden ön değerlendirmeyi açar.") + DISCLAIMER[lang];
        return head + `\n${T(lang, "Status", "وضعیت", "Durum")}: ${a.status} · ${T(lang, "Layer", "لایه", "Katman")}: ${a.layer} · ${T(lang, "Pathway", "مسیر", "Yol")}: ${a.pathway} · ${T(lang, "Structure", "ساختار", "Yapı")}: ${a.structure}${a.lawyer ? ` · ${a.lawyer}` : ""}${a.notes ? `\n${a.notes}` : ""}` + DISCLAIMER[lang];
      }
      return DESK_INTRO[lang] + DISCLAIMER[lang];
    }

    case "legal": {
      if (has(/kimlik|کیملیک|guarantee|تضمین|garanti|residence|اقامت|ikamet|citizen|شهروند|vatandaş/i)) {
        return T(lang,
          "**No.** Sponsors and the platform do **not** guarantee a kimlik, residence permit, work authorization or citizenship. Company registration by itself does not grant these. What we do: connect you with Legal Team 1 (Entry & Settlement) who evaluates lawful pathways — business visa, Türkiye Tech Visa eligibility, short-term residence, or a work permit sponsored by a Turkish entity — case by case. This is professional support, not a promise.",
          "**خیر.** اسپانسرها و پلتفرم هیچ‌کدام کیملیک، اقامت، اجازه کار یا شهروندی را **تضمین نمی‌کنند**. ثبت شرکت به‌خودی‌خود این‌ها را اعطا نمی‌کند. کاری که می‌کنیم: اتصال شما به تیم حقوقی ۱ (ورود و استقرار) که مسیرهای قانونی را مورد به مورد ارزیابی می‌کند — ویزای تجاری، احراز شرایط Türkiye Tech Visa، اقامت کوتاه‌مدت یا اجازه کار از طریق شرکت ترکیه‌ای. این «پشتیبانی حرفه‌ای» است، نه وعده.",
          "**Hayır.** Sponsorlar ve platform kimlik, ikamet, çalışma izni veya vatandaşlığı **garanti etmez**. Şirket kurmak tek başına bunları sağlamaz. Yaptığımız: sizi Hukuk Ekibi 1 (Giriş & Yerleşim) ile buluşturmak; ekip yasal yolları vaka bazında değerlendirir — iş vizesi, Türkiye Tech Visa uygunluğu, kısa dönem ikamet veya Türk şirketi üzerinden çalışma izni. Bu profesyonel destektir, vaat değil.") + DISCLAIMER[lang];
      }
      if (has(/subsidiary|sister|structure|company|زیرمجموعه|ساختار|شرکت|bağlı|kardeş|yapı|şirket/i)) {
        return T(lang,
          `**Entity structure options for ${name}**\n• **Model A – Turkish subsidiary**: Ltd. Şti. owned by the parent. Cleanest for IP and the investor cap table.\n• **Model B – Sister company**: independent Turkish company linked by licence / shareholder agreements. Useful when the parent cannot easily hold foreign shares.\n• **Model C – Turkish operating company**: fresh entity where founders hold shares directly; investors often prefer this for a Türkiye-first raise.\n\nInputs: sanctions/banking constraints, where revenue is booked, investor domicile, IP ownership. Legal Team 1 + an accountant (SMMM) decide; a Ltd. is typically set up in 1–2 weeks via MERSİS, notary, tax office and a Turkish bank account.`,
          `**گزینه‌های ساختار شرکت برای ${name}**\n• **مدل A – زیرمجموعه ترکیه‌ای**: Ltd. Şti. متعلق به شرکت مادر. تمیزترین حالت برای IP و کپ‌تیبل سرمایه‌گذار.\n• **مدل B – Sister Company**: شرکت مستقل ترکیه‌ای با قرارداد لیسانس / سهامداری. وقتی شرکت مادر نمی‌تواند به‌راحتی سهام خارجی نگه دارد.\n• **مدل C – شرکت عملیاتی ترکیه‌ای**: شرکت جدید که مؤسسان مستقیماً سهام دارند؛ سرمایه‌گذاران برای جذب سرمایه Türkiye-first معمولاً این را ترجیح می‌دهند.\n\nورودی‌های تصمیم: محدودیت‌های تحریم/بانکی، محل ثبت درآمد، محل سرمایه‌گذار، مالکیت IP. تیم حقوقی ۱ + حسابدار (SMMM) تصمیم می‌گیرند؛ ثبت Ltd. معمولاً ۱–۲ هفته از طریق MERSİS، دفترخانه، اداره مالیات و حساب بانکی ترکیه طول می‌کشد.`,
          `**${name} için şirket yapısı seçenekleri**\n• **Model A – Türk bağlı ortaklık**: ana şirkete ait Ltd. Şti. Fikri mülkiyet ve yatırımcı cap table için en temiz yol.\n• **Model B – Kardeş şirket**: lisans / pay sahipleri sözleşmesiyle bağlı bağımsız Türk şirketi. Ana şirket yabancı pay tutamıyorsa kullanışlı.\n• **Model C – Türk işletme şirketi**: kurucuların doğrudan pay sahibi olduğu yeni şirket; Türkiye öncelikli yatırım turu için yatırımcılar genelde bunu tercih eder.\n\nKarar girdileri: yaptırım/bankacılık kısıtları, gelirin kaydedildiği yer, yatırımcı ikametgâhı, fikri mülkiyet sahipliği. Hukuk Ekibi 1 + mali müşavir (SMMM) karar verir; Ltd. kuruluşu MERSİS, noter, vergi dairesi ve Türk banka hesabıyla genelde 1–2 hafta sürer.`) + DISCLAIMER[lang];
      }
      return T(lang,
        `**Pre-landing document checklist for ${name}**\n1. Valid passports (6+ months) for all 3 members\n2. Founder agreement & cap table (English)\n3. IP assignment for core tech\n4. Documents of the Iranian entity (if any) + apostille/translation plan\n5. Proof of funds as required by the visa pathway\n6. Pitch deck, one-pager, PoC proposal template\n7. Draft NDA & PoC agreement (Turkish-law templates provided)\n\nLegal Team 1 reviews within 5 business days after selection.`,
        `**چک‌لیست مدارک پیش از ورود برای ${name}**\n۱. پاسپورت معتبر (حداقل ۶ ماه) برای هر ۳ نفر\n۲. قرارداد مؤسسان و کپ‌تیبل (انگلیسی)\n۳. واگذاری IP فناوری اصلی\n۴. مدارک شرکت ایرانی (در صورت وجود) + برنامه آپوستیل/ترجمه\n۵. تمکن مالی مطابق مسیر ویزا\n۶. پیچ‌دک، معرفی یک‌صفحه‌ای، قالب پیشنهاد PoC\n۷. پیش‌نویس NDA و قرارداد PoC (قالب‌های حقوق ترکیه ارائه می‌شود)\n\nتیم حقوقی ۱ ظرف ۵ روز کاری پس از انتخاب بررسی می‌کند.`,
        `**${name} için landing öncesi belge listesi**\n1. 3 üye için geçerli pasaport (6+ ay)\n2. Kurucu sözleşmesi ve cap table (İngilizce)\n3. Temel teknoloji için fikri mülkiyet devri\n4. İran şirketi belgeleri (varsa) + apostil/tercüme planı\n5. Vize yoluna göre mali yeterlilik belgesi\n6. Sunum, tek sayfalık özet, PoC teklif şablonu\n7. NDA ve PoC sözleşmesi taslağı (Türk hukuku şablonları sağlanır)\n\nHukuk Ekibi 1 seçimden sonra 5 iş günü içinde inceler.`) + DISCLAIMER[lang];
    }

    case "match": {
      if (!s) return NO_TEAM[lang];
      const corps = await db.select().from(corporates);
      const ranked = corps.map((c) => ({ c, score: scoreCorporate(s, c) })).sort((a, b) => b.score - a.score).slice(0, 3);
      const fit = T(lang, "fit", "تطابق", "uyum");
      const lf = T(lang, "looking for", "به‌دنبال", "aradığı");
      const offers = (c: (typeof corps)[number]) => [c.offersPoc && "PoC", c.offersOffice && T(lang, "office", "دفتر", "ofis"), c.offersInvestment && T(lang, "investment", "سرمایه", "yatırım")].filter(Boolean).join(" + ");
      const top = ranked[0]?.c.name ?? "—";
      return [
        T(lang, `**Corporate shortlist for ${s.name}** (${s.sector})`, `**فهرست کوتاه شرکت‌ها برای ${s.name}** (${s.sector})`, `**${s.name} için kurumsal kısa liste** (${s.sector})`),
        ...ranked.map(({ c, score }, i) => `${i + 1}. **${c.name}** — ${c.industry}, ${c.city} · ${fit} ${score}% · ${lf}: ${c.lookingFor.join(", ")} · ${offers(c)}`),
        "",
        T(lang,
          `Recommended path: introduce ${s.name} to **${top}** first — a 60-minute discovery meeting, then an 8–12 week PoC with a defined success metric before discussing investment.`,
          `مسیر پیشنهادی: ${s.name} را ابتدا به **${top}** معرفی کنید — جلسه کشف ۶۰ دقیقه‌ای، سپس PoC هشت تا دوازده هفته‌ای با شاخص موفقیت مشخص، و بعد گفت‌وگوی سرمایه‌گذاری.`,
          `Önerilen yol: ${s.name}'i önce **${top}** ile tanıştırın — 60 dakikalık keşif toplantısı, ardından tanımlı başarı metriğiyle 8–12 haftalık PoC, sonra yatırım görüşmesi.`),
      ].join("\n");
    }

    case "investor": {
      if (has(/due diligence|prepare|آماده|hazırlan/i)) {
        return T(lang,
          `**Due-diligence checklist for ${name}**\n1. Cap table + founder agreement (3 founders, vesting)\n2. IP assignment from all team members\n3. 24-month financial model in USD & TRY\n4. Customer contracts / LOIs (Iranian traction + Turkish PoC)\n5. Data room: pitch, demo, metrics, entity plan\n6. Term-sheet basics: SAFE vs. priced round — Legal Team 2 reviews before signing.`,
          `**چک‌لیست Due Diligence برای ${name}**\n۱. کپ‌تیبل + قرارداد مؤسسان (۳ مؤسس، وستینگ)\n۲. واگذاری IP از همه اعضای تیم\n۳. مدل مالی ۲۴ ماهه به دلار و لیر\n۴. قراردادهای مشتری / LOI (ترکشن ایران + PoC ترکیه)\n۵. دیتاروم: پیچ، دمو، شاخص‌ها، برنامه شرکت\n۶. مبانی ترم‌شیت: SAFE یا راند قیمت‌گذاری‌شده — تیم حقوقی ۲ پیش از امضا بررسی می‌کند.`,
          `**${name} için due diligence listesi**\n1. Cap table + kurucu sözleşmesi (3 kurucu, vesting)\n2. Tüm ekip üyelerinden fikri mülkiyet devri\n3. USD ve TL cinsinden 24 aylık finansal model\n4. Müşteri sözleşmeleri / LOI'ler (İran traksiyonu + Türkiye PoC)\n5. Veri odası: sunum, demo, metrikler, şirket planı\n6. Term sheet temelleri: SAFE mi fiyatlı tur mu — imzadan önce Hukuk Ekibi 2 inceler.`);
      }
      if (!s) return NO_TEAM[lang];
      const inv = await db.select().from(investors);
      const ranked = inv.map((i) => ({ i, score: scoreInvestor(s, i) })).sort((a, b) => b.score - a.score).slice(0, 3);
      const fit = T(lang, "fit", "تطابق", "uyum");
      const tickets = T(lang, "tickets", "تیکت", "bilet");
      return [
        T(lang, `**Investor matches for ${s.name}** (stage: ${s.stage}, seeking ${money(s.seekingUsd)})`, `**سرمایه‌گذاران مناسب ${s.name}** (مرحله: ${s.stage}، به‌دنبال ${money(s.seekingUsd)})`, `**${s.name} için yatırımcı eşleşmeleri** (aşama: ${s.stage}, hedef ${money(s.seekingUsd)})`),
        ...ranked.map(({ i, score }, n) => `${n + 1}. **${i.name}** (${i.type}, ${i.city}) · ${fit} ${score}% · ${tickets} ${money(i.ticketMinUsd)}–${money(i.ticketMaxUsd)}`),
        "",
        T(lang, "Tip: investors in this room prioritise teams with a completed corporate PoC. Land → PoC → raise.", "نکته: سرمایه‌گذاران این اتاق تیم‌هایی با PoC شرکتی تکمیل‌شده را در اولویت می‌گذارند. لندینگ ← PoC ← جذب سرمایه.", "İpucu: bu odadaki yatırımcılar tamamlanmış kurumsal PoC'si olan ekiplere öncelik verir. Landing → PoC → yatırım."),
      ].join("\n");
    }

    case "market": {
      const intel = intelFor(s?.sector ?? question, lang);
      const traction = s?.tractionSummary ?? T(lang, "your metrics", "شاخص‌های شما", "metrikleriniz");
      return T(lang,
        `**Türkiye market brief${s ? ` — ${s.sector}` : ""}**\n${intel}\n\n**Go-to-market for ${name}:** use the sponsoring corporate as reference customer, price in USD with TRY invoicing option, and use the technopark route (İTÜ Arı, ODTÜ, Teknopark İstanbul) for R&D tax exemptions. Expect 2–4 local competitors; differentiate on proven traction (${traction}).`,
        `**خلاصه بازار ترکیه${s ? ` — ${s.sector}` : ""}**\n${intel}\n\n**ورود به بازار برای ${name}:** شرکت اسپانسر را مشتری مرجع کنید، قیمت‌گذاری دلاری با امکان فاکتور لیر، و از مسیر تکنوپارک (İTÜ Arı، ODTÜ، Teknopark İstanbul) برای معافیت مالیاتی R&D استفاده کنید. ۲ تا ۴ رقیب محلی انتظار داشته باشید؛ تمایز با ترکشن اثبات‌شده (${traction}).`,
        `**Türkiye pazar özeti${s ? ` — ${s.sector}` : ""}**\n${intel}\n\n**${name} için pazara giriş:** sponsor kurumsalı referans müşteri yapın, USD fiyatlayıp TL fatura seçeneği sunun, Ar-Ge vergi muafiyeti için teknopark yolunu (İTÜ Arı, ODTÜ, Teknopark İstanbul) kullanın. 2–4 yerel rakip bekleyin; kanıtlanmış traksiyonla (${traction}) farklılaşın.`);
    }

    case "media": {
      const tagline = s?.tagline ?? T(lang, "We solve a costly problem for enterprises", "ما یک مشکل پرهزینه سازمان‌ها را حل می‌کنیم", "Kurumların maliyetli bir sorununu çözüyoruz");
      const seeking = s ? money(s.seekingUsd) : T(lang, "a seed round", "راند بذری", "seed turu");
      const sponsorTxt = s?.corporateId ? T(lang, "a corporate sponsor and an active PoC", "یک اسپانسر شرکتی و PoC فعال", "kurumsal sponsor ve aktif PoC") : T(lang, "a corporate shortlist in progress", "فهرست کوتاه شرکتی در حال تهیه", "hazırlanmakta olan kurumsal kısa liste");
      if (has(/pitch|30|پیچ|۳۰/i)) {
        return T(lang,
          `**30-second pitch — ${name}**\n"${tagline}. ${s?.tractionSummary ? `Already: ${s.tractionSummary}.` : ""} We've landed in Türkiye through the Startup Landing Program with ${sponsorTxt}. We're raising ${seeking} to scale across Türkiye and the region. Let's talk."`,
          `**پیچ ۳۰ ثانیه‌ای — ${name}**\n«${tagline}. ${s?.tractionSummary ? `تا امروز: ${s.tractionSummary}.` : ""} ما از طریق برنامه لندینگ استارتاپی با ${sponsorTxt} وارد ترکیه شده‌ایم. برای مقیاس‌پذیری در ترکیه و منطقه ${seeking} جذب می‌کنیم. بیایید صحبت کنیم.»`,
          `**30 saniyelik pitch — ${name}**\n"${tagline}. ${s?.tractionSummary ? `Şimdiden: ${s.tractionSummary}.` : ""} Startup Landing Programı ile ${sponsorTxt} eşliğinde Türkiye'ye geldik. Türkiye ve bölgede ölçeklenmek için ${seeking} topluyoruz. Konuşalım."`);
      }
      return T(lang,
        `**LinkedIn announcement — ${name}**\n\n🚀 ${name} has landed in Istanbul!\n\nWe're joining the Türkiye Startup Landing Program — from exhibition floor to ecosystem. ${s?.tagline ? `Our mission: ${s.tagline.toLowerCase()}.` : ""}\n\nThanks to our Startup Partner Hotel and corporate sponsor for turning empty capacity into startup opportunity. Next 14 days: corporate meetings, PoC kickoff, investor sessions.\n\n#StartupLandingTürkiye #Istanbul #FromExhibitionToEcosystem\n\n📸 Tip: post the 3-person team at the hotel with the sponsor logo visible; tag the hotel and the corporate.`,
        `**پست لینکدین — ${name}**\n\n🚀 ${name} در استانبول فرود آمد!\n\nما به برنامه لندینگ استارتاپی ترکیه پیوستیم — از سالن نمایشگاه تا اکوسیستم. ${s?.tagline ? `مأموریت ما: ${s.tagline}.` : ""}\n\nسپاس از هتل شریک استارتاپی و اسپانسر شرکتی‌مان که ظرفیت خالی را به فرصت استارتاپی تبدیل کردند. ۱۴ روز آینده: جلسات شرکتی، شروع PoC، نشست‌های سرمایه‌گذار.\n\n#StartupLandingTürkiye #Istanbul #FromExhibitionToEcosystem\n\n📸 نکته: عکس تیم ۳ نفره در هتل با لوگوی اسپانسر منتشر کنید؛ هتل و شرکت را تگ کنید.`,
        `**LinkedIn duyurusu — ${name}**\n\n🚀 ${name} İstanbul'a indi!\n\nTürkiye Startup Landing Programı'na katılıyoruz — fuar alanından ekosisteme. ${s?.tagline ? `Misyonumuz: ${s.tagline}.` : ""}\n\nBoş kapasiteyi startup fırsatına dönüştüren Startup Partner Otelimize ve kurumsal sponsorumuza teşekkürler. Önümüzdeki 14 gün: kurumsal toplantılar, PoC başlangıcı, yatırımcı oturumları.\n\n#StartupLandingTürkiye #İstanbul #FuardanEkosisteme\n\n📸 İpucu: 3 kişilik ekibi otelde sponsor logosu görünür şekilde paylaşın; oteli ve şirketi etiketleyin.`);
    }

    case "schedule": {
      const step = s?.landingStep ?? 0;
      const hotel = s?.hotelId ? (await db.select().from(hotels).where(eq(hotels.id, s.hotelId)))[0] : null;
      const corp = s?.corporateId ? (await db.select().from(corporates).where(eq(corporates.id, s.corporateId)))[0] : null;
      const hotelName = hotel?.name ?? T(lang, "partner hotel", "هتل شریک", "ortak otel");
      const corpName = corp?.name ?? T(lang, "shortlisted corporates", "شرکت‌های فهرست کوتاه", "kısa listedeki kurumsallar");
      if (has(/14|week|full|۱۴|هفته|کامل|hafta|tam/i)) {
        return T(lang,
          `**14-day landing schedule — ${name}**\nDay 1–2: Arrival, check-in at ${hotelName}, Legal Team 1 onboarding\nDay 3–4: Market briefing, ecosystem tour (technopark, coworking)\nDay 5–7: Corporate meetings (${corpName}), PoC scoping\nDay 8–9: Entity structure decision, bank & tax appointments\nDay 10–11: Investor prep with Legal Team 2, pitch rehearsal\nDay 12: Demo Day at partner hotel\nDay 13: Investor meetings\nDay 14: PoC agreement signing, departure or extended-stay planning`,
          `**برنامه ۱۴ روزه لندینگ — ${name}**\nروز ۱–۲: ورود، اقامت در ${hotelName}، آشنایی با تیم حقوقی ۱\nروز ۳–۴: بریفینگ بازار، تور اکوسیستم (تکنوپارک، کوورکینگ)\nروز ۵–۷: جلسات شرکتی (${corpName})، تعریف PoC\nروز ۸–۹: تصمیم ساختار شرکت، نوبت بانک و مالیات\nروز ۱۰–۱۱: آماده‌سازی سرمایه‌گذار با تیم حقوقی ۲، تمرین پیچ\nروز ۱۲: دمو دی در هتل شریک\nروز ۱۳: جلسات سرمایه‌گذار\nروز ۱۴: امضای قرارداد PoC، بازگشت یا برنامه اقامت طولانی‌تر`,
          `**14 günlük landing programı — ${name}**\nGün 1–2: Varış, ${hotelName} girişi, Hukuk Ekibi 1 tanışması\nGün 3–4: Pazar brifingi, ekosistem turu (teknopark, coworking)\nGün 5–7: Kurumsal toplantılar (${corpName}), PoC kapsamı\nGün 8–9: Şirket yapısı kararı, banka ve vergi randevuları\nGün 10–11: Hukuk Ekibi 2 ile yatırımcı hazırlığı, pitch provası\nGün 12: Ortak otelde Demo Günü\nGün 13: Yatırımcı toplantıları\nGün 14: PoC sözleşmesi imzası, dönüş veya uzatılmış kalış planı`);
      }
      const curStep = stepName(step, lang);
      const nextStep = stepName(Math.min(step + 1, 9), lang);
      const l10 = step < 5 ? T(lang, "Legal Team 1: document review", "تیم حقوقی ۱: بررسی مدارک", "Hukuk Ekibi 1: belge incelemesi") : T(lang, "Investor A: intro call", "سرمایه‌گذار A: تماس معارفه", "Yatırımcı A: tanışma görüşmesi");
      const l13 = corp ? `${corp.name}: ${step >= 6 ? T(lang, "PoC status review", "بازبینی وضعیت PoC", "PoC durum incelemesi") : T(lang, "discovery meeting", "جلسه کشف", "keşif toplantısı")}` : T(lang, "Corporate shortlist review with Business Match AI", "بازبینی فهرست کوتاه شرکتی با دستیار تطبیق", "İş Eşleştirme AI ile kurumsal kısa liste incelemesi");
      const l15 = step >= 7 ? T(lang, "Legal Team 2: term-sheet prep", "تیم حقوقی ۲: آماده‌سازی ترم‌شیت", "Hukuk Ekibi 2: term sheet hazırlığı") : T(lang, "Market AI briefing on Turkish competitors", "بریفینگ دستیار بازار درباره رقبای ترک", "Pazar AI: Türk rakipler brifingi");
      const l17 = hotel ? T(lang, `Demo rehearsal in ${hotel.name} meeting room`, `تمرین دمو در سالن جلسات ${hotel.name}`, `${hotel.name} toplantı salonunda demo provası`) : T(lang, "Hotel assignment pending — sponsor matching", "تخصیص هتل در انتظار — تطبیق اسپانسر", "Otel ataması bekliyor — sponsor eşleştirme");
      return T(lang,
        `**Today's agenda — ${name}** (current step: ${curStep})\n10:00 — ${l10}\n13:00 — ${l13}\n15:00 — ${l15}\n17:00 — ${l17}\n\nNext milestone: ${nextStep}.`,
        `**برنامه امروز — ${name}** (مرحله فعلی: ${curStep})\n۱۰:۰۰ — ${l10}\n۱۳:۰۰ — ${l13}\n۱۵:۰۰ — ${l15}\n۱۷:۰۰ — ${l17}\n\nنقطه عطف بعدی: ${nextStep}.`,
        `**Bugünün ajandası — ${name}** (mevcut adım: ${curStep})\n10:00 — ${l10}\n13:00 — ${l13}\n15:00 — ${l15}\n17:00 — ${l17}\n\nSonraki kilometre taşı: ${nextStep}.`);
    }
  }
  void q;
  return "";
}
