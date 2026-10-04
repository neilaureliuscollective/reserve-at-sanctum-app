# Reserve: RS identity, stable exploration, dimensional controls

## Problem and scope

The live release still used the previous Reserve crest and icon filenames.
The completed Reserve-Brand-System.zip had not been integrated into main.
Neil also reported unsolicited sign-in navigation while exploring public worlds
and flat-feeling controls. This release is a focused experience correction;
it does not merge the parallel operating-system or Shopify drafts.

## Research and decisions

- Next's installed Link/prefetch documentation confirms automatic prefetch is
  production-only and can execute server-rendered destinations before a click.
  Account and sign-in routes must not be speculative public navigation work.
  https://nextjs.org/docs/app/guides/prefetching
- Redirects in streaming Server Components can produce client navigation. Missing
  authentication is now an inline entrance on private destinations, so neither
  an expired session nor a prefetched destination emits a sign-in redirect.
  This is presentation, not permission: no private component or database read is
  reached without a server-verified actor. APIs retain their original checks.
  https://nextjs.org/docs/app/api-reference/functions/redirect
- The exact reported phone redirect was not reproduced in the available Chrome
  session. The changes remove the identified redirect/preload paths rather than
  claiming a proven browser-specific root cause.
- Installed PWA metadata updates are browser-managed. Versioned icon URLs avoid
  stale asset names; the application id/start URL/scope stay unchanged.
  https://web.dev/articles/manifest-updates
- Short CSS perspective transforms give controls material press depth without a
  WebGL scene, extra dependency, sound, continuous render loop or delayed action.
  https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/transform
  https://www.w3.org/WAI/WCAG22/Techniques/css/C39

## Implementation

1. Use the supplied RS vector for navigation, footer, and account entrance.
   Use the supplied transparent ceremonial rendering for the arrival/explore
   emblem; only its export dimensions/compression change. Fix It Shop and Gent
   Ascend provider identities remain their own brands.
2. Publish versioned 180/192/512 and maskable 512 icons, replace the automatically
   emitted app/favicon.ico, and update legacy compatibility icon paths. Add the
   package's dedicated Open Graph composition. Keep locality outside the master.
3. Disable prefetch for private/sign-in/role-entry links throughout the shell and
   consumer paths. Preserve safe next destinations and explicit save/sign-in flows.
4. Render an AccountEntrance on /account, /my-visit, /my-sanctum and /studio when
   there is no actor. The user chooses Sign in or Keep exploring. Existing role,
   provider, ownership and API checks still govern verified sessions.
5. Optional public identity can fail back to visitor presentation. It cannot
   authorize private reads/writes. A transport failure in cookie refresh does not
   crash the public shell; private authorization still calls getUser.
6. Public home no longer performs a focus/visibility-triggered router refresh.
   The owned visit page retains refresh-on-return and renders the inline entrance
   after a missing session instead of pushing to login.
7. Add gold/petrol material faces, illuminated top edge, visible extrusion, and a
   130ms perspective press for native primary/secondary/auth controls and choice
   tiles. Fine-pointer hover is optional; touch press works without it. Native
   buttons/links keep their handlers and form semantics. Still/reduced motion
   remove transforms/transitions; shadow/border feedback stays. Disabled controls
   do not lift or press. No click delay or new JavaScript animation runtime.

## Validation

- Production build and TypeScript pass.
- All 29 unit/integration tests pass, run with test-concurrency=1 after one
  resource-contention failure during simultaneous build/test execution.
- Production browser verifier: public Home/Katie/Neil exploration, menu, footer
  exposure and simulated >30-second focus return remain on the original route;
  zero speculative requests to protected/sign-in destinations.
- Missing-session private pages remain at their requested URL with an explicit
  entrance; private APIs remain closed. Icons resolve and match manifest sizes;
  id/start/scope remain stable. Apple-touch and favicon references verified.
- 320/360/393/884/1440 layouts checked; actual pressed transform/shadow changes
  verified; still/reduced motion produce no transform; no runtime page errors.
- Existing visit-continuity and Chair browser suites cover real synthetic
  sign-in/save/booking/rebook, provider reschedule/cancel, ownership, consent,
  revocation/deletion, keyboard and enlarged text.

Scripts: verify-brand-entry-depth.mjs (production), verify-visit-continuity.mjs
and verify-chair.mjs (isolated development). No hosted private customer data is
used for these tests. Physical iPhone/Samsung installation remains a founder
acceptance check. Existing production booking database connectivity is a separate
known issue; this release does not change credentials or claim live booking.

## Phone acceptance and rollback

Open the stable production URL and replay arrival. Check the RS mark, explore
both provider worlds, switch out of the app and return, and press Book/The Chair.
My Reserve should offer sign-in only when chosen; public worlds stay public.
If the OS retains the previous installed shortcut icon, remove that shortcut
and add it again from the updated site. No account reset is required.

Rollback by reverting this release commit or restoring the preceding production
Vercel deployment. There are no schema migrations or data writes in this change.

## Production refresh: RS release 2

After Neil reported an old Vercel timestamp/icon, inspection confirmed main
6efd2ca and the stable production aliases all mapped to the RS deployment;
the live manifest served RS v1 icon URLs. The exact phone/dashboard mismatch
was not observable from this environment. A fresh main release now uses new
RS2 icon URLs, emits X-Reserve-Release and data-reserve-release, and displays
“RS release 2 · October 4, 2026” with the actual app icon on /setup?help=1.
Install help survives unavailable optional identity, and explicitly permits
installation/exploration before login. PWA id/start/scope remain unchanged.
The production verifier checks release header/label and every manifest icon.
