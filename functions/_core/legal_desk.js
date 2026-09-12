// Iran–Türkiye Startup Legal Desk — JS port of bot/legal_desk.py

export const JOURNEY = [
  {
    step: 1, title: "Selection", fa: "انتخاب تیم", owner: "Platform",
    channels: ["Elcom", "GITEX", "Startup competitions", "Universities", "Accelerators", "Startup communities"],
    output: "Selected 3-person team (Founder / Technical / Business)",
  },
  {
    step: 2, title: "Pre-Landing Legal Assessment", fa: "ارزیابی حقوقی پیش از ورود", owner: "Legal Partner",
    channels: ["Founder structure", "Current company", "IP ownership", "Contracts", "Team members", "Intended activities in Türkiye", "Possible legal structures"],
    output: "Assessment report + document checklist",
  },
  {
    step: 3, title: "Türkiye Entry", fa: "ورود به ترکیه", owner: "Legal Partner + Platform",
    channels: ["Visa", "Residence", "Work authorization", "Company formation"],
    output: "Applicable pathways explained by the lawyer. No guaranteed immigration result.",
    no_guarantee: true,
  },
  {
    step: 4, title: "Turkish Business Structure", fa: "ساختار کسب‌وکار ترکیه", owner: "Legal Partner + Accountant",
    channels: ["Turkish subsidiary", "Turkish company", "Branch / representative structure where appropriate", "Other legally suitable structure"],
    output: "Structure decision signed off by the licensed lawyer",
  },
  {
    step: 5, title: "Commercial Launch", fa: "شروع تجاری", owner: "Legal Partner",
    channels: ["Corporate contracts", "Partnership agreements", "Employment arrangements", "IP protection", "Commercial compliance"],
    output: "PoC contract / commercial contract in place",
  },
  {
    step: 6, title: "Investment", fa: "سرمایه‌گذاری", owner: "Legal & Investment Team",
    channels: ["Investment", "Shareholding", "Founder arrangements", "Due diligence", "Commercial partnerships"],
    output: "Term sheet, SHA and investment documentation",
  },
];

export const LAYERS = {
  layer1: {
    name: "Market Entry Legal", fa: "حقوق ورود به بازار", when: "Before the startup arrives",
    items: ["Immigration", "Company", "IP", "Contracts", "Compliance", "Founder structure"], steps: [2, 3, 4],
  },
  layer2: {
    name: "Investment & Growth Legal", fa: "حقوق سرمایه‌گذاری و رشد", when: "After landing",
    items: ["Corporate agreements", "PoC contracts", "Investment documentation", "Shareholder agreements", "Due diligence", "Strategic partnerships"],
    steps: [5, 6],
  },
};

export const COMMERCIAL_MODELS = {
  A: { name: "Referral", detail: "Platform introduces a qualified startup; the legal partner contracts directly with the startup.", platform_revenue: "Referral / success fee (if permitted by the applicable bar rules)", partner_revenue: "Direct client engagement" },
  B: { name: "Preferred Legal Partner", detail: "The firm/group is designated 'Official Legal Landing Partner' of the program.", platform_revenue: "Program partnership fee / revenue share", partner_revenue: "Exclusive qualified pipeline + branding" },
  C: { name: "Startup Legal Package", detail: "Standardised package: Pre-Landing Assessment → Company / Market Entry → Commercial Setup → Ongoing Legal Support.", platform_revenue: "Package margin", partner_revenue: "Predictable, repeatable engagements" },
  D: { name: "Corporate Legal Support", detail: "The legal partner also represents Turkish corporate sponsors, investors and partnership transactions.", platform_revenue: "Two-sided deal facilitation", partner_revenue: "Both sides of the transaction" },
};

export const ASKS_FROM_LEGAL_GROUP = [
  "Review the startup landing model.",
  "Identify legally permissible pathways.",
  "Define the legal services required for each stage.",
  "Design a standard Startup Legal Intake Form.",
  "Define a Pre-Landing Legal Assessment.",
  "Define appropriate company / contractual structures.",
  "Establish a professional referral mechanism.",
  "Participate as the program's preferred legal partner if mutually agreed.",
];

export const PLATFORM_PROVIDES = [
  "Qualified Startup Leads", "Pre-screened Founder Teams", "Startup Profiles", "Corporate Introductions",
  "Hotel Partnerships", "Exhibition Partnerships", "AI-assisted Intake", "International Visibility", "Startup Deal Flow",
];

