# Aethelios Booking production readiness — October 12, 2026

This is the PR #65 baseline inventory. The [next pilot-operations increment](AETHELIOS-BOOKING-PILOT-OPERATIONS.md) completes attendance/receipt code and records newer hosted evidence; its commissioning gates supersede the missing-code items below. Neither increment constitutes production acceptance. Fix It Shop
is Katie Guidry’s independent business; Aethelios Booking is its operating
technology from Aethelios Technologies. GlossGenius remains the operational fallback.
No public activation, hosted data writes, real communications, customer migration,
production deployment, payment change or privileged account provisioning was done.

## Actual baseline and branch reconciliation

GitHub main and the clean local checkout both resolved to
`e533089b1b283240d46ce4847d631354ded860a9`. PR #62’s Fix It Shop transformation
is already merged as `86d5d9d`; Katie’s founder experience and approved portrait
are newer main commits and are preserved. The stale local origin/main reference
was not used as the base. GitHub connector reads verified current main because
shell git/gh networking is restricted in this executor.

Active PRs #59 (independent edition), #52 (public connections), #22 (Command),
#12 (older operating foundation), #6 and #5 reported conflicts with main in the
current inspection. Do not import their older implementations or bulk merge
branches. #60 and #61 are separate commerce drafts that currently report clean
mergeability; their scope is outside this booking increment. Older stacked
presentation/commerce branches remain unmerged. No conflict resolution was
needed for this review branch, which begins at current main. Recheck the base
and mergeability before merge because GitHub state can change.

| Area | Current evidence | Launch implication |
| --- | --- | --- |
| Customer service/time selection, sign-in routes, account history, rebooking | Existing code and local synthetic domain tests | Hosted session and complete browser acceptance still required |
| Booking integrity | Transactions, unique provider/15-minute occupancy, captured price/duration/buffer, request idempotency and revision checks; local competing-request tests | Verify separate concurrent hosted connections; PGlite serializes transactions |
| Cancel/reschedule | Ownership, provider scope, revision and occupancy rollback tests | Real Auth and calendar integration acceptance pending |
| Katie’s Studio | Scoped provider day, openings, service/time/client details, blocks, manual bookings, client history and operation proposals | Verified Katie identity and actual approved configuration unknown |
| Auth/privacy | Server-verified Supabase identity, database-assigned roles, origin checks, RLS/browser grant lockdown, Chair sharing/revocation/retention tests | Hosted grants, real role assignment, recovery, refresh and unauthorized-access checks pending |
| Database | Hosted pg pool and Vercel lifecycle integration; 18 existing SQL migration files | Runtime connection, hosted migration baseline and restore are unverified this session |
| Actual business configuration | Preview-only illustrative catalog; closed production defaults; existing approved-configuration APIs | Katie must approve real menu, price, duration, buffers, address, hours and policies |
| Notifications before this change | Transactional manual confirmation/reminder queue | No existing verified automated delivery |
| Completion | Existing authorized completion action, revision and audit | Verify practical daily staff flow |
| Arrival/no-show | No explicit durable arrival or no-show lifecycle found in current main | Missing launch-critical staff controls; follow-up build required |
| Mobile/accessibility | Existing approved assets, responsive flows and prior documented audits | Current rendered/physical-device and assistive-technology acceptance remains open |

Environment readiness reported no configured runtime credentials or outbound
identity. No live database, Katie account, menu, hosted Auth session, inbox delivery
or production availability is claimed verified by this work. A previous PR’s
hosted results are historical evidence, not proof for this exact commit.

## Completed in this increment

- Added Resend transport to the existing booking message queue. No second queue,
  service or app. Appointment/message creation stays in its original transaction;
  a separate authenticated worker reads committed records only.
- Provider and manual handling use the same message state. Claims commit before
  sending, preserve the first-attempt timestamp across crashes, and recover
  ambiguous provider/DB outcomes with the same Resend idempotency key.
- Appointment-first locking matches mutation lock order. Current revision/status
  is checked under lock before sending, so cancelled/rescheduled/completed visits
  cannot send an outdated queued update. Old elapsed messages are suppressed.
- At most three attempts, a five-second provider timeout and a 23-hour retry
  ceiling preserve Resend’s 24-hour idempotency window. Five messages per request
  bounds processing. Unresolved addresses/delivery attempts return to manual
  contact; automatic retry does not continue indefinitely.
