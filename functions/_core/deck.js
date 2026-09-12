// Pitch-deck generator for the legal group — JS port of bot/deck.py
// Produces identical Markdown/HTML and a valid PDF built from scratch (no deps).

const TODAY = () => new Date().toISOString().slice(0, 10);

export function defaultOptions(over = {}) {
  return {
    legal_group_name: "Iranian–Turkish Legal Group",
    platform_name: "Türkiye Startup Landing Platform",
    pilot_city: "Istanbul",
    cohort_size: 10,
    team_size: 3,
    sender_name: "",
    contact: "",
    date: TODAY(),
    include_hotel_section: true,
    ...over,
  };
}

export function deckMarkdown(opts = {}) {
  const o = { ...defaultOptions(), ...opts };
  const people = o.cohort_size * o.team_size;
  const L = [];
  const A = (x) => L.push(x);

  A("# IRAN → TÜRKİYE — Startup Legal Landing Partnership");
  A("");
  A("### A proposed strategic partnership between");
  A(`### ${o.legal_group_name} + ${o.platform_name}`);
  A("");
  A(`*${o.date}*` + (o.sender_name ? ` · prepared by ${o.sender_name}` : ""));
  A("");
  A("**From Exhibition → Legal Entry → Turkish Company → Corporate Partnership → Investment**");
  A("");
  A("---");
  A("");
  A("## 1. The Opportunity");
  A("");
  A("Every year, Iranian founders and technology teams participate in exhibitions, technology");
  A("events and startup programs. They meet Turkish companies, investors, accelerators,");
  A("technology parks and potential customers.");
  A("");
  A('But after the event, a critical question remains: **"How do we legally and practically');
  A('continue in Türkiye?"** That is the gap we want to solve.');
  A("");
  A("---");
  A("");
  A("## 2. The Proposed Platform");
  A("");
  A(`We are developing a **${o.platform_name}** that moves selected international startup teams from`);
  A("**Exhibition → Market Entry → Turkish Business Operation → Corporate Partnership → Investment**.");
  A("");
  A("The first target market is: **Iranian technology startups entering Türkiye.**");
  A("");
  A("---");
  A("");
  A("## 3. Why a Legal Partner Is Essential");
  A("");
  A("A startup cannot safely enter a new market with only travel support, hotel booking,");
  A("networking and AI tools. It needs a **qualified legal pathway**.");
  A("");
  A("The platform therefore seeks a **Strategic Legal Landing Partner** with expertise in:");
  A("");
  [
    "Iran–Türkiye cross-border matters", "Corporate law", "Company formation", "Commercial contracts",
    "Immigration / residence pathways", "Employment", "Intellectual property", "Tax coordination",
    "Investment agreements",
  ].forEach((x) => A(`- ${x}`));
  A("");
  A("> Professional legal activity in Türkiye is regulated by the bar associations and foreign");
  A("> lawyers cannot simply practise as Turkish lawyers. The partnership is therefore structured");
  A("> **with lawyers qualified in Türkiye**, and the legal partner — not the platform — defines");
  A("> and confirms every permissible pathway.");
  A("");
  A("---");
  A("");
  A(`## 4. Proposed Role of ${o.legal_group_name}`);
  A("");
  A("We propose establishing a dedicated **Iran–Türkiye Startup Legal Desk** within the broader");
  A("Startup Landing Platform. The Desk becomes the **first legal point of contact** for selected");
  A("startup teams entering Türkiye.");
  A("");
  A("---");
  A("");
  A("## 5. Startup Journey");
  A("");
  [
    ["STEP 1 — Selection", "Elcom, GITEX, startup competitions, universities, accelerators, startup communities."],
    ["STEP 2 — Pre-Landing Legal Assessment", "The legal partner reviews founder structure, current company, IP ownership, contracts, team members, intended activities in Türkiye and possible legal structures."],
    ["STEP 3 — Türkiye Entry", "The team receives professional guidance concerning applicable visa, residence, work-authorization and company-formation pathways. **No guaranteed immigration result is promised.**"],
    ["STEP 4 — Turkish Business Structure", "Turkish subsidiary / Turkish company / branch or representative structure where appropriate / other legally suitable structure."],
    ["STEP 5 — Commercial Launch", "Corporate contracts, partnership agreements, employment arrangements, IP protection, commercial compliance."],
    ["STEP 6 — Investment", "Investment, shareholding, founder arrangements, due diligence, commercial partnerships."],
  ].forEach(([h, b]) => {
    A(`### ${h}`);
    A(b);
    A("");
  });
  A("---");
  A("");
  A("## 6. Two-Layer Legal Model");
  A("");
  A("### Layer 1 — Market Entry Legal *(before the startup arrives)*");
  A("Immigration · Company · IP · Contracts · Compliance · Founder structure");
  A("");
  A("### Layer 2 — Investment & Growth Legal *(after landing)*");
  A("Corporate agreements · PoC contracts · Investment documentation · Shareholder agreements · Due diligence · Strategic partnerships");
  A("");
  A("The same startup can therefore remain inside the legal partner's ecosystem as it grows.");
  A("");
  A("---");
  A("");
  A("## 7. Why This Is Valuable for the Legal Group");
  A("");
  A("This is **not simply a referral arrangement**. The platform creates a");
  A("**Qualified Startup Client Pipeline**: instead of random inquiries from founders who may not");
  A("be ready to operate in Türkiye, the legal partner receives pre-screened teams with:");
  A("");
  ["Startup profile", "Founder information", "Business model", "Technology", "Funding stage", "Intended Turkish activity", "Legal requirements", "Corporate targets"].forEach((x) => A(`- ${x}`));
  A("");
  A("**The lawyer enters the process earlier.**");
  A("");
  A("---");
  A("");
  A("## 8. New Client Segment");
  A("");
  A("The partnership creates a specialised client category — **International Startup Clients** —");
  A("especially Iranian startups, technology founders, AI, SaaS, ClimateTech, HealthTech,");
  A("IndustrialTech, FinTech (where legally permitted) and DeepTech companies.");
  A("The long-term model can expand beyond Iran.");
  A("");
  A("---");
  A("");
  if (o.include_hotel_section) {
    A("## 9. Legal + Hotel + Corporate Ecosystem");
    A("");
    A("```");
    A("HOTEL (Accommodation Sponsor)");
    A("   ↓");
    A("LEGAL PARTNER (Legal Landing Desk)");
    A("   ↓");
    A("CORPORATE SPONSOR (Market / PoC Partner)");
    A("   ↓");
    A("INVESTOR (Capital)");
    A("   ↓");
    A("STARTUP (Technology + Team)");
    A("```");
    A("");
    A("Hotels contribute **unused room-night inventory** instead of cash and become");
    A("*Official Startup Accommodation Partners* in the mapped cities (Istanbul, Ankara, later");
    A("İzmir and Antalya). The platform coordinates the ecosystem.");
    A("");
    A("---");
    A("");
    A("## 10. Corporate Sponsor Model");
    A("");
    A("A Turkish company sponsors a selected startup — e.g. a **Turkish industrial company**");
    A("sponsoring an **Iranian industrial-AI startup**. The startup enters Türkiye, the legal");
    A("partner establishes the contractual framework, and the two run a **Proof of Concept**.");
    A("If successful, a **commercial contract**, **investment** or **strategic partnership** can");
    A("follow. This turns legal work from a one-time company registration into a long-term");
    A("commercial relationship.");
    A("");
    A("---");
    A("");
  }
  A("## 11. AI Layer");
  A("");
  A("The platform includes an **AI Startup Navigator** that organises the legal checklist, market");
  A("research, corporate matching, investor research, meeting preparation, media/PR and startup");
  A("documentation.");
  A("");
  A("> **AI does not replace the lawyer.** It prepares, organises and routes information.");
  A("> **The licensed legal professional remains responsible for legal advice.**");
  A("");
  A("## 12. Legal AI Safety Principle");
  A("");
  A("The platform explicitly distinguishes **AI Information** from **Professional Legal Advice**.");
  A("");
  A('- The AI may say: *"These are the documents/questions that may need to be reviewed."*');
  A('- The legal partner decides: *"This is the legally appropriate route for this specific client."*');
  A("");
  A("This protects the professional role of the legal partner.");
  A("");
  A("---");
  A("");
  A("## 13. Proposed Commercial Model");
  A("");
  A("| Model | Structure | Value for the legal partner |");
  A("|---|---|---|");
  A("| **A — Referral** | Platform introduces a qualified startup; partner contracts directly with it | Direct client engagement |");
  A("| **B — Preferred Legal Partner** | Designated *Official Legal Landing Partner* of the program | Exclusive qualified pipeline + branding |");
  A("| **C — Startup Legal Package** | Pre-Landing Assessment → Company/Market Entry → Commercial Setup → Ongoing support | Predictable, repeatable engagements |");
  A("| **D — Corporate Legal Support** | Partner also represents Turkish corporate sponsors and investors | Value on both sides of the transaction |");
  A("");
  A("Any referral/fee arrangement must comply with the applicable Turkish bar rules — the legal");
  A("partner confirms what is permissible.");
  A("");
  A("---");
  A("");
  A("## 14. What We Are Asking From the Legal Group");
  A("");
  A("We are **not asking for free legal work**. We are proposing a **strategic partnership** in which");
  A("the legal group helps design the legal architecture of the program:");
  A("");
  [
    "Review the startup landing model.", "Identify legally permissible pathways.",
    "Define the legal services required for each stage.", "Design a standard Startup Legal Intake Form.",
    "Define a Pre-Landing Legal Assessment.", "Define appropriate company / contractual structures.",
    "Establish a professional referral mechanism.", "Participate as the program's preferred legal partner if mutually agreed.",
  ].forEach((x, i) => A(`${i + 1}. ${x}`));
  A("");
  A("---");
  A("");
  A("## 15. What the Platform Provides");
  A("");
  A("Qualified startup leads · pre-screened founder teams · startup profiles · corporate");
  A("introductions · hotel partnerships · exhibition partnerships · AI-assisted intake ·");
  A("international visibility · startup deal flow.");
  A("");
  A("The legal partner focuses on **legal expertise**; the platform focuses on **startup");
  A("acquisition + ecosystem coordination**.");
  A("");
  A("---");
  A("");
  A(`## 16. Pilot Proposal — ${o.pilot_city} Pilot`);
  A("");
  A(`- First cohort: **${o.cohort_size} startup teams**`);
  A(`- Team size: **${o.team_size} people**`);
  A(`- Total founders / team members: **${people}**`);
  A("- Target ecosystem: hotels, Turkish corporations, lawyers, investors, accelerators, technology parks");
  A("");
  A("The legal partner participates in designing the first cohort's legal landing framework.");
  A("");
  A("### Pilot funnel");
  A("");
  A("```");
  A("100+ startups → 30–50 screened → 10 selected → 10 legal assessments");
  A("→ 10 Türkiye landing plans → corporate matching → PoCs");
  A("→ investment / commercial partnerships");
  A("```");
  A("");
  A("The goal is not simply to bring people to Türkiye. **The goal is to create successful");
  A("business cases.**");
  A("");
  A("---");
  A("");
  A("## 17. Long-Term Opportunity");
  A("");
  A("After validating the Iran → Türkiye corridor, **Türkiye can become a regional Startup Landing");
  A("Hub** — Iran, Central Asia, Caucasus, Middle East, South Asia. The legal partner becomes part");
  A("of a broader **International Startup Legal Network**.");
  A("");
  A("---");
  A("");
  A("## 18. Why Us + Why You");
  A("");
  A("| Our platform | Legal partner |");
  A("|---|---|");
  A("| Startup discovery | Turkish legal expertise |");
  A("| Exhibition access | Iran–Türkiye understanding |");
  A("| AI layer | Corporate law |");
  A("| Hotel network | Immigration / residence expertise |");
  A("| Corporate matchmaking | Contracts |");
  A("| Media | Investment legal support |");
  A("");
  A("**Together we can create the legal infrastructure for startup landing.**");
  A("");
  A("---");
  A("");
  A("## 19. The Partnership");
  A("");
  A("We propose beginning with a small, controlled pilot. **No large infrastructure investment");
  A("required.**");
  A("");
  A("`Legal framework → 10 startups → Istanbul → measure results → improve → scale`");
  A("");
  A("---");
  A("");
  A("## 20. Success Metrics");
  A("");
  A("| Metric | Target |");
  A("|---|---|");
  A(`| Startup teams | ${o.cohort_size} |`);
  A(`| Founders / team members | ${people} |`);
  A("| Legal assessments | 10 |");
  A("| Corporate introductions | 5+ |");
  A("| PoC opportunities | 3+ |");
  A("| Investment / commercial opportunities | 1–3 |");
  A("| Repeatable legal landing framework | 1 |");
  A("");
  A("---");
  A("");
  A("## 21. Our Vision");
  A("");
  A("We do not want to create another **visa agency**, **startup tour** or **lawyer directory**.");
  A("We want to build **Startup Landing Infrastructure**, where a startup can move from");
  A('*"I met a Turkish company at an exhibition"* to *"I legally established my business');
  A('relationship in Türkiye."*');
  A("");
  A("---");
  A("");
  A("## 22. Proposed First Meeting");
  A("");
  A("We would like to discuss three questions:");
  A("");
  A("1. Is this legal landing model workable under Turkish law?");
  A("2. What should the legal pathway look like for a typical three-person startup?");
  A(`3. Can your group become a strategic legal partner for the first ${o.pilot_city} pilot?`);
  A("");
  if (o.contact) {
    A(`**Contact:** ${o.contact}`);
    A("");
  }
  A("---");
  A("");
  A("# IRAN → TÜRKİYE");
  A("## From Exhibition to Legal Landing");
  A("### Startups × Lawyers × Hotels × Corporates × Investors");
  A("");
  return L.join("\n");
}