export const INTAKE_FORM = [
  { key: "startup_name", label: "Startup name", fa: "نام استارتاپ", type: "text", required: true },
  { key: "sector", label: "Sector", fa: "حوزه فعالیت", type: "choice", required: true, options: ["AI", "SaaS", "FinTech (where legally permitted)", "HealthTech", "ClimateTech", "IndustrialTech", "DeepTech", "Other"] },
  { key: "stage", label: "Funding / product stage", fa: "مرحله", type: "choice", required: true, options: ["idea", "mvp", "revenue", "scaling"] },
  { key: "team_size", label: "Team size travelling (standard = 3)", fa: "تعداد اعضای تیم", type: "int", required: true },
  { key: "team_roles", label: "Roles (Founder / Technical / Business)", fa: "نقش‌ها", type: "text", required: true },
  { key: "has_iran_entity", label: "Existing company in Iran?", fa: "شرکت ثبت‌شده در ایران؟", type: "bool", required: true },
  { key: "has_turkey_entity", label: "Existing company/entity in Türkiye?", fa: "شرکت ثبت‌شده در ترکیه؟", type: "bool", required: true },
  { key: "ip_owned_by_company", label: "Is the IP owned by the company (not individuals)?", fa: "مالکیت فکری به نام شرکت است؟", type: "bool", required: true },
  { key: "founder_agreement", label: "Written founder / shareholders agreement in place?", fa: "قرارداد کتبی بین بنیان‌گذاران؟", type: "bool", required: true },
  { key: "intended_city", label: "Target city", fa: "شهر هدف", type: "choice", required: true, options: ["Istanbul", "Ankara", "İzmir", "Antalya", "Other"] },
  { key: "intended_activity", label: "Intended activity in Türkiye", fa: "فعالیت مورد نظر در ترکیه", type: "text", required: true },
  { key: "residence_status", label: "Current residence / visa status of each member", fa: "وضعیت اقامت/ویزای هر عضو", type: "text", required: true },
  { key: "funding_target_usd", label: "Funding target (USD)", fa: "هدف جذب سرمایه (دلار)", type: "int", required: false },
  { key: "source", label: "Where we met (Elcom / GITEX / university / accelerator / community)", fa: "نقطه آشنایی", type: "text", required: false },
];

export const REQUIRED_INTAKE_KEYS = INTAKE_FORM.filter((f) => f.required).map((f) => f.key);

export function validateIntake(intake) {
  return REQUIRED_INTAKE_KEYS.filter((k) => {
    const v = intake[k];
    return v === undefined || v === null || (typeof v === "string" && !v.trim());
  });
}

const WEIGHTS = {
  has_iran_entity: 0.12, ip_owned_by_company: 0.16, founder_agreement: 0.16, team_size_ok: 0.1,
  stage_ok: 0.14, intended_activity_ok: 0.12, residence_status_ok: 0.1, funding_target_ok: 0.1,
};

const yes = (v) => (typeof v === "boolean" ? v : typeof v === "string" ? ["yes", "y", "true", "بله", "evet", "1", "var"].includes(v.trim().toLowerCase()) : Boolean(v));

export const STRUCTURES = {
  turkish_subsidiary: "Model A — Turkish Subsidiary (subsidiary of the existing parent)",
  sister_company: "Model B — Sister Company (independent entity with contractual/ownership link)",
  operating_company: "Model C — Turkish Operating Company (new company for Türkiye operations)",
};

export function recommendStructures(intake) {
  const hasParent = yes(intake.has_iran_entity);
  const wantsRaise = parseInt(intake.funding_target_usd || 0, 10) > 0;
  const size = parseInt(intake.team_size || 3, 10);
  const out = [];
  if (hasParent && wantsRaise) out.push(STRUCTURES.turkish_subsidiary, STRUCTURES.sister_company);
  else if (hasParent) out.push(STRUCTURES.sister_company, STRUCTURES.turkish_subsidiary);
  else out.push(STRUCTURES.operating_company, STRUCTURES.sister_company);
  if (size <= 2) out.push(STRUCTURES.operating_company);
  return [...new Set(out)];
}

