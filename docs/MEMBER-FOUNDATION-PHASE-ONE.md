# Legacy Reserve member foundation — Phase One

Approved October 7, 2026. This release gives member Home, Membership and My Reserve separate responsibilities while keeping operational auth, booking, staff permissions, Studio and The Chair intact.

## User flow

Home prioritizes the next owned visit or booking action, followed by membership and appearance continuity. Membership has its own route and truthful no-offer, unavailable, pending, active, paused and ended states. Effective dates affect the displayed state; this is not an entitlement engine. My Reserve connects profile, Chair, visit history and preferred house. Collection is a secondary destination until purchasing is ready. Inactive seeded plans are not advertised as paid offers.

Profile is canonical at `/profile`; `/my-sanctum` redirects compatibly. Historical provider worlds remain discoverable. Marketing arrival and existing icons/domain are unchanged. Customer copy does not expose merchant integration configuration.

## Location authority

New bookings record `location_id` and validate an enabled, booking-enabled house plus explicit provider assignment inside the booking transaction. Catalog failures never fall back to all providers. Occupancy remains provider-wide across houses, preserving collision protection. Idempotency compares location as well as the original payload. Rescheduling validates the recorded house; cancellation remains possible without an active service/house. Unknown historical locations are not backfilled from a provider's present assignment.

Location preference is account-owned, server-authorized, validated against enabled locations and independent of appointment or membership eligibility. It never changes a saved appointment. Location data and membership failures remain distinct from empty records.

The Chair remains explicitly Katie-scoped; no broader recipient sharing or private-note access is added.

## Schema reconciliation and release order

The actual dedicated Supabase deployment had an organization-aware `reserve_locations` schema with Eunice in `setup`, `published=false`, no providers and no appointments. It lacked the repository's membership/location expansion tables. Reconciled idempotent 006 adds missing presentation/eligibility fields without replacing organizational IDs, publication constraints or existing records. 007 no longer enables Eunice through migration. The new timestamped member-environment migration adds preferred house, appointment location and an index. Synthetic local seed alone enables its test house.

Apply reconciled 006, 007 and the member-environment migration in that order before application release. Revoke browser-role privileges on the new private tables; RLS has no browser-access policies. No live provider/menu data, prices, staff roles, subscriptions or merchant activation are created. Validate the production Supabase project by deployed public client configuration and check the existing schema before applying.

Rollback the application to the prior release without dropping additive columns or tables. Do not run local seeding on the hosted database. Do not reopen location booking automatically.

## Verification

`npm test`, `npm run typecheck`, `npm run build` and `CHROMIUM_PATH=<browser> node scripts/verify-member-foundation.mjs`.

New regression coverage includes unavailable catalog/membership reads, closed/unknown/unassigned locations, location-aware idempotency, provider collisions across houses, effective membership dates, member ownership, preferred-house separation and idempotent reconciliation of the old organization schema. Browser verification uses synthetic local accounts only, exercises member navigation/preference saving/booking/visit preparation/cancellation, old profile URLs, team redirects, invalid origin/house checks and narrow/Fold/desktop layouts.

Paid subscription billing, redemption, checkout/member pricing, partner services, concierge, community and location-specific resource scheduling remain later phases.
