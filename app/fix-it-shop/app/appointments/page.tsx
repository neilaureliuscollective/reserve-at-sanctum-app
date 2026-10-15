import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Visits } from "@/components/visits";
import Link from "next/link";
import { businessEntrance } from "@/lib/business-workspace";
import { isPreview, database } from "@/lib/db";
import { fixItBooking as brand } from "@/lib/fix-it-booking";
export const dynamic = "force-dynamic";
export const metadata = { title: "My appointments" };
export default async function Page() {
  const actor = await currentUser();
  if (!actor)
    redirect(brand.signin + "?next=" + encodeURIComponent(brand.visits));
  const workspace = await businessEntrance(await database(), actor);
  return (
    <main id="main" className="fix-it-content">
      <header className="fix-it-visit-heading">
        <p className="eyebrow">FIX IT SHOP · YOUR TIME WITH KATIE</p>
        <h1>
          Your visits.
          <br />
          <em>All in one place.</em>
        </h1>
        <p>
          Review your appointments, adjust your plans, or book your next visit.
        </p>
      </header>
      {workspace && <Link className="button button-gold" href={workspace}>Manage Fix It Shop</Link>}
      <Visits actor={actor} preview={isPreview()} identity={brand} />
    </main>
  );
}
