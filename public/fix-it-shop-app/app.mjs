import { CARD_KEY, DRAFT_KEY, RESET_KEY, FIELDS, emptyCard, parseCard, hasContent, saveCard, deleteCard, viewFromHash } from "./state.mjs";
const GG = "https://fixitshop.glossgenius.com/";
const WEBSITE = new URL("/fix-it-shop/app", location.origin).href;
const $ = id => document.getElementById(id);
const titles = { home: "Home", services: "Services", card: "My consultation card", show: "Show Katie", shop: "The shop", katie: "Katie Guidry", visit: "Visit help" };
let saved = null, draft = emptyCard(), installEvent = null, shareBusy = false, storageIssue = false;
let installed = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
function message(text) { $("app-message").textContent = text; }
function readSaved() {
  try {
    const raw = localStorage.getItem(CARD_KEY);
    saved = raw === null ? null : parseCard(raw);
    if (raw !== null && !saved) $("card-status").textContent = "The saved card could not be read. Start a new one or delete the unreadable local copy.";
  } catch {
    storageIssue = true;
    $("card-status").textContent = "Device storage is unavailable. You can write here, but your card may be lost when you leave this page.";
  }
}
function currentReset() { try { return localStorage.getItem(RESET_KEY) || ""; } catch { return ""; } }
let draftReset = currentReset();
function clearDraft() {
  draft = emptyCard(); draftReset = currentReset();
  FIELDS.forEach(key => { $(key).value = ""; });
  try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
}
function readDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    if ((JSON.parse(raw).reset || "") !== currentReset()) { sessionStorage.removeItem(DRAFT_KEY); return null; }
    return parseCard(raw);
  } catch { return null; }
}
function updateSummary() {
  const ready = hasContent(saved);
  $("card-preview-title").textContent = ready ? "Ready for the conversation." : "A few thoughts. A better conversation.";
  $("card-preview-copy").textContent = ready ? "Your consultation card is saved on this device. Read it, edit it, or show Katie in person." : "What to change, what to keep, what to ask. Optional, and just on this device.";
  $("card-preview-action").textContent = ready ? "Open my card →" : "Make my card →";
  $("show-link").setAttribute("aria-disabled", String(!ready));
  renderShow(); updateInstall();
}
function renderShow() {
  const root = $("show-content"); root.replaceChildren();
  if (!hasContent(saved)) { const p = document.createElement("p"); p.textContent = "There is no saved card to show. Write and save a card when you want one."; root.append(p); return; }
  const labels = { change: "What I’d like to change", keep: "What I’d like to keep", questions: "My questions" };
  for (const key of FIELDS) {
    if (!saved[key].trim()) continue;
    const article = document.createElement("article"), heading = document.createElement("h2"), body = document.createElement("p");
    heading.textContent = labels[key]; body.textContent = saved[key]; article.append(heading, body); root.append(article);
  }
}
function renderView(focus = true) {
  const view = viewFromHash(location.hash);
  document.querySelectorAll("[data-screen]").forEach(node => { node.hidden = node.dataset.screen !== view; });
  document.querySelectorAll(".app-nav a").forEach(node => {
    const active = node.hash === `#${view === "show" ? "card" : view}`;
    if (active) node.setAttribute("aria-current", "page"); else node.removeAttribute("aria-current");
  });
  $("delete-confirm").hidden = true;
  $("share-fallback").hidden = true;
  document.title = `${titles[view]} · Fix It Shop`;
  if (view === "show") { readSaved(); renderShow(); }
  updateInstall();
  if (focus) {
    document.querySelector(`[data-screen="${view}"] h1`).focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "auto" });
  }
}
function updateConnection() {
  const offline = !navigator.onLine;
  $("connection").hidden = !offline;
  $("connection").textContent = "Offline · Your on-device card is available here. Booking and current details need a connection.";
  document.querySelectorAll("[data-book],[data-online]").forEach(a => a.setAttribute("aria-disabled", String(offline)));
}
function updateInstall() {
  let dismissed = false;
  try { dismissed = localStorage.getItem("fix-it-install-dismissed:v1") === "true"; } catch {}
  $("install-promotion").hidden = installed || dismissed || !hasContent(saved) || !["home", "card"].includes(viewFromHash(location.hash));
  $("install-button").hidden = !installEvent;
}
readSaved(); const tabDraft = readDraft(); draft = tabDraft || saved || emptyCard();
FIELDS.forEach(key => { $(key).value = draft[key]; });
if (tabDraft && !storageIssue && JSON.stringify(tabDraft) !== JSON.stringify(saved)) $("card-status").textContent = "Draft kept for this tab. Choose Save to keep it on this device.";
else if (saved && !storageIssue) $("card-status").textContent = "Saved on this device. Not sent to Katie.";
updateSummary(); renderView(false); updateConnection();
window.addEventListener("hashchange", () => renderView());
window.addEventListener("online", updateConnection); window.addEventListener("offline", updateConnection);
window.addEventListener("pageshow", () => { if (draftReset !== currentReset()) clearDraft(); updateConnection(); readSaved(); updateSummary(); });
window.addEventListener("storage", event => {
  if (event.key === RESET_KEY || event.key === null || (event.key === CARD_KEY && event.newValue === null)) clearDraft();
  if ([CARD_KEY, RESET_KEY, null].includes(event.key)) { readSaved(); updateSummary(); }
});
document.addEventListener("click", event => {
  const link = event.target.closest("a"); if (!link) return;
  if (link.classList.contains("skip")) { event.preventDefault(); $("main").focus(); return; }
  if (link.id === "show-link" && !hasContent(saved)) { event.preventDefault(); $("card-status").textContent = "Save a card on this device before showing it to Katie."; return; }
  if (link.matches("[data-book],[data-online]") && !navigator.onLine) { event.preventDefault(); message("Reconnect to open that site. Your consultation card stays here."); return; }
  if (link.hasAttribute("data-view") && link.hash === location.hash) { event.preventDefault(); renderView(); }
  // A booking link never writes an appointment, completion flag, analytics or card data.
});
$("card-form").addEventListener("input", () => {
  draft = { version: 1, ...Object.fromEntries(FIELDS.map(key => [key, $(key).value])) };
  try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, reset: draftReset })); $("card-status").textContent = "Draft kept for this tab. Choose Save to keep it on this device."; }
  catch { $("card-status").textContent = "Unsaved draft is only in this open page. Device storage is unavailable."; }
});
$("card-form").addEventListener("submit", event => {
  event.preventDefault();
  try {
    if (!saveCard(localStorage, draft)) { $("card-status").textContent = "Add something you’d like to keep, change or ask before saving."; return; }
    saved = parseCard(JSON.stringify(draft)); storageIssue = false;
    try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
    $("card-status").textContent = "Saved on this device. Not sent to Katie."; updateSummary();
  } catch { $("card-status").textContent = "This card could not be saved. Keep this page open or try a browser that allows device storage."; }
});
$("delete-card").addEventListener("click", () => { $("delete-confirm").hidden = false; $("confirm-delete").focus(); });
$("cancel-delete").addEventListener("click", () => { $("delete-confirm").hidden = true; $("delete-card").focus(); });
$("confirm-delete").addEventListener("click", () => {
  let failed = false;
  try { deleteCard(localStorage); localStorage.setItem(RESET_KEY, crypto.randomUUID()); } catch { failed = true; }
  try { sessionStorage.removeItem(DRAFT_KEY); } catch { failed = true; }
  if (failed) { $("card-status").textContent = "The local copy could not be fully deleted. Clear this site’s browser storage to remove it."; return; }
  saved = null; clearDraft();
  $("delete-confirm").hidden = true; $("card-status").textContent = "Card and draft deleted from this device."; updateSummary(); $("change").focus();
});
function shareFallback(text = "Copy the website link below.") {
  $("share-fallback").hidden = false; $("share-link").value = WEBSITE; message(text); $("share-link").focus(); $("share-link").select();
}
$("share").addEventListener("click", async () => {
  if (shareBusy) return; shareBusy = true; $("share").disabled = true;
  try {
    if (!navigator.share) { shareFallback(); return; }
    await navigator.share({ title: "Fix It Shop · Katie Guidry", text: "Meet Katie and book with Fix It Shop.", url: WEBSITE });
  } catch (error) { if (error?.name !== "AbortError") shareFallback("Sharing is unavailable here. Copy the website link instead."); }
  finally { shareBusy = false; $("share").disabled = false; }
});
$("copy-link").addEventListener("click", async () => {
  try { if (!navigator.clipboard?.writeText) throw Error(); await navigator.clipboard.writeText(WEBSITE); message("Website link copied. Your consultation card was not included."); }
  catch { $("share-link").focus(); $("share-link").select(); message("Select and copy the website link. Your consultation card is not included."); }
});
window.addEventListener("beforeinstallprompt", event => { event.preventDefault(); installEvent = event; updateInstall(); });
window.addEventListener("appinstalled", () => { installed = true; installEvent = null; updateInstall(); });
$("install-button").addEventListener("click", async () => {
  const event = installEvent; if (!event) return; installEvent = null; updateInstall();
  try { await event.prompt(); await event.userChoice; } catch { message("Use your browser’s Add to Home Screen option when available."); }
});
$("dismiss-install").addEventListener("click", () => {
  try { localStorage.setItem("fix-it-install-dismissed:v1", "true"); } catch {}
  $("install-promotion").hidden = true;
});
if ("serviceWorker" in navigator && window.isSecureContext) {
  const ownWorker = () => navigator.serviceWorker.controller?.scriptURL === new URL("./sw.js", location.href).href;
  if (ownWorker()) $("offline-ready").textContent = "This app’s offline copy is ready. Booking and the full website still need a connection.";
  navigator.serviceWorker.register("./sw.js", { scope: "./", updateViaCache: "none" }).then(async () => {
    const registration = await navigator.serviceWorker.ready;
    if (registration.scope === new URL("./", location.href).href)
      $("offline-ready").textContent = "This app’s offline copy is ready. Booking and the full website still need a connection.";
  }).catch(() => { if (!ownWorker()) $("offline-ready").textContent = "Offline reopening is unavailable in this browser. Saved card storage is separate; keep this page open if you lose connection."; });
}
