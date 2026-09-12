// AI Startup Navigator — intent routing (EN/FA/TR). JS port of bot/navigator.py

import { REQUIRED_INTAKE_KEYS } from "./legal_desk.js";

export const INTENTS = {
  greeting: ["hello", "hi ", "hey", "salam", "سلام", "درود", "merhaba", "selam", "good morning", "صبح بخیر", "خوش آمد"],
  help: ["help", "menu", "commands", "کمک", "راهنما", "دستور", "yardım", "menü", "what can you do", "چه کاری"],
  legal_desk: ["legal desk", "legal landing", "lawyer", "legal partner", "میز حقوقی", "وکیل", "حقوقی", "avukat", "hukuk", "hukuki", "legal", "bar association", "کانون وکلا"],
  intake: ["intake", "apply", "register my startup", "submit", "فرم", "ثبت نام", "درخواست", "نام‌نویسی", "başvuru", "kayıt", "form", "start application", "شروع"],
  assessment: ["assessment", "assessment score", "ready", "readiness", "ارزیابی", "آمادگی", "سنجش", "değerlendirme", "hazır mı", "pre-landing"],
  company_formation: ["company formation", "register a company", "şirket kur", "limited şirket", "anonim şirket", "ثبت شرکت", "تاسیس شرکت", "تأسیس شرکت", "subsidiary", "branch", "شرکت ترکیه", "a.ş.", "ltd", "ثبت", "شرکت", "تأسیس", "تاسیس", "şirket", "company", "register", "ثبت کنم", "company in turkey"],
  residence: ["kimlik", "kımlık", "residence permit", "oturum", "visa", "ویزا", "اقامت", "کیملیک", "vize", "work permit", "اجازه کار", "çalışma izni", "ikamet"],
  ip: ["ip ", "intellectual property", "trademark", "patent", "مالکیت فکری", "علامت تجاری", "fikri mülkiyet", "marka"],
  investment: ["invest", "investor", "سرمایه", "جذب سرمایه", "term sheet", "safe", "sha", "yatırım", "yatırımcı", "fundrais", "due diligence", "vc"],
  hotel: ["hotel", "hotels", "accommodation", "هتل", "اقامتگاه", "otel", "konaklama", "room", "اتاق", "oda", "hotel sponsor", "hotel map", "هتل اسپانسر", "هتل های اسپانسر", "هتل های", "نقشه هتل", "sponsor hotel", "room night", "otel sponsor"],
  corporate_sponsor: ["corporate sponsor", "sponsor", "اسپانسر", "اسپانسری", "شرکت اسپانسر", "kurumsal sponsor", "poc", "proof of concept", "corporate partner", "حامی", "اسپانسر شرکتی", "شرکت حامی"],
  ecosystem: ["accelerator", "technopark", "شتاب‌دهنده", "شتابدهنده", "پارک فناوری", "teknopark", "hızlandırıcı", "coworking", "university", "دانشگاه", "üniversite", "investor network"],
  deck: ["deck", "pitch", "pitch deck", "pdf", "proposal", "پیشنهاد", "ارائه", "دک", "sunum", "teklif"],
  pilot: ["pilot", "cohort", "دوره", "پایلوت", "funnel", "قیف", "pilot program", "kademeli"],
  journey: ["journey", "steps", "roadmap", "مسیر", "مراحل", "نقشه راه", "süreç", "adımlar", "yol haritası"],
  metrics: ["metric", "kpi", "success", "شاخص", "معیار", "başarı", "metrik"],
  human: ["human", "talk to a person", "agent", "انسان", "کارشناس", "تماس", "gerçek kişi", "insan", "call me"],
};

