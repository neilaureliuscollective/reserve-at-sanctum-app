# Fix It Shop: steel, gold, blue and stone correction

Local-only candidate, October 20, 2026. No push, PR, merge or deployment.

## Source and preservation

Production source: `699deb90f53a05dd41976613628a185a50625115`, repository neilaureliuscollective/reserve-at-sanctum-app. The earlier warm-white candidate `74efae0fa9008d4945a4ebb003733af77c971890` is preserved on `visual/fix-it-cream-steel`. This correction is isolated on `visual/fix-it-steel-gold-correction` in `/workspace/fix-it-visual`, with port 3147 and its own build output. Original checkout and baseline remain unchanged. Paused booking-platform checkpoint 49def2c3 and draft PR 73 were not resumed or changed. The earlier visual report remains historical; this report supersedes its palette description.

## Material decisions

Restored the original brushed-steel material: steel #5a6168, alloy #39464e and carbon #121417, fine 102-degree brushing and the existing home-grain asset. Steel is visible in the masthead, navigation, portrait-free emblem composition and founder opening. Katie's existing gold #c4912f/champagne #e0bb6a appears in primary actions, selected controls, type and fine edges. Deep blue #102c48 provides focal panels and selected states. Muted stone #d5d3c9 and opaque reading surfaces #e2dfd4 provide relief. Dark bronze #674714 keeps gold-family labels readable on stone. There is no white veil over the hero photograph. The desktop photograph blends into steel with a mask; mobile retains its own dark readability overlay.

Home's #katie area uses the unchanged real emblem and dimensional steel with founder context and a link to `/fix-it-shop/app/founder`. Home no longer renders Katie's portrait. Founder portrait, biography, image originals, logos and icons remain unchanged. Existing illustrative photography and disclosures remain; no premise, client-result photograph, likeness or new claim was generated.

Styles remain scoped to `.fix-it-premium`, the existing Fix It Shop story scope/CSS module, and `#fix-it-pocket`. No shared platform behavior or other tenant theme is changed. The standalone public asset cache revision is v21 so installations can receive the CSS; cache routing and storage behavior are unchanged.

## Research and validation basis

Reviewed repository identity/material instructions, existing assets and layouts, and installed Next App Router CSS guidance. Accessibility decisions follow W3C contrast minimum (https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), reflow (https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), and MDN prefers-reduced-motion guidance (https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion). Opaque surfaces are the fallback; blur is optional. Existing motion controls and reduced-motion behavior remain intact.

- `npm test`: 216 passed, zero failed. Includes booking/ownership/provider tests, public-cache regression and focused visual boundary assertions.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `VISUAL_REQUIRE_STEEL=true VISUAL_ARTIFACT_DIR=artifacts/steel-correction node scripts/verify-fix-it-visual.mjs`: passed at 390, 884, 1440 and 320px, plus 200% CSS zoom. Checks portrait separation, exact booking link, material rendering, reduced-motion hydration, navigation, keyboard skip, overflow, saved-card reload/show/cancel-delete/delete and booking redirect without following it.
- 56 axe-core public route/state audits and 18 representative hover/focus/pressed audits: zero reported violations. These do not establish exhaustive accessibility conformance; gradients produce incomplete contrast results.
- Supplemental composited-background sampling checks rendered text across Home, founder, guide and card at 390/884/1440, including header and navigation. Final result: 1,329 sampled text ranges, zero failures, minimum sampled ratio 4.53:1. The JSON supplies per-page counts and ratios. Label and header contrast issues found during sampling were corrected. Disabled and focused controls are separately captured; reduced-motion control is confirmed disabled after hydration.
- `git diff --check`: passed. No repository lint script/configured runner exists; lint was not run.

Screenshots and actual audit/test logs are in `artifacts/steel-correction`. Original production before captures remain in `artifacts/visual-pass`. Selected final normal-viewport screenshots were visually inspected, including desktop and phone Home, the emblem section, services, founder and Fold guide. Automated assertions and visual inspection are distinct evidence.

## Preserved journey and limits

Home, services anchor, founder, Visit Guide hash routes, location/visit help, consultation card, sign-in/account entry, install and booking entry remain connected. Booking remains exactly `https://fixitshop.glossgenius.com/`. Standalone JavaScript/HTML, forms, saved-state semantics, auth, database, provider access and PWA identity are unchanged. No appointment was booked and build/test results do not establish live appointment acceptance.

Chromium on Linux was used. 200% checks use CSS zoom with separate 320px reflow, not physical-device browser zoom. Physical iOS/Android installation, screen-reader acceptance, hosted auth/booking acceptance and final human aesthetic approval remain unverified. No blocking implementation issue remains. All deliverables are local or Library files; nothing is published.
