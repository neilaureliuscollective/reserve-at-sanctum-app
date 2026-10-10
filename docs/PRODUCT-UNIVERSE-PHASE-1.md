# Legacy Reserve Product Universe — phase one

## Identity and actual commerce audit

Canonical source: `neilaureliuscollective/reserve-at-sanctum-app`; Vercel project
`prj_GKN7RVVFAiQfWdTpHT63e0wNydgn`, Stutes Legacy team. The current public brand
is Legacy Reserve; repository and `www.reserveatsanctum.app` retain their internal
legacy names. User confirmed this target. Latest remote main before publication:
`b152276baefe6012a544e12befea52c05a97d904`. Publish against its tree to preserve
the two newer shared app-material commits absent from the attached checkout.

Live `/api/shop` was fetched through authenticated Vercel tooling on October 10,
2026: Shopify ready, checkout enabled, ten published one-time products. No Virelis
exists in the published catalog; it remains a concept at the existing legacy
`/shop/vitalis` product-concept route, distinct from the Vitalis wellness division.
Sanctum Veil (`softening-beard-oil`) is the flagship: actual published image,
$28 USD variant, available inventory and explicit usage/INCI text. No image,
certification, testimonial or ingredient benefit is invented by this build.

Catalog corrections needed in Shopify: conditioner titled Vetiver Noir Shampoo;
eye cream description begins with conditioner copy; two washes share Sanctum Noir
02 while mint wash description says Noir 01. Do not mask these errors in app copy.
No direct supplier API or Selfnamed operational account was verified.

Existing commerce: server-side Storefront API 2026-07; published catalog allow-list;
cart inventory revalidation; guest cart ID in HttpOnly cookie; quantity limits;
Shopify totals; checkout hostname allow-list; explicit user checkout handoff.
Member pricing, subscriptions, order sync and analytics are explicitly inactive.
Existing Supabase server auth and private database boundaries are preserved. The
cutover guide identifies dedicated project `wffmdiszikhmkmoiorac`; live DB/auth
credentials and customer sessions were not independently verified here.

## Current research and decisions

Research accessed October 10, 2026; observations describe source content, not
competitor browser-performance tests or licensed access to Baymard's full database.