// Extra Turkish / Persian natural-language phrases (mirror of bot/navigator.py)
export const INTENT_PHRASES = {
  assessment: ["ön değerlendirme", "on degerlendirme", "iniş öncesi", "inis oncesi", "hukuki değerlendirme", "hukuki degerlendirme", "ارزیابی پیش از ورود", "ارزیابی حقوقی", "سنجش آمادگی"],
  journey: ["adımlı yolculuk", "adimli yolculuk", "iniş yolculuğu", "inis yolculugu", "yolculuğu göster", "6 adım", "altı adım", "adımlı iniş", "مسیر شش مرحله", "مسیر ورود", "مراحل ورود"],
  hotel: ["otel haritası", "otel haritasi", "sponsorlu oda", "sponsorlu odalar", "odalar", "اتاق های اسپانسری", "نقشه هتل ها"],
  ecosystem: ["ekosistem sponsoru", "ekosistem sponsorları", "ekosistem ortakları", "اسپانسرهای اکوسیستم", "اکوسیستم"],
  deck: ["sunum hazırla", "sunum oluştur", "hukuk bürosu sunumu", "hukuk bürosu için sunum", "ارائه بساز", "دک بساز", "برای گروه حقوقی ارائه", "sunum hazırlar"],
  human: ["avukata aktar", "lisanslı avukat", "lisansli avukat", "gerçek kişiye aktar", "insana aktar", "وکیل دارای پروانه", "ارجاع به وکیل", "به وکیل ارجاع", "ارجاع بده"],
  corporate_sponsor: ["sponsor modelleri", "kurumsal sponsorluk", "اسپانسرشیپ شرکتی"],
};
for (const [intent, phrases] of Object.entries(INTENT_PHRASES)) {
  const have = INTENTS[intent] || (INTENTS[intent] = []);
  have.push(...phrases.filter((p) => !have.includes(p)));
}

export const SENSITIVE_INTENTS = new Set(["residence", "legal_desk", "company_formation", "investment", "ip"]);

export const MENU = [
  ["🏛️ Legal Landing Desk", "/legal"],
  ["📝 Startup Legal Intake Form", "/intake"],
  ["🧭 Pre-Landing Assessment", "/assessment"],
  ["🗺️ Journey (6 steps)", "/journey"],
  ["🏨 Hotel map & sponsors", "/hotels"],
  ["🏭 Corporate sponsorship", "/corporate"],
  ["📄 Pitch deck for legal group", "/deck"],
  ["🧪 Istanbul pilot & funnel", "/pilot"],
  ["👤 Talk to a human", "/human"],
];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function patternFor(keyword) {
  const k = escapeRe(keyword.toLowerCase().trim());
  return keyword.trim().length <= 4 ? new RegExp(`(?<![\\p{L}\\p{N}_])${k}(?![\\p{L}\\p{N}_])`, "u") : new RegExp(k);
}

export function normalize(text) {
  return text.toLowerCase().replace(/\u200c/g, " ").replace(/\u200f/g, "");
}

export function classify(text) {
  const low = ` ${normalize(text).trim()} `;
  const hits = [];
  for (const [intent, keywords] of Object.entries(INTENTS)) {
    const matched = keywords.filter((k) => patternFor(k).test(low));
    if (matched.length) {
      const score = matched.reduce((a, k) => a + k.trim().length * (k.trim().includes(" ") ? 1.4 : 1), 0) / 10;
      hits.push({ name: intent, score: Math.round(score * 100) / 100, matched });
    }
  }
  hits.sort((a, b) => b.score - a.score);
  return hits;
}

const ALIASES = {
  start: "help", legal: "legal_desk", intake: "intake", apply: "intake", assessment: "assessment",
  journey: "journey", hotels: "hotel", hotel: "hotel", corporate: "corporate_sponsor", sponsor: "corporate_sponsor",
  deck: "deck", pdf: "deck", pilot: "pilot", human: "human", help: "help", menu: "help",
  invest: "investment", investment: "investment", ip: "ip", kimlik: "residence", visa: "residence",
  residence: "residence", company: "company_formation", metrics: "metrics", advance: "advance",
  ecosystem: "ecosystem", lang: "lang", language: "lang", sponsors: "corporate_sponsor",
};

export function topIntent(text) {
  const t = text.trim();
  if (t.startsWith("/")) {
    const cmd = t.split(/\s+/)[0].slice(1).toLowerCase();
    if (ALIASES[cmd]) return ALIASES[cmd];
  }
  const ranked = classify(t);
  if (!ranked.length) return "unknown";
  for (const cand of ranked) {
    if (SENSITIVE_INTENTS.has(cand.name) && cand.score >= ranked[0].score * 0.6) return cand.name;
  }
  return ranked[0].name;
}

export const isSensitive = (intent) => SENSITIVE_INTENTS.has(intent);

