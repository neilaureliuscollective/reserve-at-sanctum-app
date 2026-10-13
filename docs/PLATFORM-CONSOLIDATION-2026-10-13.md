# Aethelios Booking integration and developer review

The founder's October 13 execution directive authorizes verified backward-compatible
application releases. Earlier review-only instructions remain relevant to live
activation, but do not supersede that authorization. No hosted schema, role grant,
customer migration, communication, job, charge or booking activation was performed.

## Verified baseline

Main and production: `e533089b1b283240d46ce4847d631354ded860a9`.
Existing Vercel project: `prj_GKN7RVVFAiQfWdTpHT63e0wNydgn`, team
`team_LJpmefIarra3F19Ad9QpGqMx`. Production deployment:
`dpl_HttBfcdJqM7d6wV7fE18BQ2km5Bv`; `https://www.reserveatsanctum.app`.
Public Fix It Shop booking HTML returned 200 and that deployment ID. This read is
not browser or authenticated acceptance. All inspected PRs remain open drafts.

Connected RAS App `wffmdiszikhmkmoiorac` is ACTIVE_HEALTHY on Postgres 17.11.
It has zero providers, services, appointments and provider-location assignments.
Public Supabase Auth URL matches RAS App. Encrypted runtime DATABASE_URL was not
decrypted, so its project/schema mapping is unproven. Preview shares global
database/Auth variable targets with production; it is not an isolated test database.
Only two older commerce previews have branch-specific overrides. No mutations
or synthetic browser tests may be run against these hosted preview credentials.

## Integration inventory

The comparisons establish the exact merge-base ancestry, not merely PR descriptions:

| PR | Exact head | Integration status |
| --- | --- | --- |
| 65 | `4ca705c3a68ac1ca5e8cfe6bea14741abffdace9` | Notification worker and reviewed migration safeguards integrated |
| 66 | `248c4450b895b7ee773657eb8c3d195566c80baa` | Identity already reconciled in 68; audit and affiliation tests imported with Founder Command wording |
| 67 | `c82ae4682c114e0b8bdf4584078f7e1e1ccf94df` | Delivery receipts, attendance, security dependency patches and isolated verification integrated |
| 68 | `fed033356b87b5213056275a423cee3739cb2667` | Founder Command, shared template previews and platform-owner Chair denial integrated |
| 69 | `5a83d304fec0b6543ef235160719b1a962383778` | Exact duration snapshots, ceiling occupancy, account-bound recovery and single-calendar gate integrated |

The remote review branch retains 69's original ancestry and all binary evidence.
Local patch commits record the import order; their SHAs differ from original PR
heads. New review commits are based on the original 69 head, not a rewritten main.
65, 67 and 68 each have one commit directly above the documented predecessor;
69 has three above 68. None is currently in main or production.

10, 11, 13 and 14 are actual ancestors of main despite remaining open: already
incorporated. 5, 6, 7, 12, 15, 16, 17 and 22 diverge from older main baselines.
Their provider/commerce/organization implementations cannot be blindly merged:
the current shared engine and later Studio work supersede their operating paths;
7 also targets a retired shared Gent identity configuration. 52 requires reviewed
external schedule/publication contracts. 59's independent app edition conflicts
with one canonical booking platform. 60 and 61 are separate Shopify/product
commerce work and are not imported into booking. They remain independently
reviewable. Complete comparison metadata and environment presence, without
values, are recorded in `verification/platform-consolidation-audit.json`.

## New foundation

Founder Command now includes actual executive aggregates and runtime commit/schema
diagnostics. Business management prepares closed drafts with separate professional,
location, verified-owner, subscription and support counts. Support is categorical
technical incident/audit evidence; it cannot retrieve private Chair/customer notes.
Failed or absent sections are unavailable rather than fabricated zero metrics.

Independent business tables preserve existing provider-centric records without
reassigning them. Verified memberships, narrowly scoped staff assignments and
revocation are checked on the server, inside transactions. Composite foreign
keys prevent cross-business provider/location/staff relationships. A global
platform owner has no membership-derived business appointment authority.
`RESERVE_BUSINESS_AUTHORITY_ENABLED=false` by default; existing operations
continue using the current provider authorization path. Public multi-business
launch remains unsupported until all legacy operational entry points adopt the
membership model and hosted isolation acceptance succeeds. Foundation tests
do not establish full application-wide tenancy.

Square association stores observed post-appointment processor state against a
completed internal appointment with verified business/seller/location mapping.
It never creates a payment or changes the scheduler. No HTTP endpoint accepts
unverified payment observations. Stripe business subscription entitlements are a
separate dormant table. No charges, billing credentials, webhook route or live
subscription are added. `RESERVE_PAYMENT_ASSOCIATION_ENABLED=false` by default.
Official Square Node SDK reference was read for Payments GET/LIST; the existing
`lib/square/payments.ts` adapter remains the future read transport. Useful API
contracts: https://developer.squareup.com/reference/square/payments-api/get-payment
and https://developer.squareup.com/docs/payments-api/webhooks. Seller-scoped
credentials, signed webhook reconciliation, refunds and real merchant acceptance
remain external work; no live processor integration is claimed.

## Migration and release position

