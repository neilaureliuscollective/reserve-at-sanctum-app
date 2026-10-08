# Vitalis Phase 2 — Membership economics and revenue intelligence

As of October 8, 2026. Founder authorized research, implementation, additive database work and safe deployment of administrative/nonclinical/nonpayment capabilities. Live billing and clinical enrollment remain subject to separate final approval and verified partner arrangements.

## Decision and implemented scope

The highest-leverage next phase is a transparent economics engine, not another medical checkout. `/studio/vitalis/revenue` provides an owner-only twelve-month simulator, saved conservative/base/strong scenarios, tier unit economics, product margin protection, scale comparisons, projected trends and JSON/CSV export. `/vitalis/membership` presents the proposed $49/$149/$249 strategy with planned benefits and explicit exclusions. It links to Phase 1 free early access; it cannot select a paid plan, subscribe, grant access, apply discounts or enroll a patient.

The public proposal is independent of private scenario edits: changing a forecast cannot change customer pricing. No founding-price anchor, artificial scarcity or unverified treatment inclusion is advertised. Existing house membership records and complimentary grants remain untouched. Vitalis is linked from its introduction and the existing Membership page; founder economics is linked from Vitalis operations.

The first financial model is editable in the app, with twelve monthly acquisition inputs and every material tier/cost driver. `VITALIS-FORECAST-PRESETS.json` preserves the initial hypotheses for audit. The browser export produces a single scenario's importable assumptions JSON and a twelve-row numerical CSV. CSV is an output, not an editable formula workbook; the app/JSON are the authoritative editable model.

## Repository assessment

Inspected main `6fbed214d98bbcd1a071be999188fc8c37b91fbc`, including Phase 1 PR #33 and prior membership, Personal Reserve, commerce readiness and Studio recovery releases. Phase 1 contains a public intro, optional service/state interests, separate collection/outreach consent, account-owned updates/withdrawal, owner demand/partner/release controls, private RLS tables and aggregate analytics.

Existing membership uses plans, requests, snapshots, complimentary lifecycle and audit events. It has no reconciled paid subscription ledger. Square already has server-only customers/catalog/orders/subscription adapters, mappings and signed webhook receipt; receipt processing does not yet reconcile membership entitlements. A later Shopify Storefront bridge is also present and explicitly selected by configuration; member pricing and subscriptions are disabled. Preserve both seams and the existing configured retail direction until migration is verified. No provider SDK, existing integration, environment secret or checkout adapter was replaced here.

The current wellness experience supports personal routines, educational concierge navigation and grooming preferences. It is not a biomarker dashboard, personalized clinical intelligence system or the full Performance application. Marketing must reflect that limited current value. The old oil concept still has legacy Vitalis identifiers/artwork; this phase does not rename retail catalog assets. The intended oil brand is **Virelis**, separate from the **Vitalis** division.

Authentication uses verified Supabase users and database-owned roles; private queries use the server Postgres adapter. Owner-only authorization applies both to page data and the API. No second account is introduced.

## Current competitive research

Primary sources were checked October 8, 2026. Prices below are publicly advertised, not contract rates or proof of demand. Checkout/state/dose/term variations must be rechecked before comparison advertising. Third-party provider review estimates are not used as verified wholesale costs.

