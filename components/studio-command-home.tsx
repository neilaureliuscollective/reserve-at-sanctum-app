"use client";
import { useState } from "react";
import Link from "next/link";
import type { studioOverview } from "@/lib/command-center";
import { AetheliosOrb } from "./aethelios-orb";
import { useStudioAssistant } from "./studio-assistant";
type Data = Awaited<ReturnType<typeof studioOverview>>;
const views = ["Attention", "Work", "Activity"] as const;
export function StudioCommandHome({
  data,
  owner,
  operator,
}: {
  data: Data;
  owner: boolean;
  operator: boolean;
}) {
  const [view, setView] = useState(0),
    ask = useStudioAssistant();
  const work = data.work;
  return (
    <div className="command-world">
      <header className="command-heading">
        <p className="eyebrow">
          {owner
            ? "THE RESERVE · FOUNDER’S OFFICE"
            : "FIX IT SHOP · YOUR WORKING WORLD"}
        </p>
        <h1>
          {owner ? (
            <>
              Reserve <em>Command.</em>
            </>
          ) : operator ? (
            <>
              Katie’s <em>Studio.</em>
            </>
          ) : (
            <>
              Your <em>Studio.</em>
            </>
          )}
        </h1>
      </header>
      <section className="command-center" aria-label="Business focus">
        <button
          className="command-intelligence"
          onClick={() => ask()}
          aria-label="Open Aethelios"
        >
          <AetheliosOrb />
          <span>AETHELIOS</span>
          <small>Think. Create. Move forward.</small>
        </button>
        <div className="command-pulse">
          <p className="eyebrow">THE DAY, IN FOCUS</p>
          <h2>{data.ready ? "A clear view." : "Before the doors open."}</h2>
          <p>{data.brief}</p>
          <div className="command-signals">
            <span>
              <strong>{data.today}</strong>Visits today
            </span>
            <span>
              <strong>{work.pulse.openBuild}</strong>Open work
            </span>
            <span>
              <strong>{work.pulse.needsReview}</strong>For review
            </span>
          </div>
          <Link className="button button-gold" href="/studio/content">
            Create something
          </Link>
        </div>
      </section>
      <section className="command-focus">
        <div className="command-tabs" role="tablist" aria-label="Command views">
          {views.map((label, i) => (
            <button
              key={label}
              role="tab"
              id={`command-tab-${i}`}
              aria-controls="command-panel"
              aria-selected={i === view}
              tabIndex={i === view ? 0 : -1}
              onClick={() => setView(i)}
              onKeyDown={(e) => {
                let next = i;
                if (e.key === "ArrowRight") next = (i + 1) % 3;
                else if (e.key === "ArrowLeft") next = (i + 2) % 3;
                else if (e.key === "Home") next = 0;
                else if (e.key === "End") next = 2;
                else return;
                e.preventDefault();
                setView(next);
                document.getElementById(`command-tab-${next}`)?.focus();
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div
          id="command-panel"
          role="tabpanel"
          aria-labelledby={`command-tab-${view}`}
          tabIndex={0}
        >
          {view === 0 ? (
            <>
              {!data.ready ? (
                <Link className="studio-action-row" href="/studio/operations">
                  <div>
                    <strong>Prepare the service operation</strong>
                    <span>
                      Approve services and availability before opening.
                    </span>
                  </div>
                  <span>↗</span>
                </Link>
              ) : null}
              {owner && !data.operatorReady ? (
                <Link className="studio-action-row" href="/studio/operations">
                  <div>
                    <strong>Katie’s account is pending</strong>
                    <span>Her confirmed account needs operator access.</span>
                  </div>
                  <span>↗</span>
                </Link>
              ) : null}
              <Link
                className="studio-action-row"
                href="/studio/build?view=review"
              >
                <div>
                  <strong>
                    {owner
                      ? `${work.pulse.needsReview} decisions awaiting review`
                      : "Work with Neil"}
                  </strong>
                  <span>Shared work, reviewed at the exact revision.</span>
                </div>
                <span>↗</span>
              </Link>
              <Link className="studio-action-row" href="/studio/schedule">
                <div>
                  <strong>
                    {data.nextVisit
                      ? String(data.nextVisit.client_name)
                      : "Your next client"}
                  </strong>
                  <span>
                    {data.nextVisit
                      ? `${String(data.nextVisit.service_name)} · ${new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", dateStyle: "medium", timeStyle: "short" }).format(new Date(data.nextVisit.starts_at))}`
                      : "No upcoming confirmed visit."}
                  </span>
                </div>
                <span>↗</span>
              </Link>
            </>
          ) : view === 1 ? (
            <>
              {work.items
                .filter((i) => !i.completed_at)
                .slice(0, 4)
                .map((i) => (
                  <Link
                    className="studio-work-line"
                    key={i.id}
                    href={
                      i.kind === "content"
                        ? `/studio/content?id=${encodeURIComponent(i.id)}`
                        : "/studio/build"
                    }
                  >
                    <span>{i.title}</span>
                    <small>{i.status}</small>
                  </Link>
                ))}
              {!work.items.length ? (
                <p className="studio-muted">
                  Room to build. Capture your next move.
                </p>
              ) : null}
              <Link className="studio-inline" href="/studio/build?capture=1">
                Capture a next move ↗
              </Link>
            </>
          ) : (
            <>
              {work.events.slice(0, 4).map((e) => (
                <div className="studio-event" key={String(e.id)}>
                  <span>
                    {String(e.actor_name)} ·{" "}
                    {String(e.action).replaceAll("_", " ")}
                  </span>
                </div>
              ))}
              {!work.events.length ? (
                <p className="studio-muted">
                  Shared progress will appear here.
                </p>
              ) : null}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
