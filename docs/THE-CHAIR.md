# The Chair — implementation plan and decisions

Scope: extend the canonical Next.js 16.3.5 App Router application. Preserve Neil's
Sanctum Mirror, existing Supabase PKCE identity, Postgres/PGlite adapter, booking,
and studio. No new authentication service or artificial personality analysis.

## Build plan

1. Reframe Katie's existing page around “It's never just a haircut,” men's
   cosmetology, optional conversation, her craft, and the shared Reserve.
2. Add `/chair`: intent → optional life context and conditional load → conversation
   preference → grooming goal → optional practical details → transparent summary.
   Use native controls, explicit Continue, Back, skip, focus management, and
   reduced motion. Target 1–2 minutes, without imposing a timer.
3. Offer saving only after the summary. Reuse `/signin?next=/chair` and existing
   Google/Apple PKCE. Keep a short-lived, consent-filtered draft in sessionStorage
   only when the client chooses sign-in; require review and explicit save on return.
4. Store grooming/preferences in a structured Reserve-owned profile extension.
   Life context is separately opted in, separate from permanent preferences,
   expires after seven days, and is never reused as today's emotional state.
   Provide edit, revoke sharing, and delete. Staff notes stay in a separate table.
5. Add a compact protected Chair mode to Katie's existing studio. Enforce
   client ownership and Katie-provider/owner scope on every server operation.
6. Verify existing booking/Mirror, Chair branching, saving, ownership, role
   isolation, expiry, deletion, responsive widths, motion, console, and build.

## Focused research → product decisions

- W3C multi-page forms: logical stages, visible progress, skippable optional steps,
  no form timeout. https://www.w3.org/WAI/tutorials/forms/multi-page/
- Nielsen Norman Group progressive disclosure: practical details live behind an
  optional stage; no technical haircut vocabulary required.
  https://www.nngroup.com/articles/progressive-disclosure/
- Square's appointment/customer workflow keeps visit notes close to service
  context. Extend the existing studio rather than introduce another CRM.
  https://squareup.com/help/us/en/article/5349-schedule-and-accept-appointments
- Supabase Google/Apple docs: reuse existing social providers and PKCE callback;
  hosted provider credentials and redirect allowlists are an external prerequisite.
  Apple web OAuth secrets require six-month renewal. No SMS provider is configured,
  so phone login would add an unverified delivery/billing dependency this phase.
  https://supabase.com/docs/guides/auth/social-login/auth-google
  https://supabase.com/docs/guides/auth/social-login/auth-apple
- BarberTalk's own training framework distinguishes listening and connecting to
  help from treatment. This is relevant research, not a claim Katie is a barber,
  therapist, or has completed that training. No emotional free-text intake or
  automated inference; resource links remain client-initiated.
  https://heretotalktraining.com/course-details/barber-talk-training/
  https://www.samhsa.gov/mental-health/988/faqs
- Data-minimisation guidance informs conservative product design (not a claim
  of jurisdiction-specific legal compliance): separate, optional, expiring context.
  https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/the-principles/data-minimisation/
- web.dev responsive and reduced-motion guidance: fluid grids, ordinary document
  flow, no fixed-height modal or WebGL in intake. Reuse the labeled existing
  concept photography; do not invent documentary footage or Katie testimonials.
  https://web.dev/articles/new-responsive
  https://web.dev/articles/prefers-reduced-motion

Image upload is deferred: no approved private asset storage is configured. Clients
can bring inspiration to the visit. No upload button pretends to persist photos.
Testimonials stay an editorial placeholder until approved authentic stories exist.

## Data and rollout

`002_chair.sql` adds four private RLS-enabled tables. The existing migration
command now applies all ordered, idempotent SQL files; it does not reseed a
hosted database. `npm run db:migrate` must run with the intended server-only
Postgres connection before enabling hosted Chair saving. Next's output trace
explicitly includes the migrations for Vercel. No new production dependency.

- `reserve_chair_profiles`: one current grooming/preference snapshot per Reserve
  user, explicit share permission, consent version, and optimistic revision.
- `reserve_chair_context`: separately opted-in life/load selections. Read joins
  exclude them after seven days; every client/studio read also physically purges
  expired context. No historical emotional timeline. A daily database cleanup
  can use `DELETE FROM reserve_chair_context WHERE expires_at <= now()` if the
  deployment needs physical cleanup even while the app has no traffic.
