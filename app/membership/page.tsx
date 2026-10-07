import Link from "next/link";
import { redirect } from "next/navigation";
import { DateTime } from "luxon";
import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { memberRead } from "@/lib/experience/member";
import { membershipDesk, membershipState } from "@/lib/membership";
import { MemberShell } from "@/components/experience/member-shell";
export const dynamic = "force-dynamic";
export const metadata = { title: "Membership" };
export default async function MembershipPage() {
  const actor = await currentUser();
  if (actor && actor.role !== "client") redirect("/studio");
  const desk = await memberRead(async () =>
    membershipDesk(await database(), actor),
  );
  const member = desk.data?.membership;
  const plan = desk.data?.plans.find((p) => p.id === member?.plan_id);
  const state = membershipState(member ?? null);
  const date = (v: string | Date) =>
    DateTime.fromJSDate(new Date(v))
      .setZone("America/Chicago")
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
              : "IN PREPARATION"}
        </p>
        <h2 id="membership-title">
          {desk.state === "unavailable"
            ? "Your membership could not refresh."
            : member
              ? member.plan_name
              : "House membership is being prepared."}
        </h2>
        <p>
          {desk.state === "unavailable"
            ? "Your records have not changed. Please try again."
            : member
              ? `Your membership is ${state}${member.location_name ? ` at Legacy Reserve — ${member.location_name}` : ""}.`
              : "There is no paid membership offer to join yet. Your account already gives you a place to keep visits and preferences together."}
        </p>
        {member && (
          <dl className="member-details">
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
      {member && plan && (
        <section className="member-line member-benefits">
          <div>
            <p className="experience-kicker">PLAN DETAILS</p>
            <h2>Your membership benefits.</h2>
            <p>
              These descriptions do not activate pricing, credits, or services
              that are not yet available.
            </p>
            <ul>
              {plan.benefit_model.map((b) => (
                <li key={b.label}>{b.label}</li>
              ))}
            </ul>
          </div>
        </section>
      )}
      <section className="member-line">
        <div>
          <p className="experience-kicker">THE ONGOING RELATIONSHIP</p>
          <h2>Beyond the appointment.</h2>
          <p>
            Membership is being shaped around real services, product access, and
            the care between visits. Available privileges and their terms will
            appear here when the offer opens.
          </p>
        </div>
        <Link href="/home" className="text-link">
          Return Home ↗
        </Link>
      </section>
    </MemberShell>
  );
}
