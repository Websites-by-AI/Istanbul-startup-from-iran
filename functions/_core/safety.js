// Legal AI Safety Principle (deck §12/§13) — JS port of bot/safety.py
// The AI prepares, organises and routes. A licensed legal professional decides.

export const DISCLAIMER = {
  en: `⚖️ AI information — not legal advice.
The AI Startup Navigator organises documents, questions and options. Only a licensed legal professional (a lawyer admitted to a Turkish Bar, or the authorised partner of the Iran–Türkiye Startup Legal Desk) determines the legally appropriate route for a specific client. No residence permit, work permit, kimlik, visa or company-registration outcome is guaranteed.`,
  fa: `⚖️ این اطلاعات توسط هوش مصنوعی تولید شده و مشاوره حقوقی نیست.
هوش مصنوعی فقط اسناد، پرسش‌ها و گزینه‌ها را آماده و دسته‌بندی می‌کند. تعیین مسیر حقوقی مناسب هر پرونده فقط بر عهده وکیل دارای پروانه (عضو کانون وکلای ترکیه) یا شریک حقوقی میز Iran–Türkiye Startup Legal Desk است. هیچ نتیجه‌ای درباره اقامت، کیملیک، اجازه کار، ویزا یا ثبت شرکت تضمین نمی‌شود.`,
  tr: `⚖️ Bu bir yapay zekâ bilgilendirmesidir, hukuki tavsiye değildir.
Yapay zekâ yalnızca belgeleri, soruları ve seçenekleri hazırlar ve yönlendirir. Somut olay için hukuken uygun yolu yalnızca ruhsatlı avukat (Türkiye Barolar Birliği'ne kayıtlı) veya Iran–Türkiye Startup Legal Desk yetkili hukuk ortağı belirler. Oturum izni, çalışma izni, kimlik, vize veya şirket kuruluşu sonucu garanti edilmez.`,
};

export const REFUSAL = {
  en: `I can't answer that one myself — it is a legal determination, not information.
What I *can* do: prepare the document list, the questions the lawyer will ask and the possible structures, then route the file to the Iran–Türkiye Startup Legal Desk.`,
  fa: `پاسخ به این پرسش در صلاحیت من نیست؛ این یک تعیین‌کننده حقوقی است، نه اطلاعات.
کاری که می‌توانم انجام دهم: فهرست مدارک، پرسش‌های وکیل و ساختارهای ممکن را آماده کنم و پرونده را به میز حقوقی Iran–Türkiye Startup Legal Desk ارجاع دهم.`,
  tr: `Bu soruyu kendim yanıtlayamam; bu bir hukuki takdir konusudur, bilgilendirme değildir.
Yapabileceklerim: belge listesini, avukatın soracağı soruları ve olası yapıları hazırlayıp dosyayı Iran–Türkiye Startup Legal Desk'e yönlendirmek.`,
};

export const GUARANTEE_PATTERNS = [
  /\bguarantee[sd]?\b/gi,
  /\bguaranteed\b/gi,
  /\b100\s*%/g,
  /\bassured\b/gi,
  /\btazmin\b/gi,
  /\bgaranti(r)?\b/gi,
  /تضمین/g,
  /قطعی است/g,
  /۱۰۰٪/g,
  /100%/g,
  /حتماً (?:می‌?گیرید|صادر می‌?شود)/g,
  /\bwe will get you\b/gi,
];

export const PROTECTED_PHRASES = [
  "No guaranteed immigration result is promised.",
  "No guaranteed immigration result.",
  "No residence permit, work permit, kimlik, visa or company-registration outcome is guaranteed.",
  "No guarantee is given about any outcome.",
  "هیچ نتیجه‌ای درباره اقامت، کیملیک، اجازه کار، ویزا یا ثبت شرکت تضمین نمی‌شود.",
  "Oturum izni, çalışma izni, kimlik, vize veya şirket kuruluşu sonucu garanti edilmez.",
];

export const REDACTION = "[outcome not guaranteed]";

export const ADVICE_TRIGGERS = {
  immigration: [
    "kimlik", "kımlık", "kiymik", "اقامت", "کیملیک", "residence permit", "oturum izni",
    "work permit", "اجازه کار", "çalışma izni", "visa", "ویزا", "vize", "deport", "دیپورت",
    "citizenship", "شهروندی", "vatandaşlık", "tech visa", "turquoise card",
  ],
  legal_advice: [
    "is it legal", "can i legally", "should i sign", "legal opinion", "مشاوره حقوقی",
    "نظر حقوقی", "hukuki görüş", "tax advice", "مالیات", "vergi", "lawsuit", "دادگاه",
    "dava", "contract review", "بررسی قرارداد", "sözleşme incelemesi",
  ],
  entity_choice: [
    "which company type", "anonim şirket", "limited şirket", "a.ş.", "ltd", "joint stock",
    "subsidiary", "branch", "نوع شرکت", "ثبت شرکت", "şirket kur", "company formation",
    "shareholders agreement", "قرارداد سهامداران", "hissedarlar sözleşmesi",
    "ثبت", "شرکت", "تأسیس", "تاسیس", "şirket",
  ],
};

