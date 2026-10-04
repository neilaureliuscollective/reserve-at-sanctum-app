# Phase 2: a place to move through, a visit to return to

## Inspection and scope

Phase 1 exists in #13; its final accessibility/mobile patch is #17. Phase 2 already exists in #14 (`4c4f956`). This branch retains that visit-continuity implementation and incorporates Phase 1's patch. The experience cannot be considered live until the stacked experience branches are integrated and deployed. Main and the independent operating-system/Shopify branches remain untouched.

The gap in the recovered home was three text links over the same hallway. The selected direction replaces them with distinct Katie, Neil and Legacy Reserve doorway scenes. The interaction changes architecture imagery, foreground depth and the current action together, rather than fading a generic card. On mobile a selection brings the scene into the viewport; no hover is required. Workday entrances stay direct.

## Research informing the build

- [Four Seasons app](https://www.fourseasons.com/mobileapp/) and [itinerary feature](https://www.fourseasons.com/landing-pages/corporate/trip-planning/): hospitality presence should connect to useful visit context and ongoing preparation. Reserve uses the private visit hub already in #14, not simulated staff messaging or a hotel interface clone.
- [W3C multipart forms](https://www.w3.org/WAI/tutorials/forms/multi-page/) and [clear steps](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o1p04-clear-steps/): show where users are; keep optional life context skippable. Preserve Chair choices, consent, review, and server ownership.
- [Google animation guidance](https://web.dev/articles/animations-and-performance): limit the added doorway motion to transform and opacity. No continuous render loop, video download, GSAP or WebGL dependency.
- [W3C motion technique](https://www.w3.org/WAI/WCAG22/Techniques/css/C39): system reduced motion removes scene animation. Stored Still mode also removes it.
- Installed Next 16.3.5 navigation documentation: retain real URLs, server role checks and direct links. Doorway selection is presentation, never authorization or booking state.

## Implementation packages

1. Combine verified threshold with the existing provider/visit-continuity branch, resolving the navigation conflict in favor of the new `/my-visit` destination and retaining Still mode and compressed crest.
2. Add `ReserveRooms`: three native radio choices with matching labeled environments, direct task action and optional deeper provider exploration. Native radios provide keyboard navigation; CSS selection itself requires no JavaScript; however, Next streaming can hide the dynamic home in a no-script browser. A root-level plain destination fallback remains available outside streamed content. Browsers without `:has` display all usable scenes.
3. Use distinct existing concept imagery: Katie's private chair, Neil's Mirror desk, Legacy Reserve's ritual plinth. Visible selected scenes load optimized images lazily. No product names, availability or checkout claims are fabricated.
4. Preserve the Phase 2 owned-visit hub, honest elapsed/cancelled states, current-service rebooking, booking-confirmation links, explicitly saved grooming Blueprint and optional Chair inputs. No private notes enter the consumer shell.
5. Verify actual mobile selection and task visibility, keyboard behavior, reduced motion, no-JavaScript exploration, client ownership, booking/sign-in return, staff management and Chair consent lifecycle. Inspect screenshots and document limitations.

## Assets

No new creative assets are required to test this build. Existing images remain visibly labeled as concepts. Replace them for public launch with real Eunice photography: one private-chair composition, one consultation/desk composition and one Legacy Reserve shelf/product composition; each needs landscape source plus a deliberate portrait/mobile crop with copy-safe space. Real provider portraits and approved product packshots remain future content dependencies. No sound bed or video is required for Phase 2.

## Definition of done and release limits

All three choices change the environment and expose an action within the narrow-phone viewport. Direct booking remains available in the persistent header and home intro. Native selection works before hydration; plain destination links cover no-script streaming; Still/system reduced motion remove effects. Existing visit data stays account-owned, and all server checks remain unchanged. Build, type checks, integration tests and browser suites must pass.

This branch includes #14 and the Phase 1 completion so review can assess the experience together; its base is the recovered #14 branch. It introduces no database migration, tenant model, payment system, AI functionality, physical attendance inference, membership entitlement or production analytics. Those dependencies belong to the operating-system thread. Physical phones, hosted OAuth, production transfer budgets and live backend integration remain release verification.

## Verification evidence

- Production build and TypeScript checks pass.

- All 29 unit/integration tests pass, including account isolation, current-service eligibility, elapsed-versus-completed state and Blueprint draft validation.
- `verify-visit-continuity.mjs` passes at 320/360/884/1440px: arrival and first Mirror action fit 360×640, no horizontal overflow, each doorway changes the scene and exposes its task in the current viewport, native arrow-key selection works, and reduced motion removes added animation. Mobile and desktop screenshots were inspected; programmatic heading focus no longer draws a decorative outline.
- Full browser journey passes: booking → sign-in return → private visit hub; current service rebooking; Katie rescheduling/cancellation; foreign visit IDs unavailable without data disclosure; cross-origin writes and client access to studio rejected. Mirror review makes no write; account handoff requires explicit confirmation. No page errors.
- No-script streaming was directly inspected: Next hides the dynamic home segment when its reveal script cannot run. The root-level `noscript` destinations are independently visible and tested. This is a plain-navigation fallback, not a claim that interactive booking works without JavaScript.
- The recovered Phase 2 Chair suite now passes at 320–1440px, including keyboard selection, optional context skip, consent, private staff notes, revocation, deletion, reduced motion and enlarged text. It correctly scrolls/decode lazy images before asserting load, resolving the older Phase 1 test limitation.
- Direct Playwright Chromium was used because the agent-browser daemon could not initialize in this runtime during Phase 1. No physical-device or hosted-OAuth evidence is inferred from these tests.
