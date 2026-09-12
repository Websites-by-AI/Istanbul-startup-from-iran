// Parity check: the JavaScript core that runs on Cloudflare Pages must behave
// exactly like the Python core. Run with `node scripts/parity_check.mjs`
// (pytest runs it automatically when node is available).
import { handleMessage } from "../functions/_core/core.js";
import { deckPdf, deckMarkdown, deckHtml } from "../functions/_core/deck.js";

let pass = 0, fail = 0;
const t = (name, fn) => {
  try { const d = fn(); console.log("PASS  " + name + "  ·  " + d); pass++; }
  catch (e) { console.log("FAIL  " + name + "  ·  " + e.message); fail++; }
};
const assert = (c, m) => { if (!c) throw new Error(m || "assert failed"); };

t("/legal → escalated + disclaimer", () => {
  const { reply } = handleMessage("/legal", {});
  assert(reply.route === "legal_desk", "route=" + reply.route);
  assert(/LEGAL DESK/.test(reply.text), "no desk text");
  assert(reply.escalated === true, "not escalated");
  assert(/not legal advice/.test(reply.text), "no disclaimer");
  return `route=${reply.route} chars=${reply.text.length}`;
});

t("guarantee → refusal + redaction", () => {
  const { reply } = handleMessage("can you guarantee kimlik and residence permit for my team?", {});
  assert(reply.meta.safety.refusal === true, "no refusal");
  assert(reply.text.includes("[outcome not guaranteed]"), "not redacted");
  assert(reply.escalated, "not escalated");
  return `triggers=${reply.meta.safety.triggered} redacted=${reply.meta.safety.removed_guarantees.length}`;
});

t("negation-aware: compliance sentence survives", () => {
  const { reply } = handleMessage("/journey", {});
  assert(reply.text.includes("No guaranteed immigration result is promised."), "compliance sentence redacted");
  assert(!reply.text.includes("[outcome not ["), "double redaction");
  return "ok";
});

t("Persian → fa + company_formation", () => {
  const { reply } = handleMessage("سلام، برای ثبت شرکت در ترکیه و گرفتن اقامت چه کار کنم؟", {});
  assert(reply.language === "fa", "lang=" + reply.language);
  assert(reply.escalated, "not escalated");
  return `intent=${reply.intent} route=${reply.route}`;
});

t("Turkish → tr", () => {
  const { reply } = handleMessage("merhaba, Türkiye'de şirket kurmak ve çalışma izni için hangi yol izlenmeli?", {});
  assert(reply.language === "tr", "lang=" + reply.language);
  return `intent=${reply.intent} route=${reply.route}`;
});

t("step-by-step intake across turns (stateless session)", () => {
  let session = {};
  const ask = (text) => { const r = handleMessage(text, session); session = r.session; return r.reply; };
  const first = ask("/intake");
  assert(/0\/12 answered/.test(first.text), first.text.slice(0, 80));
  const answers = ["startup_name: Aria Health", "sector: HealthTech", "stage: mvp", "team_size: 3",
    "team_roles: Founder / Technical / Business", "has_iran_entity: yes", "has_turkey_entity: no",
    "ip_owned_by_company: yes", "founder_agreement: no", "intended_city: Ankara",
    "intended_activity: telehealth platform for Turkish clinics", "residence_status: tourist entry for all three"];
  let last;
  for (const a of answers) last = ask(a);
  assert(last.route === "intake_complete", "route=" + last.route);
  assert(session.kase && session.kase.id.startsWith("lc_"), "no case in session");
  assert(/SUCCESS METRICS/.test(ask("/metrics").text), "metrics broken");
  return `case=${session.kase.id} band=${session.kase.band}`;
});

t("JSON intake + hotel/corporate matching", () => {
  const intake = { startup_name: "Pars Vision AI", sector: "IndustrialTech", stage: "revenue", team_size: 3,
    team_roles: "F/T/B", has_iran_entity: true, has_turkey_entity: false, ip_owned_by_company: true,
    founder_agreement: true, intended_city: "Istanbul",
    intended_activity: "Sell industrial AI visual-inspection software to Turkish manufacturers",
    residence_status: "Three Iranian nationals, short-term entry", funding_target_usd: 250000, source: "GITEX" };
  const { reply } = handleMessage(JSON.stringify(intake), {});
  assert(reply.route === "intake_complete", "route=" + reply.route);
  assert(reply.meta.band === "ready", "band=" + reply.meta.band);
  assert(/Hotel A/.test(reply.text), "no hotel match");
  assert(/CORPORATE SPONSOR CANDIDATE/.test(reply.text), "no corporate match");
  return `band=${reply.meta.band} score=${reply.meta.score}`;
});

t("hotel capacity is not over-allocated", () => {
  const { reply } = handleMessage("/hotels Istanbul", {});
  assert(reply.route === "hotels", reply.route);
  assert(/Total sponsored room nights available: 15/.test(reply.text), "wrong capacity");
  return "15 rooms · Istanbul";
});

t("deck command attaches a PDF", () => {
  const { reply } = handleMessage("/deck Ankara Cross-Border Law Office", {});
  assert(reply.route === "deck", reply.route);
  assert(reply.documents.length === 1, "no document");
  assert(reply.documents[0].filename.includes("ankara-cross-border-law-office"), reply.documents[0].filename);
  return reply.documents[0].filename;
});

t("JS PDF writer produces a valid file", () => {
  const bytes = new Uint8Array(deckPdf({ legal_group_name: "JS Test Grup Hukuk" }));
  assert(new TextDecoder().decode(bytes.slice(0, 8)) === "%PDF-1.4", "bad header");
  const str = new TextDecoder("latin1").decode(bytes);
  assert(str.includes("startxref") && str.trimEnd().endsWith("%%EOF"), "bad trailer");
  return `${bytes.length} bytes · ${(str.match(/\/Type \/Page[^s]/g) || []).length} pages`;
});

t("deck md/html are personalised and complete", () => {
  const md = deckMarkdown({ legal_group_name: "Parity Group", pilot_city: "Ankara", cohort_size: 6, team_size: 4 });
  for (const needle of ["Startup Legal Landing Partnership", "Parity Group", "Ankara Pilot", "**24**",
    "Two-Layer Legal Model", "No guaranteed immigration result is promised."])
    assert(md.includes(needle), "missing: " + needle);
  const html = deckHtml({});
  assert(html.startsWith("<!doctype html>") && html.includes("<table>"), "html broken");
  return `md ${md.split(/\s+/).length} words · html ${html.length} bytes`;
});

t("every command answers", () => {
  const cmds = ["/help", "/legal", "/intake", "/assessment", "/journey", "/hotels", "/corporate",
    "/deck", "/pilot", "/pilot 500", "/metrics", "/human", "/advance", "/lang fa", "/ecosystem", "zxqwv ??"];
  const routes = cmds.map((c) => handleMessage(c, {}).reply.route);
  assert(routes.every((r) => typeof r === "string" && r.length), "empty route");
  // every real command must resolve; only the deliberate gibberish may be "unknown"
  cmds.forEach((c, i) => {
    if (c.startsWith("/")) assert(routes[i] !== "unknown", `command not routed: ${c}`);
  });
  assert(routes[cmds.length - 1] === "unknown", "gibberish should fall back to unknown");
  return routes.join(", ");
});

console.log(`\n${pass}/${pass + fail} JS core parity checks passed`);
process.exit(fail ? 1 : 0);
