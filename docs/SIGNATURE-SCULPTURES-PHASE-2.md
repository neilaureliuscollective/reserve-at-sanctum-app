# Living Crest System — Phase 2: Three Signature Sculptures

## Scope and decision

Builds on Phase 1 production `55a762f` and the founder-approved Living Crest roadmap. The public `/discover` selector replaces its R/P/V orbit instruments with three original section symbols. Presence is **The Standard**, a bevelled shield with dark green enamel, laurel detail and a compass. Performance is **The Engine**, an open precision balance with gold bridges, tick marks, coordinated subassemblies and green bearings. Vitalis is **The Core**, a cut emerald held by three gold supports on a compass-detailed mount.

The selected world retains its existing headline, description, steps and exact routine destination. These are decorative brand objects, not measurements, medical simulations or new corporate logos. The official LR hero remains unchanged. The standalone public Vitalis visual uses the matching still Core to avoid a second animated sculpture. Member selectors retain their existing instruments. No private tools, booking, auth, payments, database, environment or app-icon changes.

## Research and architecture

The saved Phase 1 plan explicitly called for a shield, precision mechanism and emerald core in Phase 2, with limited motion, selected-object rendering and preserved selection/CTA behavior. Inspected README, ARCHITECTURE, AGENTS, public/member callers, motion controls and the installed Next.js lazy-loading guide before implementation.

Three.js [MeshStandardMaterial documentation](https://threejs.org/docs/pages/MeshStandardMaterial.html) specifies metallic/roughness shading and recommends an environment map. Accordingly the models share a prefiltered studio environment, polished gold, satin gold and dark enamel; the emerald uses flat-shaded crown/girdle/pavilion cuts. No bloom, transmission, shadow maps, texture downloads, new library or generative imagery. Section geometry is authored in TypeScript and can be reproduced without a proprietary model generator.

The interaction implementation follows the [WCAG pause requirement](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html): a reachable 44px button shares `reserve-motion-v1` and the account/hero controls; system reduced motion wins. Nonessential artwork is hidden from assistive technology, with its section name/caption in ordinary text. No touch dragging, pointer capture or orientation permissions. Passive mouse tilt returns gently to rest; touch scroll uses `pan-y`.

`signature-sculpture.tsx` delivers a server-rendered poster, then dynamically imports the renderer only for a selected visible sculpture when motion is enabled. Each world switch disposes its outgoing scene. Offscreen, hidden or still scenes release the canvas/context and return to the poster; re-entry recreates it. A failed renderer/import or lost context preserves the matching image and all links. React effect cleanup guards deferred import completion and removes observers/listeners. Frame updates stay outside React state.

The hero retains Phase 1's paused offscreen context, while the signature wrapper releases its offscreen context. Only the selected sculpture renders; the standalone Core has no WebGL context. At viewport boundaries the independent hero and selector may briefly both be visible; there is no shared global canvas and no canvas behind private forms.

## Performance and artwork

Each world is below 10,000 triangles and 16 draw calls (observed initial model counts: Standard 3,624/6; Engine 7,168/14; Core approximately 4,000/9). Repeated leaves and ticks are instanced. Render rate is capped at 24 FPS on coarse pointers and 30 on fine pointers; pixel ratio caps are 1 and 1.5. Sustained slow frames lower resolution to .8, then fall back to the poster. Rendering does not capture phone orientation.

Transparent 720px WebP posters are captured directly from the live model canvas before composition, so they contain no webpage text, panel background or substitute artwork. Sizes: Standard 47,468 bytes, Engine 134,310 bytes, Core 63,100 bytes; approximately 239 KiB combined. Existing Three.js code is reused in a lazy chunk; no model decoder or model network requests.

Regenerate after model changes by building, then running `CHROMIUM_PATH=<chromium> node scripts/verify-signature-sculptures.mjs --posters`. The command writes transparent PNGs under ignored `artifacts/sculptures`. Resize those PNGs to 720×720 with Pillow Lanczos and encode WebP at quality 92/method 6 to the checked-in paths. Poster generation uses the same model/material/lighting code as production. Inspect regenerated silhouettes before replacing assets.

## Verification and release

Required checks: `npm run typecheck`, `npm test`, `npm run build`, `npm run verify:public`, `node scripts/verify-signature-sculptures.mjs`, and Phase 1 `npm run verify:living-crest`. Browser suites accept `CHROMIUM_PATH`.

Signature coverage: all three selections and unchanged CTA URLs at 320, 390, 430, 700, 768, 884, 1024, 1440 and 1920px; transparent decodable posters; rendering budgets; one selected canvas; rapid switching; shared and persisted pause; offscreen disposal/re-entry; system reduced motion; context loss; unavailable WebGL; no JavaScript; coarse-pointer resolution and touch-scroll policy. Public regressions cover selected CTA visibility, keyboard, collection, navigation/destination handoffs and existing motion controls. Browser screenshots are actual application views.

Physical Samsung/iPhone long-session battery, heat and Safari rendering cannot be certified by software-rendered browser tests. No field LCP/INP claim is made. Release through the existing main/Vercel pipeline, confirm the exact merged production SHA and public assets, then check the three live selection states. Rollback: revert the Phase 2 PR; no schema or data rollback is required.

Phase 3 remains unimplemented: broader lighting/navigation integration and optional orientation need a separate founder request.
