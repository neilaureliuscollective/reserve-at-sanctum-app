# Reserve Threshold & Home — Phase 1 implementation

## Baseline and plan
Built on PR #11 (`bff2269`), retaining the stacked #9 homepage and #10 Katie world. This PR targets #11's branch; review the chain before any main promotion. No backend architecture branch, migrations, hosted credentials or production state changed.

Research: installed Next 16.3.5 layouts/cookies/redirect documentation, official Next redirect guidance (https://nextjs.org/docs/app/guides/redirecting), and W3C reduced-motion technique (https://www.w3.org/WAI/WCAG22/Techniques/css/C39). Chosen approach: ordinary routes, server-verified identity, still-first imagery, optional 950ms architectural CSS threshold. No new motion or WebGL dependency.

Storyboard: petrol foreground + centered intact crest → voluntary gold-seam threshold → usable Eunice room → named provider worlds. Immediate entry and direct booking skip motion. Existing walkthrough moves to `/explore`; provider routes remain intact.

## Implemented
- New `/` arrival and `/home` visitor/client room, `/enter` verified role resolver.
- Versioned non-sensitive visited cookie; replay remains explicit. No identity in presentation preferences.
- Customer next confirmed visit uses server actor ID, ascending time, limit 1. Honest empty/error states; no appointment notes or Chair context fetched.
- Staff schedule-first; owner Command retained. Shared persistent navigation, work links, native expandable menu with Escape/focus return.
- Safe explicit authentication deep links; default sign-in/OAuth/email confirmation routes to `/enter`.
- Manifest starts `/enter`; signed-in old `/setup` launches resolve home/work. Install help remains `/setup?help=1`.
- Reduced-motion immediate entry, no audio/video, concept labels, foreground focus and visibility refresh.
- No changes to booking mutations, permissions or Chair data.

## Verification and remaining gates
Typecheck, production build, 23 tests passed (including booking collision, ownership, Chair privacy and entry/deep-link tests). Browser download failed with truncated Chromium archive. Therefore no rendered mobile screenshots, animation timing measurement, contrast audit, physical Fold/iPhone test, or browser booking/Chair journey is claimed. HTTP proof passed for public arrival, returning cookie, all three verified synthetic role destinations, client empty state, staff schedule-first, manifest, and direct booking. It uses isolated synthetic identities, not hosted auth.

Runtime verification exposed PGlite bundling passing incompatible URL instances in development. Externalizing that server package fixed local preview loading. Session resolution now opens the database only after a user/token exists, so anonymous arrival does not require a database connection.

Release gates: rendered 360×640 and Fold review, menu/keyboard/text zoom, reduced motion, cookie rejection, interrupted entry/double tap/Back; real scoped visits, Supabase OAuth and installed launch. Check media delivery budgets and Web Vitals before promotion. No production readiness claim.

Aggregate entry telemetry is deferred: current backend thread has not supplied the coordinated count endpoint/table. Do not reuse Chair event counters for unrelated events or add a conflicting migration. Optional video/sound and verified member/manager/location entitlements remain deferred. This is the implemented functional core of Phase 1, with visual/device and telemetry acceptance still open.

## Rollback
Revert this PR's commit while retaining #9–#11. Restore manifest start URL only if installed launch regression is confirmed. No database rollback needed. Never merge older backend identity/brand-boundary drafts blindly: their older positioning conflicts with the current Reserve umbrella direction.
