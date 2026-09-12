// GET /deck  → printable legal-partnership deck (supports ?group=&city=&cohort=)
import { deckHtml, deckOptions } from "./_core/deckopts.js";

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const opts = deckOptions(url.searchParams);
  return new Response(deckHtml(opts), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Access-Control-Allow-Origin": "*" },
  });
}
