"use client";
import { bookingRequest } from "@/lib/booking-request";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DateTime } from "luxon";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CalendarDays,
  Clock,
  LockKeyhole,
  ArrowUpRight,
} from "lucide-react";
import type { BookingIdentity } from "@/lib/fix-it-booking";
import type { Service, Actor } from "@/lib/booking";

const money = (c: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(c / 100);
type Slot = { start: string; label: string };
export function BookingFlow({
  preview = false,
  identity,
}: {
  preview?: boolean;
  identity?: BookingIdentity;
}) {
  const bookPath = identity?.book || "/book";
  const [zone, setZone] = useState("America/Chicago");
  const [house, setHouse] = useState("eunice");
  const [provider, setProvider] = useState("");
  const [houseName, setHouseName] = useState("Eunice");
  const [services, setServices] = useState<Service[]>([]),
    [selected, setSelected] = useState(""),
    [date, setDate] = useState(""),
    [slots, setSlots] = useState<Slot[]>([]),
    [start, setStart] = useState(""),
    [step, setStep] = useState(1),
    [loading, setLoading] = useState(true),
    [loadingSlots, setLoadingSlots] = useState(false),
    [error, setError] = useState(""),
    [note, setNote] = useState(""),
    [actor, setActor] = useState<Actor | null>(null),
    [busy, setBusy] = useState(false),
    [confirmed, setConfirmed] = useState("");
  const requestKey = useRef("");
  const submitting = useRef(false);
  const [menuRetry, setMenuRetry] = useState(0), [availabilityRetry, setAvailabilityRetry] = useState(0);
  useEffect(() => {
    if (!requestKey.current) requestKey.current = crypto.randomUUID();
    setLoading(true);
    setError("");
    const u = new URL(location.href);
    const locationId = u.searchParams.get("location") || "eunice";
    setHouse(locationId);
    const today = DateTime.now().setZone(zone).plus({ days: 1 });
    setDate(u.searchParams.get("date") || today.toISODate()!);
    const providerId =
      identity?.providerId || u.searchParams.get("provider") || "";
    setProvider(providerId);
    const abort = new AbortController();
    let active = true;
    const timeout = setTimeout(() => abort.abort(), 12000);
    Promise.all([
      bookingRequest<{ services?: Service[]; setupRequired?: boolean; error?: string }>(`/api/availability?location=${encodeURIComponent(locationId)}`, { signal: abort.signal }),
      bookingRequest<{ user: Actor | null }>("/api/session", { signal: abort.signal }),
      bookingRequest<{ locations?: { id: string; short_name: string; timezone: string }[] }>("/api/locations", { signal: abort.signal }),
    ])
      .then(([c, s, l]) => {
        if (!active) return;
        const locationRow = l.locations?.find(
          (row: { id: string }) => row.id === locationId,
        );
        setHouseName(locationRow?.short_name || "Location unavailable");
        if (locationRow?.timezone) setZone(locationRow.timezone);
        const visible: Service[] = (c.services || []).filter(
          (row: Service) => !providerId || row.provider_id === providerId,
        );
        setServices(visible);
        const requested = visible.find(
          (row) => row.id === u.searchParams.get("service"),
        );
        if (requested) {
          setSelected(requested.id);
          setStart(u.searchParams.get("start") || "");
          if (u.searchParams.get("start")) setStep(3);
        }
        if (providerId && c.services?.length && !visible.length)
          setError(
            "This professional is not accepting appointments here. Please check this provider’s booking status.",
          );
        setActor(s.user);
        if (c.error) setError(c.error);
        else if (c.setupRequired || !c.services?.length)
          setError(
            "The service menu is being prepared. Booking is not open yet.",
          );
      })
      .catch((e) => {
        if (active)
          setError("Unable to load the service menu. Refresh to try again.");
      })
      .finally(() => {
        clearTimeout(timeout);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      clearTimeout(timeout);
      abort.abort();
    };
  }, [menuRetry, identity?.providerId]);
  useEffect(() => {
    if (!selected || !date) return;
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 12000);
    setLoadingSlots(true);
    setSlots([]);
    setError("");
    bookingRequest<{ slots?: Slot[]; error?: string }>(
      `/api/availability?service=${encodeURIComponent(selected)}&date=${date}&location=${encodeURIComponent(house)}`,
      { signal: controller.signal },
    )
      .then((d) => {
        if (!active) return;
        setSlots(d.slots || []);
        setStart(current => current && d.slots?.some(slot => slot.start === current) ? current : "");
        if (d.error) setError(d.error);
      })
      .catch((e) => {
        if (active) setError("Unable to load availability. Try another date.");
      })
      .finally(() => {
        clearTimeout(timeout);
        if (active) setLoadingSlots(false);
      });
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [selected, date, house, availabilityRetry]);
  const service = services.find((s) => s.id === selected);
  const days = Array.from({ length: 10 }, (_, i) =>
    DateTime.now()
      .setZone(zone)
      .plus({ days: i + 1 }),
  );
  async function reserve() {
    if (!service || !start || submitting.current || loadingSlots || !slots.some(slot => slot.start === start)) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const d = await bookingRequest<{ appointment: { id: string } }>("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId: house,
          serviceId: selected,
          start,
          note,
          requestKey: requestKey.current,
        }),
      });
      setConfirmed(d.appointment.id);
    } catch (e) {
      setError(e instanceof Error && ! ["AbortError", "TimeoutError", "TypeError"].includes(e.name) ? e.message : "The confirmation did not finish. Check My visits before trying again; your appointment may already be saved.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  const returnPath = `${bookPath}?location=${encodeURIComponent(house)}&provider=${encodeURIComponent(provider)}&service=${selected}&date=${date}&start=${encodeURIComponent(start)}`;
  if (confirmed)
    return (
      <section className="booking-success">
        <div className="success-icon">
          <Check size={32} />
        </div>
        <p className="eyebrow">
          {preview ? "PREVIEW VISIT RESERVED" : "APPOINTMENT RESERVED"}
        </p>
        <h1>
          Time set aside.
          <br />
          <em>Just for you.</em>
        </h1>
        <p>
          {service?.name} with {service?.provider_name}
        </p>
        <p className="success-time">
          {DateTime.fromISO(start)
            .setZone(zone)
            .toFormat("cccc, LLLL d · h:mm a ZZZZ")}
        </p>
        <p className="muted">
          {preview ? "Your test appointment" : "Your appointment"} is saved. No
          payment was taken and no notification was sent.
        </p>
        <div className="hero-actions">
          <a
            className="button button-outline"
            href={`/api/appointments/${confirmed}/calendar`}
          >
            Save to calendar
          </a>
          <Link
            prefetch={false}
            href={
              identity
                ? identity.visits
                : `/my-visit?visit=${encodeURIComponent(confirmed)}`
            }
            className="button button-gold"
          >
            {identity ? "Manage my visits" : "Prepare your visit"}{" "}
            <ArrowUpRight size={18} />
          </Link>
          <Link href={identity?.base || "/home"} className="text-link">
            {identity ? `Back to ${identity.name}` : "Back to the Reserve"}
          </Link>
        </div>
        <p className="small muted">
          Reference {confirmed.slice(0, 8).toUpperCase()}
        </p>
      </section>
    );
  return (
    <>
      <Link
        className="text-link"
        href={
          identity?.base ||
          `/visit?location=${encodeURIComponent(house)}#professionals`
        }
      >
        {identity
          ? `← ${identity.name}`
          : "← Choose your professional in Sanctum"}
      </Link>
      <div className="booking-heading">
        <p className="eyebrow">
          {identity
            ? `${identity.name} · ${identity.founder}`.toUpperCase()
            : `LEGACY RESERVE SANCTUM — ${houseName.toUpperCase()}`}
        </p>
        <h1>
          Make time <em>for yourself.</em>
        </h1>
        <p>A few thoughtful details. A visit that feels like yours.</p>
      </div>
      <div className="booking-layout">
        <div className="booking-main">
          <ol className="steps" aria-label="Booking progress">
            {["Your service", "Your time", "Your visit"].map((label, i) => (
              <li
                className={
                  step === i + 1 ? "current" : step > i + 1 ? "done" : ""
                }
                key={label}
                aria-current={step === i + 1 ? "step" : undefined}
              >
                <span>{step > i + 1 ? <Check size={14} /> : i + 1}</span>
                {label}
              </li>
            ))}
          </ol>
          {loading ? (
            <p className="loading-text">Preparing the experience…</p>
          ) : (
            <>
              {step === 1 && (
                <div className="step-content">
                  <h2>
                    {provider && services[0] ? (
                      <>
                        With <em>{services[0].provider_name}.</em>
                      </>
                    ) : (
                      <>
                        What brings <em>you in?</em>
                      </>
                    )}
                  </h2>
                  <p className="muted">
                    {preview
                      ? "Illustrative services for the private preview."
                      : "Choose your service with your professional."}
                  </p>
                  <div className="service-list">
                    {services.map((s) => (
                      <button
                        className={`service-option ${selected === s.id ? "selected" : ""}`}
                        aria-pressed={selected === s.id}
                        onClick={() => {
                          setSelected(s.id);
                          setStart("");
                          requestKey.current = crypto.randomUUID();
                        }}
                        key={s.id}
                      >
                        <span className="selection-circle">
                          {selected === s.id && <Check size={12} />}
                        </span>
                        <span className="service-description">
                          <strong>{s.name}</strong>
                          <span>{s.description}</span>
                          <small>
                            {s.minutes} minutes · {s.provider_name}
                          </small>
                        </span>
                        <span className="service-price">
                          {money(s.price)}
                          {preview && <small>preview</small>}
                        </span>
                      </button>
                    ))}
                  </div>
                  <button
                    className="button button-gold next-button"
                    disabled={!service}
                    onClick={() => setStep(2)}
                  >
                    Find a time <ArrowRight size={18} />
                  </button>
                </div>
              )}
              {step === 2 && (
                <div className="step-content">
                  <button onClick={() => setStep(1)} className="back-link">
                    <ArrowLeft size={15} /> CHANGE SERVICE
                  </button>
                  <h2>
                    A moment <em>for you.</em>
                  </h2>
                  <p className="muted">Appointment times use {zone}.</p>
                  <div className="date-strip">
                    {days.map((d) => (
                      <button
                        key={d.toISODate()}
                        className={`date-button ${date === d.toISODate() ? "selected" : ""}`}
                        aria-pressed={date === d.toISODate()}
                        aria-label={d.toFormat("cccc, LLLL d")}
                        onClick={() => {
                          setDate(d.toISODate()!);
                          setStart("");
                        }}
                      >
                        <span>{d.toFormat("ccc")}</span>
                        <strong>{d.day}</strong>
                        <small>{d.toFormat("LLL")}</small>
                      </button>
                    ))}
                  </div>
                  <label className="date-picker">
                    Choose another date
                    <input
                      type="date"
                      value={date}
                      min={days[0]?.toISODate() || ""}
                      max={
                        DateTime.now()
                          .setZone(zone)
                          .plus({ days: 45 })
                          .toISODate() || ""
                      }
                      onChange={(e) => {
                        setDate(e.target.value);
                        setStart("");
                      }}
                    />
                  </label>
                  {loadingSlots ? (
                    <p className="loading-text">Finding available moments…</p>
                  ) : slots.length ? (
                    <div className="time-grid">
                      {slots.map((s) => (
                        <button
                          key={s.start}
                          className={start === s.start ? "selected" : ""}
                          aria-pressed={start === s.start}
                          onClick={() => {
                            setStart(s.start);
                            requestKey.current = crypto.randomUUID();
                          }}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-slots">
                      <CalendarDays />
                      <p>No times available on this day.</p>
                      <span className="muted">
                        Choose another date. Available days follow your
                        professional’s schedule.
                      </span>
                    </div>
                  )}
                  <button
                    className="button button-gold next-button"
                    disabled={!start || loadingSlots}
                    onClick={() => setStep(3)}
                  >
                    Continue <ArrowRight size={18} />
                  </button>
                </div>
              )}
              {step === 3 && (
                <div className="step-content">
                  <button onClick={() => setStep(2)} className="back-link">
                    <ArrowLeft size={15} /> CHANGE TIME
                  </button>
                  <h2>
                    Make it <em>yours.</em>
                  </h2>
                  <div className="review-visit">
                    <strong>
                      {service?.name} · {service?.provider_name}
                    </strong>
                    <span>
                      {start
                        ? DateTime.fromISO(start)
                            .setZone(zone)
                            .toFormat("ccc, LLL d · h:mm a ZZZZ")
                        : "Choose a time"}
                    </span>
                    <span>
                      {service?.minutes} minutes ·{" "}
                      {service ? money(service.price) : "—"}{" "}
                      {preview ? "illustrative total" : "service total"}
                    </span>
                  </div>
                  {actor ? (
                    <>
                      <div className="signed-in">
                        <Check size={18} />
                        <span>
                          Reserving as <strong>{actor.name}</strong>
                        </span>
                      </div>
                      <label className="field-label" htmlFor="visit-note">
                        Anything you’d like your provider to know?
                        <span>Optional · grooming preferences only</span>
                      </label>
                      <textarea
                        id="visit-note"
                        value={note}
                        onChange={(e) => {
                          setNote(e.target.value);
                          requestKey.current = crypto.randomUUID();
                        }}
                        maxLength={600}
                        placeholder="Your preferred finish, a style you have in mind, or how you wear your hair…"
                      />
                      <p className="muted small">
                        This note is shared with your provider and authorized
                        studio staff.
                      </p>
                      <div className="inline-note">
                        {preview
                          ? "This is a test booking with illustrative details."
                          : "Your appointment is saved with the service details shown."}{" "}
                        No deposit or payment will be collected online.
                      </div>
                      <button
                        className="button button-gold next-button"
                        disabled={busy || !service || !start || loadingSlots || !slots.some(slot => slot.start === start)}
                        onClick={reserve}
                      >
                        {busy
                          ? "Saving your visit…"
                          : preview
                            ? "Reserve preview visit"
                            : "Confirm appointment"}{" "}
                        <ArrowUpRight size={18} />
                      </button>
                    </>
                  ) : (
                    <div className="signin-card">
                      <LockKeyhole />
                      <h3>Your visits, kept together.</h3>
                      <p>
                        Sign in to save this appointment and manage your visits.
                      </p>
                      <Link
                        prefetch={false}
                        className="button button-gold"
                        href={`${identity?.signin || "/signin"}?next=${encodeURIComponent(returnPath)}`}
                      >
                        Continue to sign in <ArrowRight size={18} />
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          {error && <div className="booking-recovery"><p role="alert" className="error-message">{error}</p><div className="hero-actions">{!services.length ? <button className="button button-outline" onClick={() => setMenuRetry(n => n + 1)}>Reload service menu</button> : step === 2 ? <button className="button button-outline" onClick={() => setAvailabilityRetry(n => n + 1)}>Reload available times</button> : null}<Link className="text-link" href={identity?.visits || "/account"}>Check saved visits ↗</Link></div></div>}
        </div>
        <aside className="booking-summary">
          <p className="eyebrow">
            {identity
              ? `YOUR TIME WITH ${identity.founder.toUpperCase()}`
              : "YOUR TIME AT LEGACY RESERVE"}
          </p>
          <h3>
            A place in
            <br />
            <em>{houseName}.</em>
          </h3>
          <div className="summary-divider" />
          <p className="summary-service">
            {service?.name || "Choose your service"}
          </p>
          <div className="summary-row">
            <Clock size={16} />
            <span>
              {service
                ? `${service.minutes} minutes`
                : "Time, thoughtfully reserved"}
            </span>
          </div>
          <div className="summary-row">
            <CalendarDays size={16} />
            <span>
              {start
                ? DateTime.fromISO(start)
                    .setZone(zone)
                    .toFormat("ccc, LLL d · h:mm a ZZZZ")
                : "Find a moment that works for you"}
            </span>
          </div>
          <div className="summary-divider" />
          <div className="summary-total">
            <span>{preview ? "Illustrative total" : "Service total"}</span>
            <strong>{service ? money(service.price) : "—"}</strong>
          </div>
          <span className="small muted">No online payment is collected.</span>
          <p className="summary-signature">
            {identity?.name.toUpperCase() || "LEGACY RESERVE"} ·{" "}
            {houseName.toUpperCase()}
          </p>
        </aside>
      </div>
    </>
  );
}
