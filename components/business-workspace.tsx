"use client";
import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import type { businessWorkspace } from "@/lib/business-workspace";
type Data = Awaited<ReturnType<typeof businessWorkspace>>;
const number = (f: FormData, key: string) => Number(f.get(key));
export function BusinessWorkspace() {
  const [date, setDate] = useState(
    DateTime.now().setZone("America/Chicago").toISODate()!,
  );
  useEffect(() => {
    const requested = new URL(location.href).searchParams.get("date");
    if (requested && /^\d{4}-\d{2}-\d{2}$/.test(requested)) setDate(requested);
  }, []);
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function refresh(day = date) {
    const r = await fetch("/api/fix-it-management?date=" + day, {
      cache: "no-store",
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    setData(d);
  }
  useEffect(() => {
    let active = true;
    setData(null);
    fetch("/api/fix-it-management?date=" + date, { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [date]);
  async function mutate(body: unknown) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch("/api/fix-it-management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      await refresh();
      setMessage("Saved. Your calendar and settings are refreshed.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <section aria-label="Readiness">
        <h2>Booking readiness</h2>
        <p>
          {!data ? "Checking the calendar configuration…" : data.nativeCalendar
            ? "Native calendar is selected in this environment. Saved appointments are authoritative here."
            : "GlossGenius remains the current booking calendar. Native setup does not activate booking or import GlossGenius appointments."}
        </p>
        <p>
          Account confirmation, approved services and hours, notification
          delivery and a reviewed calendar cutover must be verified before
          launch.
        </p>
        <p>Private Chair content is not included in this workspace.</p>
      </section>
      <section>
        <h2>Calendar & appointments</h2>
        <label>
          Calendar day
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              const url = new URL(location.href);
              url.searchParams.set("date", e.target.value);
              history.replaceState(null, "", url);
            }}
          />
        </label>
        {!data ? (
          <p role="status">Loading calendar…</p>
        ) : (
          <>
            <p>
              Appointment times use each location’s timezone. Up to 200
              appointments per day.
            </p>
            {!data.appointments.length && (
              <p>No native appointments on this day.</p>
            )}
            {data.appointments.map((a) => (
              <article key={String(a.id)}>
                <h3>
                  {String(a.client_name)} · {String(a.service_name)}
                </h3>
                <p>
                  {DateTime.fromISO(new Date(String(a.starts_at)).toISOString())
                    .setZone(String(a.timezone))
                    .toFormat("ccc LLL d, h:mm a ZZZZ")}{" "}
                  · {String(a.status)}
                </p>
                {a.status === "confirmed" && (
                  <>
                    <button
                      disabled={busy}
                      onClick={() => {
                        if (
                          confirm(
                            "Cancel this appointment and release its time?",
                          )
                        )
                          void mutate({
                            action: "appointment",
                            id: a.id,
                            revision: a.revision,
                            change: "cancel",
                          });
                      }}
                    >
                      Cancel appointment
                    </button>
                    <details>
                      <summary>Reschedule appointment</summary>
                      <Reschedule
                        appointment={a}
                        busy={busy}
                        onSave={(start) =>
                          mutate({
                            action: "appointment",
                            id: a.id,
                            revision: a.revision,
                            change: "reschedule",
                            start,
                          })
                        }
                      />
                    </details>
                  </>
                )}
              </article>
            ))}
          </>
        )}
      </section>
      {data?.canConfigure && (
        <section>
          <h2>Services & working hours</h2>
          <p>
            Enter approved business details only. Existing appointment prices
            and durations are preserved. Saving settings does not change the
            calendar of record.
          </p>
          <div className="workspace-grid">
            {data.providers.map((p) => (
              <details key={String(p.id)}>
                <summary>{String(p.name)} · Working hours</summary>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void mutate({
                      action: "configure",
                      acknowledge: f.has("acknowledge"),
                      input: {
                        kind: "provider",
                        provider_id: p.id,
                        target_revision: p.revision,
                        name: f.get("name"),
                        enabled: f.has("enabled"),
                        open_hour: number(f, "open"),
                        close_hour: number(f, "close"),
                        weekdays: String(f.get("weekdays"))
                          .split(",")
                          .map(Number),
                        location_id: p.location_id,
                      },
                    });
                  }}
                >
                  <label>
                    Name
                    <input name="name" defaultValue={String(p.name)} required />
                  </label>
                  <p>{String(p.timezone)}</p>
                  <label>
                    Opening hour (0–23)
                    <input
                      name="open"
                      type="number"
                      min="0"
                      max="23"
                      defaultValue={Number(p.open_hour)}
                      required
                    />
                  </label>
                  <label>
                    Closing hour (1–24)
                    <input
                      name="close"
                      type="number"
                      min="1"
                      max="24"
                      defaultValue={Number(p.close_hour)}
                      required
                    />
                  </label>
                  <label>
                    Working days (1=Monday, 7=Sunday; comma separated)
                    <input
                      name="weekdays"
                      defaultValue={String(p.weekdays)}
                      required
                    />
                  </label>
                  <label>
                    <input
                      name="enabled"
                      type="checkbox"
                      defaultChecked={Boolean(p.enabled)}
                    />
                    Accept appointments when native booking is commissioned
                  </label>
                  <label>
                    <input name="acknowledge" type="checkbox" />I reviewed
                    affected appointments; preserve them
                  </label>
                  <button disabled={busy}>Save working hours</button>
                </form>
              </details>
            ))}
          </div>
          {data.services.map((s) => (
            <ServiceForm
              key={String(s.id) + String(s.revision)}
              service={s}
              busy={busy}
              mutate={mutate}
            />
          ))}
          {data.providers.map((p) => (
            <ServiceForm
              key={"new-" + p.id}
              service={{ provider_id: p.id, revision: 0 }}
              busy={busy}
              mutate={mutate}
            />
          ))}
        </section>
      )}
      {data && (
        <section>
          <h2>Time away</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void mutate({
                action: "block",
                provider: f.get("provider"),
                date: f.get("date"),
                start: f.get("start"),
                end: f.get("end"),
              });
            }}
          >
            <label>
              Professional
              <select name="provider">
                {data.providers.map((p) => (
                  <option key={String(p.id)} value={String(p.id)}>
                    {String(p.name)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Day
              <input type="date" name="date" required />
            </label>
            <label>
              Start (location time)
              <input type="time" step="900" name="start" required />
            </label>
            <label>
              End
              <input type="time" step="900" name="end" required />
            </label>
            <button disabled={busy}>Block time</button>
          </form>
          {data.blocks.map((b) => (
            <p key={String(b.id)}>
              {String(b.provider_id)} ·{" "}
              {DateTime.fromJSDate(new Date(String(b.starts_at)))
                .setZone(
                  String(
                    data.providers.find((p) => p.id === b.provider_id)
                      ?.timezone || "America/Chicago",
                  ),
                )
                .toFormat("LLL d h:mm a ZZZZ")}
              <button
                disabled={busy}
                onClick={() =>
                  void mutate({
                    action: "unblock",
                    provider: b.provider_id,
                    id: b.id,
                  })
                }
              >
                Release block
              </button>
            </p>
          ))}
        </section>
      )}
    </>
  );
}
function ServiceForm({
  service: s,
  busy,
  mutate,
}: {
  service: Record<string, unknown>;
  busy: boolean;
  mutate: (body: unknown) => Promise<void>;
}) {
  return (
    <details>
      <summary>
        {String(s.name || "Add approved service")} · {String(s.provider_id)}
      </summary>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void mutate({
            action: "configure",
            acknowledge: f.has("acknowledge"),
            input: {
              kind: "service",
              provider_id: s.provider_id,
              ...(s.id ? { service_id: s.id } : {}),
              target_revision: s.revision,
              name: f.get("name"),
              description: f.get("description"),
              minutes: number(f, "minutes"),
              buffer: number(f, "buffer"),
              price: number(f, "price"),
              enabled: f.has("enabled"),
            },
          });
        }}
      >
        <label>
          Service name
          <input name="name" required defaultValue={String(s.name || "")} />
        </label>
        <label>
          Description
          <textarea
            name="description"
            required
            defaultValue={String(s.description || "")}
          />
        </label>
        <label>
          Duration in minutes
          <input
            name="minutes"
            type="number"
            min="5"
            step="5"
            required
            defaultValue={s.minutes as number | undefined}
          />
        </label>
        <label>
          Buffer in minutes
          <input
            name="buffer"
            type="number"
            min="0"
            step="5"
            required
            defaultValue={s.buffer as number | undefined}
          />
        </label>
        <label>
          Price in cents
          <input
            name="price"
            type="number"
            min="0"
            step="1"
            required
            defaultValue={s.price as number | undefined}
          />
        </label>
        <label>
          <input
            name="enabled"
            type="checkbox"
            defaultChecked={Boolean(s.enabled)}
          />
          Publish approved service
        </label>
        <label>
          <input name="acknowledge" type="checkbox" />I reviewed affected
          visits; preserve their captured details
        </label>
        <button disabled={busy}>Save service</button>
      </form>
    </details>
  );
}
function Reschedule({
  appointment: a,
  busy,
  onSave,
}: {
  appointment: Record<string, unknown>;
  busy: boolean;
  onSave: (start: string) => Promise<void>;
}) {
  const [slots, setSlots] = useState<{ start: string; label: string }[]>([]),
    [error, setError] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onSave(String(new FormData(e.currentTarget).get("start")));
      }}
    >
      <label>
        New day
        <input
          type="date"
          required
          onChange={async (e) => {
            setSlots([]);
            setError("");
            try {
              const r = await fetch(
                "/api/availability?" +
                  new URLSearchParams({
                    service: String(a.service_id),
                    location: String(a.location_id || "eunice"),
                    date: e.target.value,
                  }),
              );
              const d = await r.json();
              if (!r.ok) throw Error(d.error);
              setSlots(d.slots || []);
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <label>
        Available time
        <select name="start" required>
          <option value="">Choose a time</option>
          {slots.map((s) => (
            <option key={s.start} value={s.start}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <button disabled={busy || !slots.length}>Save new time</button>
    </form>
  );
}
