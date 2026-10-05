import Link from "next/link";
import { studioActor } from "@/lib/studio-session";
import { database } from "@/lib/db";
import { studioOverview } from "@/lib/command-center";
export default async function Operations() {
  const actor = await studioActor();
  const owner = actor.role === "owner";
  const data = await studioOverview(await database(), actor);
  return (
    <>
      <header className="studio-title">
        <p className="eyebrow">{owner ? "OPERATIONS" : "YOUR AVAILABILITY"}</p>
        <h1>
          {owner ? (
            <>
              Ready to <em>operate.</em>
            </>
          ) : (
            <>
              Space for <em>the day.</em>
            </>
          )}
        </h1>
        <p>
          {owner
            ? "A clear picture of what is ready and what needs a decision."
            : "Manage your time through the shared Reserve schedule."}
        </p>
      </header>
      <section className="studio-section">
        <p className="eyebrow">SERVICE READINESS</p>
        <div className="studio-status-row">
          <span>Enabled providers</span>
          <strong>{data.setup?.providers ?? "Unavailable"}</strong>
        </div>
        <div className="studio-status-row">
          <span>Approved, enabled services</span>
          <strong>{data.setup?.services ?? "Unavailable"}</strong>
        </div>
        {owner && (
          <div className="studio-status-row">
            <span>Katie’s operator account</span>
            <strong>
              {data.operatorReady ? "Assigned" : "Pending verified account"}
            </strong>
          </div>
        )}
        <p>
          {data.ready
            ? "Services are enabled. Keep the actual menu and availability reviewed."
            : "The service operation remains closed until actual services, prices, durations, and hours are approved and configured."}
        </p>
        <Link
          className="button button-gold"
          href="/studio/schedule#availability"
        >
          Manage time blocks
        </Link>
      </section>
      {owner && (
        <section className="studio-section">
          <p className="eyebrow">AUTHORITY & CONNECTIONS</p>
          <h2>Your authority stays with you.</h2>
          <p>
            Katie can run her schedule, work with clients, and create shared
            work. Protected decisions require your approval. Future staff have
            assigned work and provider scope.
          </p>
          <p>
            Pricing, company finances, spending, publishing, and permission
            administration remain owner-controlled. No automated spending or
            publishing is connected.
          </p>
          <p className="studio-muted">
            Katie must sign in with her confirmed account before operator access
            can be assigned. No invitation or credentials have been created.
          </p>
        </section>
      )}
    </>
  );
}
