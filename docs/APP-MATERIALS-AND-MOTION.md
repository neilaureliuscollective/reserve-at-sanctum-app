# Legacy Reserve materials and public choreography — October 9, 2026

## Research and design decisions

The current flagship establishes architectural ivory (#F5F1E8), Imperial Green
(#12382D), brushed steel (#4A5450 / #26312C / #88958D), carbon (#121417),
obsidian (#080D0B), and dimensional gold (#C4912F / #E4BD70).
Previously those materials lived in a homepage CSS module while app screens
mixed shared green tokens with old literal colors.

The migration follows semantic surface / foreground roles rather than replacing
all colors with a single hue. [Material color roles](https://m3.material.io/styles/color/the-color-system)
inform this separation. [web.dev animation guidance](https://web.dev/articles/animations-guide)
supports transform / opacity choreography rather than animating layout or paint-heavy blur.
[WCAG](https://www.w3.org/TR/WCAG21/) informs contrast and the reduced-motion / pause paths.
These are implementation references; the brand's material direction comes from
the existing homepage and the user's instruction, not a replacement component library.

## Implemented plan

1. Put raw homepage materials in `app/legacy-material-tokens.css`; map the existing
   Reserve and Imperial semantic variables to those materials.
2. Give member introductions ivory reading panels, shared navigation steel/carbon,
   cards brushed steel shadow, and primary Reserve actions green with ivory text.
   Gold identifies accents and selected controls. Booking/auth inputs stay high
   contrast; success, warning, and error states retain their semantic colors.
3. Extend this language to commerce, wellness, digital public previews, founder
   editorial chapters, and owner Studio. Katie keeps sapphire steel; technology
   keeps imperial teal. Shared ivory/brass/grain connects those worlds without
   replacing their identity or changing provider-owned configuration.
4. Restore section arrivals through a route-aware public scroll director, with
   separate copy, perspective panel, image, and camera motion. Exclude member
   task forms and Katie's existing sticky film from public entrance choreography.
5. Check narrow layouts, contrast, controller regressions, and compilation.

## Motion reliability

The old homepage's director and styling no longer served the replacement homepage.
The replacement's arrivals were limited to 12–20px motion and short image settling.
Founder pages had hero depth but lacked section entrances. Shared initialization
now waits for a real visible layout, so a hidden Suspense container cannot classify
all zero-sized targets as already settled. Route changes reset observers and markers.
Pausing settles content; resuming rearms upcoming chapters. Focus and fragment jumps
settle their destinations. Completed animations release their transforms for normal
interaction. Native scrolling remains authoritative; visible photography updates
through a passive scroll listener and a single requestAnimationFrame.

## Verification

- `npm run typecheck`: passed.
- `node --import tsx --test --test-isolation=none tests/arrival-motion.test.ts`:
  four tests passed (viewport arrivals / cleanup, hidden streaming mount,
  pause / resume / reduced motion, keyboard focus / fragments).
- Production build: passed with the installed Next.js documented temporary
  `experimental.useTypeScriptCli: false` verification setting. The sandbox returned
  empty output from the spawned CLI checker; direct typecheck worked. Original
  `next.config.ts` restored; no type-check bypass shipped.
- Measured raw palette contrast: ivory/green 11.43:1, muted/ivory 6.56:1,
  brass label/ivory 5.43:1, muted/steel shadow 8.95:1, ivory/raised green 7.73:1,
  champagne/carbon 10.38:1, control edge/carbon 5.91:1.
  These checks validate declared color pairs, not every composited screen.
- `git diff --check`: passed.
- Browser verification is **pending**, not claimed complete. Local server binding
  failed with EPERM; Chromium failed on restricted socket operations. No new live
  mobile/desktop screenshots were captured in this sandbox.

`scripts/verify-public-experience.mjs` now checks actual completed arrivals,
320/390/1440px public motion across the flagship, both founder worlds, Katie, and
membership, plus member opening and dock palette values. Existing broader route,
keyboard, no-JavaScript, forced-colors, and responsive checks remain in place.
Run `CHROMIUM_PATH=/usr/bin/chromium npm run verify:public` after a production build
in an environment that permits the local browser/server.

This change does not alter booking, authentication, database, billing, provider
permissions, or appointment ownership. The user approved production deployment. Release preparation merges these changes
onto the latest main commit, preserving the already-live Imperial Core hero film.
The merged source also passed typecheck, controller tests, and the production build.