Hosted ledger contains 18 migrations, through provider branding. Historical local
files have different versions/names for several hosted entries. Matching names
does not prove identical bytes. Receipt/attendance and duration/fence deltas are
absent, as are the new business/support/payment foundation tables. No hosted
migration is applied. Existing appointment integrity is exercised in synthetic
PGlite fixtures; hosted backup/restore and real Postgres acceptance are pending.

The full stack cannot be promoted to production before reviewed deltas/grants,
exact runtime target and restore are established: appointment reads reference
new columns even when new bookings are closed. A developer preview is for
read-only inspection and will honestly expose unavailable schema sections.
Do not merge this whole stack merely because the preview builds.

## Fresh local verification and remaining acceptance

Integrated local test run before the new foundation: 41/44 test files pass;
loading-reliability, restart and Supabase-config fail, the same three failures as
baseline (32/35 files). The executor suppresses child-process output and denies
loopback server startup. No test was deleted, weakened or skipped. Direct focused
Founder Command, Katie launch and affiliation files pass; business isolation,
revocation, support and payment foundation files pass. TypeScript passes.

Local standard build compiles, then fails parsing child TypeScript --showConfig
output. Installed local dependencies remain Next 16.3.5 because the shell proxy
is unreachable; committed lockfile requires patched Next 16.3.8 and Sharp 0.35.5.
Fresh hosted CI/build must use npm ci. Local Founder browser script was attempted
and failed at server startup. No new local browser success is claimed.
Previous PR verification JSON is historical, not fresh verification of this tree.
Hosted CI/deployment results will be appended after inspection.

Fresh hosted verification for `d074b595bc4c44d7cb8c534c10ec13c18129a334`:
GitHub Actions run 38367391149/job 115195686523 passes npm ci, **237 tests,
0 failures**, TypeScript and normal Next 16.3.8 production build. Vercel preview
`dpl_Ads3qzzSdQcKzq2EepsGd6WWYW5h` is READY for that exact SHA at
https://reserve-at-sanctum-bnfehy9ym-stutes-legacy.vercel.app/studio. Non-destructive
Studio sign-in, customer book and health GETs return 200 with that deployment ID;
these are HTTP smoke checks, not authenticated browser acceptance. Preview-only
activation gates are explicitly false and Katie calendar is glossgenius. Exact
branch alias is configured as APP_ORIGIN for subsequent builds. No secret values
were read or printed. An explicit deployment API attempt using target=preview
was rejected; the successful deployment was the verified Git-triggered preview.

The release adds fresh isolated browser/Postgres CI so hosted build success is
not mistaken for booking acceptance. A smaller compatible Founder application
release is prepared separately: it preserves production's scheduling/schema paths
and labels absent receipt/business tables unavailable. It includes no automatic
database migration or new live operations. Its tested SHA/deployment must be
verified independently before production merge/promotion.

The compatible subset shipped through PR 71 to main/production
`2ab51dac9d26afa8e544fafafd816c1ecbcfb763`, deployment
`dpl_Bu5nfQMFufJvTupZmorstrA6rpdd`, https://www.reserveatsanctum.app/studio.
Its tree is identical to tested head `6f1f3da38f3e2129da14e67d7ec4d5fccf176d0c`:
GitHub run 38370490063 passes 191 tests, TypeScript/build and all five isolated
customer/staff/Chair/provider/Founder browsers. The new Founder browser includes
nine axe audits at 320/390/1440px, keyboard creation and reduced-motion capture.
Production Studio/customer pages and health GETs return 200 with the verified
production deployment ID. No authenticated real-owner browser or live booking
acceptance is claimed. No hosted schema/grants or operation gates changed.

Full candidate `0a6f7b1ef1b91432577eebd8916e17270f9b44d1` passes 239 tests,
typecheck/build and disposable PostgreSQL concurrency/recovery. Its browser run
caught stale-day availability links when the day filter changed before the next
response. The new fix hides mismatched day/location/service evidence until the
requested data arrives. A delayed real API transport regression retains the
exact time-prefill assertion. Full final-tree acceptance must run again; the
failed browser run is recorded as failed, not credited as complete.

Katie's remaining commissioning: exact runtime/database/Auth mapping; migration
baseline and tested restore; verified Katie scoped login; approved provider,
location/address, menu/prices/durations/buffers/hours/cancellation rules; hosted
Auth/recovery and concurrent lifecycle; approved sender/test inbox and signed
receipts; separate scheduler acceptance; actual iPhone/Android/Fold checks; one
calendar cutover from GlossGenius. GlossGenius remains authoritative while native
booking is closed. No GlossGenius API integration is claimed.

Communications currently offer shared transactional previews and local rehearsal,
queue/receipt evidence and provider follow-up. Persisted editorial template
management, approved test sending and audited founder resend remain unfinished;
no competing queue or accidental sending was added. Business onboarding/owner
verification and all-route tenancy adoption remain controlled subsequent steps.

Rollback: discard the review deployment/branch with no hosted data rollback.
After a future approved exact-duration launch, repair forward while retaining
ceil occupancy, captured visits, fences and Chair privacy; do not restore old
duration constraints or reopen a competing calendar without reconciliation.
