// Compatibility for old install/default URLs. Keep the established cinematic
// page as the single public Home; do not copy its marketing into the tool app.
// Explicit tasks, restored sessions and offline local cards keep their route.
(() => {
  let pending = false, unavailable = false;
  const isDefault = () => ["", "#home"].includes(location.hash);
  const openPublicHome = () => {
    if (navigator.onLine !== false && isDefault() && !unavailable) {
      if (!pending) {
        pending = true;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1500);
        // navigator.onLine can remain true on Wi-Fi without Internet access.
        // Never leave the cached guide unless the actual public page responds.
        fetch("/fix-it-shop/app", { method: "HEAD", credentials: "omit", cache: "no-store", signal: controller.signal })
          .then(response => { if (!response.ok) throw Error("Public Home unavailable"); if (isDefault()) location.replace("/fix-it-shop/app"); })
          .catch(() => { unavailable = true; if (isDefault()) { window.fixItPublicHomeUnavailable = true; window.dispatchEvent(new Event("fixit-public-home-unavailable")); } })
          .finally(() => { clearTimeout(timeout); pending = false; });
      }
      return true;
    }
    return false;
  };
  window.openFixItPublicHome = openPublicHome;
  openPublicHome();
  window.addEventListener("hashchange", openPublicHome);
  // No pageshow/online redirect: resuming a task must not reset its location.
})();