export function buildDocumentChecklist(intake, redFlags) {
  const docs = [
    "Startup profile (one-pager)",
    "Founder / team member passports and current visa or residence status",
    "Existing company registration documents (Iran / other)",
    "Cap table and shareholding structure",
    "Founder / shareholders agreement (or a note that none exists)",
    "IP ownership: assignment, licence, repository and trademark records",
    "Existing commercial contracts and NDAs",
    "Description of intended activity in Türkiye (products, customers, revenue model)",
    "Draft Turkish business plan / financial projection for the first 12 months",
  ];
  if (String(intake.sector || "").toLowerCase().startsWith("fin") || String(intake.sector || "").toLowerCase().startsWith("health"))
    docs.push("Sector-specific regulatory notes (FinTech / HealthTech are regulated — lawyer must confirm scope)");
  if (redFlags.some((f) => f.includes("IP"))) docs.push("Written IP assignment from every individual contributor to the company");
  if (redFlags.some((f) => f.toLowerCase().includes("founder"))) docs.push("Signed founder agreement covering vesting, roles and decision rights");
  return docs;
}

export function buildLawyerQuestions(intake, redFlags) {
  const q = [
    "Which residence / work-authorisation pathway is appropriate for each of the three team members?",
    "Which Turkish entity type fits the intended activity (and is a branch/representative structure appropriate)?",
    "How should the Iranian entity relate to the Turkish entity (subsidiary / sister / operating company)?",
    "What is the correct order of steps: entity first or residence first for this nationality profile?",
    "Which tax registrations and accounting obligations start on day one?",
    "How is the IP transferred or licensed into the Turkish structure?",
    "What can and cannot be promised to the startup in writing?",
  ];
  if (redFlags.length) q.unshift("Which of these red flags are blocking, and which can be fixed after arrival?");
  return q;
}

export function preLandingAssessment(intake) {
  const reasons = [];
  const redFlags = [];
  let score = 0;

  if (yes(intake.has_iran_entity)) {
    score += WEIGHTS.has_iran_entity;
    reasons.push("Existing Iranian entity → share/asset transfer structure can be planned.");
  } else redFlags.push("No existing entity: founder-level IP and shareholding must be documented first.");

  if (yes(intake.ip_owned_by_company)) {
    score += WEIGHTS.ip_owned_by_company;
    reasons.push("IP is company-owned → cleaner assignment/licence into the Turkish structure.");
  } else redFlags.push("IP not company-owned (or unknown): assignment/licence chain must be reviewed by the lawyer.");

  if (yes(intake.founder_agreement)) {
    score += WEIGHTS.founder_agreement;
    reasons.push("Written founder agreement in place.");
  } else redFlags.push("No written founder / shareholders agreement — blocking item for investment layer.");

  const size = parseInt(intake.team_size || 0, 10);
  if (size >= 1 && size <= 6) {
    score += WEIGHTS.team_size_ok;
    reasons.push(`Team size ${size} fits the standard 3-person landing model.`);
  } else redFlags.push("Team size outside the pilot model (expected ~3, max 6).");

  const stage = String(intake.stage || "").toLowerCase();
  if (["mvp", "revenue", "scaling"].includes(stage)) {
    score += WEIGHTS.stage_ok;
    reasons.push(`Stage '${stage}' is landable: a PoC or commercial contract is realistic.`);
  } else if (stage === "idea") {
    score += WEIGHTS.stage_ok * 0.4;
    reasons.push("Idea stage: landing is possible but a corporate PoC will take longer.");
  } else redFlags.push("Unknown stage — cannot size the legal workload.");

  const activity = String(intake.intended_activity || "").trim();
  if (activity.length >= 15) {
    score += WEIGHTS.intended_activity_ok;
    reasons.push("Intended activity in Türkiye is described concretely.");
  } else redFlags.push("Intended activity in Türkiye is too vague to map to a legal pathway.");

  const residence = String(intake.residence_status || "").trim();
  if (residence.length >= 10) {
    score += WEIGHTS.residence_status_ok;
    reasons.push("Current residence/visa status of members documented.");
  } else redFlags.push("Residence/visa status of members unknown — lawyer cannot plan the entry pathway.");

  const target = parseInt(intake.funding_target_usd || 0, 10);
  if (target > 0) {
    score += WEIGHTS.funding_target_ok;
    reasons.push("Funding target stated → Layer 2 (Investment & Growth Legal) is relevant.");
  } else reasons.push("No funding target stated → start with Layer 1 (Market Entry Legal) only.");

  score = Math.max(0, Math.min(1, score));
  const band = score >= 0.75 ? "ready" : score >= 0.5 ? "needs_work" : "not_ready";
  return {
    score: Math.round(score * 1000) / 1000,
    band,
    reasons,
    red_flags: redFlags,
    document_checklist: buildDocumentChecklist(intake, redFlags),
    questions_for_lawyer: buildLawyerQuestions(intake, redFlags),
    recommended_structures: recommendStructures(intake),
    layer: target > 0 && band !== "not_ready" ? "layer2" : "layer1",
  };
}

