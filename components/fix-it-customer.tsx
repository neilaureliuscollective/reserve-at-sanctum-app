"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, CalendarPlus, CalendarDays, Smartphone } from "lucide-react";
import type { Appointment } from "@/lib/booking";
const base = "/fix-it-shop/app";
const items = [
  [base, "Home", Home],
  [base + "/book", "Book", CalendarPlus],
  [base + "/appointments", "My visits", CalendarDays],
  [base + "/install", "Phone setup", Smartphone],
] as const;
export function FixItCustomerNav() {
  const path = usePathname();
  return (
    <nav className="fix-it-nav" aria-label="Fix It Shop">
      {items.map(([href, label, Icon]) => (
        <Link
          key={href}
          href={href}
          aria-current={
            (href === base ? path === href : path.startsWith(href))
              ? "page"
              : undefined
          }
        >
          <Icon size={20} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
export function FixItNextVisit() {
  const [state, setState] = useState("loading"),
    [next, setNext] = useState<Appointment | null>(null);
  useEffect(() => {
    const c = new AbortController();
    let sequence = 0;
    async function load() {
      const request = ++sequence;
      try {
        const r = await fetch("/api/appointments?provider=katie", {
          cache: "no-store",
          signal: AbortSignal.any([c.signal, AbortSignal.timeout(10000)]),
        });
        if (request !== sequence) return;
        if (r.status === 401) {
          setNext(null);
          setState("guest");
          return;
        }
        if (!r.ok) throw Error();
        const d = await r.json();
        if (request !== sequence) return;
        const rows = (d.visits as Appointment[])
          .filter(
            (v) =>
              v.status === "confirmed" &&
              new Date(v.starts_at).getTime() > Date.now(),
          )
          .sort(
            (a, b) =>
              new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
          );
        setNext(d.hasMore ? null : rows[0] || null);
        setState("ready");
      } catch {
        if (!c.signal.aborted && request === sequence) {
          setNext(null);
          setState("error");
        }
      }
    }
    void load();
    const refresh = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener("focus", refresh);
    return () => {
      c.abort();
      window.removeEventListener("focus", refresh);
    };
  }, []);
  return (
    <section
      className="fix-it-next"
      aria-label="Your next visit"
      aria-live="polite"
    >
      <CalendarDays size={28} />
      <div>
        <p className="eyebrow">YOUR PERSONAL APPOINTMENT BOOK</p>
        <h2>
          {next
            ? "Your next visit."
            : state === "loading"
              ? "Opening your appointment book…"
              : "Make time for yourself."}
        </h2>
        <p>
          {next
            ? `${next.service_name} · ${new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeStyle: "short", timeZone: next.timezone || "America/Chicago" }).format(new Date(next.starts_at))}`
            : state === "guest"
              ? "Sign in to keep your visits with Katie together."
              : state === "error"
                ? "Your appointment book couldn’t refresh. Open My visits to try again."
                : "View your appointments or choose a time for your next visit."}
        </p>
      </div>
      <Link className="button button-outline" href={base + "/appointments"}>
        {next ? "Manage this visit" : "My visits"} ↗
      </Link>
    </section>
  );
}
