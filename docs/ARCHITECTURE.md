# Architecture

## Boundaries

Next.js App Router hosts the Reserve website, booking, accounts, and staff book.
The public worlds use server-rendered pages and optimized local imagery. Only
the hero, navigation, sign-in, booking, and appointment interactions are client
components. Three.js loads after the initial content and is isolated from forms.
Fonts are self-hosted. There is no third-party tracking, payment SDK, or AI chat.

Fix It Shop is Katie's men's salon world. Aurelius is Neil's broader world of
character, discipline, wellbeing, community, and legacy. Its independent app is
not part of this repository's authentication or booking database.

## Data and authority

`lib/db.ts` exposes parameterized queries and transactions through two adapters:
hosted Postgres (`postgres`) and nonproduction-only persistent PGlite. No
synthetic seeding occurs when `DATABASE_URL` is set.

| Table                | Responsibility                                             |
| -------------------- | ---------------------------------------------------------- |
| reserve_users        | Verified identity and server-assigned role/provider scope  |
| reserve_providers    | Provider availability hours and days                       |
| reserve_services     | Approved duration, buffer, price in cents, enabled status  |
| reserve_appointments | Original request, captured price/time, status, revision    |
| reserve_occupancy    | Unique provider/15-minute unit for visit + buffer or block |
| reserve_sessions     | Hashed, expiring local development sessions only           |
| reserve_audit        | Appointment mutation events                                |

Hosted authentication verifies Supabase users on the server with `getUser()`.
`proxy.ts` refreshes cookies before protected pages render. Customer roles default
to `client`; roles never come from editable auth metadata. A client sees their
own records, staff see their assigned provider, and the owner can see all. Pages
and API routes both enforce access. Mutation requests also require the configured
origin and JSON, and API responses are not cached.

RLS is enabled on all application tables with no browser-access policies. Queries
are deliberately routed through the server, whose Postgres credentials must have
the required privileges. Do not add a public service-role token or broad RLS
policies to make an integration work.

## Booking integrity

Times are interpreted in `America/Chicago`, including daylight saving. Local
preview hours are Tue–Sat 9–5, with a two-hour minimum notice and 45-day horizon.
Durations/buffers must be multiples of 15 minutes. Availability is advisory;
the transaction is authoritative. All occupied 15-minute units are inserted
against a unique database key so competing reservations cannot both commit.

Creating a booking captures the server's service price and stores a client-bound
idempotency key. Rescheduling locks the appointment row, checks its revision,
and moves occupancy in the same transaction. If the new slot conflicts, the
original reservation remains intact. Cancellation releases occupancy while
preserving the record and audit trail. Existing visits retain their original
duration, buffer, and price. Same-request sequential retries return the saved
visit; simultaneous retries may receive a conflict and can reload the account.

Schedule blocks share the same occupancy ledger. The schema supports blocks,
but there is no block-management UI yet. The first studio calendar is an
appointment list with day filtering, not an external calendar sync or drag/drop
resource scheduler. The current view is capped at the latest 100 appointments.

## Hosted provisioning example

Run only on the dedicated preview project after confirming the account UUIDs.
Replace the placeholders; do not execute these sample IDs verbatim.

```sql
INSERT INTO reserve_providers(id, name, enabled)
VALUES ('katie', 'Katie', false);

UPDATE reserve_users SET role = 'owner'
WHERE id = '<verified Neil Supabase user UUID>';

UPDATE reserve_users SET role = 'staff', provider_id = 'katie'
WHERE id = '<verified Katie Supabase user UUID>';
```

Insert reviewed services with `enabled=false`, then explicitly enable the
provider and approved services when the preview is ready. Do not copy local
illustrative menu entries into a real operating schedule as approved prices.

## Deliberate phase boundaries

No production customer migration, paid membership, checkout, notifications,
wellness intake, health records, product fulfillment, shared Aurelius identity,
or native App Store binary. The manifest provides a home-screen foundation;
private records are network-only. Hosted signup/confirmation, token refresh,
Postgres concurrency and deployment must still be tested with real configuration.

Auth reference: [Supabase server-side clients and proxy](https://supabase.com/docs/guides/auth/server-side/creating-a-client).
Next.js APIs were checked against the documentation installed with Next 16.3.5.
