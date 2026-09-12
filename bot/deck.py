"""Pitch-deck generator for the **legal group** version of the proposal.

The deck is *not* the startup-attraction deck: it is reframed as
**Legal Landing Partner + Cross-Border Startup Desk** (deck §1–§24).
Personalisation parameters let you tailor it to a specific group once you know
their members, services and revenue model.

Outputs: Markdown, self-contained HTML (printable to PDF from the browser), and
a dependency-free PDF built with stdlib only.
"""

from __future__ import annotations

import datetime as _dt
import io
import re
import zlib
from dataclasses import dataclass, field
from typing import Any


@dataclass
class DeckOptions:
    legal_group_name: str = "Iranian–Turkish Legal Group"
    platform_name: str = "Türkiye Startup Landing Platform"
    pilot_city: str = "Istanbul"
    cohort_size: int = 10
    team_size: int = 3
    sender_name: str = ""
    contact: str = ""
    date: str = field(default_factory=lambda: _dt.date.today().isoformat())
    include_hotel_section: bool = True
    language: str = "en"

    @property
    def people(self) -> int:
        return self.cohort_size * self.team_size


def _title(o: DeckOptions) -> str:
    return "IRAN → TÜRKİYE — Startup Legal Landing Partnership"


def deck_markdown(o: DeckOptions | None = None) -> str:
    o = o or DeckOptions()
    L: list[str] = []
    A = L.append

    A(f"# {_title(o)}")
    A("")
    A("### A proposed strategic partnership between")
    A(f"### {o.legal_group_name} + {o.platform_name}")
    A("")
    A(f"*{o.date}*" + (f" · prepared by {o.sender_name}" if o.sender_name else ""))
    A("")
    A("**From Exhibition → Legal Entry → Turkish Company → Corporate Partnership → Investment**")
    A("")
    A("---")
    A("")
    A("## 1. The Opportunity")
    A("")
    A("Every year, Iranian founders and technology teams participate in exhibitions, technology")
    A("events and startup programs. They meet Turkish companies, investors, accelerators,")
    A("technology parks and potential customers.")
    A("")
    A('But after the event, a critical question remains: **"How do we legally and practically')
    A('continue in Türkiye?"** That is the gap we want to solve.')
    A("")
    A("---")
    A("")
    A("## 2. The Proposed Platform")
    A("")
    A(f"We are developing a **{o.platform_name}** that moves selected international startup teams from")
    A("**Exhibition → Market Entry → Turkish Business Operation → Corporate Partnership → Investment**.")
    A("")
    A("The first target market is: **Iranian technology startups entering Türkiye.**")
    A("")
    A("---")
    A("")
    A("## 3. Why a Legal Partner Is Essential")
    A("")
    A("A startup cannot safely enter a new market with only travel support, hotel booking,")
    A("networking and AI tools. It needs a **qualified legal pathway**.")
    A("")
    A("The platform therefore seeks a **Strategic Legal Landing Partner** with expertise in:")
    A("")
    for item in [
        "Iran–Türkiye cross-border matters",
        "Corporate law",
        "Company formation",
        "Commercial contracts",
        "Immigration / residence pathways",
        "Employment",
        "Intellectual property",
        "Tax coordination",
        "Investment agreements",
    ]:
        A(f"- {item}")
    A("")
    A("> Professional legal activity in Türkiye is regulated by the bar associations and foreign")
    A("> lawyers cannot simply practise as Turkish lawyers. The partnership is therefore structured")
    A("> **with lawyers qualified in Türkiye**, and the legal partner — not the platform — defines")
    A("> and confirms every permissible pathway.")
    A("")
    A("---")
    A("")
    A(f"## 4. Proposed Role of {o.legal_group_name}")
    A("")
    A(f"We propose establishing a dedicated **Iran–Türkiye Startup Legal Desk** within the broader")
    A("Startup Landing Platform. The Desk becomes the **first legal point of contact** for selected")
    A("startup teams entering Türkiye.")
    A("")
    A("---")
    A("")
    A("## 5. Startup Journey")
    A("")
    steps = [
        ("STEP 1 — Selection", "Elcom, GITEX, startup competitions, universities, accelerators, startup communities."),
        ("STEP 2 — Pre-Landing Legal Assessment",
         "The legal partner reviews founder structure, current company, IP ownership, contracts, team members, intended activities in Türkiye and possible legal structures."),
        ("STEP 3 — Türkiye Entry",
         "The team receives professional guidance concerning applicable visa, residence, work-authorization and company-formation pathways. **No guaranteed immigration result is promised.**"),
        ("STEP 4 — Turkish Business Structure",
         "Turkish subsidiary / Turkish company / branch or representative structure where appropriate / other legally suitable structure."),
        ("STEP 5 — Commercial Launch",
         "Corporate contracts, partnership agreements, employment arrangements, IP protection, commercial compliance."),
        ("STEP 6 — Investment",
         "Investment, shareholding, founder arrangements, due diligence, commercial partnerships."),
    ]
    for name, body in steps:
        A(f"### {name}")
        A(body)
        A("")
    A("---")
    A("")
    A("## 6. Two-Layer Legal Model")
    A("")
    A("### Layer 1 — Market Entry Legal *(before the startup arrives)*")
    A("Immigration · Company · IP · Contracts · Compliance · Founder structure")
    A("")
    A("### Layer 2 — Investment & Growth Legal *(after landing)*")
    A("Corporate agreements · PoC contracts · Investment documentation · Shareholder agreements · Due diligence · Strategic partnerships")
    A("")
    A("The same startup can therefore remain inside the legal partner's ecosystem as it grows.")
    A("")
    A("---")
    A("")
    A("## 7. Why This Is Valuable for the Legal Group")
    A("")
    A("This is **not simply a referral arrangement**. The platform creates a")
    A("**Qualified Startup Client Pipeline**: instead of random inquiries from founders who may not")
    A("be ready to operate in Türkiye, the legal partner receives pre-screened teams with:")
    A("")
    for item in [
        "Startup profile", "Founder information", "Business model", "Technology",
        "Funding stage", "Intended Turkish activity", "Legal requirements", "Corporate targets",
    ]:
        A(f"- {item}")
    A("")
    A("**The lawyer enters the process earlier.**")
    A("")
    A("---")
    A("")
    A("## 8. New Client Segment")
    A("")
    A("The partnership creates a specialised client category — **International Startup Clients** —")
    A("especially Iranian startups, technology founders, AI, SaaS, ClimateTech, HealthTech,")
    A("IndustrialTech, FinTech (where legally permitted) and DeepTech companies.")
    A("The long-term model can expand beyond Iran.")
    A("")
    A("---")
    A("")
    if o.include_hotel_section:
        A("## 9. Legal + Hotel + Corporate Ecosystem")
        A("")
        A("```")
        A("HOTEL (Accommodation Sponsor)")
        A("   ↓")
        A("LEGAL PARTNER (Legal Landing Desk)")
        A("   ↓")
        A("CORPORATE SPONSOR (Market / PoC Partner)")
        A("   ↓")
        A("INVESTOR (Capital)")
        A("   ↓")
        A("STARTUP (Technology + Team)")
        A("```")
        A("")
        A("Hotels contribute **unused room-night inventory** instead of cash and become")
        A("*Official Startup Accommodation Partners* in the mapped cities (Istanbul, Ankara, later")
        A("İzmir and Antalya). The platform coordinates the ecosystem.")
        A("")
        A("---")
        A("")
        A("## 10. Corporate Sponsor Model")
        A("")
        A("A Turkish company sponsors a selected startup — e.g. a **Turkish industrial company**")
        A("sponsoring an **Iranian industrial-AI startup**. The startup enters Türkiye, the legal")
        A("partner establishes the contractual framework, and the two run a **Proof of Concept**.")
        A("If successful, a **commercial contract**, **investment** or **strategic partnership** can")
        A("follow. This turns legal work from a one-time company registration into a long-term")
        A("commercial relationship.")
        A("")
        A("---")
        A("")
    A("## 11. AI Layer")
    A("")
    A("The platform includes an **AI Startup Navigator** that organises the legal checklist, market")
    A("research, corporate matching, investor research, meeting preparation, media/PR and startup")
    A("documentation.")
    A("")
    A("> **AI does not replace the lawyer.** It prepares, organises and routes information.")
    A("> **The licensed legal professional remains responsible for legal advice.**")
    A("")
    A("## 12. Legal AI Safety Principle")
    A("")
    A("The platform explicitly distinguishes **AI Information** from **Professional Legal Advice**:")
    A("")
    A('- The AI may say: *"These are the documents/questions that may need to be reviewed."*')
    A('- The legal partner decides: *"This is the legally appropriate route for this specific client."*')
    A("")
    A("This protects the professional role of the legal partner and is enforced in code")
    A("(guarantee language is stripped; immigration determinations are escalated to a human).")
    A("")
    A("---")
    A("")
    A("## 13. Proposed Commercial Model")
    A("")
    A("| Model | Structure | Value for the legal partner |")
    A("|---|---|---|")
    A("| **A — Referral** | Platform introduces a qualified startup; partner contracts directly with it | Direct client engagement |")
    A("| **B — Preferred Legal Partner** | Designated *Official Legal Landing Partner* of the program | Exclusive qualified pipeline + branding |")
    A("| **C — Startup Legal Package** | Pre-Landing Assessment → Company/Market Entry → Commercial Setup → Ongoing support | Predictable, repeatable engagements |")
    A("| **D — Corporate Legal Support** | Partner also represents Turkish corporate sponsors and investors | Value on both sides of the transaction |")
    A("")
    A("Any referral/fee arrangement must comply with the applicable Turkish bar rules — the legal")
    A("partner confirms what is permissible.")
    A("")
    A("---")
    A("")
    A("## 14. What We Are Asking From the Legal Group")
    A("")
    A("We are **not asking for free legal work**. We are proposing a **strategic partnership** in which")
    A("the legal group helps design the legal architecture of the program:")
    A("")
    for i, item in enumerate(
        [
            "Review the startup landing model.",
            "Identify legally permissible pathways.",
            "Define the legal services required for each stage.",
            "Design a standard Startup Legal Intake Form.",
            "Define a Pre-Landing Legal Assessment.",
            "Define appropriate company / contractual structures.",
            "Establish a professional referral mechanism.",
            "Participate as the program's preferred legal partner if mutually agreed.",
        ],
        1,
    ):
        A(f"{i}. {item}")
    A("")
    A("---")
    A("")
    A("## 15. What the Platform Provides")
    A("")
    A("Qualified startup leads · pre-screened founder teams · startup profiles · corporate")
    A("introductions · hotel partnerships · exhibition partnerships · AI-assisted intake ·")
    A("international visibility · startup deal flow.")
    A("")
    A("The legal partner focuses on **legal expertise**; the platform focuses on **startup")
    A("acquisition + ecosystem coordination**.")
    A("")
    A("---")
    A("")
    A(f"## 16. Pilot Proposal — {o.pilot_city} Pilot")
    A("")
    A(f"- First cohort: **{o.cohort_size} startup teams**")
    A(f"- Team size: **{o.team_size} people**")
    A(f"- Total founders / team members: **{o.people}**")
    A("- Target ecosystem: hotels, Turkish corporations, lawyers, investors, accelerators, technology parks")
    A("")
    A("The legal partner participates in designing the first cohort's legal landing framework.")
    A("")
    A("### Pilot funnel")
    A("")
    A("```")
    A("100+ startups → 30–50 screened → 10 selected → 10 legal assessments")
    A("→ 10 Türkiye landing plans → corporate matching → PoCs")
    A("→ investment / commercial partnerships")
    A("```")
    A("")
    A("The goal is not simply to bring people to Türkiye. **The goal is to create successful")
    A("business cases.**")
    A("")
    A("---")
    A("")
    A("## 17. Long-Term Opportunity")
    A("")
    A("After validating the Iran → Türkiye corridor, **Türkiye can become a regional Startup Landing")
    A("Hub** — Iran, Central Asia, Caucasus, Middle East, South Asia. The legal partner becomes part")
    A("of a broader **International Startup Legal Network**.")
    A("")
    A("---")
    A("")
    A("## 18. Why Us + Why You")
    A("")
    A("| Our platform | Legal partner |")
    A("|---|---|")
    A("| Startup discovery | Turkish legal expertise |")
    A("| Exhibition access | Iran–Türkiye understanding |")
    A("| AI layer | Corporate law |")
    A("| Hotel network | Immigration / residence expertise |")
    A("| Corporate matchmaking | Contracts |")
    A("| Media | Investment legal support |")
    A("")
    A("**Together we can create the legal infrastructure for startup landing.**")
    A("")
    A("---")
    A("")
    A("## 19. The Partnership")
    A("")
    A("We propose beginning with a small, controlled pilot. **No large infrastructure investment")
    A("required.**")
    A("")
    A("`Legal framework → 10 startups → Istanbul → measure results → improve → scale`")
    A("")
    A("---")
    A("")
    A("## 20. Success Metrics")
    A("")
    A("| Metric | Target |")
    A("|---|---|")
    A(f"| Startup teams | {o.cohort_size} |")
    A(f"| Founders / team members | {o.people} |")
    A("| Legal assessments | 10 |")
    A("| Corporate introductions | 5+ |")
    A("| PoC opportunities | 3+ |")
    A("| Investment / commercial opportunities | 1–3 |")
    A("| Repeatable legal landing framework | 1 |")
    A("")
    A("---")
    A("")
    A("## 21. Our Vision")
    A("")
    A("We do not want to create another **visa agency**, **startup tour** or **lawyer directory**.")
    A("We want to build **Startup Landing Infrastructure**, where a startup can move from")
    A('*"I met a Turkish company at an exhibition"* to *"I legally established my business')
    A('relationship in Türkiye."*')
    A("")
    A("---")
    A("")
    A("## 22. Proposed First Meeting")
    A("")
    A("We would like to discuss three questions:")
    A("")
    A("1. Is this legal landing model workable under Turkish law?")
    A("2. What should the legal pathway look like for a typical three-person startup?")
    A(f"3. Can your group become a strategic legal partner for the first {o.pilot_city} pilot?")
    A("")
    if o.contact:
        A(f"**Contact:** {o.contact}")
        A("")
    A("---")
    A("")
    A("# IRAN → TÜRKİYE")
    A("## From Exhibition to Legal Landing")
    A("### Startups × Lawyers × Hotels × Corporates × Investors")
    A("")
    return "\n".join(L)


