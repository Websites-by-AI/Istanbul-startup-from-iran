// The bot brain for Cloudflare Pages — same behaviour as bot/core.py, stateless.
//
// The Python service keeps its own JSON state on disk. Pages Functions are
// stateless, so the conversation state (language, open intake draft, current
// case) travels with the request and is returned to the client, which stores it
// in localStorage. Every channel therefore still shares one brain.

import * as ld from "./legal_desk.js";
import * as nav from "./navigator.js";
import * as safe from "./safety.js";
import * as sp from "./sponsors.js";
import { deckMarkdown, deckHtml, deckPdf, deckFilename, defaultOptions } from "./deck.js";
import DATA from "./data.js";

export const T = {
  greeting: {
    en: "Hello 👋 I'm the AI Startup Navigator of the Türkiye Startup Landing Platform.",
    fa: "سلام 👋 من «AI Startup Navigator» پلتفرم Startup Landing ترکیه هستم.",
    tr: "Merhaba 👋 Ben Türkiye Startup Landing Platform'un Yapay Zekâ Startup Rehberiyim.",
  },
  menu: {
    en: "Here is what I can do:",
    fa: "کارهایی که می‌توانم انجام دهم:",
    tr: "Yapabileceklerim:",
  },
  escalated: {
    en: "👤 I've flagged this file for a licensed legal professional. The Legal Desk will continue with you.",
    fa: "👤 این پرونده برای وکیل دارای پروانه علامت‌گذاری شد. میز حقوقی ادامه را با شما پیش می‌برد.",
    tr: "👤 Bu dosya ruhsatlı bir hukukçu için işaretlendi. Hukuk Masası sizinle devam edecek.",
  },
  unknown: {
    en: "I didn't catch that. Pick an option below, or type /help.",
    fa: "متوجه نشدم. یکی از گزینه‌های زیر را انتخاب کنید یا /help را بفرستید.",
    tr: "Anlayamadım. Aşağıdaki seçeneklerden birini seçin veya /help yazın.",
  },
};

const tr = (key, language) => (T[key] || {})[language] || (T[key] || {}).en || "";

