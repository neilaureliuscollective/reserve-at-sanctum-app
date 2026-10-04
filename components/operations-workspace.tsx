"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { DateTime } from "luxon";
import Link from "next/link";
import type { Appointment, Service, Actor } from "@/lib/booking";
import type { Customer } from "@/domains/customers";
import type { Row } from "@/lib/db";
import { ChairStudio } from "./chair-studio";
import { permitted } from "@/domains/access";
import "./operations-workspace.css";
type Location = { id: string; name: string; timezone: string };
type Config = {
  location: Row;
  providers: Row[];
  services: Row[];
  hours: Row[];
  resources: Row[];
  access: Row[];
  canManage: boolean;
  canGrant: boolean;
};
async function api<T>(path: string, input?: unknown): Promise<T> {
  const r = await fetch(
    path,
    input
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }
      : { cache: "no-store" },
  );
  const d = await r.json();
  if (!r.ok) throw Error(d.error || "Unable to complete this action.");
  return d;
}
const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n / 100,
  );
export function OperationsWorkspace({
  actor,
  preview,
}: {
  actor: Actor;
  preview: boolean;
}) {
  const [locations, setLocations] = useState<Location[]>([]),
    [locationId, setLocation] = useState(""),
    [config, setConfig] = useState<Config | null>(null),
    [day, setDay] = useState(""),
    [visits, setVisits] = useState<Appointment[]>([]),
    [tab, setTab] = useState("today"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [providerId, setProvider] = useState(""),
    [customers, setCustomers] = useState<Customer[]>([]),
    [customerId, setCustomer] = useState(""),
    [serviceId, setService] = useState(""),
    [slots, setSlots] = useState<{ start: string; label: string }[]>([]),
    [start, setStart] = useState(""),
    [deliveries, setDeliveries] = useState<Row[]>([]),
    [collections, setCollections] = useState<Row[]>([]);
  const requestKey = useRef("");
  const context = useRef({ locationId, day });
  context.current = { locationId, day };
  const location = locations.find((l) => l.id === locationId);
  const reload = useCallback(async () => {
    if (!locationId || !day) return;
    const [c, v] = await Promise.all([
      api<Config>(
        `/api/configuration?location=${encodeURIComponent(locationId)}`,
      ),
      api<{ visits: Appointment[] }>(
        `/api/appointments?studio=true&location=${encodeURIComponent(locationId)}&date=${day}`,
      ),
    ]);
    if (
      context.current.locationId !== locationId ||
      context.current.day !== day
    )
      return;
    setConfig(c);
    setVisits(
      v.visits.sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at)),
    );
  }, [locationId, day]);
  useEffect(() => {
    const abort = new AbortController();
    fetch("/api/configuration", { signal: abort.signal })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw Error(d.error);
        setLocations(d.locations);
        const first = d.locations[0];
        if (first) {
          setLocation(first.id);
          setDay(DateTime.now().setZone(first.timezone).toISODate()!);
        }
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    requestKey.current = crypto.randomUUID();
    return () => abort.abort();
  }, []);
  useEffect(() => {
    let live = true;
    reload().catch((e) => {
      if (live) setError(e.message);
    });
    return () => {
      live = false;
    };
  }, [reload]);
  useEffect(() => {
    if (!config) return;
    setProvider(
      String(
        config.providers.find((p) =>
          permitted(actor, "schedule", locationId, String(p.id)),
        )?.id || "",
      ),
    );
    setService("");
    setCustomer("");
    setCustomers([]);
    setStart("");
  }, [locationId, config?.providers.length, actor]);
  useEffect(() => {
    if (!serviceId || !day) {
      setSlots([]);
      return;
    }
    const abort = new AbortController();
    fetch(
      `/api/availability?service=${encodeURIComponent(serviceId)}&date=${day}`,
      { signal: abort.signal },
    )
      .then((r) => r.json())
      .then((d) => {
        setSlots(d.slots || []);
        if (d.error) setError(d.error);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => abort.abort();
  }, [serviceId, day]);
  async function action(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      await reload();
      const list = await api<{ locations: Location[] }>("/api/configuration");
      setLocations(list.locations);
      setNotice((current) => current || "Saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }
  async function transition(a: Appointment, action: string) {
    await actionRequest(`/api/appointments/${a.id}`, {
      action,
      revision: a.revision,
    });
  }
  async function actionRequest(path: string, input: unknown) {
    return action(async () => {
      const r = await fetch(path, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
    });
  }
  async function search(form: FormData) {
    const d = await api<{ customers: Customer[] }>(
      `/api/customers?location=${locationId}&provider=${providerId}&q=${encodeURIComponent(String(form.get("q") || ""))}`,
    );
    setCustomers(d.customers);
  }
  async function loadRecovery() {
    const d = await api<{ deliveries: Row[] }>(
      `/api/communications?location=${locationId}`,
    );
    setDeliveries(d.deliveries);
  }
  async function loadCollections() {
    const d = await api<{ collections: Row[] }>(
      `/api/operations?location=${locationId}&date=${day}`,
    );
    setCollections(d.collections);
  }
  const services =
    config?.services.filter((s) => s.provider_id === providerId && s.enabled) ||
    [];
  return (
    <main id="main" className="ops">
      <header className="ops-heading">
        <p className="eyebrow">
          RESERVE / OPERATIONS {preview ? " · SYNTHETIC PREVIEW" : ""}
        </p>
        <h1>
          Your location. <em>In rhythm.</em>
        </h1>
        <p>{actor.name}</p>
        <div className="ops-context">
          <label>
            Location
            <select
              aria-label="Location"
              value={locationId}
              onChange={(e) => {
                const l = locations.find((l) => l.id === e.target.value)!;
                setLocation(l.id);
                setDay(DateTime.now().setZone(l.timezone).toISODate()!);
                setConfig(null);
                setVisits([]);
                setTab("today");
              }}
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Day
            <input
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            />
          </label>
          <span>{location?.timezone}</span>
        </div>
      </header>
      <nav className="ops-nav" aria-label="Operations">
        {[
          "today",
          "book",
          "availability",
          ...(config?.canManage ? ["location", "collections", "recovery"] : []),
          ...(actor.assignments?.some((a) => a.role === "provider")
            ? ["chair"]
            : []),
        ].map((t) => (
          <button
            key={t}
            aria-current={tab === t ? "page" : undefined}
            onClick={() => {
              setTab(t);
              setNotice("");
              setError("");
              if (t === "recovery")
                loadRecovery().catch((e) => setError(e.message));
              if (t === "collections")
                loadCollections().catch((e) => setError(e.message));
            }}
          >
            {t === "book" ? "Book for a guest" : t}
          </button>
        ))}
      </nav>
      {error && (
        <p role="alert" className="ops-alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {tab === "today" && (
        <section>
          <div className="ops-section-title">
            <h2>The day's visits</h2>
            <button onClick={() => reload().catch((e) => setError(e.message))}>
              Refresh
            </button>
          </div>
          {!visits.length && <p>No visits on this date.</p>}
          <div className="ops-visits">
            {visits.map((a) => (
              <article key={a.id}>
                <time>
                  {DateTime.fromJSDate(new Date(a.starts_at))
                    .setZone(location?.timezone)
                    .toFormat("h:mm a")}
                </time>
                <div>
                  <h3>{a.client_name}</h3>
                  <p>
                    {a.service_name} ·{" "}
                    {String(a.provider_name || a.snapshot.provider || "")} ·{" "}
                    {money(a.price)}
                  </p>
                  <p className="ops-status">{a.status.replace("_", " ")}</p>
                  {a.note && <p>Booking detail: {a.note}</p>}
                </div>
                <div className="ops-actions">
                  {a.status === "confirmed" && (
                    <>
                      <button
                        disabled={busy}
                        onClick={() => transition(a, "check_in")}
                      >
                        Arrived
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => transition(a, "no_show")}
                      >
                        No-show
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => transition(a, "cancel")}
                      >
                        Cancel visit
                      </button>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const value = String(
                            new FormData(e.currentTarget).get("start"),
                          );
                          const iso = DateTime.fromISO(value, {
                            zone: location?.timezone,
                          })
                            .toUTC()
                            .toISO();
                          actionRequest(`/api/appointments/${a.id}`, {
                            action: "reschedule",
                            revision: a.revision,
                            start: iso,
                          });
                        }}
                      >
                        <label>
                          New time
                          <input
                            name="start"
                            type="datetime-local"
                            step="900"
                            required
                          />
                        </label>
                        <button disabled={busy}>Reschedule</button>
                      </form>
                    </>
                  )}
                  {a.status === "checked_in" && (
                    <button
                      disabled={busy}
                      onClick={() => transition(a, "complete")}
                    >
                      Complete service
                    </button>
                  )}
                  {config?.canManage &&
                    a.status !== "cancelled" &&
                    a.status !== "no_show" && (
                      <details>
                        <summary>Record collection</summary>
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const f = new FormData(e.currentTarget);
                            const key = crypto.randomUUID();
                            action(() =>
                              api("/api/operations", {
                                action: "record",
                                appointmentId: a.id,
                                amount: Math.round(
                                  Number(f.get("amount")) * 100,
                                ),
                                method: f.get("method"),
                                reference: f.get("reference"),
                                requestKey: key,
                              }),
                            );
                          }}
                        >
                          <label>
                            Received ($)
                            <input
                              name="amount"
                              type="number"
                              step="0.01"
                              min="0.01"
                              required
                            />
                          </label>
                          <label>
                            Method
                            <select name="method">
                              <option value="cash">Cash</option>
                              <option value="external">External POS</option>
                            </select>
                          </label>
                          <label>
                            Receipt reference
                            <input name="reference" maxLength={160} />
                          </label>
                          <button disabled={busy}>Record receipt</button>
                        </form>
                      </details>
                    )}
                </div>
              </article>
            ))}
          </div>
          <p className="ops-help">
            Completion records the service outcome. Collections are reconciled
            separately. Up to 100 visits per day.
          </p>
        </section>
      )}
      {tab === "book" && (
        <section>
          <h2>Reserve for a guest</h2>
          <label>
            Provider
            <select
              aria-label="Provider"
              value={providerId}
              onChange={(e) => {
                setProvider(e.target.value);
                setCustomer("");
                setCustomers([]);
                setService("");
                setStart("");
              }}
            >
              {config?.providers
                .filter((p) =>
                  permitted(actor, "schedule", locationId, String(p.id)),
                )
                .map((p) => (
                  <option key={String(p.id)} value={String(p.id)}>
                    {String(p.name)}
                    {p.brand_name ? ` · ${p.brand_name}` : ""}
                  </option>
                ))}
            </select>
          </label>
          <form
            className="ops-inline"
            onSubmit={(e) => {
              e.preventDefault();
              search(new FormData(e.currentTarget)).catch((e) =>
                setError(e.message),
              );
            }}
          >
            <label>
              Find a customer
              <input name="q" maxLength={100} />
            </label>
            <button>Search</button>
          </form>
          <label>
            Customer
            <select
              aria-label="Customer"
              value={customerId}
              onChange={(e) => {
                setCustomer(e.target.value);
                requestKey.current = crypto.randomUUID();
              }}
            >
              <option value="">Choose a customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.email || c.phone}
                </option>
              ))}
            </select>
          </label>
          <details>
            <summary>Add a guest</summary>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                action(async () => {
                  const d = await api<{ customer: Customer }>(
                    "/api/customers",
                    {
                      locationId,
                      providerId,
                      name: f.get("name"),
                      email: f.get("email"),
                      phone: f.get("phone"),
                    },
                  );
                  setCustomers((c) => [d.customer, ...c]);
                  setCustomer(d.customer.id);
                  requestKey.current = crypto.randomUUID();
                });
              }}
            >
              <label>
                Name
                <input name="name" required maxLength={100} />
              </label>
              <label>
                Email
                <input name="email" type="email" />
              </label>
              <label>
                Phone
                <input name="phone" type="tel" maxLength={40} />
              </label>
              <button disabled={busy}>Create guest</button>
            </form>
          </details>
          <label>
            Service
            <select
              aria-label="Service"
              value={serviceId}
              onChange={(e) => {
                setService(e.target.value);
                setStart("");
                requestKey.current = crypto.randomUUID();
              }}
            >
              <option value="">Choose service</option>
              {services.map((s) => (
                <option key={String(s.id)} value={String(s.id)}>
                  {String(s.name)} · {money(Number(s.price))}
                </option>
              ))}
            </select>
          </label>
          <label>
            Available time
            <select
              aria-label="Available time"
              value={start}
              onChange={(e) => {
                setStart(e.target.value);
                requestKey.current = crypto.randomUUID();
              }}
            >
              <option value="">Choose time</option>
              {slots.map((s) => (
                <option key={s.start} value={s.start}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <button
            disabled={busy || !customerId || !start}
            onClick={() =>
              action(async () => {
                await api("/api/appointments", {
                  serviceId,
                  start,
                  customerId,
                  note: "",
                  requestKey: requestKey.current,
                });
                requestKey.current = crypto.randomUUID();
                setStart("");
                setTab("today");
              })
            }
          >
            Reserve visit
          </button>
          {config?.canManage && customerId && (
            <button
              disabled={busy}
              onClick={() =>
                action(async () => {
                  const d = await api<{ url: string }>("/api/customers/claim", {
                    action: "invite",
                    locationId,
                    customerId,
                  });
                  await navigator.clipboard.writeText(d.url);
                  setNotice(
                    "Private invitation copied. Share it only with the guest using their verified email.",
                  );
                })
              }
            >
              Copy private account invitation
            </button>
          )}
        </section>
      )}
      {tab === "availability" && config && (
        <section>
          <h2>Working time</h2>
          <ConfigurationForm
            config={config}
            locationId={locationId}
            actor={actor}
            onlyHours
            onSave={(input) => action(() => api("/api/configuration", input))}
          />
          <details>
            <summary>Block time</summary>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                action(() =>
                  api("/api/studio/blocks", {
                    locationId,
                    providerId: String(f.get("providerId")),
                    date: day,
                    start: f.get("start"),
                    end: f.get("end"),
                  }),
                );
              }}
            >
              <label>
                Provider
                <select name="providerId">
                  {config.providers
                    .filter((p) =>
                      permitted(actor, "schedule", locationId, String(p.id)),
                    )
                    .map((p) => (
                      <option key={String(p.id)} value={String(p.id)}>
                        {String(p.name)}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                From
                <input name="start" type="time" step="900" required />
              </label>
              <label>
                Until
                <input name="end" type="time" step="900" required />
              </label>
              <button disabled={busy}>Block on {day}</button>
            </form>
            <BlockList
              locationId={locationId}
              providerId={providerId}
              onError={setError}
            />
          </details>
        </section>
      )}
      {tab === "location" && config && (
        <section>
          <h2>Location configuration</h2>
          <p>
            {String(config.location.status)} · booking{" "}
            {config.location.booking_enabled ? "enabled" : "closed"} · revision{" "}
            {String(config.location.revision)}
          </p>
          <ConfigurationForm
            config={config}
            actor={actor}
            locationId={locationId}
            onSave={(input) => action(() => api("/api/configuration", input))}
          />
          <details>
            <summary>Current configuration</summary>
            <h3>Offerings</h3>
            {config.services.map((s) => (
              <p key={String(s.id)}>
                {String(s.name)} · {s.enabled ? "enabled" : "disabled"} ·{" "}
                {money(Number(s.price))} · revision {String(s.revision)}
              </p>
            ))}
            <h3>Hours</h3>
            {config.hours.map((h) => (
              <p key={String(h.id)}>
                {String(h.provider_id || "Location")} ·{" "}
                {h.day ? String(h.day).slice(0, 10) : `weekday ${h.weekday}`} ·{" "}
                {h.closed
                  ? "closed"
                  : `${Number(h.start_minute) / 60}–${Number(h.end_minute) / 60}`}
              </p>
            ))}
          </details>
        </section>
      )}
      {tab === "collections" && (
        <section>
          <h2>Daily receipt reconciliation</h2>
          <p>
            Recorded collections:{" "}
            {money(
              collections
                .filter((c) => !c.reversed_by)
                .reduce((sum, c) => sum + Number(c.amount), 0),
            )}
            . External receipts require reconciliation with the actual POS;
            Reserve does not process these payments.
          </p>
          <button
            onClick={() => loadCollections().catch((e) => setError(e.message))}
          >
            Refresh receipts
          </button>
          {collections.map((c) => (
            <article className="ops-receipt" key={String(c.id)}>
              <p>
                {money(Number(c.amount))} · {String(c.method)} ·{" "}
                {String(c.reference || "Cash receipt")} ·{" "}
                {String(c.recorder_name)}
              </p>
              {c.reversed_by ? (
                <p>Reversed: {String(c.reversal_reason)}</p>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const reason = String(
                      new FormData(e.currentTarget).get("reason"),
                    );
                    action(async () => {
                      await api("/api/operations", {
                        action: "reverse",
                        id: c.id,
                        reason,
                      });
                      await loadCollections();
                    });
                  }}
                >
                  <label>
                    Reversal reason
                    <input name="reason" required maxLength={160} />
                  </label>
                  <button disabled={busy}>Reverse record</button>
                </form>
              )}
            </article>
          ))}
        </section>
      )}
      {tab === "recovery" && (
        <section>
          <h2>Communication recovery</h2>
          <p>
            Delivery requires a configured sender and scheduled worker.
            Missing-email records require direct guest follow-up.
          </p>
          <button
            onClick={() => loadRecovery().catch((e) => setError(e.message))}
          >
            Refresh deliveries
          </button>
          {!deliveries.length && <p>No pending or failed deliveries.</p>}
          {deliveries.map((d) => (
            <article className="ops-receipt" key={String(d.id)}>
              <p>
                {String(d.customer_name)} · {String(d.kind)} · {String(d.state)}{" "}
                · attempt {String(d.attempts)}
              </p>
              {Boolean(d.error_code) && (
                <p>{String(d.error_code).replaceAll("_", " ")}</p>
              )}
              {["failed", "manual"].includes(String(d.state)) && (
                <button
                  disabled={busy}
                  onClick={() =>
                    action(async () => {
                      await api("/api/communications", { id: d.id });
                      await loadRecovery();
                    })
                  }
                >
                  Retry delivery
                </button>
              )}
            </article>
          ))}
        </section>
      )}
      {tab === "chair" && <ChairStudio />}
      <footer className="ops-footer">
        <Link href="/account">Your account</Link>
        <Link href="/">Reserve experience</Link>
        {actor.assignments?.some((a) => a.role === "owner") && (
          <Link href="/studio/build-room">Build Room</Link>
        )}
      </footer>
    </main>
  );
}
function BlockList({
  locationId,
  providerId,
  onError,
}: {
  locationId: string;
  providerId: string;
  onError: (s: string) => void;
}) {
  const [blocks, setBlocks] = useState<Row[]>([]);
  const load = useCallback(
    () =>
      api<{ blocks: Row[] }>(
        `/api/studio/blocks?location=${locationId}&provider=${providerId}`,
      ).then((d) => setBlocks(d.blocks)),
    [locationId, providerId],
  );
  useEffect(() => {
    load().catch((e) => onError(e.message));
  }, [load, onError]);
  return (
    <div>
      <button onClick={() => load().catch((e) => onError(e.message))}>
        Refresh blocks
      </button>
      {blocks.map((b) => (
        <p key={String(b.id)}>
          {new Date(String(b.starts_at)).toLocaleString()}{" "}
          <button
            onClick={async () => {
              try {
                const r = await fetch("/api/studio/blocks", {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: b.id }),
                });
                const d = await r.json();
                if (!r.ok) throw Error(d.error);
                await load();
              } catch (e) {
                onError(
                  e instanceof Error ? e.message : "Unable to remove block.",
                );
              }
            }}
          >
            Remove block
          </button>
        </p>
      ))}
    </div>
  );
}
function ConfigurationForm({
  config,
  locationId,
  actor,
  onlyHours = false,
  onSave,
}: {
  config: Config;
  locationId: string;
  actor: Actor;
  onlyHours?: boolean;
  onSave: (input: unknown) => void;
}) {
  const [kind, setKind] = useState(onlyHours ? "hours" : "location"),
    [edit, setEdit] = useState("");
  const selected =
    kind === "service"
      ? config.services.find((s) => s.id === edit)
      : kind === "provider"
        ? config.providers.find((p) => p.id === edit)
        : kind === "resource"
          ? config.resources.find((r) => r.id === edit)
          : kind === "location"
            ? config.location
            : undefined;
  const modes = onlyHours
    ? ["hours"]
    : [
        "location",
        "provider",
        "service",
        "resource",
        ...(config.canGrant ? ["access", "new location"] : []),
      ];
  const text = (
    name: string,
    label: string,
    initial: unknown = "",
    type = "text",
    required = true,
  ) => (
    <label>
      {label}
      <input
        name={name}
        type={type}
        defaultValue={String(initial ?? "")}
        required={required}
        maxLength={name === "policy" ? 1000 : 300}
        step={type === "number" ? "1" : undefined}
      />
    </label>
  );
  const provider = (
    <label>
      Provider
      <select
        name="providerId"
        defaultValue={String(selected?.provider_id || "")}
      >
        {kind === "hours" && config.canManage && (
          <option value="">Location hours</option>
        )}
        {config.providers
          .filter(
            (p) =>
              kind !== "hours" ||
              permitted(actor, "schedule", locationId, String(p.id)),
          )
          .map((p) => (
            <option key={String(p.id)} value={String(p.id)}>
              {String(p.name)}
            </option>
          ))}
      </select>
    </label>
  );
  return (
    <>
      <label>
        Configure
        <select
          aria-label="Configure"
          value={kind}
          onChange={(e) => {
            setKind(e.target.value);
            setEdit("");
          }}
        >
          {modes.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </label>
      {["provider", "service", "resource"].includes(kind) && (
        <label>
          Edit
          <select
            aria-label="Edit"
            value={edit}
            onChange={(e) => setEdit(e.target.value)}
          >
            <option value="">Create new</option>
            {(kind === "provider"
              ? config.providers
              : kind === "service"
                ? config.services
                : config.resources
            ).map((r) => (
              <option key={String(r.id)} value={String(r.id)}>
                {String(r.name)}
              </option>
            ))}
          </select>
        </label>
      )}
      <form
        key={`${kind}:${edit}:${config.location.revision}:${selected?.revision}`}
        className="ops-config"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const str = (n: string) => String(f.get(n) || "");
          const num = (n: string) => Number(f.get(n));
          let input: Record<string, unknown> = { action: kind, locationId };
          if (kind === "location" || kind === "new location") {
            input = {
              action: "location",
              ...(kind === "location" ? { id: locationId } : {}),
              name: str("name"),
              slug: str("slug"),
              timezone: str("timezone"),
              address: str("address"),
              contact: str("contact"),
              policy: str("policy"),
              status: str("status"),
              booking_enabled: f.has("enabled"),
              notice_minutes: num("notice"),
              horizon_days: num("horizon"),
              cancellation_minutes: num("cancellation"),
              revision:
                kind === "location" ? Number(config.location.revision) : 0,
            };
          } else if (kind === "provider") {
            input = {
              ...input,
              ...(edit ? { id: edit } : {}),
              name: str("name"),
              slug: str("slug"),
              brand: str("brand"),
              enabled: f.has("enabled"),
            };
          } else if (kind === "service") {
            input = {
              ...input,
              ...(edit ? { id: edit } : {}),
              providerId: str("providerId"),
              name: str("name"),
              description: str("description"),
              minutes: num("minutes"),
              buffer: num("buffer"),
              price: Math.round(num("price") * 100),
              enabled: f.has("enabled"),
              resourceId: str("resourceId") || null,
              revision: Number(selected?.revision || 0),
            };
          } else if (kind === "hours") {
            const closed = f.has("closed");
            input = {
              ...input,
              providerId: str("providerId") || null,
              weekday: str("day") ? null : num("weekday"),
              day: str("day") || null,
              closed,
              intervals: closed
                ? []
                : [{ start: num("start"), end: num("end") }],
            };
          } else if (kind === "resource") {
            input = {
              ...input,
              ...(edit ? { id: edit } : {}),
              name: str("name"),
              enabled: f.has("enabled"),
            };
          } else {
            input = {
              ...input,
              userId: str("userId"),
              role: str("role"),
              providerId: str("providerId") || null,
              enabled: f.has("enabled"),
            };
          }
          onSave(input);
        }}
      >
        {(kind === "location" || kind === "new location") && (
          <>
            {text(
              "name",
              "Location name",
              kind === "location" ? selected?.name : "",
            )}
            {text(
              "slug",
              "URL slug",
              kind === "location" ? selected?.slug : "",
            )}
            {text(
              "timezone",
              "Timezone",
              kind === "location" ? selected?.timezone : "America/Chicago",
            )}
            {text(
              "address",
              "Approved address",
              selected?.address,
              "text",
              false,
            )}
            {text(
              "contact",
              "Approved contact",
              selected?.contact,
              "text",
              false,
            )}
            {text("policy", "Booking policy", selected?.policy, "text", false)}
            <label>
              Status
              <select
                aria-label="Status"
                name="status"
                defaultValue={String(selected?.status || "draft")}
              >
                <option>draft</option>
                <option>pilot</option>
                <option>live</option>
                <option>paused</option>
              </select>
            </label>
            {text(
              "notice",
              "Notice (minutes)",
              selected?.notice_minutes ?? 120,
              "number",
            )}
            {text(
              "horizon",
              "Booking horizon (days)",
              selected?.horizon_days ?? 45,
              "number",
            )}
            {text(
              "cancellation",
              "Customer change cutoff (minutes)",
              selected?.cancellation_minutes ?? 0,
              "number",
            )}
          </>
        )}
        {kind === "provider" && (
          <>
            {text("name", "Provider name", selected?.name)}
            {text("slug", "Provider URL slug", selected?.slug)}
            {text(
              "brand",
              "Optional provider brand",
              selected?.brand_name,
              "text",
              false,
            )}
          </>
        )}
        {kind === "service" && (
          <>
            {provider}
            {text("name", "Service name", selected?.name)}
            {text(
              "description",
              "Description",
              selected?.description,
              "text",
              false,
            )}
            {text(
              "minutes",
              "Service minutes (15-minute steps)",
              selected?.minutes ?? 45,
              "number",
            )}
            {text(
              "buffer",
              "Buffer minutes (15-minute steps)",
              selected?.buffer ?? 15,
              "number",
            )}
            <label>
              Approved price ($)
              <input
                type="number"
                name="price"
                step="0.01"
                min="0"
                required
                defaultValue={Number(selected?.price || 0) / 100}
              />
            </label>
            <label>
              Resource
              <select
                name="resourceId"
                defaultValue={String(selected?.resource_id || "")}
              >
                <option value="">No exclusive resource</option>
                {config.resources.map((r) => (
                  <option key={String(r.id)} value={String(r.id)}>
                    {String(r.name)}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        {kind === "hours" && (
          <>
            {provider}
            <label>
              Weekday
              <select name="weekday">
                {[
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                  "Sunday",
                ].map((d, i) => (
                  <option key={d} value={i + 1}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            {text("day", "Exception date (optional)", "", "date", false)}
            {text("start", "Start minute after midnight", 540, "number")}
            {text("end", "End minute after midnight", 1020, "number")}
            <label className="ops-check">
              <input type="checkbox" name="closed" />
              Closed day
            </label>
            <p>
              Intervals use 15-minute steps. Existing visits must remain inside
              the new hours.
            </p>
          </>
        )}
        {kind === "resource" &&
          text("name", "Chair or room name", selected?.name)}
        {kind === "access" && (
          <>
            {text("userId", "Verified account UUID")}
            <label>
              Role
              <select aria-label="Role" name="role">
                <option>manager</option>
                <option>provider</option>
                <option>reception</option>
              </select>
            </label>
            <label>
              Provider (provider role only)
              <select name="providerId">
                <option value="">None</option>
                {config.providers.map((p) => (
                  <option key={String(p.id)} value={String(p.id)}>
                    {String(p.name)}
                  </option>
                ))}
              </select>
            </label>
            <p>
              Only a verified account that has signed in can receive staff
              access. Uncheck enabled to revoke this assignment.
            </p>
            {config.access.map((a) => (
              <p key={String(a.id)}>
                {String(a.name)} · {String(a.user_id)} · {String(a.role)} ·{" "}
                {a.enabled ? "enabled" : "revoked"}
              </p>
            ))}
          </>
        )}
        {kind !== "hours" && (
          <label className="ops-check">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={Boolean(
                kind === "location"
                  ? selected?.booking_enabled
                  : (selected?.enabled ?? kind === "access"),
              )}
            />
            {kind === "location" || kind === "new location"
              ? "Enable booking"
              : "Enabled"}
          </label>
        )}
        <button>Save {kind}</button>
      </form>
    </>
  );
}
