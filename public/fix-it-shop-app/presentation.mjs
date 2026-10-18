// Presentation-only cache warming. Card/auth/booking state stays in app.mjs.
// Warm only the art-directed source selected by <picture>, never both masters.
const allowed = new Set(["/fix-it-shop-app/materials/stage-phone.webp", "/fix-it-shop-app/materials/stage-wide.webp"]);
const image = document.querySelector(".home-stage .stage-source");
async function warmSelectedStage() {
  if (!image || !("serviceWorker" in navigator) || !window.isSecureContext) return;
  try {
    await image.decode();
    const url = new URL(image.currentSrc, location.href);
    if (url.origin !== location.origin || !allowed.has(url.pathname)) return;
    const registration = await navigator.serviceWorker.ready;
    if (registration.scope !== new URL("./", location.href).href || !registration.active) return;
    const channel = new MessageChannel();
    channel.port1.onmessage = event => {
      if (event.data?.cached === true && event.data.path === url.pathname)
        document.documentElement.dataset.stageCached = url.pathname;
      channel.port1.close();
    };
    registration.active.postMessage({ type: "CACHE_PUBLIC_STAGE", path: url.pathname }, [channel.port2]);
  } catch { /* Abstract CSS backing remains usable if optional art is unavailable. */ }
}
image?.addEventListener("load", warmSelectedStage);
matchMedia("(min-width: 800px)").addEventListener("change", () => requestAnimationFrame(warmSelectedStage));
navigator.serviceWorker?.addEventListener("controllerchange", warmSelectedStage);
void warmSelectedStage();
// Keep real focus targets clear of whichever navigation surface is present,
// including enlarged text. This changes layout insets only, never card state.
const root = document.documentElement;
const nav = document.querySelector('.app-nav');
const masthead = document.querySelector('.app-header');
const bookingBar = document.querySelector('.expanded-booking');
const expanded = matchMedia('(min-width: 800px)');
const fixedBookingHeight = () => bookingBar && getComputedStyle(bookingBar).position === 'fixed'
  ? Math.ceil(bookingBar.getBoundingClientRect().height) : 0;
function updateInsets() {
  root.style.setProperty('--navigation-height', `${expanded.matches ? 0 : Math.ceil(nav?.getBoundingClientRect().height || 0)}px`);
  root.style.setProperty('--masthead-height', `${Math.ceil(masthead?.getBoundingClientRect().height || 0)}px`);
  root.style.setProperty('--booking-bar-height', `${fixedBookingHeight()}px`);
}
if ('ResizeObserver' in window) {
  const observer = new ResizeObserver(updateInsets);
  [nav, masthead, bookingBar].filter(Boolean).forEach(node => observer.observe(node));
}
expanded.addEventListener('change', updateInsets);
window.addEventListener('hashchange', () => requestAnimationFrame(updateInsets));
window.addEventListener('resize', updateInsets);
void document.fonts.ready.then(updateInsets);
updateInsets();
function revealFocusedControl(target) {
  if (!(target instanceof HTMLElement) || !target.matches('a,button,input,textarea,summary') || target.closest('.app-header,.app-nav,.expanded-booking')) return;
  const rect = target.getBoundingClientRect();
  const top = (masthead?.getBoundingClientRect().bottom || 0) + 14;
  const fixedBottom = Math.max(expanded.matches ? 0 : (nav?.getBoundingClientRect().height || 0), fixedBookingHeight());
  const bottom = innerHeight - fixedBottom - 22;
  if (rect.top >= top && rect.bottom <= bottom) return;
  const delta = rect.height > bottom - top
    ? (rect.top + rect.height / 2) - (top + bottom) / 2
    : rect.bottom > bottom ? rect.bottom - bottom : rect.top - top;
  window.scrollBy({ top: delta, behavior: 'auto' });
}
document.addEventListener('focusin', event => requestAnimationFrame(() => revealFocusedControl(event.target)));
