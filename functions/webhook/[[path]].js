// Channel webhooks on the edge: Telegram, Discord, WhatsApp.
//
// The Functions run the same core as the Python service and return the answer.
// Delivery to the messaging platform needs bot credentials: set them as Pages
// secrets (TELEGRAM_BOT_TOKEN / DISCORD_BOT_TOKEN / WHATSAPP_TOKEN +
// WHATSAPP_PHONE_NUMBER_ID + optional WHATSAPP_APP_SECRET) and this file sends
// the message too. Without secrets it still processes the update and returns
// the answer, which is exactly what the test-suite asserts.

import { handleMessage } from "../_core/core.js";
import { deliverTelegram, telegramSecretOk } from "../_core/telegram.js";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" },
  });

export async function onRequest(context) {
  const { request, env } = context;
  const path = "/" + (context.params?.path || []).join("/");

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, X-Hub-Signature-256, X-Telegram-Bot-Api-Secret-Token",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
    });
  }

  const url = new URL(request.url);

  // ---- WhatsApp verification handshake ---------------------------------
  if (path === "/whatsapp" && request.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const expected = env.WHATSAPP_VERIFY_TOKEN || "startup-landing";
    if (mode === "subscribe" && token === expected) return new Response(challenge || "", { status: 200 });
    return json({ error: "verification failed" }, 403);
  }

  if (request.method !== "POST") return json({ error: "use POST" }, 405);

  const raw = await request.arrayBuffer();
  let payload = {};
  try {
    payload = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  if (path === "/telegram") return telegram(payload, env, request);
  if (path === "/discord") return discord(payload, env);
  if (path === "/whatsapp") return whatsapp(payload, raw, request.headers.get("X-Hub-Signature-256") || "", env);
  return json({ error: "not found", path }, 404);
}

/* ------------------------------------------------------------- telegram -- */
export function parseTelegram(update) {
  if (update.callback_query) {
    const cq = update.callback_query;
    const msg = cq.message || {};
    const chat = msg.chat || {};
    const from = cq.from || {};
    return {
      channel: "telegram",
      chat_id: String(chat.id || ""),
      user_id: String(from.id || ""),
      text: cq.data || "",
      user_name: from.username || from.first_name || "",
      message_id: String(msg.message_id || ""),
    };
  }
  const msg = update.message || update.edited_message;
  if (!msg) return null;
  const chat = msg.chat || {};
  const from = msg.from || {};
  const text = msg.text || msg.caption || (msg.document ? `/document ${msg.document.file_name || ""}` : "");
  if (!text.trim()) return null;
  return {
    channel: "telegram",
    chat_id: String(chat.id || ""),
    user_id: String(from.id || ""),
    text,
    user_name: from.username || from.first_name || "",
    language: (from.language_code || "").slice(0, 2),
    message_id: String(msg.message_id || ""),
  };
}

async function telegram(update, env, request) {
  if (!telegramSecretOk(env, request)) return json({ error: "invalid secret token" }, 401);
  const m = parseTelegram(update);
  if (!m) return json({ ok: true, ignored: true });
  const { reply, session } = handleMessage(m.text, {}, { channel: "telegram", chat_id: m.chat_id });
  const d = await deliverTelegram(env, m.chat_id, reply);
  return json({
    ok: true,
    delivered: d.ok,
    error: d.error || "",
    message_id: d.message_id || "",
    session,
    reply: publicReply(reply),
  });
}

/* -------------------------------------------------------------- discord -- */
export function parseDiscord(payload) {
  const d = payload.d || payload;
  const author = d.author || (d.member && d.member.user) || d.user || {};
  if (author.bot) return null;
  const text = d.content || (d.data && d.data.custom_id) || "";
  if (!text.trim()) return null;
  return {
    channel: "discord",
    chat_id: String(d.channel_id || ""),
    user_id: String(author.id || ""),
    text,
    user_name: author.username || "",
  };
}

async function discord(payload, env) {
  const m = parseDiscord(payload);
  if (!m) return json({ ok: true, ignored: true, reason: "bot author or empty text" });
  const { reply, session } = handleMessage(m.text, {}, { channel: "discord", chat_id: m.chat_id });
  let delivered = false;
  let error = "";
  if (env.DISCORD_BOT_TOKEN && m.chat_id) {
    try {
      const r = await fetch(`https://discord.com/api/v10/channels/${m.chat_id}/messages`, {
        method: "POST",
        headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ content: reply.text.slice(0, 1900) }),
      });
      delivered = r.ok;
      if (!r.ok) error = `discord api ${r.status}`;
    } catch (e) {
      error = String((e && e.message) || e);
    }
  } else {
    error = "DISCORD_BOT_TOKEN not set on this Pages project";
  }
  return json({ ok: true, delivered, error, session, reply: publicReply(reply) });
}

/* ------------------------------------------------------------- whatsapp -- */
export function parseWhatsApp(payload) {
  const out = [];
  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      const contacts = Object.fromEntries((value.contacts || []).map((c) => [c.wa_id, c]));
      for (const msg of value.messages || []) {
        let text = "";
        if (msg.type === "text") text = (msg.text || {}).body || "";
        else if (msg.type === "interactive") {
          const br = (msg.interactive || {}).button_reply || {};
          text = br.id || br.title || "";
        }
        if (!text.trim()) continue;
        const from = String(msg.from || "");
        out.push({
          channel: "whatsapp",
          chat_id: from,
          user_id: from,
          text,
          user_name: ((contacts[from] || {}).profile || {}).name || "",
          message_id: msg.id || "",
        });
      }
    }
  }
  return out;
}

async function hmacSha256Hex(buffer, secret) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, buffer);
  return "sha256=" + [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function whatsapp(payload, raw, signatureHeader, env) {
  if (env.WHATSAPP_APP_SECRET) {
    const expected = await hmacSha256Hex(raw, env.WHATSAPP_APP_SECRET);
    if (signatureHeader && signatureHeader !== expected) return json({ error: "invalid signature" }, 401);
  }
  const processed = [];
  for (const m of parseWhatsApp(payload)) {
    const { reply, session } = handleMessage(m.text, {}, { channel: "whatsapp", chat_id: m.chat_id });
    let delivered = false;
    let error = "";
    if (env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID) {
      try {
        const r = await fetch(
          `https://graph.facebook.com/${env.WHATSAPP_API_VERSION || "v21.0"}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({ to: m.chat_id, type: "text", text: { body: reply.text.slice(0, 3000) } }),
          }
        );
        delivered = r.ok;
        if (!r.ok) error = `whatsapp api ${r.status}`;
      } catch (e) {
        error = String((e && e.message) || e);
      }
    } else {
      error = "WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID not set on this Pages project";
    }
    processed.push({ to: m.chat_id, name: m.user_name, ok: delivered, error, reply: publicReply(reply), session });
  }
  return json({ ok: true, processed });
}

function publicReply(reply) {
  return {
    text: reply.text,
    route: reply.route,
    intent: reply.intent,
    language: reply.language,
    escalated: reply.escalated,
    buttons: reply.buttons || [],
    documents: (reply.documents || []).map((d) => ({ filename: d.filename, mime_type: d.mime_type })),
    meta: reply.meta || {},
  };
}
