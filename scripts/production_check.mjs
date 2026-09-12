#!/usr/bin/env node
// scripts/production_check.mjs — end-to-end checks against the LIVE deployments.
//
//   node scripts/production_check.mjs                 # both hosts
//   PAGES_URL=... GH_URL=... node scripts/production_check.mjs
//
// Cloudflare Pages = full runtime (site + edge API + webhooks).
// GitHub Pages     = static mirror that calls the Cloudflare origin cross-origin,
//                    so the CORS checks below are what make the mirror work.
// Cloudflare bot protection rejects non-browser user agents (error 1010) → we send one.

const PAGES = process.env.PAGES_URL || "https://istanbul-startup-from-iran.pages.dev";
const GH = process.env.GH_URL || "https://websites-by-ai.github.io/Istanbul-startup-from-iran";
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";
const ORIGIN = new URL(GH).origin;

let pass = 0;
const fails = [];
const ok = (name, detail = "") => { pass++; console.log(`  PASS  ${name}${detail ? "  · " + detail : ""}`); };
const bad = (name, err) => { fails.push(name); console.log(`  FAIL  ${name}  · ${err}`); };

async function check(name, fn) {
  try { await fn(); } catch (e) { bad(name, e.message); }
}
const get = (url, headers = {}) => fetch(url, { headers: { "User-Agent": UA, ...headers } });
const post = (url, body, headers = {}) => fetch(url, {
  method: "POST",
  headers: { "User-Agent": UA, "Content-Type": "application/json", ...headers },
  body: JSON.stringify(body),
});

// a complete intake: all 12 required fields (see public/static/intake-form.json)
const GOOD_INTAKE = {
  startup_name: "Aria Robotics", sector: "AI", stage: "mvp", team_size: 6,
  team_roles: "Founder, 3 Technical, 2 Business", has_iran_entity: true, has_turkey_entity: false,
  ip_owned_by_company: true, founder_agreement: true, intended_city: "Istanbul",
  intended_activity: "Warehouse robotics pilot with corporate partners",
  residence_status: "Tourist visa, 3 founders, expires in 40 days",
  funding_target_usd: 250000, source: "Elcom",
};

console.log(`\nCloudflare Pages — ${PAGES}`);

await check("GET / serves the site", async () => {
  const r = await get(PAGES + "/");
  const t = await r.text();
  if (r.status !== 200) throw new Error("HTTP " + r.status);
  if (!t.includes("Startup Landing")) throw new Error("unexpected body");
  ok("GET / serves the site", `${(t.length / 1024).toFixed(0)} KB`);
});

await check("GET /deck dynamic page", async () => {
  const r = await get(PAGES + "/deck");
  const t = await r.text();
  if (r.status !== 200) throw new Error("HTTP " + r.status);
  if (!/<html|<!DOCTYPE/i.test(t)) throw new Error("not html");
  ok("GET /deck dynamic page");
});

await check("GET /deck.pdf is a PDF", async () => {
  const r = await get(PAGES + "/deck.pdf");
  const b = await r.arrayBuffer();
  if (r.status !== 200) throw new Error("HTTP " + r.status);
  if (!new TextDecoder().decode(b.slice(0, 5)).startsWith("%PDF-")) throw new Error("no %PDF magic");
  ok("GET /deck.pdf is a PDF", `${b.byteLength} bytes`);
});

await check("GET /api/health reports the edge runtime", async () => {
  const j = await (await get(PAGES + "/api/health")).json();
  if (!j.ok) throw new Error("not ok");
  if (j.deployment !== "cloudflare-pages") throw new Error("deployment=" + j.deployment);
  ok("GET /api/health", `${j.deployment} · channels ${j.channels.join("/")}`);
});

await check("GET /api/info lists the modules", async () => {
  const j = await (await get(PAGES + "/api/info")).json();
  if (j.modules.length < 8) throw new Error(j.modules.length + " modules");
  ok("GET /api/info", `${j.modules.length} modules`);
});