| Provider | Public positioning / price | What changes the actual bill | Operational lesson |
| --- | --- | --- | --- |
| Vita Bella | $129/month; $1,399 annual; selected TRT/B12/alternative treatment inclusion advertised | $99 initial consultation; monthly minimum three months; Essential labs $89, comprehensive $199; selected treatments subject to approval; shipping separate on the current description; other medication extra; annual lab wording needs checkout confirmation | Selected treatment inclusion at $149 is a realistic competitive aspiration, not a unique differentiator. Provider continuity, refills and clear exclusions are central. |
| Hone | Current how-it-works page shows Basic $25/month, Premium $155/month plus medication; initial Premium test $65 | Older official help article still lists $25/$129/$149, so it is historical/conflicting evidence rather than today's universal rate. Basic consult is extra; testing/provider inclusion varies by plan | Biomarker clarity and ongoing care matter; $49 for digital-only requires value beyond a discounted product catalog. |
| PeterMD | TRT page shows $79/month on $948 annual prepay; $109/month on $654 six-month prepay; $139 monthly-labelled option | Page also displays an inconsistent $1,068 total for the $139-labelled option. Labs require separate verification. Refund/auto-bill policy requires email cancellation at least 48 hours before renewal and generally limits refunds | Headline monthly equivalents conceal commitments. Do not copy their inconsistent total or describe a prepaid term as month-to-month. |
| Maximus | Injectable TRT $199.99 one month, $149.99 three months, $99.99 six months; first-month 50% promotion on six-month plan | $99.99 lab kit separately listed; protocol/dose pricing differs; committed terms are not cancelable early; nonrenewal can be managed through dashboard | Medication plus provider access, shipping and monitoring can support retention. Promotional entry cost is not sustainable ARPM. |
| Fountain | $199 every four weeks, $499 every twelve weeks, $1,799 every forty-eight weeks | Four weeks is not a calendar month: starter equates to $2,587 per 52 weeks. Annualize the others by their actual cadence. Evaluation/lab/at-home collection terms need verification; current page describes lab scheduling and video visit | Convenience and responsive coordination are actual service obligations, not free software features. |
| Defy | Service-based integrative care, lab/refill/consultation portal and an additional health app | No reliably fetched, current universal all-in TRT price found. Official search-indexed terms require periodic provider consultation and permit late-cancellation fees; older 2023 pricing PDF is historical and is excluded from defaults | A transparent separate-service model is legitimate. Do not invent a flat monthly rate. |
| Hims/Hers GLP-1 | Current weight-loss pages distinguish medication pricing from membership; membership promotion $39 first month, then $149/month | Branded drug/dose/promotion materially changes total cost; older $199 compounded headlines are historical rather than general current pricing | An advertised medication price may omit the membership. Never use treatment gross as brand revenue without a verified billing role. |

