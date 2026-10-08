import Link from "next/link";
import { studioActor } from "@/lib/studio-session";
import { database } from "@/lib/db";
import { memberRead } from "@/lib/experience/member";
import { checkoutOverview } from "@/lib/collection-checkout";
import { shopifyReadiness } from "@/lib/shopify/config";
export default async function Commerce() {
  const actor = await studioActor();
  if (actor.role !== "owner")
    return (
      <section className="studio-panel">
        <h1>Commerce readiness belongs to the founder.</h1>
        <p>Your operational workspace remains available.</p>
        <Link href="/studio">Return to Studio ↗</Link>
      </section>
    );
  const readiness = shopifyReadiness(),
    overview = await memberRead(async () =>
      checkoutOverview(await database(), actor),
    );
  const rows = [
    ["Shopify provider selected", readiness.selected],
    ["Approved Collection connection configured", readiness.configured],
    ["One-time product checkout enabled", readiness.checkoutEnabled],
    ["Member product pricing", false],
    ["Recurring membership billing", false],
    ["Completed order synchronization", false],
  ] as const;
  return (
    <section className="commerce-office">
      <header className="studio-page-title">
        <p className="studio-kicker">COMMERCIAL READINESS</p>
        <h1>The Collection, prepared to trade.</h1>
        <p>
          Configuration readiness is separate from a verified live purchase.
          This page never activates a provider or changes production settings.
        </p>
      </header>
      <section className="studio-panel">
        <h2>Release dependencies</h2>
        <table className="commerce-readiness-table">
          <tbody>
            {rows.map(([label, ready]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td>{ready ? "Configured" : "Not active"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {readiness.issues.length > 0 && (
          <ul>
            {readiness.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        )}
        <p>
          Only the approved Shopify collection is offered. Subscriptions,
          automatic member discounts and order-history claims remain blocked
          until their provider contracts and reconciliation are verified.
        </p>
      </section>
      <section className="studio-panel">
        <h2>Checkout preparation · last 30 days</h2>
        {overview.state === "ready" ? (
          <section className="commerce-office">
            <table className="commerce-readiness-table">
              <tbody>
                {["preparing", "ready", "failed", "uncertain"].map((status) => (
                  <tr key={status}>
                    <th scope="row">{status}</th>
                    <td>
                      {overview.data.preparations.find(
                        (row) => row.status === status,
                      )?.count ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>
              These counts describe checkout preparation, not purchases, paid
              members or collected revenue. No order feed is connected.
            </p>
          </section>
        ) : (
          <p>
            Checkout preparation counts could not refresh. No empty sales result
            is inferred.
          </p>
        )}
      </section>
      <section className="studio-panel">
        <h2>Before opening purchasing</h2>
        <ol>
          <li>
            Verify the merchant, Storefront token and approved collection in
            Shopify.
          </li>
          <li>
            Confirm real product options, fulfillment, returns, shipping and
            taxes in Shopify.
          </li>
          <li>
            Approve the exact hosted checkout domains and apply the private
            additive migration.
          </li>
          <li>
            Enable checkout only through an authorized release and verify a real
            merchant test journey.
          </li>
          <li>
            Choose an approved subscription app and customer/contract linkage
            before membership billing.
          </li>
        </ol>
        <Link href="/shop">Review the member Collection ↗</Link>
      </section>
    </section>
  );
}
