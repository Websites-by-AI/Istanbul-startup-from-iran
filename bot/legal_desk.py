"""Iran–Türkiye Startup Legal Desk  (deck §4–§6, §12–§16).

Implements, as executable logic:

* the 6-step startup journey (Selection → Pre-Landing Legal Assessment →
  Türkiye Entry → Turkish Business Structure → Commercial Launch → Investment)
* the Startup Legal Intake Form and the Pre-Landing Legal Assessment score
* the two-layer legal model (Market Entry Legal / Investment & Growth Legal)
* the four commercial models (Referral, Preferred Legal Partner, Startup Legal
  Package, Corporate Legal Support)
* the Istanbul pilot funnel and success metrics
* the AI-safety routing into a licensed professional

Nothing here gives legal advice. Every recommendation is an *option list for a
lawyer to confirm* — see :func:`safety.review`.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .models import LegalCase, Startup

# ---------------------------------------------------------------- journey ----

JOURNEY: list[dict[str, Any]] = [
    {
        "step": 1,
        "title": "Selection",
        "fa": "انتخاب تیم",
        "owner": "Platform",
        "channels": ["Elcom", "GITEX", "Startup competitions", "Universities", "Accelerators", "Startup communities"],
        "output": "Selected 3-person team (Founder / Technical / Business)",
    },
    {
        "step": 2,
        "title": "Pre-Landing Legal Assessment",
        "fa": "ارزیابی حقوقی پیش از ورود",
        "owner": "Legal Partner",
        "channels": [
            "Founder structure",
            "Current company",
            "IP ownership",
            "Contracts",
            "Team members",
            "Intended activities in Türkiye",
            "Possible legal structures",
        ],
        "output": "Assessment report + document checklist",
    },
    {
        "step": 3,
        "title": "Türkiye Entry",
        "fa": "ورود به ترکیه",
        "owner": "Legal Partner + Platform",
        "channels": ["Visa", "Residence", "Work authorization", "Company formation"],
        "output": "Applicable pathways explained by the lawyer. No guaranteed immigration result.",
        "no_guarantee": True,
    },
    {
        "step": 4,
        "title": "Turkish Business Structure",
        "fa": "ساختار کسب‌وکار ترکیه",
        "owner": "Legal Partner + Accountant",
        "channels": [
            "Turkish subsidiary",
            "Turkish company",
            "Branch / representative structure where appropriate",
            "Other legally suitable structure",
        ],
        "output": "Structure decision signed off by the licensed lawyer",
    },
    {
        "step": 5,
        "title": "Commercial Launch",
        "fa": "شروع تجاری",
        "owner": "Legal Partner",
        "channels": [
            "Corporate contracts",
            "Partnership agreements",
            "Employment arrangements",
            "IP protection",
            "Commercial compliance",
        ],
        "output": "PoC contract / commercial contract in place",
    },
    {
        "step": 6,
        "title": "Investment",
        "fa": "سرمایه‌گذاری",
        "owner": "Legal & Investment Team",
        "channels": [
            "Investment",
            "Shareholding",
            "Founder arrangements",
            "Due diligence",
            "Commercial partnerships",
        ],
        "output": "Term sheet, SHA and investment documentation",
    },
]

LAYERS = {
    "layer1": {
        "name": "Market Entry Legal",
        "fa": "حقوق ورود به بازار",
        "when": "Before the startup arrives",
        "items": ["Immigration", "Company", "IP", "Contracts", "Compliance", "Founder structure"],
        "steps": [2, 3, 4],
    },
    "layer2": {
        "name": "Investment & Growth Legal",
        "fa": "حقوق سرمایه‌گذاری و رشد",
        "when": "After landing",
        "items": [
            "Corporate agreements",
            "PoC contracts",
            "Investment documentation",
            "Shareholder agreements",
            "Due diligence",
            "Strategic partnerships",
        ],
        "steps": [5, 6],
    },
}

COMMERCIAL_MODELS = {
    "A": {
        "name": "Referral",
        "detail": "Platform introduces a qualified startup; the legal partner contracts directly with the startup.",
        "platform_revenue": "Referral / success fee (if permitted by the applicable bar rules)",
        "partner_revenue": "Direct client engagement",
    },
    "B": {
        "name": "Preferred Legal Partner",
        "detail": "The firm/group is designated 'Official Legal Landing Partner' of the program.",
        "platform_revenue": "Program partnership fee / revenue share",
        "partner_revenue": "Exclusive qualified pipeline + branding",
    },
    "C": {
        "name": "Startup Legal Package",
        "detail": "Standardised package: Pre-Landing Assessment → Company / Market Entry → Commercial Setup → Ongoing Legal Support.",
        "platform_revenue": "Package margin",
        "partner_revenue": "Predictable, repeatable engagements",
    },
    "D": {
        "name": "Corporate Legal Support",
        "detail": "The legal partner also represents Turkish corporate sponsors, investors and partnership transactions.",
        "platform_revenue": "Two-sided deal facilitation",
        "partner_revenue": "Both sides of the transaction",
    },
}

ASKS_FROM_LEGAL_GROUP = [
    "Review the startup landing model.",
    "Identify legally permissible pathways.",
    "Define the legal services required for each stage.",
    "Design a standard Startup Legal Intake Form.",
    "Define a Pre-Landing Legal Assessment.",
    "Define appropriate company / contractual structures.",
    "Establish a professional referral mechanism.",
    "Participate as the program's preferred legal partner if mutually agreed.",
]

PLATFORM_PROVIDES = [
    "Qualified Startup Leads",
    "Pre-screened Founder Teams",
    "Startup Profiles",
    "Corporate Introductions",
    "Hotel Partnerships",
    "Exhibition Partnerships",
    "AI-assisted Intake",
    "International Visibility",
    "Startup Deal Flow",
]

# ------------------------------------------------------------- intake form ----

INTAKE_FORM: list[dict[str, Any]] = [
    {"key": "startup_name", "label": "Startup name", "fa": "نام استارتاپ", "type": "text", "required": True},
    {"key": "sector", "label": "Sector", "fa": "حوزه فعالیت", "type": "choice", "required": True,
     "options": ["AI", "SaaS", "FinTech (where legally permitted)", "HealthTech", "ClimateTech", "IndustrialTech", "DeepTech", "Other"]},
    {"key": "stage", "label": "Funding / product stage", "fa": "مرحله", "type": "choice", "required": True,
     "options": ["idea", "mvp", "revenue", "scaling"]},
    {"key": "team_size", "label": "Team size travelling (standard = 3)", "fa": "تعداد اعضای تیم", "type": "int", "required": True},
    {"key": "team_roles", "label": "Roles (Founder / Technical / Business)", "fa": "نقش‌ها", "type": "text", "required": True},
    {"key": "has_iran_entity", "label": "Existing company in Iran?", "fa": "شرکت ثبت‌شده در ایران؟", "type": "bool", "required": True},
    {"key": "has_turkey_entity", "label": "Existing company/entity in Türkiye?", "fa": "شرکت ثبت‌شده در ترکیه؟", "type": "bool", "required": True},
    {"key": "ip_owned_by_company", "label": "Is the IP owned by the company (not individuals)?", "fa": "مالکیت فکری به نام شرکت است؟", "type": "bool", "required": True},
    {"key": "founder_agreement", "label": "Written founder / shareholders agreement in place?", "fa": "قرارداد کتبی بین بنیان‌گذاران؟", "type": "bool", "required": True},
    {"key": "intended_city", "label": "Target city", "fa": "شهر هدف", "type": "choice", "required": True,
     "options": ["Istanbul", "Ankara", "İzmir", "Antalya", "Other"]},
    {"key": "intended_activity", "label": "Intended activity in Türkiye", "fa": "فعالیت مورد نظر در ترکیه", "type": "text", "required": True},
    {"key": "residence_status", "label": "Current residence / visa status of each member", "fa": "وضعیت اقامت/ویزای هر عضو", "type": "text", "required": True},
    {"key": "funding_target_usd", "label": "Funding target (USD)", "fa": "هدف جذب سرمایه (دلار)", "type": "int", "required": False},
    {"key": "source", "label": "Where we met (Elcom / GITEX / university / accelerator / community)", "fa": "نقطه آشنایی", "type": "text", "required": False},
]

REQUIRED_INTAKE_KEYS = [f["key"] for f in INTAKE_FORM if f["required"]]


def validate_intake(intake: dict[str, Any]) -> list[str]:
    """Return the list of missing required intake keys."""
    missing = []
    for key in REQUIRED_INTAKE_KEYS:
        value = intake.get(key)
        if value is None or (isinstance(value, str) and not value.strip()):
            missing.append(key)
    return missing


# --------------------------------------------------------------- assessment ---

@dataclass
class Assessment:
    score: float            # 0..1
    band: str               # ready / needs_work / not_ready
    reasons: list[str]
    red_flags: list[str]
    document_checklist: list[str]
    questions_for_lawyer: list[str]
    recommended_structures: list[str]
    layer: str

    def as_dict(self) -> dict[str, Any]:
        return {
            "score": round(self.score, 3),
            "band": self.band,
            "reasons": self.reasons,
            "red_flags": self.red_flags,
            "document_checklist": self.document_checklist,
            "questions_for_lawyer": self.questions_for_lawyer,
            "recommended_structures": self.recommended_structures,
            "layer": self.layer,
        }


WEIGHTS = {
    "has_iran_entity": 0.12,
    "ip_owned_by_company": 0.16,
    "founder_agreement": 0.16,
    "team_size_ok": 0.10,
    "stage_ok": 0.14,
    "intended_activity_ok": 0.12,
    "residence_status_ok": 0.10,
    "funding_target_ok": 0.10,
}


def pre_landing_assessment(intake: dict[str, Any]) -> Assessment:
    """Score a pre-screened team for the legal partner (deck §7).

    This is a *readiness* score for pipeline quality — not a legal opinion.
    """
    reasons: list[str] = []
    red_flags: list[str] = []
    score = 0.0

    def yes(value: Any) -> bool:
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            return value.strip().lower() in {"yes", "y", "true", "بله", "evet", "1", "var"}
        return bool(value)

    # entity
    if yes(intake.get("has_iran_entity")):
        score += WEIGHTS["has_iran_entity"]
        reasons.append("Existing Iranian entity → share/asset transfer structure can be planned.")
    else:
        red_flags.append("No existing entity: founder-level IP and shareholding must be documented first.")

    # IP
    if yes(intake.get("ip_owned_by_company")):
        score += WEIGHTS["ip_owned_by_company"]
        reasons.append("IP is company-owned → cleaner assignment/licence into the Turkish structure.")
    else:
        red_flags.append("IP not company-owned (or unknown): assignment/licence chain must be reviewed by the lawyer.")

    # founder agreement
    if yes(intake.get("founder_agreement")):
        score += WEIGHTS["founder_agreement"]
        reasons.append("Written founder agreement in place.")
    else:
        red_flags.append("No written founder / shareholders agreement — blocking item for investment layer.")

    # team size
    try:
        size = int(intake.get("team_size") or 0)
    except (TypeError, ValueError):
        size = 0
    if 1 <= size <= 6:
        score += WEIGHTS["team_size_ok"]
        reasons.append(f"Team size {size} fits the standard 3-person landing model.")
    else:
        red_flags.append("Team size outside the pilot model (expected ~3, max 6).")

    # stage
    stage = str(intake.get("stage", "")).lower()
    if stage in {"mvp", "revenue", "scaling"}:
        score += WEIGHTS["stage_ok"]
        reasons.append(f"Stage '{stage}' is landable: a PoC or commercial contract is realistic.")
    elif stage == "idea":
        score += WEIGHTS["stage_ok"] * 0.4
        reasons.append("Idea stage: landing is possible but a corporate PoC will take longer.")
    else:
        red_flags.append("Unknown stage — cannot size the legal workload.")

    # intended activity
    activity = str(intake.get("intended_activity", "")).strip()
    if len(activity) >= 15:
        score += WEIGHTS["intended_activity_ok"]
        reasons.append("Intended activity in Türkiye is described concretely.")
    else:
        red_flags.append("Intended activity in Türkiye is too vague to map to a legal pathway.")

    # residence info
    residence = str(intake.get("residence_status", "")).strip()
    if len(residence) >= 10:
        score += WEIGHTS["residence_status_ok"]
        reasons.append("Current residence/visa status of members documented.")
    else:
        red_flags.append("Residence/visa status of members unknown — lawyer cannot plan the entry pathway.")

    # funding target
    try:
        target = int(intake.get("funding_target_usd") or 0)
    except (TypeError, ValueError):
        target = 0
    if target > 0:
        score += WEIGHTS["funding_target_ok"]
        reasons.append("Funding target stated → Layer 2 (Investment & Growth Legal) is relevant.")
    else:
        reasons.append("No funding target stated → start with Layer 1 (Market Entry Legal) only.")

    score = max(0.0, min(1.0, score))
    if score >= 0.75:
        band = "ready"
    elif score >= 0.5:
        band = "needs_work"
    else:
        band = "not_ready"

    checklist = build_document_checklist(intake, red_flags)
    questions = build_lawyer_questions(intake, red_flags)
    structures = recommend_structures(intake)
    layer = "layer2" if target > 0 and band != "not_ready" else "layer1"

    return Assessment(
        score=score,
        band=band,
        reasons=reasons,
        red_flags=red_flags,
        document_checklist=checklist,
        questions_for_lawyer=questions,
        recommended_structures=structures,
        layer=layer,
    )


def build_document_checklist(intake: dict[str, Any], red_flags: list[str]) -> list[str]:
    docs = [
        "Startup profile (one-pager)",
        "Founder / team member passports and current visa or residence status",
        "Existing company registration documents (Iran / other)",
        "Cap table and shareholding structure",
        "Founder / shareholders agreement (or a note that none exists)",
        "IP ownership: assignment, licence, repository and trademark records",
        "Existing commercial contracts and NDAs",
        "Description of intended activity in Türkiye (products, customers, revenue model)",
        "Draft Turkish business plan / financial projection for the first 12 months",
    ]
    if str(intake.get("sector", "")).lower().startswith(("fin", "health")):
        docs.append("Sector-specific regulatory notes (FinTech / HealthTech are regulated — lawyer must confirm scope)")
    if any("IP" in f for f in red_flags):
        docs.append("Written IP assignment from every individual contributor to the company")
    if any("founder" in f.lower() for f in red_flags):
        docs.append("Signed founder agreement covering vesting, roles and decision rights")
    return docs


def build_lawyer_questions(intake: dict[str, Any], red_flags: list[str]) -> list[str]:
    questions = [
        "Which residence / work-authorisation pathway is appropriate for each of the three team members?",
        "Which Turkish entity type fits the intended activity (and is a branch/representative structure appropriate)?",
        "How should the Iranian entity relate to the Turkish entity (subsidiary / sister / operating company)?",
        "What is the correct order of steps: entity first or residence first for this nationality profile?",
        "Which tax registrations and accounting obligations start on day one?",
        "How is the IP transferred or licensed into the Turkish structure?",
        "What can and cannot be promised to the startup in writing?",
    ]
    if red_flags:
        questions.insert(0, "Which of these red flags are blocking, and which can be fixed after arrival?")
    return questions


STRUCTURES = {
    "turkish_subsidiary": "Model A — Turkish Subsidiary (subsidiary of the existing parent)",
    "sister_company": "Model B — Sister Company (independent entity with contractual/ownership link)",
    "operating_company": "Model C — Turkish Operating Company (new company for Türkiye operations)",
}


def recommend_structures(intake: dict[str, Any]) -> list[str]:
    """Return *options for the lawyer to confirm* — never a decision."""
    def yes(value: Any) -> bool:
        return value is True or str(value).strip().lower() in {"yes", "true", "بله", "evet", "1"}

    out: list[str] = []
    has_parent = yes(intake.get("has_iran_entity"))
    wants_raise = int(intake.get("funding_target_usd") or 0) > 0
    size = int(intake.get("team_size") or 3)

    if has_parent and wants_raise:
        out.append(STRUCTURES["turkish_subsidiary"])
        out.append(STRUCTURES["sister_company"])
    elif has_parent:
        out.append(STRUCTURES["sister_company"])
        out.append(STRUCTURES["turkish_subsidiary"])
    else:
        out.append(STRUCTURES["operating_company"])
        out.append(STRUCTURES["sister_company"])
    if size <= 2:
        out.append(STRUCTURES["operating_company"])
    # de-duplicate, keep order
    seen: set[str] = set()
    unique = [s for s in out if not (s in seen or seen.add(s))]
    return unique


# ------------------------------------------------------------------- funnel ---

PILOT = {
    "city": "Istanbul",
    "teams": 10,
    "team_size": 3,
    "people": 30,
    "ecosystem": ["Hotels", "Turkish corporations", "Lawyers", "Investors", "Accelerators", "Technology parks"],
}

FUNNEL_STAGES = [
    ("100+ startups", 100),
    ("30–50 screened", 40),
    ("10 selected", 10),
    ("10 legal assessments", 10),
    ("10 Türkiye landing plans", 10),
    ("Corporate matching", 6),
    ("PoCs", 3),
    ("Investment / commercial partnerships", 2),
]

SUCCESS_METRICS = [
    ("Startup teams", 10),
    ("Founders / team members", 30),
    ("Legal assessments", 10),
    ("Corporate introductions", "5+"),
    ("PoC opportunities", "3+"),
    ("Investment / commercial opportunities", "1–3"),
    ("Repeatable legal landing framework", 1),
]


def funnel_projection(applied: int) -> list[dict[str, Any]]:
    """Scale the Istanbul pilot funnel to *applied* inbound startups."""
    base_top = FUNNEL_STAGES[0][1]
    rows = []
    for label, value in FUNNEL_STAGES:
        scaled = max(1, round(value * (applied / base_top))) if applied else value
        rows.append({"stage": label, "pilot": value, "projected": scaled})
    return rows


# --------------------------------------------------------------- rendering ---

def journey_text(language: str = "en") -> str:
    lines = ["STARTUP JOURNEY — Iran → Türkiye Legal Landing Desk", ""]
    for s in JOURNEY:
        title = s["fa"] if language == "fa" else s["title"]
        lines.append(f"STEP {s['step']} — {title}")
        lines.append(f"  owner: {s['owner']}")
        lines.append("  covers: " + ", ".join(s["channels"]))
        lines.append(f"  output: {s['output']}")
        if s.get("no_guarantee"):
            lines.append("  ⚠️ No guaranteed immigration result is promised.")
        lines.append("")
    return "\n".join(lines).strip()


def layers_text(language: str = "en") -> str:
    out = ["TWO-LAYER LEGAL MODEL", ""]
    for key, layer in LAYERS.items():
        name = layer["fa"] if language == "fa" else layer["name"]
        out.append(f"{key.upper()} — {name} ({layer['when']})")
        out.append("  " + " · ".join(layer["items"]))
        out.append(f"  journey steps: {', '.join(str(s) for s in layer['steps'])}")
        out.append("")
    out.append("The same startup stays inside the legal partner's ecosystem as it grows.")
    return "\n".join(out)


def commercial_models_text(language: str = "en") -> str:
    out = ["PROPOSED COMMERCIAL MODELS", ""]
    for key, model in COMMERCIAL_MODELS.items():
        out.append(f"Model {key} — {model['name']}")
        out.append(f"  {model['detail']}")
        out.append(f"  platform: {model['platform_revenue']}")
        out.append(f"  legal partner: {model['partner_revenue']}")
        out.append("")
    out.append("Note: any referral/fee arrangement must comply with the applicable Turkish bar rules —")
    out.append("the legal partner confirms what is permissible.")
    return "\n".join(out).strip()


def assessment_text(assessment: Assessment, startup_name: str = "", language: str = "en") -> str:
    pct = round(assessment.score * 100)
    out = [
        f"PRE-LANDING LEGAL ASSESSMENT — {startup_name or 'startup'}",
        f"Readiness score: {pct}/100  →  {assessment.band.upper().replace('_', ' ')}",
        f"Legal layer to start with: {LAYERS[assessment.layer]['name']}",
        "",
        "Why:",
    ]
    out += [f"  + {r}" for r in assessment.reasons]
    if assessment.red_flags:
        out.append("")
        out.append("Red flags for the lawyer:")
        out += [f"  ! {f}" for f in assessment.red_flags]
    out += ["", "Document checklist (AI-prepared, lawyer-confirmed):"]
    out += [f"  [ ] {d}" for d in assessment.document_checklist]
    out += ["", "Questions the legal partner must answer:"]
    out += [f"  ? {q}" for q in assessment.questions_for_lawyer]
    out += ["", "Structure options to evaluate (decision belongs to the lawyer):"]
    out += [f"  - {s}" for s in assessment.recommended_structures]
    return "\n".join(out)


def startup_from_intake(intake: dict[str, Any], channel: str = "web") -> Startup:
    try:
        team_size = int(intake.get("team_size") or 3)
    except (TypeError, ValueError):
        team_size = 3
    return Startup(
        name=str(intake.get("startup_name", "")).strip(),
        sector=str(intake.get("sector", "")).strip(),
        stage=str(intake.get("stage", "")).strip(),
        team_size=team_size,
        has_iran_entity=bool(intake.get("has_iran_entity")),
        has_turkey_entity=bool(intake.get("has_turkey_entity")),
        ip_owned_by_company=bool(intake.get("ip_owned_by_company")),
        funding_target_usd=int(intake.get("funding_target_usd") or 0),
        intended_city=str(intake.get("intended_city", "Istanbul")).strip(),
        intended_activity=str(intake.get("intended_activity", "")).strip(),
        source=str(intake.get("source", "")).strip(),
        notes=str(intake.get("notes", "")).strip(),
    )


def open_case(startup: Startup, intake: dict[str, Any], assessment: Assessment, channel: str = "web") -> LegalCase:
    case = LegalCase(
        startup_id=startup.id,
        startup_name=startup.name,
        channel=channel,
        step=2,
        layer="layer1",              # the journey always starts in Layer 1 (Market Entry Legal)
        intake=intake,
        assessment_score=assessment.score,
        assessment_band=assessment.band,
        recommended_structures=assessment.recommended_structures,
        checklist=assessment.document_checklist,
        assigned_to_human=True,   # a licensed professional always owns the file
    )
    case.log(
        "case_opened",
        band=assessment.band,
        score=round(assessment.score, 3),
        layer=case.layer,
        recommended_starting_layer=assessment.layer,
    )
    return case


def next_step(case: LegalCase) -> dict[str, Any]:
    return JOURNEY[min(max(case.step, 1), len(JOURNEY)) - 1]


def advance(case: LegalCase) -> LegalCase:
    case.step = min(case.step + 1, len(JOURNEY))
    step = next_step(case)
    case.layer = "layer2" if step["step"] in LAYERS["layer2"]["steps"] else "layer1"
    case.log("step_advanced", step=case.step, title=step["title"])
    return case