/* ------------------------------------------------------------------ HTML -- */

const CSS = `
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
`;

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function mdInline(t) {
  let x = esc(t);
  x = x.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  x = x.replace(/(^|[^*])\*([^*]+?)\*(?!\*)/g, "$1<em>$2</em>");
  x = x.replace(/`([^`]+?)`/g, "<code>$1</code>");
  return x;
}

export function deckHtml(opts = {}) {
  const o = { ...defaultOptions(), ...opts };
  const md = deckMarkdown(o);
  const out = [];
  const lines = md.split("\n");
  let inCode = false, inTable = false, inList = false, inQuote = false, heroDone = false;
  const closeAll = () => {
    if (inTable) { out.push("</table>"); inTable = false; }
    if (inList) { out.push("</ul>"); inList = false; }
    if (inQuote) { out.push("</blockquote>"); inQuote = false; }
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const stripped = line.trim();
    if (stripped.startsWith("```")) {
      closeAll();
      if (inCode) { out.push("</pre>"); inCode = false; } else { out.push("<pre>"); inCode = true; }
      continue;
    }
    if (inCode) { out.push(esc(line)); continue; }
    if (!stripped) { closeAll(); continue; }
    if (stripped === "---") { closeAll(); out.push("<hr>"); continue; }
    if (stripped.startsWith("|")) {
      const cells = stripped.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      if (/^[-: ]*$/.test(cells.join(""))) continue;
      if (!inTable) {
        closeAll();
        out.push("<table>");
        inTable = true;
        out.push(`<tr>${cells.map((c) => `<th>${mdInline(c)}</th>`).join("")}</tr>`);
      } else out.push(`<tr>${cells.map((c) => `<td>${mdInline(c)}</td>`).join("")}</tr>`);
      continue;
    }
    if (stripped.startsWith(">")) {
      if (!inQuote) { closeAll(); out.push("<blockquote>"); inQuote = true; }
      out.push(`<p>${mdInline(stripped.replace(/^>\s?/, ""))}</p>`);
      continue;
    }
    const h = stripped.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      closeAll();
      const level = h[1].length;
      const text = mdInline(h[2]);
      if (level === 1 && !heroDone) { out.push(`<div class="hero"><h1>${text}</h1></div>`); heroDone = true; }
      else out.push(`<h${level}>${text}</h${level}>`);
      continue;
    }
    const li = stripped.match(/^(?:[-*]|\d+\.)\s+(.*)$/);
    if (li) {
      if (!inList) { closeAll(); out.push("<ul>"); inList = true; }
      out.push(`<li>${mdInline(li[1])}</li>`);
      continue;
    }
    closeAll();
    out.push(`<p>${mdInline(stripped)}</p>`);
  }
  closeAll();
  if (inCode) out.push("</pre>");
  const tags = ["Legal Landing Desk", "Pre-Landing Assessment", "Two-Layer Legal Model", "Corporate Sponsors", "Hotel Sponsors", "AI Safety", `${o.pilot_city} Pilot`]
    .map((t) => `<span class="tag">${t}</span>`).join("");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc("IRAN → TÜRKİYE — Startup Legal Landing Partnership")}</title>
