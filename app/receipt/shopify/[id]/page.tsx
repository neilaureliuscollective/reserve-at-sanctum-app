import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { saleReceipt } from "@/domains/shopify";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
export const dynamic = "force-dynamic";
export const metadata = { title: "Your verified Reserve sale" };
const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n / 100,
  );
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params,
    actor = await currentUser();
  if (!actor)
    redirect(`/signin?next=${encodeURIComponent(`/receipt/shopify/${id}`)}`);
  let sale;
  try {
    sale = await saleReceipt(await database(), actor, id);
  } catch {
    notFound();
  }
  return (
    <main id="main" className="inner-page section">
      <p className="eyebrow">RESERVE / VERIFIED SHOPIFY SALE</p>
      <h1>
        Your visit. <em>Recorded.</em>
      </h1>
      <h2>
        {sale.name}
        {sale.test ? " · TEST" : null}
      </h2>
      <p>
        {sale.financial_status.replaceAll("_", " ").toLowerCase()}
        {sale.cancelled ? " · cancelled" : null}
      </p>
      {sale.lines.map((l) => (
        <p key={l.id}>
          {l.quantity} × {l.name}
        </p>
      ))}
      <p>Order total: {money(sale.total)}</p>
      <p>Received: {money(sale.received)}</p>
      <p>Refunded: {money(sale.refunded)}</p>
      <p>
        Last verified:{" "}
        {new Date(sale.synced_at).toLocaleString("en-US", {
          timeZone: sale.timezone,
          timeZoneName: "short",
        })}
      </p>
      <p>
        This is a verified order summary. Shopify provides the official itemized
        receipt and handles payment, tax, tips and returns.
      </p>
      <Link href="/account">Your account</Link>
    </main>
  );
}
