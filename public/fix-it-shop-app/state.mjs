export const CARD_KEY = "fix-it-consultation:v1";
export const RESET_KEY = "fix-it-consultation-reset:v1";
export const DRAFT_KEY = "fix-it-consultation-draft:v1";
export const FIELDS = ["change", "keep", "questions"];
export const VIEWS = ["home", "services", "card", "show", "shop", "katie", "visit"];
export const emptyCard = () => ({ version: 1, change: "", keep: "", questions: "" });
export function parseCard(raw) {
  try {
    if (typeof raw !== "string" || raw.length > 16000) return null;
    const value = JSON.parse(raw);
    if (!value || value.version !== 1 || FIELDS.some(key => typeof value[key] !== "string" || value[key].length > 600)) return null;
    return { version: 1, change: value.change, keep: value.keep, questions: value.questions };
  } catch { return null; }
}
export function hasContent(card) {
  return Boolean(card && FIELDS.some(key => card[key].trim()));
}
export function saveCard(storage, card) {
  const clean = parseCard(JSON.stringify(card));
  if (!hasContent(clean)) return false;
  // Only these three user-authored fields leave memory, and only to device storage.
  storage.setItem(CARD_KEY, JSON.stringify(clean));
  return true;
}
export function deleteCard(storage) { storage.removeItem(CARD_KEY); }
export function viewFromHash(hash) {
  if (hash === "#guide") return "home";
  const view = hash.replace(/^#/, "");
  return VIEWS.includes(view) ? view : "home";
}
