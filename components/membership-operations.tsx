"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DateTime } from "luxon";
import type { MembershipPlan } from "@/lib/membership";
import type {
  Privilege,
  membershipOperations,
} from "@/lib/membership-operations";
type Overview = Awaited<ReturnType<typeof membershipOperations>>;
async function mutate(action: string, data: unknown) {
  const r = await fetch("/api/studio/memberships", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, data }),
  });
  const result = await r.json();
  if (!r.ok) throw Error(result.error || "Unable to save.");
}
function PlanEditor({ plan }: { plan: MembershipPlan }) {
  const router = useRouter();
  const [benefits, setBenefits] = useState<Privilege[]>(
    plan.benefit_model.map((b) => ({
      ...b,
      availability: b.availability ?? "planned",
      destination: b.destination ?? "none",
    })),
  );
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const patch = (i: number, change: Partial<Privilege>) =>
    setBenefits((bs) =>
      bs.map((b, index) => (index === i ? { ...b, ...change } : b)),
    );
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      await mutate("plan", {
        id: plan.id,
        revision: plan.revision,
        name: f.get("name"),
        tagline: f.get("tagline"),
        active: f.get("active") === "on",
        benefit_model: benefits,
      });
      setMessage(
        "Plan saved. Existing memberships keep their granted privileges.",
      );
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="studio-panel membership-plan">
      <summary>
        {plan.name}
        <span>
          {plan.active ? "Published · complimentary" : "Unpublished"} · revision{" "}
          {plan.revision}
        </span>
      </summary>
      <form onSubmit={save} className="membership-office-form">
        <label>
          Plan name
          <input
            name="name"
            defaultValue={plan.name}
            required
            minLength={3}
            maxLength={80}
          />
        </label>
        <label>
          Purpose
          <input name="tagline" defaultValue={plan.tagline} maxLength={240} />
        </label>
        <p>
          Only recognition, digital access and location access can be marked
          available. Pricing, credits and service redemption remain in
          preparation.
        </p>
        {benefits.map((b, i) => (
          <fieldset key={i}>
            <legend>Privilege {i + 1}</legend>
            <label>
              Description
              <input
                aria-label={`Privilege ${i + 1} description`}
                value={b.label}
                onChange={(e) => patch(i, { label: e.target.value })}
                required
                minLength={3}
                maxLength={160}
              />
            </label>
            <label>
              Category
              <select
                aria-label={`Privilege ${i + 1} category`}
                value={b.kind}
                onChange={(e) =>
                  patch(i, {
                    kind: e.target.value as Privilege["kind"],
                    availability: "planned",
                  })
                }
              >
                <option value="recognition">Recognition</option>
                <option value="digital_access">Digital access</option>
                <option value="location_eligibility">Location access</option>
                <option value="product_discount">
                  Product pricing · later
                </option>
                <option value="service_benefit">Service benefit · later</option>
                <option value="credits">Credits · later</option>
              </select>
            </label>
            <label>
              Availability
              <select
                aria-label={`Privilege ${i + 1} availability`}
                value={b.availability}
                onChange={(e) =>
                  patch(i, {
                    availability: e.target.value as Privilege["availability"],
                  })
                }
              >
                <option value="planned">In preparation</option>
                {!["product_discount", "service_benefit", "credits"].includes(
                  b.kind,
                ) && <option value="available">Available</option>}
              </select>
            </label>
            <label>
              Destination
              <select
                aria-label={`Privilege ${i + 1} destination`}
                value={b.destination}
                onChange={(e) =>
                  patch(i, {
                    destination: e.target.value as Privilege["destination"],
                  })
                }
              >
                <option value="none">No action</option>
                <option value="profile">Profile</option>
                <option value="chair">The Chair</option>
                <option value="book">Book at assigned house</option>
                <option value="collection">Collection</option>
              </select>
            </label>
            <button
              type="button"
              className="button button-outline"
              disabled={busy || benefits.length === 1}
              onClick={() => setBenefits((bs) => bs.filter((_, n) => n !== i))}
            >
              Remove privilege {i + 1}
            </button>
          </fieldset>
        ))}
        <button
          type="button"
          className="button button-outline"
          disabled={busy || benefits.length >= 12}
          onClick={() =>
            setBenefits((bs) => [
              ...bs,
              {
                kind: "recognition",
                label: "",
                availability: "planned",
                destination: "none",
              },
            ])
          }
        >
          Add privilege
        </button>
        <label className="membership-check">
          <input type="checkbox" name="active" defaultChecked={plan.active} />
          Publish this complimentary plan for access requests
        </label>
        <p>
          Publication offers no paid enrollment. Granting requires a separate
          owner action.
        </p>
        <button className="button button-gold" disabled={busy}>
          {busy ? "Saving…" : "Save plan"}
        </button>
        <p role="status">{message}</p>
      </form>
    </details>
  );
}
export function MembershipOperations({ overview }: { overview: Overview }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [planId, setPlanId] = useState(
    overview.plans.find((p) => p.active)?.id ?? "",
  );
  const [locationId, setLocationId] = useState("");
  const zone = String(
    overview.locations.find((l) => l.id === locationId)?.timezone ??
      "America/Chicago",
  );
  async function act(action: string, data: unknown) {
    setBusy(true);
    setMessage("");
    try {
      await mutate(action, data);
      setMessage("Saved to the membership record.");
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function grant(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      p = overview.plans.find((p) => p.id === planId);
    await act("grant", {
      email: f.get("email"),
      planId,
      planRevision: p?.revision,
      locationId: f.get("locationId") || null,
      startsAt: DateTime.fromISO(String(f.get("startsAt")), { zone })
        .startOf("day")
        .toUTC()
        .toISO(),
      endsAt: DateTime.fromISO(String(f.get("endsAt")), { zone })
        .startOf("day")
        .toUTC()
        .toISO(),
      acknowledge: f.get("acknowledge") === "on",
    });
  }
  return (
    <>
      <section className="studio-panel">
        <h2>Access requests.</h2>
        <p>Requests create no membership or payment obligation.</p>
        {overview.requests.length === 0 ? (
          <p>No access requests yet.</p>
        ) : (
          overview.requests.map((r) => (
            <article className="membership-record" key={r.id}>
              <div>
                <h3>{String(r.name)}</h3>
                <p>{String(r.email)}</p>
                <p>
                  {r.interest} · {r.status}
                </p>
              </div>
              {r.status === "submitted" && (
                <button
                  className="button button-outline"
                  disabled={busy}
                  onClick={() =>
                    act("close", { id: r.id, revision: r.revision })
                  }
                >
                  Close request
                </button>
              )}
            </article>
          ))
        )}
      </section>
      <section>
        <h2>Plan library.</h2>
        <p>
          Review the existing draft plans. Publish only privileges the house can
          deliver. Changes apply to future grants.
        </p>
        {overview.plans.map((p) => (
          <PlanEditor key={`${p.id}-${p.revision}`} plan={p} />
        ))}
      </section>
      <section className="studio-panel">
        <h2>Grant complimentary access.</h2>
        <p>
          A verified member account is required. Dates follow the selected
          house’s time, or Central time for digital access. Access ends at the
          start of the end date. No recurring charges are created.
        </p>
        <form onSubmit={grant} className="membership-office-form">
          <label>
            Member account email
            <input type="email" name="email" required maxLength={254} />
          </label>
          <label>
            Published plan
            <select
              aria-label="Published plan"
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              required
            >
              <option value="">Choose a plan</option>
              {overview.plans
                .filter((p) => p.active)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </label>
          {overview.plans
            .find((p) => p.id === planId)
            ?.benefit_model.map((b, i) => (
              <p key={i}>
                {b.label} ·{" "}
                {b.availability === "available"
                  ? "Available when eligible"
                  : "In preparation"}
              </p>
            ))}
          <label>
            Membership house
            <select
              name="locationId"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
            >
              <option value="">Digital access · no physical house</option>
              {overview.locations
                .filter((l) => l.enabled)
                .map((l) => (
                  <option key={String(l.id)} value={String(l.id)}>
                    {String(l.name)}
                  </option>
                ))}
            </select>
          </label>
          <div className="membership-date-row">
            <label>
              Start date
              <input name="startsAt" type="date" required />
            </label>
            <label>
              End date
              <input name="endsAt" type="date" required />
            </label>
          </div>
          <label className="membership-check">
            <input type="checkbox" name="acknowledge" required />I approve these
            privileges and dates as complimentary access. This does not confirm
            payment or activate credits.
          </label>
          <button
            className="button button-gold"
            disabled={busy || !overview.plans.some((p) => p.active)}
          >
            {busy ? "Saving…" : "Grant complimentary membership"}
          </button>
        </form>
      </section>
      <p role="status" className="membership-office-message">
        {message}
      </p>
      <section className="studio-panel">
        <h2>Membership register.</h2>
        {overview.members.length === 0 ? (
          <p>No memberships granted yet.</p>
        ) : (
          overview.members.map((m) => (
            <article className="membership-record" key={m.id}>
              <div>
                <h3>
                  {String(m.name)} · {m.plan_snapshot?.name ?? m.plan_name}
                </h3>
                <p>
                  {String(m.email)} · {m.effective_state} · {m.access_basis}
                </p>
                <p>
                  {m.starts_at
                    ? new Date(m.starts_at).toISOString().slice(0, 10)
                    : "No start date"}{" "}
                  →{" "}
                  {m.ends_at
                    ? new Date(m.ends_at).toISOString().slice(0, 10)
                    : "No end date"}{" "}
                  · {m.location_id ?? "Digital access"}
                </p>
              </div>
              <div className="membership-record-actions">
                {m.effective_state !== "ended" && (
                  <>
                    {m.status === "active" && (
                      <button
                        className="button button-outline"
                        disabled={busy}
                        onClick={() =>
                          act("change", {
                            id: m.id,
                            revision: m.revision,
                            action: "pause",
                          })
                        }
                      >
                        Pause access
                      </button>
                    )}
                    {m.status === "paused" && (
                      <button
                        className="button button-outline"
                        disabled={busy}
                        onClick={() =>
                          act("change", {
                            id: m.id,
                            revision: m.revision,
                            action: "resume",
                          })
                        }
                      >
                        Resume access
                      </button>
                    )}
                    <button
                      className="button button-outline"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm("End this member's access now?"))
                          void act("change", {
                            id: m.id,
                            revision: m.revision,
                            action: "end",
                          });
                      }}
                    >
                      End access
                    </button>
                  </>
                )}
              </div>
            </article>
          ))
        )}
      </section>
      <details className="studio-panel">
        <summary>Recorded activity</summary>
        {overview.events.length === 0 ? (
          <p>No membership activity yet.</p>
        ) : (
          <ul className="membership-audit">
            {overview.events.map((e, i) => (
              <li key={i}>
                {String(e.event).replaceAll(".", " · ")}
                <span>
                  {String(e.actor_name)} ·{" "}
                  {new Date(String(e.created_at)).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </details>
      <nav aria-label="Membership records pages" className="member-foot">
        {overview.page > 0 && (
          <Link href={`/studio/memberships?page=${overview.page - 1}`}>
            Previous records
          </Link>
        )}
        {[overview.requests, overview.members, overview.events].some(
          (rows) => rows.length === 25,
        ) && (
          <Link href={`/studio/memberships?page=${overview.page + 1}`}>
            Next records
          </Link>
        )}
      </nav>
    </>
  );
}
