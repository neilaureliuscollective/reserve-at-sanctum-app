# The Living Crest — Phase 1

The public `/discover` hero replaces its abstract letter/orbit instrument with the founder-supplied official crest. Existing copy, calls to action, five-world navigation, editorial typography, and bottom dock remain. The Presence/Performance/Vitalis selector and the later Vitalis instrument are unchanged; these belong to Phase 2.

## Asset and renderer

`scripts/assets/living-crest-source.png` is the exact supplied official artwork. `scripts/prepare-living-crest.py` crops its main seal with transparent padding and creates the poster, color, shallow relief-height, and metalness/roughness assets. Regeneration requires Python with Pillow, NumPy, and SciPy; generated assets are checked in, so deployment requires none of these libraries. No generative reconstruction or substituted lettering is used.

The relief is a source-derived 160-segment mesh with a shallow gold rim, using the existing Three.js dependency. It preserves the source's LR, leaves, compass details and lettering. This is shallow relief with source-baked detail, not a fully modeled sculpture with invented reverse-side geometry. Restrained rotation keeps that limitation outside the viewing range. A prefiltered studio environment and two soft lights illuminate the gold; no particles, bloom, real-time shadow maps, or device-orientation permissions are introduced.

## Behavior and budgets

The server renders a transparent 1024px WebP poster immediately. The Three.js scene is dynamically imported only when visible, the page is foregrounded, and neither the system nor the existing environment preference requests stillness. Approximately 0.78 MB of artwork includes the initial poster; no new runtime dependency is added.

Desktop movement is limited to a small slow yaw, pitch, vertical float and moving gold highlight. A mouse supplies restrained, eased tilt. Touch never captures drag or interrupts page scrolling. Rendering is capped at 30 FPS on fine pointers and 24 FPS on coarse pointers; pixel ratio is capped at 1.5 and 1 respectively. Sustained slow frames reduce resolution, then return to the poster. Offscreen/hidden/manual-pause rendering stops. Route unmount disposes geometry, textures, environment, renderer, observers and listeners. A failed load or lost WebGL context returns to the poster.

The hero control shares the existing `reserve-motion-v1` preference and stays synchronized with the account control. System reduced motion always wins. Decorative artwork is hidden from assistive technology; the control is keyboard accessible, at least 44px high, and absent without JavaScript.

Desktop places the crest above and to the right of the copy, clear of the console. Tablet/Fold widths use a two-column layout with the console in normal flow. Narrow phones stack copy, crest and console. The dock and destinations retain their existing behavior.

## Verification and release

Run `npm run typecheck`, `npm test`, `npm run build`, `npm run verify:public`, and `node scripts/verify-living-crest.mjs`. Browser scripts accept `CHROMIUM_PATH`; the public regression script accepts `VERIFY_PUBLIC_PORT` if its default port is occupied.

The crest browser checks cover 320, 390, 430, 700, 768, 884, 1024, 1151, 1280, 1440 and 1920 CSS pixels, pause/resume, shared preference, offscreen lifecycle, system reduced motion, unavailable WebGL, context loss, saved still preferences, texture failure, background pause/resume, coarse-pointer resolution limits, touch scrolling and no-JavaScript artwork. Public regression checks retain selector controls, destination links, collection interaction, route handoffs and keyboard behavior. Screenshots in `docs/verification` show the actual application, not concept art.

Emulated viewport and software-renderer checks are not physical Samsung/iPhone thermal measurements. On-device long-session heat, battery and fold-state testing remains a release follow-up. No booking/auth/database/infrastructure changes are included. Rollback is a revert of the Phase 1 commit/PR, restoring the prior hero instrument.