<style>${CSS}</style></head>
<body><div class="page">
${tags}
${out.join("\n")}
<div class="footer">
${esc(o.platform_name)} · ${esc(o.date)}<br>
⚖️ AI information — not legal advice. Only a licensed legal professional determines the legally
appropriate route. No residence permit, work permit, visa or company-registration outcome is guaranteed.
</div>
</div></body></html>`;
}

/* ------------------------------------------------------------------- PDF -- */

const TRANSLIT = {
  "ı": "i", "İ": "I", "ş": "s", "Ş": "S", "ğ": "g", "Ğ": "G", "â": "a", "î": "i", "û": "u",
  "–": "-", "—": "-", "’": "'", "“": '"', "”": '"', "•": "-", "→": "->", "×": "x", "↓": "v",
  "⚖": "[!]", "✅": "[+]", "❌": "[x]", "·": "-", "☐": "[ ]", "؟": "?", "،": ",",
};

function stripMd(t) {
  let x = t.trim();
  x = x.replace(/\*\*(.+?)\*\*/g, "$1");
  x = x.replace(/(^|[^*])\*([^*]+?)\*(?!\*)/g, "$1$2");
  x = x.replace(/`([^`]+?)`/g, "$1");
  x = x.replace(/^\[(\d+)\]\s*/, "$1. ");
  return x;
}

