# Legacy Reserve Vitalis — Phase 1

Founder approved execution on October 8, 2026. Built against main `203a88fb81db9f5b8216e2fc09024c8992b9f80e`, preserving the membership, Personal Reserve, commerce readiness and Studio recovery releases.

## Member experience

`/vitalis` is a public, responsive introduction to Advanced Health Intelligence & Longevity. Existing accounts can join free early access, choose optional broad service interests and a state/territory, separately opt into launch email, update preferences and withdraw. No symptoms, medical history, laboratory results, treatment eligibility, clinical enrollment or payments are collected. The four primary app destinations remain unchanged; Vitalis is discoverable through the account menu, Home, Pathways and factual concierge navigation. Performance remains differentiated.

The existing authentication, server Postgres adapter, design tokens, typography and application shell are reused. Public introductory content can render when registration cannot refresh. The private registration API fails closed. Existing collection products and checkout adapters are unchanged.

## Founder workspace

`/studio/vitalis` and `/api/studio/vitalis` require the existing owner role. The workspace provides active demand, email permission counts, voluntary category/state demand, weekly joins, a paginated roster, internal partner drafts, release controls and manual retention cleanup. Verified partner status records internal review only: every partner remains unpublished and no referral/API is activated. HTTPS destinations are validated, and exact-destination review is explicit.

Visibility controls replace the introduction with a preparation message; they do not remove existing navigation links. Registration can be paused independently. Withdrawal and removal of existing email permission remain available while paused.

Review retention monthly using **Clean expired early-access records**. It removes registrations without an update for 12 months and old permission evidence for inactive registrations. The member notice describes this manual process accurately. There is no scheduled job or new paid vendor. There are no automated outreach sends or exports.

## Data and security

`20261008120000_vitalis_foundation.sql` adds six isolated tables: settings, interests, consent events, unpublished partners, per-account rate admission and daily aggregate counters. One interest record per existing account; account deletion cascades member-linked records. Atomic account locking handles concurrent first joins; revision checks protect edits. Duplicate joins cannot restore email permission. Withdrawal clears interests, region and outreach. Consent evidence records separate collection/email purposes and the notice version.

RLS is enabled without browser policies. PUBLIC, anon and authenticated must have no grants; only the existing server connection accesses these tables. The standard repository migrator performs role lockdown; hosted release applies equivalent explicit revokes. Private responses are no-store. Mutation origin checks, bounded JSON, strict schemas, role authorization and separate mutation/event quotas apply. Vitalis preferences are not sent to Aethelios, clinical providers, commerce providers or advertising services.

Daily event counters contain no identities or preferences. View/start counters are approximate account-only activity; completed joins and withdrawals are recorded transactionally. They measure demand, not willingness to pay or clinical outcomes.

## Release and rollback

Apply the additive migration and verify RLS and browser grants before merging through the existing main/Vercel deployment process. No environment configuration or payment activation is needed. Verify the deployment SHA, release marker, public Vitalis content, signed-out interest snapshot, and anonymous Studio denial. Authenticated journeys are exercised using isolated local synthetic accounts; no synthetic production users or registrations are created.

To pause, use owner release controls. To roll back code, redeploy the previous production release and retain the additive tables and legitimate registrations; do not drop member data. Clinical partnerships, referral compensation, clinical data flow and jurisdiction/privacy review remain later-phase gates.

## Verification

Run `npm test`, `npm run typecheck`, `npm run build`, and `CHROMIUM_PATH=<browser> npm run verify:vitalis`. The browser check uses local development fixtures only and refuses hosted database variables. It covers five viewport widths, guest/client/second-client/staff/owner isolation, consent changes, duplicates, pause, withdrawal, rejoin, unpublished partner editing, release flags and unavailable registration. Existing domain tests cover booking, membership, commerce, concierge and Studio boundaries.
