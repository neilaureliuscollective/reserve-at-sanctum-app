"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { DateTime } from "luxon";
import {
  CalendarDays,
  Plus,
  UsersRound,
  Clock3,
  Settings2,
  RefreshCw,
} from "lucide-react";
import type { ProviderDay } from "@/lib/provider-day";
export function ProviderDayHome({
  providerId,
  preview,
  canManage,
  canClients,
  canBlocks,
}: {
  providerId: string;
  preview: boolean;
  canManage: boolean;
  canClients: boolean;
  canBlocks: boolean;
}) {
  const [data, setData] = useState<ProviderDay | null>(null),
    [date, setDate] = useState(""),
    [location, setLocation] = useState(""),
    [service, setService] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [refreshedAt, setRefreshedAt] = useState("");
  const sequence = useRef(0),
    abort = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    const id = ++sequence.current;
    abort.current?.abort();
    const c = new AbortController();
    abort.current = c;
    setLoading(true);
    setError("");
    try {
      const p = new URLSearchParams({ provider: providerId });
      if (date) p.set("date", date);
      if (location) p.set("location", location);
      if (service) p.set("service", service);
      const r = await fetch("/api/studio/day?" + p, {
        cache: "no-store",
        signal: AbortSignal.any([c.signal, AbortSignal.timeout(12000)]),
      });
      const d = await r.json();
      if (id !== sequence.current) return;
      if (!r.ok) throw Error(d.error || "Your day couldn’t refresh.");
      setData(d);
      setRefreshedAt(DateTime.now().setZone(d.location?.timezone || "America/Chicago").toFormat("h:mm a ZZZZ"));
    } catch (e) {
      if (!c.signal.aborted && id === sequence.current) {
        setData(null);
        setError(
          (e as Error).name === "TimeoutError"
            ? "Your day couldn’t refresh. Try again."
            : (e as Error).message,
        );
      }
    } finally {
      if (id === sequence.current) setLoading(false);
    }
  }, [providerId, date, location, service]);
  useEffect(() => {
    void load();
    const refresh = () => {
      if (document.visibilityState === "visible") void load();
    };
    const timer = setInterval(refresh, 45000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("booking-updated", refresh);
    return () => {
      abort.current?.abort();
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("booking-updated", refresh);
    };
  }, [load]);
  const zone = data?.location?.timezone || "America/Chicago",
    selected = date || data?.date || DateTime.now().setZone(zone).toISODate()!;
  const schedule =
    "/studio/schedule?" +
    new URLSearchParams({
      date: selected,
      location: location || data?.location?.id || "",
      provider: providerId,
    });
  const next = data?.visits.find(
    (v) =>
      v.status === "confirmed" && new Date(v.ends_at).getTime() > Date.now(),
  );
  const time = (s: string) =>
    DateTime.fromISO(s).setZone(zone).toFormat("h:mm a");
  return (
    <div className="provider-day">
      <header className="provider-day-heading">
        <div>
          <p className="eyebrow">
            {providerId === "katie"
              ? "FIX IT SHOP · KATIE’S STUDIO"
              : "YOUR PRIVATE STUDIO"}
          </p>
          <h1>
            Your day.
            <br />
            <em>Well in hand.</em>
          </h1>
          <p>Your appointments, your clients, and room to work.</p>
        </div>
        {canManage && (
          <Link
            className="button button-gold"
            href={schedule + "&add=1#manual-booking"}
          >
            <Plus size={18} />
            Add appointment
          </Link>
        )}
      </header>
      {preview && (
        <p className="preview-workspace">
          Development preview · synthetic clients and appointments only.
        </p>
      )}
      <div className="provider-day-controls">
        <label>
          Working day
          <input
            type="date"
            value={selected}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label>
          Location
          <select
            value={location || data?.location?.id || ""}
            onChange={(e) => {
              setLocation(e.target.value);
              setService("");
              setDate("");
            }}
          >
            <option value="">Choose location</option>
            {data?.locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <button
          className="button button-outline"
          onClick={() => setDate(DateTime.now().setZone(zone).toISODate()!)}
        >
          Today
        </button>
        <button
          className="button button-outline"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>
      <div className="provider-day-navigation" aria-label="Browse working days">
        <button className="button button-outline" disabled={loading} onClick={() => setDate(DateTime.fromISO(selected, { zone }).minus({ days: 1 }).toISODate()!)}>Previous day</button>
        <button className="button button-outline" disabled={loading} onClick={() => setDate(DateTime.fromISO(selected, { zone }).plus({ days: 1 }).toISODate()!)}>Next day</button>
      </div>
      {refreshedAt && !error && <p className="provider-day-freshness" role="status">{loading ? "Refreshing appointments…" : `Last refreshed ${refreshedAt}. Updates every 45 seconds while open.`}</p>}
      {error ? (
        <section className="provider-day-empty" role="alert">
          <h2>Your day couldn’t load.</h2>
          <p>{error}</p>
          <button className="button button-gold" onClick={() => void load()}>
            Try again
          </button>
        </section>
      ) : loading ? (
        <p role="status" className="provider-day-empty">
          Opening your working day…
        </p>
      ) : (
        data && (
          <>
            <section className="provider-day-stats" aria-label="Day summary">
              <div>
                <span>Confirmed</span>
                <strong>{data.counts.confirmed}</strong>
              </div>
              <div>
                <span>Completed</span>
                <strong>{data.counts.completed}</strong>
              </div>
              <div>
                <span>Cancelled</span>
                <strong>{data.counts.cancelled}</strong>
              </div>
            </section>
            {data.hasMore && (
              <p role="status">
                Summary covers the first 100 entries. Open the calendar for the
                remaining appointments.
              </p>
            )}
            <section className="provider-next">
              <p className="eyebrow">
                {next && new Date(next.starts_at).getTime() <= Date.now()
                  ? "IN THE CHAIR"
                  : "NEXT ON THIS DAY"}
              </p>
              <h2>{next?.client_name || "A little room to breathe."}</h2>
              <p>
                {next
                  ? `${next.service_name} · ${time(next.starts_at)}–${time(next.ends_at)} · ${zone}`
                  : "No remaining confirmed appointments are shown for this day."}
              </p>
              <div className="hero-actions">
                {next?.clientHref && (
                  <Link className="button button-gold" href={next.clientHref}>
                    Open client history ↗
                  </Link>
                )}
                <Link className="button button-outline" href={schedule}>
                  Open calendar ↗
                </Link>
              </div>
            </section>
            <div className="provider-day-columns">
              <section className="provider-agenda">
                <div className="studio-section-head">
                  <h2>The day’s rhythm.</h2>
                  <CalendarDays size={24} />
                </div>
                <p className="muted">
                  {DateTime.fromISO(data.date).toFormat("cccc, LLLL d")} ·{" "}
                  {zone}
                </p>
                {!data.visits.length ? (
                  <p className="provider-day-empty">
                    No appointments on this day. Add a visit or check your
                    availability.
                  </p>
                ) : (
                  data.visits.map((v) => (
                    <article key={v.id} className="provider-agenda-entry">
                      <time dateTime={v.starts_at}>
                        {time(v.starts_at)}
                        <small>{time(v.ends_at)}</small>
                      </time>
                      <div>
                        {v.clientHref ? (
                          <Link href={v.clientHref}>{v.client_name} ↗</Link>
                        ) : (
                          <strong>{v.client_name}</strong>
                        )}
                        <p>{v.service_name}</p>
                        <span className={`status ${v.status}`}>{v.status}</span>
                      </div>
                      <Link
                        href={schedule + "#schedule"}
                        className="text-link"
                        aria-label={`Manage ${v.client_name} appointment at ${time(v.starts_at)}`}
                      >
                        Manage ↗
                      </Link>
                    </article>
                  ))
                )}
              </section>
              <section className="provider-openings">
                <div className="studio-section-head">
                  <h2>Room for a visit.</h2>
                  <Clock3 size={24} />
                </div>
                <label>
                  Check a service
                  <select
                    value={service || data.service?.id || ""}
                    onChange={(e) => setService(e.target.value)}
                  >
                    <option value="">Choose service</option>
                    {data.services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} · {s.minutes} min
                      </option>
                    ))}
                  </select>
                </label>
                {data.slotState === "ready" ? (
                  <>
                    <p>
                      Available start times for this service. Booking rechecks
                      availability when saved.
                    </p>
                    <div className="provider-slot-list">
                      {data.slots.slice(0, 8).map((s) => (
                        <Link
                          key={s.start}
                          href={
                            schedule +
                            "&add=1&service=" +
                            encodeURIComponent(data.service!.id) +
                            "&time=" +
                            encodeURIComponent(s.start) +
                            "#manual-booking"
                          }
                        >
                          {s.label} ↗
                        </Link>
                      ))}
                    </div>
                    {!data.slots.length && (
                      <p>No available starts for this service on this day.</p>
                    )}
                    {data.slots.length > 8 && (
                      <Link href={schedule + "&add=1#manual-booking"}>
                        View all available times ↗
                      </Link>
                    )}
                  </>
                ) : (
                  <p role="status">
                    {data.slotState === "unavailable"
                      ? "Availability couldn’t refresh. Try again before offering a time."
                      : data.slotState === "closed"
                        ? "Booking is closed or not available for this service and location."
                        : "Approved services and assigned locations are needed before available times can appear."}
                  </p>
                )}
              </section>
            </div>
          </>
        )
      )}
      <section
        className="provider-day-shortcuts"
        aria-label="Studio quick actions"
      >
        {canClients && (
          <Link href="/studio/insights">
            <UsersRound size={22} />
            <span>
              Client continuity<small>Visits & next-booking coverage</small>
            </span>
          </Link>
        )}
        {canClients && (
          <Link href="/studio/clients">
            <UsersRound size={22} />
            <span>
              Clients<small>Contacts & visit history</small>
            </span>
          </Link>
        )}
        {canBlocks && (
          <Link href="/studio/schedule#availability">
            <Clock3 size={22} />
            <span>
              Block time<small>Protect your working day</small>
            </span>
          </Link>
        )}
        <Link href="/studio/operations?view=availability">
          <Settings2 size={22} />
          <span>
            Availability<small>Hours & service settings</small>
          </span>
        </Link>
      </section>
    </div>
  );
}