const SUMMARY = {
  legal_desk: {
    fa: "میز حقوقی استارتاپ ایران–ترکیه: اولین نقطه تماس حقوقی تیم‌های انتخاب‌شده، در دو لایه (ورود به بازار / سرمایه‌گذاری و رشد).",
    tr: "İran–Türkiye Startup Hukuk Masası: seçilen takımların ilk hukuki temas noktası; iki katman (pazara giriş / yatırım ve büyüme).",
  },
  residence: {
    fa: "درباره ویزا، اقامت، کیملیک و اجازه کار هیچ نتیجه‌ای تضمین نمی‌شود؛ پرونده شما به وکیل دارای پروانه ارجاع شد.",
    tr: "Vize, oturum, kimlik ve çalışma izni konusunda hiçbir sonuç garanti edilmez; dosyanız ruhsatlı avukata iletildi.",
  },
  company_formation: {
    fa: "انواع ساختار شرکت در ترکیه فقط به‌صورت «گزینه» ارائه می‌شود؛ انتخاب نهایی با وکیل و حسابدار است.",
    tr: "Türkiye'deki şirket yapıları yalnızca seçenek olarak listelenir; nihai karar avukat ve mali müşavire aittir.",
  },
  investment: {
    fa: "لایه ۲ — حقوق سرمایه‌گذاری و رشد: از آمادگی جذب سرمایه تا قرارداد سهامداران و diligence.",
    tr: "Katman 2 — Yatırım ve Büyüme Hukuku: yatırım hazırlığından hissedarlar sözleşmesine kadar.",
  },
  ip: {
    fa: "فهرست آماده‌سازی مالکیت فکری؛ مسیر انتقال یا مجوز IP را وکیل تعیین می‌کند.",
    tr: "Fikri mülkiyet hazırlık listesi; devir veya lisans yolunu avukat belirler.",
  },
  intake: {
    fa: "فرم پذیرش حقوقی استارتاپ — پاسخ‌ها مستقیماً به پرونده میز حقوقی می‌رود.",
    tr: "Startup Hukuk Başvuru Formu — yanıtlar doğrudan Hukuk Masası dosyasına gider.",
  },
  intake_complete: {
    fa: "فرم پذیرش کامل شد؛ ارزیابی پیش از فرود تولید و پرونده به وکیل ارجاع شد.",
    tr: "Başvuru tamamlandı; ön iniş değerlendirmesi oluşturuldu ve dosya avukata iletildi.",
  },
  assessment: {
    fa: "ارزیابی آمادگی پیش از فرود: امتیاز، پرچم‌های قرمز، فهرست مدارک و پرسش‌هایی که وکیل باید پاسخ دهد.",
    tr: "Ön iniş hazırlık değerlendirmesi: puan, kritik noktalar, belge listesi ve avukatın yanıtlayacağı sorular.",
  },
  journey: {
    fa: "مسیر شش‌مرحله‌ای: انتخاب → ارزیابی حقوقی → ورود → ساختار شرکت → شروع تجاری → سرمایه‌گذاری.",
    tr: "Altı adımlı süreç: seçim → hukuki değerlendirme → giriş → şirket yapısı → ticari başlangıç → yatırım.",
  },
  hotels: {
    fa: "نقشه هتل‌های اسپانسر: ظرفیت اتاق رایگان/تخفیف‌دار به‌جای پول نقد، به همراه خدمات هر هتل.",
    tr: "Sponsor otel haritası: nakit yerine ücretsiz/indirimli oda kapasitesi ve otel hizmetleri.",
  },
  corporate: {
    fa: "اسپانسری شرکتی: شرکت ترکیه‌ای یک تیم سه‌نفره را اسپانسر می‌کند و پس از PoC به قرارداد یا سرمایه‌گذاری می‌رسد.",
    tr: "Kurumsal sponsorluk: Türk şirketi üç kişilik takımı destekler, PoC sonrası sözleşme veya yatırıma dönüşür.",
  },
  pilot: {
    fa: "پایلوت استانبول: ۱۰ تیم سه‌نفره (۳۰ نفر) با قیف قابل اندازه‌گیری.",
    tr: "İstanbul pilotu: üçer kişilik 10 takım (30 kişi), ölçülebilir huni.",
  },
  metrics: {
    fa: "شاخص‌های موفقیت پایلوت + شمارنده‌های پلتفرم.",
    tr: "Pilot başarı metrikleri + platform sayaçları.",
  },
  human: {
    fa: "پرونده شما به انسان (وکیل دارای پروانه یا تیم عملیات) تحویل شد.",
    tr: "Dosyanız bir insana (ruhsatlı avukat veya operasyon ekibi) devredildi.",
  },
  deck: {
    fa: "دک شراکت مخصوص گروه حقوقی تولید شد (بازتعریف‌شده به‌جای دک جذب استارتاپ).",
    tr: "Hukuk grubuna özel ortaklık sunumu oluşturuldu (startup sunumunun yeniden çerçevelenmiş hâli).",
  },
  help: {
    fa: "فهرست دستورهای ربات — در همه کانال‌ها (وب، تلگرام، دیسکورد، واتساپ) یکسان است.",
    tr: "Bot komut listesi — tüm kanallarda (web, Telegram, Discord, WhatsApp) aynıdır.",
  },
};

const summaryFor = (route, language) => (language === "en" ? "" : (SUMMARY[route] || {})[language] || "");

const rid = (prefix) => `${prefix}_${Math.random().toString(16).slice(2, 14)}`;

/* --------------------------------------------------------------- handlers -- */

