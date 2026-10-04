import Link from "next/link";
import { database } from "@/lib/db";
import { ownReceipts } from "@/domains/commerce/orders";
import { currentUser } from "@/lib/auth";
import { isPreview } from "@/lib/db";
import { redirect } from "next/navigation";
import { Visits } from "@/components/visits";
export const dynamic = "force-dynamic";
export const metadata = { title: "Your visits" };
export default async function Page() {
  const actor = await currentUser();
  if (!actor) redirect("/signin?next=/account");

  const receipts = await ownReceipts(await database(), actor);
  return (
    <main id="main" className="inner-page section workspace-page">
      <Visits actor={actor} preview={isPreview()} />
      {receipts.length > 0 && (
        <section>
          <h2>Your receipts</h2>
          {receipts.map((o) => (
            <p key={o.id}>
              <Link href={`/receipt/${o.id}`}>
                Reserve order · {new Date(o.created_at).toLocaleDateString()} ·{" "}
                {o.status.replace("_", " ")}
              </Link>
            </p>
          ))}
        </section>
      )}
    </main>
  );
}
