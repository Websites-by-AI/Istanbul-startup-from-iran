// Cloudflare Pages Function — the whole JSON API for the public deployment.
// Mirrors bot/server.py so the website works identically here and on a VPS.

import {
  handleMessage,
  DATA,
  deckMarkdown,
  deckHtml,
  deckPdf,
  deckFilename,
  defaultOptions,
  ld,
  nav,
  sp,
  safe,
} from "../_core/core.js";

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-Hub-Signature-256, X-Telegram-Bot-Api-Secret-Token",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data, null, 0), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...cors },
  });

const text = (body, status = 200, type = "text/plain; charset=utf-8") =>
  new Response(body, { status, headers: { "Content-Type": type, ...cors } });

async function readJson(request) {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
}

function deckOptionsFrom(body = {}, query = {}) {
  const q = (k) => (query.get && query.get(k)) || "";
  return defaultOptions({
    legal_group_name: String(body.legal_group_name || q("group") || "Iranian–Turkish Legal Group"),
    pilot_city: String(body.pilot_city || q("city") || "Istanbul"),
    cohort_size: parseInt(body.cohort_size ?? q("cohort") ?? 10, 10) || 10,
    team_size: parseInt(body.team_size ?? q("team") ?? 3, 10) || 3,
    sender_name: String(body.sender_name || q("sender") || ""),
    contact: String(body.contact || q("contact") || ""),
  });
}

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  const query = url.searchParams;
  const path = "/" + (context.params?.path || []).join("/");

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  try {
    if (request.method === "GET") return await onGet(path, query, request, next);
    if (request.method === "POST") return await onPost(path, request);
    return json({ error: "method not allowed", path }, 405);
  } catch (err) {
    return json({ error: "internal error", detail: String(err && err.message ? err.message : err), path }, 500);
  }
}

async function onGet(path, query, request, next) {
  switch (path) {
    case "/health":
      return json({
        ok: true,
        version: "1.0.0",
        deployment: "cloudflare-pages",
        channels: ["web", "telegram-webhook", "discord-webhook", "whatsapp-webhook"],
      });

    case "/info": {
      const staticInfo = await tryStatic(request, "/static/info.json");
      return json(staticInfo || {
        platform: "Türkiye Startup Landing Platform",
        program: "Iran → Türkiye Startup Bridge",
        deployment: "Cloudflare Pages",
        channels: [
          { channel: "web", status: "ready", transport: "Pages Function /api/chat" },
          { channel: "telegram", status: "webhook ready", transport: "POST /webhook/telegram" },
          { channel: "discord", status: "webhook ready", transport: "POST /webhook/discord" },
          { channel: "whatsapp", status: "webhook ready", transport: "POST /webhook/whatsapp" },
        ],
        modules: [
          "Legal Landing Desk (Iran–Türkiye Startup Legal Desk)",
          "Startup Legal Intake Form",
          "Pre-Landing Legal Assessment",
          "Two-Layer Legal Model",
          "Sponsor model (hospitality / corporate / ecosystem)",
          "Istanbul Startup Hotel Map",
          "Corporate Startup Sponsorship + PoC flow",
          "AI Startup Navigator with Legal AI Safety Principle",
          "Pitch-deck generator for legal partners (MD/HTML/PDF)",
        ],
        commands: ["/legal", "/intake", "/assessment", "/journey", "/hotels", "/corporate", "/deck", "/pilot", "/metrics", "/human", "/lang en|fa|tr"],
      });
    }

    case "/journey":
      return json({ journey: ld.JOURNEY, layers: ld.LAYERS });

    case "/intake-form":
      return json({ fields: ld.INTAKE_FORM, required: ld.REQUIRED_INTAKE_KEYS });

    case "/hotels": {
      const city = query.get("city") || "";
      return json({
        cities: sp.CITIES,
        sponsor_types: sp.SPONSOR_TYPES,
        hotels: DATA.hotels,
        corporate_sponsors: DATA.corporate_sponsors,
        ecosystem_sponsors: DATA.ecosystem_sponsors,
        legal_partners: DATA.legal_partners,
        total_sponsored_rooms: sp.totalSponsoredRooms(DATA, city),
        matches: sp.matchHotels(DATA, { city: city || "Istanbul", roomsNeeded: 3, needsWorkspace: true }),
      });
    }

    case "/pilot": {
      const applied = Math.max(1, parseInt(query.get("applied") || "100", 10) || 100);
      return json({
        pilot: ld.PILOT,
        applied,
        funnel: ld.funnelProjection(applied),
        metrics: ld.SUCCESS_METRICS.map(([metric, target]) => ({ metric, target })),
      });
    }

    case "/stats":
      return json({
        mode: "stateless-edge",
        startups: 0,
        legal_cases: 0,
        sponsored_rooms: sp.totalSponsoredRooms(DATA),
        hotels: (DATA.hotels || []).length,
        corporate_sponsors: (DATA.corporate_sponsors || []).length,
        channels_enabled: ["web", "telegram-webhook", "discord-webhook", "whatsapp-webhook"],
        note: "Pipeline counters live in the self-hosted Python service (bot/server.py → GET /api/stats).",
      });

    case "/deck":
    case "/deck.md": {
      const opts = deckOptionsFrom({}, query);
      return text(deckMarkdown(opts), 200, "text/markdown; charset=utf-8");
    }

    case "/deck.pdf": {
      const opts = deckOptionsFrom({}, query);
      return new Response(deckPdf(opts), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${deckFilename(opts)}"`,
          ...cors,
        },
      });
    }

    case "/safety":
      return json({
        disclaimer: safe.DISCLAIMER,
        refusal: safe.REFUSAL,
        advice_triggers: safe.ADVICE_TRIGGERS,
        principle:
          "AI prepares, organises and routes. A licensed legal professional determines the legally appropriate route. No immigration outcome is guaranteed.",
      });

    default:
      return json({ error: "not found", path }, 404);
  }
}