const H = {
  greeting(m, s) {
    return reply(`${tr("greeting", s.language)}\n\n${tr("menu", s.language)}`, "greeting", {
      buttons: nav.MENU.map(([label, action]) => ({ label, action })),
    });
  },

  help(m, s) {
    const text = [
      tr("menu", s.language),
      "",
      "COMMANDS",
      "/legal      Iran–Türkiye Startup Legal Desk",
      "/intake     Startup Legal Intake Form",
      "/assessment Pre-Landing Legal Assessment",
      "/journey    6-step startup journey",
      "/hotels     Hotel map + sponsor capacity",
      "/corporate  Corporate sponsorship / PoC flow",
      "/deck       Pitch deck for a legal group (PDF/HTML/MD)",
      "/pilot      Istanbul pilot + funnel projection",
      "/metrics    Success metrics",
      "/human      Escalate to a licensed professional",
      "/lang en|fa|tr  Answer language",
    ].join("\n");
    return reply(text, "help", { buttons: nav.MENU.map(([label, action]) => ({ label, action })) });
  },

  legal_desk(m, s) {
    const p = (DATA.legal_partners || [])[0] || { expertise: [], note: "" };
    const text = [
      "IRAN–TÜRKİYE STARTUP LEGAL DESK",
      "",
      "The Desk is the first legal point of contact for selected startup teams entering",
      "Türkiye. Two legal layers:",
      "",
      ld.layersText(),
      "",
      "Partner expertise:",
      ...p.expertise.map((e) => `  • ${e}`),
      "",
      p.note ? `Partner note: ${p.note}` : "",
      "",
      "What we ask from the legal group:",
      ...ld.ASKS_FROM_LEGAL_GROUP.map((a, i) => `  ${i + 1}. ${a}`),
      "",
      "What the platform provides:",
      `  ${ld.PLATFORM_PROVIDES.join(" · ")}`,
    ].filter((x) => x !== undefined).join("\n").trim();
    return reply(text, "legal_desk", { escalated: true, advice_scope: true });
  },

  journey(m, s) {
    return reply(ld.journeyText(s.language), "journey");
  },

  intake(m, s) {
    if (m.text.trim().toLowerCase() === "/intake reset") {
      delete s.intake_draft;
      return reply("Intake cleared. Send /intake to start again.", "intake_reset");
    }
    let draft = { ...(s.intake_draft || {}) };
    if (nav.looksLikeIntakeJson(m.text)) {
      try { Object.assign(draft, JSON.parse(m.text)); } catch { Object.assign(draft, nav.extractIntakeFromText(m.text)); }
    } else if (!m.text.startsWith("/")) {
      Object.assign(draft, nav.extractIntakeFromText(m.text));
    }
    const missing = ld.validateIntake(draft);
    if (!missing.length) return finishIntake(m, s, draft);
    s.intake_draft = draft;
    const field = ld.INTAKE_FORM.find((f) => f.key === missing[0]);
    const progress = ld.REQUIRED_INTAKE_KEYS.length - missing.length;
    const lines = [
      "STARTUP LEGAL INTAKE FORM",
      `(${progress}/${ld.REQUIRED_INTAKE_KEYS.length} answered)`,
      "",
      `➡️ ${field.label}` + (s.language === "fa" ? `  —  ${field.fa}` : ""),
    ];
    if (field.type === "choice") lines.push(`   options: ${field.options.join(" | ")}`);
    lines.push(
      "",
      "You can answer one by one, or paste everything at once like:",
      "  startup_name: Pars Vision",
      "  sector: AI",
      "  stage: mvp",
      "  team_size: 3",
      "  team_roles: Founder / Technical / Business",
      "  has_iran_entity: yes",
      "  has_turkey_entity: no",
      "  ip_owned_by_company: yes",
      "  founder_agreement: yes",
      "  intended_city: Istanbul",
      "  intended_activity: sell industrial AI inspection software to Turkish manufacturers",
      "  residence_status: all three on tourist visa exemption, 90 days",
      "  funding_target_usd: 250000",
      "  source: GITEX",
      "",
      "Tip: send `/intake reset` to start over."
    );
    return reply(lines.join("\n"), "intake");
  },

  assessment(m, s) {
    if (!s.kase) {
      return reply(
        "No assessment yet. Send /intake to fill the Startup Legal Intake Form first — " +
          "the Pre-Landing Legal Assessment is generated from it.",
        "assessment_missing"
      );
    }
    const a = ld.preLandingAssessment(s.kase.intake);
    const text = [
      ld.assessmentText(a, s.kase.startup_name, s.language),
      "",
      `Journey position: STEP ${s.kase.step} — ${ld.nextStep(s.kase.step).title}`,
      "Send /advance to move the case to the next step (logged for the legal partner).",
    ].join("\n");
    return reply(text, "assessment", { escalated: true, advice_scope: true });
  },

  advance(m, s) {
    if (!s.kase) return reply("No open legal case. Send /intake first.", "advance_missing");
    const before = s.kase.step;
    s.kase.step = Math.min(s.kase.step + 1, ld.JOURNEY.length);
    const step = ld.nextStep(s.kase.step);
    s.kase.layer = ld.LAYERS.layer2.steps.includes(step.step) ? "layer2" : "layer1";
    return reply(
      `Legal case ${s.kase.id}: STEP ${before} → STEP ${s.kase.step} (${step.title}).\n` +
        `Owner of this step: ${step.owner}\nLegal layer: ${ld.LAYERS[s.kase.layer].name}\n` +
        `Output expected: ${step.output}`,
      "advance",
      { escalated: true, advice_scope: true }
    );
  },

  company_formation() {
    const text = [
      "TURKISH BUSINESS STRUCTURE — OPTIONS ONLY (step 4)",
      "",
      "The platform can list the structures; the lawyer picks one.",
      ...Object.values(ld.STRUCTURES).map((v) => `  • ${v}`),
      "",
      "What the AI prepares before the meeting:",
      "  [ ] cap table + shareholding",
      "  [ ] Iranian entity documents (if any)",
      "  [ ] IP ownership chain",
      "  [ ] intended activity description",
      "  [ ] 12-month financial projection",
      "",
      "What only the lawyer/accountant decides:",
      "  → entity type, order of steps (entity vs residence first), tax registrations,",
      "    employment contracts, and what may be promised in writing.",
    ].join("\n");
    return reply(text, "company_formation", { escalated: true, advice_scope: true });
  },

  residence() {
    const text = [
      "TÜRKİYE ENTRY (step 3) — what I can and cannot do",
      "",
      "I can organise the file: passports, current status of each of the three team members,",
      "purpose of stay, intended activity, company plans, and the document checklist.",
      "",
      "I cannot tell you which permit applies. No residence, kimlik, work-authorization or",
      "visa outcome is guaranteed by this platform — that determination belongs to a lawyer",
      "qualified in Türkiye.",
      "",
      "Route: your file goes to the Iran–Türkiye Startup Legal Desk, which reviews the",
      "applicable visa / residence / work-authorization / company-formation pathways.",
    ].join("\n");
    return reply(text, "residence", { escalated: true, advice_scope: true });
  },

  ip() {
    const text = [
      "INTELLECTUAL PROPERTY — preparation list",
      "",
      "  [ ] Who created the code/design/content, and under which contract?",
      "  [ ] Written assignment from every individual contributor to the company",
      "  [ ] Trademark search + filing strategy for Türkiye",
      "  [ ] Open-source licence audit",
      "  [ ] How IP moves into the Turkish structure (assignment vs licence)",
      "  [ ] Domain, repositories, cloud accounts, data-ownership clauses",
      "",
      "The legal partner decides the correct transfer/licence route.",
    ].join("\n");
    return reply(text, "ip", { escalated: true, advice_scope: true });
  },

  investment() {
    const text = [
      "LAYER 2 — INVESTMENT & GROWTH LEGAL",
      "",
      "  • Investor readiness (data room, cap table, financials)",
      "  • Term sheet review",
      "  • SAFE / convertible instrument",
      "  • Shareholders agreement",
      "  • Due diligence",
      "  • Fundraising process",
      "  • Corporate partnership / PoC contract",
      "  • M&A",
      "",
      "The same startup stays inside the legal partner's ecosystem as it grows.",
    ].join("\n");
    return reply(text, "investment", { escalated: true, advice_scope: true });
  },

  hotel(m) {
    let city = "";
    for (const c of sp.CITIES) if (m.text.toLowerCase().includes(c.toLowerCase())) { city = c; break; }
    const matches = sp.matchHotels(DATA, { city: city || "Istanbul", roomsNeeded: 3, needsWorkspace: true });
    const lines = [sp.hotelTableText(DATA, city), "", sp.sponsorModelText()];
    if (matches.length) {
      lines.push("", "Best match for a 3-person team:");
      matches.slice(0, 3).forEach((mm) => {
        const h = mm.hotel;
        lines.push(
          `  ${h.name} (${h.city}/${h.district}) — ${h.startup_rooms} rooms, ${h.support_type}, ` +
            `metro ${h.metro_min} min, coworking=${h.coworking ? "yes" : "no"} → score ${mm.score}`
        );
      });
    }
    return reply(lines.join("\n"), "hotels");
  },

  corporate_sponsor() {
    const rows = (DATA.corporate_sponsors || []).map(
      (c) => `  • ${c.name} (${c.city}) — interests: ${c.sector_interest.join(", ")} — slots: ${c.startup_slots} — ${c.status}`
    );
    const text = [
      sp.corporateSponsorshipFlow(),
      "",
      "CORPORATE SPONSORS ON RECORD:",
      ...rows,
      "",
      "Legal partner's role: build the contractual framework for the PoC and for whatever",
      "follows (commercial contract / investment / strategic partnership).",
    ].join("\n");
    return reply(text, "corporate", { escalated: true, advice_scope: true });
  },

  ecosystem() {
    return reply(sp.ecosystemText(DATA), "ecosystem");
  },

  deck(m, s) {
    const parts = m.text.trim().split(/\s+/);
    const lowered = m.text.toLowerCase();
    let fmt = "pdf";
    if (lowered.includes("html")) fmt = "html";
    else if (lowered.includes(" md") || lowered.includes("markdown")) fmt = "md";
    const group = parts.length > 1 && !["pdf", "html", "md", "markdown"].includes(parts[1].toLowerCase())
      ? parts.slice(1).join(" ")
      : "Iranian–Turkish Legal Group";
    const opts = defaultOptions({ legal_group_name: group });
    if (fmt === "html") {
      return reply(`🌐 HTML deck for "${group}" — printable to PDF from the browser.`, "deck", {
        documents: [{ filename: deckFilename(opts, "html"), mime_type: "text/html", content: deckHtml(opts) }],
        meta: { format: fmt, group },
      });
    }
    if (fmt === "md") {
      return reply(`📝 Markdown deck for "${group}".`, "deck", {
        documents: [{ filename: deckFilename(opts, "md"), mime_type: "text/markdown", content: deckMarkdown(opts) }],
        meta: { format: fmt, group },
      });
    }
    return reply(
      `📄 Pitch deck for a legal group — personalised for "${group}".\n` +
        `${deckMarkdown(opts).split(/\s+/).length} words · reframed as Legal Landing Partner + Cross-Border Startup Desk ` +
        "(not the startup-attraction deck).\nOpen /deck to preview it in the browser or download HTML/Markdown.",
      "deck",
      { documents: [{ filename: deckFilename(opts), mime_type: "application/pdf", pdf: true, opts }], meta: { format: fmt, group } }
    );
  },

  pilot(m) {
    const digits = (m.text.match(/\d+/) || [""])[0];
    const applied = digits ? Math.max(1, Math.min(100000, parseInt(digits, 10))) : 100;
    const rows = ld.funnelProjection(applied);
    const p = ld.PILOT;
    const lines = [
      `${p.city.toUpperCase()} PILOT`,
      `  first cohort: ${p.teams} teams × ${p.team_size} people = ${p.people} founders/team members`,
      `  ecosystem: ${p.ecosystem.join(", ")}`,
      "",
      `FUNNEL (projected for ${applied} inbound startups):`,
      `  ${"stage".padEnd(38)}${"pilot".padStart(7)}${"projected".padStart(11)}`,
    ];
    rows.forEach((r) => lines.push(`  ${r.stage.padEnd(38)}${String(r.pilot).padStart(7)}${String(r.projected).padStart(11)}`));
    lines.push("", "The goal is not simply to bring people to Türkiye.", "The goal is to create successful business cases.");
    return reply(lines.join("\n"), "pilot");
  },

  metrics(m, s) {
    const lines = ["SUCCESS METRICS — Istanbul pilot", ""];
    ld.SUCCESS_METRICS.forEach(([label, value]) => lines.push(`  ${label.padEnd(42)}${value}`));
    lines.push(
      "",
      "LIVE PLATFORM COUNTERS",
      `  sponsored room nights mapped: ${sp.totalSponsoredRooms(DATA)}`,
      `  hotels on the map: ${(DATA.hotels || []).length}`,
      `  corporate sponsors: ${(DATA.corporate_sponsors || []).length}`,
      s.kase ? `  your open legal case: ${s.kase.id} (step ${s.kase.step}, band ${s.kase.band})` : "  your open legal case: none yet — send /intake",
      "",
      "Note: this public deployment is stateless. The full pipeline counters (startups, cases,",
      "escalations) live in the self-hosted Python service: GET /api/stats."
    );
    return reply(lines.join("\n"), "metrics");
  },

  human() {
    const text = [
      "👤 Handing you to a human.",
      "",
      "Who takes over:",
      "  • Legal questions, residence/visa/work authorization, entity choice, contracts,",
      "    IP transfer, investment documents → the licensed Legal Desk partner.",
      "  • Hotel/sponsor logistics → the platform operations team.",
      "",
      "What is transferred: your startup profile, intake answers, assessment score,",
      "red flags and the document checklist — so the lawyer enters the process early",
      "instead of starting from zero.",
    ].join("\n");
    return reply(text, "human", { escalated: true, advice_scope: true });
  },

  lang(m, s) {
    const names = { en: "English", fa: "فارسی (Persian)", tr: "Türkçe (Turkish)" };
    const text = [
      `Answer language: ${names[s.language] || s.language}`,
      "",
      "Send /lang en, /lang fa or /lang tr at any time.",
      "زبان پاسخ: فارسی — /lang en یا /lang tr برای تغییر.",
      "Yanıt dili: Türkçe — /lang en veya /lang fa ile değiştirebilirsiniz.",
    ].join("\n");
    return reply(text, "lang");
  },

  unknown(m, s) {
    return reply(tr("unknown", s.language), "unknown", {
      buttons: nav.MENU.slice(0, 5).map(([label, action]) => ({ label, action })),
    });
  },
};

