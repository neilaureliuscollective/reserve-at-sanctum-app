# Katie owner launch — review and commissioning

This branch starts at main `092425f12f001a211d8ff04609ce61629ccc3900`.
It selectively reconciles booking/recovery/delivery safeguards from PR70
`e334bd9606bd1830ebb9a65f4ac336c95194f261`; all six PR72 image-framing files
remain byte-identical to main. This review branch disables automatic Vercel Git deployments in `vercel.json`
using the documented branch-specific setting. No production write, account grant, email,
credential change, deployment, merge or calendar cutover was performed.

## Implemented scope

`/fix-it-shop/manage` is the business workspace. Fresh verified membership
controls each read and mutation; provider mappings and staff assignments bound
scope. Services/hours use existing immutable configuration proposals and their
revision, affected-visit acknowledgement and snapshot rules. Appointment changes
and time blocks reuse the existing transactions/occupancy ledger. The calendar
shows only the customer's display name and operational appointment fields, not
contact details, Chair content, notes or unrelated business records.

Business membership does not confer platform Founder or Chair access. Any
non-Founder account with a business membership record, including revoked records,
loses the legacy staff/operator authorization path when a session is loaded.
Its own customer appointments remain accessible. Revocation takes effect on the
next request, including an existing browser session. Business access is disabled
unless `RESERVE_BUSINESS_AUTHORITY_ENABLED=true`; disabling it does not restore
legacy authority. `/enter`, installed launch and Studio redirect members into
management. Staff have assigned-provider appointment/block access; managers and
business owners also manage configuration. Business IDs are server-resolved at
the Fix It Shop API and checked against all target objects.

Confirmation resend uses the installed cookie-aware Supabase SSR client,
configured APP_ORIGIN and validated local next paths. It returns a generic
response for absent, confirmed, rate-limited and unconfirmed addresses. Shared
SQL budgets permit one request per normalized address per minute and 30 global
requests/minute; Supabase limits also apply. Budget keys are hashes, retained at
most a day on subsequent requests. Latest confirmation link must be opened in
the requesting browser; missing/expired verifier returns to sign-in with recovery
guidance. No email address grants authority. Signup also consumes the budget.

Management can prepare native settings while GlossGenius remains authoritative.
Production native booking is closed unless explicitly configured `native`.
The workspace does not import external appointments or claim an empty native
calendar means Katie is free on GlossGenius. Supported schedule: integer opening
and closing hours, weekday selection, 15-minute time-away blocks, 5-minute
service/buffer durations, current two-hour customer notice and 45-day horizon.
No new payment or billing engine is introduced.

## Approval package — NOT production ready

1. **Exact code**: approve the final PR head and its current-head CI after review.
   Do not merge/deploy this document's base or the older PR70 tree. Review all
   changes to Auth, domain transactions, membership suppression and notification
   gates. A review preview shares production targets and is not a test sandbox.
2. **Runtime/database mapping**: an authorized operator must record deployment
   ID, environment, git SHA, public APP_ORIGIN/Auth project hostname, database
   hostname/port/database/user identity with passwords omitted, and actual
   serverless target after `lib/db-connection.ts`. That adapter currently rewrites
   one historical project (`wfbiytzlaokchfaxgwtt`) to its transaction pooler. Do not
   assume this is the connected RAS database. Match project/dashboard and database
   `current_database()`, `current_user`, server address/version and migration
   catalog evidence without exporting environment values or decrypting secrets.
3. **Schema**: compare the full checksummed migration manifest against the proven
   target's baseline and take an approved restorable backup. Branch deltas from
   main are `20261012155107_booking_delivery_and_visit_lifecycle.sql`,
   `20261012232737_katie_booking_duration_and_recovery.sql`, and
   `20261015123000_auth_confirmation_throttle.sql`. Business foundations already
   in main are `20261013090000_business_authority_and_support.sql` and
   `20261013091000_business_payment_associations.sql`; the inspected RAS database
   reportedly lacked them. Baseline reconciliation is mandatory; do not blindly
   apply deltas. `npm run db:migrate` on this branch prints the plan unless explicit apply and target host are supplied.
   The operator must independently review the manifest and backup (see script); production execution is not authorized.
   Private tables retain RLS with no browser policies; reviewed application
   role and anon/authenticated grants must be checked. Migration CLI generation
   was blocked by this environment's read-only home; the new additive throttle
   SQL follows repository conventions and is exercised only in local test DBs.
