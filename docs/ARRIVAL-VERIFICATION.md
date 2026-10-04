# Phase 1 arrival completion and verification

This follow-up builds on `codex/reserve-threshold-home` (a512612), preserving the cinematic worlds and working booking/account/studio systems. It targets that branch rather than duplicating its implementation on main. The downstream visit-continuity branch must receive this patch before a combined release.

## Experience changes

- First arrival retains Enter, Book, immediate entry, and sign-in. During the threshold, an announced opening state and immediate-entry link remain available. Duplicate activation is prevented; timer cleanup and a reduced-motion change during entry are handled.
- Still mode persists a presentation preference only. System reduced motion overrides animation. Denied browser storage remains usable. Sound is explicitly off; no audio permission or download is introduced.
- The home motion control lives in the menu so it cannot cover provider links. At narrow widths navigation wraps into two usable rows. Home continues to show genuine account-owned appointment context or honest empty/error states.
- The existing approved crest is compressed to a 512px transparent WebP (~70 KB, down from ~389 KB). No brand artwork is redesigned.
- Browser performance marks measure activation to actionable home locally. No customer data is transmitted, no analytics endpoint is invented, and no database migration is included. Aggregate abandonment/conversion analytics remain an integration dependency for the operating-system thread.

## Verification

- `npm run build`, `npm run typecheck`, and `npm test`: passed; all 23 tests pass.
- `CHROMIUM_PATH=/path/to/chromium node scripts/verify-arrival.mjs`: passed in isolated synthetic development preview. Checks 320/360 mobile, 768 fold/tablet, 1440 desktop, visible first-screen Enter/Book, transition escape, stored Still mode, system reduced motion, denied local storage, no-JavaScript public entry, keyboard menu dismissal, verified client/staff/owner routing, a real synthetic upcoming appointment and cancellation, direct booking, manifest entrance, and absence of page errors.
- Screenshots were inspected for mobile entrance and home. The home uses labeled concept imagery and retains the private-pilot notice that appointments/payments are not live.
- The older `verify:chair` script stops at its unconditional image-completion assertion, which includes lazy images below the viewport. It does not establish a Chair regression; it also does not count as a passing Chair browser test. Existing Chair server-authority/consent tests pass. Its browser coverage must be repaired before the combined visit-continuity release.

- Local production Chromium measurement after shortening the threshold to 800 ms: 1,126 ms from activation to actionable home. Mobile optimized hall image transferred ~28 KB and entrance crest ~20 KB. This is an unthrottled local measurement, not a field-performance guarantee.

## Release boundaries

No deployment or main-branch merge is performed. Hosted OAuth, actual mobile Safari/Chrome, real-device performance, and production analytics need release verification. Local Chromium emulation is not real-device evidence. Synthetic preview authentication remains disabled in production. No new dependencies, AI features, commerce system, roles, permission model, or booking schema are introduced.
