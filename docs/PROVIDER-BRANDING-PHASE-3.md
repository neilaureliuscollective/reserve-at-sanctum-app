# Legacy Reserve — provider branding studio (Phase 3)

## Outcome and decisions

One application and scheduling database, with independent provider customer entrances.
`/studio/brands` adds owner onboarding, assigned-provider draft editing, image uploads,
color/profile previews, revision-safe owner publication, explicit unpublication,
location creation and multi-location assignments. Booking, appointment history,
rescheduling, cancellation, rebooking and authentication reuse the Phase 1/2 engine.
Katie retains `/fix-it-shop/app`, Katie Guidry — Founder of Fix It Shop, and her approved
blue/gold identity. Her headline, biography, imagery and accessible colors can be customized.
Future published providers use `/providers/<permanent-slug>/app`.

The ownership unit remains the provider ID. Staff/account roles remain server-assigned.
A brand is a presentation profile, not a new database or authority to read records.
A later organization/multi-staff layer must explicitly define shared-client permissions.

## Research

Supabase changelog and API security guidance checked October 9 UTC: grants and RLS
are separate controls. New tables are server-only with RLS and browser grants revoked.
The September Postgres 17.11 change concerns extension/security behavior; no upgrade,
deprecated auth adapter or privileged function is introduced here.
https://supabase.com/changelog.md
https://supabase.com/docs/guides/api/securing-your-api

Installed Next 16.3.5 dynamic-route and metadata/icon guidance used. Async params and
metadata/file icons provide provider-aware HTML, Apple icons and manifest responses.

web.dev guidance favors separate origins for clearer independent PWA installation.
Same-origin apps share browser data and may conflict with a root installation. Stable
manifest IDs and sibling provider scopes are practical now. The root Reserve scope
remains intact; actual iPhone/Android independent installation is not guaranteed.
https://web.dev/articles/building-multiple-pwas-on-the-same-domain

Sharp guidance informs format verification, pixel/byte limits, raster conversion,
metadata stripping and real PNG exports. No SVG/remote URL fetching.
https://sharp.pixelplumbing.com/api-constructor/

## Data, routes and permissions

Migration `20261009025131_provider_branding_studio.sql` adds private tables:
`reserve_provider_brands` (immutable slug, draft/published snapshots and revisions),
`reserve_provider_brand_assets` (normalized WebP and 180/192/512 PNG bytes), and
`reserve_provider_brand_events` (actor/action/revision, without client records).
The pilot-scale image store avoids a paid service or browser Storage policies. Maximum
20 images per provider, 500 KB source and four million pixels, serialized by provider lock.
A future storage expansion can retain the same immutable asset interface.

Only assigned providers can read/edit drafts or access private image URLs. Owners alone
create providers/locations, assign locations, publish or unpublish. Public projection returns
only the published profile. Public image routes require a currently published reference
and use no-store/nosniff. Unpublication removes public image access; images previously
downloaded cannot be withdrawn. Uploads strip filenames/EXIF and reject animated or
active/vector formats. Mutations check same-origin and bounded input before processing.

Onboarding creates inactive professionals with no services; existing enabled provider
settings remain intact. New locations start closed. Publication does not activate booking,
approve prices/hours, assign a verified user, open locations or send notifications.
Location assignments lock the provider alongside booking configuration. Revisions prevent
stale writes; removing a location with future confirmed visits is blocked (including legacy visits without saved location, which retain the Eunice default). Operation review
now counts affected visits in each appointment location timezone instead of Chicago.

Auth stays on the canonical origin. Generic brand destinations and password recovery
are bounded to local routes; callback failures return to branded sign-in. No cross-domain
or installed-context cookie-sharing promise. Customer pages hide unrelated master navigation;
security remains in account/provider-authoritative APIs.

## Verification and release

Run `npm test`, `npm run typecheck`, `npm run build`, `npm run verify:provider-brands`,
`npm run verify:fix-it-booking`, and `npm run verify:booking-pilot` on isolated local preview.
The new browser scenario creates/publishes a synthetic provider through owner UI, checks
private images/drafts, six widths, parsed manifest/icons, provider query tampering, shared-auth
booking/reload, other-account denial, and unpublication without appointment loss. Domain tests
cover revisions, readable themes, images, provider boundaries, location removal and timezone.
Never run synthetic browser fixtures against hosted credentials.

Release: pass checks; apply additive migration and explicit hosted browser-grant revocations
to RAS App; verify RLS/grants/counts; publish exact-tree PR; require CI and Vercel preview READY;
merge verified head; verify production SHA, private APIs, Katie/master manifests and unpublished
provider responses. No real providers or customers are manufactured as release setup.

Rollback: owner unpublication withdraws customizations. Katie falls back to her approved
foundation. Appointments remain in the master account. Phase 2 code rollback is compatible
with additive tables left intact; new provider links become unavailable, so prefer a forward
fix after onboarding real brands.

## Remaining operating checks

Katie's verified account/email, approved menu/prices/hours, actual address and live pilot
reconciliation remain required. Hosted email/OAuth, real concurrency and 3–5 pilot-client
workflows must be verified before declaring Katie Pilot Ready. Test actual iPhone/Samsung
installation, an existing Reserve app, icon updates and fresh sign-in; browser emulation cannot
prove them. Optional custom domains, native binaries, marketplace discovery, external calendar
sync, payment revenue reports and automated notification delivery remain future enhancements.
No payment service is activated here.

## Release evidence

162 automated tests, TypeScript and production build passed. Provider studio/customer browser
checks passed at 320, 390, 540, 768, 884 and 1440 px. Existing Fix It Shop and booking-pilot
browser regressions passed. Hosted migration applied to RAS App (Postgres 17.11); new tables
have RLS and no anon/authenticated SELECT grants. Production still has zero provider, service,
appointment, brand and uploaded-image rows. No catalog or user assignments were seeded.
Supabase advisors show expected server-only RLS/no-policy INFO and the existing leaked-password
protection WARN; no new security ERROR. Actual phone installation and live pilot remain unverified.
