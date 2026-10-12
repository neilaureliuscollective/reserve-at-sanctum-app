# Booking pilot operations — October 12, 2026

This increment stacks on PR #65. It completes the remaining notification and
attendance code in the existing Fix It Shop / Aethelios Booking application.
It does not activate public booking, apply a hosted migration, grant Katie a role,
contact real customers, migrate client records or deploy production.

## What changed

- Resend acceptance now persists a provider reference, acceptance time and first
  recipient address. Signed delivery receipts use Standard Webhooks v1 HMAC-SHA256,
  exact request bytes, constant-time comparison and a five-minute delivery-timestamp
  tolerance. Both Resend `svix-*` and standard `webhook-*` headers are supported.
- Receipt IDs deduplicate retries. Minimal receipt metadata survives events arriving
  before acceptance commits and reconciles in a subsequent worker pass. Out-of-order
  accepted/delayed events cannot hide delivery, bounce or complaint evidence. No
  recipient lists, message bodies, private notes, opens/clicks or bounce descriptions
  are stored in receipts. Receipt processing never requeues accepted mail.
- Katie can review provider-reported delivery and unresolved email in the existing
  client updates panel, then acknowledge manual contact. A later changed failure
  reopens attention. Bounce/complaint/suppression holds subsequent mail to that
  address for manual contact. Automatic Fix It Shop delivery is limited to Katie;
  other professionals' messages remain manual. Guest confirmations explain staff
  contact rather than promise access to an account they do not own.
- The existing worker now supports authenticated Vercel GET cron calls with a
  separate disabled-by-default gate. Sending remains disabled by default. A reviewed
  five-minute schedule is prepared in `docs/config/booking-cron.vercel.json`, outside
  live Vercel configuration; no scheduler was installed or activated.
- Studio and its calendar support explicit arrival, undo arrival, no-show and undo
  no-show. Every action checks professional scope, permission and expected revision,
  commits an audit event, and preserves captured price/duration/buffer/occupancy.
  Arrival requires the appointment's local day and a time before its scheduled end.
  No-show requires the scheduled end to have passed and no recorded arrival.
  Completion is still an explicit authorized staff action. No fees are charged.
- Attendance is never inferred from the clock. Studio's former “in the chair” clock
  label now distinguishes “scheduled now” from an actual recorded arrival. Reminders
  are suppressed for arrivals and terminal appointments. Pending confirmations keep
  their applicability across attendance-only revisions. Rescheduling clears arrival.
  No-show calendar exports use CANCELLED status while account history retains the
  explicit no-show label. Corrections retain the prior audit evidence.
- Staff/customer mutation requests have bounded timeouts and refresh after an
  uncertain result instead of repeating a write. Studio retains its day during a
  normal refresh. Existing identity, assets, client notes and provider scope remain.
- Added a read-only, project-checked commissioning command. It reports prerequisite
  schema, configured offerings, staff assignment, RLS and occupancy protection;
  it explicitly does not assert live acceptance.
- Patched Next to 16.3.8, Sharp to 0.35.5 and the transitive source-map-js dependency
  to 1.2.2 with a committed lockfile. The prior audit identified published Next,
  image-library and source-map vulnerabilities; the reviewed patched lockfile audits
  with zero known vulnerabilities. No broad forced dependency upgrade was used.
- Browser verification reads Next's local development env files before its safety
  check, so a hidden hosted connection cannot bypass the synthetic-only guard.
  Child servers force email/cron off. Preview reset clears child notification rows
  before appointments, is transactional, and requires explicit synthetic mode.
  Diagnostic screenshot failure no longer hides the original test exception.

## Migration and release order

`migrations/20261012155107_booking_delivery_and_visit_lifecycle.sql` was generated
with `supabase migration new` (CLI 2.81.3) in an isolated Vercel Sandbox and then
completed/versioned in the repository. Existing migrations are unchanged. It adds
attendance fields, a no-show status constraint, delivery fields, private receipt
metadata and queue/reference/suppression indexes. RLS is enabled without browser
policies; private server authorization remains authoritative.

Before deploying this code: founder approves the exact migration and intended
staging target, backup/restore and baseline reconciliation. Apply the additive SQL
in staging, verify server-role grants and revoke browser grants on the new receipt
table, then verify the exact application commit. Do not replay an unknown hosted
baseline or use the runtime credential as migration authority. Existing approved
`db:migrate` plan/application safeguards remain in place. The new code depends on
these additive columns; a build alone does not commission the database.

An application rollback must use a version that understands no-show records, or
close booking and reconcile those records explicitly before restoring older code.
Do not drop the new status/columns while data exists. Stop scheduling/sending first;
preserve accepted IDs, attempts, recipient snapshots and receipts to prevent replay.
Email accepted by a provider cannot be recalled. No-show undo does not resurrect
superseded notifications, and the occupied schedule remains unchanged.

## Current hosted evidence — read only

The connected “Serve At Sanctum” account exposes `RAS App`, reference
`wffmdiszikhmkmoiorac`, ACTIVE_HEALTHY, Postgres 17.11.0.002 in us-west-2.
Table inspection found the existing booking foundation with RLS enabled, **zero
providers, services, appointments, and provider-location assignments**. Metadata
queries confirm the new attendance/delivery columns are not applied. A grants query
on users, appointments, clients and messages returned no anon/authenticated/PUBLIC
browser grants. No customer rows or authentication secrets were retrieved.

