"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ConciergeReply } from "@/lib/member-concierge";
type Turn = {
  id: number;
  question: string;
  reply?: ConciergeReply;
  error?: string;
};
export function MemberConcierge() {
  const [turns, setTurns] = useState<Turn[]>([]),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const [location, setLocation] = useState(""),
    [service, setService] = useState(""),
    [date, setDate] = useState("");
  const path = usePathname();
  useEffect(() => {
    if (path !== "/aethelios") {
      setTurns([]);
      setMessage("");
      setDate("");
    }
  }, [path]);
  useEffect(() => {
    const clear = () => {
      setTurns([]);
      setMessage("");
      setDate("");
    };
    window.addEventListener("pagehide", clear);
    return () => window.removeEventListener("pagehide", clear);
  }, []);
  const end = useRef<HTMLDivElement>(null),
    input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (turns.length)
      end.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "nearest",
      });
  }, [turns, busy]);
  const booking = [...turns].reverse().find((t) => t.reply?.booking)
    ?.reply?.booking;
  async function send(text = message, fields: object = {}) {
    if (busy || !text.trim()) return;
    setBusy(true);
    setMessage("");
    const id = Date.now();
    setTurns((t) => [...t, { id, question: text }].slice(-20));
    try {
      const res = await fetch("/api/aethelios/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, ...fields }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Please try again.");
      setTurns((t) =>
        t.map((turn) => (turn.id === id ? { ...turn, reply: data } : turn)),
      );
      if (data.booking?.locations.length) {
        setLocation(data.booking.locations[0].id);
        setService(
          data.booking.services.find(
            (s: { locationId: string }) =>
              s.locationId === data.booking.locations[0].id,
          )?.id ?? "",
        );
      }
    } catch (e) {
      setTurns((t) =>
        t.map((turn) =>
          turn.id === id
            ? {
                ...turn,
                error: e instanceof Error ? e.message : "Please try again.",
              }
            : turn,
        ),
      );
    } finally {
      setBusy(false);
      input.current?.focus();
    }
  }
  return (
    <main id="main" className="reserve-concierge">
      <header className="concierge-opening">
        <div className="concierge-orb" aria-hidden="true" />
        <p className="experience-kicker">
          AETHELIOS · YOUR LEGACY RESERVE CONCIERGE
        </p>
        <h1>A considered next step.</h1>
        <p>Your membership. Your routine. Your time at Sanctum.</p>
        <small>
          This conversation stays in this page session and is cleared when you
          leave or reload. Saved routines are managed separately in Pathways.
          When general AI conversation is enabled, your message and saved
          routine may be sent to the AI provider. Avoid sharing sensitive health
          information.
        </small>
      </header>
      <div className="concierge-suggestions" aria-label="Conversation starters">
        {[
          "What benefits do I have?",
          "Find an appointment",
          "Help me build a workout routine",
          "Explore grooming products",
        ].map((s) => (
          <button key={s} disabled={busy} onClick={() => void send(s)}>
            {s} ↗
          </button>
        ))}
      </div>
      <section
        className="concierge-thread"
        aria-label="Conversation"
        aria-live="polite"
      >
        {turns.map((t) => (
          <article key={t.id}>
            <p className="concierge-question">
              <span>You</span>
              {t.question}
            </p>
            {t.reply ? (
              <div className="concierge-answer">
                <span>
                  Aethelios ·{" "}
                  {t.reply.mode === "verified"
                    ? "Verified tools"
                    : t.reply.mode === "education"
                      ? "Education"
                      : "General guidance"}
                </span>
                <p>{t.reply.text}</p>
                {t.reply.routine && (
                  <ol>
                    {t.reply.routine.steps.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                )}
                <div className="concierge-links">
                  {t.reply.links.map((l) => (
                    <Link key={l.href} href={l.href}>
                      {l.label} ↗
                    </Link>
                  ))}
                </div>
              </div>
            ) : t.error ? (
              <p role="alert" className="reserve-notice">
                {t.error}
              </p>
            ) : (
              <p className="reserve-notice">Checking your next step…</p>
            )}
          </article>
        ))}
      </section>
      {booking && booking.locations.length > 0 && (
        <form
          className="concierge-booking"
          onSubmit={(e) => {
            e.preventDefault();
            void send("Check appointment availability", {
              locationId: location,
              serviceId: service,
              date,
            });
          }}
        >
          <h2>Choose an exact date.</h2>
          <label>
            Sanctum
            <select
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setService(
                  booking.services.find((s) => s.locationId === e.target.value)
                    ?.id ?? "",
                );
              }}
            >
              {booking.locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
          <p className="reserve-field-note">
            Times use{" "}
            {booking.locations.find((l) => l.id === location)?.timezone}.
          </p>
          <label>
            Service
            <select
              required
              value={service}
              onChange={(e) => setService(e.target.value)}
            >
              {booking.services
                .filter((s) => s.locationId === location)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Date
            <input
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <button disabled={busy || !service} className="button button-outline">
            Check available times
          </button>
        </form>
      )}
      <div ref={end} />
      <form
        className="concierge-compose"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <label htmlFor="concierge-message">Ask Aethelios</label>
        <textarea
          ref={input}
          id="concierge-message"
          rows={2}
          maxLength={2000}
          placeholder="What would you like to work on?"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          disabled={busy}
        />
        <div>
          <small>
            Appointments and purchases require your confirmation. Medical
            decisions stay with licensed providers.
          </small>
          <button
            className="button button-gold"
            disabled={busy || !message.trim()}
          >
            {busy ? "Thinking…" : "Send ↗"}
          </button>
        </div>
      </form>
    </main>
  );
}