const TR_CHARS = ["ı", "ş", "ğ", "İ", "ö", "ü", "ç", "â", "î"];
const TR_WORDS = [
  "merhaba", "selam", "nasıl", "icin", "için", "şirket", "sirket", "türkiye", "turkiye",
  "avukat", "hukuk", "vize", "otel", "konaklama", "istiyoruz", "yapmalı", "var mı", "varmi",
  "başvuru", "basvuru", "değerlendirme", "oturum", "çalışma", "calisma", "yatırım", "yatirim",
  "sponsoru", "takım", "takim", "giriş", "giris", "belge",
];
const EN_WORDS = [
  " the ", " and ", " for ", " with ", " what ", " which ", " how ", " our ", " your ",
  " in ", " is ", " are ", " want ", " need ", " please ", " startup ", " legal ", " can ",
];

export function detectLanguage(text, def = "en") {
  if (!text || !text.trim()) return def;
  if (/[\u0600-\u06FF]/.test(text)) return "fa";
  const low = ` ${text.toLowerCase()} `;
  const tr = TR_CHARS.filter((c) => text.includes(c)).length + TR_WORDS.filter((w) => low.includes(w)).length;
  const en = EN_WORDS.filter((w) => low.includes(w)).length;
  if (tr && tr >= en) return "tr";
  return "en";
}

export function scan(text) {
  const low = (text || "").toLowerCase();
  return Object.entries(ADVICE_TRIGGERS)
    .filter(([, kws]) => kws.some((k) => low.includes(k.toLowerCase())))
    .map(([cat]) => cat);
}

function isNegated(text, start, end) {
  const tail = text.slice(Math.max(0, start - 60), start).toLowerCase();
  if (/\b(?:no|none|not|nothing|nobody|never|neither|isn't|aren't|wasn't|cannot|can't|don't|doesn't|won't)\s+(?:\w+\s+){0,6}$/.test(tail)) return true;
  const after = text.slice(end, end + 30).toLowerCase();
  if (/^\s*(?:\w+\s+){0,3}?(?:نمی|نمي|edilmez|yoktur|değildir|degildir|نیست)/.test(after)) return true;
  return ["هیچ", "نه ", "نمی"].some((n) => tail.slice(-25).includes(n));
}

export function stripGuarantees(text) {
  let safe = text || "";
  const removed = [];
  const tokens = {};
  PROTECTED_PHRASES.forEach((phrase, i) => {
    if (phrase && safe.includes(phrase)) {
      const token = `\u0000P${i}\u0000`;
      safe = safe.split(phrase).join(token);
      tokens[token] = phrase;
    }
  });
  for (const re of GUARANTEE_PATTERNS) {
    safe = safe.replace(new RegExp(re.source, re.flags), (...args) => {
      const match = args[0];
      const offset = args[args.length - 2];
      const whole = args[args.length - 1];
      if (isNegated(whole, offset, offset + match.length)) return match;
      removed.push(match);
      return "\u0000R\u0000";
    });
  }
  safe = safe.split("\u0000R\u0000").join(REDACTION);
  for (const [token, phrase] of Object.entries(tokens)) safe = safe.split(token).join(phrase);
  return [safe, removed];
}

export function review(text) {
  const report = { triggered: [], removed_guarantees: [], must_escalate: false, must_disclaim: false, refusal: false };
  const low = (text || "").toLowerCase();
  report.triggered = scan(low);
  const [, removed] = stripGuarantees(text || "");
  report.removed_guarantees = removed;
  if (removed.length) {
    report.must_disclaim = true;
    report.must_escalate = true;
  }
  const hardPromise = /(?:guarantee\w*|تضمین|garanti\w*)\s*[^.\n]{0,40}(?:kimlik|ki?ml?ik|residence|اقامت|oturum|visa|ویزا|vize|work permit|اجازه کار|citizenship|شهروندی)/.test(low);
  if (hardPromise) {
    report.refusal = true;
    report.must_escalate = true;
    report.must_disclaim = true;
  } else if (report.triggered.length) {
    report.must_disclaim = true;
    if (report.triggered.includes("immigration") || report.triggered.includes("legal_advice")) report.must_escalate = true;
  }
  return report;
}

export function safeReply(text, language = "en", report = review(text)) {
  let [safe] = stripGuarantees(text);
  if (report.refusal) safe = `${REFUSAL[language] || REFUSAL.en}\n\n${safe}`.trim();
  if (report.must_disclaim || report.triggered.length) safe = `${safe}\n\n---\n${DISCLAIMER[language] || DISCLAIMER.en}`;
  return [safe, report];
}
