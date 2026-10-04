# Reserve commerce — Shopify POS transition

## Executive decision

Shopify is the commerce authority for Reserve. Neil already operates its product business there and has enabled POS Pro. Preserve the useful Phase 2 permission, receipt, reconciliation and recovery work, but stop commissioning a separate Stripe register or independent Reserve retail stock ledger.

This is Phase 2B, the necessary correction to the commerce phase. Memberships remain the next original roadmap phase after this integration is commissioned; no recurring service membership is invented in this pass.

## Research conclusions

- Shopify sells physical products and non-shipping services. Reserve remains the booking/provider/hospitality environment, rather than replacing it with a generic Shopify booking app.
- Shopify POS is an iOS/Android application. Its reader, cash, tipping, receipts, refunds and stock workflows remain in that application. This integration is not an embedded card-present terminal inside Reserve.
- POS Pro can retrieve saved draft orders, but that is not an automatic appointment checkout integration. Do not assume a plan upgrade connects the two applications.
- A custom Reserve frontend can later use Shopify checkout. A standard cart is an online checkout, not a verified POS appointment receipt. Online inventory allocation and appointment hold/payment timing need a separate explicit workflow.
- An own-store Dev Dashboard app can obtain renewable, 24-hour server-side credentials through the client credentials grant when app and store belong to the same Shopify organization. No access token or app secret is stored in a browser.
- HTTPS webhooks use HMAC of raw bytes and are retried/duplicated. A notification triggers a canonical Shopify order read; its payload does not itself mark a visit paid.
- Order `retailLocation` identifies its POS location, with documented exceptions (including certain admin mark-as-paid flows). Null/unknown locations are not guessed. `sourceName=pos` and a verified exact location mapping are required in this implementation.
- `totalReceivedSet` and `totalRefundedSet` are separate order-level totals. They are not today's settlement totals or bank deposits. Shopify reporting remains the day-close authority.

Primary sources:

- https://help.shopify.com/en/manual/products/digital-service-product/selling-services-or-digital-products
- https://www.shopify.com/pos/pricing
- https://help.shopify.com/en/manual/sell-in-person/shopify-pos/order-management/draft-orders
- https://shopify.dev/docs/apps/build/authentication-authorization/client-credentials-grant
- https://shopify.dev/docs/apps/build/webhooks/verify-deliveries
- https://shopify.dev/docs/api/admin-graphql/2026-07/objects/Order
- https://shopify.dev/docs/api/admin-graphql/2026-07/objects/InventoryLevel
- https://shopify.dev/docs/api/storefront/latest/objects/Cart

## Build sequence and implemented scope

1. Make Shopify the default commerce workflow; disable old Stripe/local cash/stock writes at HTTP boundaries. Retain existing historical receipts and a strictly nonproduction, explicit investigation switch. No historical rows are deleted.
2. Authenticate the own-store connector, pin GraphQL 2026-07, renew tokens and constrain all network destinations to the configured `.myshopify.com` store.
3. Let the Reserve owner verify available Shopify locations and map the physical Eunice location. Commissioning rejects unresolved former-register drafts/payments/held stock. Imported history prevents casual location remapping.
4. Import recent POS sales or one exact order ID. Snapshot only order IDs, commercial line names/quantities, totals, financial state and timestamps. Importing creates neither another payment nor another stock movement.
5. Receive signed notifications durably. Process bounded canonical reconciliation batches with retries, explicit failed/unmapped states and periodic missed-event backfill. Preserve source versions against stale responses.
6. Let owner/manager/reception review a receipt and link it to one checked-in/completed visit. Confirm the customer, service, retail additions and discounts manually. Multiple payments or mismatched visits must be reviewed, not silently overwritten.
7. Show the linked verified sale to the appointment's account owner. Reconcile refunds without restocking anything locally. Read physical Shopify inventory with observation time and pagination.
8. Allow an authorized owner/manager to correct a wrong customer/visit association, revoke old receipt access and preserve immutable link/correction history. This correction never refunds money.

## Durable model

| Entity                         | Responsibility                                                                         |
| ------------------------------ | -------------------------------------------------------------------------------------- |
| `reserve_shopify_locations`    | Exact store/physical-location mapping, commissioning and durable scan cursor/window    |
| `reserve_shopify_orders`       | Canonical commercial snapshot and optional reviewed Reserve visit/customer association |
| `reserve_shopify_events`       | Minimal signed-delivery mapping, deduplication and retry/recovery status               |
| `reserve_shopify_link_history` | Append-only link/correction accountability                                             |

Shopify owns actual products/SKUs, tax, stock, adjustments, payment methods, receipts, refunds and fulfillment. Reserve owns appointments, providers, location staffing and customer/Chair permissions. Shopify customer emails never automatically merge Reserve identities. Private notes, Chair context and Aethelios are outside this connector.

## Permissions and operations

- Owner: verify/connect physical locations; commercial review and correction.
- Location manager: review/link/reconcile that location; correct a wrongly linked visit with a reason.
- Reception: review/link/reconcile within its location. Shopify separately controls whether that staff member can take payments/refund in POS.
- Provider-only: existing service/Chair permissions; no automatic access to other customers' commerce. Katie's appropriate operational assignment must be provisioned deliberately.
- Customer: linked sale summary only; no staff list, connection settings or other customer's receipt.
- Webhook: signed raw body, exact store, approved topic, durable inbox.
- Worker: protected scheduler credential, bounded work, canonical reads.

RLS denies browser table access. Migration 010 and a narrowly scoped runtime-grant script extend the existing server-only architecture. No new database platform or auth system is introduced. Existing account claims migrate Shopify receipt ownership along with prior receipt/appointment records.

## Definition of done for this build

An isolated verifier can connect a synthetic store/location, import a paid POS sale, link it to an existing visit, reconcile a refund and Shopify stock, reject forged deliveries and competing old-register writes, and prove customer receipt ownership on desktop and narrow mobile. Unit/integration tests cover race protection, stale events, exact currency parsing, permissions, immutable corrections and missed-event recovery.

Live readiness is separately proven against the real installed app, hosted Reserve database, approved catalog, physical POS checkout and receipt/refund/return workflow. Passing synthetic tests does not satisfy those gates.

## Explicit remaining boundaries

No live installation, transaction, hosted migration or actual merchant reconciliation has occurred in this workspace. No new service prices or stock were invented. Online order-to-appointment payment, automatic service/cart handoff to POS, Shopify customer-account SSO, full historical accounting exports and recurring service memberships are subsequent work. The manual link is a deliberate first operating workflow; do not market it as automatic end-to-end booking/payment yet.

Eunice and Lafayette share the same connector. Add a Shopify location, add its Reserve location, verify/map the pair, configure Shopify catalog/stock and staff permissions, and rehearse its POS transaction. Do not clone Reserve or recreate payment processing.

The first workflow permits one POS order linked to one visit. Split deposits/balances and baskets covering multiple visits require explicit allocation work before being enabled. Order totals are never treated as an automatic exact payment of the visit’s service price.