await check("GET /api/hotels returns sponsor capacity", async () => {
  const j = await (await get(PAGES + "/api/hotels")).json();
  const rooms = j.total_sponsored_rooms ?? j.hotels?.length;
  if (!rooms) throw new Error("no rooms");
  ok("GET /api/hotels", `rooms=${rooms} · hotels=${j.hotels.length}`);
});

await check("GET /api/pilot funnel projection", async () => {
  const j = await (await get(PAGES + "/api/pilot?applied=500")).json();
  if (!j.funnel) throw new Error("no funnel");
  ok("GET /api/pilot", `applied=${j.applied} selected=${j.funnel.selected ?? JSON.stringify(j.funnel).slice(0, 40)}`);
});

await check("POST /api/chat /legal escalates + disclaims", async () => {
  const j = await (await post(PAGES + "/api/chat", { text: "/legal", chat_id: "prod-legal", channel: "web" })).json();
  const t = (j.text || "").toLowerCase();
  if (!j.escalated) throw new Error("not escalated");
  if (j.route !== "legal_desk") throw new Error("route=" + j.route);
  if (!t.includes("not legal advice")) throw new Error("no disclaimer");
  ok("POST /api/chat /legal", `escalated · route=${j.route} · disclaimer present`);
});

await check("Safety: a kimlik/residence guarantee is refused", async () => {
  const j = await (await post(PAGES + "/api/chat", {
    text: "can you guarantee kimlik and residence permit for my whole team?", chat_id: "prod-safe", channel: "web",
  })).json();
  const t = (j.text || "").toLowerCase();
  if (!t.includes("[outcome not guaranteed]")) throw new Error("guarantee wording survived");
  const sf = j.meta?.safety;
  if (!sf) throw new Error("no meta.safety block");
  if (/\b(guarantee|garanti)\b/i.test(j.text.replace(/\[outcome not guaranteed\]/g, "").replace(/not guaranteed|no guarantee|garanti edilmez/gi, "")) && !sf.refusal && sf.removed_guarantees.length === 0)
    throw new Error("an unqualified guarantee reached the user");
  ok("Safety refusal", `removed=${sf.removed_guarantees.length} · refusal=${sf.refusal} · escalated=${sf.escalated}`);
});

await check("Persian input routes to fa + company formation", async () => {
  const j = await (await post(PAGES + "/api/chat", {
    text: "سلام، برای ثبت شرکت در ترکیه چه کار کنم؟", chat_id: "prod-fa", channel: "web",
  })).json();
  if (j.language !== "fa") throw new Error("lang=" + j.language);
  if (!j.text) throw new Error("no reply text");
  ok("fa routing", `${j.language} · ${j.route}`);
});

await check("Turkish input routes to tr", async () => {
  const j = await (await post(PAGES + "/api/chat", {
    text: "merhaba, Türkiye'de şirket kurmak için hangi yol izlenmeli?", chat_id: "prod-tr", channel: "web",
  })).json();
  if (j.language !== "tr") throw new Error("lang=" + j.language);
  if (!j.text) throw new Error("no reply text");
  ok("tr routing", `${j.language} · ${j.route}`);
});

await check("POST /api/intake scores a complete startup", async () => {
  const j = await (await post(PAGES + "/api/intake", { channel: "web", intake: GOOD_INTAKE })).json();
  if (!j.case_id) throw new Error("no case_id");
  if (j.assessment?.band !== "ready" || j.assessment?.score !== 1) throw new Error(JSON.stringify(j.assessment?.band) + " " + j.assessment?.score);
  if (!(j.hotel_matches || []).length) throw new Error("no hotel matches");
  if (!/not legal advice/i.test(j.disclaimer || "")) throw new Error("no disclaimer");
  ok("POST /api/intake", `case=${j.case_id} · score=${j.assessment.score}/${j.assessment.band} · hotels=${j.hotel_matches.length} · corporates=${j.corporate_matches.length}`);
});

