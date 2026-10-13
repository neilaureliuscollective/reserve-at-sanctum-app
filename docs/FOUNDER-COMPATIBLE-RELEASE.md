# Founder Command compatible application release

This release is based on production/main e533089. It selectively ships the Founder
surface and platform-owner Chair privacy correction from the reviewed booking stack,
plus executive aggregates, diagnostics and prepared business/support/payment
foundations. The existing booking engine, appointment reads and writes, history,
customer routes and database/Auth configuration retain the production baseline.

No receipt/attendance/duration/recovery changes from 65/67/69 are included in
application booking paths. The full integrated candidate is PR 70; it requires
reviewed hosted deltas before promotion. All SQL files added here are unexecuted
foundation files. Hosted runtime uses its existing database adapter and never
automatically executes migrations. Business management/support sections render
unavailable and draft creation stays disabled when those tables are absent.

Founder directory/approvals are independent of communication receipt failures.
Missing receipt columns are explicitly unavailable. No fabricated business or
revenue metrics are shown; historical organizations are not independent businesses.
Platform administrator role no longer grants Chair data/private-note access.
Katie's existing provider consent, history and operating permissions are preserved.

Pure delivery configuration is shared with the full candidate; no worker, new
queue, webhook, send action or scheduler is introduced in this release. Square
association and independent business access are disabled by default and have no
live payment/access-grant HTTP endpoints. No schema, role, account, service, price,
hours, email, charge or external calendar is activated. RAS App has one confirmed
platform owner and zero confirmed Katie operator accounts; existing owner sign-in
can inspect the dashboard without any new grant.

Target: existing reserve-at-sanctum-app Vercel project, prj_GKN7RVVFAiQfWdTpHT63e0wNydgn.
The patch includes reviewed security versions Next 16.3.8 and Sharp 0.35.5 with
the existing lockfile. Local shell networking/subprocess restrictions remain:
TypeScript passes; legacy socket/child-process test failures and normal build
showConfig failure are recorded. Fresh hosted CI must pass tests, typecheck,
build and isolated Founder/customer/staff/Chair/provider browsers before merge.
Synthetic tests must never use hosted preview credentials, which share database
and Auth targets with production. Rollback is an application revert; no hosted
data or schema rollback is necessary. Foundation authority remains incomplete
at the application-wide level and no additional business launch is supported.
