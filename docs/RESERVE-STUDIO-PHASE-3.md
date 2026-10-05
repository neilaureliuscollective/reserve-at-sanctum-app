# Reserve Studio — Phase 3

## Decision and research

Phase 2 established Command, Content Studio and Aethelios drafting. The next practical phase is operating readiness: entering the actual menu and working hours, reviewing changes, recording service completion and preparing internal follow-up. This is one Reserve location, not a generalized CRM or resource-scheduling suite.

- [PostgreSQL 17 explicit locking](https://www.postgresql.org/docs/17/explicit-locking.html) informed the common provider-then-service lock order used by configuration and transactional booking. Slots remain advisory; booking and mutation transactions remain authoritative.
- [WAI form validation](https://www.w3.org/WAI/tutorials/forms/validation/) informed visible labels, unit/range instructions, native input constraints and retained form values after errors.
- Existing Next.js 16.3.5 installed Route Handlers/Server and Client Components docs were consulted. Existing Supabase server-only RLS/grant architecture is preserved.

## Delivered

Operations is now a focused Menu / Availability / Review workspace in the petrol, obsidian and gold Studio shell. Forms remain inside an accessible native modal rather than expanding the home dashboard. The operation review queue is reachable directly from Command when changes are pending.

Owners can propose a provider setup with an explicit identifier, actual name, working days, hours and closed/open state. No names, hours or live offerings are prefilled for a new provider. Operators can propose changes only for their assigned existing provider. Future staff can read their provider's settings but cannot submit configuration proposals. Server capability checks govern creation and review, not client controls.

Services have explicit descriptions, USD prices stored in cents, durations/buffers in 15-minute steps and enabled state. Proposed services never enter the public catalog before approval. A new provider should first be approved closed, then its actual service menu entered/enabled, then its booking availability opened. Opening an empty provider is rejected; enabled services must fit the full opening interval including buffers.

A proposal is immutable after creation. Review displays the exact proposed values against the saved baseline, creator and provider. Neil's **Approve and apply** is the explicit action that both approves and configures the operation. Application locks the proposal and provider/service, verifies the target revision, applies settings and records the approving actor/time atomically. Duplicate application is idempotent. A competing or stale proposal cannot overwrite current settings; dismiss and recreate it from the refreshed record. Operators can dismiss their own pending proposals; owners can dismiss any.

Hours changes report upcoming confirmed visits outside proposed days/hours or affected by closing the provider. Service changes report upcoming confirmed service visits. Neil must acknowledge those visits before applying. This does not reschedule/cancel them or send messages. Existing visits retain their captured price, start/end and buffer occupancy. Disabling settings prevents new bookings and, under the existing booking rules, new rescheduling into disabled services/providers; original visits remain on the book.

Transactional booking/rescheduling takes shared provider/service row locks in the same order as configuration. This prevents a menu or hours update from crossing the middle of an authoritative booking transaction. Existing slot collision protection is unchanged.

Schedule supports **Mark complete** after a visit's scheduled end. It requires appointment management and the assigned provider scope (or owner authority), checks the appointment revision and writes an audit event. It does not record payment. Completed visits expose a scoped **Create follow-up task** handoff: Build Room preselects Task with a server-verified visit reference and explicitly states that no message was sent. The user decides and saves the internal work. No Chair notes, client life context or contact details are copied into the task.

## Database and release

CLI-generated `20261005181004_reserve_operations.sql` is in the repository's existing `migrations/` directory. It adds revision columns to services/providers and private `reserve_operation_proposals`. Existing records remain intact. Hosted migrator uses `lockdownStudio` for browser-grant revocation.

The migration was applied as `reserve_operations` to dedicated healthy project `wffmdiszikhmkmoiorac`. Hosted verification confirmed RLS, zero browser policies, no anon read/authenticated update privileges, zero production proposals/services seeded and the existing single owner preserved. The security advisor reported the expected server-only no-policy informational notices and the pre-existing leaked-password setting ([reference](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)). No user roles or business settings were activated.

This phase builds on Phase 2 PR #25, which itself builds on Phase 1 PR #24. Source is not merged into main or deployed to the canonical domain. Release in that order, then test canonical-domain owner/operator configuration and one real approved menu. Katie still requires her confirmed account and server-assigned operator access. Actual service names/prices/durations/hours must come from Neil and Katie.

## Verification

- Full domain suite: 53 tests pass, including existing simultaneous booking, slot ownership, blocks and Chair privacy; new proposals, owner-only apply, stale/conflicting revisions, competing provider creation, hours validation/impact, preservation of existing visits and scoped/revision-bound completion.
- Production build and TypeScript pass.
- `verify:operations`: synthetic service proposal persistence, exact owner approval/application, explicit closed-provider creation, operator/client/origin isolation, Menu/Availability/Review views for both owner/operator at 320/390/884/1440 widths, no horizontal overflow or page errors. Screenshots visually inspected.
- `verify:completion`: synthetic elapsed visit completed through Schedule, scoped task handoff with correct Task/title/reference, explicit save to shared work and no page errors.
- Domain concurrency tests use local PGlite; they do not establish simultaneous hosted Postgres behavior. No production booking/configuration was mutated for testing.

## Current limits and next phase

Hours use one same-day opening interval and whole-hour boundaries, matching the current booking model. One-day exceptions use existing time blocks. Split shifts, quarter-hour opening boundaries, external calendar sync, automatic follow-up/outreach and a role editor remain outside this build.

Phase 4 remains Shopify commerce/inventory signals and the practical launch checks. Product/service/payment truth must come from connected Shopify and approved business records; no fabricated sales totals or Stripe checkout.