# --------------------------------------------------------------------- HTML --

_HTML_CSS = """
:root{--ink:#0d1b2a;--accent:#c8102e;--gold:#e0a458;--muted:#5b6b7c}
*{box-sizing:border-box}
body{margin:0;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:var(--ink);background:#f4f6f8;line-height:1.6}
.page{max-width:900px;margin:0 auto;background:#fff;padding:56px 64px;box-shadow:0 2px 24px rgba(0,0,0,.08)}
h1{font-size:34px;margin:0 0 6px;letter-spacing:-.5px}
h2{font-size:22px;margin:38px 0 10px;padding-bottom:8px;border-bottom:2px solid var(--accent)}
h3{font-size:17px;margin:22px 0 6px;color:var(--accent)}
blockquote{margin:16px 0;padding:12px 18px;border-left:4px solid var(--gold);background:#fffaf2;font-style:italic}
pre{background:#0d1b2a;color:#e6edf3;padding:16px;border-radius:8px;overflow:auto;font-size:13px}
code{background:#eef2f6;padding:2px 6px;border-radius:4px}
table{border-collapse:collapse;width:100%;margin:16px 0;font-size:14px}
th{background:var(--ink);color:#fff;text-align:left;padding:10px}
td{border-bottom:1px solid #e3e8ee;padding:9px 10px}
tr:nth-child(even) td{background:#fafbfc}
.hero{border-bottom:6px solid var(--accent);padding-bottom:20px;margin-bottom:8px}
.tag{display:inline-block;background:#eef2f6;border:1px solid #dde4ea;border-radius:999px;padding:3px 12px;margin:3px 4px 3px 0;font-size:12px}
.footer{margin-top:48px;padding-top:18px;border-top:1px solid #e3e8ee;color:var(--muted);font-size:12px;text-align:center}
@media print{body{background:#fff}.page{box-shadow:none;padding:0;max-width:none}}
"""