Sources: [Vita Bella membership](https://vitabella.com/membership/); [Hone current process](https://honehealth.com/how-it-works/), [older Hone cost article](https://help.honehealth.com/hc/en-us/articles/24936934303127-How-much-does-it-cost), [Hone cancellation FAQ](https://help.honehealth.com/hc/en-us/articles/40162270879255-Hone-Health-Membership-Frequently-Asked-Questions); [PeterMD TRT](https://getpetermd.com/mens-trt/), [refund/auto-bill policy](https://getpetermd.com/refund-autobill-policy); [Maximus injectable](https://shop.maximustribe.com/testosterone/Injectable-TRT), [lab kit](https://shop.maximustribe.com/lab-tests), [term/cancellation details](https://www.maximustribe.com/pages/how-to-get-testosterone-online); [Fountain TRT](https://fountain.net/trt); [Defy app](https://www.defymedical.com/services/defy-medical-app/), [terms](https://www.defymedical.com/about-us/terms-of-service/); [Hims current weight-loss](https://www.hims.com/weight-loss), [2026 announcement](https://news.hims.com/newsroom/wegovy-r-pill-and-wegovy-r-pen-now-available-with-hims-hers).

Public anecdotes describe unexpectedly additive fees, laboratory/refill delays, support handoffs and cancellation difficulty. They are not representative prevalence estimates: [PeterMD cancellation account, October 2024](https://www.reddit.com/r/trt/comments/1g53ghf/petermd_users_have_you_had_a_bad_experience/), [Hone account, 2025](https://www.reddit.com/r/Testosterone/comments/1lof8l1). The stronger product response is transparent totals, continuity, service levels, refill status and uncomplicated cancellation, rather than more dashboard features.

No competitor's actual CAC, cohort churn, willingness-to-pay conversion or treatment gross margin was publicly verified. Public prices show market positioning, not validated demand for this particular membership. Recurly's subscription research is cross-industry and its current churn page has changed time-basis wording; do not transplant a percentage as a health-membership benchmark. [Recurly research](https://recurly.com/research/), [2024 report announcement](https://recurly.com/newsroom/recurly-releases-its-2024-state-subscriptions-report/). Use explicitly monthly 5%, 7% and 10% hypotheses and stress 15%; at 7% monthly churn, a starting cohort retains only about 42% after twelve churn periods.

## Membership strategy

| Tier | Proposed monthly price | Value that must exist before charging | Proposed retail benefit |
| --- | --- | --- | --- |
| Essential | $49 | Useful personalized nonmedical routines, performance/recovery/nutrition education, appearance integration and a consistent member experience. No care or medication inclusion. | 10% on eligible margin-qualified items |
| Optimize | $149 | Essential plus an actual coordinated clinical relationship with qualified partner follow-up and a verified laboratory pathway. Treatment inclusion remains a goal, not a promise. | 15% on eligible items |
| Sovereign | $249 | Optimize plus demonstrably higher-touch non-diagnostic coordination and a sustainable quarterly curated package, with staffing limits and response expectations. | 20% on additional eligible items |

Do not sell Optimize as $149 for an app and a referral while a rival offers selected treatment at $129. Prefer a verified treatment-inclusive core if partner economics, billing and operational terms support it. Otherwise disclose membership, consultation, labs, medication and shipping as separate amounts before enrollment, and validate whether the resulting total is compelling. Avoid a second large clinical-access fee for an existing provider subscription without incremental service value. Essential needs a small paid-value pilot before assuming $49 conversion. Sovereign should launch after concierge capacity and package fulfillment are proven.

No monetary discount is enforced until landed COGS, packaging, shipping, fulfillment, processing, returns and stacking rules are verified per SKU. Virelis, grooming, skincare, wellness and supplements may be eligible later; no inventory or formula costs were verified in this phase. Prescription treatment is excluded from retail discounts. Additional medications and approved peptide options require partner formulary/jurisdiction confirmation; competitor listings are not approval evidence.

## Connect Scripts — verified public evidence and unresolved contract

The official USHWN site identifies Connect Scripts as its provider platform, links directly to `www.connect-scripts.com`, and distinguishes independent clinicians and pharmacies. Connect-Go/Connect Telehealth is a separate branded front-end CRM. This identity chain is publicly observable; it is not due diligence on the treating entities or a signed agreement. Public legal sections on USHWN are labelled draft pending review.

The current public Connect-Go pricing describes a $0 **base CRM software license**, metered usage, asynchronous provider reviews $15–$40 and live visits $50–$150. Pharmacy, medication, dispensing/compounding, fulfillment and shipping are separately billed. Implementation, support and integrations are scoped. These are partner-network ranges, not this founder's offer or TRT costs. A published $2,000 application-support charge plus third-party fees is not a blanket clinical/compliance approval. No definite lab price, per-program pharmacy cost, SLA, required minimum or complete API contract was publicly obtained.

Connect Scripts advertises hosted/embedded/API-driven intake, provider routing, configured payment reconciliation, clinical-system handoffs and event/status connections. Access, scopes, authentication, webhook signature format, retry/idempotency guarantees, sandbox access and program-specific capability remain unresolved. Do not implement imaginary endpoints from the illustrative intake object on their marketing page. The EPCS wording is a capability claim, not confirmation that our proposed TRT pathway is approved.

Sources: [USHWN identity/network](https://ushwn.com/), [public cost stack](https://www.connect-go.com/pricing), [Connect Scripts capabilities](https://www.connect-go.com/platform/connect-scripts), [provider portal](https://www.connect-scripts.com/).

Required written quote and operational packet:

1. Contracting technology entity, treating professional entity, medical governance, pharmacy identity and program/state/age coverage, including appropriate men's and women's pathways.
2. Initial and follow-up visit cadence and cost; denied/ineligible intake charges; cancellations, refunds and ongoing support responsibilities.
3. Medication formulary, per-dose quantity and landed prices, supplies, cold-chain/shipping, refills, shortages and specialty add-ons. Confirm the exact eligible core that a $149 bundle would cover.
4. Required lab panels, baseline/follow-up frequency, draw fees, state limitations, responsibility for ordering and interpreting results, and who bills them.
5. Platform/usage/support/implementation/minimum/volume fees and settlement or pharmacy prepayment timing.
6. Merchant-of-record and invoice structure, provider compensation/administrative fee structure, and separate nonmedical membership versus clinical charges. No referral revenue is assumed.
7. BAA/privacy/security arrangements applicable to the actual data flow; provider-held clinical data, separate clinical consent, retention and permitted status-only reporting.
8. Integration documentation and sandbox: hosted handoff URLs, identity linking, authorization, signed webhooks, retries, event semantics, reconciliation and support escalation.

The user's calculator independently reconciles as `100 × sum(0.85^k, k=0..11) ≈ 571.84` active at Month 12. Rounded 572 × $300 = $171,600. Deducting $130 per active patient and $15,000 new-patient CAC yields approximately $82,240 monthly modeled profit. That treats $30 consultation plus $100 medication as a monthly cost for every active patient and omits other material costs. Multiplying Month 12 by twelve gives a run rate, not earned year-one profit.

## Payment architecture and Square research

Square can support nonmedical recurring services/products using catalog plan variations, customers, cards/invoices, discounts, pause/cancel/plan swaps and payment/subscription events. Our app remains the entitlement authority after verified payment reconciliation; a signed `subscription.updated` event alone does not prove a successful charge. Future processing must consume invoice/payment success/failure, refunds, effective term boundaries and idempotent status changes, with retryable durable processing. The existing webhook family handler is a no-op and its receipt path can acknowledge database errors: that must be fixed before financial entitlement reliance. This phase does not turn that seam on.

Current developer docs require shipped fulfillment for itemized subscription catalog products and do not support ACH through the Subscriptions API. Do not assume monthly digital access plus a quarterly physical box is a single ready-made cadence: model the membership and separate fulfillment entitlement, or verify supported order/plan structures. Member inventory, retail order sync and refunds must reconcile in the chosen commerce provider before discounts or boxes become active.

**Square's current support policy prohibits card-not-present payments for items or services involving prescription-required products.** A digital TRT-inclusive bundle must not be routed through ordinary Square subscription billing. Keep eligible nonmedical membership/retail billing separate; clinical treatment must use the appropriate approved partner merchant arrangement and legal structure. Changing the label to “membership” does not resolve an included-prescription restriction. Obtain specific provider/processor confirmation.

Published US fees differ by channel: online API 2.9% + $0.30, card-on-file/manual 3.5% + $0.15, online/invoice rates vary by plan. Defaults use the more conservative card-on-file assumption. Actual routing and negotiated pricing remain unknown. Refunds do not assume recovery of processing fees.

Sources: [Subscriptions API](https://developer.squareup.com/docs/subscriptions-api/overview), [actions and plan changes](https://developer.squareup.com/docs/subscriptions-api/actions-events), [dashboard customer management](https://squareup.com/help/us/en/article/7627-get-started-with-subscriptions-in-dashboard), [US payment fees](https://squareup.com/us/en/payments/our-fees), [CNP prescription restrictions](https://squareup.com/help/us/en/article/8393-restricted-products-for-card-not-present-transactions).

## Financial model conventions and assumptions

Twelve month forecast, USD, expected fractional members. No fake customer records are created. Starting membership is zero. Each month: opening cohorts → tier-specific cancellations → simultaneous movements among surviving tiers → new members allocated by mix → closing members billed and serviced for a full month. New members do not churn in their joining month. Movement rates are source-cohort rates; Optimize upgrade plus downgrade cannot exceed 100%. Upgrading Essential into clinical Optimize also incurs its onboarding allowance; Optimize-to-Sovereign does not repeat first clinical onboarding.

Membership MRR excludes product sales, partner-billed treatment, refunds and one-time costs. ARR is closing MRR × twelve, not year-one receipts. Gross revenue is membership plus discounted retail baskets. Refund allowances reduce revenue once. Delivery costs include digital, support, clinical, lab, medication if included, product COGS/fulfillment, initial onboarding and monthly box provision. Gross profit subtracts delivery; contribution additionally subtracts processing. Operating income additionally subtracts acquisition and recurring overhead/capacity. It is before tax, finance and startup/inventory cash. This is operational planning, not a GAAP accounting ledger.

Box provision is landed package cost divided by three. Cash delivery is simulated in calendar months 3/6/9/12 for that month's Sovereign cohort, including recent joiners. Cash flow adds back monthly provision and subtracts modeled shipments. This deliberately simple schedule needs actual earned-benefit dates, inventory and fulfillment policy before launch; there is no liability ledger. Cash starts after startup spend and an inventory deposit/reserve, treated as tied-up cash without assuming release. Minimum funding is the deepest cumulative deficit, including Month 0. Add contingency, payment settlement lag and inventory lead-time requirements; none are fabricated as known terms.

| Driver | Conservative | Base | Strong |
| --- | --- | --- | --- |
| Monthly signups | 8,9,10,11,12,13,14,15,16,18,19,20 | 15,18,21,24,27,30,33,36,39,42,46,50 | 25,30,35,40,45,50,60,65,75,80,90,95 |
| Mix Essential/Optimize/Sovereign | 25%/60%/15% | 25%/60%/15% | 25%/60%/15% |
| Monthly churn, each tier | 10% | 7% | 5% |
| CAC first → final | $220 → $200 | $150 → $120 | $120 → $90 |
| Per-month digital/support/clinical/lab cost | Base support ×1.25, clinical ×1.4, labs ×1.25 | Essential $12/$8/$0/$0; Optimize $10/$15/$25/$20; Sovereign $15/$35/$35/$25 | Base costs |
| Initial clinical onboarding | $60 | $30 | $30 |
| Monthly product order rate | 12% | 20% | 30% |
| Membership refunds | 3% | 1.5% | 1% |
| Startup + inventory reserve | $15k + $1k | $10k + $1k | $15k + $1k |

All cases use proposed prices $49/$149/$249; products: $50 list basket, $18 landed COGS and $4 fulfillment/shipping allowance, 2% refunds, discounts 10%/15%/20%; Sovereign box $45 landed every quarter; processing 3.5% + $0.15; fixed $4,000 plus platform $150, with $500 extra monthly capacity expense for each additional 100-member block beyond the first. Fixed overhead must include intended founder compensation; it is not all take-home profit. A $4 shipping allowance and $30 clinical onboarding are hypotheses, not verified tariffs or the published live-consultation range. $70 Optimize monthly servicing excludes medication. Defaults include **no medication** and **zero partner treatment attach/revenue**. The editable $35 medication field is a dormant test assumption, not a pharmacy quote.

Monthly transitions: Essential→Optimize 1%; Optimize→Sovereign 0.5%; Optimize→Essential 1%; Sovereign→Optimize 1%. No uplift claim or referral acquisition effect is assumed. CAC declines linearly over twelve months, representing the stated organic/referral hypothesis; actual channel CAC must include attributable media, creative and agency costs without double counting fixed overhead. No credible public evidence validated $150 CAC for this new brand.

Loss-making discounted product orders are excluded from the forecast and visibly flagged. Zero-margin orders are mathematically permitted, not commercially recommended; launch should require an approved positive margin floor, SKU exclusions and no uncontrolled stacking. No real order discounts change.

LTV is per-tier recurring contribution / monthly churn minus initial onboarding, before fixed overhead, and assumes no tier movements; zero churn is undefined. LTV:CAC uses starting CAC. CAC payback uses recurring contribution before fixed overhead and separately disclosed onboarding. It is not a guaranteed lifetime or a realized cohort value. Scale comparisons use the selected fixed tier mix, replace churned members at final CAC, charge replacement onboarding by tier, include quarterly provision and capacity overhead, and assume no net growth.

## Recalculated results

| Scenario | Month 12 active | Month 12 MRR | Year-one net revenue | Year operating income | Minimum launch funding | Sustained nonnegative operating month |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Conservative | 108.4 | $14,991 | $94,054 | **−$58,410** | $74,664 | None |
| Base | 285.8 | $39,538 | $238,224 | **$741** | $32,544 | Month 7 |
| Strong | 565.3 | $78,193 | $457,788 | **$72,524** | $30,272 | Month 5 |

Base Month 12 operating income is $7,564, but earned year-one operating income is only $741 and cash after startup/inventory is approximately **−$10,956**. The base launch does not recover initial cash within year one. Strong cash after startup/inventory is $55,131; conservative cash is −$74,664. Earlier 111/281/589 member illustrations were not treated as targets. These independently calculated cohorts are driven by the explicit signup schedules above.

| Steady members, base assumptions | Membership MRR | Modeled monthly operating income |
| --- | ---: | ---: |
| 100 | $13,900 | $1,832 |
| 300 | $41,700 | $12,797 |
| 500 | $69,500 | $23,762 |

These scale estimates use 25/60/15 mix, 7% churn, $120 replacement CAC, $70 Optimize service delivery, no included medication, actual modeled discount/product contribution, $4,150 starting fixed/platform overhead and $500 capacity steps. They include replenishment acquisition rather than claiming all recurring contribution as profit. Projected contribution/member: Essential $30.47, Optimize $75.00, Sovereign $114.53. Initial clinical onboarding is additional. Sovereign's box provision is $15 per month.

### Stress tests and the $149 treatment question

| One change from base | Year operating income | Minimum funding |
| --- | ---: | ---: |
| Optimize includes $35 landed medication at 80% eligibility | −$26,315 | $42,795 |
| Optimize includes $100 landed medication at 80% eligibility | −$76,563 | $88,260 |
| Initial clinical onboarding $150 | −$33,941 | $50,277 |
| Product fulfillment $8 rather than $4 | −$575 | $32,847 |
| Monthly churn 15% | −$19,888 | $37,137 |
| CAC stays $300 | −$63,336 | $75,033 |

At $149, Optimize has about $75/member/month recurring headroom before included medication and before acquisition/fixed overhead. At 80% inclusion, $100 medication costs consume $80/member/month, leaving approximately **−$5 recurring contribution**. For a suggested 30% recurring contribution floor, the maximum landed medication cost under the base allowances is approximately `($75 − $149×30%) / 80% = $37.88` per eligible member. That is a planning ceiling, not permission to prescribe, a guarantee of profitability, or a verified wholesale price. If all members receive treatment, the analogous ceiling is approximately $30.30. Lab/visit/support changes lower it further. Bundle viability needs the actual costs and billing structure, not the competitor's retail drug price.

## Architecture, permissions and release

`lib/vitalis/economics.ts` is a browser-safe deterministic engine with strict finite/bounded Zod inputs. It never imports billing/clinical adapters. `membership-design.ts` holds proposed positioning and inert boundary flags; actual offer/billing authority remains outside this phase. The owner UI imports server persistence types only, preserving the Studio browser boundary fix.

`reserve_vitalis_forecasts` is the only additive table: three scenario keys, numeric/boolean assumption JSON, revision, updated_by and timestamp. No patient/transaction/lab data, notes or contact identities belong in it. No forecast defaults are seeded as actual business records. Owner save uses revision-bound insert/update with collision protection; mixed or unknown input fields are rejected. The existing schema/migrator and role lockdown are reused. RLS is enabled with no browser policy; PUBLIC/anon/authenticated have no grants. The private API is no-store, origin guarded, JSON-body limited to 16 KB, and rate-limited through the existing Vitalis mutation quota. A saved forecast cannot activate anything.

Actuals read only aggregate active early-access/email-permission counts and existing membership counts by access basis. Paid Vitalis membership, MRR and financial records are explicitly **unconnected/unavailable**, not shown as simulated actuals or inferred from complimentary access. No clinical record data is loaded or sent to Aethelios, analytics, commerce or another application.

Apply the new additive migration and explicit browser-role revokes before deployment; verify grants and RLS. Deploy through focused PR/main/Vercel practices. Verify exact release SHA, public membership proposal, anonymous finance API denial, and existing app routes. Authenticated verification uses local synthetic identities; no synthetic production forecast, customer, paid plan, treatment or transaction is created. Roll back code to the previous production deployment while retaining the forecast table and legitimate drafts. Owner scenarios cannot affect current business operations.

## Verification and follow-on phases

124 tests pass, including independent numerical expectations, cohort conservation, transition onboarding, refund/cost separation, treatment exclusion from brand revenue, medication stress, loss-making product gating, quarterly cash versus expense, LTV edge cases, invalid inputs, owner enforcement, concurrent first save, revisions and RLS. Local browser verification passes public comparison at five widths and owner workspace at four widths, including persistent edits, invalid mix, CSV export, medication toggle, denied roles/origins/extra fields, stale edits and server failure. Production build and release checks must pass before publishing.

Commands: `npm test`; `npm run typecheck`; `npm run build`; `CHROMIUM_PATH=<browser> npm run verify:vitalis-revenue`. The browser script refuses hosted database variables and resets only local synthetic forecast/rate fixtures. Existing Vitalis and Personal Reserve regressions remain available.

Three major phases remain before a broad commercial launch, dependent on partner/processor access:

1. **Verified offer and valuable member pilot:** written partner/processor economics, tier value validation, genuine digital wellness personalization, support/cancellation/refund policies, verified SKU margins and capacity. Select one initial launch offer; do not require all three live at once.
2. **Billing, entitlements and partner handoff:** approved nonmedical sandbox billing, durable financial webhook reconciliation, cancellations/failed payments/refunds, margin-qualified retail discounts, separate partner clinical consent/handoff and verified billing responsibility. Clinical records stay with the clinical system. Founder must supply approved account credentials through secure environment setup and sign contracts; no bank passwords are needed.
3. **Controlled paid launch and operating proof:** hosted authenticated/end-to-end tests, a limited real-member pilot with explicit final approval to charge/enroll, refunds/renewals, support and fulfillment measurement, margin/churn/CAC validation, then expand. Sovereign boxes/concierge can follow this pilot if not yet ready.

Biomarker ingestion, clinical intelligence visualization and specialty-treatment discovery are later enhancements, not prerequisites for the first profitable, operationally credible offer.

Release preparation: local production build/typecheck, all 124 tests and final Phase 2 browser checks passed. Hosted additive forecast migration applied; RLS enabled, zero policies and zero PUBLIC/anon/authenticated grants verified. No production forecast rows were inserted. Release marker: `legacy-reserve-vitalis-revenue-20261008`.
