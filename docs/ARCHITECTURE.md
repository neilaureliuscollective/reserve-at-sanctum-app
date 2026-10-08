# Architecture

## Boundaries

Legacy Reserve is the digital personal ecosystem; Sanctum is its optional physical destination.
Next.js App Router hosts its public introduction, account-owned personal routines,
Vitalis wellness pilot, membership, concierge, booking, and private staff operations.
The public worlds use server-rendered pages and optimized local imagery. Only
the hero, navigation, sign-in, booking, and appointment interactions are client
components. Three.js loads after the initial content and is isolated from forms.
Fonts are self-hosted. There is no third-party tracking or payment SDK. Private Studio has bounded Aethelios drafting as described in the Phase 2 section below.

Fix It Shop is Katie’s men’s salon world. Neil’s public presence is now the founder gateway `/founder` and two distinct founder worlds: `/founder/legacy-reserve` and `/founder/aethelios-technologies`. Legacy `/gent-ascend` and `/aurelius` entrances permanently redirect to his Legacy Reserve founder world. The technology world describes the company vision and connects to the existing Reserve concierge; it introduces no independent technology backend. See [Founder worlds](FOUNDER-WORLDS-PHASE-1.md).

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
| reserve_locations | Physical houses (Eunice operating; others planned). Presentation + provider scope |
| reserve_membership_plans | Membership architecture only. Plans are inactive until offered |
| reserve_memberships | Account-bound membership rows. No billing or entitlement enforcement yet |
| reserve_provider_locations | Providers may belong to one or more houses |
| square_customer_mappings | Legacy user ↔ Square customer ID |
| square_location_mappings | Legacy location ↔ Square location ID |
| square_provider_mappings | Legacy provider ↔ Square team member ID |
| square_catalog_mappings | Service/product/plan ↔ Square catalog object |
| square_subscription_mappings | Membership enrollment ↔ Square subscription |
| square_webhook_events | Durable Square event IDs for idempotent receipt |

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

## Reserve Studio foundation

Phase 1 evolves `/studio` into a shared shell with role-aware homes and Schedule, Build Room, Clients, and Operations. See [the release and database order](RESERVE-STUDIO-PHASE-1.md). `operator` is a separate server-assigned role; provider scope and capability defaults/overrides are enforced by domains and private APIs. `reserve_user_capabilities` and `reserve_workspace_events` add bounded overrides and durable work activity. Shared-work approval is owner-only and tied to revisions, with no external action executor. Browser grants are revoked by the hosted migrator. The factual Today brief is not AI; Aethelios remains a later integration.

## Studio Content and Aethelios

See [Phase 2 release and boundaries](RESERVE-STUDIO-PHASE-2.md). Content reuses workspace revision/approval domains with a dedicated `content` kind and 6,000-character detail bound. Aethelios receives only an explicitly supplied prompt/draft and exposes no tools or business-record retrieval. Server authorization/origin/body limits precede the provider call. The private `reserve_ai_usage` table enforces an atomic six-request-per-minute counter across instances; no prompt or conversation is stored. Server-only key/model configuration is documented in `.env.example`.

## Square transactional seam

Square is the chosen transactional architecture. Credentials stay server-only
(`SQUARE_ACCESS_TOKEN` is never `NEXT_PUBLIC`). The application builds and
serves without Square configuration: catalog, bookings, orders, payments,
subscriptions, and webhooks remain disabled and return empty or internal
states. Internal booking, The Chair, Studio, and membership architecture stay
authoritative until mappings and credentials are provisioned.

Webhook receipt lives at `/api/webhooks/square`. Signatures are HMAC-SHA-256
over `notification URL + raw body`. Duplicate `event_id` values are ignored
after the first durable insert. Full Square payloads are not stored.

## Operating readiness

[Phase 3](RESERVE-STUDIO-PHASE-3.md) adds immutable provider/service proposals, target revision checks, owner approval/application and recorded approval attribution. `reserve_operation_proposals` remains private under RLS with browser grants revoked. Configuration and booking share provider-then-service locking. Existing appointment snapshots/occupancy are preserved; completion is a separate revision-bound, team-authorized audit event and never payment confirmation. Follow-up handoff copies only a verified visit reference into an explicitly saved internal task.

## Legacy Reserve member environment

See [Phase One implementation and release order](MEMBER-FOUNDATION-PHASE-ONE.md). Member navigation is Home, Book, Membership and My Reserve, with Collection and The Chair in secondary navigation. New appointments record validated house context; provider occupancy remains global across houses. Preferred house is account-owned and independent of booking/membership eligibility. Membership is still unbilled and unenforced.

## Membership operations

[Phase Two](MEMBERSHIP-OPERATIONS-PHASE-TWO.md) reuses plans/memberships and adds private account-owned requests and recorded events. Owner-only grants are explicitly complimentary, finite and snapshot the plan terms. User-row locking prevents competing current grants; revisions protect edits and lifecycle changes. Read-time availability accounts for status, dates, captured house and booking eligibility. Product discounts, credits and service redemption cannot be published as available. Profile/Chair access continues under its existing authorization rather than becoming exclusive through a descriptive membership benefit.

## Digital ecosystem presentation — October 8, 2026

Public `/discover`, `/discover/membership`, and `/discover/aethelios` are session-independent introductions. Anonymous entry goes directly to `/discover`; existing authenticated role routing is preserved. Interactive world previews use curated examples and brand geometry. `/home` reads the existing account-owned routine and bounded Vitalis journey state in parallel; marked wellness days remain private. No new database tables, access grants, external AI connections, billing, or booking authority are introduced. See [the transformation](DIGITAL-ECOSYSTEM-TRANSFORMATION.md).
