import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { memberRead } from "@/lib/experience/member";
import { overview } from "@/lib/vitalis/store";
import { VitalisOperations } from "@/components/vitalis/operations";
import "../../vitalis.css";
export const dynamic = "force-dynamic";
export const metadata = { title: "Vitalis operations" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const a = await currentUser();
  if (a?.role !== "owner")
    return (
      <section>
        <h1>Owner access required.</h1>
        <p>
          Vitalis demand and partner configuration are private to the founder.
        </p>
        <Link href="/studio">Return to Studio</Link>
      </section>
    );
  const n = Number((await searchParams).page ?? 0),
    page = Number.isInteger(n) && n >= 0 && n <= 10000 ? n : 0;
  const result = await memberRead(async () =>
    overview(await database(), a, page),
  );
  return (
    <section>
      <p className="eyebrow">LEGACY RESERVE · OWNER</p>
      <h1>Vitalis operations.</h1>
      <p className="studio-lede">
        Understand demand. Prepare trusted access. Keep clinical capabilities
        gated.
      </p>
      <p>
        <Link className="button button-gold" href="/studio/vitalis/revenue">
          Open Revenue intelligence ↗
        </Link>
      </p>
      {result.data ? (
        <VitalisOperations initial={JSON.parse(JSON.stringify(result.data))} />
      ) : (
        <div className="studio-panel">
          <h2>Vitalis records could not refresh.</h2>
          <Link href="/studio/vitalis">Try again</Link>
        </div>
      )}
    </section>
  );
}
