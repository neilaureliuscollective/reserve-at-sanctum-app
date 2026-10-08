"use client";
import Link from "next/link";
import { useState } from "react";
import {
  categories,
  categoryLabels,
  states,
  type Partner,
} from "@/lib/vitalis/validation";
import type { overview } from "@/lib/vitalis/store";
type Overview = Awaited<ReturnType<typeof overview>>;
export function VitalisOperations({ initial }: { initial: Overview }) {
  const [data, setData] = useState(initial),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [draft, setDraft] = useState<Partner | null>(null);
  async function write(action: string, value: unknown) {
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/studio/vitalis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, data: value }),
        signal: AbortSignal.timeout(10000),
      });
      const result = await r.json();
      if (!r.ok) throw Error(result.error);
      const refresh = await fetch("/api/studio/vitalis?page=" + data.page, {
        cache: "no-store",
      });
      if (!refresh.ok)
        throw Error(
          "Saved, but records could not refresh. Reload before editing again.",
        );
      setData(await refresh.json());
      setDraft(null);
      setMessage(
        "Vitalis operations saved. No clinical services have been activated.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="vitalis-office">
      <div className="vitalis-metrics">
        <div>
          <span>ACTIVE EARLY ACCESS</span>
          <strong>{String(data.totals.active ?? 0)}</strong>
        </div>
        <div>
          <span>EMAIL PERMISSION</span>
          <strong>{String(data.totals.contact_ready ?? 0)}</strong>
        </div>
        <div>
          <span>CLINICAL SERVICES</span>
          <strong>Not live</strong>
        </div>
      </div>
      <section className="studio-panel">
        <h2>Release controls</h2>
        <p>
          Visibility controls the introduction. Registration controls new joins
          and preference updates. Withdrawal and removal of email permission
          remain available.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void write("settings", {
              visible: f.has("visible"),
              registration_open: f.has("registration_open"),
              revision: data.settings.revision,
            });
          }}
          key={data.settings.revision}
        >
          <label className="vitalis-check">
            <input
              type="checkbox"
              name="visible"
              defaultChecked={data.settings.visible}
            />
            Introduction visible
          </label>
          <label className="vitalis-check">
            <input
              type="checkbox"
              name="registration_open"
              defaultChecked={data.settings.registration_open}
            />
            Registration open
          </label>
          <button disabled={busy} className="button button-gold">
            Save release controls
          </button>
        </form>
      </section>
      <div className="vitalis-office-grid">
        <section className="studio-panel">
          <h2>Interest by category</h2>
          <p>
            Voluntary selections can overlap. These counts do not prove
            willingness to pay.
          </p>
          {categories.map((c) => (
            <p key={c}>
              {categoryLabels[c]}{" "}
              <strong>
                {String(
                  data.interests.find((x) => x.category === c)?.count ?? 0,
                )}
              </strong>
            </p>
          ))}
        </section>
        <section className="studio-panel">
          <h2>Availability demand</h2>
          {data.regions.length ? (
            data.regions.map((x) => (
              <p key={String(x.region)}>
                {String(x.region)} · {String(x.count)}
              </p>
            ))
          ) : (
            <p>No optional state preferences yet.</p>
          )}
          <h3>Weekly joins</h3>
          {data.weekly.map((x) => (
            <p key={String(x.week)}>
              {String(x.week).slice(0, 10)} · {String(x.count)}
            </p>
          ))}
        </section>
      </div>
      <section className="studio-panel">
        <h2>Early-access roster</h2>
        <p>
          Founder-only. Contact information uses the existing account. Launch
          messages require email permission. No messages or exports are sent
          from this screen.
        </p>
        {data.roster.length ? (
          <div className="vitalis-roster">
            {data.roster.map((x, n) => (
              <article key={n}>
                <h3>{String(x.name)}</h3>
                <p>{String(x.email)}</p>
                <p>
                  {Array.isArray(x.interests)
                    ? x.interests
                        .map(
                          (c) =>
                            categoryLabels[c as keyof typeof categoryLabels],
                        )
                        .join(", ")
                    : ""}
                  {x.region ? " · " + String(x.region) : ""}
                </p>
                <small>
                  {x.outreach
                    ? "Launch email permitted"
                    : "No launch email permission"}
                </small>
              </article>
            ))}
          </div>
        ) : (
          <p>No active registrations.</p>
        )}
        <div className="member-actions">
          {data.page > 0 && (
            <Link href={"/studio/vitalis?page=" + (data.page - 1)}>
              Previous page
            </Link>
          )}
          {data.hasMore && (
            <Link href={"/studio/vitalis?page=" + (data.page + 1)}>
              Next page
            </Link>
          )}
        </div>
      </section>
      <section className="studio-panel">
        <h2>Partner foundation</h2>
        <p>
          All records are internal and unpublished. Verified status records due
          diligence; it does not activate referrals or clinical functionality.
          No medical records or credentials belong here.
        </p>
        <button
          disabled={busy}
          className="button button-outline"
          onClick={() =>
            setDraft({
              id: crypto.randomUUID(),
              name: "",
              categories: ["diagnostics"],
              regions: [],
              status: "draft",
              kind: "clinical",
              destination: "",
              destinationReviewed: false,
              revision: 0,
            })
          }
        >
          Add partner draft
        </button>
        <div className="vitalis-roster">
          {data.partners.map((p) => (
            <article key={p.id}>
              <h3>{p.name}</h3>
              <p>
                {p.status} · {p.kind} · Unpublished
              </p>
              <button
                disabled={busy}
                className="text-link"
                onClick={() => setDraft(p)}
              >
                Edit partner
              </button>
            </article>
          ))}
        </div>
        {draft && (
          <form
            key={draft.id + ":" + draft.revision}
            className="vitalis-partner-form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void write("partner", {
                id: draft.id,
                revision: draft.revision,
                name: f.get("name"),
                status: f.get("status"),
                kind: f.get("kind"),
                categories: f.getAll("categories"),
                regions: String(f.get("regions"))
                  .split(",")
                  .map((x) => x.trim().toUpperCase())
                  .filter(Boolean),
                destination: f.get("destination"),
                destinationReviewed: f.has("reviewed"),
              });
            }}
          >
            <label className="vitalis-field">
              Partner name
              <input
                name="name"
                defaultValue={draft.name}
                maxLength={100}
                required
              />
            </label>
            <label className="vitalis-field">
              Internal status
              <select name="status" defaultValue={draft.status}>
                {["draft", "in-review", "verified", "paused", "archived"].map(
                  (s) => (
                    <option key={s}>{s}</option>
                  ),
                )}
              </select>
            </label>
            <label className="vitalis-field">
              Type
              <select name="kind" defaultValue={draft.kind}>
                <option>clinical</option>
                <option>nonclinical</option>
              </select>
            </label>
            <fieldset>
              <legend>Service categories</legend>
              {categories.map((c) => (
                <label key={c} className="vitalis-check">
                  <input
                    type="checkbox"
                    name="categories"
                    value={c}
                    defaultChecked={draft.categories.includes(c)}
                  />
                  {categoryLabels[c]}
                </label>
              ))}
            </fieldset>
            <label className="vitalis-field">
              Supported states/territories, comma separated
              <input
                name="regions"
                defaultValue={draft.regions.join(", ")}
                placeholder="LA, TX"
              />
              <small>Allowed: {states.join(", ")}</small>
            </label>
            <label className="vitalis-field">
              Reviewed HTTPS destination, optional
              <input
                name="destination"
                type="url"
                maxLength={500}
                defaultValue={draft.destination}
              />
            </label>
            <label className="vitalis-check">
              <input
                name="reviewed"
                type="checkbox"
                defaultChecked={draft.destinationReviewed}
              />
              I reviewed this exact destination and provider identity.
            </label>
            <div className="member-actions">
              <button disabled={busy} className="button button-gold">
                Save unpublished partner
              </button>
              <button
                type="button"
                disabled={busy}
                className="button button-outline"
                onClick={() => setDraft(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>
      <section className="studio-panel">
        <h2>Retention review</h2>
        <p>
          Remove registrations without an update for 12 months and old
          permission evidence for inactive registrations. Review monthly; no
          clinical records are involved.
        </p>
        <button
          disabled={busy}
          className="button button-outline"
          onClick={() => void write("cleanup", {})}
        >
          Clean expired early-access records
        </button>
      </section>
      <section className="studio-panel">
        <h2>Aggregate activity · 30 days</h2>
        <p>
          Account-only approximate page/start counts. No identities or
          preferences are attached to these counters. Completed joins and
          withdrawals are counted by the server.
        </p>
        {data.funnel.map((x) => (
          <p key={String(x.event)}>
            {String(x.event).replaceAll("_", " ")} · {String(x.count)}
          </p>
        ))}
      </section>
      <p role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
