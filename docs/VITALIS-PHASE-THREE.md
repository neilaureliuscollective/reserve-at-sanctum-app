# Vitalis Phase 3 — member value pilot and launch evidence

October 8, 2026. Builds on merged PR #34 and the existing Legacy Reserve application. The safe next phase supplies useful member functionality and a founder decision workspace while partner contracts and program economics remain unverified. It does not open paid or clinical enrollment.

## Inspection and decision

Main at inspection: `2ccacaf8e58b4ab1cce8b1ed9c7d9f55253b6a8d`. Phase 1 already supplies introduction, account-bound early access, separate outreach permission, partners, visibility controls and owner operations. Phase 2 already supplies target membership comparison and private configurable forecasts. The app has canonical Supabase authentication, server-owned roles, private Postgres/RLS, memberships, Pathways and account-owned routines, plus inactive Square/Shopify commerce seams. No account, catalog, billing or financial model was recreated. The existing Personal Reserve routine remains authoritative for its own content; this pilot never writes that table. Virelis product assets, booking and staff notes are untouched.

The immediate commercial uncertainty is not a missing checkout button: it is the unverified cost stack, approved billing structure and value members will pay to keep. This phase deliberately combines a low-burden voluntary member pilot with durable evidence tracking. A small habit tool alone does **not** validate a $49 subscription or justify higher tiers. Pilot use and direct feedback must inform an offer, and the three proposed tiers need not all launch together.

## Current primary research