async function tryStatic(request, p) {
  try {
    const r = await fetch(new URL(p, request.url));
    if (r.ok) return await r.json();
  } catch {
    /* ignore — fall back to the inline payload */
  }
  return null;
}

async function onPost(path, request) {
  if (path === "/chat") {
    const body = await readJson(request);
    const textIn = String(body.text || "");
    if (!textIn.trim()) return json({ error: "text is required" }, 400);
    let channel = String(body.channel || "web");
    if (!["web", "telegram", "discord", "whatsapp", "simulated"].includes(channel)) channel = "web";
    const chatId = String(body.chat_id || body.session_id || "web-anonymous");
    const { reply, session } = handleMessage(textIn, body.session || {}, { channel, chat_id: chatId });
    return json({
      ...reply,
      documents: (reply.documents || []).map((d) => ({
        filename: d.filename,
        mime_type: d.mime_type,
        size: d.content ? d.content.length : 0,
        download: `/api/deck?format=${d.mime_type === "application/pdf" ? "pdf" : d.mime_type === "text/html" ? "html" : "md"}`,
      })),
      session_id: chatId,
      session,
    });
  }

  if (path === "/intake") {
    const body = await readJson(request);
    const intake = body.intake && typeof body.intake === "object" ? body.intake : body;
    const missing = ld.validateIntake(intake);
    if (missing.length) return json({ error: "missing_fields", missing }, 422);
    const assessment = ld.preLandingAssessment(intake);
    const startup = {
      id: `st_${Math.random().toString(16).slice(2, 14)}`,
      name: String(intake.startup_name || "").trim(),
      sector: String(intake.sector || "").trim(),
      stage: String(intake.stage || "").trim(),
      team_size: parseInt(intake.team_size || 3, 10),
      intended_city: String(intake.intended_city || "Istanbul").trim(),
      funding_target_usd: parseInt(intake.funding_target_usd || 0, 10),
    };
    return json(
      {
        startup,
        case_id: `lc_${Math.random().toString(16).slice(2, 14)}`,
        step: 2,
        assessment,
        hotel_matches: sp
          .matchHotels(DATA, {
            city: startup.intended_city,
            sector: startup.sector,
            roomsNeeded: Math.min(startup.team_size, 3),
            needsWorkspace: true,
          })
          .slice(0, 3),
        corporate_matches: sp.matchCorporateSponsors(DATA, startup.sector, startup.intended_city).slice(0, 3),
        disclaimer: safe.DISCLAIMER.en,
        persistence: "stateless-edge: the lead is returned to you and forwarded to the Legal Desk webhook of the self-hosted service",
      },
      201
    );
  }

  if (path === "/assessment") {
    const body = await readJson(request);
    const intake = body.intake && typeof body.intake === "object" ? body.intake : body;
    return json({ assessment: ld.preLandingAssessment(intake), missing: ld.validateIntake(intake) });
  }

  if (path === "/deck") {
    const body = await readJson(request);
    const opts = deckOptionsFrom(body);
    const fmt = String(body.format || "md");
    if (fmt === "pdf") {
      return new Response(deckPdf(opts), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${deckFilename(opts)}"`,
          ...cors,
        },
      });
    }
    if (fmt === "html") return text(deckHtml(opts), 200, "text/html; charset=utf-8");
    return json({ format: "md", filename: deckFilename(opts, "md"), markdown: deckMarkdown(opts) });
  }

  if (path === "/notify") {
    const body = await readJson(request);
    const targets = Array.isArray(body.targets) ? body.targets : [];
    if (!String(body.text || "").trim() || !targets.length) return json({ error: "text and targets[] are required" }, 400);
    // The public edge deployment has no bot credentials; forwarding is done by the
    // self-hosted service. We report exactly that instead of pretending.
    return json({
      results: targets.map((t) => ({
        channel: t.channel,
        ok: false,
        error: "channel credentials are not configured on the public edge deployment — run bot/run.py with tokens to deliver",
      })),
    });
  }

  if (path === "/safety-check") {
    const body = await readJson(request);
    const report = safe.review(String(body.text || ""));
    const [safeText] = safe.stripGuarantees(String(body.text || ""));
    return json({ report, safe_text: safeText });
  }

  return json({ error: "not found", path }, 404);
}