/** Map a JS string to single-byte (WinAnsi-ish) codes 0..255. */
function toBytes(text) {
  const src = stripMd(text);
  const codes = [];
  for (const ch of src) {
    if (TRANSLIT[ch] !== undefined) { for (const c of TRANSLIT[ch]) codes.push(c.charCodeAt(0) & 0xff); continue; }
    const cp = ch.codePointAt(0);
    if (cp <= 0xff) codes.push(cp);
    else if (cp >= 0x0600 && cp <= 0x06ff) continue; // Arabic/Persian script: not in base-14 fonts
    else codes.push(0x3f); // '?'
  }
  return Uint8Array.from(codes);
}

const pdfEscapeBytes = (codes) => {
  const out = [];
  for (const b of codes) {
    if (b === 0x28 || b === 0x29 || b === 0x5c) out.push(0x5c, b);
    else out.push(b);
  }
  return Uint8Array.from(out);
};

const STYLES = {
  h1: { font: "Helvetica-Bold", size: 17, leading: 22, color: [0.784, 0.063, 0.18] },
  h2: { font: "Helvetica-Bold", size: 13, leading: 18, color: [0.784, 0.063, 0.18] },
  h3: { font: "Helvetica-Bold", size: 11, leading: 14, color: [0.05, 0.11, 0.16] },
  h4: { font: "Helvetica-Bold", size: 10, leading: 13, color: [0.05, 0.11, 0.16] },
  p: { font: "Helvetica", size: 9.5, leading: 13, color: [0.05, 0.11, 0.16] },
  li: { font: "Helvetica", size: 9.5, leading: 13, color: [0.05, 0.11, 0.16] },
  quote: { font: "Helvetica-Oblique", size: 9.5, leading: 13, color: [0.35, 0.42, 0.48] },
  row: { font: "Helvetica", size: 9, leading: 12, color: [0.05, 0.11, 0.16] },
};

