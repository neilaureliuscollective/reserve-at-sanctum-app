# Architecture

## Boundaries

Next.js App Router hosts the Reserve website, booking, accounts, and staff book.
The public worlds use server-rendered pages and optimized local imagery. Only
the hero, navigation, sign-in, booking, and appointment interactions are client
components. Three.js loads after the initial content and is isolated from forms.
Fonts are self-hosted. There is no third-party tracking, payment SDK, or AI chat.

Fix It Shop is Katie's men's salon world. GENT Ascend is Neil's men's grooming
world: consultation, hair/beard/skin priorities, products, rituals, and the
Sanctum Mirror. The separate digital-infrastructure company is not part of this
application.

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
| reserve_grooming_profiles | Account-owned Blueprint and grooming priorities       |
| reserve_chair_profiles | Current client-selected grooming and chair preferences |
| reserve_chair_context | Separately consented life context with seven-day expiry |
| reserve_chair_notes | Provider-scoped staff grooming notes, never in client responses |
| reserve_chair_funnel | Anonymous daily action counts without answers or identifiers |

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

Schedule blocks share the same occupancy ledger. The studio supports one-day block creation and removal in 15-minute steps,
using private reserve_blocks and the same atomic occupancy ledger. The first studio calendar is an
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

## Sanctum Mirror and social account conversion

The public Sanctum Mirror collects a three-angle guided capture state and the
client's stated grooming priorities before authentication. The current build
does not upload or retain facial photographs and does not claim a medical skin
diagnosis. A short-lived browser draft survives the OAuth redirect; after a
Google or Apple PKCE callback, the authenticated client explicitly saves the
derived Blueprint to the server-owned grooming profile table. API access is
always resolved from the verified session and never accepts a user ID from the
browser.

Google and Apple must be enabled in Supabase Auth, with the production and
preview `/auth/callback` URLs allow-listed. Email/password remains a quiet
fallback. Local preview access exercises the same draft-to-profile journey with
synthetic identities.

## Deliberate phase boundaries

No production customer migration, paid membership, checkout, notifications,
medical assessment, image retention, product fulfillment,
or native App Store binary. The manifest provides a home-screen foundation;
private records are network-only. Hosted signup/confirmation, token refresh,
Postgres concurrency and deployment must still be tested with real configuration.

Auth reference: [Supabase server-side clients and proxy](https://supabase.com/docs/guides/auth/server-side/creating-a-client).
Next.js APIs were checked against the documentation installed with Next 16.3.5.

## The Chair

Katie’s `/chair` uses the same Reserve user and Supabase session as Neil’s Mirror.
It does not read, overwrite, or infer from the Mirror profile. Saving and staff
sharing are explicit; clients can revoke sharing or delete Chair data independently.
See [The Chair](THE-CHAIR.md) for consent, migration, retention, and test details.
