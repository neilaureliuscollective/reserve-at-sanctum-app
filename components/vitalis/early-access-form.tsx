"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  categories,
  categoryLabels,
  states,
  noticeVersion,
  type Interest,
  type Settings,
} from "@/lib/vitalis/validation";
type Snapshot = {
  account: string | null;
  interest: Interest | null;
  settings: Settings;
};
export function EarlyAccessForm() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null),
    [choices, setChoices] = useState<string[]>([]),
    [region, setRegion] = useState(""),
    [outreach, setOutreach] = useState(false),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [failed, setFailed] = useState(false);
  async function load() {
    setFailed(false);
    try {
      const r = await fetch("/api/vitalis/interest", {
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) throw Error();
      const s: Snapshot = await r.json();
      setSnapshot(s);
      setChoices(s.interest?.interests ?? []);
      setRegion(s.interest?.region ?? "");
      setOutreach(s.interest?.outreach ?? false);
      setConsent(s.interest?.status === "active");
      if (s.account === "client")
        void fetch("/api/vitalis/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: "vitalis_view" }),
        }).catch(() => {});
    } catch {
      setFailed(true);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function save(remove = false, optout = false) {
    setBusy(true);
    setMessage("");
    const active = snapshot?.interest?.status === "active";
    try {
      if (!remove && !active)
        void fetch("/api/vitalis/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: "join_started" }),
        }).catch(() => {});
      const r = await fetch("/api/vitalis/interest", {
        method: remove ? "DELETE" : active ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          remove
            ? { revision: snapshot?.interest?.revision ?? 0 }
            : {
                interests: optout
                  ? (snapshot?.interest?.interests ?? [])
                  : choices,
                region: optout ? (snapshot?.interest?.region ?? "") : region,
                outreach: optout ? false : outreach,
                collectionConsent: consent,
                noticeVersion,
                revision: snapshot?.interest?.revision ?? 0,
              },
        ),
        signal: AbortSignal.timeout(10000),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setSnapshot((s) => (s ? { ...s, interest: data.interest } : s));
      if (optout) setOutreach(false);
      if (remove) {
        setChoices([]);
        setRegion("");
        setOutreach(false);
        setConsent(false);
      }
      setMessage(
        remove
          ? "Registration withdrawn. Your interests and notification permission have been cleared."
          : "Your Vitalis early access is saved. No clinical services or payments have been activated.",
      );
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Unable to save. Refresh to check your registration.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (failed)
    return (
      <div className="vitalis-form">
        <h3>Registration could not refresh.</h3>
        <p>Your choices have not changed.</p>
        <button className="button button-outline" onClick={() => void load()}>
          Refresh registration
        </button>
      </div>
    );
  if (!snapshot)
    return (
      <div className="vitalis-form" role="status">
        Refreshing early access…
      </div>
    );
  if (!snapshot.account)
    return (
      <div className="vitalis-form">
        <h3>A place in the next chapter.</h3>
        <p>
          Use your existing Legacy Reserve account to register. Early access is
          free and does not require a paid membership.
        </p>
        <Link className="button button-gold" href="/signin?next=/vitalis">
          Sign in for early access ↗
        </Link>
      </div>
    );
  if (snapshot.account !== "client")
    return (
      <div className="vitalis-form">
        <p>Early access is available through customer accounts.</p>
        {snapshot.account === "owner" && (
          <Link href="/studio/vitalis" className="text-link">
            Open Vitalis operations ↗
          </Link>
        )}
      </div>
    );
  const active = snapshot.interest?.status === "active",
    open = snapshot.settings.visible && snapshot.settings.registration_open;
  return (
    <form
      className="vitalis-form"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <p className="experience-kicker">
        {active
          ? "EARLY ACCESS · REGISTERED"
          : snapshot.interest
            ? "EARLY ACCESS · WITHDRAWN"
            : "EARLY ACCESS"}
      </p>
      <h3>
        {active
          ? "Your next chapter is reserved."
          : "Stay close to what comes next."}
      </h3>
      <p>
        Free registration. No clinical enrollment, treatment eligibility or
        payment.
      </p>
      {!open && (
        <p className="vitalis-note">
          Registration updates are paused. You can still withdraw or remove
          email permission.
        </p>
      )}
      <fieldset disabled={busy || !open}>
        <legend>
          What would you like to explore? <span>(Optional)</span>
        </legend>
        {categories.map((c) => (
          <label key={c} className="vitalis-check">
            <input
              type="checkbox"
              checked={choices.includes(c)}
              onChange={(e) =>
                setChoices((x) =>
                  e.target.checked ? [...x, c] : x.filter((y) => y !== c),
                )
              }
            />
            {categoryLabels[c]}
          </label>
        ))}
        <label className="vitalis-field">
          State or territory <span>(Optional; helps plan availability)</span>
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="">Prefer not to share</option>
            {states.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="vitalis-check">
          <input
            type="checkbox"
            checked={consent}
            required
            onChange={(e) => setConsent(e.target.checked)}
          />
          I agree to the Vitalis early-access collection notice below.
        </label>
      </fieldset>
      <label className="vitalis-check">
        <input
          type="checkbox"
          disabled={busy}
          checked={outreach}
          onChange={(e) => setOutreach(e.target.checked)}
        />
        Email me about the Vitalis launch. Optional; separate from registration.
      </label>
      <details className="vitalis-notice">
        <summary>Early-access collection & privacy notice</summary>
        <p>
          Legacy Reserve stores your account reference, optional broad interests
          and state, registration status, and permission history to plan Vitalis
          and manage early access. The founder can view these details. Your
          existing account email is used only for launch messages if you opt in.
          These interests are not shared with advertising services, Aethelios,
          retail providers or clinical partners.
        </p>
        <p>
          Do not submit medical history, symptoms or lab results here. Withdraw
          below to remove your interests and email permission. The founder
          reviews stale registrations monthly and removes records without an
          update for 12 months. Old permission evidence for inactive
          registrations is removed during that review. Account deletion removes
          linked Vitalis records. Notice: {noticeVersion}.
        </p>
      </details>
      <div className="member-actions">
        <button
          disabled={busy || !open || !consent}
          className="button button-gold"
        >
          {busy ? "Saving…" : active ? "Save preferences" : "Join early access"}
        </button>
        {active && (
          <button
            type="button"
            disabled={busy}
            className="button button-outline"
            onClick={() => void save(true)}
          >
            Withdraw registration
          </button>
        )}
        {active && !open && snapshot.interest?.outreach && (
          <button
            type="button"
            disabled={busy}
            className="button button-outline"
            onClick={() => void save(false, true)}
          >
            Remove email permission
          </button>
        )}
      </div>
      <p role="status" aria-live="polite">
        {message}
      </p>
    </form>
  );
}