function reply(text, route, extra = {}) {
  return {
    text,
    route,
    buttons: (extra.buttons || []).map((b) => ({ label: b.label, action: b.action || "", url: b.url || "" })),
    documents: extra.documents || [],
    escalated: Boolean(extra.escalated),
    advice_scope: Boolean(extra.advice_scope),
    meta: extra.meta || {},
  };
}

function finishIntake(m, s, data) {
  const missing = ld.validateIntake(data);
  if (missing.length) {
    s.intake_draft = data;
    const labels = Object.fromEntries(ld.INTAKE_FORM.map((f) => [f.key, f.label]));
    return reply(`Almost there — still missing:\n${missing.map((k) => `  • ${labels[k] || k}`).join("\n")}`, "intake_incomplete");
  }
  delete s.intake_draft;
  const assessment = ld.preLandingAssessment(data);
  const startup = {
    id: rid("st"),
    name: String(data.startup_name || "").trim(),
    sector: String(data.sector || "").trim(),
    stage: String(data.stage || "").trim(),
    team_size: parseInt(data.team_size || 3, 10),
    intended_city: String(data.intended_city || "Istanbul").trim(),
    funding_target_usd: parseInt(data.funding_target_usd || 0, 10),
  };
  const kase = {
    id: rid("lc"),
    startup_id: startup.id,
    startup_name: startup.name,
    step: 2,
    layer: "layer1",
    band: assessment.band,
    intake: data,
  };
  s.kase = kase;
  s.startup = startup;

  const hotels = sp.matchHotels(DATA, {
    city: startup.intended_city, sector: startup.sector,
    roomsNeeded: Math.min(startup.team_size, 3), needsWorkspace: true,
  });
  const corps = sp.matchCorporateSponsors(DATA, startup.sector, startup.intended_city);

  const lines = [
    `✅ Intake complete — ${startup.name || "startup"} is now in the pipeline.`,
    `Startup ID: ${startup.id}`,
    `Legal case ID: ${kase.id}  (journey step ${kase.step}: ${ld.nextStep(kase.step).title})`,
    "",
    ld.assessmentText(assessment, startup.name, s.language),
  ];
  if (hotels.length) {
    const top = hotels[0];
    lines.push(
      "",
      "ACCOMMODATION (hotel sponsor inventory, not cash):",
      `  Best match: ${top.hotel.name} — ${top.hotel.city}/${top.hotel.district}, ` +
        `${top.hotel.startup_rooms} sponsored rooms, support: ${top.hotel.support_type}`,
      `  Why: ${top.why.join(", ")}`
    );
  }
  if (corps.length) {
    const top = corps[0];
    lines.push("", "CORPORATE SPONSOR CANDIDATE:", `  ${top.sponsor.name} — offers: ${top.sponsor.offers.join(", ")}`, `  Why: ${top.why.join(", ") || "sector/city proximity"}`);
  }
  lines.push("", "Next: a licensed lawyer from the Legal Desk reviews the file and answers the questions above.");
  return reply(lines.join("\n"), "intake_complete", {
    escalated: true,
    advice_scope: true,
    meta: { startup_id: startup.id, case_id: kase.id, band: assessment.band, score: assessment.score, assessment, startup },
  });
}

