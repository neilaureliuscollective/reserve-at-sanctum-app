import { AccountEntrance } from "@/components/experience/account-entrance";
import Image from "next/image";
import Link from "next/link";
import { DateTime } from "luxon";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { configured, database } from "@/lib/db";
import { membershipDesk } from "@/lib/membership";
import { commerceStatus } from "@/lib/commerce";
import { locationDisplayName, primaryLocation } from "@/lib/experience/locations";
import { optionalRead } from "@/lib/experience/optional-read";
import { squareBookingsStatus } from "@/lib/square/bookings";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Reserve" };

export default async function MyReserve() {
  const actor = await currentUser();
  if (!actor) return <AccountEntrance next="/my-reserve" />;
  if (actor.role !== "client") redirect("/studio");

  let visit: { starts_at: string | Date; service_name: string; provider_name: string } | undefined;
  let desk = { membership: null, plans: [], offered: false } as Awaited<ReturnType<typeof membershipDesk>>;
  if (configured()) {
    try {
      const db = await database();
      desk = await membershipDesk(db, actor);
    } catch {
      /* Membership remains optional. */
    }
    try {
      [visit] = await optionalRead(async () =>
        (await database()).query<{ starts_at: string | Date; service_name: string; provider_name: string }>(
          `SELECT a.starts_at,s.name AS service_name,p.name AS provider_name
           FROM reserve_appointments a
           JOIN reserve_services s ON s.id=a.service_id
           JOIN reserve_providers p ON p.id=a.provider_id
           WHERE a.client_id=$1 AND a.status='confirmed' AND a.starts_at>now()
           ORDER BY a.starts_at ASC LIMIT 1`,
          [actor.id],
        ),
      );
    } catch {
      /* Visits stay empty if the house cannot read them. */
    }
  }

  const house = locationDisplayName(primaryLocation.id);
  const shop = commerceStatus();
  const bookings = squareBookingsStatus();
  const first = actor.name.split(" ")[0];

  return (
    <main id="main" className="visit-world my-reserve">
      <div className="visit-world__art" aria-hidden="true">
        <Image src={primaryLocation.poster} alt="" fill sizes="100vw" priority />
      </div>
      <header className="visit-world__heading room-intro">
        <p className="experience-kicker">{house.toUpperCase()}</p>
        <h1 tabIndex={-1}>Your Reserve, {first}.</h1>
        <p>The ongoing relationship — visits, membership, The Chair, and what you take home.</p>
      </header>
      <nav className="visit-steps" aria-label="Your Legacy Reserve">
        <section>
          <span>01 / VISITS</span>
          <h2>{visit ? visit.service_name : "No visit is on the calendar."}</h2>
          <p>
            {visit
              ? `${DateTime.fromJSDate(new Date(visit.starts_at)).setZone(primaryLocation.timezone).toFormat("cccc, LLLL d · h:mm a")} · ${visit.provider_name}`
              : bookings.note}
          </p>
          <Link prefetch={false} href={visit ? "/my-visit" : "/book"} className="button button-gold">
            {visit ? "Open your visit" : "Book a visit"} ↗
          </Link>
          <Link prefetch={false} href="/account" className="text-link">Manage appointments ↗</Link>
        </section>
        <section>
          <span>02 / MEMBERSHIP</span>
          <h2>{desk.membership?.plan_name ?? "Membership is not offered yet."}</h2>
          <p>
            {desk.membership
              ? `${desk.membership.status} at ${desk.membership.location_name || primaryLocation.short_name}.`
              : "Plans exist as architecture only. No prices, credits, or recurring charges are live."}
          </p>
          <ul>
            {(desk.membership
              ? desk.plans.find((plan) => plan.id === desk.membership?.plan_id)?.benefit_model
              : desk.plans[0]?.benefit_model
            )?.slice(0, 4).map((benefit) => (
              <li key={benefit.label}>{benefit.label}</li>
            ))}
          </ul>
        </section>
        <section>
          <span>03 / THE CHAIR</span>
          <h2>He is remembered.</h2>
          <p>Your presence and grooming direction stay with Legacy Reserve. Private staff notes stay with the team.</p>
          <Link href="/chair" className="text-link">Open The Chair ↗</Link>
          <Link prefetch={false} href="/profile" className="text-link">Your profile ↗</Link>
        </section>
        <section>
          <span>04 / ORDERS</span>
          <h2>{shop.connected ? "Orders will appear here." : "No purchases yet."}</h2>
          <p>
            In-house take-home, shipped orders, pickup, and location fulfillment will use Square Orders.
            {shop.connected ? " Square is configured; no order history is available yet." : " Square is not connected, so there is no order history to show."}
          </p>
          <Link href="/shop" className="text-link">Visit the Shop ↗</Link>
        </section>
      </nav>
      <p className="visit-world__concept">PRIVATE RELATIONSHIP · NOT A GENERIC DASHBOARD</p>
    </main>
  );
}
