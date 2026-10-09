"use client";
import { useEffect, useState } from "react";
import { bookingRequest } from "@/lib/booking-request";
export function FixItRuntime() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update(); window.addEventListener("online", update); window.addEventListener("offline", update);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  return offline ? <p role="status" className="fix-it-network-status">You’re offline. Reconnect to view your working day or save appointment changes.</p> : null;
}
export function FixItSignout() {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function signout() {
    setBusy(true); setError("");
    try {
      await bookingRequest("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "signout" }) });
      window.location.assign("/fix-it-shop/app/signin?next=%2F");
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }
  return <><button className="button button-outline" disabled={busy} onClick={signout}>{busy ? "Signing out…" : "Sign out"}</button>{error && <p role="alert">{error}</p>}</>;
}
