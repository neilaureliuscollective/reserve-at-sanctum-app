"use client";
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
import type { Service, Actor } from "@/lib/booking";
const zone = "America/Chicago";
const money = (c: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(c / 100);
type Slot = { start: string; label: string };
export function BookingFlow() {
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
  useEffect(() => {
    requestKey.current = crypto.randomUUID();
    const u = new URL(location.href);
    const today = DateTime.now().setZone(zone).plus({ days: 1 });
    setDate(u.searchParams.get("date") || today.toISODate()!);
    setSelected(u.searchParams.get("service") || "");
    setStart(u.searchParams.get("start") || "");
    if (u.searchParams.get("start")) setStep(3);
    const abort = new AbortController();
    Promise.all([
      fetch("/api/availability", { signal: abort.signal }).then((r) =>
        r.json(),
      ),
      fetch("/api/session", { signal: abort.signal }).then((r) => r.json()),
    ])
      .then(([c, s]) => {
        setServices(c.services || []);
        setActor(s.user);
        if (c.error) setError(c.error);
        else if (c.setupRequired || !c.services?.length)
          setError(
            "The service menu is being prepared. Booking is not open yet.",
          );
      })
      .catch((e) => {
        if (e.name !== "AbortError")
          setError("Unable to load the service menu. Please refresh.");
      })
      .finally(() => setLoading(false));
    return () => abort.abort();
  }, []);
  useEffect(() => {
    if (!selected || !date) return;
    const controller = new AbortController();
    setLoadingSlots(true);
    setError("");
    fetch(
      `/api/availability?service=${encodeURIComponent(selected)}&date=${date}`,
      { signal: controller.signal },
    )
      .then((r) => r.json())
      .then((d) => {
        setSlots(d.slots || []);
        if (d.error) setError(d.error);
      })
      .catch((e) => {
        if (e.name !== "AbortError")
          setError("Unable to load availability. Try another date.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingSlots(false);
      });
    return () => controller.abort();
  }, [selected, date]);
  const service = services.find((s) => s.id === selected);
  const days = Array.from({ length: 10 }, (_, i) =>
    DateTime.now()
      .setZone(zone)
      .plus({ days: i + 1 }),
  );
  async function reserve() {
    if (!service || !start) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selected,
          start,
          note,
          requestKey: requestKey.current,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setConfirmed(d.appointment.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const returnPath = `/book?service=${selected}&date=${date}&start=${encodeURIComponent(start)}`;
  if (confirmed)
    return (
      <section className="booking-success">
        <div className="success-icon">
          <Check size={32} />
        </div>
        <p className="eyebrow">PREVIEW VISIT RESERVED</p>
        <h1>
          Time set aside.
          <br />
          <em>Just for you.</em>
        </h1>
        <p>{service?.name} with Katie</p>
        <p className="success-time">
          {DateTime.fromISO(start)
            .setZone(zone)
            .toFormat("cccc, LLLL d · h:mm a")}{" "}
          CT
        </p>
        <p className="muted">
          Your test appointment is saved. No payment was taken and no
          notification was sent.
        </p>
        <div className="hero-actions">
          <Link href="/account" className="button button-gold">
            View your visits <ArrowUpRight size={18} />
          </Link>
          <Link href="/" className="text-link">
            Back to the Reserve
          </Link>
        </div>
        <p className="small muted">
          Reference {confirmed.slice(0, 8).toUpperCase()}
        </p>
      </section>
    );
  return (
    <>
      <div className="booking-heading">
        <p className="eyebrow">FIX IT SHOP · WITH KATIE</p>
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
                    What brings <em>you in?</em>
                  </h2>
                  <p className="muted">
                    Illustrative services for the private preview.
                  </p>
                  <div className="service-list">
                    {services.map((s) => (
                      <button
                        className={`service-option ${selected === s.id ? "selected" : ""}`}
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
                          <small>{s.minutes} minutes · with Katie</small>
                        </span>
                        <span className="service-price">
                          {money(s.price)}
                          <small>preview</small>
                        </span>
                      </button>
                    ))}
                  </div>
                  <button
                    className="button button-gold next-button"
                    disabled={!selected}
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
                  <p className="muted">
                    All appointments shown in Central Time.
                  </p>
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
                        Choose another date. Preview hours are Tuesday–Saturday.
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
                    <strong>{service?.name} · with Katie</strong>
                    <span>
                      {start
                        ? DateTime.fromISO(start)
                            .setZone(zone)
                            .toFormat("ccc, LLL d · h:mm a") + " CT"
                        : "Choose a time"}
                    </span>
                    <span>
                      {service?.minutes} minutes ·{" "}
                      {service ? money(service.price) : "—"} illustrative total
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
                        Anything you’d like Katie to know?
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
                        This note is shared with Katie and authorized studio
                        staff.
                      </p>
                      <div className="inline-note">
                        This is a test booking. The listed menu, prices, and
                        hours are illustrative. No deposit or payment will be
                        collected.
                      </div>
                      <button
                        className="button button-gold next-button"
                        disabled={busy || !service || !start}
                        onClick={reserve}
                      >
                        {busy ? "Saving your visit…" : "Reserve preview visit"}{" "}
                        <ArrowUpRight size={18} />
                      </button>
                    </>
                  ) : (
                    <div className="signin-card">
                      <LockKeyhole />
                      <h3>Your visits, kept together.</h3>
                      <p>
                        Sign in to save this preview appointment and manage your
                        visits.
                      </p>
                      <Link
                        className="button button-gold"
                        href={`/signin?next=${encodeURIComponent(returnPath)}`}
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
        </div>
        <aside className="booking-summary">
          <p className="eyebrow">YOUR TIME AT THE RESERVE</p>
          <h3>
            A place in
            <br />
            <em>Katie’s chair.</em>
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
            <span>Illustrative total</span>
            <strong>{service ? money(service.price) : "—"}</strong>
          </div>
          <span className="small muted">No charge in the private preview.</span>
          <p className="summary-signature">
            FIX IT SHOP <span>×</span> THE RESERVE
          </p>
        </aside>
      </div>
    </>
  );
}
