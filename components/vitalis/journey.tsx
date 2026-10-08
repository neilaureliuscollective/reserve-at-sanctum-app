"use client";
import Link from "next/link";
import { useState } from "react";
import {
  foundations,
  directions,
  journeyNotice,
  type JourneyView,
} from "@/lib/vitalis/journey-design";
type Overview = JourneyView & {
  routine: { title: string; priority: string } | null;
};
export function VitalisJourney({ initial }: { initial: Overview }) {
  const [view, setView] = useState(initial),
    [direction, setDirection] = useState(initial.journey?.direction ?? "sleep"),
    [minutes, setMinutes] = useState(initial.journey?.minutes ?? 10),
    [target, setTarget] = useState(initial.journey?.target ?? 3),
    [adult, setAdult] = useState(Boolean(initial.journey?.active)),
    [consent, setConsent] = useState(Boolean(initial.journey?.active)),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [clearing, setClearing] = useState(false);
  const j = view.journey,
    chosen = foundations[direction],
    active = j?.active && j.direction ? foundations[j.direction] : null;
  const done = view.week.filter((d) => j?.days.includes(d)).length,
    marked = Boolean(j?.days.includes(view.today));
  async function request(method: string, body?: unknown) {
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/vitalis/journey", {
          method,
          headers: body ? { "Content-Type": "application/json" } : undefined,
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(10000),
        }),
        data = await r.json();
      if (!r.ok) throw Error(data.error ?? "Your rhythm could not save.");
      setView({ ...view, ...data });
      setClearing(false);
      if (method === "GET") {
        setDirection(data.journey?.direction ?? "sleep");
        setMinutes(data.journey?.minutes ?? 10);
        setTarget(data.journey?.target ?? 3);
        setAdult(Boolean(data.journey?.active));
        setConsent(Boolean(data.journey?.active));
      }
      if (method === "DELETE") {
        setConsent(false);
        setAdult(false);
      }
      setMessage(
        method === "DELETE"
          ? "Your rhythm and completion history were cleared. Early access and your Reserve routine are unchanged."
          : method === "PATCH"
            ? (body as { completed: boolean }).completed
              ? "Today is marked. A useful step, at your pace."
              : "Today’s mark was removed."
            : method === "GET"
              ? "Your saved rhythm was reloaded."
              : "Your rhythm is saved. No paid or clinical enrollment was created.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="vitalis-pilot">
      <section className="pilot-surface pilot-status">
        <p className="experience-kicker">FREE WELLNESS PILOT · AVAILABLE NOW</p>
        <p>
          Build a useful rhythm with your existing account. Paid Vitalis
          memberships, diagnostics and medical care remain planned.
        </p>
      </section>
      {active && j && (
        <section className="pilot-focus" aria-labelledby="focus-title">
          <div>
            <p className="experience-kicker">YOUR DIRECTION · {active.label}</p>
            <h2 id="focus-title">{active.title}</h2>
            <p className="pilot-action">{active.action}</p>
            {Number(j.minutes) >= 10 && <p>{active.extended}</p>}
            <p className="pilot-caption">
              A {j.minutes}-minute planning window · your choice, not a clinical
              target.
            </p>
            <div className="member-actions">
              <button
                className="button button-gold"
                disabled={busy}
                aria-pressed={marked}
                onClick={() =>
                  void request("PATCH", {
                    revision: j.revision,
                    completed: !marked,
                  })
                }
              >
                {marked ? "Undo today’s mark" : "Mark today complete"}
              </button>
              <Link href="/pathways?priority=performance" className="text-link">
                Open Performance ↗
              </Link>
            </div>
          </div>
          <div className="pilot-week">
            <p className="experience-kicker">THIS WEEK · MONDAY–SUNDAY</p>
            <p className="pilot-count">
              <strong>{done}</strong>
              <span>of {j.target} chosen days</span>
            </p>
            <ol aria-label="Your completion days this week">
              {view.week.map((d) => (
                <li
                  key={d}
                  data-done={j.days.includes(d)}
                  data-today={d === view.today}
                >
                  <span>
                    {new Date(d + "T12:00:00Z").toLocaleDateString("en-US", {
                      weekday: "short",
                      timeZone: "UTC",
                    })}
                  </span>
                  <span aria-hidden="true">
                    {j.days.includes(d) ? "✓" : "·"}
                  </span>
                  <span className="pilot-sr">
                    {d}:{" "}
                    {j.days.includes(d)
                      ? "completed"
                      : d > view.today
                        ? "upcoming"
                        : "not marked"}
                  </span>
                </li>
              ))}
            </ol>
            <p className="pilot-caption">
              Self-reported activity, not a health score. No backdating or
              future marks. Your calendar follows America/Chicago.
            </p>
          </div>
        </section>
      )}
      <section className="pilot-surface" aria-labelledby="rhythm-title">
        <p className="experience-kicker">YOUR EVERYDAY FOUNDATION</p>
        <h2 id="rhythm-title">
          {active ? "Refine your rhythm." : "Choose one useful direction."}
        </h2>
        <p>
          A small action you can return to. Your existing Performance and
          Reserve routines remain separate.
        </p>
        <details open={!active}>
          <summary>
            {active ? "Edit direction and weekly target" : "Set up your rhythm"}
          </summary>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void request("POST", {
                direction,
                minutes,
                target,
                revision: j?.revision ?? 0,
                adult,
                consent,
                noticeVersion: journeyNotice,
              });
            }}
          >
            <fieldset disabled={busy}>
              <legend>Your choices</legend>
              <div className="pilot-fields">
                <label>
                  Direction
                  <select
                    aria-label="Direction"
                    value={direction}
                    onChange={(e) =>
                      setDirection(e.target.value as typeof direction)
                    }
                  >
                    {directions.map((d) => (
                      <option key={d} value={d}>
                        {foundations[d].label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Planning window
                  <select
                    aria-label="Planning window"
                    value={minutes}
                    onChange={(e) =>
                      setMinutes(Number(e.target.value) as 5 | 10 | 20)
                    }
                  >
                    {[5, 10, 20].map((n) => (
                      <option key={n} value={n}>
                        {n} minutes
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Days per week
                  <select
                    aria-label="Days per week"
                    value={target}
                    onChange={(e) => setTarget(Number(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? "day" : "days"}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="pilot-preview">
                <p className="experience-kicker">YOUR PROPOSED STEP</p>
                <p>{chosen.action}</p>
                {minutes >= 10 && <p>{chosen.extended}</p>}
              </div>
              {active && direction !== j?.direction && (
                <p>
                  Changing direction starts a fresh completion history when you
                  save.
                </p>
              )}
              <label className="pilot-check">
                <input
                  type="checkbox"
                  required
                  checked={adult}
                  onChange={(e) => setAdult(e.target.checked)}
                />
                I confirm I am 18 or older.
              </label>
              <label className="pilot-check">
                <input
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                I agree to save these choices and completion dates under the
                pilot privacy notice below.
              </label>
              <button
                className="button button-gold"
                disabled={!adult || !consent || busy}
              >
                {busy ? "Saving…" : "Save my rhythm"}
              </button>
            </fieldset>
          </form>
        </details>
      </section>
      <section className="pilot-reading">
        <div>
          <p className="experience-kicker">UNDERSTAND THE FOUNDATION</p>
          <h2>Useful context. Trusted sources.</h2>
          <p>{(active ?? chosen).reason}</p>
          <a
            className="text-link"
            href={(active ?? chosen).source}
            target="_blank"
            rel="noreferrer"
          >
            {(active ?? chosen).sourceLabel} ↗
          </a>
          <p className="pilot-caption">
            Reviewed October 8, 2026. General education; adapt activity to your
            abilities and consult a qualified provider for health concerns.
          </p>
        </div>
        <div>
          <p className="experience-kicker">YOUR CONNECTED RESERVE</p>
          <h3>
            {view.routine
              ? "Your routine is already here."
              : "Keep your wider routine together."}
          </h3>
          {view.routine && <p>{view.routine.title}</p>}
          <p>
            This pilot does not overwrite your saved Reserve routine, visit
            preferences or early-access permission.
          </p>
          <Link href="/pathways" className="text-link">
            Your routine & pathways ↗
          </Link>
          <p>
            <Link href="/vitalis#early-access" className="text-link">
              Manage early access ↗
            </Link>
          </p>
        </div>
      </section>
      <section className="pilot-surface">
        <p className="experience-kicker">
          PREPARING FOR QUALIFIED CARE · COMING LATER
        </p>
        <h2>Bring better questions.</h2>
        <p>
          When clinical access becomes available, ask the provider which
          evaluations are appropriate, what is included in the price, how
          follow-up works and who handles urgent concerns. No eligibility,
          diagnosis or treatment decision is made here.
        </p>
        <Link className="text-link" href="/vitalis/membership">
          Explore the proposed memberships ↗
        </Link>
      </section>
      <section className="pilot-privacy">
        <h3>Pilot privacy notice.</h3>
        <p>
          We save your direction, planning window, weekly target, consent
          version and up to 90 completion dates with your account. Your account
          shows dates from the last 90 days; old dates are pruned when you save
          or mark a day. There is no medical history, symptom journal,
          laboratory upload or medication tracking.
        </p>
        <p>
          Founder operations show aggregate participation counts, not your
          direction or completion dates. These records are not sent to care
          partners, advertising tools or AI. Clearing removes your choices,
          dates and consent; a minimal inactive record and revision remain to
          prevent stale edits. Your separate routine and early-access permission
          are unaffected.
        </p>
        <div className="member-actions">
          <button
            type="button"
            className="text-link"
            disabled={busy}
            onClick={() => void request("GET")}
          >
            Reload saved rhythm
          </button>
          {j?.active && (
            <button
              type="button"
              className="text-link"
              disabled={busy}
              onClick={() => setClearing(!clearing)}
            >
              Clear rhythm and history
            </button>
          )}
        </div>
        {clearing && (
          <div className="pilot-confirm">
            <p>Clear your rhythm, completion dates and pilot consent?</p>
            <button
              className="button button-outline"
              disabled={busy}
              onClick={() => void request("DELETE", { revision: j?.revision })}
            >
              Confirm clear
            </button>
            <button
              className="text-link"
              disabled={busy}
              onClick={() => setClearing(false)}
            >
              Keep my rhythm
            </button>
          </div>
        )}
        <p className="pilot-caption">
          Notice {journeyNotice}. This free pilot does not grant future paid
          benefits.
        </p>
      </section>
      <p className="pilot-message" role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
