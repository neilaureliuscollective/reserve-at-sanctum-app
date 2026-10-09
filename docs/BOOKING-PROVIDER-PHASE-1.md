# Legacy Reserve — operational booking Phase 1

Approved scope: one shared Next.js/Supabase/Postgres engine; Katie Guidry and Fix It Shop are the first operating case. No separate booking database or branded customer PWA is introduced in this release.

## Delivered workflows

- Provider-scoped CRM contacts independent of authentication; searchable client directory, editable contacts, paginated appointment history. Existing account-linked appointment histories are backfilled into CRM without deleting data or auto-linking people by email.
- Staff manual appointments, real server availability, day/week calendars, location/provider filters, pagination, focus refresh, rescheduling, cancellation and completion. Completion does not record a payment.
- All online bookings, manual appointments and staff time blocks share the existing unique 15-minute occupancy ledger and transaction rollback. Service duration plus buffer remains occupied. Revision and idempotency guards remain authoritative.
- Location timezone drives booking windows and displayed appointments. DST closing boundaries use local clock time.
- Authenticated calendar downloads exclude service notes. Provider-specific existing `/book?provider=katie&location=eunice` remains the public entry.
- Owner readiness controls for actual address/booking activation and a confirmed existing account's staff assignment. Privileged roles cannot be replaced through this form. Provider/menu/hours changes retain the existing reviewed Operations workflow and synchronize location assignments.
- Password recovery and password update pages through Supabase Auth; actual email delivery and redirect allowlists require hosted verification.
- Manual confirmation/reminder checklist. Booking changes supersede obsolete pending messages; no email/SMS transport is claimed or silently added.
- Focused provider navigation and existing `/setup?help=1` phone installation instructions. Existing Legacy Reserve manifest identity is preserved. Installation is browser-dependent and private operations require connectivity.

## Production setup — real information required

At `/studio/operations`, the owner creates/approves provider `katie`, name Katie Guidry, actual working days/hours, Eunice assignment, and approved services (description, price in cents, duration and buffer in 15-minute increments). No sample menu or assumed working hours are published.

Katie signs in with her own confirmed account. The owner verifies her exact email and identity, then assigns that account to `katie` using the readiness form. Supabase must allow the canonical `/auth/callback` redirect including the recovery return path. Verify recovery on the actual browser/session, without relying on local preview identities.

The owner enters the actual business address and explicitly opens booking only after the end-to-end checks below. Eunice remains closed until actual configuration is supplied. Do not assign any of the existing unidentified accounts to Katie by guessing.

## Small client migration

Obtain an authorized export from Katie's existing system; no integration or export permission is assumed. Preserve the original securely. Select 3–5 willing pilot clients. CSV headers: `name,email,phone,source_key`; source_key must be a stable original identifier. Import at most 20 rows per reviewed batch with a source-system label.

Preview normalized contacts and possible duplicate email/phone matches. Reuse existing records when appropriate; shared household contact details never imply the same person. Ambiguous batches roll back. Repeating the same source/reference and same details is idempotent; changed source details require review. No automatic account linking occurs. New online sign-ins may intentionally produce a separate verified account-linked CRM record; reconciliation is explicit future work.

For the pilot, reconcile upcoming appointments against the original system, recreate approved appointments manually, and check duration, buffer, timezone and conflicts. Keep the old system as the reference until reconciliation is signed off; turn off overlapping online availability there before opening equivalent slots here. Historical appointment bulk import, bulk account merging, and external sync are not part of this release.

## Katie Pilot Ready acceptance gate

A successful build alone is insufficient. On canonical production, using Katie's confirmed account and a separate consenting client account:

1. Create an online booking; confirm the same appointment and exact local time on both accounts after reload.
2. Create a manual appointment for a contact without a login; confirm history and calendar persist.
3. Reschedule with revision checking; confirm the original client remains attached, the old slot opens, and the new slot closes. Cancel and verify only that reservation's occupancy releases.
4. Block time, confirm it disappears from booking, remove the block and confirm availability returns. Exercise simultaneous same-slot bookings and booking-versus-block writes against hosted Postgres; exactly one must succeed with no partial writes.
5. Verify staff/client/owner boundaries, direct private API denial, wrong-origin mutation rejection, and provider isolation. Verify Chair consent boundaries remain unchanged.
6. Review import duplicates and repeated imports, reconcile 3–5 clients and upcoming appointments, and confirm manual communications responsibility.
7. Install on Katie's physical iPhone/Android using `/setup?help=1`; reopen the icon, sign in, and confirm the daily schedule, time blocks and recovery. No independent Fix It Shop installation identity is promised in Phase 1.

Hosted sign-in, actual staff identity, actual service menu/hours/address, real bookings and physical phone behavior remain acceptance dependencies. Local synthetic tests cannot establish them.

## Verification and release

`npm test`, `npm run typecheck`, `npm run build`, `npm run verify:booking-pilot`, and `npm run verify:pilot` cover core regressions, manual/online history preservation, import rollback/idempotency, occupancy conflicts, permissions, DST, day filtering beyond 100 appointments, mobile layouts and calendar privacy. Browser scripts reject production database/auth environment variables and use synthetic preview records only.

Apply `migrations/20261009014619_booking_provider_pilot.sql` to the intended RAS App Supabase project before publishing code. Revoke browser-role grants on the new CRM/import/message tables; RLS has no browser policies. Server routes enforce role and provider boundaries. Keep preview login disabled in production.

The migration is additive except making appointment client_id nullable for genuine CRM-only bookings; a database check still requires either an account or scoped CRM identity. Preserve existing data and constraints. Retain the prior Vercel deployment and migration evidence. Before any CRM-only live appointments exist, application rollback to the prior deployment is possible while leaving additive tables. After manual appointments exist, do not revert to code that assumes non-null client_id: close booking and roll forward, or deploy a compatible fix. Do not drop CRM data or restore a stale database backup as an application rollback.

## Two phases remain

Phase 2: Fix It Shop branded customer booking entry, profile/theme/icons, rebooking and browser-tested independent manifest identity, sharing this engine. Start with the same-origin provider path; evaluate path-scoped install behavior on real browsers before offering a dedicated installation. Use a subdomain if demonstrated identity/scope behavior requires it; separate-origin auth is explicit, not assumed shared cookies.

Phase 3: reusable provider branding/onboarding, authorization-scoped asset storage, provider settings, multiple locations and optional domains. Add brand/business membership structure when independent businesses require it; never infer tenancy from a URL slug or browser-selected provider. Keep current provider scoping enforced at the server while the initial pilot proves real operating workflows.

## Hosted database evidence

The additive CRM/message migration and browser-role privilege lockdown were applied to RAS App (`wffmdiszikhmkmoiorac`). New tables have RLS enabled and neither anon nor authenticated has SELECT privileges. The advisor's [RLS-without-policy information](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) is intentional for this server-only architecture. Existing Auth has [leaked-password protection disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection); review account security settings as part of hosted onboarding. No authenticated hosted booking or real phone installation is asserted by these database checks.
