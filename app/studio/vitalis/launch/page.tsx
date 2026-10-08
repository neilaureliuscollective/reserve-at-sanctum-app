import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { memberRead } from "@/lib/experience/member";
import { launchOverview } from "@/lib/vitalis/launch-store";
import { LaunchReadiness } from "@/components/vitalis/launch-readiness";
import "../../../vitalis-pilot.css";
export const dynamic = "force-dynamic";
export const metadata = { title: "Vitalis · Launch readiness" };
export default async function Page() {
  const a = await currentUser();
  if (a?.role !== "owner")
    return (
      <section>
        <h1>Owner access required.</h1>
        <Link href="/studio">Return to Studio ↗</Link>
      </section>
    );
  const result = await memberRead(() =>
    database().then((db) => launchOverview(db, a)),
  );
  return (
    <section>
      <p className="eyebrow">LEGACY RESERVE VITALIS · PRIVATE OFFICE</p>
      <h1>Launch readiness.</h1>
      <p className="studio-lede">
        Turn the vision into a verified offer. Keep the evidence together.
      </p>
      <div className="member-actions">
        <Link href="/studio/vitalis" className="text-link">
          Vitalis operations ↗
        </Link>
        <Link href="/studio/vitalis/revenue" className="text-link">
          Revenue intelligence ↗
        </Link>
      </div>
      {result.data ? (
        <LaunchReadiness initial={JSON.parse(JSON.stringify(result.data))} />
      ) : (
        <section className="pilot-surface">
          <h2>Launch reviews could not refresh.</h2>
          <p>Your saved evidence references are unchanged.</p>
          <Link href="/studio/vitalis/launch">Try again ↗</Link>
        </section>
      )}
    </section>
  );
}
