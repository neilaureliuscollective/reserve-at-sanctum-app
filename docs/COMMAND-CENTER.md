# Reserve Command

Reserve Command is the private operator layer for Neil and Katie. It keeps the
customer-facing Reserve separate from the working side of the business while
reusing the same authenticated Next.js application and server-only Postgres
boundary.

## What it adds

- Phone-first business pulse: confirmed visits today, the next seven days, next
  visit, open build items and items waiting for review.
- Fast operator links into the live Reserve, booking, schedule blocking and The
  Chair.
- Shared Build Room for ideas, feedback, decisions and tasks across The Reserve,
  Fix It Shop and GENT Ascend.
- Lightweight workflow: Captured -> Building -> Needs review -> Approved.
- Neil / Katie / Both assignment without exposing private customer data.
- A 45-second refresh keeps the two operator views current without opening
  browser SQL access or changing the existing RLS architecture.
- PWA shortcuts expose Command, Booking and The Chair from supported installed
  app launchers.

## Hosted activation

The visual Command shell and business pulse are safe to deploy before the new
table exists. Until migration 004 is applied, the Build Room shows an activation
notice and all existing studio tools continue to work.

Run the normal migration command against the hosted database:

    npm run db:migrate

This applies migrations/004_command_center.sql idempotently. No browser RLS
policies are added; all Build Room mutations continue through authenticated
server routes.

## Access

- Owner: full Reserve Command access.
- Staff: Reserve Command access scoped by existing studio permissions elsewhere.
- Client: redirected to the existing client-safe studio response and never sees
  the operator workspace.

Reserve Command is intentionally not a code editor or automatic deployment
system. Katie can capture and approve direction from her phone; implementation
still follows the normal source-control and deployment path so a board tap
cannot accidentally change production.