await check("POST /api/intake validation returns 422", async () => {
  const r = await post(PAGES + "/api/intake", { intake: { startup_name: "x" } });
  if (r.status !== 422) throw new Error("HTTP " + r.status);
  const j = await r.json();
  ok("intake 422", `${(j.missing || j.detail?.missing || []).length} missing fields`);
});

await check("Cross-channel session continuity", async () => {
  const session = { ...GOOD_INTAKE, startup_name: "Nomad Pay", sector: "FinTech (where legally permitted)",
    intended_activity: "Cross-border payments for exporters", team_roles: "Founder + 2 technical" };
  const call = (channel, chat_id, text, sess) => post(PAGES + "/api/chat", { text, chat_id, channel, session: sess }).then(r => r.json());
  const a = await call("telegram", "tg-1", "/legal", session);
  const b = await call("whatsapp", "wa-1", "/journey", a.session || session);
  const c = await call("discord", "dc-1", "/hotels", b.session || session);
  for (const [n, r] of [["telegram", a], ["whatsapp", b], ["discord", c]]) if (!r.text) throw new Error("no reply on " + n);
  ok("telegram → whatsapp → discord", `3 replies · last route=${c.route}`);
});

await check("POST /api/deck pdf + personalised markdown", async () => {
  const p = await post(PAGES + "/api/deck", { format: "pdf" });
  const pb = await p.arrayBuffer();
  if (!new TextDecoder().decode(pb.slice(0, 5)).startsWith("%PDF-")) throw new Error("no pdf");
  const m = await (await post(PAGES + "/api/deck", { format: "md", legal_group_name: "Bosphorus Legal" })).json();
  if (!JSON.stringify(m).includes("Bosphorus Legal")) throw new Error("group name missing");
  ok("POST /api/deck", `pdf ${pb.byteLength} bytes + personalised md`);
});

for (const ch of ["telegram", "discord", "whatsapp"]) {
  await check(`POST /webhook/${ch} processes a payload`, async () => {
    const payload = ch === "telegram"
      ? { update_id: 1, message: { message_id: 1, chat: { id: 7, type: "private" }, from: { id: 7, first_name: "T" }, text: "/legal" } }
      : ch === "discord"
        ? { t: "MESSAGE_CREATE", d: { id: "m1", channel_id: "c1", content: "/legal", author: { id: "u1", username: "e2e", bot: false } } }
        : { object: "whatsapp_business_account", entry: [{ changes: [{ value: { messaging_product: "whatsapp", contacts: [{ wa_id: "905550000000" }], messages: [{ from: "905550000000", id: "w1", type: "text", text: { body: "/legal" } }] } }] }] };
    const r = await post(PAGES + "/webhook/" + ch, payload);
    if (r.status === 404) throw new Error("webhook Functions missing");
    const t = await r.text();
    if (r.status >= 500) throw new Error("HTTP " + r.status + " " + t.slice(0, 120));
    ok(`POST /webhook/${ch}`, `HTTP ${r.status} · ${t.slice(0, 60).replace(/\s+/g, " ")}`);
  });
}

await check("GET /webhook/whatsapp verification handshake", async () => {
  const r = await get(PAGES + "/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=startup-landing&hub.challenge=ping123");
  const t = await r.text();
  if (!t.includes("ping123")) throw new Error("challenge not echoed: " + t.slice(0, 80));
  ok("whatsapp handshake", "challenge echoed");
});

await check("CORS: cross-origin GET from the GitHub Pages mirror", async () => {
  const r = await get(PAGES + "/api/info", { Origin: ORIGIN });
  if (r.headers.get("access-control-allow-origin") !== "*") throw new Error("no ACAO header");
  ok("CORS GET", `ACAO=${r.headers.get("access-control-allow-origin")}`);
});