- Email stays disabled by default, and there is no installed scheduler. An explicit
  UTC activation cutoff prevents accidentally emailing a historical backlog.
  Messages before that cutoff remain manual. No reminder is queued when the
  appointment is within 24 hours, avoiding an immediate second confirmation.
- Email contains service, professional, local-zone time, captured price/duration,
  address and the authenticated appointment page. No notes, Chair answers, contact
  lists, bearer cancellation tokens or private customer context are included.
- Studio can refresh client updates, see pending email follow-up, confirm manual
  contact and use the appointment’s location timezone. Recording manual contact
  stops that message’s retries. Provider scope remains enforced.
- `npm run db:migrate` now prints a versioned SHA-256 manifest and contacts no
  database by default. Explicit execution uses a separate admin direct/session
  connection, exact reviewed target host, migration advisory lock, one transaction
  and browser grant lockdown. A failed batch rolls back prior schema changes.
  Existing migration bytes, tables and business records were not renamed.

`sent` is the existing queue state for **provider acceptance**, not inbox delivery.
It does not prove a delivered email. The provider ID is currently validated but
not persisted. Signed delivery/bounce receipt ingestion, a persisted provider
reference, supportable delivery history and scheduler provisioning remain missing
before automated notifications can pass full production acceptance. Never call
these notifications operational merely because the transport test passes.

## Local verification and limits

Nine new delivery tests and three migration tests pass using PGlite and a mock
transport. They exercise concurrency/duplicate keys, provider failures, manual
fallback, supersession, elapsed reminders, authorization/disabled configuration,
missing contacts, activation cutoff, timezone/private-data exclusion, failure
following provider acceptance, migration rollback and account preservation.
No test sends an email. Existing booking and pilot tests pass, including occupancy,
request idempotency, authorization, rollback and daylight-saving closing hours.

The broader initial run used one Node process per test file with
`--experimental-test-isolation=none` because this executor loses subprocess stdout
in the default runner. It passed 34/37 files and 185/190 assertions; five failures
were in existing loading-reliability (socket EPERM), restart (missing subprocess
output), and Supabase-config (missing subprocess JSON) tests. A final additional
activation-cutoff test passed separately. These failed checks are unresolved
verification, not silently waived or counted as passes. Run normal `npm test`
in CI/a normal isolated environment before merge.

TypeScript passes. Standard `next build` compiled then failed parsing TypeScript
subprocess showConfig output. The documented Next 16.3.5
`experimental.useTypeScriptCli=false` fallback completed type checking and the
production build; the temporary config was restored. Browser booking verification
was attempted with installed Chromium but the dev-server process exited before
startup. Local TCP listen is denied (EPERM), so no new browser or physical-device
acceptance is claimed. Re-run the browser suites and narrow-layout/WCAG checks on
an isolated hosted preview or unrestricted local executor.

## Required pilot acceptance — keep a signed evidence record

Use an isolated hosted staging database/Auth project and approved staff/test
accounts. Record exact commit, environment/project, tester, device/browser, time,
result and redacted evidence for every row. Do not use real clients for testing.
Real communications and production data changes require separate founder approval.

