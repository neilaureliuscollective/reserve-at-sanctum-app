import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { revenueOverview } from "@/lib/vitalis/revenue-store";
import { memberRead } from "@/lib/experience/member";
import { RevenueIntelligence } from "@/components/vitalis/revenue-intelligence";
import "../../../vitalis.css";
import "../../../vitalis-revenue.css";
export const dynamic = "force-dynamic";
export const metadata = { title: "Vitalis revenue intelligence" };
export default async function Page() {
  const a = await currentUser();
  if (a?.role !== "owner")
    return (
      <section>
        <h1>Owner access required.</h1>
        <Link href="/studio">Return to Studio</Link>
      </section>
    );
  const result = await memberRead(() =>
    database().then((db) => revenueOverview(db, a)),
  );
  return (
    <section className="vitalis-revenue">
      <p className="eyebrow">LEGACY RESERVE VITALIS · PRIVATE OFFICE</p>
      <h1>Revenue intelligence.</h1>
      <p className="studio-lede">
        See what growth requires. Protect what every membership earns.
      </p>
      <Link className="text-link" href="/studio/vitalis">
        Vitalis operations ↗
      </Link>
      {result.data ? (
        <RevenueIntelligence
          initial={JSON.parse(JSON.stringify(result.data))}
        />
      ) : (
        <div className="studio-panel">
          <h2>Financial workspace could not refresh.</h2>
          <p>Saved scenarios have not changed.</p>
          <Link href="/studio/vitalis/revenue">Try again</Link>
        </div>
      )}
    </section>
  );
}