4. **Existing identity**: independently look up `Kajunkate@gmail.com` in the proven
   Auth project and record the existing UUID and confirmation status privately.
   Email is a lookup only. Do not duplicate the account or promote by email.
   Verify Katie's ownership out of band and obtain explicit authority approval.
   Configure the exact HTTPS Site URL and `/auth/callback` allowlist; remove
   historical localhost production redirect. Verify email template redirect use,
   SMTP sender/domain and inbox delivery. Only after approval, Katie requests a
   confirmation link, completes it in the same browser, then signs in. Do not
   manually mark her confirmed as a workaround.
5. **Business provisioning**: approve the existing business ID, provider `katie`,
   approved location IDs and all join mappings. If absent, prepare closed
   provider/business/location records with approved values first. Run the
   reviewed [provisioning template](commissioning/katie-owner-provisioning.sql)
   only after its UUIDs and mapping have been reviewed. It verifies confirmed
   Auth identity and Founder authority, normalizes legacy role to customer,
   inserts a business-owner membership and **rolls back by default**. Replacing
   ROLLBACK with COMMIT is a separately approved live authority change. Do not
   grant global `owner`, staff/katie or private Chair access. Enable business
   authority only on the reviewed runtime after schema/provisioning validation.
6. **Business data**: the six-service menu documented in
   `KATIE-FIRST-BOOKING-COMMISSIONING.md` is prior public evidence for Katie's
   confirmation, not authorization to publish. Katie must approve descriptions,
   prices, exact durations/buffers, weekday hours, location/address/timezone,
   notice/horizon and cancellation/no-show rules. No real values were seeded.
7. **Notifications**: keep email/cron disabled until sender, approved templates,
   recipient policy, webhook signing, scheduler authentication and actual inbox
   delivery/retry tests have been independently approved. Local mocks and queued
   status do not establish delivery. No payment activation is included.
8. **Cutover**: GlossGenius stays current. Approve a cutover window, reconcile
   existing appointments/blocks and final changes, close its new-booking intake,
   verify hosted concurrency/auth/owner access and physical iPhone/Samsung/Fold
   acceptance, then explicitly approve `RESERVE_KATIE_CALENDAR=native`. Avoid two
   calendars accepting the same slot. Rollback after native bookings requires
   appointment reconciliation; simply toggling calendars is unsafe.

## Research

Reviewed installed Next 16.3.8 `cookies`/route-handler guidance and actual installed
Supabase SSR/Auth implementation, plus official [SSR clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client),
[resend](https://supabase.com/docs/reference/javascript/auth-resend), and
[redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls).
The changelog markdown endpoint was blocked by the execution network, not silently
assumed reviewed. Cookie verifier continuity is tested against the installed SDK
with synthetic transport; live hosted confirmation remains a commissioning gate.

## Validation record and PR70 regression

The exact PR70 job logs for run `38374984305`, job `115221979050`, confirm the
failure occurred at the first `Reserve preview visit` wait, before its first
mutation. All eight preceding suites and disposable PostgreSQL passed there.
The workflow ZIP could be retrieved by the connector but its signed download was
blocked in this executor, so the old page/server state is not available locally.
No assertion was removed, skipped or converted to a success on timeout.

The complete 11-suite sequence passes locally on this implementation. The new
harness preserves a page screenshot and visible text on failure, in addition to
server logs. Both booking pages now render dynamically so preview/calendar
selection is evaluated at request time instead of being statically captured by a
production build. This corrects a concrete runtime configuration hazard; the
historical timeout's precise cause is not proven by a later local pass. The
current PR's exact-head full CI must establish the acceptance result, and the
historical result must not be represented as green.

New acceptance includes the real installed Supabase SSR client with mock Auth
transport, durable delivery limits, owner configuration with 25-minute synthetic
services, persisted customer/owner appointment identity, fresh sessions/reloads,
scoped rescheduling and cancellation, revoked-session/legacy denial, and all
existing booking/DST/privacy tests. Local disposable PostgreSQL separately
reproduces the old lock-order deadlock and passes the corrected lock ordering,
request recovery and partial-slot collision checks. Screenshots and the
rollback-by-default migration plan are under `docs/verification/katie-owner`.
