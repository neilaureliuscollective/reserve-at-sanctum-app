# Fix It Shop: warm white, blue and steel

Local visual candidate, October 20, 2026. No push, PR, merge or deployment.

## Source and isolation

Repository: neilaureliuscollective/reserve-at-sanctum-app. Clean starting checkout and verified production base: `699deb90f53a05dd41976613628a185a50625115` (public Home, PR #75). Candidate: branch `visual/fix-it-cream-steel`, worktree `/workspace/fix-it-visual`, development port 3147, its own `.next` output and lockfile-installed dependencies. A detached read-only-source baseline worktree at `/workspace/fix-it-baseline` used port 3148 and separate output for comparison captures. Original `/workspace/reserve-at-sanctum-app` remains at the same SHA and clean. No paused platform work, checkpoint 49def2c3, or PR #73 was resumed or changed.

Read AGENTS.md, README.md, architecture and Phase One instructions, installed Next CSS documentation, current layouts and source assets before editing. Source colors included warm steel-white #F5F4EF, Katie blue #102C48/#123C80, steel #5A6168/#B6C9DC, and existing approved gold imagery. No new image or likeness was generated.

## Design and scope

Warm steel-white is the page canvas; white is the dense-content/form surface; dark ink and muted steel provide text. Deep blue anchors booking actions and navigation. Selected surfaces retain dimensional blue glass, steel highlights and shadows. Opaque navigation is the fallback; blur is a progressive enhancement. Reduced-motion rules remain supported.

Home keeps the existing illustrative setting and disclosure. The old FounderFeature invocation is replaced by a composition using the exact existing approved emblem, an abstract blue/steel material, founder context and the existing `/fix-it-shop/app/founder` link. No portrait asset is deleted. The founder route, portrait rendering, biography, and Mr. Bell’s Fixit Shop story are unchanged. Its CSS module receives story-scoped light surfaces.

Styling covers `/fix-it-shop/app`, its setup/account visible states, the retained `/fix-it-shop` public story, and the standalone Visit Guide at `/fix-it-shop-app/index.html` (guide/services/card/show/shop/katie/visit). The existing film supplies illustrative gallery/process content; no new gallery, location, services, client work or testimonials are invented. No root or other tenant theme changes.

The Visit Guide's app.mjs, state.mjs, presentation.mjs and HTML are unchanged. Only concept.css changes plus a public asset cache revision from v19 to v20, so existing installations can receive updated CSS. Cache paths, private-data exclusions, install identity, manifests and state storage semantics are unchanged. Cache activation regression fixture now checks v19 retirement and v20 preservation.

## Preserved behavior

- All public booking destinations remain exactly `https://fixitshop.glossgenius.com/`; the book route retains its existing redirect, including Next streaming meta-redirect behavior.
- Home anchors, founder links, four-item mobile navigation, Visit Guide hash routes, account/history destinations and install routes remain intact.
- Local consultation card disclosure and save/reload/show/cancel-delete/delete behavior remain intact.
- No auth, scheduling, database, provider permission, commerce, contact integration, secrets or external account changes.

## Research basis

- W3C contrast guidance: normal text 4.5:1, large text 3:1; account for actual backgrounds and interactive states: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- W3C reflow guidance: narrow-width presentation without two-dimensional scrolling: https://www.w3.org/WAI/WCAG22/Understanding/reflow.html
- MDN reduced-motion guidance: respect the operating-system preference rather than require animation: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion
- Installed Next App Router CSS guidance: route-local imports and scoped selectors because loaded CSS can persist across navigation.

## Validation

- `npm ci --cache /tmp/fixit-npm-cache --ignore-scripts`: lockfile dependencies installed locally; final Next version 16.3.8. Initial shared dependency symlink was removed after default Turbopack rejected a symlink outside the worktree. Final build uses real local dependencies.
- `npm run typecheck`: pass.
- `npm run build`: pass.
- `npm test`: 216 passed, 0 failed. Includes existing booking/ownership/concurrency/provider permission tests and new visual boundaries tests. These are local synthetic tests, not actual appointment acceptance.
- `node scripts/verify-fix-it-visual.mjs`: pass at 390, 884, 1440 and 320 pixels. Checks portrait separation, exact booking URL, rendered reduced motion, mobile navigation, keyboard skip, no horizontal overflow, card persistence/show/cancel/delete, 200% CSS zoom and booking redirect without following it.
- 56 axe-core audits: 14 public pages/states at each of four widths; zero reported WCAG A/AA violations and no horizontal overflow.
- 18 representative interactive contrast audits: hover/focus/pressed states across booking, navigation, mood and form controls; zero reported violations. Final state harness blocks external booking navigation and suppresses click activation after pressed-state sampling.
- Gradients/images produce axe “incomplete” contrast results. Supplemental sampling hides glyphs temporarily, captures composited backgrounds and compares computed text colors at multiple points across unoccluded text ranges while scrolling Home, founder, guide and card at 390/884/1440. This caught the steel inscription and a guide footer heading, both corrected. Final result: 1,106 sampled text ranges, no failures, lowest sampled ratio 5.36:1. See `composited-contrast.json` for final sampled ratios and scope; sampling is not a formal exhaustive accessibility certification.
- `git diff --check`: pass. There is no repository lint script or configured lint runner; lint is not claimed.

Normal viewport before/after captures cover Home, founder, guide, card, retained shop page, install and sign-in at 390/884/1440. Additional captures show the replaced brand section, services, visit/location, saved-card display, keyboard focus, 320px and 200% CSS zoom. Artifacts and JSON/log evidence are in `artifacts/visual-pass`, delivered separately through Library because that directory is intentionally gitignored.

## Limits

Browser automation used Chromium on Linux; 200% is CSS zoom plus separate 320px reflow, not a physical-device browser zoom acceptance test. No real appointment was booked. No hosted auth, payment or external appointment acceptance is claimed. Physical iOS/Android installation, screen-reader acceptance, display-specific appearance and final human aesthetic approval remain outside this local check. Existing sticky scene choreography is preserved; no scroll hijack or mandatory intro was introduced. The candidate is local only.
