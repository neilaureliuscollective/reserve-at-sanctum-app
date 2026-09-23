"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LockKeyhole,
  Scissors,
} from "lucide-react";
import {
  CHAIR_DRAFT_KEY,
  chairChoices,
  consentFiltered,
  emptyChair,
  needsLoad,
  trackChair,
  type ChairInput,
  type ChairProfile,
} from "@/lib/chair";
import { ChairSummary } from "./chair-summary";

type Step =
  "intent" | "life" | "load" | "conversation" | "goal" | "details" | "summary";
const headings: Record<Step, string> = {
  intent: "How are we showing up today?",
  life: "How’s life?",
  load: "What’s taking your energy?",
  conversation: "What do you need from the chair?",
  goal: "How do you want to walk out?",
  details: "A little about your look.",
  summary: "Your chair is ready.",
};
const descriptions: Record<Step, string> = {
  intent: "Start with the cut. We’ll take it from there.",
  life: "You can say a little. You can skip it. Either is good.",
  load: "Just the broad strokes. You don’t need to get into it.",
  conversation: "Some days call for conversation. Some call for quiet.",
  goal: "No technical terms needed. Katie handles the details.",
  details: "Optional. Add what helps, leave the rest for the chair.",
  summary: "Your words. Your preferences. Something useful for Katie.",
};

