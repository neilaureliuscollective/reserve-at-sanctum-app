import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { receipt } from "@/domains/commerce/orders";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
export const dynamic = "force-dynamic";
export const metadata = { title: "Your Reserve receipt" };
const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n / 100,
  );
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await currentUser();
  if (!actor) redirect(`/signin?next=${encodeURIComponent(`/receipt/${id}`)}`);
  let r;
  try {
    r = await receipt(await database(), actor, id);
  } catch {
    notFound();
  }
  return (
    <main id="main" className="inner-page section">
      <p className="eyebrow">RESERVE / RECEIPT</p>
      <h1>
        Your visit. <em>Recorded.</em>
      </h1>
      <p>Order {r.order.id}</p>
      <p>
        Status: {r.order.status.replace("_", " ")} · payment{" "}
        {String(r.payment?.state || "not collected")}
      </p>
      {r.lines.map((l) => (
        <div key={l.id}>
          <p>
            {l.quantity} × {l.name} · {money(l.quantity * l.unit_price)}
          </p>
          {l.discount > 0 && <p>Discount: −{money(l.discount)}</p>}
          {l.tax > 0 && <p>Tax: {money(l.tax)}</p>}
        </div>
      ))}
      <p>Subtotal: {money(r.order.subtotal)}</p>
      <p>Discount: −{money(r.order.discount)}</p>
      <p>Tax: {money(r.order.tax)}</p>
      <p>Tip: {money(r.order.tip)}</p>
      <h2>Total: {money(r.order.total)}</h2>
      <p>Refunded: {money(r.order.refunded)}</p>
      {r.refunds.map((f) => (
        <p key={String(f.id)}>
          Refund {money(Number(f.amount))} · {String(f.state)}
        </p>
      ))}
      <p>
        A payment return screen does not confirm settlement. Status updates
        after verified processor reconciliation.
      </p>
      <Link href="/account">Your account</Link>
    </main>
  );
}