const QUICK = {
  greeting: [["📝 Start intake", "/intake"], ["🏛️ Legal Desk", "/legal"], ["🗺️ Journey", "/journey"]],
  help: MENU.slice(0, 6),
  legal_desk: [["📝 Intake form", "/intake"], ["🧭 Assessment", "/assessment"], ["📄 Deck PDF", "/deck"]],
  intake: [["🧭 Run assessment", "/assessment"], ["👤 Human", "/human"]],
  assessment: [["🏨 Hotels", "/hotels"], ["🏭 Corporate sponsor", "/corporate"], ["👤 Human", "/human"]],
  company_formation: [["🏛️ Legal Desk", "/legal"], ["👤 Talk to a lawyer", "/human"]],
  residence: [["👤 Talk to a lawyer", "/human"], ["🏛️ Legal Desk", "/legal"]],
  ip: [["🏛️ Legal Desk", "/legal"], ["👤 Human", "/human"]],
  investment: [["🏛️ Legal Desk", "/legal"], ["📄 Deck", "/deck"]],
  hotel: [["🏭 Corporate sponsor", "/corporate"], ["📝 Intake", "/intake"]],
  corporate_sponsor: [["🏨 Hotels", "/hotels"], ["🏛️ Legal Desk", "/legal"]],
  deck: [["🧪 Pilot", "/pilot"], ["👤 Human", "/human"]],
  pilot: [["📊 Metrics", "/metrics"], ["📄 Deck", "/deck"]],
  journey: [["🏛️ Legal Desk", "/legal"], ["🧪 Pilot", "/pilot"]],
  metrics: [["🧪 Pilot", "/pilot"]],
  human: [["📝 Intake form", "/intake"]],
};

export function quickReplies(intent) {
  return QUICK[intent] || MENU.slice(0, 3);
}

export function looksLikeIntakeJson(text) {
  const t = text.trim();
  return t.startsWith("{") && t.endsWith("}") && t.includes("startup_name");
}

const INTAKE_ALIASES = {
  name: "startup_name", startup: "startup_name", "نام": "startup_name",
  sector: "sector", "حوزه": "sector", stage: "stage", "مرحله": "stage",
  team: "team_size", team_size: "team_size", "تعداد": "team_size",
  roles: "team_roles", team_roles: "team_roles", "نقش": "team_roles",
  has_iran_entity: "has_iran_entity", iran_entity: "has_iran_entity", "شرکت ایران": "has_iran_entity",
  has_turkey_entity: "has_turkey_entity", turkey_entity: "has_turkey_entity", "شرکت ترکیه": "has_turkey_entity",
  ip: "ip_owned_by_company", ip_owned_by_company: "ip_owned_by_company", "مالکیت فکری": "ip_owned_by_company",
  founder_agreement: "founder_agreement", "قرارداد بنیانگذار": "founder_agreement",
  intended_city: "intended_city", city: "intended_city", "شهر": "intended_city",
  intended_activity: "intended_activity", activity: "intended_activity", "فعالیت": "intended_activity",
  residence_status: "residence_status", residence: "residence_status", "اقامت": "residence_status",
  funding_target_usd: "funding_target_usd", funding: "funding_target_usd", "سرمایه": "funding_target_usd",
  source: "source", "منبع": "source",
};

const BOOL_KEYS = ["has_iran_entity", "has_turkey_entity", "ip_owned_by_company", "founder_agreement"];
const INT_KEYS = ["team_size", "funding_target_usd"];
const TRUTHY = ["yes", "y", "true", "1", "بله", "evet", "آره", "دارم", "var"];

export function extractIntakeFromText(text) {
  const t = text.trim();
  if (looksLikeIntakeJson(t)) {
    try {
      const data = JSON.parse(t);
      if (data && typeof data === "object") return data;
    } catch {
      /* fall through to line parsing */
    }
  }
  const out = {};
  for (const line of t.split("\n")) {
    const m = line.match(/^\s*([\p{L}\p{N}_ ]+?)\s*[:=]\s*(.+?)\s*$/u);
    if (!m) continue;
    const raw = m[1].trim().toLowerCase().replace(/ /g, "_");
    const key = INTAKE_ALIASES[raw] || raw;
    let value = m[2].trim();
    if (INT_KEYS.includes(key)) {
      const digits = String(value).replace(/[^\d]/g, "");
      value = digits ? parseInt(digits, 10) : value;
    }
    if (BOOL_KEYS.includes(key)) value = TRUTHY.includes(String(value).trim().toLowerCase());
    out[key] = value;
  }
  return out;
}

export function looksLikeIntakeAnswers(text) {
  const keys = new Set([...REQUIRED_INTAKE_KEYS, "founder_agreement", "funding_target_usd", "notes", ...Object.keys(INTAKE_ALIASES)]);
  let hits = 0;
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([\p{L}\p{N}_ ]+?)\s*[:=]\s*(.+)$/u);
    if (m && keys.has(m[1].trim().toLowerCase().replace(/ /g, "_"))) hits += 1;
  }
  return hits >= 1;
}
