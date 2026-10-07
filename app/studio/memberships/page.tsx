import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { memberRead } from "@/lib/experience/member";
import { membershipOperations } from "@/lib/membership-operations";
import { MembershipOperations } from "@/components/membership-operations";
export const dynamic = "force-dynamic";
export const metadata = { title: "Membership operations" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const actor = await currentUser();
  if (actor?.role !== "owner")
    return (
      <section>
        <p className="eyebrow">MEMBERSHIP OPERATIONS</p>
        <h1>Owner access required.</h1>
        <p>Member grants and plan publication are managed by the founder.</p>
        <Link href="/studio">Return to Studio</Link>
      </section>
    );
  const raw = Number((await searchParams).page ?? 0);
  const page = Number.isInteger(raw) && raw >= 0 && raw <= 10000 ? raw : 0;
  const result = await memberRead(() => membershipOperationsLazy(actor, page));
  return (
    <section className="membership-office">
      <p className="eyebrow">LEGACY RESERVE · OWNER</p>
      <h1>Membership operations.</h1>
      <p className="studio-lede">
        Define the relationship. Review access requests. Grant and manage
        complimentary memberships with a recorded history.
      </p>
      {result.data ? (
        <MembershipOperations overview={result.data} />
      ) : (
        <div className="studio-panel">
          <h2>Membership records could not refresh.</h2>
          <p>No records have changed.</p>
          <Link href="/studio/memberships">Try again</Link>
        </div>
      )}
    </section>
  );
}
async function membershipOperationsLazy(
  actor: NonNullable<Awaited<ReturnType<typeof currentUser>>>,
  page: number,
) {
  return membershipOperations(await database(), actor, page);
}