export function deckPdf(opts = {}) {
  const o = { ...defaultOptions(), ...opts };
  const md = deckMarkdown(o).replace(/\*\*/g, "").replace(/`/g, "");
  const items = [];
  for (const raw of md.split("\n")) {
    const s = raw.replace(/\s+$/, "");
    if (!s.trim()) { items.push(["gap", ""]); continue; }
    if (s.startsWith("#### ")) items.push(["h4", s.slice(5)]);
    else if (s.startsWith("### ")) items.push(["h3", s.slice(4)]);
    else if (s.startsWith("## ")) items.push(["h2", s.slice(3)]);
    else if (s.startsWith("# ")) items.push(["h1", s.slice(2)]);
    else if (s.trim() === "---") items.push(["rule", ""]);
    else if (s.startsWith("> ")) items.push(["quote", s.slice(2)]);
    else if (s.startsWith("|")) {
      const cells = s.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      if (/^[-: ]*$/.test(cells.join(""))) continue;
      items.push(["row", cells.join("  |  ")]);
    } else if (s.startsWith("```")) continue;
    else if (s.startsWith("- ") || s.startsWith("* ")) items.push(["li", "- " + s.slice(2)]);
    else items.push(["p", s]);
  }

  const PW = 595.28, PH = 841.89, MX = 54, MT = 56, MB = 56;
  const maxW = PW - 2 * MX;
  const wrap = (text, size) => {
    const limit = Math.max(20, Math.floor(maxW / (size * 0.5)));
    const words = text.split(/\s+/).filter(Boolean);
    const out = [];
    let cur = "";
    for (const w of words) {
      if (cur.length + w.length + 1 <= limit) cur = cur ? `${cur} ${w}` : w;
      else {
        if (cur) out.push(cur);
        let rest = w;
        while (rest.length > limit) { out.push(rest.slice(0, limit)); rest = rest.slice(limit); }
        cur = rest;
      }
    }
    if (cur) out.push(cur);
    return out.length ? out : [""];
  };

  const pages = [];
  let content = [];
  let y = PH - MT;
  const newPage = () => { if (content.length) pages.push(content); content = []; y = PH - MT; };

  for (const [style, text] of items) {
    if (style === "gap") { y -= 6; continue; }
    if (style === "rule") {
      y -= 8;
      content.push(`0.85 0.87 0.9 RG 0.7 w ${MX} ${y.toFixed(2)} m ${PW - MX} ${y.toFixed(2)} l S`);
      y -= 8;
      continue;
    }
    const st = STYLES[style] || STYLES.p;
    if (style === "h1" || style === "h2") y -= 8;
    for (const wl of wrap(text, st.size)) {
      if (y < MB + st.leading) newPage();
      content.push({ color: st.color, font: st.font, size: st.size, y, text: wl });
      y -= st.leading;
    }
    if (style === "h1" || style === "h2") y -= 4;
  }
  newPage();

  // ---- serialise
  const enc = new TextEncoder();
  const parts = [];
  const push = (u8) => { parts.push(u8 instanceof Uint8Array ? u8 : enc.encode(u8)); };
  const concat = () => {
    const total = parts.reduce((a, p) => a + p.length, 0);
    const out = new Uint8Array(total);
    let off = 0;
    for (const p of parts) { out.set(p, off); off += p.length; }
    return out;
  };

  const pageOps = (rows) => {
    const lines = [];
    for (const r of rows) {
      if (typeof r === "string") { lines.push(r); continue; }
      const [cr, cg, cb] = r.color;
      lines.push("BT");
      lines.push(`${cr.toFixed(3)} ${cg.toFixed(3)} ${cb.toFixed(3)} rg`);
      lines.push(`/${r.font} ${r.size} Tf`);
      lines.push(`${MX} ${r.y.toFixed(2)} Td`);
      lines.push({ text: r.text });
      lines.push("ET");
    }
    // build byte stream
    const chunks = [];
    for (const l of lines) {
      if (typeof l === "string") chunks.push(enc.encode(l + "\n"));
      else chunks.push(enc.encode("("), pdfEscapeBytes(toBytes(l.text)), enc.encode(") Tj\n"));
    }
    const total = chunks.reduce((a, c) => a + c.length, 0);
    const buf = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) { buf.set(c, off); off += c.length; }
    return buf;
  };

  const numPages = pages.length;
  const pageObjIds = pages.map((_, i) => 6 + i * 2);
  const objects = [];
  objects.push(enc.encode("<< /Type /Catalog /Pages 2 0 R >>"));
  objects.push(enc.encode(`<< /Type /Pages /Count ${numPages} /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(" ")}] >>`));
  objects.push(enc.encode("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"));
  objects.push(enc.encode("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"));
  objects.push(enc.encode("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>"));
  pages.forEach((rows, i) => {
    const stream = pageOps(rows);
    objects.push(enc.encode(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW.toFixed(2)} ${PH.toFixed(2)}] /Resources << /Font << /Helvetica 3 0 R /Helvetica-Bold 4 0 R /Helvetica-Oblique 5 0 R >> >> /Contents ${7 + i * 2} 0 R >>`
    ));
    objects.push(new Uint8Array([
      ...enc.encode(`<< /Length ${stream.length} >>\nstream\n`), ...stream, ...enc.encode("\nendstream"),
    ]));
  });

  push("%PDF-1.4\n");
  push(Uint8Array.from([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));
  const offsets = [];
  objects.forEach((obj, i) => {
    offsets.push(concat().length);
    push(`${i + 1} 0 obj\n`);
    push(obj);
    push("\nendobj\n");
  });
  const xrefPos = concat().length;
  push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  for (const off of offsets) push(`${String(off).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`);
  return concat();
}

export function deckFilename(opts = {}, ext = "pdf") {
  const o = { ...defaultOptions(), ...opts };
  const slug = o.legal_group_name.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  return `legal-landing-partnership-${slug}.${ext}`;
}
