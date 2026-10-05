"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type {
  operationOverview,
  Provider,
  ManagedService,
  OperationProposal,
} from "@/lib/studio-operations";
type Data = Awaited<ReturnType<typeof operationOverview>>;
type Editor =
  | { kind: "provider"; record?: Provider }
  | { kind: "service"; record?: ManagedService };
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
function format(key: string, value: unknown): string {
  if (value === undefined || value === null) return "Not configured";
  if (key === "price") return money(Number(value));
  if (key === "enabled")
    return value ? "Open for booking" : "Closed for new bookings";
  if (key === "weekdays")
    return (value as number[]).map((d) => days[d - 1]).join(" · ");
  if (key.endsWith("hour")) return `${String(value).padStart(2, "0")}:00 CT`;
  if (key === "minutes" || key === "buffer") return `${value} min`;
  return String(value);
}
function ProposalReview({
  proposal,
  owner,
  actorId,
  busy,
  onAction,
}: {
  proposal: OperationProposal;
  owner: boolean;
  actorId: string;
  busy: boolean;
  onAction: (
    id: string,
    action: "apply" | "dismiss",
    acknowledge?: boolean,
  ) => void;
}) {
  const [acknowledge, setAcknowledge] = useState(false);
  const fields =
    proposal.kind === "provider"
      ? ["name", "enabled", "open_hour", "close_hour", "weekdays"]
      : ["name", "description", "minutes", "buffer", "price", "enabled"];
  const labels: Record<string, string> = {
    name: "Name",
    description: "Description",
    minutes: "Duration",
    buffer: "Buffer",
    price: "Price",
    enabled: "Booking",
    open_hour: "Opens",
    close_hour: "Closes",
    weekdays: "Working days",
  };
  return (
    <article className="operation-proposal">
      <div className="studio-section-head">
        <div>
          <p className="eyebrow">
            {proposal.kind === "provider" ? "AVAILABILITY" : "SERVICE MENU"} ·{" "}
            {proposal.provider_id}
          </p>
          <h2>{proposal.payload.name}</h2>
        </div>
        <small>From {proposal.creator_name}</small>
      </div>
      <div className="operation-diff">
        <table>
          <caption>Review the exact change before applying</caption>
          <thead>
            <tr>
              <th>Setting</th>
              <th>Current at proposal</th>
              <th>Proposed</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((key) => (
              <tr key={key}>
                <th scope="row">{labels[key]}</th>
                <td>{format(key, proposal.baseline?.[key])}</td>
                <td>
                  {format(
                    key,
                    (proposal.payload as Record<string, unknown>)[key],
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {proposal.affected_visits ? (
        <div className="operation-impact">
          <p>
            {proposal.affected_visits} upcoming confirmed visits are affected by
            this setting change. Existing visits keep their recorded time,
            duration and price.
          </p>
          {owner ? (
            <label>
              <input
                type="checkbox"
                checked={acknowledge}
                onChange={(e) => setAcknowledge(e.target.checked)}
              />{" "}
              I’ve reviewed existing visits and will handle any service or hours
              conflict directly.
            </label>
          ) : null}
          <Link className="studio-inline" href="/studio/schedule">
            Review schedule ↗
          </Link>
        </div>
      ) : null}
      <div className="studio-controls">
        {owner ? (
          <button
            className="button button-gold"
            disabled={busy || (!!proposal.affected_visits && !acknowledge)}
            onClick={() => onAction(proposal.id, "apply", acknowledge)}
          >
            Approve and apply
          </button>
        ) : (
          <span className="studio-muted">Waiting for Neil’s approval.</span>
        )}
        {owner || proposal.created_by === actorId ? (
          <button
            className="button button-outline"
            disabled={busy}
            onClick={() => onAction(proposal.id, "dismiss")}
          >
            Dismiss proposal
          </button>
        ) : null}
      </div>
    </article>
  );
}
export function StudioOperations({
  initial,
  actorId,
  initialView = "menu",
}: {
  initial: Data;
  actorId: string;
  initialView?: string;
}) {
  const [data, setData] = useState(initial),
    [view, setView] = useState(initialView),
    [editor, setEditor] = useState<Editor | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (editor) dialog.current?.showModal();
    else dialog.current?.close();
  }, [editor]);
  async function refresh(page = 0, append = false) {
    const response = await fetch(`/api/studio/operations?page=${page}`);
    const result = await response.json();
    if (!response.ok) throw Error(result.error);
    setData((old) =>
      append
        ? { ...result, proposals: [...old.proposals, ...result.proposals] }
        : result,
    );
  }
  function edit(next: Editor) {
    setError("");
    setNotice("");
    setEditor(next);
  }
  async function propose(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editor || busy) return;
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget),
      record = editor.record;
    try {
      let input: Record<string, unknown> = {
        kind: editor.kind,
        provider_id:
          editor.kind === "provider"
            ? record?.id || f.get("provider_id")
            : record?.provider_id || f.get("provider_id"),
        target_revision: record?.revision || 0,
        name: f.get("name"),
        enabled: f.get("enabled") === "on",
      };
      if (editor.kind === "provider")
        input = {
          ...input,
          open_hour: Number(f.get("open_hour")),
          close_hour: Number(f.get("close_hour")),
          weekdays: f.getAll("weekdays").map(Number),
        };
      else {
        const price = String(f.get("price") || "");
        if (!/^\d+(\.\d{1,2})?$/.test(price))
          throw Error(
            "Enter a dollar price with no more than two decimal places.",
          );
        const [whole, fraction = ""] = price.split(".");
        input = {
          ...input,
          ...(record ? { service_id: record.id } : {}),
          description: f.get("description"),
          minutes: Number(f.get("minutes")),
          buffer: Number(f.get("buffer")),
          price: Number(whole) * 100 + Number(fraction.padEnd(2, "0")),
        };
      }
      const response = await fetch("/api/studio/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      await refresh();
      setEditor(null);
      setView("review");
      setNotice(
        "Proposal saved. Booking settings change only after Neil approves and applies it.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the proposal.");
    } finally {
      setBusy(false);
    }
  }
  async function action(
    id: string,
    action: "apply" | "dismiss",
    acknowledge = false,
  ) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/studio/operations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, acknowledge }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      await refresh();
      setNotice(
        action === "apply"
          ? "Approved settings applied. Existing visits were preserved."
          : "Proposal dismissed.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not apply the change.");
    } finally {
      setBusy(false);
    }
  }
  const provider = editor?.kind === "provider" ? editor.record : undefined,
    service = editor?.kind === "service" ? editor.record : undefined;
  return (
    <div className="operations-world">
      <header className="command-heading">
        <p className="eyebrow">
          {data.owner ? "RESERVE OPERATIONS" : "YOUR SERVICE OPERATION"}
        </p>
        <h1>
          Ready to <em>operate.</em>
        </h1>
        <p className="studio-muted">
          The menu, the time, and the decisions that open the doors.
        </p>
      </header>
      <div className="operation-navigation" aria-label="Operating views">
        {[
          ["menu", "Service menu"],
          ["availability", "Availability"],
          ["review", "Review changes"],
        ].map(([key, label]) => (
          <button
            key={key}
            aria-pressed={view === key}
            onClick={() => {
              setView(key);
              setError("");
            }}
          >
            {label}
            {key === "review" && data.proposals.length
              ? ` · ${data.proposals.length}${data.hasMore ? "+" : ""}`
              : ""}
          </button>
        ))}
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Could not refresh.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Refresh
        </button>
      </div>
      {!editor && error ? (
        <p className="studio-error" role="alert">
          {error}
        </p>
      ) : null}
      <p className="studio-notice" role="status">
        {notice}
      </p>
      {view === "menu" ? (
        <section className="operation-view">
          <div className="studio-section-head">
            <p className="eyebrow">THE SERVICE MENU</p>
            {data.canPropose ? (
              <button
                className="button button-gold"
                disabled={!data.providers.length}
                onClick={() => edit({ kind: "service" })}
              >
                Propose a service
              </button>
            ) : null}
          </div>
          {data.services.map((s) => (
            <div key={s.id} className="operation-service">
              <div>
                <small>
                  {data.providers.find((p) => p.id === s.provider_id)?.name ||
                    s.provider_id}{" "}
                  · {s.enabled ? "Enabled" : "Closed"}
                </small>
                <h2>{s.name}</h2>
                <p>{s.description}</p>
                <span>
                  {money(s.price)} · {s.minutes} min · {s.buffer} min buffer
                </span>
              </div>
              {data.canPropose ? (
                <button
                  className="button button-outline"
                  onClick={() => edit({ kind: "service", record: s })}
                >
                  Propose changes
                </button>
              ) : null}
            </div>
          ))}
          {!data.services.length ? (
            <div className="operation-empty">
              <h2>Start with the actual menu.</h2>
              <p>
                {data.providers.length
                  ? "Enter the service names, prices, durations and buffers you approve."
                  : "Approve a closed provider setup in Availability first, then add the service menu."}
              </p>
            </div>
          ) : null}
          <p className="studio-muted">
            A service is bookable only when both the service and its provider
            are enabled. Prices here are service prices, not collected revenue.
          </p>
        </section>
      ) : null}
      {view === "availability" ? (
        <section className="operation-view">
          <div className="studio-section-head">
            <p className="eyebrow">WORKING HOURS · CENTRAL TIME</p>
            {data.owner ? (
              <button
                className="button button-gold"
                onClick={() => edit({ kind: "provider" })}
              >
                Propose provider setup
              </button>
            ) : null}
          </div>
          {data.providers.map((p) => (
            <div key={p.id} className="operation-service">
              <div>
                <small>
                  {p.enabled
                    ? "OPEN FOR NEW BOOKINGS"
                    : "CLOSED FOR NEW BOOKINGS"}{" "}
                  · REV {p.revision}
                </small>
                <h2>{p.name}</h2>
                <p>
                  {p.weekdays.map((d) => days[d - 1]).join(" · ")}
                  <br />
                  {format("open_hour", p.open_hour)} —{" "}
                  {format("close_hour", p.close_hour)}
                </p>
              </div>
              {data.canPropose ? (
                <button
                  className="button button-outline"
                  onClick={() => edit({ kind: "provider", record: p })}
                >
                  Propose hours
                </button>
              ) : null}
            </div>
          ))}
          {!data.providers.length ? (
            <div className="operation-empty">
              <h2>Before the first working day.</h2>
              <p>
                Enter a verified provider name and the actual working days and
                hours. Start closed, then approve the service menu before
                opening booking.
              </p>
            </div>
          ) : null}
          <Link className="studio-inline" href="/studio/schedule#availability">
            Manage one-day time blocks ↗
          </Link>
          <p className="studio-muted">
            This phase uses one same-day opening interval per working day, with
            whole-hour boundaries. Existing visits are never moved or cancelled
            by a settings change.
          </p>
        </section>
      ) : null}
      {view === "review" ? (
        <section className="operation-view">
          {data.proposals.map((p) => (
            <ProposalReview
              key={p.id}
              proposal={p}
              owner={data.owner}
              actorId={actorId}
              busy={busy}
              onAction={action}
            />
          ))}
          {!data.proposals.length ? (
            <div className="operation-empty">
              <h2>No changes waiting.</h2>
              <p>
                New service and hours proposals arrive here for Neil to review.
              </p>
            </div>
          ) : null}
          {data.hasMore ? (
            <button
              className="button button-outline"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await refresh(data.page + 1, true);
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "Could not load changes.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              More proposals
            </button>
          ) : null}
        </section>
      ) : null}
      <dialog
        ref={dialog}
        className="studio-work-dialog operation-editor"
        onCancel={(e) => {
          if (busy) e.preventDefault();
          else setEditor(null);
        }}
      >
        <div className="studio-dialog-head">
          <span>
            {editor?.kind === "service"
              ? "SERVICE PROPOSAL"
              : "PROVIDER & HOURS PROPOSAL"}
          </span>
          <button
            aria-label="Close proposal"
            disabled={busy}
            onClick={() => setEditor(null)}
          >
            ✕
          </button>
        </div>
        {editor ? (
          <form
            key={`${editor.kind}-${editor.record?.id || "new"}`}
            onSubmit={propose}
          >
            <p className="studio-muted">
              Save a proposal for review. Nothing changes in booking until Neil
              approves and applies it.
            </p>
            {editor.kind === "provider" ? (
              <label>
                Provider identifier
                <input
                  name="provider_id"
                  required
                  pattern="[a-z0-9-]+"
                  maxLength={80}
                  defaultValue={provider?.id}
                  disabled={busy || !!provider}
                  placeholder="Assigned provider identifier"
                />
              </label>
            ) : (
              <label>
                Provider
                <select
                  name="provider_id"
                  defaultValue={service?.provider_id || data.providers[0]?.id}
                  disabled={busy || !!service}
                >
                  {data.providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              {editor.kind === "service" ? "Service name" : "Provider name"}
              <input
                name="name"
                required
                maxLength={editor.kind === "service" ? 90 : 80}
                defaultValue={editor.record?.name}
                disabled={busy}
              />
            </label>
            {editor.kind === "service" ? (
              <>
                <label>
                  Service description
                  <textarea
                    name="description"
                    required
                    maxLength={600}
                    rows={3}
                    defaultValue={service?.description}
                    disabled={busy}
                  />
                </label>
                <div className="studio-form-grid">
                  <label>
                    Duration (minutes)
                    <input
                      type="number"
                      name="minutes"
                      required
                      min={15}
                      max={480}
                      step={15}
                      defaultValue={service?.minutes}
                      disabled={busy}
                    />
                  </label>
                  <label>
                    Buffer (minutes)
                    <input
                      type="number"
                      name="buffer"
                      required
                      min={0}
                      max={120}
                      step={15}
                      defaultValue={service?.buffer}
                      disabled={busy}
                    />
                  </label>
                </div>
                <label>
                  Service price (USD)
                  <input
                    type="number"
                    name="price"
                    required
                    min={0}
                    max={10000}
                    step="0.01"
                    defaultValue={
                      service ? String(service.price / 100) : undefined
                    }
                    disabled={busy}
                  />
                </label>
                <p className="studio-muted">
                  Duration and buffer use 15-minute steps. The full appointment
                  plus buffer must fit inside working hours.
                </p>
              </>
            ) : (
              <>
                <fieldset>
                  <legend>Working days</legend>
                  <div className="operation-days">
                    {days.map((day, i) => (
                      <label key={day}>
                        <input
                          type="checkbox"
                          name="weekdays"
                          value={i + 1}
                          defaultChecked={provider?.weekdays.includes(i + 1)}
                          disabled={busy}
                        />
                        {day}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="studio-form-grid">
                  <label>
                    Opening hour (CT)
                    <select
                      name="open_hour"
                      required
                      defaultValue={provider?.open_hour ?? ""}
                      disabled={busy}
                    >
                      <option value="" disabled>
                        Choose hour
                      </option>
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {format("open_hour", i)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Closing hour (CT)
                    <select
                      name="close_hour"
                      required
                      defaultValue={provider?.close_hour ?? ""}
                      disabled={busy}
                    >
                      <option value="" disabled>
                        Choose hour
                      </option>
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {format("close_hour", i + 1)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </>
            )}
            <label className="operation-toggle">
              <input
                type="checkbox"
                name="enabled"
                defaultChecked={editor.record?.enabled || false}
                disabled={busy}
              />
              {editor.kind === "service"
                ? "Enable this service for new bookings"
                : "Open this provider for new bookings"}
            </label>
            {error ? (
              <p className="studio-error" role="alert">
                {error}
              </p>
            ) : null}
            <button className="button button-gold" disabled={busy}>
              {busy ? "Saving…" : "Save proposal"}
            </button>
          </form>
        ) : null}
      </dialog>
    </div>
  );
}