- [Baymard Product Page UX 2026](https://baymard.com/research-articles/current-state-ecommerce-product-page-ux): accessible image inspection, useful product context and early shipping/return clarity guide the layout. Preserve immediate purchase access while moving deeper education into readable chapters. Missing policies must be acknowledged, never invented.
- [Apple AirPods Pro](https://www.apple.com/airpods-pro/): benefits become distinct editorial chapters with focused product imagery. Use photographic depth without imposing an opening film or shipping a heavyweight renderer.
- [Aesop Shine Hair & Beard Oil](https://malaysia.aesop.com/products/shine-hair-beard-oil): sensory/formulation discovery connects directly with use and complementary care. Reserve adds context-specific catalog guidance in the same product experience.
- [Le Labo Santal 33](https://www.lelabofragrances.com/santal-33-147.html): product identity, sensory language and considered selection inform editorial restraint. Preserve transparent Shopify options rather than copying its layout.
- [Dior Sauvage](https://www.dior.com/en_us/beauty/products/sauvage-eau-de-parfum-E000000376.html): personalization/refill services must correspond to real operational capabilities. Reserve should introduce these only with actual catalog/fulfillment support.
- [Shopify cart architecture](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage): Shopify remains authority for cart costs and checkout. Future buyer-identity integration must match contextual pricing and authenticated checkout requirements; the present Reserve membership does not establish a Shopify entitlement.
- [Shopify metafields](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/products-collections/metafields): configurable editorial lives in publicly exposed product metafields, independent of transactional data.
- [Google Web Vitals](https://web.dev/articles/vitals): acceptance target at the 75th percentile is LCP <=2.5s, INP <=200ms, CLS <=0.1. No field metrics are available here; do not claim a Core Web Vitals pass from compilation.

## Implemented architecture

Shared `/shop/products/[handle]` template for every published Shopify product.
Imperial Green/ivory/gold/brushed steel materials reuse existing tokens. Arched
photographic stage, image selector and native modal enlargement, immediate variant
and purchase controls, mobile persistent link to the purchase panel, readable
Intelligence/Ritual/Concierge/Confidence chapters, reduced-motion and forced-color
support. No forced intro, autoplay or fabricated 3D/360 media.

`lib/product-universe.ts` adds optional bounded product-image/metafield/shop-policy
reads. Failure keeps the original published product/variant purchasing intact.
Only trusted Shopify image URLs render. Policies become plain text; external HTML
is never injected. Metadata and escaped Product/Offer JSON-LD contain actual data.
The existing global noindex rule remains; public SEO activation is a later release
review, not silently switched on for the whole app.

Editorial definition: product metafield `legacy_reserve.product_universe`, JSON,
Storefront access `PUBLIC_READ`. Supported fields: `family` (hair/beard/skin/body/
wellness/essential), `introduction`, `ingredients` [{name, explanation}], `ritual`
[{title, instruction}], `specifications` [{label,value}], `complementaryHandles`.
Unknown fields/malformed data are ignored safely. Authors must verify every claim
against supplier documentation and approved labels before publishing. No Admin API
writes were made. Example structural content (replace with verified actual text):

```json
{"family":"beard","ingredients":[],"ritual":[],"specifications":[],"complementaryHandles":[]}
```

Sanctum Veil has a source-gated local editorial fallback: exact Shopify ID/handle
and both published usage sentences must match. Ritual and INCI come from that
published description. Other products use honest missing-content fallbacks until
approved editorial is supplied. Complementary links only resolve against the
published collection; there is no speculative recommendation or discount bundle.

Aethelios extends the existing `/api/aethelios/member` endpoint with validated
`productHandle`. Existing authorization, origin checks, rate limits and emergency
boundaries remain. Product replies are deterministic catalog guidance, not a new
LLM service: description, usage, ingredients and current options. No chat action
mutates a cart. The visitor must use existing product selection and checkout.
Guests receive the existing sign-in requirement. Open-ended comparisons,
preference-driven recommendations and confirmed cart proposals remain phase two.

## Tests and release limits

- Direct TypeScript check passed.
- 15 targeted tests passed: commerce/inventory/price/checkout-host protections,
  editorial validation, optional enrichment outage, trusted media and flagship
  source gating.
- Full suite: 33 of 36 test-file suites passed in the restricted executor. Three
  existing suites (loading-reliability, restart, supabase-config) failed; diagnosis confirmed EPERM on local listening and empty child-process stdout
  in the restart/config probes. Local socket operations return EPERM.
- Browser commerce script could not start its local server (EPERM); no desktop,
  mobile, image zoom, keyboard or real checkout interaction pass is claimed.
- Initial production build compiled, then failed at sandbox TypeScript CLI output
  parsing. The installed documented compiler-API fallback completed the full production
  build successfully. Original next.config.ts was restored before committing.
- No real paid order placed. No production deployment until preview browser,
  Shopify cart/checkout and authenticated product concierge acceptance complete.

## Next phases and acceptance

1. Correct catalog naming/copy; publish reviewed supplier editorial and complete
   photographic angle/usage assets. Validate the new gallery and actual cart on
   320/390/800/1440px, keyboard, reduced motion and physical installed PWA.
2. Connect consent-aware analytics through the existing site architecture: view,
   option selection, add, checkout, approved bundle attachment and concierge assist.
   Shopify order webhooks provide deduplicated purchase/revenue, keyed by order ID;
   checkout handoff must never count as an order. AOV and revenue/session require
   real order attribution. No tracking provider or costly subscription added.
3. Add grounded comparisons, customer-stated preference routines, explicitly
   confirmed cart proposals; never infer allergy/clinical suitability. Add genuine
   review source and shipping estimates. Bundle pricing must come from Shopify.
4. Member/Shopify identity mapping, real eligible discounts, optional supported
   selling plans and replenishment only after entitlement/consent infrastructure.
5. Controlled experiments evaluate gallery/ritual/concierge attachment against
   add-to-cart and completed-order metrics with performance guardrails. Release
   Virelis as flagship only when actually published with complete commerce/media.
