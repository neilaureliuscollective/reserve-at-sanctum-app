# Shopify POS connection — founder steps

## What Neil needs to do first

1. In Shopify, open **Settings → Domains**. Find the permanent address ending in **`.myshopify.com`**. Send that store address; it is not a password. We cannot identify your actual store or verify its plan from the connected tools in this workspace.
2. Open **Settings → Locations**. Make sure the physical **Reserve — Eunice** location exists, has the correct address, and is the location selected in your Shopify POS app. Set Legacy Reserve opening stock there in Shopify. Configure Katie's actual approved services as non-shipping service products; do not invent prices.
3. Open **Settings → Payments**. Confirm Shopify Payments is activated, its business/bank verification is complete, and the POS payment hardware or supported tap-to-pay method is set up. Shopify takes the real payment. POS Pro alone does not complete merchant verification.
4. Create/install the **Reserve Connector** app using Shopify's **Dev Dashboard**, under the same organization as your store. Its minimal scopes are `read_orders`, `read_locations`, `read_inventory`, and `read_products`. Create a version with the listed scopes (use Shopify’s default app home URL for this non-embedded connector), release it, install it on this store, and obtain its **Client ID** and **Client secret** from its settings. Put them in the hosting project's protected environment variables with your store domain; **do not paste the secret into chat**. This is the account access step the connected tools here cannot perform for you.

If the developer screens are unfamiliar, complete steps 1–3 and send the store domain. The app installation is the next account-specific handoff; the integration code already handles renewable tokens. Do not purchase Shopify Plus for this workflow.

## Engineering commissioning (after account access)

- Keep this branch stacked on the Phase 2/Phase 1 foundation. Deploy into isolated staging first; no automatic main merge or production cutover.
- Apply existing migrations 001–009, then **010_shopify_pos.sql** using the approved migration credential. Apply **scripts/shopify-runtime-grants.sql** after the Phase 1 runtime group exists. Back up and rehearse recovery. Do not edit previously applied migrations.
- Configure protected server env: `SHOPIFY_SHOP_DOMAIN`, `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`, exact `APP_ORIGIN`, and `RESERVE_CRON_SECRET`. Never use `NEXT_PUBLIC_` for secrets. Keep `RESERVE_LEGACY_COMMERCE_PREVIEW=false` and remove unused Stripe credentials from the eventual live deployment after reviewing historical recovery needs.
- Own-store client credentials require app/store organizational ownership and an installed app. Tokens are automatically renewed before 24-hour expiry. Different organizations require a separate proper OAuth flow; never work around this with a leaked storefront/admin token.
- This connector pins GraphQL API **2026-07**. Confirm its exact order/location/inventory queries against the installed app. `read_orders` normally gives recent 60-day order access; request broader history only if the business actually needs it.
- After setting the protected environment, engineering runs **`npm run shopify:webhooks`** to register the installed app's `orders/create`, `orders/paid`, `orders/updated`, `orders/cancelled`, and `refunds/create` subscriptions through Shopify's GraphQL API. It verifies the approved HTTPS origin, skips existing exact topic/endpoints and fails on scope errors. Deliveries go to **`https://<Reserve-host>/api/shopify/webhook`** and are signed with this installed app's client secret. Do not substitute an unrelated admin-created webhook signing secret. Verify app scopes and any protected-customer-data requirements in the actual organization. No email/address/phone fields are queried.
- Verify Shopify can reach the webhook URL without a Vercel SSO wall or browser login. Use an approved reachable staging endpoint and keep HMAC verification active. A successful local callback is not proof that a protected deployment accepts Shopify deliveries.
- Schedule authorized **POST `/api/cron/shopify`** with `Authorization: Bearer <RESERVE_CRON_SECRET>`, every few minutes, through the existing scheduler pattern. It processes two inbox events, refreshes two previously imported orders, and backfills one 10-order page for one mapped location per invocation. The route allows up to 300 seconds; verify hosting runtime limits and do not overlap schedules. The durable cursor advances only after the entire page succeeds. Initial automatic discovery starts 48 hours back, subsequent windows overlap by ten minutes. Staff can import older accessible sales through paging or the exact Shopify order ID.
- Failed events retry after five minutes, up to ten attempts. Unknown/online/null-location orders are marked **unmapped**, not assigned to Eunice. Owner recovery view surfaces these. Reconcile an accessible exact order or rescan its POS history after correcting configuration; don't force a location assignment. Review repeated failures in hosting logs without logging customer payloads or secrets.
- In Reserve, **Studio → Checkout & retail → Verify Shopify connection**, choose the matching physical location and connect it. A location with unresolved old drafts, pending card sessions or held stock is blocked until reconciled. This workspace had no live Stripe transactions; any pre-existing merchant activity must still be investigated, not assumed absent.

## Prove the real flow before accepting public payments

1. Confirm the real Shopify POS location, staff permission, service tax applicability, Legacy Reserve SKU prices and opening stock.
2. Rehearse the physical checkout and official receipt. Use Shopify's supported test workflow where available; if a small real in-person transaction is necessary, Neil explicitly approves that purchase/refund first. Never treat a test fixture or manual “mark paid” as card-present proof.
3. Refresh POS sales in Reserve; confirm exact order/location/amount and link it to the reviewed checked-in visit. Service completion remains a separate service outcome.
4. Sign into the customer's Reserve account; verify it can see its linked summary and another account cannot.
5. Issue a partial/full refund in Shopify; verify Reserve updates from the canonical order. Return sellable units in Shopify separately and confirm its stock. Reserve must create no stock delta.
6. Replay a signed delivery, simulate a worker interruption and delayed/out-of-order notifications, and confirm no duplicate payment/link or stale refund state.
7. Compare Shopify POS reports, actual cash, payment settlement and receipts. Reserve's order snapshots are not a daily settlement or bank-payout report.

Shopify can take sales independently once its own merchant/POS setup is complete. This integration becomes live only after its app installation, hosted migration, verified staff access and end-to-end rehearsal are completed.

## Validation

Local automated tests and the browser verifier use synthetic Shopify transport with no actual payment, inside an isolated local development environment only. The transport refuses production/remote use and is not imported by application code. No app installation, live merchant action or production migration is implied by this evidence.

Verified in this build: **56 automated tests**, TypeScript, production build, and desktop/390px browser checks passed. The browser journey covered owner connection/location mapping, canonical POS import, reviewed visit linking, refund reconciliation, read-only stock, signed durable webhook/worker, disabled former checkout, customer receipt ownership and account history. No real Shopify installation or transaction was executed.
