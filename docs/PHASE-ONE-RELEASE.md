# Reserve Phase 1 implementation and release

This branch implements the Eunice operational foundation in the existing app. Public launch and database cutover remain separate release gates. Production data was not accessible during this implementation; no hosted Reserve migration or production booking was performed.

## Implemented

- Company organization, first-class locations, provider-location assignments, optional provider brands, services with approved per-location prices, resources, weekly hours and date exceptions.
- Verified identities resolve explicit owner, location-manager, provider and reception assignments. Customers exist independently from authentication. Staff create guests and book on their behalf. Private, expiring account invitations require a matching verified email and token; email similarity never auto-merges records.
- Atomic global provider occupancy and exclusive resource occupancy protect competing bookings, blocks and reschedules. Revision checks protect stale changes. Visits preserve service/provider/location/price snapshots; changes to the catalog do not rewrite history.
- Arrival, completion, cancellation and no-show states are separate from collections. Cash/external POS receipts have idempotent request keys, immutable amount records and audited reversals. Daily reconciliation is a bridge, not a payment processor, tax engine, refund engine or accounting ledger.
- Mobile operations workspace: location/day context, daily visits, guest booking, working hours/blocks, location configuration, optional brands, resources, staff assignment/revocation, receipt reconciliation and communication recovery. The existing founder Build Room survives under /studio/build-room with owner-only access.
- The Chair retains existing answers, revision and seven-day context expiry. Sharing targets a provider; an appointment relationship is required. Managers, reception and owner financial access do not grant blanket Chair access. Private service notes remain separate from the customer's own profile and from Aethelios. `share_with_katie` remains a legacy storage/API field for compatibility; its recipient is now `provider_id`.
- Transactional outbox records confirmations, changes, cancellations and reminders. Durable claims, leases, bounded retries, stale-message suppression and stable transport idempotency are implemented. Missing email moves to manual recovery; a failed transport remains failed. Resend is an optional configured adapter. No production email delivery was claimed.
- Recovery email/password UI; origin checks, bounded mutation bodies and actor-based mutation throttling. Project URLs and credentials come from each environment. Preview database use fails closed unless explicitly identified as isolated.
- Migration ledger with checksums, transactional DDL and advisory locking. Existing appointment, user and Chair IDs survive backfill. No sample services or synthetic identities are seeded in production.

## Local evidence

Implementation verification: 30 automated tests passed, TypeScript checks passed, production build passed, and desktop/390px mobile browser journeys passed. All data in these checks is synthetic.

Run `npm ci`, `npm test`, `npm run typecheck`, and `npm run build`.

The operations suite configures a second location using domain commands, assigns a shared provider and another provider, creates offerings and a chair, and books without code changes. It covers cross-location visibility, global provider contention, resource contention, appointment snapshots, hours protection, lifecycle permissions, collections, notification retries, Chair privacy, guest claiming, grants and migration replay.

`CHROMIUM_PATH=<installed chromium> VERIFY_ORIGIN=http://127.0.0.1:3013 npm run verify:operations` exercises sign-in, location creation and provider brand configuration through the actual UI, mobile overflow and HTTP access denials. It starts its own isolated local dev server. Artifacts contain synthetic data only.

PGlite evidence does not replace hosted Postgres concurrency, RLS, connection-pool or restore testing. OAuth/provider configuration, password-recovery email, actual sender delivery and mobile home-screen installation require staging evidence.

## Hosted commissioning order

1. Grant access to Reserve's intended project. Do not reuse Gent Ascend/Aethelios credentials or sidestep the observed permission denial. Record deployed source SHA and check existing schema drift against migrations 001–004.
2. Take a verified backup and restore it into an isolated staging project. Count users, appointments, occupancy, Chair profiles/context/notes. Remove synthetic records only when explicitly identified; never delete customers based on guessed names.
3. Use a migration credential to run `npm run db:migrate`. Migrations 005–008 backfill existing records and close Eunice booking by default. Migration 006 derives location hours from existing provider hours, pending approval. A baseline without a ledger replays the original idempotent migrations once; inspect legacy-schema drift before running.
4. Reconcile before/after counts, null customer assignments, visit/offering foreign keys, snapshot completeness and overlapping occupancy. Confirm the former Katie-only Chair notes migrate intact. Check the deployment uses the new migration ledger.
5. Create a dedicated runtime login, applying `scripts/runtime-role.sql` with the migration credential. Give the runtime login only the reserve_runtime group and use its explicit direct/pooler URL. The runtime group bypasses RLS for private server operations but cannot migrate, create roles or read auth.users. All browser Data API access stays denied. Review/revoke any existing anon/authenticated table grants and policies; do not add browser policies to bypass server permissions. Keep migration credentials out of the app runtime.
6. Configure staging `DATABASE_URL`, `RESERVE_DATABASE_ENV=preview`, public Supabase URL/key and exact `APP_ORIGIN`. Preview URLs must use their own stable origin and isolated auth/database. Confirm production cannot accept dev identities or preview cookies. Configure Auth redirect allowlists, verified-email requirement and Google/Apple only when credentials are actually available.
7. Neil signs in using a confirmed account. Bootstrap the first owner using `npm run staff:provision -- <UUID> <email> --confirm-verified-owner` with the migration credential. Katie and other staff sign in, then the owner assigns location/provider scopes in Operations. Never trust user-editable auth metadata for privilege.
8. Configure Eunice: approved business address/contact/policy, Katie Guidry, Fix It Shop brand, approved services/prices/durations/buffers, weekly location and provider hours, exceptions and chairs. Do not publish the illustrative preview menu. Location remains draft/paused until operational acceptance.
9. Configure a verified `RESERVE_EMAIL_FROM`, `RESEND_API_KEY` and strong `RESERVE_CRON_SECRET`. Schedule authenticated POST requests to /api/cron/communications using `Authorization: Bearer <secret>` at a suitable interval. Sender idempotency retention must cover worker retry/lease duration. Prove successful, failed, missing-email and duplicate-delivery paths. No scheduler or sender is assumed to exist.
10. Run staging journeys on desktop and phone: customer booking/account recovery/reschedule/cancel, staff-created guest, Chair share/revoke/expiry, arrivals/completion/no-show, blocking, receipts/reversals, notification recovery, access revocation and cross-location attempts. Test concurrent requests through actual hosted Postgres and the intended pooler, plus application-role browser denial and restore/recovery. Configure a staging location #002 from the UI and complete a visit without modifying application code.
11. Approve the collection workflow, customer policy, menu and operating hours. Run a supervised Eunice pilot. Reconcile external receipts at close; explicitly follow up on manual notifications. Confirm backup retention, monitoring and incident ownership. Only then approve public booking/live status and deploy the approved release to production.

## Restore and rollout

Pause location booking before migration/cutover and stop the worker. Preserve a pre-migration database backup and the preceding app deployment. A failed migration transaction rolls back completely; checksum mismatches stop execution. After successful migration, roll forward corrections through new files; do not edit applied migrations. A schema downgrade is not an app rollback: restoring a backup loses writes since backup, so freeze writes, export/reconcile the delta, restore in isolation first and use a reviewed recovery procedure. Do not deploy the old app against the new schema without compatibility verification.

## Scope boundaries

No memberships, retail inventory/order processing, card capture, POS terminal integration, waitlist, advanced cross-location reporting or Aethelios automation is included in Phase 1. No public Lafayette location or real second provider has been invented. New-location configuration is tested with synthetic staging records. Brand imagery and richer content management can extend location records later; the existing cinematic public pages are preserved.
