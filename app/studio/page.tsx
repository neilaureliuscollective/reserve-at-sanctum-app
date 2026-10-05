import { StudioRefresh } from "@/components/studio-refresh";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, Hammer, ShieldCheck } from "lucide-react";
import { studioActor } from "@/lib/studio-session";
import { database } from "@/lib/db";
import { studioOverview } from "@/lib/command-center";
export default async function StudioHome() {
  const actor = await studioActor(),
    owner = actor.role === "owner";
  const data = await studioOverview(await database(), actor);
  const next = data.nextVisit;
  const visitTime = next
    ? new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Chicago",
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(next.starts_at))
    : null;
  const work = data.work;
  return (
    <>
      <StudioRefresh />
      <header className="studio-title">
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
          ) : actor.role === "operator" ? (
            <>
              Katie’s <em>Studio.</em>
            </>
          ) : (
            <>
              Your <em>Studio.</em>
            </>
          )}
        </h1>
        <p>
          {owner
            ? "The business, in focus. Decisions, people, and the work that moves us forward."
            : "Your clients, your craft, and the work we’re shaping together."}
        </p>
      </header>
      <section className="studio-brief" aria-label="Today brief">
        <div>
          <p className="eyebrow">TODAY · BUSINESS BRIEF</p>
          <h2>
            {data.ready
              ? "A clear view of the day."
              : "The foundation is here."}
          </h2>
          <p>{data.brief}</p>
          <small>
            From saved business records · Updated{" "}
            {new Intl.DateTimeFormat("en-US", {
              timeZone: "America/Chicago",
              hour: "numeric",
              minute: "2-digit",
            }).format(new Date(data.refreshedAt!))}
          </small>
        </div>
        <Link
          href={data.ready ? "/studio/schedule" : "/studio/operations"}
          className="studio-orbit"
          aria-label={
            data.ready ? "Open today’s schedule" : "Review operation setup"
          }
        >
          <ArrowUpRight size={30} />
        </Link>
      </section>
      <div className="studio-columns">
        <section className="studio-section">
          <div className="studio-section-head">
            <p className="eyebrow">
              {owner ? "NEEDS YOUR ATTENTION" : "YOUR NEXT MOVES"}
            </p>
            <Link href="/studio/build">
              Open work <ArrowUpRight size={15} />
            </Link>
          </div>
          {!data.ready && (
            <Link className="studio-action-row" href="/studio/operations">
              <ShieldCheck />
              <div>
                <strong>Prepare the service operation</strong>
                <span>
                  Approved services and availability are not configured.
                </span>
              </div>
              <ArrowUpRight />
            </Link>
          )}
          {owner && data.operatorReady === false && (
            <Link className="studio-action-row" href="/studio/operations">
              <ShieldCheck />
              <div>
                <strong>Katie’s account is pending</strong>
                <span>Her confirmed account needs operator access.</span>
              </div>
              <ArrowUpRight />
            </Link>
          )}
          <Link className="studio-action-row" href="/studio/build?view=review">
            <Hammer />
            <div>
              <strong>
                {owner
                  ? `${work.pulse.needsReview} decisions awaiting review`
                  : "Work with Neil"}
              </strong>
              <span>
                {owner
                  ? "Review the exact work before approving."
                  : "Follow shared work and requests awaiting review."}
              </span>
            </div>
            <ArrowUpRight />
          </Link>
          <Link className="studio-action-row" href="/studio/schedule">
            <CalendarDays />
            <div>
              <strong>
                {data.ready
                  ? `${data.today} confirmed visits today`
                  : "Your schedule workspace"}
              </strong>
              <span>Appointments, availability, and the Chair.</span>
            </div>
            <ArrowUpRight />
          </Link>
          {owner && (
            <p className="studio-muted">
              Sales and payment intelligence will appear when commerce is
              connected.
            </p>
          )}
        </section>
        <section className="studio-section">
          <p className="eyebrow">NEXT CLIENT</p>
          {next ? (
            <>
              <h2>{String(next.client_name)}</h2>
              <p>
                {String(next.service_name)} · {visitTime}
              </p>
            </>
          ) : (
            <>
              <h2>
                {data.ready
                  ? "A little room to build."
                  : "Before the first visit."}
              </h2>
              <p>
                {data.ready
                  ? "No upcoming confirmed visit."
                  : "Your next client will appear here once booking is configured."}
              </p>
            </>
          )}
          <Link className="studio-inline" href="/studio/schedule">
            Open schedule <ArrowUpRight size={17} />
          </Link>
          <div className="studio-divider" />
          <p className="eyebrow">ACTIVE WORK</p>
          {work.items
            .filter((i) => !i.completed_at)
            .slice(0, 3)
            .map((i) => (
              <Link
                className="studio-work-line"
                href="/studio/build"
                key={i.id}
              >
                <span>{i.title}</span>
                <small>{i.status === "review" ? "With Neil" : i.status}</small>
              </Link>
            ))}
          {work.items.length === 0 && (
            <p>
              Capture an idea, a decision, or the next thing to make happen.
            </p>
          )}
          <Link className="button button-gold" href="/studio/build?capture=1">
            Capture something
          </Link>
        </section>
      </div>
      <section className="studio-section studio-history">
        <p className="eyebrow">
          {owner ? "RECENT BUSINESS ACTIVITY" : "SHARED ACTIVITY"}
        </p>
        {work.events.length ? (
          work.events.slice(0, 5).map((e) => (
            <div className="studio-event" key={String(e.id)}>
              <span>
                {String(e.actor_name)} · {String(e.action).replaceAll("_", " ")}
              </span>
              <small>{work.items.find((i) => i.id === e.item_id)?.title}</small>
            </div>
          ))
        ) : (
          <p>
            Your shared decisions and progress will appear here automatically.
          </p>
        )}
      </section>
    </>
  );
}
