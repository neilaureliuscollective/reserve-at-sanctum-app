import Link from "next/link";
import { redirect } from "next/navigation";
import { DateTime } from "luxon";
import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { memberRead } from "@/lib/experience/member";
import { membershipDesk, membershipState } from "@/lib/membership";
import { MemberShell } from "@/components/experience/member-shell";
import { MembershipRequest } from "@/components/experience/membership-request";
import {
  memberRequest,
  membershipPrivileges,
} from "@/lib/membership-operations";
export const dynamic = "force-dynamic";
export const metadata = { title: "Membership" };
export default async function MembershipPage() {
  const actor = await currentUser();
  if (actor && actor.role !== "client") redirect("/studio");
  const desk = await memberRead(async () => {
    const db = await database();
    const [summary, request] = await Promise.all([
      membershipDesk(db, actor),
      actor ? memberRequest(db, actor) : Promise.resolve(null),
    ]);
    return { ...summary, request };
  });
  const member = desk.data?.membership;
  const plan = desk.data?.plans.find((p) => p.id === member?.plan_id);
  const state = membershipState(member ?? null);
  const privileges = membershipPrivileges(
    member ?? null,
    plan,
    Boolean(member?.location_enabled),
    Boolean(member?.location_booking_enabled),
  );
  const date = (v: string | Date) =>
    DateTime.fromJSDate(new Date(v))
      .setZone(member?.location_timezone ?? "America/Chicago")
      .toFormat("LLLL d, yyyy");
  return (
    <MemberShell
      kicker="LEGACY RESERVE · MEMBERSHIP"
      title="Belong with purpose."
      intro="Your membership, its privileges, and your relationship with the house."
    >
      <section className="member-focus" aria-labelledby="membership-title">
        <p className="experience-kicker">
          {desk.state === "unavailable"
            ? "UNABLE TO REFRESH"
            : member
              ? state.toUpperCase()
              : desk.data?.offered
                ? "ACCESS BY INVITATION"
                : "IN PREPARATION"}
        </p>
        <h2 id="membership-title">
          {desk.state === "unavailable"
            ? "Your membership could not refresh."
            : member
              ? member.plan_name
              : desk.data?.offered
                ? "Membership access is open."
                : "House membership is being prepared."}
        </h2>
        <p>
          {desk.state === "unavailable"
            ? "Your records have not changed. Please try again."
            : member
              ? `Your membership is ${state}${member.location_name ? ` at Legacy Reserve — ${member.location_name}` : ""}.`
              : desk.data?.offered
                ? "Explore the published complimentary plans below and request access for the house to review."
                : "There is no paid membership offer to join yet. Your account already gives you a place to keep visits and preferences together."}
        </p>
        {member && (
          <dl className="member-details">
            <div>
              <dt>Access</dt>
              <dd>
                {member.access_basis === "complimentary"
                  ? "Complimentary membership"
                  : "Membership record"}
              </dd>
            </div>
            {member.starts_at && (
              <div>
                <dt>Starts</dt>
                <dd>{date(member.starts_at)}</dd>
              </div>
            )}
            {member.ends_at && (
              <div>
                <dt>Ends</dt>
                <dd>{date(member.ends_at)}</dd>
              </div>
            )}
          </dl>
        )}
        {desk.state === "unavailable" ? (
          <Link href="/membership" className="button button-gold">
            Try again ↗
          </Link>
        ) : !actor ? (
          <Link href="/signin?next=/membership" className="button button-gold">
            Sign in to your Reserve ↗
          </Link>
        ) : (
          <Link href="/my-reserve" className="text-link">
            Open My Reserve ↗
          </Link>
        )}
      </section>
      {member && privileges.length > 0 && (
        <section className="member-line member-benefits">
          <div>
            <p className="experience-kicker">PLAN DETAILS</p>
            <h2>Your membership benefits.</h2>
            <p>
              {member.access_basis === "complimentary"
                ? "These privileges were recorded when your access was granted. No recurring payment is attached."
                : "Your recorded privileges and their current availability."}
            </p>
            <ul className="membership-privileges">
              {privileges.map((b, i) => (
                <li key={i}>
                  <div>
                    <strong>{b.label}</strong>
                    <span>
                      {b.state === "available"
                        ? "Available"
                        : b.state === "planned"
                          ? "In preparation"
                          : b.state === "house_unavailable"
                            ? "House access unavailable"
                            : "Requires active membership"}
                    </span>
                  </div>
                  {b.href && (
                    <Link className="text-link" href={b.href}>
                      Open ↗<span className="sr-only"> {b.label}</span>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
      {!member &&
        desk.state === "ready" &&
        desk.data.plans.some((p) => p.active) && (
          <section className="member-line">
            <div>
              <p className="experience-kicker">THE MEMBERSHIP OFFER</p>
              <h2>Access by invitation.</h2>
              <p>
                Published plans are complimentary at this stage. Request access
                for the house to review.
              </p>
              {desk.data.plans
                .filter((p) => p.active)
                .map((p) => (
                  <article key={p.id} className="membership-offer">
                    <h3>{p.name}</h3>
                    <p>{p.tagline}</p>
                    <ul>
                      {p.benefit_model.map((b, i) => (
                        <li key={i}>
                          {b.label} ·{" "}
                          {b.availability === "available"
                            ? "Available when eligible"
                            : "In preparation"}
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
            </div>
          </section>
        )}
      {actor && desk.state === "ready" && (
        <MembershipRequest request={desk.data.request} />
      )}
      <section className="member-line">
        <div>
          <p className="experience-kicker">THE ONGOING RELATIONSHIP</p>
          <h2>Beyond the appointment.</h2>
          <p>
            Your Reserve keeps visits, preferences, and membership together.
            Current privileges appear above; product pricing, service benefits,
            and partner access will be added as they become available.
          </p>
        </div>
        <Link href="/home" className="text-link">
          Return Home ↗
        </Link>
      </section>
    </MemberShell>
  );
}
