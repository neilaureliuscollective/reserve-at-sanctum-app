"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Actor } from "@/lib/booking";
import type { BookingNotification, SavedBooking } from "@/lib/booking-recovery";

const storageKey = "reserve.booking-request.v1";
type Pointer = { requestKey: string; actorId: string };
type Intent = { serviceId: string; locationId: string; start: string; note: string };
type Outcome = { appointment: SavedBooking; notification: BookingNotification };
type Phase = "ready" | "checking" | "uncertain" | "signin" | "different-account";
async function request(path: string, body: unknown) {
  const response = await fetch(path, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(12000),
  });
  const data = await response.json();
  return { response, data };
}

/** Tab-lived opaque reference only. Notes, intent, names and contact details
 * never enter browser storage. Recovery settles the previous request before
 * allowing edits or a new key, including when the original POST arrives late. */
export function useBookingSubmission(actor: Actor | null, sessionLoaded: boolean) {
  const pointer = useRef<Pointer | null>(null);
  const running = useRef(false);
  const [phase, setPhase] = useState<Phase>("checking");
  const [message, setMessage] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.actorId !== "string" || !/^[\da-f-]{36}$/i.test(parsed.requestKey)) throw Error();
        pointer.current = { requestKey: parsed.requestKey, actorId: parsed.actorId };
      }
    } catch { setMessage("Request recovery storage is unavailable. Check your appointments before booking again."); }
    setReady(true);
  }, []);

  const recover = useCallback(async () => {
    if (running.current) return;
    if (!pointer.current) { setPhase("ready"); return; }
    running.current = true;
    setPhase("checking");
    try {
      const { response, data } = await request("/api/appointments/recover", pointer.current);
      if (response.status === 401) { setPhase("signin"); return; }
      if (response.status === 403) { setPhase("different-account"); return; }
      if (!response.ok) throw Error();
      if (data.appointment) {
        setOutcome(data);
        setMessage("");
      } else {
        // The server has retired this key, even if the POST has not arrived yet.
        sessionStorage.removeItem(storageKey);
        pointer.current = null;
        setMessage("No appointment was saved for this request. It is safely closed. Review your details before trying again.");
      }
      setPhase("ready");
    } catch {
      setPhase("uncertain");
      setMessage("We cannot yet confirm whether your appointment was saved. Reconnect and check this request before booking again.");
    } finally { running.current = false; }
  }, [actor]);

  useEffect(() => {
    if (ready && sessionLoaded) void recover();
  }, [ready, sessionLoaded, recover]);
  useEffect(() => {
    const reconnect = () => { if (!outcome && pointer.current) void recover(); };
    window.addEventListener("online", reconnect);
    return () => window.removeEventListener("online", reconnect);
  }, [recover, outcome]);

  async function submit(intent: Intent) {
    if (running.current || phase !== "ready" || outcome || !actor) return;
    if (pointer.current) { await recover(); return; }
    const next = { requestKey: crypto.randomUUID(), actorId: actor.id };
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(next));
      if (sessionStorage.getItem(storageKey) !== JSON.stringify(next)) throw Error();
    } catch {
      setMessage("Allow session storage in this browser before submitting, so an interrupted booking can be recovered.");
      return;
    }
    pointer.current = next;
    running.current = true;
    setPhase("checking");
    setMessage("");
    try {
      const { response, data } = await request("/api/appointments", {...intent, requestKey:next.requestKey});
      if (response.ok && data.appointment?.id) {
        setOutcome(data);
        setPhase("ready");
        return;
      }
      if (response.status === 401) { setPhase("signin"); return; }
      // Even a failure response may follow a successful earlier retry. Settle
      // on the server instead of clearing the key or claiming nothing saved.
    } catch { /* timeout/offline is an unknown outcome, never proof of failure */ }
    finally { running.current = false; }
    await recover();
  }
  function newBooking() {
    if (!outcome) return;
    try { sessionStorage.removeItem(storageKey); } catch { return; }
    pointer.current = null;
    setOutcome(null);
    setMessage("");
    setPhase("ready");
  }
  return {phase, message, outcome, recover, submit, newBooking};
}