This proves the connected project's metadata is reachable; it does not prove
Vercel's runtime connection targets it, Katie's verified identity, working Auth
cookies, real concurrency or a functioning inbox. The managed execution environment
still reports no ready runtime credentials/outbound identity. No hosted data changed.

Supabase's security advisor reports the intentional private-table RLS/no-policy
pattern as informational and **leaked-password protection disabled** as a warning.
Review/configure that Auth control before pilot acceptance, subject to the project's
plan and founder's configuration approval. See [password protection guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
and [RLS/no-policy explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

## Verification

Use only an isolated clone with synthetic data and no hosted credentials:

```sh
npm ci
npm test
npm run typecheck
npm run build
npm run verify:booking-operations
RESERVE_VERIFY_VIEWPORT_CAPTURE=true CHROMIUM_PATH=<installed-chromium> npm run verify:fix-it-booking
RESERVE_VERIFY_VIEWPORT_CAPTURE=true CHROMIUM_PATH=<installed-chromium> npm run verify:booking-pilot
```

The operations browser test can run WCAG A/AA checks with `AXE_CORE_PATH` pointing
at an installed axe-core bundle. The audit used axe-core 4.10.3 as an isolated
verification tool, not a new application dependency. Bounded viewport captures
preserve all behavioral assertions and avoid unnecessary full-page capture pressure.
Use adequate memory for Next plus Chromium/PGlite; initial 4 GB runs experienced
capture timeouts/connection resets. A fresh 8 GB isolated sandbox is used for final
acceptance checks. Physical phones and real Supabase sessions are separate gates.

Final verification passed: **206/206 tests**, TypeScript, the normal production build, all three browser suites, and four WCAG A/AA audits with zero violations. The patched dependency audit reports zero known vulnerabilities. Results are recorded in `docs/verification/booking-pilot-operations.json`.
Delivery/provider responses, receipt events, accounts and clients are synthetic.
The new attendance UI mutation test uses mocked responses; separate domain tests
prove persistence/authorization and the existing customer/staff browser suites
exercise real local synthetic booking and rescheduling. No real email was sent.

For approved read-only hosted commissioning, configure the intended runtime
connection securely and run:

```sh
npm run verify:booking-readiness -- --expected-project-ref=<reviewed-reference>
```

Do not paste keys/passwords into chat, PRs, logs or evidence. The command does not
verify a real account's confirmed email; use the existing verified-account
provisioning process with a separate approved admin connection.

## Founder/Katie commissioning checklist

1. Confirm the intended Vercel/Supabase target, least-privilege runtime connection,
   backup restore, baseline, additive migration and grants. Verify two independent
   hosted clients competing for one buffered slot and retrying the same request.
2. Supply Katie's verified email/UUID; approve operator/provider assignment, actual
   service names, prices, durations/buffers, location/address, weekly hours and
   cancellation/reschedule/lead-time policy. Do not make Katie platform owner.
3. Configure approved Resend sender/domain, API key, signing secret, exact HTTPS
   origin, CRON_SECRET and activation cutoff in the intended secret store. Verify
   acceptance, signed delivered/bounced events, retry/DB-failure behavior and real
   approved test-inbox receipt. Keep public booking and sending closed meanwhile.
4. Review the five-minute cron template and hosting plan: frequent cron requires a
   suitable paid Vercel plan; Hobby's daily schedule is insufficient for timely
   confirmations/reminders. Merge the reviewed schedule into live configuration only
   with launch approval, and enable both email and cron gates only after acceptance.
   Test duplicates, overlapping invocations, backlog recovery and provider outages.
5. Verify actual OAuth/email recovery/session refresh, unauthorized access, Chair
   privacy/revocation and retention, local/DST calendar/email display, and staff
   attendance/corrections. Configure leaked-password protection as appropriate.
6. Katie completes one customer/staff rehearsal on iPhone and Android (including
   installed reopening), narrow layouts, keyboard/screen reader and 200% text.
   Record exact commit, tester/device, results and redacted evidence. Founder signs
   acceptance before real bookings or communications. Keep GlossGenius available
   with an explicit single calendar-of-record rule throughout the cutover.

The next highest-value work is commissioning and acceptance with real approved
business configuration and an isolated hosted test environment. Payment/POS
replacement, AI phone answering, multi-business billing and marketing remain outside
this launch phase.

## Research used

- [Vercel cron security and delivery behavior](https://vercel.com/docs/cron-jobs/manage-cron-jobs)
  and [schedule/plan limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).
- [Resend's current verification adapter](https://github.com/resend/resend-node/blob/main/src/webhooks/webhooks.ts)
  and [email event schema](https://github.com/resend/resend-node/blob/main/src/webhooks/interfaces/webhook-event.interface.ts).
- [Standard Webhooks specification](https://github.com/standard-webhooks/standard-webhooks/blob/main/spec/standard-webhooks.md)
  and official JS implementation/tests; signature interoperability has an independent
  static Python-computed fixture in the test suite. Node's native crypto implements
  this limited v1 protocol without adding an SDK dependency.
- Supabase migration/RLS and Postgres indexing/locking guidance; Vercel Functions,
  Sandbox, deployment and React review guidance; installed Next route-handler and
  TypeScript documentation. Supabase advisor checks were read-only on the current
  connected project, not a claim of post-migration hosted verification.
