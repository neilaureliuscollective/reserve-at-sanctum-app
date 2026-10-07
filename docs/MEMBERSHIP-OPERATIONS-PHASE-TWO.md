# Legacy Reserve — Phase Two: membership operations

## Objective and inspected baseline

Turn the Phase One membership presentation into an owner-operated, complimentary pilot: requests, approved plans, grants, effective access, lifecycle and a durable history. Preserve the existing app, auth, provider scheduling, Studio, The Chair, products and location architecture.

Inspection of the dedicated hosted project on October 7 found no memberships, no published plans, and Eunice still in setup with booking disabled. Existing `reserve_membership_plans` and `reserve_memberships` are reused. The legacy Square adapter remains disabled; this phase adds no checkout provider or competing commerce integration.

## Research and decisions

- [Soho House Membership Hub](https://qr.sohohouse.com/en-us/house-notes/issue-006/house-tips/discover-the-new-membership-hub-on-the-soho-house-app) unifies benefits, location discovery, shopping and account context. Legacy Reserve keeps Membership as a focused destination and Home as the next-action surface.
- [Shopify cart architecture](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage) resolves buyer context and pricing through cart/checkout. A displayed plan label is not sufficient to establish a discount. Product prices, service redemption and credits cannot be marked available here.
- [Supabase private API guidance](https://supabase.com/docs/guides/api/securing-your-api) separates table grants from row security. New tables have RLS and no browser policies; authorization remains in verified server routes. Current changelog reviewed; this release does not introduce a new auth adapter.

Inference from the research and code: the next useful step is accountable enrollment and privilege authority before billing. No real paid offer, price or fulfillment policy was approved, so deployment publishes no plans, grants no memberships and makes no charges. Digital/profile/Chair destinations connect existing account functionality; they do not make formerly public features exclusive.

## Delivered experience

Member `/membership`: request access by interest (membership/services/products), view saved request, withdraw, resubmit a withdrawn request, view owner-granted complimentary access and effective dates, distinguish available/planned/inactive/house-unavailable privileges. Published plans appear as complimentary invitations. Unpublished drafts are excluded from the public API. Read failures render unavailable rather than a fabricated empty membership.

Owner `/studio/memberships`: request queue, revision-bound publication of existing draft plans, exact verified member-email grant, plan review, finite date range, optional operating house, explicit complimentary acknowledgment, register, pause/resume/end, recorded activity and bounded pagination. The owner-only Studio navigation entry is hidden from operators and staff; APIs and page enforce owner authority independently. Customer requests grant no access.

New grants capture plan name, purpose, privilege definitions and plan revision in a snapshot. Later editing or unpublishing a plan affects future grants only. Existing descriptor-only memberships remain descriptive; editing a plan does not implicitly activate their benefits. Grant events retain the snapshot, dates and location, including when an ended membership row is reused.

Only recognition, digital access and location access can be configured as available. A privilege action requires effective active membership. House actions also require a captured, enabled house; booking requires `booking_enabled`. Dates are converted from the selected house timezone (Central for digital access), including daylight saving. These rules do not establish credit balances, paid entitlement or physical check-in authority.

## Data and concurrency

`20261007183346_membership_operations.sql` adds revisions to existing plans/memberships, grant attribution, access basis and plan snapshot. It adds private `reserve_membership_requests` (one account-owned row per member) and `reserve_membership_events` (application append-only event history).

Owner mutations and reads require the verified `owner` role, irrespective of client-supplied IDs or staff capability overrides. All mutations use configured-origin checks, bounded streamed JSON, strict input schemas, parameterized SQL and transactions. Requests are deduplicated and updates compare revisions. New grants lock the member user before plan/membership records; simultaneous different-plan grants cannot create multiple current memberships. Pause/resume/end share that user lock order. Effective selection prioritizes current access over expired rows.

Events and member response records contain no private Chair notes, life context, merchant credentials, payment payloads or medical information. Access, request state and audit are committed together. There is no email, SMS or outreach executor.

## Release sequence and rollback

1. Confirm existing production commit and dedicated project `wffmdiszikhmkmoiorac`.
2. Run tests, TypeScript, production build and isolated browser journeys.
3. Apply the single additive migration before application release. Revoke `anon` and `authenticated` table privileges on the two new tables in the hosted release transaction; the existing migration runner also applies server-only Reserve lockdown. Verify columns, RLS and browser grants with SQL.
4. Publish a branch/PR, verify the Vercel preview, merge the reviewed exact head, then verify production commit, release header, public membership and unauthorized owner APIs.
5. Roll back application to Phase One if necessary; retain additive tables/columns. Do not delete live requests or grant history to roll back UI. Do not seed hosted records or enable houses, plans, merchant credentials or booking.

## Verification and definition of done

- 89 domain/regression tests: member ownership, owner-only authority including attempted staff capability elevation, duplicate requests, withdrawal and revision checks, unsupported privilege publication, verified-account grants, disabled houses, concurrent grants, snapshot stability, effective dates, lifecycle audit and current-vs-expired selection. Existing scheduling/collision/Chair/Studio tests remain included.
- TypeScript and production build.
- `CHROMIUM_PATH=<browser> node scripts/verify-membership-operations.mjs`: synthetic local request → withdraw → resubmit → owner publication → complimentary grant → member privilege → pause/resume/end. Checks other-account isolation, role/origin failures, stale revisions, no browser errors and 320/390/884/1440 widths. The reset helper refuses hosted credentials and touches only local synthetic membership state.
- `CHROMIUM_PATH=<browser> node scripts/verify-member-foundation.mjs`: original member/booking/preparation/cancellation and staff-routing regression journey.
- Live verification is read-only/unauthorized-request verification; no synthetic hosted identities or complimentary grants are created during release. Actual owner actions require the founder's verified account.

Done means the entire complimentary pilot works through the application, errors stay visible, current members retain their granted terms, and production has no automatically published offer or active membership. Recurring billing, paid entitlement synchronization, member product pricing/checkout, credit/service redemption, partner access, concierge and community remain subsequent phases.

### Hosted verification

The additive migration was applied to the dedicated production database. Post-migration SQL confirmed RLS enabled, zero browser/PUBLIC grants on new tables, zero automatically created requests/events/memberships, no published plans and Eunice still setup/disabled. Both isolated browser journeys passed, including existing booking/preparation/cancellation. Supabase advisor reported no errors: the [no-policy informational notice](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) is intentional for server-only tables; the pre-existing [leaked-password-protection warning](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) remains outside this membership release. No auth settings were changed.