- [Connect Telehealth pricing](https://www.connect-go.com/pricing), inspected October 8: public base CRM license is $0 with separate usage, provider and pharmacy costs. Published asynchronous review range is $15–$40 and live consultation $50–$150 per encounter; actual rates depend on the program. Medication/dispensing/fulfillment/shipping and implementation remain separate. A platform capability page is not a signed contract or documented API entitlement. Wholesale TRT, laboratory and program-specific follow-up costs are still unknown.
- [Square Subscriptions API](https://developer.squareup.com/docs/subscriptions-api/overview) remains the existing eligible nonmedical recurring-commerce direction; this phase adds no SDK, payment plan or webhook behavior. [Square card-not-present restrictions](https://squareup.com/help/us/en/article/8393-restricted-products-for-card-not-present-transactions) mean online prescription-inclusive billing requires a separately verified approved medical-partner/processor arrangement. A nonmedical label is not a workaround.
- [CDC About Sleep](https://www.cdc.gov/sleep/about/index.html) supports education around consistent sleep/wake times and an appropriate wind-down environment. The pilot does not assess sleep disorders or prescribe a sleep-duration target.
- [CDC adult activity guidance](https://www.cdc.gov/physical-activity-basics/guidelines/adults.html) supports general everyday movement and adapting activity to abilities. The pilot is not a training program, activity-dose prescription or clinical fitness assessment. Performance remains its own division.
- [NIDDK changing habits](https://www.niddk.nih.gov/health-information/diet-nutrition/changing-habits-better-health) supports small, realistic goals, planning and progress review. The implemented prompts are original, restrained educational summaries; they make no hormone, weight-loss or longevity outcome promise.
- [FTC mobile-health app guidance](https://www.ftc.gov/business-guidance/resources/mobile-health-apps-interactive-tool) and [health privacy resources](https://www.ftc.gov/business-guidance/privacy-security/health-privacy) support data minimization, clear collection choices and privacy/security review. Being nonclinical does not automatically make wellness data nonsensitive or establish exemption from privacy obligations. This phase does not claim HIPAA certification or add advertising, wearable ingestion or AI processing.

These sources support the product boundaries. They do not prove member demand, retention, revenue, partner availability or a treatment-inclusive $149 price. See Phase 2 documentation for current competitor research and the unchanged financial hypotheses.

## Implemented member experience

`/vitalis/journey` uses the existing account and client role. Guests see sign-in with a return destination; owner/operator/staff accounts cannot read or create customer pilot records. Links appear in Vitalis, its membership vision and My Reserve. The existing navigation and PWA remain shared.

The free pilot offers sleep consistency, everyday movement or meal preparation; a self-selected 5/10/20-minute planning window; and a 1–7-day weekly target. Guidance is personalized by these explicit choices, not inferred from health records. Member adulthood attestation and versioned save consent are required. There is no DOB, condition, symptom, medication, treatment eligibility, body measurement, journal, food intake or lab field.

After saving, the member sees one useful step, a Monday–Sunday completion view and a reversible mark for **the server’s current America/Chicago day**. No client date is accepted, so future/backdated marks cannot be created through the API. Counts are self-reported habit activity, not biomarkers or a health score. Changing direction explicitly resets completion history; changing pace or target preserves it. Reload restores the authoritative saved state. Clearing removes direction, target, window, dates and consent while preserving a minimal inactive revision record against stale resubmission. Clearing does not withdraw early access, change outreach permission or overwrite the canonical routine.

The educational source is displayed for the active direction. Performance, Pathways, existing routines and early access are linked as distinct existing services. A static provider-question prompt prepares future clinical conversations without collecting answers or transmitting a referral. Medical services remain clearly planned. The pilot has no fee or promised paid entitlement.

## Founder launch-readiness workspace

`/studio/vitalis/launch` and `/api/studio/vitalis/launch` enforce owner authorization independently of the Studio shell. Nine evidence items cover the offer, partner economics, clinical responsibility, processor arrangement, privacy, retail margins, support/cancellation/refunds, member-value validation and sandbox verification.

Each review stores only a bounded document reference, founder attestation, revision and author/time. A recorded affirmative review requires a reference. HTTPS references reject credentials, ports, query strings and fragments; repository document references are bounded and cannot traverse directories. References are plain inputs, never fetched and never passed to a partner or AI. No private contract text, tokens, patient data or legal conclusion is stored. Founder attestation is **not** independent certification. Draft checkbox totals are explicitly labeled and distinct from saved-record counts. Reload discards unsaved drafts; stale saves fail with a conflict.

Actual pilot aggregates are active rhythm count and active accounts updated within seven days. No identities, directions, dates, routines, diagnosis or clinical outcome data are exposed to this workspace. Recently updated includes settings edits; it is not measured retention or willingness to pay. Zero production pilot data is fabricated.

Even nine affirmative saved reviews cannot activate anything: commercial boundary flags remain false for charges, clinical enrollment and retail discounts. This workspace prepares a reviewable launch, rather than functioning as a hidden release switch. [Partner quote request](VITALIS-PARTNER-QUOTE.md) is a founder-use draft, not sent outreach.

## Architecture and privacy

Only two additive tables are introduced by `20261008141500_vitalis_pilot.sql`:

- `reserve_vitalis_journeys`: client-owned structured choices, bounded completion-date array, notice/consent, revision and update time. Active rows require all choices and consent; completion arrays are capped at 90 dates.
- `reserve_vitalis_launch_reviews`: one optional row per fixed launch gate, reference/attestation and revision metadata. Defaults are computed, not seeded as verified evidence.

Both have RLS enabled, no browser policies and no PUBLIC grants. Hosted migration also explicitly revokes anon/authenticated grants using the established server-only pattern. Account ownership always comes from the verified server actor, never request fields. Unknown fields, forged dates and clinical fields are rejected. Private GET responses use no-store; mutation origin checks, bounded JSON and the existing per-user Vitalis rate quota are reused. No new vendor, environment variable, credential or infrastructure subscription is required.

Journey mutations serialize on the account row in a database transaction and require the latest revision, including first saves. This protects competing tabs, duplicate completion marks, direction resets and clearing against stale overwrite. Launch reviews use atomic revision-bound insertion/update. Client mutations use timeouts, preserve drafts on failures, display status messages and offer explicit reload.

Privacy limitation: completion dates are filtered to the last 90 days on reads and physically pruned on the next save/mark. There is no scheduled purge job; an inactive-but-uncleared account can retain up to 90 older dates until its next mutation. The notice states this distinction. Consent timestamps are current-state evidence, not a full consent audit ledger. Automatic inactivity retention, full account export/deletion and any partner/wearable clinical data flows require the next privacy/data-lifecycle review. Clearing removes all pilot choices/dates immediately, leaving only minimal inactive revision metadata. Ordinary app roles have no endpoint for reading another client’s pilot, including the founder; infrastructure administrators remain technically capable of database administration.

## Verification and safe release

Meaningful tests cover Chicago/DST calendar boundaries, adulthood/consent/bounds, member-only access, first-save races, account isolation, completion/undo, concurrent stale edits, direction-history reset, canonical routine preservation, date pruning, clearing/rejoin, evidence reference validation, owner authorization, review races and inert commercial boundaries. Existing Vitalis RLS coverage now expects nine private tables.

Browser verification uses local synthetic identities only and refuses hosted credentials. It exercises guest/client/other/owner/operator guards, onboarding, marking, persistence, undo, stale/origin/unknown-date rejection, member clearing, owner evidence persistence, inactive billing flags, denied staff views, save failures and five member/four owner widths. No real patient, subscription, payment or partner request is created. Screenshots and server logs are ignored local verification artifacts.

Commands: `npm test`, `npm run typecheck`, `npm run build`, `CHROMIUM_PATH=<browser> npm run verify:vitalis-pilot`. Run existing Vitalis early-access and revenue browser regressions after source changes. Build and browser dev servers must run sequentially.

Apply only the additive migration and browser-role revokes before release, then verify RLS/no policies/no browser grants. Release via focused PR, successful CI, hosted preview and the established main/Vercel deployment. Verify the exact release SHA and marker `legacy-reserve-vitalis-pilot-20261008`, anonymous private-API denial, sign-in gates and existing routes. Hosted owner/client authenticated acceptance remains required with actual account owners; local synthetic checks cannot prove every external auth setting. Roll back code via the previous production deployment while retaining the additive tables and legitimate records. No production seeded pilot or evidence rows are needed.

## Commercial launch remaining

The digital pilot can be live immediately after safe release. A commercially functioning membership with medical partners still has two major implementation phases plus a founder/partner verification dependency:

1. **Verified offer, billing and care handoff:** obtain the written quote/contract and approved billing structure; validate the pilot’s member value; choose an initial offer; implement approved sandbox subscriptions, authoritative entitlements, durable webhook reconciliation, cancellations/failed payments/refunds, verified-margin retail benefits and minimal separate partner consent/handoff. If the medical partner cannot support the desired structure, launch a transparent nonmedical offer or keep care separately billed.
2. **Controlled paid launch and operating proof:** real hosted account journeys, complete renewal/refund/cancellation/fulfillment and provider handoff acceptance, measured support capacity, explicit final approval to charge/enroll, small paid cohort and cost/churn/margin review before broad promotion.

The phase count is conditional, not a promise that credentials or contracts will be available on a coding schedule. Deeper personalization may need further work if the pilot does not demonstrate enough paid value. Biomarker ingestion, clinical trend dashboards, specialty treatments and premium concierge expansion remain later enhancements, not prerequisites for a narrowly scoped commercial launch.

Founder action: obtain the Connect Scripts program-specific written cost/operating proposal and confirm the approved billing arrangement. Use the quote request; record supporting references in Launch Readiness. No password should be pasted into chat. Partner sandbox and payment credentials belong in secure environment configuration when that phase is authorized.

Verification results: all 132 unit/integration tests passed. Phase 3 browser checks passed at five member widths (320/360/390/884/1440) and four founder widths (320/390/884/1440), with no page exceptions. Both existing Phase 1 early-access and Phase 2 revenue browser regressions passed. Screenshots were visually reviewed. Hosted additive tables were applied with RLS, zero policies and zero PUBLIC/anon/authenticated grants verified. No production journey, evidence, payment or patient fixtures were inserted. Typecheck and the final production build passed. GitHub CI and exact-SHA deployment verification are required before publishing.
