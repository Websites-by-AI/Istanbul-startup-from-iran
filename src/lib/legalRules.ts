import type { Lang } from "@/lib/navigator";

type Tri = { en: string; fa: string; tr: string };

export type LegalRule = {
  key: string;
  title: Tri;
  summary: Tri;
  implication: Tri; // what it means for the landing program
  source: { label: string; url: string };
  verified: string; // date we checked
};

export const LEGAL_RULES: LegalRule[] = [
  {
    key: "visa_exemption",
    title: { en: "Iranian citizens: 90-day visa exemption", fa: "شهروندان ایرانی: معافیت ویزای ۹۰ روزه", tr: "İran vatandaşları: 90 gün vize muafiyeti" },
    summary: {
      en: "Iranian passport holders may enter Türkiye without a visa for up to 90 days within any 180-day period, for tourism and short business purposes (meetings, exhibitions). Passport must be valid ≥ 60 days beyond the stay (≈150 days). Working is not allowed during the exemption.",
      fa: "دارندگان پاسپورت ایرانی می‌توانند بدون ویزا تا ۹۰ روز در هر دوره ۱۸۰ روزه برای گردشگری و امور تجاری کوتاه (جلسه، نمایشگاه) وارد ترکیه شوند. پاسپورت باید حداقل ۶۰ روز بیش از مدت اقامت اعتبار داشته باشد (~۱۵۰ روز). کار در دوره معافیت مجاز نیست.",
      tr: "İran pasaportu sahipleri turizm ve kısa iş amaçlı (toplantı, fuar) 180 günlük dönemde 90 güne kadar vizesiz giriş yapabilir. Pasaport kalıştan en az 60 gün fazla geçerli olmalı (≈150 gün). Muafiyet süresinde çalışmak yasaktır.",
    },
    implication: {
      en: "The 14-day landing (exhibition + meetings + PoC scoping) fits the exemption. Any paid work, employment or actively running the Turkish company requires a work permit.",
      fa: "لندینگ ۱۴ روزه (نمایشگاه + جلسات + تعریف PoC) در چارچوب معافیت می‌گنجد. هرگونه کار با دستمزد، استخدام یا اداره فعال شرکت ترکیه‌ای نیاز به اجازه کار دارد.",
      tr: "14 günlük landing (fuar + toplantılar + PoC kapsamı) muafiyete uyar. Ücretli iş, istihdam veya Türk şirketini aktif yönetmek çalışma izni gerektirir.",
    },
    source: { label: "Law No. 6458, Art. 20 (goc.gov.tr)", url: "https://en.goc.gov.tr/kurumlar/en.goc/Ingilizce-kanun/Law-on-Foreigners-and-International-Protection.pdf" },
    verified: "2026-09",
  },
  {
    key: "short_term_residence",
    title: { en: "Short-term residence permit (Art. 31/c)", fa: "اقامت کوتاه‌مدت (ماده ۳۱/ج)", tr: "Kısa dönem ikamet izni (Md. 31/c)" },
    summary: {
      en: "Law 6458 Art. 31(1)(c): foreigners who 'establish business or commercial connections' may be granted a short-term residence permit, issued for up to 2 years at a time (typically 1 year first). Requires an active company, a real workplace address, proof of income and health insurance.",
      fa: "ماده ۳۱(۱)(ج) قانون ۶۴۵۸: خارجیانی که «کسب‌وکار یا ارتباط تجاری ایجاد می‌کنند» می‌توانند اقامت کوتاه‌مدت بگیرند؛ هر بار حداکثر ۲ سال (معمولاً ابتدا ۱ سال). نیازمند شرکت فعال، آدرس واقعی محل کار، اثبات درآمد و بیمه درمانی.",
      tr: "6458 sayılı Kanun Md. 31(1)(c): 'ticari bağlantı veya iş kuracak' yabancılara her seferinde en fazla 2 yıllık (genelde ilk 1 yıl) kısa dönem ikamet izni verilebilir. Aktif şirket, gerçek işyeri adresi, gelir belgesi ve sağlık sigortası gerekir.",
    },
    implication: {
      en: "Realistic route for founders after the PoC when a Turkish entity exists. It allows residence, not employment — pair it with a work permit for anyone who will actually work.",
      fa: "مسیر واقع‌بینانه برای مؤسسان پس از PoC وقتی شرکت ترکیه‌ای وجود دارد. اقامت می‌دهد نه حق کار — برای کسی که واقعاً کار می‌کند باید با اجازه کار همراه شود.",
      tr: "Türk şirketi kurulduktan ve PoC sonrasında kurucular için gerçekçi yol. İkamet sağlar, çalışma hakkı değil — fiilen çalışacak kişi için çalışma izniyle birleştirilmeli.",
    },
    source: { label: "Law No. 6458, Art. 31 (goc.gov.tr)", url: "https://en.goc.gov.tr/kurumlar/en.goc/Ingilizce-kanun/Law-on-Foreigners-and-International-Protection.pdf" },
    verified: "2026-09",
  },
  {
    key: "company_formation",
    title: { en: "Company formation: 100% foreign ownership, Ltd. Şti. min. 50,000 TL", fa: "ثبت شرکت: مالکیت ۱۰۰٪ خارجی، Ltd. Şti. حداقل ۵۰٬۰۰۰ لیر", tr: "Şirket kuruluşu: %100 yabancı sermaye, Ltd. Şti. asgari 50.000 TL" },
    summary: {
      en: "Since 1 Jan 2024 (Decree 7887 / TCC Art. 580): Ltd. Şti. minimum capital 50,000 TL (payable within 24 months); A.Ş. 250,000 TL (25% paid before registry). 100% foreign shareholding is allowed, no Turkish partner required. Registration via MERSİS + trade registry, tax office, potential tax ID for founders, bank account. Typically 1–2 weeks.",
      fa: "از ۱ ژانویه ۲۰۲۴ (فرمان ۷۸۸۷ / ماده ۵۸۰ قانون تجارت): حداقل سرمایه Ltd. Şti. ۵۰٬۰۰۰ لیر (قابل پرداخت ظرف ۲۴ ماه)؛ A.Ş. ۲۵۰٬۰۰۰ لیر (۲۵٪ پیش از ثبت). سهامداری ۱۰۰٪ خارجی مجاز است و شریک ترک لازم نیست. ثبت از طریق MERSİS + اداره ثبت تجاری، اداره مالیات، شماره مالیاتی موقت مؤسسان، حساب بانکی. معمولاً ۱–۲ هفته.",
      tr: "1 Ocak 2024'ten itibaren (7887 sayılı Karar / TTK Md. 580): Ltd. Şti. asgari sermaye 50.000 TL (24 ay içinde ödenebilir); A.Ş. 250.000 TL (%25 tescil öncesi). %100 yabancı ortaklık serbest, Türk ortak gerekmez. MERSİS + ticaret sicili, vergi dairesi, kurucular için potansiyel vergi numarası, banka hesabı. Genelde 1–2 hafta.",
    },
    implication: {
      en: "Investor-bound cap tables usually prefer A.Ş. (share transfers without notary). For a first PoC entity an Ltd. is cheaper and faster; convert later.",
      fa: "کپ‌تیبل‌هایی که قرار است سرمایه جذب کنند معمولاً A.Ş. را ترجیح می‌دهند (انتقال سهام بدون دفترخانه). برای اولین شرکت PoC، Ltd. ارزان‌تر و سریع‌تر است؛ بعداً تبدیل کنید.",
      tr: "Yatırım turuna gidecek cap table'lar genelde A.Ş. tercih eder (noter gerektirmeyen pay devri). İlk PoC şirketi için Ltd. daha ucuz ve hızlı; sonra dönüştürün.",
    },
    source: { label: "Invest in Türkiye — Establishing a Business", url: "https://www.invest.gov.tr/en/investmentguide/pages/establishing-a-business.aspx" },
    verified: "2026-09",
  },
  {
    key: "work_permit_shareholder",
    title: { en: "Work permit for a foreign shareholder ≠ company formation", fa: "اجازه کار سهامدار خارجی ≠ ثبت شرکت", tr: "Yabancı ortak çalışma izni ≠ şirket kuruluşu" },
    summary: {
      en: "Law 6735 (International Labour Force): owning shares does not authorise work. Ministry of Labour assessment criteria for a shareholder work permit currently require ~500,000 TL paid-in capital, ≥20% shareholding, and 5 Turkish employees per foreign worker (waived for the first 6 months of the first permit). A work permit also serves as a residence permit.",
      fa: "قانون ۶۷۳۵ (نیروی کار بین‌المللی): داشتن سهام حق کار نمی‌دهد. معیارهای فعلی وزارت کار برای اجازه کار سهامدار: حدود ۵۰۰٬۰۰۰ لیر سرمایه پرداخت‌شده، حداقل ۲۰٪ سهام و ۵ کارمند ترک به ازای هر خارجی (۶ ماه اول اولین مجوز معاف). اجازه کار به‌جای اقامت هم معتبر است.",
      tr: "6735 sayılı Uluslararası İşgücü Kanunu: pay sahipliği çalışma hakkı vermez. Bakanlığın ortak çalışma izni kriterleri: ~500.000 TL ödenmiş sermaye, ≥%20 pay ve her yabancı için 5 Türk çalışan (ilk iznin ilk 6 ayında aranmaz). Çalışma izni ikamet izni yerine de geçer.",
    },
    implication: {
      en: "For a 3-founder team this is capital-heavy (≈3 × 500k TL or fewer working founders). Plan: one founder on a work permit first, others on business travel / short-term residence, or use Tech Visa if eligible.",
      fa: "برای تیم ۳ مؤسس سرمایه‌بر است (≈۳ × ۵۰۰ هزار لیر یا مؤسسان شاغل کمتر). برنامه: ابتدا یک مؤسس با اجازه کار، بقیه با سفر تجاری / اقامت کوتاه‌مدت، یا در صورت احراز شرایط Tech Visa.",
      tr: "3 kuruculu ekip için sermaye yoğun (≈3 × 500 bin TL veya daha az çalışan kurucu). Plan: önce bir kurucu çalışma izniyle, diğerleri iş seyahati / kısa dönem ikametle; uygunsa Tech Visa.",
    },
    source: { label: "Ministry of Labour (csgb.gov.tr) criteria; Law 6735", url: "https://www.csgb.gov.tr/uigm/" },
    verified: "2026-09",
  },
  {
    key: "tech_visa",
    title: { en: "Türkiye Tech Visa (3-year work permit)", fa: "Türkiye Tech Visa (اجازه کار ۳ ساله)", tr: "Türkiye Tech Visa (3 yıllık çalışma izni)" },
    summary: {
      en: "Launched Sept 2024 by the Ministry of Industry & Technology with the Ministry of Labour. Two tracks: qualified tech talent and startup founders. Successful applicants get a 3-year work permit, 6 months of consultancy, and access to technopark incentives. Founders apply with a business plan via the official portal; a Turkish entity is expected.",
      fa: "سپتامبر ۲۰۲۴ توسط وزارت صنعت و فناوری با همکاری وزارت کار راه‌اندازی شد. دو مسیر: استعداد فناوری و مؤسس استارتاپ. پذیرفته‌شدگان اجازه کار ۳ ساله، ۶ ماه مشاوره و دسترسی به مشوق‌های تکنوپارک می‌گیرند. مؤسسان با طرح کسب‌وکار از پورتال رسمی اقدام می‌کنند؛ وجود شرکت ترکیه‌ای انتظار می‌رود.",
      tr: "Eylül 2024'te Sanayi ve Teknoloji Bakanlığı ile Çalışma Bakanlığı tarafından başlatıldı. İki kanal: nitelikli teknoloji yeteneği ve startup kurucuları. Kabul edilenler 3 yıllık çalışma izni, 6 ay danışmanlık ve teknopark teşviklerine erişim alır. Kurucular iş planıyla resmi portaldan başvurur; Türk şirketi beklenir.",
    },
    implication: {
      en: "Best-fit route for the program's teams: apply after the PoC with the corporate sponsor's LOI attached. Not automatic — the Desk must check current eligibility criteria per applicant.",
      fa: "مناسب‌ترین مسیر برای تیم‌های برنامه: پس از PoC با پیوست LOI اسپانسر شرکتی اقدام کنید. خودکار نیست — میز حقوقی باید معیارهای فعلی را برای هر متقاضی بررسی کند.",
      tr: "Program ekipleri için en uygun yol: PoC sonrası kurumsal sponsorun LOI'siyle başvurun. Otomatik değil — Masa her başvuran için güncel kriterleri kontrol etmeli.",
    },
    source: { label: "techvisa.gov.tr", url: "https://www.techvisa.gov.tr/" },
    verified: "2026-09",
  },
  {
    key: "foreign_lawyers",
    title: { en: "Foreign lawyers may not practise Turkish law", fa: "وکلای خارجی نمی‌توانند در حقوق ترکیه وکالت کنند", tr: "Yabancı avukatlar Türk hukukunda vekillik yapamaz" },
    summary: {
      en: "Attorneyship Law No. 1136: practice of law is reserved to Turkish citizens registered with a bar. Foreign law firms may operate in Türkiye only as partnerships giving advice on foreign and international law (Art. 44/B). Iranian counsel therefore acts as consultant/coordinator; Turkish-licensed avukats sign, file and advise on Turkish law.",
      fa: "قانون وکالت شماره ۱۱۳۶: وکالت مختص شهروندان ترکیه‌ای عضو کانون است. دفاتر حقوقی خارجی فقط به‌صورت مشارکت برای مشاوره در حقوق خارجی و بین‌الملل می‌توانند فعالیت کنند (ماده ۴۴/ب). بنابراین مشاور ایرانی نقش مشاور/هماهنگ‌کننده دارد؛ وکلای دارای پروانه ترکیه امضا، ثبت و مشاوره حقوق ترکیه را انجام می‌دهند.",
      tr: "1136 sayılı Avukatlık Kanunu: avukatlık, baroya kayıtlı Türk vatandaşlarına özgüdür. Yabancı hukuk büroları yalnızca yabancı ve uluslararası hukuk danışmanlığı yapan ortaklıklar olarak faaliyet gösterebilir (Md. 44/B). İranlı danışman koordinatör rolündedir; Türkiye'de ruhsatlı avukatlar imzalar, dosyalar ve Türk hukukunda danışmanlık verir.",
    },
    implication: {
      en: "The Legal Desk must be structured as: Iranian–Turkish coordination team + Turkish bar-registered attorneys of record. Marketing must not present foreign consultants as Turkish lawyers.",
      fa: "میز حقوقی باید این‌گونه ساختار یابد: تیم هماهنگی ایرانی–ترکیه‌ای + وکلای عضو کانون ترکیه به‌عنوان وکیل پرونده. در بازاریابی نباید مشاوران خارجی به‌عنوان وکیل ترک معرفی شوند.",
      tr: "Hukuk Masası şöyle yapılandırılmalı: İran–Türkiye koordinasyon ekibi + baroya kayıtlı Türk avukatlar. Pazarlamada yabancı danışmanlar Türk avukat olarak sunulmamalı.",
    },
    source: { label: "Union of Turkish Bar Associations (TBB)", url: "https://www.barobirlik.org.tr/en/legal-profession" },
    verified: "2026-09",
  },
  {
    key: "no_guarantee",
    title: { en: "No kimlik / residence / citizenship guarantee", fa: "بدون تضمین کیملیک / اقامت / شهروندی", tr: "Kimlik / ikamet / vatandaşlık garantisi yok" },
    summary: {
      en: "Citizenship by investment starts at USD 400,000 (real estate) or USD 500,000 (capital/deposit) — unrelated to startup landing. Residence and work permits are discretionary administrative decisions.",
      fa: "شهروندی از طریق سرمایه‌گذاری از ۴۰۰ هزار دلار (ملک) یا ۵۰۰ هزار دلار (سرمایه/سپرده) شروع می‌شود — ربطی به لندینگ استارتاپ ندارد. اقامت و اجازه کار تصمیمات اداری صلاحدیدی هستند.",
      tr: "Yatırım yoluyla vatandaşlık 400.000 USD (gayrimenkul) veya 500.000 USD (sermaye/mevduat) ile başlar — startup landing ile ilgisizdir. İkamet ve çalışma izinleri takdire bağlı idari kararlardır.",
    },
    implication: {
      en: "All platform, sponsor and hotel materials must say 'Legal & Immigration Support', never 'guaranteed kimlik'.",
      fa: "همه مطالب پلتفرم، اسپانسر و هتل باید بگویند «پشتیبانی حقوقی و مهاجرتی»، هرگز «کیملیک تضمینی».",
      tr: "Tüm platform, sponsor ve otel materyalleri 'Hukuki ve Göç Desteği' demeli, asla 'garantili kimlik' dememeli.",
    },
    source: { label: "Invest in Türkiye — FDI Strategy 2024–2028", url: "https://www.invest.gov.tr/en/pages/fdi-strategy.aspx" },
    verified: "2026-09",
  },
];