export function ChairExperience({
  user,
  preview,
  hosted,
}: {
  user: { id: string; name: string } | null;
  preview: boolean;
  hosted: boolean;
}) {
  const [draft, setDraft] = useState<ChairInput>({ ...emptyChair });
  const [step, setStep] = useState<Step>("intent");
  const [ready, setReady] = useState(!user);
  const [saved, setSaved] = useState(false);
  const [existing, setExisting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const started = useRef(false);
  const steps: Step[] = [
    "intent",
    "life",
    ...(needsLoad(draft.life) ? ["load" as Step] : []),
    "conversation",
    "goal",
    "details",
    "summary",
  ];
  const index = steps.indexOf(step);
  function change<K extends keyof ChairInput>(key: K, value: ChairInput[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setSaved(false);
    setMessage("");
  }
  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      let pending: ChairInput | null = null;
      try {
        const raw = sessionStorage.getItem(CHAIR_DRAFT_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const { chairSchema } = await import("@/lib/chair-validation");
          const result = chairSchema.safeParse(parsed.value);
          if (
            result.success &&
            Number.isFinite(parsed.expires) &&
            parsed.expires > Date.now() &&
            (parsed.owner === null || parsed.owner === user?.id)
          )
            pending = result.data;
          if (!pending) sessionStorage.removeItem(CHAIR_DRAFT_KEY);
        }
      } catch {
        /* Storage may be unavailable. The flow remains usable in memory. */
      }
      let profile: ChairProfile | null = null;
      if (user) {
        const response = await fetch("/api/chair", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        profile = data.profile;
      }
      if (cancelled) return;
      if (pending) {
        try {
          sessionStorage.removeItem(CHAIR_DRAFT_KEY);
        } catch {}
        setDraft({ ...pending, revision: profile?.revision || 0 });
        setStep("summary");
        setExisting(Boolean(profile));
        setMessage(
          "Review what you want to keep, then save it to your Reserve account.",
        );
        if (user) trackChair("auth_returned");
      } else if (profile) {
        setDraft({
          ...emptyChair,
          ...Object.fromEntries(
            Object.keys(emptyChair)
              .filter((key) => key !== "save_life")
              .map((key) => [key, profile[key as keyof ChairProfile]]),
          ),
          save_life: false,
        } as ChairInput);
        setStep("summary");
        setSaved(true);
        setExisting(true);
        trackChair("reopened");
      } else if (!started.current) {
        trackChair("started");
        started.current = true;
      }
    }
    initialize()
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);
  useEffect(() => {
    if (!ready) return;
    heading.current?.focus({ preventScroll: true });
  }, [step, ready]);
  useEffect(() => {
    document.title = `${step === "summary" ? "Your Chair" : `${index + 1} of ${steps.length} · The Chair`} · The Reserve`;
  }, [step, ready, index, steps.length]);
  function go(next: Step) {
    setError("");
    setMessage("");
    setStep(next);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function advance() {
    if (step === "intent") trackChair("grooming_completed");
    if (step === "conversation") trackChair("preference_selected");
    if (steps[index + 1] === "summary") trackChair("completed");
    go(steps[index + 1]);
  }
  async function save() {
    setBusy(true);
    trackChair("save_clicked");
    setError("");
    if (!user) {
      if (!hosted && !preview) {
        setError(
          "Saving opens when Reserve accounts are connected. You can still use this summary in the chair.",
        );
        setBusy(false);
        return;
      }
      try {
        const { chairSchema } = await import("@/lib/chair-validation");
        sessionStorage.setItem(
          CHAIR_DRAFT_KEY,
          JSON.stringify({
            value: consentFiltered(chairSchema.parse(draft)),
            owner: null,
            expires: Date.now() + 30 * 60 * 1000,
          }),
        );
      } catch {
        setError(
          "Your browser couldn’t keep this check-in through sign-in. Allow this site’s storage, then try again. Your summary is still here.",
        );
        setBusy(false);
        return;
      }
      window.location.assign("/signin?next=/chair");
      return;
    }
    setBusy(true);
    try {
      // Build an explicit whitelist; never send server-only profile fields back.
      const { chairSchema } = await import("@/lib/chair-validation");
      const input = chairSchema.parse(
        Object.fromEntries(
          Object.keys(emptyChair).map((key) => [
            key,
            draft[key as keyof ChairInput],
          ]),
        ),
      );
      const response = await fetch("/api/chair", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(consentFiltered(input)),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setDraft((d) => ({
        ...d,
        revision: data.profile.revision,
        share_with_katie: data.profile.share_with_katie,
        life: data.profile.life,
        load: data.profile.load,
      }));
      setSaved(true);
      setExisting(true);
      setMessage(
        draft.share_with_katie
          ? "Saved. Katie can open your check-in in her studio."
          : "Saved privately to your Reserve account.",
      );
      try {
        sessionStorage.removeItem(CHAIR_DRAFT_KEY);
      } catch {}
      trackChair("saved");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/chair", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      try {
        sessionStorage.removeItem(CHAIR_DRAFT_KEY);
      } catch {}
      setDraft({ ...emptyChair });
      setSaved(false);
      setExisting(false);
      setConfirmDelete(false);
      setMessage(
        "Your Chair data and attached service notes were deleted. Your other Reserve information stays in place.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!ready)
    return (
      <div className="chair-loading" role="status">
        Getting your chair ready…
      </div>
    );
  const choiceStep = step !== "details" && step !== "summary";
  return (
    <div className="chair-shell">
      <aside className="chair-aside">
        <p className="eyebrow">FIX IT SHOP · KATIE</p>
        <p className="chair-wordmark">
          The
          <br />
          <em>Chair.</em>
        </p>
        <div className="chair-aside-rule" />
        <p>
          Your cut.
          <br />
          Your headspace.
          <br />
          Your time.
        </p>
        <span className="chair-aside-footer">
          <Scissors size={20} /> MEN’S COSMETOLOGY
          <br />
          EUNICE, LOUISIANA
        </span>
      </aside>
      <section className="chair-panel" aria-labelledby="chair-heading">
        <div className="chair-progress-label">
          <span>
            {step === "summary"
              ? "YOUR CHECK-IN"
              : `STEP ${index + 1} OF ${steps.length}`}
          </span>
          <span>AT YOUR PACE</span>
        </div>
        <progress
          className="chair-progress"
          aria-label="Check-in progress"
          value={index + 1}
          max={steps.length}
        />
        <header className="chair-heading">
          <h1 id="chair-heading" ref={heading} tabIndex={-1}>
            {saved ? "Your saved Chair." : headings[step]}
          </h1>
          <p>{descriptions[step]}</p>
        </header>
        {choiceStep && (
          <fieldset className="chair-options">
            <legend className="sr-only">{headings[step]}</legend>
            {chairChoices[step].map((option) => (
              <label
                key={option}
                className={`chair-choice ${draft[step] === option ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name={step}
                  value={option}
                  checked={draft[step] === option}
                  onChange={() => {
                    change(step, option as never);
                    if (step === "life") {
                      setDraft((d) => ({
                        ...d,
                        life: option as ChairInput["life"],
                        load: "",
                        save_life: false,
                      }));
                    }
                  }}
                />
                <span>{option}</span>
                <span className="chair-choice-mark" aria-hidden="true">
                  {draft[step] === option ? <Check size={18} /> : <span />}
                </span>
              </label>
            ))}
          </fieldset>
        )}
        {step === "details" && (
          <div className="chair-details">
            {(["maintenance", "length", "beard"] as const).map((key) => (
              <fieldset key={key}>
                <legend>
                  {key === "maintenance"
                    ? "Time for styling"
                    : key === "length"
                      ? "Your length now"
                      : "Facial hair"}
                </legend>
                <div className="chair-pills">
                  {chairChoices[key].map((option) => (
                    <label key={option}>
                      <input
                        type="radio"
                        name={key}
                        checked={draft[key] === option}
                        onChange={() => change(key, option)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            <label className="chair-field">
              Anything practical Katie should know?{" "}
              <span>
                Optional · grooming, work requirements, or an event. Keep
                personal matters for the conversation.
              </span>
              <textarea
                maxLength={240}
                rows={3}
                value={draft.detail}
                onChange={(e) => change("detail", e.target.value)}
                placeholder="Keeping length for a wedding next month…"
              />
            </label>
            <p className="chair-small">
              Have a look in mind? Bring your inspiration photo to the visit.
              Photos aren’t uploaded or stored here.
            </p>
          </div>
        )}
        {step === "summary" && (
          <>
            <ChairSummary value={draft} />
            {!saved && (
              <div className="chair-consent">
                <p className="chair-small">
                  <LockKeyhole size={15} /> You decide what gets remembered.
                </p>
                <label>
                  <input
                    type="checkbox"
                    disabled={busy}
                    checked={draft.share_with_katie}
                    onChange={(e) => {
                      change("share_with_katie", e.target.checked);
                      if (!e.target.checked) change("save_life", false);
                    }}
                  />
                  <span>
                    Share this check-in with Katie and the authorized Reserve
                    owner.
                  </span>
                </label>
                {draft.life && draft.share_with_katie && (
                  <label>
                    <input
                      type="checkbox"
                      disabled={busy}
                      checked={draft.save_life}
                      onChange={(e) => change("save_life", e.target.checked)}
                    />
                    <span>
                      Include my life context for the next 7 days. It won’t
                      become permanent memory.
                    </span>
                  </label>
                )}
                <p className="chair-small">
                  Grooming preferences stay until you update or delete them.
                  Life answers are left out unless you choose to include them.
                  No diagnosis, scoring, or automatic referrals.
                </p>
              </div>
            )}
            {saved && (
              <p className="chair-small">
                {draft.share_with_katie
                  ? "Shared with Katie and the authorized Reserve owner."
                  : "Private to your account. Katie cannot see this check-in."}{" "}
                {draft.life
                  ? "Life context expires 7 days after saving."
                  : "No life context is saved."}
              </p>
            )}
            <div className="chair-actions">
              {!saved ? (
                <button
                  className="button button-gold"
                  disabled={busy}
                  onClick={save}
                >
                  {busy
                    ? "Saving…"
                    : draft.share_with_katie
                      ? "Save this for Katie"
                      : "Save to my Reserve"}
                  <ArrowRight size={18} />
                </button>
              ) : (
                <>
                  <Link
                    href="/book"
                    className="button button-gold"
                    onClick={() => trackChair("booking_selected")}
                  >
                    Find your next visit <ArrowRight size={18} />
                  </Link>
                  <Link href="/my-sanctum" className="text-link">
                    My Reserve profile
                  </Link>
                </>
              )}
              <button
                className="text-link"
                disabled={busy}
                onClick={() => {
                  setSaved(false);
                  setConfirmDelete(false);
                  if (saved)
                    setDraft((d) => ({
                      ...d,
                      life: "",
                      load: "",
                      save_life: false,
                    }));
                  go("intent");
                }}
              >
                {saved
                  ? "New check-in · keep my grooming preferences"
                  : "Edit my check-in"}
              </button>
            </div>
            {!user && (
              <p className="chair-small">
                One Reserve account for Katie’s Chair, Neil’s Mirror, and your
                visits.{" "}
                {hosted
                  ? "Google and Apple sign-in are available on the next screen."
                  : preview
                    ? "The local preview uses test accounts."
                    : "Account saving is being connected."}
              </p>
            )}
            {saved && (
              <button
                className="text-link"
                onClick={() => {
                  setSaved(false);
                  setDraft((d) => ({ ...d, save_life: false }));
                  setMessage("");
                }}
              >
                Edit sharing & saved details
              </button>
            )}
            {existing && (
              <div className="chair-delete">
                {confirmDelete ? (
                  <>
                    <p>
                      Delete your Chair preferences, life context, and attached
                      service notes?
                    </p>
                    <button
                      className="text-link"
                      disabled={busy}
                      onClick={remove}
                    >
                      Yes, delete my Chair data
                    </button>
                    <button
                      className="text-link"
                      onClick={() => setConfirmDelete(false)}
                    >
                      Keep it
                    </button>
                  </>
                ) : (
                  <button
                    className="text-link"
                    onClick={() => setConfirmDelete(true)}
                  >
                    Delete my Chair data
                  </button>
                )}
              </div>
            )}
          </>
        )}
        {step !== "summary" && (
          <div className="chair-step-actions">
            {index > 0 ? (
              <button
                className="text-link"
                onClick={() => go(steps[index - 1])}
              >
                <ArrowLeft size={16} /> Back
              </button>
            ) : (
              <span />
            )}
            <button
              className="button button-gold"
              disabled={choiceStep && !draft[step]}
              onClick={advance}
            >
              {step === "details" ? "See my check-in" : "Continue"}
              <ArrowRight size={17} />
            </button>
            {(step === "life" || step === "load" || step === "details") && (
              <button
                className="chair-skip text-link"
                onClick={() => {
                  if (step === "life")
                    setDraft((d) => ({
                      ...d,
                      life: "",
                      load: "",
                      save_life: false,
                    }));
                  if (step === "load") change("load", "");
                  go(
                    step === "life" || step === "load"
                      ? "conversation"
                      : "summary",
                  );
                  if (step === "details") trackChair("completed");
                }}
              >
                {" "}
                {step === "details"
                  ? "Leave the details for Katie"
                  : "Skip this — no explanation needed"}
              </button>
            )}
          </div>
        )}
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="chair-message" role="status">
            {message}
          </p>
        )}
        <details className="chair-privacy">
          <summary>Your privacy & support</summary>
          <p>
            This is a grooming check-in, not counseling or medical care. Katie
            isn’t monitoring it for emergencies. Optional life context is shared
            only with your permission; staff service notes are separate and
            should cover grooming only.
          </p>
          <p>
            If you need urgent support in the US, call or text{" "}
            <a href="tel:988">988</a>. For immediate physical danger, call{" "}
            <a href="tel:911">911</a>.{" "}
            <a href="https://988lifeline.org/" target="_blank" rel="noreferrer">
              Open private support resources
            </a>
            .
          </p>
          <p>
            Only anonymous counts of actions are measured. Your answers are
            never included in those counts. Unsaved answers stay in this page;
            choosing sign-in keeps only your selected data in this browser tab
            with a 30-minute expiry.
          </p>
        </details>
      </section>
    </div>
  );
}
