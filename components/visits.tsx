"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import { ArrowUpRight, CalendarDays, Check, LogOut, List } from "lucide-react";
import type { Actor, Appointment } from "@/lib/booking";
export function Visits({
  actor,
  studio = false,
  preview = false,
}: {
  actor: Actor;
  studio?: boolean;
  preview?: boolean;
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
    [view, setView] = useState<"visits" | "calendar">("visits"),
    [filter, setFilter] = useState(""),
    [message, setMessage] = useState("");
  async function load() {
    const r = await fetch(`/api/appointments${studio ? "?studio=true" : ""}`);
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    setRows(d.visits);
  }
  useEffect(() => {
    load()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!editing || !date) return;
    const c = new AbortController();
    setSlots([]);
    fetch(`/api/availability?service=${editing.service_id}&date=${date}`, {
      signal: c.signal,
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        setSlots(d.slots || []);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError("Unable to load times.");
      });
    return () => c.abort();
  }, [editing, date]);
  async function update(a: Appointment, action: "cancel" | "reschedule") {
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
      setMessage(
        action === "cancel"
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
    location.assign("/signin");
  }
  const active = rows
    .filter(
      (a) => a.status === "confirmed" && new Date(a.starts_at) > new Date(),
    )
    .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
  const shown = rows
    .filter(
      (a) =>
        !filter ||
        DateTime.fromISO(new Date(a.starts_at).toISOString())
          .setZone("America/Chicago")
          .toISODate() === filter,
    )
    .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
  return (
    <div className={studio ? "workspace" : "account-workspace"}>
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">
            {studio ? "FIX IT SHOP · STUDIO" : "YOUR RESERVE EXPERIENCE"}
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
          {studio && (actor.role === "owner" || actor.provider_id === "katie") && <a className="text-link" href="#chair-studio">Chair check-ins <ArrowUpRight size={16} /></a>}
          {!studio && (
            <Link className="text-link" href="/my-sanctum">
              My Sanctum <ArrowUpRight size={16} />
            </Link>
          )}
          {!studio && actor.role !== "client" && (
            <Link className="text-link" href="/studio">
              Studio <ArrowUpRight size={16} />
            </Link>
          )}
          <Link href="/book" className="button button-gold">
            {studio ? "Booking preview" : "Book a visit"}{" "}
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
      {preview && (
        <div className="preview-workspace">
          <span>Development environment · synthetic records only</span>
          <Link href={`/signin?next=${studio ? "/studio" : "/account"}`}>
            Switch preview identity <ArrowUpRight size={14} />
          </Link>
        </div>
      )}
      {view === "visits" && (
        <div className="stat-grid">
          <div>
            <p>{studio ? "Upcoming appointments" : "Upcoming visits"}</p>
            <strong>{active.length.toString().padStart(2, "0")}</strong>
          </div>
          <div>
            <p>Next on the calendar</p>
            <strong className="stat-date">
              {active[0]
                ? DateTime.fromISO(new Date(active[0].starts_at).toISOString())
                    .setZone("America/Chicago")
                    .toFormat("LLL d · h:mm a")
                : "A little space for you"}
            </strong>
          </div>
          <div>
            <p>{studio ? "Provider" : "Your studio"}</p>
            <strong className="stat-date">Katie · Fix It Shop</strong>
          </div>
        </div>
      )}
      {view === "calendar" && (
        <div className="calendar-filter">
          <label className="form-field">
            Choose a day
            <input
              type="date"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </label>
          <button
            className="text-link"
            onClick={() =>
              setFilter(DateTime.now().setZone("America/Chicago").toISODate()!)
            }
          >
            Today
          </button>
          <button className="text-link" onClick={() => setFilter("")}>
            All dates
          </button>
          <span className="muted">Central Time</span>
        </div>
      )}
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
                : "Saved preview appointments will appear here."}
            </p>
            <Link href="/book" className="text-link">
              Find a moment <ArrowUpRight size={17} />
            </Link>
          </div>
        ) : (
          <div className="appointment-list">
            {shown.map((a) => {
              const dt = DateTime.fromISO(
                  new Date(a.starts_at).toISOString(),
                ).setZone("America/Chicago"),
                future = dt.toMillis() > Date.now();
              return (
                <article className="appointment" key={a.id}>
                  <div className="appointment-date">
                    <span>{dt.toFormat("LLL")}</span>
                    <strong>{dt.day}</strong>
                    <small>{dt.toFormat("ccc")}</small>
                  </div>
                  <div className="appointment-content">
                    <div className="appointment-top">
                      <h3>{a.service_name}</h3>
                      <span className={`status ${a.status}`}>{a.status}</span>
                    </div>
                    <p>
                      {studio ? a.client_name : "With Katie"} <span>·</span>{" "}
                      {dt.toFormat("h:mm a")} CT <span>·</span>{" "}
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
                    {a.status !== "confirmed" && !studio && (
                      <Link
                        className="text-link"
                        href={`/book?service=${a.service_id}`}
                      >
                        Book again <ArrowUpRight size={14} />
                      </Link>
                    )}
                  </div>
                  {cancelId === a.id && (
                    <div className="appointment-edit">
                      <h4>Cancel this preview visit?</h4>
                      <p>
                        This releases the time. No payment or cancellation fee
                        applies in the preview.
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
                          className="button button-gold"
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
                          min={DateTime.now()
                            .setZone("America/Chicago")
                            .toISODate()!}
                          max={DateTime.now()
                            .setZone("America/Chicago")
                            .plus({ days: 45 })
                            .toISODate()!}
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