def _md_inline(text: str) -> str:
    import html as _html
    import re

    t = _html.escape(text)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"(?<!\*)\*([^*]+?)\*(?!\*)", r"<em>\1</em>", t)
    t = re.sub(r"`([^`]+?)`", r"<code>\1</code>", t)
    return t


def deck_html(o: DeckOptions | None = None) -> str:
    """Convert the deck markdown to a self-contained printable HTML page."""
    import html as _html
    import re

    o = o or DeckOptions()
    md = deck_markdown(o)
    out: list[str] = []
    lines = md.split("\n")
    i = 0
    in_code = in_table = in_list = in_quote = False
    hero_done = False

    def close_all() -> None:
        nonlocal in_table, in_list, in_quote
        if in_table:
            out.append("</table>")
            in_table = False
        if in_list:
            out.append("</ul>")
            in_list = False
        if in_quote:
            out.append("</blockquote>")
            in_quote = False

    while i < len(lines):
        line = lines[i]
        if line.strip().startswith("```"):
            close_all()
            if in_code:
                out.append("</pre>")
                in_code = False
            else:
                out.append("<pre>")
                in_code = True
            i += 1
            continue
        if in_code:
            out.append(_html.escape(line))
            i += 1
            continue
        stripped = line.strip()
        if not stripped:
            close_all()
            i += 1
            continue
        if stripped == "---":
            close_all()
            out.append("<hr>")
            i += 1
            continue
        if stripped.startswith("|"):
            cells = [c.strip() for c in stripped.strip("|").split("|")]
            if set("".join(cells)) <= set("-: "):
                i += 1
                continue
            if not in_table:
                close_all()
                out.append("<table>")
                in_table = True
                out.append("<tr>" + "".join(f"<th>{_md_inline(c)}</th>" for c in cells) + "</tr>")
            else:
                out.append("<tr>" + "".join(f"<td>{_md_inline(c)}</td>" for c in cells) + "</tr>")
            i += 1
            continue
        if stripped.startswith(">"):
            if not in_quote:
                if in_table or in_list:
                    close_all()
                out.append("<blockquote>")
                in_quote = True
            out.append(f"<p>{_md_inline(stripped.lstrip('> ').strip())}</p>")
            i += 1
            continue
        m = re.match(r"^(#{1,4})\s+(.*)$", stripped)
        if m:
            close_all()
            level = len(m.group(1))
            text = _md_inline(m.group(2))
            if level == 1 and not hero_done:
                out.append(f'<div class="hero"><h1>{text}</h1></div>')
                hero_done = True
            else:
                out.append(f"<h{level}>{text}</h{level}>")
            i += 1
            continue
        m = re.match(r"^(?:[-*]|\d+\.)\s+(.*)$", stripped)
        if m:
            if not in_list:
                close_all()
                out.append("<ul>")
                in_list = True
            out.append(f"<li>{_md_inline(m.group(1))}</li>")
            i += 1
            continue
        close_all()
        out.append(f"<p>{_md_inline(stripped)}</p>")
        i += 1
    close_all()
    if in_code:
        out.append("</pre>")

    body = "\n".join(out)
    tags = "".join(
        f'<span class="tag">{t}</span>'
        for t in ["Legal Landing Desk", "Pre-Landing Assessment", "Two-Layer Legal Model",
                  "Corporate Sponsors", "Hotel Sponsors", "AI Safety", f"{o.pilot_city} Pilot"]
    )
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{_html.escape(_title(o))}</title>
<style>{_HTML_CSS}</style></head>
<body><div class="page">
{tags}
{body}
<div class="footer">
{_html.escape(o.platform_name)} · {_html.escape(o.date)}<br>
⚖️ AI information — not legal advice. Only a licensed legal professional determines the legally
appropriate route. No residence permit, work permit, visa or company-registration outcome is guaranteed.
</div>
</div></body></html>"""


# ---------------------------------------------------------------------- PDF --

_TRANSLIT = {
    "ı": "i", "İ": "I", "ş": "s", "Ş": "S", "ğ": "g", "Ğ": "G",
    "â": "a", "î": "i", "û": "u", "–": "-", "—": "-", "’": "'", "“": '"', "”": '"',
    "•": "-", "→": "->", "×": "x", "↓": "v", "⚖": "[!]", "✅": "[+]", "❌": "[x]",
}


def _strip_md(text: str) -> str:
    import re

    t = text.strip()
    t = re.sub(r"\*\*(.+?)\*\*", r"\1", t)
    t = re.sub(r"(?<!\*)\*([^*]+?)\*(?!\*)", r"\1", t)
    t = re.sub(r"`([^`]+?)`", r"\1", t)
    t = re.sub(r"^\[(\d+)\]\s*", r"\1. ", t)
    return t


def _to_pdf_text(text: str) -> str:
    """Map to WinAnsi-safe text (Turkish ok; Persian transliterated/flagged)."""
    text = _strip_md(text)
    out_chars = []
    for ch in text:
        if ch in _TRANSLIT:
            out_chars.append(_TRANSLIT[ch])
            continue
        cp = ord(ch)
        if cp < 128:
            out_chars.append(ch)
        elif cp <= 0xFF:
            out_chars.append(ch)
        elif 0x0600 <= cp <= 0x06FF:
            out_chars.append("")  # Arabic/Persian script is not in the base-14 fonts
        else:
            out_chars.append("?")
    return "".join(out_chars)


def _pdf_escape(s: str) -> str:
    return s.replace("\\", r"\\").replace("(", r"\(").replace(")", r"\)")


def deck_pdf(o: DeckOptions | None = None) -> bytes:
    """Build a minimal but valid PDF (Helvetica, A4) with stdlib only."""
    o = o or DeckOptions()
    md = deck_markdown(o)
    # the base-14 PDF fonts carry no bold/italic, so drop inline markdown markers
    md = md.replace("**", "")
    md = re.sub(r"(?m)^(?![-*#>|\d])\s*\*([^*]+)\*\s*$", r"\1", md)
    md = md.replace("`", "")
    lines: list[tuple[str, str]] = []  # (style, text)
    for raw in md.split("\n"):
        s = raw.rstrip()
        if not s.strip():
            lines.append(("gap", ""))
            continue
        if s.startswith("#### "):
            lines.append(("h4", s[5:]))
        elif s.startswith("### "):
            lines.append(("h3", s[4:]))
        elif s.startswith("## "):
            lines.append(("h2", s[3:]))
        elif s.startswith("# "):
            lines.append(("h1", s[2:]))
        elif s.strip() == "---":
            lines.append(("rule", ""))
        elif s.startswith("> "):
            lines.append(("quote", s[2:]))
        elif s.startswith("|"):
            cells = [_strip_md(c.strip()) for c in s.strip("|").split("|")]
            if set("".join(cells)) <= set("-: "):
                continue
            lines.append(("row", "  |  ".join(cells)))
        elif s.startswith("```"):
            continue
        elif s.startswith(("- ", "* ")):
            lines.append(("li", "- " + _strip_md(s[2:])))
        elif s[:2].isdigit() and s[1:3] in (". ", ". "):
            lines.append(("li", s))
        else:
            lines.append(("p", s))

    styles = {
        "h1": ("Helvetica-Bold", 17, 22),
        "h2": ("Helvetica-Bold", 13, 18),
        "h3": ("Helvetica-Bold", 11, 14),
        "h4": ("Helvetica-Bold", 10, 13),
        "p": ("Helvetica", 9.5, 13),
        "li": ("Helvetica", 9.5, 13),
        "quote": ("Helvetica-Oblique", 9.5, 13),
        "row": ("Helvetica", 9, 12),
    }
    page_w, page_h = 595.28, 841.89
    margin_x, margin_top, margin_bottom = 54, 56, 56
    max_w = page_w - 2 * margin_x

    def wrap(text: str, size: float) -> list[str]:
        width_per_char = size * 0.5
        limit = max(20, int(max_w / width_per_char))
        words = text.split()
        out, cur = [], ""
        for w in words:
            if len(cur) + len(w) + 1 <= limit:
                cur = f"{cur} {w}".strip()
            else:
                if cur:
                    out.append(cur)
                cur = w
                while len(cur) > limit:
                    out.append(cur[:limit])
                    cur = cur[limit:]
        if cur:
            out.append(cur)
        return out or [""]

    pages: list[list[str]] = []
    content: list[str] = []
    y = page_h - margin_top

    def new_page() -> None:
        nonlocal content, y
        if content:
            pages.append(content)
        content = []
        y = page_h - margin_top

    for style, text in lines:
        text = _to_pdf_text(text)
        if style == "gap":
            y -= 6
            continue
        if style == "rule":
            y -= 8
            content.append(f"0.85 0.87 0.9 RG 0.7 w {margin_x} {y:.2f} m {page_w - margin_x} {y:.2f} l S")
            y -= 8
            continue
        font, size, leading = styles.get(style, styles["p"])
        if style in ("h1", "h2"):
            y -= 8
        wrapped = wrap(text, size)
        for wl in wrapped:
            if y < margin_bottom + leading:
                new_page()
            content.append("BT")
            if style in ("h1", "h2"):
                content.append(f"{0.784:.3f} {0.063:.3f} {0.180:.3f} rg")
            elif style == "quote":
                content.append(f"{0.35:.3f} {0.42:.3f} {0.48:.3f} rg")
            else:
                content.append(f"{0.05:.3f} {0.11:.3f} {0.16:.3f} rg")
            content.append(f"/{font} {size} Tf")
            content.append(f"{margin_x} {y:.2f} Td")
            content.append(f"({_pdf_escape(wl)}) Tj")
            content.append("ET")
            y -= leading
        if style in ("h1", "h2"):
            y -= 4
    new_page()

    # assemble
    objs: list[bytes] = []
    page_obj_ids: list[int] = []
    num_pages = len(pages)
    # object numbering: 1 catalog, 2 pages, 3 font Helvetica, 4 font Bold,
    # 5 font Oblique, then per page: page obj + content obj
    first_page_obj = 6
    for i in range(num_pages):
        page_obj_ids.append(first_page_obj + i * 2)
    catalog = b"<< /Type /Catalog /Pages 2 0 R >>"
    kids = " ".join(f"{pid} 0 R" for pid in page_obj_ids)
    pages_obj = f"<< /Type /Pages /Count {num_pages} /Kids [{kids}] >>".encode()
    fonts = [
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>",
    ]
    objs += [catalog, pages_obj] + fonts
    for page_lines in pages:
        stream = "\n".join(page_lines).encode("latin-1", "replace")
        compressed = zlib.compress(stream)
        page_obj = (
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {page_w:.2f} {page_h:.2f}] "
            f"/Resources << /Font << /Helvetica 3 0 R /Helvetica-Bold 4 0 R /Helvetica-Oblique 5 0 R >> >> "
            f"/Contents {len(objs) + 2} 0 R >>"
        ).encode()
        objs.append(page_obj)
        objs.append(b"<< /Length " + str(len(compressed)).encode() + b" /Filter /FlateDecode >>\nstream\n" + compressed + b"\nendstream")

    buf = io.BytesIO()
    buf.write(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = []
    for idx, obj in enumerate(objs, start=1):
        offsets.append(buf.tell())
        buf.write(f"{idx} 0 obj\n".encode() + obj + b"\nendobj\n")
    xref_pos = buf.tell()
    buf.write(f"xref\n0 {len(objs) + 1}\n".encode())
    buf.write(b"0000000000 65535 f \n")
    for off in offsets:
        buf.write(f"{off:010d} 00000 n \n".encode())
    buf.write(
        f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode()
    )
    return buf.getvalue()


def deck_filename(o: DeckOptions | None = None, ext: str = "pdf") -> str:
    o = o or DeckOptions()
    slug = "".join(ch if ch.isalnum() else "-" for ch in o.legal_group_name).strip("-").lower()
    return f"legal-landing-partnership-{slug}.{ext}"


def build_all(o: DeckOptions | None = None) -> dict[str, Any]:
    """Return {'md':..., 'html':..., 'pdf': bytes, 'filename':...}."""
    o = o or DeckOptions()
    return {
        "options": o.__dict__,
        "md": deck_markdown(o),
        "html": deck_html(o),
        "pdf": deck_pdf(o),
        "filename": deck_filename(o),
        "generated_at": _dt.datetime.now(_dt.timezone.utc).isoformat(timespec="seconds"),
    }
