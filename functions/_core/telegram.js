// Telegram delivery for the edge runtime — shared by /webhook/telegram and
// /api/notify so both send exactly what the Python adapter sends:
// chunked text, inline-keyboard buttons and documents (including the deck PDF).
//
// Needs the Pages secret TELEGRAM_BOT_TOKEN. Optional TELEGRAM_WEBHOOK_SECRET is
// checked against the X-Telegram-Bot-Api-Secret-Token header (set it with
// `setWebhook … secret_token=…`).

import { deckPdf } from "./deck.js";

export const TG_MAX_TEXT = 4000;

export function chunkText(text, size = TG_MAX_TEXT) {
  const out = [];
  let rest = String(text ?? "");
  while (rest.length > size) {
    let cut = rest.lastIndexOf("\n", size);
    if (cut < Math.floor(size * 0.5)) cut = size;
    out.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^\n/, "");
  }
  if (rest.length) out.push(rest);
  return out.length ? out : [""];
}

export function inlineKeyboard(reply) {
  const buttons = ((reply && reply.buttons) || []).filter((b) => b && b.label);
  if (!buttons.length) return undefined;
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(
      buttons.slice(i, i + 2).map((b) =>
        b.url ? { text: b.label, url: b.url } : { text: b.label, callback_data: String(b.action || b.label).slice(0, 64) }
      )
    );
  }
  return { inline_keyboard: rows };
}

async function call(env, method, payload) {
  const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await r.text();
  if (!r.ok) throw new Error(`telegram ${method} ${r.status}: ${body.slice(0, 200)}`);
  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
}

function documentBytes(doc) {
  if (doc.pdf) return deckPdf(doc.opts || {});
  if (doc.content instanceof Uint8Array) return doc.content;
  return new TextEncoder().encode(String(doc.content ?? ""));
}

async function sendDocument(env, chatId, doc) {
  const bytes = documentBytes(doc);
  const form = new FormData();
  form.set("chat_id", String(chatId));
  form.set("document", new Blob([bytes], { type: doc.mime_type || "application/octet-stream" }), doc.filename || "document");
  const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendDocument`, { method: "POST", body: form });
  const body = await r.text();
  if (!r.ok) throw new Error(`telegram sendDocument ${r.status}: ${body.slice(0, 200)}`);
  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
}

/** Send a core Reply to a Telegram chat/channel. Never throws. */
export async function deliverTelegram(env, chatId, reply) {
  if (!env.TELEGRAM_BOT_TOKEN) return { ok: false, error: "TELEGRAM_BOT_TOKEN not set on this Pages project" };
  if (!chatId) return { ok: false, error: "no chat_id" };
  const parts = chunkText((reply && reply.text) || "");
  let messageId = "";
  try {
    for (let i = 0; i < parts.length; i++) {
      const payload = { chat_id: chatId, text: parts[i] };
      if (i === parts.length - 1) {
        const kb = inlineKeyboard(reply);
        if (kb) payload.reply_markup = kb;
      }
      const d = await call(env, "sendMessage", payload);
      messageId = String((d.result || {}).message_id || messageId);
    }
    for (const doc of (reply && reply.documents) || []) {
      const d = await sendDocument(env, chatId, doc);
      messageId = String((d.result || {}).message_id || messageId);
    }
    return { ok: true, message_id: messageId, parts: parts.length };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e), message_id: messageId };
  }
}

/** Send a plain broadcast text (used by POST /api/notify). */
export async function sendTelegramText(env, chatId, text, extra = {}) {
  if (!env.TELEGRAM_BOT_TOKEN) return { ok: false, error: "TELEGRAM_BOT_TOKEN not set on this Pages project" };
  const parts = chunkText(text);
  let messageId = "";
  try {
    for (const part of parts) {
      const d = await call(env, "sendMessage", { chat_id: chatId, text: part, disable_web_page_preview: true, ...extra });
      messageId = String((d.result || {}).message_id || messageId);
    }
    return { ok: true, message_id: messageId };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e), message_id: messageId };
  }
}

/** True when the incoming webhook request carries the right secret token. */
export function telegramSecretOk(env, request) {
  if (!env.TELEGRAM_WEBHOOK_SECRET) return true;
  return (request.headers.get("X-Telegram-Bot-Api-Secret-Token") || "") === env.TELEGRAM_WEBHOOK_SECRET;
}
