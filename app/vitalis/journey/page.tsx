import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { memberRead } from "@/lib/experience/member";
import { AccountEntrance } from "@/components/experience/account-entrance";
import { MemberShell } from "@/components/experience/member-shell";
import { VitalisJourney } from "@/components/vitalis/journey";
import { journeyOverview } from "@/lib/vitalis/journey-store";
import "../../vitalis-pilot.css";
export const dynamic = "force-dynamic";
export const metadata = { title: "Vitalis · Your wellness rhythm" };
export default async function Page() {
  const a = await currentUser();
  if (!a) return <AccountEntrance next="/vitalis/journey" />;
  if (a.role !== "client")
    return (
      <main id="main" className="member-environment">
        <h1>Customer account required.</h1>
        <p>
          Private wellness choices belong to customer accounts. Founder
          operations show aggregate participation only.
        </p>
        <Link href="/studio/vitalis/launch">Open launch readiness ↗</Link>
      </main>
    );
  const result = await memberRead(() =>
    database().then((db) => journeyOverview(db, a)),
  );
  return (
    <MemberShell
      kicker="LEGACY RESERVE VITALIS · YOUR PRIVATE PILOT"
      title="A rhythm worth returning to."
      intro="One direction. A considered daily step. A clearer view of the consistency you choose."
    >
      <Link className="text-link" href="/vitalis">
        Vitalis ↗
      </Link>
      {result.data ? (
        <VitalisJourney initial={JSON.parse(JSON.stringify(result.data))} />
      ) : (
        <section className="pilot-surface">
          <h2>Your rhythm could not refresh.</h2>
          <p>Your saved choices have not changed.</p>
          <Link href="/vitalis/journey">Try again ↗</Link>
        </section>
      )}
    </MemberShell>
  );
}