export type PathwayInput = { days: number; willWork: boolean; hasEntity: boolean; capitalTl: number; techFounder: boolean; hasCorporateLoi: boolean };

export function recommendPathway(i: PathwayInput, lang: Lang): { route: string; steps: string[]; rulesUsed: string[] } {
  const t = (en: string, fa: string, tr: string) => ({ en, fa, tr })[lang];
  if (i.days <= 90 && !i.willWork) {
    return {
      route: t("Visa exemption (≤ 90 days, no work)", "معافیت ویزا (≤ ۹۰ روز، بدون کار)", "Vize muafiyeti (≤ 90 gün, çalışma yok)"),
      steps: [
        t("Enter visa-free; keep passport ≥ 150 days valid, return ticket, hotel confirmation.", "ورود بدون ویزا؛ پاسپورت ≥ ۱۵۰ روز اعتبار، بلیت برگشت، تأیید هتل.", "Vizesiz giriş; pasaport ≥ 150 gün geçerli, dönüş bileti, otel onayı."),
        t("Meetings, exhibition, PoC scoping and NDA/LOI signing are allowed; no paid work.", "جلسه، نمایشگاه، تعریف PoC و امضای NDA/LOI مجاز است؛ کار با دستمزد نه.", "Toplantı, fuar, PoC kapsamı ve NDA/LOI imzası serbest; ücretli iş yok."),
        t("Track the 90/180 counter for all three founders.", "شمارنده ۹۰/۱۸۰ را برای هر سه مؤسس پیگیری کنید.", "Üç kurucu için 90/180 sayacını takip edin."),
      ],
      rulesUsed: ["visa_exemption", "no_guarantee"],
    };
  }
  if (i.techFounder && i.hasEntity && i.hasCorporateLoi) {
    return {
      route: t("Türkiye Tech Visa — founder track", "Türkiye Tech Visa — مسیر مؤسس", "Türkiye Tech Visa — kurucu kanalı"),
      steps: [
        t("Prepare business plan + Turkish entity documents + corporate sponsor LOI.", "طرح کسب‌وکار + مدارک شرکت ترکیه‌ای + LOI اسپانسر شرکتی را آماده کنید.", "İş planı + Türk şirket belgeleri + kurumsal sponsor LOI hazırlayın."),
        t("Apply via techvisa.gov.tr; Desk checks current eligibility criteria per founder.", "از techvisa.gov.tr اقدام کنید؛ میز حقوقی معیارهای فعلی را برای هر مؤسس بررسی می‌کند.", "techvisa.gov.tr üzerinden başvurun; Masa her kurucu için güncel kriterleri kontrol eder."),
        t("If approved: 3-year work permit (doubles as residence) + technopark incentives.", "در صورت تأیید: اجازه کار ۳ ساله (به‌جای اقامت هم) + مشوق‌های تکنوپارک.", "Onaylanırsa: 3 yıllık çalışma izni (ikamet yerine geçer) + teknopark teşvikleri."),
      ],
      rulesUsed: ["tech_visa", "company_formation", "no_guarantee"],
    };
  }
  if (i.hasEntity && i.capitalTl >= 500000) {
    return {
      route: t("Shareholder work permit (Law 6735)", "اجازه کار سهامدار (قانون ۶۷۳۵)", "Ortak çalışma izni (6735)"),
      steps: [
        t("Company paid-in capital ≥ 500,000 TL, founder holds ≥ 20%.", "سرمایه پرداخت‌شده ≥ ۵۰۰٬۰۰۰ لیر، سهم مؤسس ≥ ۲۰٪.", "Ödenmiş sermaye ≥ 500.000 TL, kurucu payı ≥ %20."),
        t("Apply via e-Devlet with KEP + e-signature; 5 Turkish employees required from month 7.", "اقدام از e-Devlet با KEP + امضای الکترونیک؛ از ماه هفتم ۵ کارمند ترک لازم است.", "KEP + e-imza ile e-Devlet üzerinden başvuru; 7. aydan itibaren 5 Türk çalışan gerekir."),
        t("Other founders: business travel or short-term residence until their own permits.", "سایر مؤسسان: سفر تجاری یا اقامت کوتاه‌مدت تا دریافت مجوز خودشان.", "Diğer kurucular: kendi izinlerine kadar iş seyahati veya kısa dönem ikamet."),
      ],
      rulesUsed: ["work_permit_shareholder", "company_formation", "no_guarantee"],
    };
  }
  if (i.hasEntity) {
    return {
      route: t("Short-term residence (Art. 31/c) + later work permit", "اقامت کوتاه‌مدت (ماده ۳۱/ج) + اجازه کار بعدی", "Kısa dönem ikamet (Md. 31/c) + sonra çalışma izni"),
      steps: [
        t("Founder is registered partner/manager; company shows real activity (tax plate, lease, invoices).", "مؤسس شریک/مدیر ثبت‌شده است؛ شرکت فعالیت واقعی نشان می‌دهد (پلاک مالیاتی، اجاره‌نامه، فاکتور).", "Kurucu kayıtlı ortak/müdür; şirket gerçek faaliyet gösterir (vergi levhası, kira, fatura)."),
        t("Apply at Göç İdaresi with income proof + health insurance; usually 1 year, renewable.", "اقدام در اداره مهاجرت با اثبات درآمد + بیمه درمانی؛ معمولاً ۱ سال، قابل تمدید.", "Gelir belgesi + sağlık sigortasıyla Göç İdaresi'ne başvuru; genelde 1 yıl, yenilenebilir."),
        t("Do not work on this permit; raise capital or apply to Tech Visa before actively operating.", "با این اقامت کار نکنید؛ پیش از فعالیت اجرایی سرمایه افزایش دهید یا برای Tech Visa اقدام کنید.", "Bu izinle çalışmayın; fiilen faaliyet öncesi sermaye artırın veya Tech Visa'ya başvurun."),
      ],
      rulesUsed: ["short_term_residence", "work_permit_shareholder", "no_guarantee"],
    };
  }
  return {
    route: t("Form the Turkish entity first", "ابتدا شرکت ترکیه‌ای را ثبت کنید", "Önce Türk şirketini kurun"),
    steps: [
      t("Choose Ltd. (50,000 TL, fast) or A.Ş. (250,000 TL, investor-friendly) with Legal Team 1 + SMMM.", "با تیم حقوقی ۱ + حسابدار Ltd. (۵۰٬۰۰۰ لیر، سریع) یا A.Ş. (۲۵۰٬۰۰۰ لیر، مناسب سرمایه‌گذار) را انتخاب کنید.", "Hukuk Ekibi 1 + SMMM ile Ltd. (50.000 TL, hızlı) veya A.Ş. (250.000 TL, yatırımcı dostu) seçin."),
      t("Potential tax IDs, notarised passports, registered address (hotel coworking may qualify if lease allows).", "شماره مالیاتی موقت، پاسپورت‌های دفترخانه‌ای، آدرس ثبتی (کوورکینگ هتل در صورت اجازه اجاره‌نامه).", "Potansiyel vergi numarası, noterli pasaport, tescilli adres (kira izin veriyorsa otel coworking olabilir)."),
      t("Then re-run this advisor for the residence / work-permit route.", "سپس این مشاور را برای مسیر اقامت / اجازه کار دوباره اجرا کنید.", "Sonra ikamet / çalışma izni yolu için bu danışmanı yeniden çalıştırın."),
    ],
    rulesUsed: ["company_formation", "visa_exemption", "no_guarantee"],
  };
}
