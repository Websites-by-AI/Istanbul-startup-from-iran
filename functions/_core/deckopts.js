// Small helper shared by /deck and /api/deck so query params behave the same.
import { defaultOptions } from "./deck.js";

export { defaultOptions, deckMarkdown, deckHtml, deckPdf, deckFilename } from "./deck.js";

export function deckOptions(query) {
  const q = (k) => (query && query.get ? query.get(k) || "" : "");
  return defaultOptions({
    legal_group_name: q("group") || "Iranian–Turkish Legal Group",
    pilot_city: q("city") || "Istanbul",
    cohort_size: parseInt(q("cohort") || "10", 10) || 10,
    team_size: parseInt(q("team") || "3", 10) || 3,
    sender_name: q("sender"),
    contact: q("contact"),
  });
}
