# Ecosystem Phase Two — Collection commerce readiness

## Founder summary

The member foundation exists in draft PR #30. The next commercial step is a real Collection-to-checkout journey: reviewed Shopify products, actual provider prices, product options and availability, then an explicit hosted checkout handoff. Aethelios can point members to published products instead of treating every product as a concept.

This phase prepares one-time product commerce. Recurring digital membership, automatic member discounts and order synchronization remain separate integrations. No payment, product publication, merchant setting, production migration or deployment is performed by this build.

The new founder Commerce room shows configuration dependencies and checkout preparation counts. Prepared checkouts are never represented as orders or revenue.

## Inspection and scope decision

Inspected main at `31c32f513e35f80c510b823299d2cda155e73057` and the existing ecosystem Phase One at `9b2e3be6f3784a422be6bb3818b1e3f5e8a9a52b`. Phase One is still a draft and unmerged. This phase is stacked on that branch rather than recreating it or pretending it is deployed.

The repository currently has concept products and a dormant read-only Square adapter. There is no verified Shopify store domain, approved collection, Storefront token, checkout-domain list or subscription app available for activation in this assignment. The founder's Shopify direction is respected. Square modules, identifiers, migrations and internal appointment systems are preserved; this bridge requires explicit Shopify selection.

The broader roadmap names paid value and commerce as Phase Two. That is a dependency sequence, not permission to invent an offer or grant paid access from an unverified event. This implementation completes the first coherent commerce workstream: a real product purchasing bridge that can be enabled after merchant verification. It does not claim recurring membership is complete.

The companion private Aethelios CI was rechecked: Foundation checks still reports failure without step/log details from the connector. This phase changes only Legacy Reserve and does not touch the private founder runtime or shared package pin. The unresolved private-repository check remains a release-review dependency for Phase One.

## Research findings and implementation decisions

Primary Shopify documentation checked October 7, 2026:

| Verified finding                                                                                                                                     | Product/architecture decision                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Storefront `collection(handle:)` returns published product data.                                                                                     | Restrict browsing and checkout eligibility to one reviewed collection. Never offer arbitrary variant IDs from the browser.                                                                                                                                 |
| `cartCreate` returns `checkoutUrl`; the buyer completes purchasing at hosted checkout.                                                               | Prepare a cart only after explicit member action, then show a separate Continue to Shopify checkout link. Creating a cart does not charge the member or establish an order.                                                                                |
| Cart costs are estimates and checkout determines final pricing.                                                                                      | Display actual provider amounts and clearly label the prepared total as estimated. Shipping/tax/final pricing are confirmed in Shopify.                                                                                                                    |
| Cart IDs include a secret and should not be exposed.                                                                                                 | Do not request, persist or return cart IDs. Persist only an actor-owned checkout preparation and its private checkout destination. Never include a checkout URL in public collection APIs or founder aggregate counts.                                     |
| Subscription purchases involve selling plans and create contracts. Shopify-admin custom apps cannot use subscriptions/protected subscription scopes. | Exclude subscription-only products. Send no selling plan or discount code. Do not activate recurring billing or infer membership entitlements from cart creation. Choose and verify an approved subscription-app/customer-contract integration separately. |

Sources:

- [Create and update a cart](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage)
- [cartCreate, pinned Storefront API 2026-07](https://shopify.dev/docs/api/storefront/2026-07/mutations/cartCreate)
- [collection, pinned Storefront API 2026-07](https://shopify.dev/docs/api/storefront/2026-07/queries/collection)
- [Product, pinned Storefront API 2026-07](https://shopify.dev/docs/api/storefront/2026-07/objects/Product)
- [Subscription contracts and app restrictions](https://shopify.dev/docs/apps/build/purchase-options/subscriptions/contracts)

Business inference: the existing product business is a practical first monetization connection while a recurring offer is validated. This adds a verifiable path to product revenue without assuming medical inclusions, subsidy economics or unverified discounts. No market-size numbers, conversion rates, margins or partnership economics are asserted. Product prices remain merchant-owned; synthetic test prices are not launch prices.

## Implemented workstreams

### 1. Collection and product review

`/shop` separates the published Collection from labeled packaging concepts. `/shop/products/[handle]` provides real product options, provider availability and USD pricing. `/shop/[id]` remains the concept route, with no checkout. Master-brand wording supports a national audience without making the application male-only or location-dependent.

The approved collection is bounded to 40 products with at most 20 variants each. If provider pagination indicates more records, purchasing fails closed; narrow the reviewed collection or implement explicit pagination in a later reviewed change. Subscription-only products are excluded. Only HTTPS Shopify CDN images are rendered; descriptions use escaped plain text. Provider errors remain unavailable, never invented empty stock or a replacement concept price.

### 2. Private checkout preparation

`POST /api/shop/checkout` verifies the customer session, origin, JSON content and streamed byte limit. Input is strictly an attempt UUID, approved Shopify variant ID and quantity 1–5. User IDs, prices, discounts, selling plans and redirect URLs are rejected.

The server claims an actor-owned attempt before any provider mutation. Concurrent retries can create at most one provider cart. Product eligibility/availability is refreshed before dispatch. Returned merchandise, quantity, currency, errors/warnings and checkout hostname are validated before exposing a handoff.

Each customer can create up to six new preparations per minute. Successful retries reuse the saved preparation; changing the selection with the same attempt fails. A failed/uncertain provider dispatch is recorded and never automatically retried. A fresh preparation requires another explicit member action. Handoffs expire after 24 hours; no expired attempt silently creates another cart.

`GET /api/shop/checkout?attempt=...` is actor-scoped. Another customer receives a generic not-found response; owner/operator/staff roles cannot use customer checkout tools. The browser never receives a Storefront token or cart secret. No email, founder data, Chair information or clinical records are sent to Shopify by this bridge. Checkout collects necessary purchase details in the provider environment.

A prepared checkout does not create a paid membership, confirm a paid order, record revenue or activate a discount. `/api/orders` now explicitly reports that order history is not connected instead of implying a verified empty order history.

### 3. Aethelios Collection continuity

The existing verified Collection intent reads the same published catalog. It links to actual product review when available, reports provider unavailability honestly, and preserves concept-only responses before configuration. No model call or automatic purchase executor is added.

### 4. Founder commercial readiness

Owner-only `/studio/commerce` and `/api/studio/commerce` show safe configuration status and aggregate last-30-day preparation counts. No credentials, checkout URLs, customer identities or provider error payloads are exposed. Staff cannot elevate access through the navigation or API. Configuration readiness is explicitly distinguished from a verified live purchase.

## Major files and systems

| System                                                                  | Files                                                                                                     |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Provider configuration, projection and host validation                  | `lib/shopify/config.ts`                                                                                   |
| Bounded Storefront transport, collection projection and cart validation | `lib/shopify/storefront.ts`                                                                               |
| Provider-aware member collection                                        | `lib/collection.ts`                                                                                       |
| Ownership, idempotency, rate limits and preparation counts              | `lib/collection-checkout.ts`                                                                              |
| Customer UI/API                                                         | `app/shop/*`, `app/api/shop/*`, `components/experience/product-checkout.tsx`                              |
| Founder UI/API                                                          | `app/studio/commerce/page.tsx`, `app/api/studio/commerce/route.ts`, `components/studio-nav.tsx`           |
| Existing concierge factual tool                                         | `lib/member-concierge.ts`                                                                                 |
| Additive private schema                                                 | `migrations/20261008000000_collection_checkout.sql`                                                       |
| Brand-matched responsive styling                                        | `app/collection-commerce.css`                                                                             |
| Verification                                                            | `tests/collection-commerce.test.ts`, `scripts/verify-collection-commerce.mjs`, isolated transport fixture |

No new runtime dependency, payment SDK or client secret is introduced. Authentication, memberships, Chair, service scheduling and booking transaction logic are retained.

## Configuration and release dependencies

Default: no Shopify connection or checkout is active. The existing Square adapter remains dormant/read-only. `.env.example` documents server-only variables without supplying merchant credentials:

- `RESERVE_COMMERCE_PROVIDER=shopify` selects the bridge.
- `SHOPIFY_STORE_DOMAIN` must be the verified merchant's exact `*.myshopify.com` hostname.
- `SHOPIFY_STOREFRONT_ACCESS_TOKEN` remains server-only.
- `SHOPIFY_COLLECTION_HANDLE` identifies the reviewed published collection.
- `SHOPIFY_API_VERSION=2026-07` is pinned to the researched/tested schema.
- `SHOPIFY_CHECKOUT_ENABLED=true` is a separate explicit activation flag.
- `SHOPIFY_CHECKOUT_HOSTS` lists reviewed exact custom checkout hostnames; the configured store hostname is automatically included. No wildcard, port, credential or arbitrary browser-supplied destination is accepted.

Token presence is not merchant approval. Before activation, verify the real Shopify merchant, assortment, fulfillment, shipping, taxes, returns and checkout domain. Resolve the older independent Shopify work/PR before combining another adapter. No subscription app, billing price or product discount is inferred from this configuration.

Additive tables `reserve_checkout_intents` and `reserve_commerce_rate` enable RLS without browser policies and revoke PUBLIC privileges. The existing hosted migrator's lockdown covers anon/authenticated roles. Schema changes were exercised only in isolated local PGlite. Hosted schema/configuration remain unchanged.

Authorized release order: integrate Phase One, review the stacked commerce change, back up/apply the additive migrations with existing lockdown, verify server ownership/RLS, deploy through the existing process with checkout disabled, then separately approve and verify the actual merchant connection and purchasing journey. No synthetic user, product or purchase is ever seeded in production.

Rollback: disable Shopify checkout and return to the previous application release while retaining the additive tables for recovery. Do not delete membership, booking or customer records.

## Tests and acceptance criteria

Automated tests must prove configuration/hostname safety, approved collection boundaries, no subscription-only purchasing, true USD pricing, honest provider failures, bounded response bodies, no private data sent, returned cart validation, actor isolation, concurrent retry idempotency, stale/expired attempt handling, rate admission and RLS.

Browser verification uses a transport fixture restricted to development, local preview and an exact synthetic token/domain. The fixture is never imported by application code. It produces no external Shopify request or charge. Verify customer/guest/staff/owner access, product review and explicit handoff, concept/live distinction, origin/price tampering, concierge product links, unavailable states, no browser errors, and no overflow at 320/360/390/884/1440 pixels.

```sh
npm test
npm run typecheck
npm run build
CHROMIUM_PATH=/path/to/chromium npm run verify:collection-commerce
CHROMIUM_PATH=/path/to/chromium npm run verify:personal-reserve
```

Acceptance: a reviewed one-time product can be browsed and handed to the merchant's hosted checkout only when configured and enabled; false benefits and sales claims never appear; private preparation ownership and existing member/booking systems remain intact. Actual fulfillment, paid order synchronization, customer account linking and recurring renewal/cancellation/failure reconciliation remain the next commercial integrations after merchant verification.

## Verification result

On the final application code: all 106 automated tests passed; TypeScript and the production build passed. Both Collection-commerce and existing Personal Reserve browser verification passed at 320/360/390/884/1440 pixels with no page errors or horizontal overflow. Product and Collection screenshots were visually inspected on narrow mobile and desktop. The optimized client bundles contain no Storefront-token variable or synthetic fixture token.

Tests used isolated local storage and a guarded synthetic Shopify transport. They verify integration behavior, not a real merchant connection, payment, delivery or live membership entitlement. No hosted migration or production release was executed.