/* ------------------------------------------------------------------- main -- */

/**
 * @param {{text:string, session?:object}} input
 * @returns {{reply:object, session:object}}
 */
export function handleMessage(text, session = {}, meta = {}) {
  const s = { language: "en", ...session };
  const m = { text: text || "", channel: meta.channel || "web", chat_id: meta.chat_id || "web" };

  const low = m.text.trim().toLowerCase();
  if (["/lang fa", "/lang en", "/lang tr"].includes(low)) {
    s.language = low.slice(-2);
    s.language_locked = true;
  }
  const previous = s.language || "";
  if (s.language_locked) {
    s.language = previous || "en";
  } else {
    const detected = safe.detectLanguage(m.text, "");
    if (m.text.startsWith("/")) s.language = ["", "en"].includes(detected) && previous ? previous : detected || previous || "en";
    else s.language = detected || previous || "en";
  }

  let intent;
  if (nav.looksLikeIntakeJson(m.text)) intent = "intake";
  else if ("intake_draft" in s && !m.text.startsWith("/")) intent = "intake";
  else if (!m.text.startsWith("/") && nav.looksLikeIntakeAnswers(m.text)) intent = "intake";
  else if (low === "/advance") intent = "advance";
  else intent = nav.topIntent(m.text);

  const language = s.language;
  let r = (H[intent] || H.unknown)(m, s);
  r.intent = intent;
  r.language = language;
  if (!r.buttons.length) r.buttons = nav.quickReplies(intent).map(([label, action]) => ({ label, action, url: "" }));

  const lead = summaryFor(r.route, language);
  if (lead) r.text = `${lead}\n\n${r.text}`;

  // ---- Legal AI Safety Principle enforcement (single choke point) ----
  const inbound = safe.review(m.text);
  const outbound = safe.review(r.text);
  const sensitive = r.advice_scope || nav.isSensitive(intent) || inbound.triggered.length || outbound.triggered.length || outbound.removed_guarantees.length;
  if (sensitive) [r.text] = safe.safeReply(r.text, language, outbound);
  const triggered = [...new Set([...inbound.triggered, ...outbound.triggered])];
  const refusal = inbound.refusal || outbound.refusal;
  if (refusal || inbound.must_escalate || (r.advice_scope && (inbound.must_escalate || outbound.must_escalate))) r.escalated = true;
  if (r.escalated) r.text = `${r.text}\n\n${tr("escalated", language)}`;

  r.meta = {
    ...(r.meta || {}),
    safety: {
      triggered,
      removed_guarantees: [...inbound.removed_guarantees, ...outbound.removed_guarantees],
      escalated: r.escalated,
      refusal,
      inbound: inbound.triggered,
      outbound: outbound.triggered,
    },
  };
  delete r.advice_scope;
  s.last_intent = intent;
  s.last_route = r.route;
  s.messages = (s.messages || 0) + 1;
  return { reply: r, session: s };
}

export { DATA, deckMarkdown, deckHtml, deckPdf, deckFilename, defaultOptions, ld, nav, safe, sp };
