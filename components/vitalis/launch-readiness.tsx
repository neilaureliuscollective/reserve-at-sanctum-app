"use client";
import { useState } from "react";
import type { launchOverview } from "@/lib/vitalis/launch-store";
type Overview = Awaited<ReturnType<typeof launchOverview>>;
export function LaunchReadiness({ initial }: { initial: Overview }) {
  const [data, setData] = useState(initial),
    [busy, setBusy] = useState(""),
    [message, setMessage] = useState("");
  const count = data.gates.filter((g) => g.reviewed).length;
  async function save(key: string) {
    const g = data.gates.find((g) => g.key === key)!;
    setBusy(key);
    setMessage("");
    try {
      const r = await fetch("/api/studio/vitalis/launch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key,
            reviewed: g.reviewed,
            reference: g.reference,
            revision: g.revision,
          }),
          signal: AbortSignal.timeout(10000),
        }),
        j = await r.json();
      if (!r.ok) throw Error(j.error ?? "Review could not save.");
      setData((d) => ({
        ...d,
        gates: d.gates.map((x) =>
          x.key === key
            ? {
                ...x,
                revision: j.revision,
                updated_at: new Date().toISOString(),
              }
            : x,
        ),
      }));
      setMessage(
        "Review recorded. Billing, discounts and clinical enrollment remain disabled.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy("");
    }
  }
  async function reload() {
    setBusy("reload");
    try {
      const r = await fetch("/api/studio/vitalis/launch", {
          signal: AbortSignal.timeout(10000),
        }),
        j = await r.json();
      if (!r.ok) throw Error(j.error);
      setData(j);
      setMessage("Saved reviews reloaded. Unsaved edits were discarded.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not reload.");
    } finally {
      setBusy("");
    }
  }
  function edit(key: string, changes: Record<string, unknown>) {
    setData((d) => ({
      ...d,
      gates: d.gates.map((g) => (g.key === key ? { ...g, ...changes } : g)),
    }));
    setMessage("Unsaved review changes. Record review to keep them.");
  }
  const persisted = data.gates.filter((g) => g.revision > 0).length;
  return (
    <div className="vitalis-pilot">
      <section className="pilot-surface">
        <p className="experience-kicker">COMMERCIAL RELEASE · CLOSED</p>
        <h2>Evidence before enrollment.</h2>
        <p>
          These reviews organize founder decisions. They cannot activate
          charges, product discounts, prescriptions or clinical enrollment—even
          when every item is recorded.
        </p>
        <p className="pilot-count">
          <strong>{count}/9</strong>
          <span>marked for review · {persisted} saved records</span>
        </p>
        <p>
          Marking a review is a founder attestation, not independent
          verification. Draft checkbox changes are included in this count.
        </p>
      </section>
      <section className="pilot-reading">
        <div>
          <p className="experience-kicker">ACTUAL PILOT PARTICIPATION</p>
          <h2>{Number(data.pilot.active)} active rhythms</h2>
          <p>
            {Number(data.pilot.recently_updated)} active accounts saved or
            marked a rhythm within seven days.
          </p>
          <p className="pilot-caption">
            No identities, directions or daily histories. “Recently updated”
            includes settings changes; it is not retention, clinical outcomes or
            proof of paid demand.
          </p>
        </div>
        <div>
          <p className="experience-kicker">NEXT COMMERCIAL DECISION</p>
          <h3>Validate the $149 offer.</h3>
          <p>
            Obtain a complete written partner cost stack. Confirm the approved
            medical billing arrangement before deciding whether treatment can be
            included.
          </p>
          <a
            href="https://www.connect-go.com/pricing"
            target="_blank"
            rel="noreferrer"
            className="text-link"
          >
            Connect’s public pricing ↗
          </a>
        </div>
      </section>
      <section aria-label="Launch evidence checklist" className="pilot-gates">
        {data.gates.map((g, i) => (
          <details className="pilot-surface" key={g.key}>
            <summary>
              <span className="experience-kicker">
                {String(i + 1).padStart(2, "0")} ·{" "}
                {g.revision ? "SAVED REVIEW RECORD" : "NO SAVED REVIEW"}
              </span>
              <span>{g.title}</span>
            </summary>
            <p>{g.detail}</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void save(g.key);
              }}
            >
              <fieldset disabled={Boolean(busy)}>
                <legend>{g.title}</legend>
                <label>
                  Evidence reference
                  <input
                    aria-label={`${g.title} evidence reference`}
                    value={g.reference}
                    maxLength={500}
                    placeholder="docs/approved-offer.md or reviewed HTTPS document URL"
                    onChange={(e) => edit(g.key, { reference: e.target.value })}
                  />
                </label>
                <p className="pilot-caption">
                  Reference only. No patient records, credentials, signed access
                  links or private contract text. No URL is fetched or sent to a
                  partner.
                </p>
                <label className="pilot-check">
                  <input
                    type="checkbox"
                    checked={g.reviewed}
                    onChange={(e) =>
                      edit(g.key, { reviewed: e.target.checked })
                    }
                  />
                  I reviewed the supporting evidence for this item.
                </label>
                <p className="pilot-caption">
                  Revision {g.revision} ·{" "}
                  {g.updated_at
                    ? "Recorded " + new Date(g.updated_at).toLocaleDateString()
                    : "Not recorded"}
                </p>
                <button
                  className="button button-gold"
                  disabled={Boolean(busy) || (g.reviewed && !g.reference)}
                >
                  {busy === g.key ? "Recording…" : "Record review"}
                </button>
              </fieldset>
            </form>
          </details>
        ))}
      </section>
      <section className="pilot-surface">
        <h3>Partner quote request.</h3>
        <p>
          Use the request in repository documentation for program-specific costs
          and responsibilities. Do not treat public ranges or calculator
          assumptions as contracted prices.
        </p>
        <a
          className="text-link"
          href="https://github.com/neilaureliuscollective/reserve-at-sanctum-app/blob/main/docs/VITALIS-PARTNER-QUOTE.md"
          target="_blank"
          rel="noreferrer"
        >
          Open quote request ↗
        </a>
        <p>
          <button
            className="text-link"
            disabled={Boolean(busy)}
            onClick={() => void reload()}
          >
            Reload saved reviews and discard drafts
          </button>
        </p>
      </section>
      <p className="pilot-message" role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
