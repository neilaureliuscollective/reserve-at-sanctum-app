import { randomUUID } from "node:crypto";
import { z } from "zod";
import { BookingError, type Actor } from "./booking";
import type { Database, Queryable, Row } from "./db";
import { requireMember } from "./personal-reserve";
import {
  shopifySettings,
  checkoutUrl,
  type ShopifyConfig,
} from "./shopify/config";
import {
  shopifyCollection,
  shopifyCheckout,
  type PreparedCheckout,
} from "./shopify/storefront";
export const checkoutInput = z
  .object({
    attemptKey: z.uuid(),
    variantId: z.string().regex(/^gid:\/\/shopify\/ProductVariant\/\d+$/),
    quantity: z.number().int().min(1).max(5),
  })
  .strict();
type CheckoutIntent = Row & {
  id: string;
  merchant_domain: string;
  variant_id: string;
  quantity: number;
  status: "preparing" | "ready" | "failed" | "uncertain";
  checkout_url: string | null;
  estimated_total: PreparedCheckout["estimatedTotal"] | null;
  created_at: string | Date;
};
function readyIntent(
  row: CheckoutIntent,
  config: ShopifyConfig,
): PreparedCheckout {
  if (Date.now() - new Date(row.created_at).getTime() > 24 * 60 * 60 * 1000)
    throw new BookingError(
      "This checkout preparation has expired. Refresh the Collection and prepare a new checkout.",
      410,
    );
  if (!row.checkout_url || !row.estimated_total)
    throw new BookingError("Checkout could not refresh.", 503);
  try {
    return {
      url: checkoutUrl(row.checkout_url, config),
      estimatedTotal: row.estimated_total,
    };
  } catch {
    throw new BookingError("Checkout could not refresh.", 503);
  }
}
export async function prepareCheckout(
  db: Database,
  actor: Actor,
  input: unknown,
  fetcher: typeof fetch = fetch,
) {
  requireMember(actor);
  const i = checkoutInput.parse(input),
    config = shopifySettings().config;
  if (!config?.checkout)
    throw new BookingError("Purchasing is not open yet.", 503);
  const claim = await db.transaction(async (tx) => {
    const id = randomUUID();
    const [created] = await tx.query<{ id: string }>(
      `INSERT INTO reserve_checkout_intents(id,user_id,attempt_key,merchant_domain,variant_id,quantity,status)
   VALUES($1,$2,$3,$4,$5,$6,'preparing') ON CONFLICT(user_id,attempt_key) DO NOTHING RETURNING id`,
      [id, actor.id, i.attemptKey, config.domain, i.variantId, i.quantity],
    );
    if (!created) {
      const [row] = await tx.query<CheckoutIntent>(
        "SELECT id,merchant_domain,variant_id,quantity,status,checkout_url,estimated_total,created_at FROM reserve_checkout_intents WHERE user_id=$1 AND attempt_key=$2 FOR UPDATE",
        [actor.id, i.attemptKey],
      );
      if (
        !row ||
        row.merchant_domain !== config.domain ||
        row.variant_id !== i.variantId ||
        row.quantity !== i.quantity
      )
        throw new BookingError(
          "This checkout attempt belongs to different product selections. Start a new preparation.",
          409,
        );
      if (row.status === "ready")
        return { id: row.id, ready: readyIntent(row, config) };
      throw new BookingError(
        row.status === "preparing"
          ? "Checkout is still preparing. Try this same attempt again in a moment."
          : "This attempt could not finish. Refresh product availability before starting a new preparation.",
        409,
      );
    }
    const bucket = Math.floor(Date.now() / 60000);
    const [admitted] = await tx.query(
      `INSERT INTO reserve_commerce_rate(user_id,bucket,requests) VALUES($1,$2,1)
   ON CONFLICT(user_id) DO UPDATE SET requests=CASE WHEN reserve_commerce_rate.bucket=$2 THEN reserve_commerce_rate.requests+1 ELSE 1 END,bucket=$2
   WHERE reserve_commerce_rate.bucket<>$2 OR reserve_commerce_rate.requests<6 RETURNING requests`,
      [actor.id, bucket],
    );
    if (!admitted)
      throw new BookingError(
        "Take a moment before preparing another checkout.",
        429,
      );
    return { id, ready: null };
  });
  if (claim.ready) return claim.ready;
  let dispatched = false;
  try {
    const products = await shopifyCollection(config, fetcher);
    const selected = products
      .flatMap((p) => p.variants)
      .find((v) => v.id === i.variantId);
    if (!selected || !selected.availableForSale)
      throw new BookingError(
        "That product option is no longer available in the approved Collection. Refresh before purchasing.",
        409,
      );
    dispatched = true;
    const prepared = await shopifyCheckout(
      config,
      i.variantId,
      i.quantity,
      fetcher,
    );
    await db.query(
      "UPDATE reserve_checkout_intents SET status='ready',checkout_url=$3,estimated_total=$4::jsonb,updated_at=now() WHERE id=$1 AND user_id=$2 AND status='preparing'",
      [
        claim.id,
        actor.id,
        prepared.url,
        JSON.stringify(prepared.estimatedTotal),
      ],
    );
    return prepared;
  } catch (e) {
    await db.query(
      "UPDATE reserve_checkout_intents SET status=$3,updated_at=now() WHERE id=$1 AND user_id=$2 AND status='preparing'",
      [claim.id, actor.id, dispatched ? "uncertain" : "failed"],
    );
    if (e instanceof BookingError) throw e;
    throw new BookingError(
      "Checkout could not prepare. Refresh the Collection before trying again.",
      503,
    );
  }
}
export async function ownCheckout(
  db: Queryable,
  actor: Actor,
  attemptKey: string,
) {
  requireMember(actor);
  z.uuid().parse(attemptKey);
  const config = shopifySettings().config;
  if (!config?.checkout)
    throw new BookingError("Purchasing is not open yet.", 503);
  const [row] = await db.query<CheckoutIntent>(
    "SELECT id,merchant_domain,variant_id,quantity,status,checkout_url,estimated_total,created_at FROM reserve_checkout_intents WHERE user_id=$1 AND attempt_key=$2",
    [actor.id, attemptKey],
  );
  if (!row || row.merchant_domain !== config.domain)
    throw new BookingError("Checkout preparation was not found.", 404);
  return {
    status: row.status,
    checkout: row.status === "ready" ? readyIntent(row, config) : null,
  };
}
export async function checkoutOverview(db: Queryable, actor: Actor) {
  if (actor.role !== "owner")
    throw new BookingError(
      "Commerce readiness is reserved for the owner.",
      403,
    );
  const rows = await db.query<{ status: string; count: number }>(
    "SELECT status,COUNT(*)::integer AS count FROM reserve_checkout_intents WHERE created_at>=now()-INTERVAL '30 days' GROUP BY status",
  );
  return {
    period: "Last 30 days",
    preparations: rows,
    completedOrders: null,
    revenue: null,
  };
}
