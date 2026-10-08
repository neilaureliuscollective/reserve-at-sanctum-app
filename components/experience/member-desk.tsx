import Link from "next/link";
import type { membershipDesk } from "@/lib/membership";
import { membershipState } from "@/lib/membership";
import type { ReadState } from "@/lib/experience/member";
export function MemberDesk({
  desk,
}: {
  desk: ReadState<Awaited<ReturnType<typeof membershipDesk>>>;
}) {
  const member = desk.data?.membership;
  return (
    <section className="member-line" aria-labelledby="membership-summary-title">
      <div>
        <p className="experience-kicker">MEMBERSHIP</p>
        <h2 id="membership-summary-title">
          {desk.state === "unavailable"
            ? "Your membership could not refresh."
            : member
              ? member.plan_name
              : "Your place in the Reserve."}
        </h2>
        <p>
          {desk.state === "unavailable"
            ? "Open Membership to try again."
            : member
              ? `Status: ${membershipState(member)}. View your membership details and benefits.`
              : desk.data?.offered
                ? "Membership access is open for review. Explore the offer and request access."
                : "Explore membership and let Legacy Reserve know what brings you to Legacy Reserve."}
        </p>
      </div>
      <Link href="/membership" className="text-link">
        Open Membership ↗
      </Link>
    </section>
  );
}
