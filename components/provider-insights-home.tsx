"use client";
import { serviceLocationLabel } from "@/lib/experience/locations";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { DateTime } from "luxon";
import { RefreshCw, ArrowUpRight } from "lucide-react";
import type { ProviderInsights } from "@/lib/provider-insights";

export function ProviderInsightsHome({
  providerId,
  preview,
  canManage,
}: {
  providerId: string;
  preview: boolean;
  canManage: boolean;
}) {
  const [data, setData] = useState<ProviderInsights | null>(null),
    [days, setDays] = useState(30),
    [location, setLocation] = useState(""),
    [page, setPage] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
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
      const p = new URLSearchParams({
        provider: providerId,
        days: String(days),
        page: String(page),
      });
      if (location) p.set("location", location);
      const r = await fetch("/api/studio/insights?" + p, {
        cache: "no-store",
        signal: AbortSignal.any([c.signal, AbortSignal.timeout(12000)]),
      });
      const d = await r.json();
      if (id !== sequence.current) return;
      if (!r.ok) throw Error(d.error || "Insights couldn’t refresh.");
      setData(d);
    } catch (e) {
      if (!c.signal.aborted && id === sequence.current) {
        setData(null);
        setError(
          (e as Error).name === "TimeoutError"
            ? "Insights couldn’t refresh. Try again."
            : (e as Error).message,
        );
      }
    } finally {
      if (id === sequence.current) setLoading(false);
    }
  }, [providerId, days, location, page]);
  useEffect(() => {
    void load();
    const refresh = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("booking-updated", refresh);
    return () => {
      abort.current?.abort();
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("booking-updated", refresh);
    };
  }, [load]);
  const date = (s: string) =>
    DateTime.fromISO(s)
      .setZone(data?.location.timezone || "America/Chicago")
      .toFormat("MMM d, yyyy");
  return (
    <div className="provider-day provider-insights">
      <Link className="studio-inline" href="/studio/today">
        ← Your working day
      </Link>
      <header className="provider-day-heading">
        <div>
          <p className="eyebrow">
            {providerId === "katie"
              ? "FIX IT SHOP · CLIENT CONTINUITY"
              : "YOUR STUDIO · CLIENT CONTINUITY"}
          </p>
          <h1>
            Good work.
            <br />
            <em>Lasting relationships.</em>
          </h1>
          <p>A clear view of visits and who has their next one booked.</p>
        </div>
      </header>
      {preview && (
        <p className="preview-workspace">
          Development preview · synthetic clients and appointments only.
        </p>
      )}
      <div className="provider-day-controls">
        <label>
          Visit window
          <select
            value={days}
            onChange={(e) => {
              setDays(Number(e.target.value));
              setPage(0);
            }}
          >
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </label>
        <label>
          Location
          <select
            value={location || data?.location.id || ""}
            onChange={(e) => {
              setLocation(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Assigned location</option>
            {data?.locations.map((l) => (
              <option key={l.id} value={l.id}>
                {serviceLocationLabel(l.name)}
              </option>
            ))}
          </select>
        </label>
        <button
          className="button button-outline"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw size={18} />
          Refresh insights
        </button>
      </div>
      {loading ? (
        <p role="status" className="provider-day-empty">
          Reading your saved visits…
        </p>
      ) : error ? (
        <section className="provider-day-empty" role="alert">
          <h2>Insights couldn’t load.</h2>
          <p>{error}</p>
          <button className="button button-gold" onClick={() => void load()}>
            Try again
          </button>
        </section>
      ) : (
        data && (
          <>
            <p className="insights-period">
              {serviceLocationLabel(data.location.name)} · {data.from} through {date(data.asOf)} ·
              Updated{" "}
              {DateTime.fromISO(data.asOf)
                .setZone(data.location.timezone)
                .toFormat("h:mm a")}{" "}
              ({data.location.timezone}). Today is partial.
            </p>
            <section
              className="provider-day-stats insights-stats"
              aria-label="Visit insights"
            >
              <div>
                <span>Completed visits</span>
                <strong>{data.metrics.completed}</strong>
                <small>Marked completed, with end time passed</small>
              </div>
              <div>
                <span>Clients served</span>
                <strong>{data.metrics.clients}</strong>
                <small>Distinct linked clients in this window</small>
              </div>
              <div>
                <span>Returning clients</span>
                <strong>{data.metrics.returning}</strong>
                <small>Had an earlier completed visit with you</small>
              </div>
              <div>
                <span>Next visit booked</span>
                <strong>
                  {data.rebookedPercent === null
                    ? "—"
                    : data.rebookedPercent + "%"}
                </strong>
                <small>
                  {data.metrics.rebooked} of {data.metrics.clients} served
                  clients
                </small>
              </div>
            </section>
            <div className="insights-detail-strip">
              <p>
                <strong>{data.metrics.upcoming}</strong> confirmed visits in the
                next 30 days here
              </p>
              <p>
                <strong>{data.metrics.cancelled}</strong> cancelled visits
                scheduled in this window
              </p>
              <p>
                <strong>{(data.metrics.minutes / 60).toFixed(1)}</strong>{" "}
                completed appointment hours
              </p>
            </div>
            <section className="studio-section insights-followup">
              <div className="studio-section-head">
                <div>
                  <p className="eyebrow">KEEP THE RELATIONSHIP MOVING</p>
                  <h2>Without a next visit.</h2>
                </div>
                <span className="status">{data.metrics.followUp} clients</span>
              </div>
              <p>
                Clients with a completed visit here in this window and no future
                confirmed appointment with you at any location. Review their
                history before a personal conversation. This list sends no
                messages.
              </p>
              {!data.followUp.length && (
                <div className="provider-day-empty">
                  {data.metrics.clients === 0
                    ? "No completed client visits in this window yet. Insights will build from saved appointments."
                    : page > 0
                      ? "No clients on this page. Go back to the previous page."
                      : "Every client served in this window has a future confirmed appointment with you."}
                </div>
              )}
              {data.followUp.map((c) => (
                <article className="insights-client" key={c.id}>
                  <div>
                    <Link href={"/studio/clients/" + encodeURIComponent(c.id)}>
                      {c.name} <ArrowUpRight size={16} />
                    </Link>
                    <p>
                      {c.service_name} · Last completed visit{" "}
                      {date(c.last_visit)}
                    </p>
                    <small>
                      {c.visits} completed {c.visits === 1 ? "visit" : "visits"}{" "}
                      in this window
                    </small>
                  </div>
                  <Link
                    className="button button-outline"
                    href={"/studio/clients/" + encodeURIComponent(c.id)}
                  >
                    Review client
                  </Link>
                </article>
              ))}
              <div className="studio-pagination">
                {page > 0 && (
                  <button
                    className="button button-outline"
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous clients
                  </button>
                )}
                {data.hasMore && (
                  <button
                    className="button button-outline"
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next clients
                  </button>
                )}
              </div>
              {canManage && (
                <Link
                  className="studio-inline"
                  href={
                    "/studio/schedule?" +
                    new URLSearchParams({
                      provider: providerId,
                      location: data.location.id,
                      add: "1",
                    }) +
                    "#manual-booking"
                  }
                >
                  Arrange a next visit ↗
                </Link>
              )}
            </section>
            <details className="studio-section insights-definitions">
              <summary>How these numbers work</summary>
              <p>
                Visits use this location’s calendar days. Completed visits must
                be marked completed and have ended; an elapsed confirmed booking
                is not proof of attendance. Hours are the scheduled duration of
                those completed visits, not time-clock or payment data.
              </p>
              <p>
                Returning clients had a completed visit with this provider
                before their first completed visit in the selected window, at
                any location. Next visit booked counts served clients with any
                future confirmed visit with this provider, at any location; it
                measures current booking coverage, not realized retention or
                same-day rebooking.
              </p>
              <p>
                Only explicitly linked account/contact identities are combined.
                Unlinked duplicate contacts remain separate. Cancelling a future
                visit removes it from booking coverage. Payments and product
                sales are not included in this view.
              </p>
            </details>
          </>
        )
      )}
    </div>
  );
}
