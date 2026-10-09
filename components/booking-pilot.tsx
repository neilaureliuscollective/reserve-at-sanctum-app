"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { DateTime } from "luxon";
import { parseClientCsv } from "@/lib/client-csv";
type Provider = { id: string; name: string; enabled: boolean };
type Location = {
  id: string;
  name: string;
  timezone: string;
  address: string;
  enabled: boolean;
  booking_enabled: boolean;
};
type Service = {
  id: string;
  provider_id: string;
  name: string;
  price: number;
  minutes: number;
  buffer: number;
  enabled: boolean;
};
type Client = { id: string; name: string; email: string; phone: string };
type Setup = {
  providers: Provider[];
  locations: Location[];
  services: Service[];
  assignments: { provider_id: string; location_id: string }[];
  staff: { provider_id: string; count: number }[];
  owner: boolean;
};
async function request(path: string, body?: unknown, method = "POST") {
  const r = await fetch(path, {
    cache: "no-store",
    ...(body
      ? {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const d = await r.json();
  if (!r.ok) throw Error(d.error || "Unable to complete this action.");
  return d;
}
function useSetup(initial = "") {
  const [data, setData] = useState<Setup | null>(null),
    [provider, setProvider] = useState(initial),
    [error, setError] = useState("");
  useEffect(() => {
    request("/api/studio/pilot")
      .then((d) => {
        setData(d);
        if (!initial) setProvider(d.providers[0]?.id || "");
      })
      .catch((e) => setError(e.message));
  }, [initial]);
  return { data, provider, setProvider, error, setError };
}
function ProviderSelect({
  data,
  provider,
  onChange,
}: {
  data: Setup | null;
  provider: string;
  onChange: (v: string) => void;
}) {
  return (
    <label>
      Professional
      <select
        value={provider}
        onChange={(e) => onChange(e.target.value)}
        required
      >
        <option value="">Choose professional</option>
        {data?.providers.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </label>
  );
}
export function PilotAppointmentForm({ providerId }: { providerId: string }) {
  const { data, provider, setProvider, error, setError } = useSetup(providerId);
  const [open, setOpen] = useState(false),
    [clients, setClients] = useState<Client[]>([]),
    [clientId, setClientId] = useState(""),
    [serviceId, setServiceId] = useState(""),
    [locationId, setLocationId] = useState("eunice"),
    [date, setDate] = useState(
      DateTime.now().setZone("America/Chicago").toISODate()!,
    ),
    [slots, setSlots] = useState<{ start: string; label: string }[]>([]),
    [start, setStart] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [q, setQ] = useState("");
  const [key, setKey] = useState("");
  const zone =
    data?.locations.find((l) => l.id === locationId)?.timezone ||
    "America/Chicago";
  useEffect(() => {
    if (!provider) return;
    let active = true;
    request("/api/studio/pilot/clients?" + new URLSearchParams({ provider, q }))
      .then((d) => {
        if (active) setClients(d.clients);
      })
      .catch((e) => setError(e.message));
    return () => {
      active = false;
    };
  }, [provider, q, setError]);
  useEffect(() => {
    setStart("");
    setSlots([]);
    if (!serviceId || !provider) return;
    let active = true;
    request(
      "/api/studio/pilot/appointments?" +
        new URLSearchParams({
          provider,
          service: serviceId,
          date,
          location: locationId,
        }),
    )
      .then((d) => {
        if (active) setSlots(d.slots);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [serviceId, date, locationId, provider, setError]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const d = await request("/api/studio/pilot/appointments", {
        provider,
        clientId,
        serviceId,
        locationId,
        start,
        note: String(f.get("note") || ""),
        requestKey: key,
      });
      setMessage(
        "Appointment saved. Reference " +
          d.appointment.id.slice(0, 8) +
          ". Confirm the visit with your client.",
      );
      setOpen(false);
      window.dispatchEvent(new Event("booking-updated"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="pilot-panel">
      <div className="studio-section-head">
        <div>
          <p className="eyebrow">YOUR WORKING DAY</p>
          <h2>Appointments, handled.</h2>
        </div>
        <button
          className="button button-gold"
          onClick={() => {
            setOpen(!open);
            setKey(crypto.randomUUID());
          }}
        >
          Add appointment
        </button>
      </div>
      {message && <p role="status">{message}</p>}
      {error && (
        <p role="alert" className="studio-error">
          {error}
        </p>
      )}
      {open && (
        <form
          className="pilot-form"
          onSubmit={submit}
          onChange={() => setKey(crypto.randomUUID())}
        >
          <fieldset disabled={busy}>
            <legend>Book for a client</legend>
            <ProviderSelect
              data={data}
              provider={provider}
              onChange={(v) => {
                setProvider(v);
                setClientId("");
                setServiceId("");
              }}
            />
            <label>
              Find client
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Name, email or phone"
              />
            </label>
            <label>
              Client
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
              >
                <option value="">Choose client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <Link href="/studio/clients">Add a new client ↗</Link>
            <label>
              Service
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                required
              >
                <option value="">Choose service</option>
                {data?.services
                  .filter((s) => s.provider_id === provider && s.enabled)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {s.minutes} min · ${(s.price / 100).toFixed(2)}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Location
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
              >
                {data?.locations
                  .filter((l) =>
                    data.assignments.some(
                      (a) =>
                        a.provider_id === provider && a.location_id === l.id,
                    ),
                  )
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Date
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </label>
            <label>
              Available time · {zone}
              <select
                value={start}
                onChange={(e) => setStart(e.target.value)}
                required
              >
                <option value="">Choose time</option>
                {slots.map((s) => (
                  <option key={s.start} value={s.start}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Service note
              <textarea name="note" maxLength={600} />
            </label>
            <p>No payment or automated message is sent.</p>
            <button
              className="button button-gold"
              disabled={!start || !clientId || busy}
            >
              {busy ? "Saving…" : "Save appointment"}
            </button>
          </fieldset>
        </form>
      )}
    </section>
  );
}
export function PilotClients({ providerId }: { providerId: string }) {
  const { data, provider, setProvider, error, setError } = useSetup(providerId);
  const [clients, setClients] = useState<Client[]>([]),
    [page, setPage] = useState(0),
    [hasMore, setHasMore] = useState(false),
    [q, setQ] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [source, setSource] = useState(""),
    [csv, setCsv] = useState(""),
    [preview, setPreview] = useState<
      | {
          input: Record<string, unknown>;
          matches: Client[];
          batchDuplicate: boolean;
          alreadyImported: boolean;
        }[]
      | null
    >(null);
  async function refresh() {
    if (!provider) return;
    const d = await request(
      "/api/studio/pilot/clients?" +
        new URLSearchParams({ provider, q, page: String(page) }),
    );
    setClients(d.clients);
    setHasMore(d.hasMore);
  }
  useEffect(() => {
    void refresh().catch((e) => setError(e.message));
  }, [provider, q, page]);
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      f = new FormData(form);
    setBusy(true);
    setError("");
    // Store a retry key on the form; changing inputs resets it.
    const sourceKey = form.dataset.key || crypto.randomUUID();
    form.dataset.key = sourceKey;
    try {
      await request("/api/studio/pilot/clients", {
        provider,
        action: "create",
        client: {
          name: String(f.get("name")),
          email: String(f.get("email")),
          phone: String(f.get("phone")),
          sourceKey,
          allowDuplicate: f.get("allowDuplicate") === "on",
        },
      });
      form.reset();
      delete form.dataset.key;
      setMessage("Client saved.");
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function importRows(apply: boolean) {
    setBusy(true);
    setError("");
    try {
      const rows = parseClientCsv(csv);
      const d = await request("/api/studio/pilot/clients", {
        provider,
        action: apply ? "import" : "preview",
        source,
        rows,
      });
      if (apply) {
        setMessage(
          d.created + " clients added; " + d.reused + " already imported.",
        );
        setPreview(null);
        await refresh();
      } else setPreview(d.preview);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="pilot-office">
      <header className="studio-title">
        <p className="eyebrow">CLIENTS</p>
        <h1>Your relationships.</h1>
        <p>Contact details and service history, scoped to your professional.</p>
      </header>
      <div className="pilot-form">
        <ProviderSelect
          data={data}
          provider={provider}
          onChange={(v) => {
            setProvider(v);
            setPage(0);
            setPreview(null);
          }}
        />
        <label>
          Search clients
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="studio-error">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <section className="pilot-panel">
        {clients.map((c) => (
          <Link
            className="pilot-client"
            href={"/studio/clients/" + c.id}
            key={c.id}
          >
            <strong>{c.name}</strong>
            <span>{c.phone || c.email || "Contact details not supplied"}</span>
          </Link>
        ))}
        {!clients.length && (
          <p>No matching clients. Add your first client below.</p>
        )}
        <div className="studio-controls">
          {page > 0 && (
            <button className="button" onClick={() => setPage(page - 1)}>
              Previous
            </button>
          )}
          {hasMore && (
            <button className="button" onClick={() => setPage(page + 1)}>
              Next
            </button>
          )}
        </div>
      </section>
      <details className="pilot-panel">
        <summary>Add client</summary>
        <form
          className="pilot-form"
          onSubmit={create}
          onChange={(e) => {
            delete e.currentTarget.dataset.key;
          }}
        >
          <fieldset disabled={busy || !provider}>
            <legend>Client contact</legend>
            <label>
              Name
              <input name="name" maxLength={100} required />
            </label>
            <label>
              Email
              <input name="email" type="email" />
            </label>
            <label>
              Phone
              <input
                name="phone"
                type="tel"
                placeholder="US number or + country code"
                maxLength={30}
              />
            </label>
            <label className="pilot-check">
              <input type="checkbox" name="allowDuplicate" />I checked existing
              records; this is a separate client who shares contact details.
            </label>
            <button className="button button-gold">Save client</button>
          </fieldset>
        </form>
      </details>
      <details className="pilot-panel">
        <summary>Import pilot clients</summary>
        <p>
          Up to 20 contacts. CSV headers: name,email,phone,source_key. Keep
          source and source_key stable when retrying an export. Upcoming
          appointments are entered separately after checking the old calendar.
        </p>
        <div className="pilot-form">
          <label>
            Source system
            <input
              value={source}
              onChange={(e) => {
                setSource(e.target.value);
                setPreview(null);
              }}
              maxLength={80}
            />
          </label>
          <label>
            CSV file
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) {
                  if (f.size > 14000) {
                    setError("Use a small pilot export.");
                    return;
                  }
                  setCsv(await f.text());
                  setPreview(null);
                }
              }}
            />
          </label>
          <label>
            CSV contents
            <textarea
              value={csv}
              onChange={(e) => {
                setCsv(e.target.value);
                setPreview(null);
              }}
              rows={7}
            />
          </label>
          <button
            className="button"
            disabled={busy || !source || !provider || !csv}
            onClick={() => void importRows(false)}
          >
            Preview import
          </button>
        </div>
        {preview && (
          <>
            <ul>
              {preview.map((r, i) => (
                <li key={i}>
                  {String(r.input.name)} —{" "}
                  {r.alreadyImported
                    ? "Previously imported"
                    : r.batchDuplicate || r.matches.length
                      ? "Possible duplicate: review existing client before import"
                      : "Ready"}
                </li>
              ))}
            </ul>
            <button
              className="button button-gold"
              disabled={
                busy ||
                preview.some(
                  (r) =>
                    !r.alreadyImported &&
                    (r.batchDuplicate || r.matches.length > 0),
                )
              }
              onClick={() => void importRows(true)}
            >
              Import reviewed contacts
            </button>
          </>
        )}
      </details>
      <Link className="studio-inline" href="/studio/schedule">
        Open calendar ↗
      </Link>
    </div>
  );
}
export function PilotReadiness() {
  const { data, error, setError } = useSetup();
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await request(
        "/api/studio/pilot",
        {
          id: String(f.get("id")),
          address: String(f.get("address")),
          bookingEnabled: f.get("open") === "on",
          acknowledge: f.get("acknowledge") === "on",
        },
        "PATCH",
      );
      setMessage("Location settings saved. Refresh to see current readiness.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function staff(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await request("/api/studio/pilot/staff", {
        email: String(f.get("email")),
        provider: String(f.get("provider")),
        acknowledge: f.get("acknowledge") === "on",
      });
      setMessage(
        "Verified staff access assigned. Ask the professional to reopen Studio.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="pilot-panel">
      <p className="eyebrow">PILOT READINESS</p>
      <h2>Open with confidence.</h2>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {!data ? (
        <p>Checking setup…</p>
      ) : (
        <>
          <ul className="pilot-checklist">
            <li>{data.providers.length ? "✓" : "○"} Professional configured</li>
            <li>
              {data.services.some((s) => s.enabled) ? "✓" : "○"} Approved
              services enabled
            </li>
            <li>
              {data.assignments.length ? "✓" : "○"} Professional assigned to
              location
            </li>
            <li>
              {data.staff.some((s) => s.count > 0) ? "✓" : "○"} Assigned staff
              account
            </li>
            <li>
              {data.locations.some(
                (l) => l.booking_enabled && l.enabled && l.address,
              )
                ? "✓"
                : "○"}{" "}
              Location open with actual address
            </li>
            <li>
              ○ Verify real booking, phone installation and old-calendar
              reconciliation before inviting pilot clients
            </li>
          </ul>
          <p>
            Confirmations and reminders are handled manually during this pilot.
            No automated delivery is connected.
          </p>
          {data.owner && (
            <>
              <p>
                Configure the provider while disabled, approve services, then
                enable provider hours in Operations below. Katie signs in with
                her own confirmed account; you can assign her confirmed account
                below.
              </p>
              <details>
                <summary>Assign verified staff access</summary>
                <form className="pilot-form" onSubmit={staff}>
                  <fieldset disabled={busy}>
                    <legend>Confirmed account only</legend>
                    <label>
                      Account email
                      <input type="email" name="email" required />
                    </label>
                    <label>
                      Professional
                      <select name="provider">
                        {data.providers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="pilot-check">
                      <input type="checkbox" name="acknowledge" required />I
                      verified this is the professional's own account.
                    </label>
                    <button className="button button-gold">
                      Assign provider access
                    </button>
                  </fieldset>
                </form>
              </details>
              <form className="pilot-form" onSubmit={save}>
                <fieldset disabled={busy}>
                  <legend>Location booking gate</legend>
                  <label>
                    Location
                    <select name="id">
                      {data.locations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Actual appointment address
                    <input
                      name="address"
                      maxLength={300}
                      required
                      defaultValue={data.locations[0]?.address || ""}
                    />
                  </label>
                  <label className="pilot-check">
                    <input
                      type="checkbox"
                      name="open"
                      defaultChecked={data.locations[0]?.booking_enabled}
                    />
                    Open booking
                  </label>
                  <label className="pilot-check">
                    <input type="checkbox" name="acknowledge" required />I
                    reviewed the menu, prices, schedule and pilot calendar.
                  </label>
                  <button className="button button-gold">
                    Save location settings
                  </button>
                </fieldset>
              </form>
            </>
          )}
        </>
      )}
    </section>
  );
}
export function PilotMessages() {
  const [rows, setRows] = useState<
      {
        id: string;
        client_name: string;
        kind: string;
        phone: string;
        email: string;
        service_name: string;
        starts_at: string;
      }[]
    >([]),
    [error, setError] = useState("");
  async function load() {
    const d = await request("/api/studio/pilot/messages");
    setRows(d.messages);
  }
  useEffect(() => {
    void load().catch((e) => setError(e.message));
    const fn = () => void load().catch((e) => setError(e.message));
    window.addEventListener("booking-updated", fn);
    return () => window.removeEventListener("booking-updated", fn);
  }, []);
  return (
    <details className="pilot-panel">
      <summary>Client confirmations · {rows.length} to handle</summary>
      <p>
        Contact the client yourself, then record that you confirmed the update.
        This button sends no message.
      </p>
      {error && <p role="alert">{error}</p>}
      {rows.map((r) => (
        <article className="pilot-client" key={r.id}>
          <strong>
            {r.client_name} · {r.kind}
          </strong>
          <span>
            {r.service_name} ·{" "}
            {DateTime.fromISO(r.starts_at)
              .setZone("America/Chicago")
              .toFormat("LLL d, h:mm a")}{" "}
            · {r.phone || r.email || "Use existing client contact"}
          </span>
          <button
            className="button"
            onClick={async () => {
              try {
                await request(
                  "/api/studio/pilot/messages",
                  { id: r.id },
                  "PATCH",
                );
                await load();
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            I contacted this client
          </button>
        </article>
      ))}
    </details>
  );
}

export function PilotContactEditor({
  client,
}: {
  client: Client & { revision: number };
}) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <details className="pilot-panel">
      <summary>Contact details</summary>
      <form
        className="pilot-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setBusy(true);
          try {
            await request(
              "/api/studio/pilot/clients/" + client.id,
              {
                name: String(f.get("name")),
                email: String(f.get("email")),
                phone: String(f.get("phone")),
                revision: client.revision,
              },
              "PATCH",
            );
            window.location.reload();
          } catch (e) {
            setMessage((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy}>
          <legend>Edit contact</legend>
          <label>
            Name
            <input
              name="name"
              defaultValue={client.name}
              maxLength={100}
              required
            />
          </label>
          <label>
            Email
            <input name="email" type="email" defaultValue={client.email} />
          </label>
          <label>
            Phone
            <input name="phone" defaultValue={client.phone} maxLength={30} />
          </label>
          <button className="button button-gold">Save contact</button>
        </fieldset>
        <p role="status">{message}</p>
      </form>
    </details>
  );
}