- `reserve_chair_notes`: grooming-only staff notes, independent from client
  answers. Katie-provider staff and the Reserve owner can access shared check-ins.
  Clients never receive note fields. Revoking sharing hides check-ins and notes;
  deleting Chair data cascades to the notes and optional life context.
- `reserve_chair_funnel`: daily event counts only, without user/session IDs,
  answers, URLs, photos, or free text. These are directional counts, not unique
  visitors or verified account-creation counts. `auth_returned` measures a real
  authenticated return to a Chair draft, not a claim of a newly created account.

APIs use verified existing sessions, role/provider checks, same-origin mutations,
strict Zod enums, bounded request streams, parameterized queries, no-store
responses, and optimistic write conflicts. Invalid JSON never logs its contents.

Hosted Google and Apple use the existing Supabase configuration and callback.
Phone auth, photo storage, AI interpretation, automated clinical escalation,
notifications, and fabricated service/testimonial content are intentionally absent.
The optional support disclosure links to real US resources without interpreting
any answer or notifying anyone. No appointment is promised by saving a check-in.

## Open and verify

- Katie's page: `/fix-it-shop`
- Customer experience and saved Chair: `/chair`
- Shared Reserve account: `/my-sanctum`
- Katie's authorized view: `/studio` → Today's Chair

Local synthetic mode: `RESERVE_DEV_PREVIEW=true`,
`APP_ORIGIN=http://localhost:3000`, `npm run dev`.
Never enable synthetic identities in a production deployment.

`npm run verify:chair` starts its own isolated dev server and covers the customer,
save, staff, privacy and responsive journeys. Set `CHROMIUM_PATH` to an installed
browser if required. Stop other dev servers first. `npm run verify:browser`
retains the original full booking and Sanctum Mirror regression journey.

## Validation results

- Dependency declarations match the existing lockfile; no production packages
  were added. TypeScript and the Next.js production build pass.
- 15 unit/integration tests pass, including booking concurrency and persistence,
  consent filtering, ownership, provider isolation, stale writes, RLS denial,
  context expiry, cascade deletion, and bounded/sanitized request parsing.
- Existing complete browser regression passes: homepage/WebGL controls,
  navigation, Mirror → saved Blueprint, guest booking → sign-in return → saved
  appointment, staff rescheduling/cancellation, and origin/role protection.
  Two pre-existing test sequencing issues were repaired: wait for the asynchronous
  Blueprint save, and sign out before testing the guest booking handoff.
- Chair browser verification passes: branching and skipping, keyboard focus,
  summary before sign-in, draft restoration without automatic save, shared/private
  saves, locked consent during in-flight saving, repeat visits, staff notes,
  revocation, deletion, malformed drafts,
  reduced motion, and text enlargement. Customer layouts cover 320, 360, 390,
  540, 768, 884, 1024, and 1440 pixels; staff layouts cover 320–1440 pixels.
- Production axe audits find zero standard accessibility violations on Katie's
  page and The Chair; no browser errors were observed. Lighthouse accessibility
  and best-practice categories score 100 on both.
- Local throttled-mobile Lighthouse performance scores in the last font-loading
  audit: Katie 69; Chair 71. LCP 3.7s / 3.5s, CLS 0 / 0, TBT 890ms / 880ms.
  These are lab results, not passing field Core Web Vitals. Shared framework
  bootstrap remains a mobile performance risk to measure on the hosted preview.
  The work removes the initial Zod payload, server-renders the guest opening
  screen, prioritizes the hero image, and preloads the exact existing local font
  files through next/font. Render-blocking estimates dropped from roughly a
  second to 260–270ms, and Chair unused-JS estimates from 121KiB to about 50KiB.
- Original homepage and Neil's page retained their responsive layouts after the
  font-loading improvement at 320, 390, 884, and 1440 pixels. Typeface files,
  weights, typography tokens, and brand identities are preserved.

Hosted activation is not verified: this workspace has no hosted Supabase
credentials, and the connected Vercel account lists older projects rather than
this canonical Reserve project. Apply migrations and verify Google/Apple redirects
and real staff identities on the intended deployment before enabling live use.
Photo upload is not implemented or represented as available.