await check("CORS: preflight for POST /api/chat", async () => {
  const r = await fetch(PAGES + "/api/chat", {
    method: "OPTIONS",
    headers: { "User-Agent": UA, Origin: ORIGIN, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type" },
  });
  if (r.status !== 204 && r.status !== 200) throw new Error("HTTP " + r.status);
  const h = r.headers.get("access-control-allow-headers") || "";
  if (!/content-type/i.test(h)) throw new Error("content-type not allowed: " + h);
  ok("CORS preflight", `HTTP ${r.status} · ${h}`);
});

console.log(`\nGitHub Pages mirror — ${GH}`);

await check("GET / serves the mirror", async () => {
  const r = await get(GH + "/");
  const t = await r.text();
  if (r.status !== 200) throw new Error("HTTP " + r.status);
  if (!t.includes("window.API_BASE=\"" + PAGES + "\"")) throw new Error("API_BASE not injected");
  if (!t.includes("window.BASE_PATH=\"/Istanbul-startup-from-iran\"")) throw new Error("BASE_PATH not injected");
  ok("GET / serves the mirror", `${(t.length / 1024).toFixed(0)} KB · API_BASE + BASE_PATH injected`);
});

for (const [p, want] of [["/static/info.json", "modules"], ["/static/hotels.json", "hotels"], ["/static/journey.json", "journey"]]) {
  await check("GET " + p, async () => {
    const r = await get(GH + p);
    const t = await r.text();
    if (r.status !== 200) throw new Error("HTTP " + r.status);
    if (!t.includes(want)) throw new Error("missing key " + want);
    ok("GET " + p, `${(t.length / 1024).toFixed(1)} KB fallback`);
  });
}

await check("GET /deck.html + /deck.pdf are local assets", async () => {
  const h = await get(GH + "/deck.html");
  const p = await get(GH + "/deck.pdf");
  const pb = await p.arrayBuffer();
  if (h.status !== 200 || p.status !== 200) throw new Error(`html=${h.status} pdf=${p.status}`);
  if (!new TextDecoder().decode(pb.slice(0, 5)).startsWith("%PDF-")) throw new Error("no %PDF magic");
  ok("deck assets", `html 200 · pdf ${pb.byteLength} bytes`);
});

await check("Mirror runtime: u()/loc() resolve and both fetches succeed", async () => {
  const html = await (await get(GH + "/")).text();
  const cfg = html.match(/window\.API_BASE=[^<]*?window\.BASE_PATH=[^<]*?;/);
  const helpers = html.match(/const API_BASE[\s\S]*?const loc = p =>[^\n]*\n/);
  if (!cfg) throw new Error("window config not injected");
  if (!helpers) throw new Error("u()/loc() helpers missing");
  const sandbox = new Function("window", cfg[0] + helpers[0] + "; return { u, loc };")({});
  const apiUrl = sandbox.u("/api/info");
  const localUrl = sandbox.loc("/static/info.json");
  if (!apiUrl.startsWith(PAGES)) throw new Error("backend url = " + apiUrl);
  // loc() is root-relative: the browser resolves it against the mirror's own origin
  if (!localUrl.startsWith("/Istanbul-startup-from-iran/")) throw new Error("local url = " + localUrl);
  const live = await (await get(apiUrl, { Origin: ORIGIN })).json();
  const fallback = await (await get(ORIGIN + localUrl)).json();
  if (!live.modules?.length) throw new Error("cross-origin API returned no modules");
  if (!fallback.modules?.length) throw new Error("local fallback returned no modules");
  ok("Mirror runtime", `chat/API → ${new URL(apiUrl).host} · assets → ${new URL(ORIGIN + localUrl).host}${localUrl} · ${live.modules.length} modules both ways`);
});

console.log(`\n${pass} passed, ${fails.length} failed`);
if (fails.length) { console.log("failed: " + fails.join("; ")); process.exit(1); }
