# Aethelios concierge — Phase 1

## Baseline and scope

Inspected main at `2add29cc541606cc851e4cf43d6630905aa04323`, repository instructions,
recent commits, open PRs, shared core, member concierge, auth, budgets, Shopify,
Square, booking, membership and Vercel deployments before making changes.
The production deployment already contains the October 9 Shopify guest-cart work.
It is extended, not replaced. The shared `@aethelios/concierge-core` remains pinned
and unchanged; Reserve supplies an application-specific commerce adapter.

Open work was deliberately not merged or overwritten: PR #52 connects public
Aethelios and professional schedules; #59 develops the independent Fix It Shop
PWA; #22 develops the business coworker. Earlier location/commerce branches
#12/#15/#16 also remain independent. This phase evolves `/aethelios` and the
existing Shopify cart; it does not introduce another public concierge or scheduler.
Vitalis, clinical activation, staff tools and unrelated brand worlds are unchanged.

## Current official research and architecture decision

- [Shopify Storefront Product, pinned 2026-07](https://shopify.dev/docs/api/storefront/2026-07/objects/Product): descriptions, categories, variants, availability and exposed metafields are authoritative. Merchant attributes are optional; absent attributes are never manufactured.
- [Shopify cart lifecycle](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage): add actual variant IDs, retain the cart secret server-side, validate returned state, and use Shopify's checkout URL. Estimated totals and checkout handoffs do not establish payment.
- [Shopify product recommendations](https://shopify.dev/docs/api/storefront/latest/queries/productRecommendations): related recommendations use sales/descriptions/collections; complementary recommendations require merchant configuration. Phase 1 uses explicit needs and published evidence rather than relying on unrelated bestseller or unconfigured complementary results.
- [OpenAI function calling](https://developers.openai.com/api/docs/guides/function-calling) and [structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs): typed tool arguments and structured responses still need server validation. The model does not gain authority to mutate commerce. Since this release exposes no model executor, a strict structured preference response is the smaller suitable interface.
- [OpenAI pricing](https://developers.openai.com/api/docs/pricing): keep the existing configurable model and exact-model token prices; do not hard-code current costs or introduce a paid platform. No-cost verified matching works without AI. Evaluate a supported small model on the synthetic suite before enabling interpretation. The existing per-member and tenant reservations cover interpretation as well as general conversation.
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) and [breaking-change index](https://supabase.com/changelog?types=breaking-change): server authorization plus private tables and revoked browser grants remain the application boundary; no new browser database policies or schema are needed.
- Installed Next.js 16.3.5 documentation was consulted for route handlers and page search parameters. The React quality review retained small components, type-only server imports, unique labels, native controls, explicit focus states, reduced-motion behavior and bounded serialized context.

A vector database, embeddings pipeline, separate knowledge store, autonomous
checkout tool and extra analytics subscription would add maintenance without
solving the merchant-data quality or verified checkout requirements. Instead:

1. Client sends the current question, up to three prior customer questions
   (500 characters each), and an optional validated product handle. These are
   untrusted hints, never product IDs, permissions or business facts.
2. Existing member authorization and six-request/minute database admission run.
   Clinical and membership boundaries retain priority.
3. The read-only Shopify adapter obtains current facts and optional structured
   attributes. Deterministic intent slots track beard/hair/skin, concern, finish,
   hold and gift direction; follow-ups preserve the relevant context.
4. If explicitly enabled, a single bounded AI response interprets these slots
   using a strict schema. It sees no product catalog, identity, cart, price or
   private notes. Invalid/refused/incomplete responses fall back to verified
   matching. No AI-generated prose becomes a product benefit or price.
5. Matching requires category compatibility and affirmative published evidence
   for every requested concern/finish/hold. Negated clauses cannot establish a
   match. Both beard-hair and dry-skin requests need both claims. Conflicting
   category metadata excludes a recommendation. This is intentionally conservative:
   incomplete catalog descriptions can produce no match instead of speculation.
6. Cards display Shopify descriptions, images, actual variant prices and stock,
   with optional published ingredient/benefit details. Product names with duplicate
   entries must be resolved before treating them as a two-product comparison.
7. Only customer clicks add a selected variant. Existing cart preparation
   refreshes collection membership and availability; checkout refreshes both cart
   state and the approved collection. Origin, strict payload, exact HTTPS checkout
   hosts, HttpOnly/SameSite cart secrets and checkout activation gates remain.
   Attributed member cart actions also use the existing commerce rate counter.
   The legacy guest cart still has origin/body/stock protections but does not gain
   a new distributed anonymous rate limiter in this phase.

## Product attributes in Shopify

The existing product query now reads `productType`, `category.name`, and optional
Storefront-visible metafields in namespace `reserve`: `ingredients`, `benefits`,
`concerns`, `finish`, `hold`. Supported types are `single_line_text_field`,
`multi_line_text_field`, and `list.single_line_text_field`. Unpublished, malformed,
unsupported and absent metafields are ignored. Merchant descriptions remain usable
without these fields. Ingredient lists are not inferred from packaging or names.
Products requiring selling plans and products beyond the existing 20-variant
limit retain the bridge's existing fail-closed behavior. Prices remain US/USD.

## Customer experience and booking

The recognizable concierge/orb and green, obsidian, ivory and Reserve Gold design
are retained. Collection and actual product pages now offer useful contextual
concierge links. The homepage introduction and member navigation already provide
entry points. The customer remains signed in for the private concierge; this
release does not expose membership or private APIs to guests.

The existing scheduling engine still supplies enabled services and slots. Service
labels now contain actual provider, price and duration. A clear `next Thursday`
request is interpreted as the next occurrence of Thursday strictly after today,
in the configured single destination's timezone; the interpreted date is shown.
Multiple locations, weekend requests and multiple services use the existing
explicit date/service selector. No appointments are created or altered by the
concierge. Slot links hand off to authoritative booking confirmation.

## Privacy and commerce intelligence

The thread stays in page state; leaving/reloading or changing product context
clears it. No conversations are persisted. Optional provider processing is
disclosed in the existing concierge introduction.

Reuse the existing private daily aggregate counter `reserve_chair_funnel` with
an `aethelios:` namespace. No schema changes, prompt storage, user identifiers,
product identifiers, cart secrets or order payloads are added to analytics.
Events: concierge opened, shopping conversation started, product recommended,
product clicked, cart prepared, checkout initiated, checkout handoff completed.
Browser requests may record only opened/clicked; they require member auth, origin,
a bounded strict payload and the existing concierge rate gate. Recommendation
counts reflect displayed products. Cart and checkout events originate from
successful verified actions. Analytics failures cannot break the journey.
`checkout_handoff_completed` means an eligible Shopify URL was returned, not
that the browser arrived, an order exists or payment occurred. These are aggregate
funnel measurements, not revenue attribution, unique customers or paid orders.

## Verification and observed live configuration

All provider calls in automated tests are synthetic. No real carts, appointments,
orders or payments were created during verification.

- Focused commerce/member/cart/booking tests pass, including ambiguity and follow-up,
  comparisons, stock, invalid IDs/prices, model output rejection, auth, concurrent
  rate/budget admission, ownership and booking concurrency.
- TypeScript validation passes.
- Full suite in the restricted workspace: 33 of 36 test files pass. Existing
  loading-reliability, restart and Supabase-config tests cannot pass here because
  local sockets are denied and subprocess stdout is empty. Those source files
  were not changed. The remote CI suite must be green before release.
- Production compilation, TypeScript checking, static generation and BUILD_ID
  generation completed using Next's supported compiler API mode temporarily for
  local verification. Standard local `npm run build` hits the same empty-subprocess
  stdout issue in Next's default TypeScript CLI mode. No compiler bypass or config
  workaround is committed; the hosted build verifies the normal configuration.
- `npm run verify:concierge-commerce` adds a guarded isolated-browser journey at
  320/360/390/768/884/1440 widths using mocked Shopify. Chromium itself cannot
  launch in this sandbox (`setsockopt: Operation not permitted`); this script and
  real Fold/iPhone/browser acceptance are launch gates, not claimed passes.
- Read-only production `/api/shop` verification returned Shopify `ready`, checkout
  enabled, ten products with current prices and options. This confirms catalog
  retrieval, not that a new concierge/cart/order journey has completed live.
- Production Eunice `/api/availability?location=eunice` returned no services. Katie's
  hosted menu/schedule/availability must be verified against the correct destination;
  local seeded service prices are test data, never approved merchant configuration.
- Live merchant catalog contains duplicate names and mismatched product copy
  (including eye cream with hair-conditioner description). Review and correct the
  source catalog; no merchant product data was altered by this implementation.

## Preview and launch gates

Development branch: `feat/aethelios-commerce-phase-1`, based on the inspected
main commit. Preview-only branch overrides disable Shopify checkout, the paid
concierge model and semantic interpretation; `DATABASE_URL` is blank so this
preview does not inherit live customer database access. Production settings remain
unchanged. Public catalog read-only review can work with existing preview Shopify
configuration. Authenticated concierge acceptance requires an isolated preview
Postgres database with existing migrations, approved test identities and menu,
Supabase callback allowlisting and an exact preview `APP_ORIGIN`. Do not enable
embedded preview identities in a production-built deployment.

Before launch: green hosted CI/build; isolated authenticated mobile and synthetic
cart acceptance; approved merchant catalog copy/attributes; Katie's configured
published services/schedules; and review of the exact production release. No merge
or production promotion is part of this task. Paid AI remains optional: enable
`RESERVE_CONCIERGE_SEMANTIC_ENABLED=true` only with a supported configured model,
server-side provider access, verified token prices and the existing budget limits.
No Shopify credentials were requested or exposed.

## Next sequence

1. Phase 2: reconcile PR #52's public/provider discovery with this commerce adapter,
   approve Katie's menu/schedules and make conversational booking handoffs clearer.
   Add booking actions only through the existing confirmation and ownership process.
2. Phase 3: consent-based saved shopping preferences, verified Shopify order webhooks,
   privacy-bounded purchase history and paid conversion attribution. Require signed,
   deduplicated order events before reporting revenue; then assess complementary
   product configuration and appropriate customer relationships.
3. Phase 4: add voice after the read-only/action contracts and acceptance suite are
   reliable. ElevenLabs/telephone can consume the same verified contracts; voice
   must not gain additional checkout or appointment authority.

Vitalis remains a separate future decision throughout these phases.