export const PILOT = {
  city: "Istanbul", teams: 10, team_size: 3, people: 30,
  ecosystem: ["Hotels", "Turkish corporations", "Lawyers", "Investors", "Accelerators", "Technology parks"],
};

export const FUNNEL_STAGES = [
  ["100+ startups", 100], ["30–50 screened", 40], ["10 selected", 10], ["10 legal assessments", 10],
  ["10 Türkiye landing plans", 10], ["Corporate matching", 6], ["PoCs", 3], ["Investment / commercial partnerships", 2],
];

export const SUCCESS_METRICS = [
  ["Startup teams", 10], ["Founders / team members", 30], ["Legal assessments", 10],
  ["Corporate introductions", "5+"], ["PoC opportunities", "3+"],
  ["Investment / commercial opportunities", "1–3"], ["Repeatable legal landing framework", 1],
];

export function funnelProjection(applied) {
  const baseTop = FUNNEL_STAGES[0][1];
  return FUNNEL_STAGES.map(([stage, value]) => ({
    stage,
    pilot: value,
    projected: applied ? Math.max(1, Math.round(value * (applied / baseTop))) : value,
  }));
}

export function journeyText(language = "en") {
  const lines = ["STARTUP JOURNEY — Iran → Türkiye Legal Landing Desk", ""];
  for (const s of JOURNEY) {
    lines.push(`STEP ${s.step} — ${language === "fa" ? s.fa : s.title}`);
    lines.push(`  owner: ${s.owner}`);
    lines.push(`  covers: ${s.channels.join(", ")}`);
    lines.push(`  output: ${s.output}`);
    if (s.no_guarantee) lines.push("  ⚠️ No guaranteed immigration result is promised.");
    lines.push("");
  }
  return lines.join("\n").trim();
}

export function layersText() {
  const out = ["TWO-LAYER LEGAL MODEL", ""];
  for (const [key, layer] of Object.entries(LAYERS)) {
    out.push(`${key.toUpperCase()} — ${layer.name} (${layer.when})`);
    out.push(`  ${layer.items.join(" · ")}`);
    out.push(`  journey steps: ${layer.steps.join(", ")}`);
    out.push("");
  }
  out.push("The same startup stays inside the legal partner's ecosystem as it grows.");
  return out.join("\n");
}

export function commercialModelsText() {
  const out = ["PROPOSED COMMERCIAL MODELS", ""];
  for (const [key, m] of Object.entries(COMMERCIAL_MODELS)) {
    out.push(`Model ${key} — ${m.name}`);
    out.push(`  ${m.detail}`);
    out.push(`  platform: ${m.platform_revenue}`);
    out.push(`  legal partner: ${m.partner_revenue}`);
    out.push("");
  }
  out.push("Note: any referral/fee arrangement must comply with the applicable Turkish bar rules —");
  out.push("the legal partner confirms what is permissible.");
  return out.join("\n").trim();
}

export function assessmentText(a, startupName = "") {
  const pct = Math.round(a.score * 100);
  const out = [
    `PRE-LANDING LEGAL ASSESSMENT — ${startupName || "startup"}`,
    `Readiness score: ${pct}/100  →  ${a.band.toUpperCase().replace("_", " ")}`,
    `Legal layer to start with: ${LAYERS[a.layer].name}`,
    "",
    "Why:",
  ];
  a.reasons.forEach((r) => out.push(`  + ${r}`));
  if (a.red_flags.length) {
    out.push("", "Red flags for the lawyer:");
    a.red_flags.forEach((f) => out.push(`  ! ${f}`));
  }
  out.push("", "Document checklist (AI-prepared, lawyer-confirmed):");
  a.document_checklist.forEach((d) => out.push(`  [ ] ${d}`));
  out.push("", "Questions the legal partner must answer:");
  a.questions_for_lawyer.forEach((q) => out.push(`  ? ${q}`));
  out.push("", "Structure options to evaluate (decision belongs to the lawyer):");
  a.recommended_structures.forEach((s) => out.push(`  - ${s}`));
  return out.join("\n");
}

export const nextStep = (step) => JOURNEY[Math.min(Math.max(step, 1), JOURNEY.length) - 1];
