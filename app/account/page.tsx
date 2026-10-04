import { customerSales } from "@/domains/shopify";
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

  const db = await database();
  const [receipts, shopifySales] = await Promise.all([
    ownReceipts(db, actor),
    customerSales(db, actor),
  ]);
  return (
    <main id="main" className="inner-page section workspace-page">
      <Visits actor={actor} preview={isPreview()} />
      {shopifySales.length > 0 && (
        <section>
          <h2>Your Shopify sales</h2>
          {shopifySales.map((s) => (
            <p key={s.id}>
              <Link href={`/receipt/shopify/${s.id}`}>
                {s.name} ·{" "}
                {s.financial_status.replaceAll("_", " ").toLowerCase()}
              </Link>
            </p>
          ))}
        </section>
      )}
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
