import Link from "next/link";
import { locations, primaryLocation } from "@/lib/experience/locations";
import type { Membership, MembershipPlan } from "@/lib/membership";
import { productConcepts } from "@/lib/product-concepts";

export function MemberDesk({
  personal,
  membership,
  plans,
}: {
  personal: boolean;
  membership: Membership | null;
  plans: MembershipPlan[];
}) {
  const house = locations.find((location) => location.status === "operating") ?? primaryLocation;
  const future = locations.filter((location) => location.id !== house.id);
  return (
    <section className="member-desk" aria-labelledby="member-desk-title">
      <div className="member-desk__heading">
        <p className="experience-kicker">{personal ? "YOUR LEGACY RESERVE" : "INSIDE LEGACY RESERVE"}</p>
        <h2 id="member-desk-title">{personal ? "The relationship, not just the visit." : "A house for appearance, membership, and care."}</h2>
      </div>
      <div className="member-desk__grid">
        <article className="member-card">
          <p className="experience-kicker">MEMBERSHIP</p>
          <h3>{membership ? membership.plan_name : "House membership"}</h3>
          <p>
            {membership
              ? `${membership.status === "active" ? "Active" : "On file"} at ${membership.location_name || house.short_name}.`
              : "Membership is being prepared. Your account already holds visits, The Chair, and your profile."}
          </p>
          <ul>
            {(membership ? plans.find((plan) => plan.id === membership.plan_id)?.benefits : plans[0]?.benefits)?.slice(0, 3).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <Link href="/my-reserve" className="text-link">{personal ? "Open My Reserve ↗" : "Create your account ↗"}</Link>
        </article>
        <article className="member-card">
          <p className="experience-kicker">THE CHAIR</p>
          <h3>He is remembered.</h3>
          <p>Mood, energy, conversation, and visit context — so the house meets the man walking in.</p>
          <Link href="/chair" className="text-link">Prepare The Chair ↗</Link>
        </article>
        <article className="member-card">
          <p className="experience-kicker">YOUR PROFILE</p>
          <h3>Direction that travels.</h3>
          <p>The Mirror keeps your grooming priorities with your account. Private staff notes stay with the team.</p>
          <Link prefetch={false} href="/profile" className="text-link">Open your profile ↗</Link>
        </article>
        <article className="member-card">
          <p className="experience-kicker">PRODUCTS</p>
          <h3>{productConcepts[0]?.name}</h3>
          <p>Legacy Reserve products belong to the same house — grooming now, member pricing and replenishment as they open.</p>
          <Link href="/shop" className="text-link">Open the Shop ↗</Link>
        </article>
      </div>
      <aside className="member-locations" aria-labelledby="member-locations-title">
        <p className="experience-kicker" id="member-locations-title">LOCATIONS</p>
        <ol>
          <li>
            <strong>Legacy Reserve — {house.short_name}</strong>
            <span>Operating house · {house.region}</span>
          </li>
          {future.map((location) => (
            <li key={location.id}>
              <strong>Legacy Reserve — {location.short_name}</strong>
              <span>Future house · not yet open</span>
            </li>
          ))}
        </ol>
      </aside>
    </section>
  );
}
