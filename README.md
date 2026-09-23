# The Reserve at Sanctum

## Current visual continuation

The September 21 visual pass continues the recovered original source archive.
It adds the architectural editorial homepage, distinct Fix It Shop and GENT
Ascend brand environments, readable mobile layouts and connected navigation.
See [the visual plan and verification](docs/VISUAL-DIRECTION.md).
The subsequent [brand-world continuation](docs/BRAND-WORLDS.md) adds distinct
Fix It and GENT Ascend compositions, research-grounded story sections, page chapter
links and a tighter mobile Arrival. It also records the latest verification.
The recovered source is now preserved in the canonical repository. The current
phase adds the GENT Ascend grooming experience without replacing the validated
booking and studio foundation.

Phase-one implementation for Neil + Katie: a men's sanctuary in Eunice,
Louisiana, bringing together **Fix It Shop × GENT Ascend Collective**.

Official project: `neilaureliuscollective/reserve-at-sanctum-app`.
This canonical repository replaces the former empty
`legacy-sanctum-co/the-reserve-at-sanctum-platform` repository. It does not
replace or modify any independent digital-infrastructure application.

## What is built

- Katie’s men’s cosmetology page now leads with “It’s never just a haircut.”
- The Chair (`/chair`): value-first grooming check-in, optional life context,
  conversation preferences, explicit save/sharing, and editable client memory.
- Katie’s existing studio includes shared Chair summaries and private grooming
  notes; personal life context requires separate consent and expires in seven days.
  See [The Chair implementation and validation](docs/THE-CHAIR.md).

- Cinematic, responsive homepage with original concept architecture and a real
  Three.js Louisiana medallion; mouse-responsive lighting/rotation, pause,
  reduced-motion support, and usable content without WebGL.
- Separate Fix It Shop and GENT Ascend worlds, plus an honest location page.
- Public Sanctum Mirror flow with guided three-angle capture, grooming
  priorities, a personal Blueprint, and value-first account conversion.
- Google and Apple OAuth through the existing Supabase PKCE session
  architecture, with email/password as a quiet fallback.
- Account-owned My Sanctum grooming profiles persisted server-side without
  retaining raw face images or presenting the experience as medical diagnosis.
- Service → available time → sign-in → saved preview appointment.
- Client appointment history and Katie/owner appointment book with day filtering,
  rescheduling, cancellation, and persisted records.
- Transactional availability, service buffers, atomic collision protection,
  version checks, server-owned pricing, and ownership/staff authorization.
- Supabase Auth integration and server-side Postgres adapter, schema migration,
  and auth-cookie refresh proxy, prepared for a hosted environment.
- Web-app manifest and home-screen icons. The app requires a connection for
  booking and account operations; it does not cache private records offline.

## Run the isolated local preview

Requires Node.js 22 or later. In this project directory:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. The preview uses embedded Postgres (PGlite) in
`.data/reserve`, **not localStorage**. Records survive reloads and server restarts.
The sign-in screen offers synthetic client, Katie, and Neil profiles. These
buttons are disabled in production regardless of the preview environment flag.

All displayed preview services, prices, and hours are illustrative. No payment
provider, SMS, outbound appointment email, or real appointments are connected.
Do not enter real customer or sensitive personal information in this preview.

Stop the development server before running browser verification or resetting
the preview. To remove only local synthetic appointments and sessions:

```sh
npm run preview:reset
```

## Verification

```sh
npm test
npm run typecheck
npm run build
npx playwright install chromium
npm run verify:browser
npm run verify:chair
```

Browser verification starts its own development server and writes screenshots
to ignored `artifacts/`. Set `CHROMIUM_PATH` only if your environment supplies a
browser executable. The test creates and then cancels a synthetic appointment.
It requires the local preview database and will refuse hosted credentials.

## Hosted preview setup — still required

1. Create/select a **dedicated preview** Supabase project and Vercel project
   connected to this exact repository. Enable Vercel Deployment Protection.
   Search-engine `noindex` is not access control.
2. Set `DATABASE_URL` to the server-only Postgres connection, plus
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and
   `APP_ORIGIN` to the exact HTTPS preview origin. Set `RESERVE_DEV_PREVIEW=false`.
   Never expose the database connection in a `NEXT_PUBLIC_*` variable.
3. Run `npm run db:migrate` with the hosted `DATABASE_URL` present in the shell.
   This creates private tables; it does **not** seed preview identities or enable
   a live catalog. The application needs a server role with access to these
   tables. Browser Data API access intentionally has no RLS policies.
4. Configure Supabase Site URL and allowed redirects for the preview domain,
   including `/auth/callback`. Enable Google and Apple providers; provider
   secrets remain in Supabase and never in this repository. Verify both PKCE
   return journeys on the real preview domain. Email/password remains a fallback.
5. Have Neil and Katie create/sign in to their accounts, then assign `owner` and
   `staff` roles by **verified Supabase user ID** in the server database. Assign
   Katie's staff row to provider ID `katie`. Never grant roles from signup
   metadata. See `docs/ARCHITECTURE.md` for the data model and provisioning example.
6. Insert approved preview services and hours. Keep offerings disabled until
   reviewed. Repeat the full booking/permissions/concurrency journey against
   hosted Postgres and Supabase Auth; local verification does not establish that
   external configuration is correct.

No hosted credentials were available during this build, so hosted authentication,
database migration, deployment, and real availability have **not** been activated
or verified. The `PRIVATE PREVIEW` label and noindex settings stay in place.

Before any public booking launch: approve the actual menu, prices, durations,
buffers, schedule, address, cancellation policy, and account/privacy copy; wire
any required reminders and payment policies; add password recovery and staff
schedule management; and verify the hosted journey. No fake testimonials,
contact information, or health outcomes have been added.

See `docs/VISION.md` for the implemented cinematic direction and
`docs/ASSETS.md` for imagery provenance.

## Katie’s phone pilot

Open `/setup` for sign-in status and phone installation instructions. Katie’s
studio now supports time blocking; verified hosted staff accounts can be assigned
with `npm run staff:provision`. See [the pilot checklist](docs/BOOKING-PILOT.md)
for the required hosted configuration and real-device verification.
