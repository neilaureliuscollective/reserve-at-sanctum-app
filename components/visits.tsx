"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { DateTime } from "luxon";
import { ArrowUpRight, CalendarDays, Check, LogOut, List } from "lucide-react";
import { hasCapability } from "@/lib/studio-permissions";
import type { BookingIdentity } from "@/lib/fix-it-booking";
import type { Actor, Appointment } from "@/lib/booking";
export function Visits({
  actor,
  studio = false,
  preview = false,
  identity,
  initialDate,
  initialLocation,
}: {
  actor: Actor;
  studio?: boolean;
  preview?: boolean;
  identity?: BookingIdentity;
  initialDate?: string;
  initialLocation?: string;
}) {
  const [rows, setRows] = useState<Appointment[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [editing, setEditing] = useState<Appointment | null>(null),
    [cancelId, setCancelId] = useState(""),
    [date, setDate] = useState(""),
    [slots, setSlots] = useState<{ start: string; label: string }[]>([]),
    [selected, setSelected] = useState(""),
    [busy, setBusy] = useState(false),
    [view, setView] = useState<"visits" | "calendar">(
      studio ? "calendar" : "visits",
    ),
    [filter, setFilter] = useState(
      studio
        ? initialDate || DateTime.now().setZone("America/Chicago").toISODate()!
        : "",
    ),
    [message, setMessage] = useState(""),
    [page, setPage] = useState(0),
    [hasMore, setHasMore] = useState(false),
    [days, setDays] = useState(1),
    [provider, setProvider] = useState(actor.provider_id || ""),
    [locationId, setLocationId] = useState(initialLocation || "eunice"),
    [providers, setProviders] = useState<{ id: string; name: string }[]>([]),
    [locations, setLocations] = useState<
      { id: string; name: string; timezone: string }[]
    >([]);
  const zone =
    locations.find((l) => l.id === locationId)?.timezone || "America/Chicago";
  useEffect(() => {
    if (studio)
      fetch("/api/studio/pilot")
        .then((r) => r.json())
        .then((d) => {
          setProviders(d.providers || []);
          setLocations(d.locations || []);
        })
        .catch(() => {});
  }, [studio]);
  const loadSequence = useRef(0);
  async function load() {
    const sequence = ++loadSequence.current;
    const params = new URLSearchParams({ page: String(page) });
    if (identity) params.set("provider", identity.providerId);
    if (studio) {
      params.set("studio", "true");
      params.set("date", filter);
      params.set("days", String(days));
      params.set("provider", provider);
      params.set("location", locationId);
    }
    const r = await fetch("/api/appointments?" + params, { cache: "no-store" });
    const d = await r.json();
    if (sequence !== loadSequence.current) return;
    if (!r.ok) throw new Error(d.error);
    setRows(d.visits);
    setHasMore(!!d.hasMore);
  }
  useEffect(() => {
    setLoading(true);
    load()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filter, page, days, provider, locationId]);
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible")
        void load().catch((e) => setError(e.message));
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("booking-updated", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("booking-updated", refresh);
    };
  }, [filter, page, days, provider, locationId]);
  useEffect(() => {
    if (!editing || !date) return;
    const c = new AbortController();
    setSlots([]);
    fetch(
      `${studio ? "/api/studio/pilot/appointments" : "/api/availability"}?service=${editing.service_id}&date=${date}&provider=${encodeURIComponent(editing.provider_id)}&location=${encodeURIComponent(editing.location_id || "eunice")}`,
      {
        signal: c.signal,
      },
    )
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        setSlots(d.slots || []);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError("Unable to load times.");
      });
    return () => c.abort();
  }, [editing, date, studio]);
  async function update(
    a: Appointment,
    action: "cancel" | "reschedule" | "complete",
  ) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch(`/api/appointments/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          revision: a.revision,
          ...(action === "reschedule" ? { start: selected } : {}),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setEditing(null);
      setCancelId("");
      await load();
      window.dispatchEvent(new Event("booking-updated"));
      setMessage(
        action === "complete"
          ? "Visit marked complete. No payment has been recorded."
          : action === "cancel"
            ? "Your visit has been cancelled."
            : "Your visit has been rescheduled.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "signout" }),
    });
    location.assign(identity?.signin || "/signin");
  }
  const active = rows
    .filter(
      (a) => a.status === "confirmed" && new Date(a.starts_at) > new Date(),
    )
    .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
  const shown = [...rows].sort(
    (a, b) => +new Date(a.starts_at) - +new Date(b.starts_at),
  );
  return (
    <div className={studio ? "workspace" : "account-workspace"}>
      {!studio && (
        <div className="workspace-heading">
          <div>
            <p className="eyebrow">
              {studio
                ? "FIX IT SHOP · STUDIO"
                : identity
                  ? "FIX IT SHOP · YOUR APPOINTMENTS"
                  : "YOUR LEGACY RESERVE"}
            </p>
            <h1>{studio ? "A considered day." : "Your next chapter."}</h1>
            <p>
              {studio
                ? `Welcome, ${actor.name.split(" ·")[0]}. Time and attention, well placed.`
                : `Welcome, ${actor.name.split(" ·")[0]}. Your time, kept together.`}
            </p>
          </div>
          <button className="text-link" onClick={logout}>
            Sign out <LogOut size={16} />
          </button>
        </div>
      )}
      <div className="workspace-toolbar">
        <div className="workspace-tabs">
          <button
            className={view === "visits" ? "active" : ""}
            onClick={() => {
              setView("visits");
              setFilter("");
            }}
          >
            <List size={17} />
            {studio ? "Appointments" : "Your visits"}
          </button>
          <button
            className={view === "calendar" ? "active" : ""}
            onClick={() => setView("calendar")}
          >
            <CalendarDays size={17} />
            Calendar
          </button>
        </div>
        <div className="workspace-links">
          {studio &&
            (actor.role === "owner" || actor.provider_id === "katie") && (
              <a className="text-link" href="#chair-studio">
                Chair check-ins <ArrowUpRight size={16} />
              </a>
            )}
          {!studio && !identity && (
            <Link prefetch={false} className="text-link" href="/profile">
              Your profile <ArrowUpRight size={16} />
            </Link>
          )}
          {!studio && !identity && actor.role !== "client" && (
            <Link prefetch={false} className="text-link" href="/studio">
              Studio <ArrowUpRight size={16} />
            </Link>
          )}
          <Link
            href={
              identity?.book ||
              (studio && actor.provider_id === "katie"
                ? "/fix-it-shop/app/book"
                : "/book")
            }
            className="button button-gold"
          >
            {studio ? "Client booking" : "Book a visit"}{" "}
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
      {preview && (
        <div className="preview-workspace">
          <span>Development environment · synthetic records only</span>
          <Link
            prefetch={false}
            href={`/signin?next=${studio ? "/studio" : "/account"}`}
          >
            Switch preview identity <ArrowUpRight size={14} />
          </Link>
        </div>
      )}
      {view === "visits" && (
        <div className="stat-grid">
          <div>
            <p>
              {studio
                ? "Upcoming appointments on this page"
                : "Upcoming visits on this page"}
            </p>
            <strong>{active.length.toString().padStart(2, "0")}</strong>
          </div>
          <div>
            <p>Next on the calendar</p>
            <strong className="stat-date">
              {active[0]
                ? DateTime.fromISO(new Date(active[0].starts_at).toISOString())
                    .setZone(zone)
                    .toFormat("LLL d · h:mm a")
                : "A little space for you"}
            </strong>
          </div>
          <div>
            <p>{studio ? "Provider" : "Your studio"}</p>
            <strong className="stat-date">Your service professional</strong>
          </div>
        </div>
      )}
      {view === "calendar" && (
        <div className="calendar-filter">
          <button
            className="button button-outline"
            aria-label="Previous schedule day"
            onClick={() => {
              setFilter(
                DateTime.fromISO(
                  filter || DateTime.now().setZone(zone).toISODate()!,
                )
                  .minus({ days: days })
                  .toISODate()!,
              );
              setPage(0);
            }}
          >
            ← Previous
          </button>
          <button
            className="button button-outline"
            aria-label="Next schedule day"
            onClick={() => {
              setFilter(
                DateTime.fromISO(
                  filter || DateTime.now().setZone(zone).toISODate()!,
                )
                  .plus({ days: days })
                  .toISODate()!,
              );
              setPage(0);
            }}
          >
            Next →
          </button>
          <label className="form-field">
            Choose a day
            <input
              type="date"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(0);
              }}
            />
          </label>
          <button
            className="text-link"
            onClick={() => setFilter(DateTime.now().setZone(zone).toISODate()!)}
          >
            Today
          </button>
          <button className="text-link" onClick={() => setFilter("")}>
            All dates
          </button>
          <label className="form-field">
            View
            <select
              value={days}
              onChange={(e) => {
                setDays(Number(e.target.value));
                setPage(0);
              }}
            >
              <option value={1}>Day</option>
              <option value={7}>Week from selected day</option>
            </select>
          </label>
          {actor.role === "owner" && (
            <label className="form-field">
              Provider
              <select
                value={provider}
                onChange={(e) => {
                  setProvider(e.target.value);
                  setPage(0);
                }}
              >
                <option value="">All providers</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="form-field">
            Location
            <select
              value={locationId}
              onChange={(e) => {
                setLocationId(e.target.value);
                setPage(0);
              }}
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <span className="muted">{zone}</span>
        </div>
      )}
      <div className="studio-controls">
        <button
          className="text-link"
          onClick={() => {
            setError("");
            void load().catch((e) => setError(e.message));
          }}
        >
          Refresh appointments
        </button>
        {page > 0 && (
          <button className="button" onClick={() => setPage(page - 1)}>
            Previous page
          </button>
        )}
        {hasMore && (
          <button className="button" onClick={() => setPage(page + 1)}>
            Next page
          </button>
        )}
        <span className="muted small">Page {page + 1}</span>
      </div>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="inline-note">
          <Check size={16} /> {message}
        </p>
      )}
      <div className="visits-section">
        <div className="visits-title">
          <h2>{studio ? "The appointment book" : "Your visits"}</h2>
          <span className="muted small">
            {shown.length} {shown.length === 1 ? "visit" : "visits"}
          </span>
        </div>
        {loading ? (
          <p className="loading-text">Opening your appointment book…</p>
        ) : !shown.length ? (
          <div className="empty-visits">
            <CalendarDays size={36} />
            <h3>
              {filter
                ? "A little breathing room."
                : "Your next visit starts here."}
            </h3>
            <p>
              {filter
                ? "No appointments on this day."
                : "Appointments will appear here once booked."}
            </p>
            <Link href={identity?.book || "/book"} className="text-link">
              Find a moment <ArrowUpRight size={17} />
            </Link>
          </div>
        ) : (
          <div className="appointment-list">
            {shown.map((a) => {
              const dt = DateTime.fromISO(
                  new Date(a.starts_at).toISOString(),
                ).setZone(a.timezone || zone),
                future = dt.toMillis() > Date.now();
              return (
                <article className="appointment" key={a.id}>
                  <div className="appointment-date">
                    <span>{dt.toFormat("LLL")}</span>
                    <strong>{dt.day}</strong>
                    <small>{dt.toFormat("ccc")}</small>
                  </div>
                  <div className="appointment-content">
                    {studio &&
                      hasCapability(actor, "clients.read") &&
                      (a.crm_client_id || a.client_id) && (
                        <Link
                          className="studio-client-link"
                          href={`/studio/clients/${encodeURIComponent(a.crm_client_id || a.client_id!)}`}
                        >
                          {a.client_name} ↗
                        </Link>
                      )}
                    {!studio && !identity && (
                      <Link
                        prefetch={false}
                        href={`/my-visit?visit=${encodeURIComponent(a.id)}`}
                        className="text-link"
                      >
                        Open your visit & preparation ↗
                      </Link>
                    )}
                    <div className="appointment-top">
                      <h3>{a.service_name}</h3>
                      <span className={`status ${a.status}`}>{a.status}</span>
                    </div>
                    <p>
                      {studio
                        ? a.client_name
                        : `With ${a.provider_name || "your professional"}`}{" "}
                      <span>·</span> {dt.toFormat("h:mm a ZZZZ")} <span>·</span>{" "}
                      {(new Date(a.ends_at).getTime() -
                        new Date(a.starts_at).getTime()) /
                        60000}{" "}
                      min
                    </p>
                    {a.note && (
                      <details>
                        <summary>Grooming preferences</summary>
                        <p>{a.note}</p>
                      </details>
                    )}
                    <span className="appointment-ref">
                      REF {a.id.slice(0, 8).toUpperCase()} · REV {a.revision}
                    </span>
                  </div>
                  <div className="appointment-actions">
                    <a
                      className="text-link"
                      href={`/api/appointments/${a.id}/calendar`}
                    >
                      Save to calendar
                    </a>
                    {studio && a.crm_client_id && (
                      <Link
                        className="text-link"
                        href={`/studio/clients/${a.crm_client_id}`}
                      >
                        Client record
                      </Link>
                    )}
                    {a.status === "confirmed" && future && (
                      <>
                        <button
                          className="text-link"
                          onClick={() => {
                            setEditing(a);
                            setDate(dt.plus({ days: 1 }).toISODate()!);
                            setSelected("");
                            setCancelId("");
                            setError("");
                          }}
                        >
                          Reschedule
                        </button>
                        <button
                          className="muted-button"
                          onClick={() => {
                            setCancelId(a.id);
                            setEditing(null);
                            setError("");
                          }}
                        >
                          Cancel visit
                        </button>
                      </>
                    )}
                    {studio &&
                      hasCapability(actor, "appointments.manage") &&
                      a.status === "confirmed" &&
                      new Date(a.ends_at).getTime() <= Date.now() && (
                        <button
                          className="text-link"
                          disabled={busy}
                          onClick={() => update(a, "complete")}
                        >
                          Mark complete
                        </button>
                      )}
                    {studio &&
                      hasCapability(actor, "workspace.create") &&
                      hasCapability(actor, "appointments.manage") &&
                      a.status === "completed" && (
                        <Link
                          className="text-link"
                          href={`/studio/build?capture=1&followup=${encodeURIComponent(a.id)}`}
                        >
                          Create follow-up task ↗
                        </Link>
                      )}
                    {(a.status !== "confirmed" || identity) && !studio && (
                      <Link
                        className="text-link"
                        href={`${identity?.book || "/book"}?service=${a.service_id}&provider=${a.provider_id}&location=${a.location_id || "eunice"}`}
                      >
                        Book again <ArrowUpRight size={14} />
                      </Link>
                    )}
                  </div>
                  {cancelId === a.id && (
                    <div className="appointment-edit">
                      <h4>Cancel this visit?</h4>
                      <p>
                        This releases the time. No payment or cancellation fee
                        is collected through this booking system.
                      </p>
                      <div className="hero-actions">
                        <button
                          className="button button-outline"
                          disabled={busy}
                          onClick={() => setCancelId("")}
                        >
                          Keep my visit
                        </button>
                        <button
                          className="button button-danger"
                          disabled={busy}
                          onClick={() => update(a, "cancel")}
                        >
                          {busy ? "Cancelling…" : "Confirm cancellation"}
                        </button>
                      </div>
                    </div>
                  )}
                  {editing?.id === a.id && (
                    <div className="appointment-edit">
                      <h4>Choose a new moment.</h4>
                      <label className="form-field">
                        Date
                        <input
                          type="date"
                          value={date}
                          min={DateTime.now().setZone(zone).toISODate()!}
                          max={
                            DateTime.now()
                              .setZone(zone)
                              .plus({ days: 45 })
                              .toISODate()!
                          }
                          onChange={(e) => {
                            setDate(e.target.value);
                            setSelected("");
                          }}
                        />
                      </label>
                      <div className="time-grid compact">
                        {slots.length ? (
                          slots.map((s) => (
                            <button
                              key={s.start}
                              className={selected === s.start ? "selected" : ""}
                              onClick={() => setSelected(s.start)}
                            >
                              {s.label}
                            </button>
                          ))
                        ) : (
                          <p>No available times. Try another day.</p>
                        )}
                      </div>
                      <div className="hero-actions">
                        <button
                          className="button button-outline"
                          disabled={busy}
                          onClick={() => setEditing(null)}
                        >
                          Keep current time
                        </button>
                        <button
                          className="button button-gold"
                          disabled={busy || !selected}
                          onClick={() => update(a, "reschedule")}
                        >
                          {busy ? "Saving…" : "Confirm new time"}
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
