"use client";
import { useEffect, useState } from "react";
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
import { useBookingSubmission } from "./use-booking-submission";
import { bookingNotificationCopy } from "@/lib/booking-confirmation";
import { fixItBooking } from "@/lib/fix-it-booking";
import { FixItBookingFallback } from "./fix-it-booking-fallback";
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
  nativeKatieCalendar = false,
}: {
  preview?: boolean;
  identity?: BookingIdentity;
  nativeKatieCalendar?: boolean;
}) {
  const bookPath = identity?.book || "/book";
  const [nativeCalendar, setNativeCalendar] = useState(nativeKatieCalendar);
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
    [catalogUnavailable, setCatalogUnavailable] = useState(false),
    [availabilityUnavailable, setAvailabilityUnavailable] = useState(false);
  const submission = useBookingSubmission(actor, !loading);
  const busy = submission.phase !== "ready";
  const saved = submission.outcome?.appointment;
  const confirmed = saved?.id;
  const katieJourney = identity?.providerId === fixItBooking.providerId || provider === "katie" || (!identity && !provider);
  useEffect(() => {
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
      fetch(`/api/availability?location=${encodeURIComponent(locationId)}`, {
        signal: abort.signal,
      }).then((r) => r.json()),
      fetch("/api/session", { signal: abort.signal }).then((r) => r.json()),
      fetch("/api/locations", { signal: abort.signal }).then((r) => r.json()),
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
        if (typeof c.katieNativeCalendar === "boolean") setNativeCalendar(c.katieNativeCalendar);
        setCatalogUnavailable(Boolean(c.error || c.setupRequired || !visible.length));
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
        if (active) {
          setCatalogUnavailable(true);
          setError("Unable to load the service menu. Refresh to try again.");
        }
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
  }, []);
  useEffect(() => {
    if (!selected || !date) return;
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 12000);
    setLoadingSlots(true);
    setAvailabilityUnavailable(false);
    setSlots([]);
    setError("");
    fetch(
      `/api/availability?service=${encodeURIComponent(selected)}&date=${date}&location=${encodeURIComponent(house)}`,
      { signal: controller.signal },
    )
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        setSlots(d.slots || []);
        if (d.error) { setError(d.error); setAvailabilityUnavailable(true); }
      })
      .catch((e) => {
        if (active) { setError("Unable to load availability. Try another date."); setAvailabilityUnavailable(true); }
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
  }, [selected, date, house]);
  const service = services.find((s) => s.id === selected);
  const days = Array.from({ length: 10 }, (_, i) =>
    DateTime.now()
      .setZone(zone)
      .plus({ days: i + 1 }),
  );
  async function reserve() {
    if (!service || !start) return;
    setError("");
    await submission.submit({locationId:house, serviceId:selected, start, note});
  }
  const returnPath = `${bookPath}?location=${encodeURIComponent(house)}&provider=${encodeURIComponent(provider)}&service=${selected}&date=${date}&start=${encodeURIComponent(start)}`;
  if (confirmed)
    return (
      <section className="booking-success">
        <div className="success-icon">
          <Check size={32} />
        </div>
        <p className="eyebrow">
          {saved?.status === "confirmed" ? (preview ? "PREVIEW VISIT RESERVED" : "APPOINTMENT RESERVED") : "SAVED VISIT · " + saved?.status.toUpperCase()}
        </p>
        <h1>
          {saved?.status === "confirmed" ? <>Time set aside.<br /><em>Just for you.</em></> : <>Your saved visit.<br /><em>Current status: {saved?.status}.</em></>}
        </h1>
        <p>
          {saved?.service_name || service?.name} with {saved?.provider_name || service?.provider_name}
        </p>
        <p className="muted">{Math.round((new Date(saved!.ends_at).getTime() - new Date(saved!.starts_at).getTime()) / 60000)} minutes · {money(saved!.price)}</p>
        <p className="success-time">
          {DateTime.fromISO(String(saved?.starts_at || start))
            .setZone(saved?.timezone || zone)
            .toFormat("cccc, LLLL d · h:mm a ZZZZ")}
        </p>
        <p className="muted">
          {preview ? "Your test appointment" : "Your appointment"} is saved. No
          payment was taken online. {identity?.providerId === "katie" || service?.provider_id === "katie" ? "Payment is arranged separately after your visit." : "Payment arrangements are separate."}
        </p>
        <p className="muted" data-notification-status={submission.outcome?.notification}>
          {bookingNotificationCopy(submission.outcome?.notification)}
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
          <Link href={identity?.base || "/fix-it-shop/app"} className="text-link">
            {identity ? `Back to ${identity.name}` : "Back to Fix It Shop"}
          </Link>
        </div>
        <p className="small muted">
          Reference {confirmed.slice(0, 8).toUpperCase()}
        </p>
        <p>
          <button className="text-link" onClick={() => { submission.newBooking(); setSelected(""); setStart(""); setNote(""); setStep(1); }}>Book another visit</button>
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
          : "← Choose your professional"}
      </Link>
      <div className="booking-heading">
        <p className="eyebrow">
          {identity
            ? `${identity.name} · ${identity.founder}`.toUpperCase()
            : `FIX IT SHOP — ${houseName.toUpperCase()}`}
        </p>
        <h1>
          Make time <em>for yourself.</em>
        </h1>
        <p>A few thoughtful details. A visit that feels like yours.</p>
      </div>
      {submission.phase !== "ready" && !loading && <section className="inline-note booking-status-panel" aria-label="Booking request recovery">
        <p role="status">{submission.phase === "checking" ? "Checking your booking request…" : submission.phase === "signin" ? "Your session expired. Sign in to check whether your appointment was saved before booking again." : submission.phase === "different-account" ? "A booking request belongs to a different signed-in account. Return to that account to check it before booking again." : "Your booking outcome is still unknown."}</p>
        {submission.phase !== "checking" && <button className="button button-outline" onClick={() => void submission.recover()}>Check booking request</button>}
        {["signin", "different-account"].includes(submission.phase) && <a className="button button-gold" href={`${identity?.signin || "/signin"}?next=${encodeURIComponent(bookPath)}`}>Sign in to recover booking</a>}
        <Link className="text-link" href={identity?.visits || "/account"}>Check my appointments</Link>
      </section>}
      {submission.message && <p role="status" className="inline-note">{submission.message}</p>}
      {!loading && (catalogUnavailable || availabilityUnavailable) && submission.phase === "ready" && (katieJourney ? <FixItBookingFallback nativeCalendar={nativeCalendar} /> : <p role="status" className="inline-note">Booking is temporarily unavailable. Check your appointments or contact your professional before trying again.</p>)}
      {(!catalogUnavailable || busy) && <div className="booking-layout">
        <fieldset disabled={busy} className="booking-main" style={{border:0, padding:0, margin:0, minWidth:0}}>
          <ol className="steps" aria-label="Booking progress">
            {["Your service", "Your time", "Your visit"].map((label, i) => (
              <li
                className={
                  step === i + 1 ? "current" : step > i + 1 ? "done" : ""
                }
                key={label}
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
                        onClick={() => {
                          setSelected(s.id);
                          setStart("");
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
                          onClick={() => {
                            setStart(s.start);
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
                            .toFormat("ccc, LLL d · h:mm a") + " CT"
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
                        data-booking-submit
                        className="button button-gold next-button"
                        disabled={busy || !service || !start}
                        onClick={reserve}
                      >
                        {busy
                          ? submission.phase === "checking" ? "Checking your visit…" : "Resolve your booking request above"
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
          {error && (
            <p role="alert" className="error-message">
              {error}
            </p>
          )}
        </fieldset>
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
                    .toFormat("ccc, LLL d · h:mm a") + " CT"
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
      </div>}
    </>
  );
}