| Scenario | Required verification / pass condition |
| --- | --- |
| Database commissioning | Confirm intended project, region and least-privilege runtime role. Reconcile each existing migration with hosted schema/history, including legacy records. Restore a backup into isolation and prove records survive. Review private grants and Supabase advisors. Run reviewed migration plan against staging before approval. |
| Katie identity | Confirm UUID plus confirmed email, initial app sign-in, Katie provider assignment and operator capability. Use verified-account provisioning with an admin connection; do not elevate her to platform owner. Deny unassigned staff, customer and forged metadata access. |
| Business setup | Approve service names, cents prices, durations and buffers on supported 15-minute occupancy units; real address/timezone, location/provider assignments, weekly availability, blocks, lead time (currently two hours), 45-day horizon and cancellation/reschedule policy. No invented prices. |
| New customer | Sign up, confirm email, sign in, select real approved service/time, submit once and receive one confirmed ID. Compare customer history, staff day, occupancy and captured price. |
| Returning customer | Reopen existing session/PWA, book again and rebook from history without losing prior appointments. Test sign-out, expiry, recovery and refresh; safe return links must survive. |
| Simultaneous claims | Use two independent hosted sessions/connections for the same slot; exactly one wins, the loser refreshes availability. Retry the winner’s request key: same ID and one event. Test buffer and block overlap. |
| Reschedule/cancel | Account owner and scoped Katie can change expected revision; other customers/providers cannot. A failed move preserves original occupancy. Cancel releases it, history/calendar agree, and old queued updates cannot send. Test stale revisions and repeated requests. |
| Notifications | Founder-approved sender/domain, secure Resend key, 32+ character CRON_SECRET, exact HTTPS APP_ORIGIN and UTC activation cutoff. Approved test inbox only. Verify acceptance AND real inbox arrival/bounce status, timeout/429/5xx and DB-failure retries, manual fallback and no duplicates. Implement authenticated delivery receipts and durable provider reference before signing this off. |
| Scheduling | Commission an approved authenticated POST scheduler for `/api/internal/booking-messages`; Vercel native cron uses GET, so the current POST endpoint is not wired to native cron. Choose and test scheduler integration before enabling. Monitor backlog, failed messages and provider alerts. |
| Reminders | Book >24h ahead; verify timezone-correct reminder, no immediate reminder for short-lead bookings, changed/cancelled/completed and elapsed visits suppressed. Verify scheduler interruption/recovery and retry-window exhaustion. |
| Daily Studio | Katie can see today’s clients/services/start times/openings, block time, make allowed changes, complete visits and recognize pending contact. Implement/test durable arrival/no-show controls and their authorization/audit before acceptance. |
| Timezone/DST | America/Chicago spring-forward and fall-back, UTC conversion, local closing time, blocks and email/calendar display. Local tests do not prove actual phone/calendar import behavior. |
| Mobile/accessibility | iPhone Safari/PWA, Android Chrome/PWA and narrow/Fold cover layout; 320px, 390px, landscape, keyboard, 200% text, focus, contrast, reduced motion and screen reader. Complete customer and staff journeys on physical devices. |
| Privacy | Other customer IDs/history/calendar endpoints, forged role metadata, cross-origin writes and direct browser table access denied. Confirm Chair sharing, revocation and seven-day expiry with no email leakage. |
| Failure/recovery | Offline/dropped request, unavailable DB/API, uncertain committed response, session expiry, retry and refreshed calendar. Never silently retry a possibly committed booking under a new request key. Restore and exercise fallback without duplicate calendars. |

Configuration values go directly into the intended environment’s secret store;
never paste keys/passwords into chat, a PR, logs or screenshots. Resend sender/domain
verification and delivery results are unknown. Supabase authentication mail and
booking transactional mail are separate configurations.

## Migration execution after explicit founder approval only

Review `npm run db:migrate` output and hosted baseline first. Configure
`RESERVE_MIGRATION_DATABASE_URL` securely with the admin direct/session connection.
The runtime `DATABASE_URL` is not used by this script and must stay least-privilege.
After verified restore/staging rehearsal and founder approval:

```sh
npm run db:migrate -- --apply-reviewed-migrations --target-host=<reviewed-hostname>
```

This preserves the historical repository runner’s SQL format. It does not invent
hosted migration-history entries or claim to replace Supabase history reconciliation.
All historical migration files are replayed together: do not apply to an unknown
hosted baseline. The checksum manifest is a review record, not proof of remote
schema equivalence. New SQL migrations should be created with the Supabase CLI
and tested against the approved baseline. No new SQL migration was needed here.

Rollback this application increment by reverting its commit while keeping the
original production schema. Disable worker scheduling/email first; retain queued
and accepted message rows to avoid replay. Failed-provider/ambiguous outcomes need
manual review before resending; accepted mail cannot be recalled. Do not replay
manually handled rows or reset attempts to bypass duplicate protection.

## Launch decision and next phase

**Not ready for real customer bookings or a controlled live pilot yet.** Ready for
review and isolated staging acceptance once access/business inputs are supplied.
Highest-value next phase: hosted commissioning and completion of notification
receipts/scheduler plus durable arrival/no-show controls, then one full Katie/customer
acceptance rehearsal on phones. Keep GlossGenius available with a written single
calendar-of-record rule until founder acceptance. Do not activate both systems
for the same availability without a reviewed conflict-management process.

Payment/POS replacement, AI receptionist, multi-business SaaS billing, advanced
marketing, unrelated brand migration and additional dashboards remain deferrable.
Current research: Supabase’s database-connection documentation (direct/session for
migrations, transaction pooling for serverless), installed Next route-handler and
TypeScript CLI guides, and Vercel deployment/CI skill. No production promotion,
remote schema or credentials were changed as part of researching these practices.
