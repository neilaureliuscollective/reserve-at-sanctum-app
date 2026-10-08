"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  pathways,
  routineTemplate,
  type Priority,
} from "@aethelios/concierge-core";
import type { SavedRoutine } from "@/lib/personal-reserve";
export function RoutineEditor({
  saved,
  initialPriority,
}: {
  saved: SavedRoutine | null;
  initialPriority?: Priority;
}) {
  const router = useRouter();
  const foundation = routineTemplate(
    initialPriority ?? saved?.priority ?? "presence",
  );
  const [draft, setDraft] = useState({
    priority: initialPriority ?? saved?.priority ?? "presence",
    title:
      saved && !saved.cleared && !initialPriority
        ? saved.title
        : foundation.title,
    steps:
      saved && !saved.cleared && !initialPriority
        ? saved.steps.join("\n")
        : foundation.steps.join("\n"),
  });
  const [revision, setRevision] = useState(saved?.revision ?? 0),
    [hasSaved, setHasSaved] = useState(Boolean(saved && !saved.cleared)),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  async function submit(clear = false) {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/routine", {
        method: clear ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          clear
            ? { revision }
            : {
                ...draft,
                steps: draft.steps
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
                revision,
              },
        ),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to save your routine.");
      setRevision(data.routine.revision);
      setHasSaved(!data.routine.cleared);
      if (clear)
        setDraft({
          ...routineTemplate(draft.priority),
          steps: routineTemplate(draft.priority).steps.join("\n"),
        });
      setNotice(
        clear
          ? "Your saved routine was cleared."
          : "Your routine is saved to your Reserve.",
      );
      router.refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="reserve-routine" aria-labelledby="routine-title">
      <p className="experience-kicker">YOUR PERSONAL FOUNDATION</p>
      <h2 id="routine-title">One priority. A useful rhythm.</h2>
      <p>
        Choose a direction and keep up to six simple steps. Save only what you
        want to return to. Keep diagnoses, medication details and other
        sensitive health information with your healthcare provider.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label>
          Priority
          <select
            value={draft.priority}
            onChange={(e) => {
              const priority = e.target.value as Priority;
              setDraft({ ...draft, priority });
              setNotice("");
            }}
          >
            {pathways.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="text-link"
          disabled={busy}
          onClick={() => {
            const next = routineTemplate(draft.priority);
            setDraft({ ...next, steps: next.steps.join("\n") });
            setNotice(
              "Foundation loaded for review. Choose Save routine to keep it.",
            );
          }}
        >
          Use this priority’s foundation ↗
        </button>
        <label>
          Routine title
          <input
            required
            maxLength={80}
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        </label>
        <label>
          Your steps — one per line
          <textarea
            required
            rows={6}
            maxLength={1450}
            value={draft.steps}
            onChange={(e) => setDraft({ ...draft, steps: e.target.value })}
          />
        </label>
        <p className="reserve-field-note">
          Up to six steps, 240 characters each. You can edit or clear this
          anytime.
        </p>
        <div className="member-actions">
          <button className="button button-gold" disabled={busy}>
            {busy ? "Saving…" : "Save routine"}
          </button>
          {hasSaved && (
            <button
              type="button"
              className="button button-outline"
              disabled={busy}
              onClick={() => void submit(true)}
            >
              Clear saved routine
            </button>
          )}
        </div>
        <p role="status" className="reserve-notice">
          {notice}
        </p>
      </form>
    </section>
  );
}
