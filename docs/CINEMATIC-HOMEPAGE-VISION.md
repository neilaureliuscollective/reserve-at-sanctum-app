# Legacy Reserve — cinematic homepage execution brief

Research and proposed direction, October 9, 2026. This is a design brief, not an implemented or visually verified release.

## Intent

Keep the stronger Imperial Steel / Imperial Green composition. Bring chapters into place as the visitor approaches, then let them settle. Make the page feel directed through sequence, material depth and responsive interactions. Native scrolling stays immediate. No pinned scenes, scroll interception, long scrubbed narratives, mandatory film, looping spectacle or extra scroll distance.

The brand remains a personal digital ecosystem for presence, performance and wellbeing. Physical architecture informs material quality, not a replacement physical-house narrative. Preserve copy, genuine destinations, product concepts, photography/disclosures, Katie, Studio, auth and commerce.

## Research and access

Retrieved text/content from Apple AirPods Pro, Rolex and Delvaux official pages. These support studying product/editorial hierarchy, but text retrieval does not establish their rendered motion or a visual browser audit. Read 51North's Delvaux case study, which explicitly describes editorial storytelling and subtle transitions. Read Porsche motion documentation (the retrieved v4 page labels itself an earlier release). Retrieved W3C animation-from-interactions and Google's animation-performance guidance. No competitive animation timings below are claimed as measured; they are proposed Reserve settings.

- https://51north.nl/case/delvaux-digital-flagship-store
- https://www.delvaux.com/en
- https://www.apple.com/airpods-pro/
- https://www.rolex.com/
- https://designsystem.porsche.com/v4/emotion/motion/usage/
- https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
- https://web.dev/articles/animations-guide

## Storyboard

| Chapter | Arrival | Interaction / settled state |
| --- | --- | --- |
| Hero | Steel environment present immediately. Image settles from 1.025 scale; headline and supporting copy arrive as two grouped beats. | Actions immediately visible and usable. A single warm reflection travels across decorative steel, then stops. No delayed entrance gate. |
| Standard | Three principles settle into alignment, with 60ms offsets. | Quiet reading pause. No moving text after arrival. |
| Your Reserve | Cream copy moves up 16px while the green instrument panel moves inward 20px, closing a small compositional gap. | Selection visibly changes instrument geometry and lighting; result copy transitions as one unit. Controls and CTA remain stable and in the current phone viewport. |
| Collection | Section heading arrives first. Steel stage settles up 24px; product settles up 12px, giving two distinct planes. | Product photography leads. Other products arrive as one group, retaining different material environments. Pointer/focus emphasis uses a small image lift and edge response. Touch needs no hover. |
| Founder | Portrait settles from 1.025 scale within its fixed frame; editorial copy arrives 80ms later. | No continuous portrait parallax. A quiet chapter after the product reveal. |
| Vitalis | Instrument assembles through a small bounded ring turn (about 12 degrees), with copy settling alongside it. | Selection/action remains the focus. No endlessly spinning rings or pulsing health imagery. |
| Belonging / footer | Invitation and destination links settle in two beats; steel footer edge catches one short reflection. | Stable, readable closing composition. Navigation remains direct. |

## Motion language

Starting values for browser tuning: entries 450–650ms, interaction feedback 180–300ms, stagger 60–90ms, total section sequence at most 850ms. Desktop translation 12–24px; phone 8–14px. Image scale at most 1.025. Soft deceleration, no springs, overshoot, spinning products or word-by-word typography.

Trigger arrival when a chapter begins entering the viewport; finish before its reading area reaches the central viewport. Play once per page visit, not repeatedly when scrolling back. Fast scrolling must reveal immediately rather than build an animation queue. Below-fold arrivals must actually be visible as arrivals; simply fading every section is inadequate. Only one dominant event per chapter. Copy stays still once it is readable. Section height and reserved image space never animate.

Keep continuous scroll coupling to at most one small decorative material-light shift, if browser review shows it adds value. Replace the existing larger hero/portrait camera travel and 80-degree wellness ring sweep. The cinematic quality should come from composition and arrival order, not camera travel.

## Implementation boundary

Use existing scoped CSS modules and a small homepage-only IntersectionObserver controller for one-time entries. CSS transitions/keyframes handle transform and opacity. Keep native scroll; no new animation dependency or WebGL. Animate a bounded reflection overlay instead of changing a large gradient every frame. Avoid permanent will-change on every section.

Server output is readable by default. Arm entry states only after client initialization and observation; never hide content awaiting a failed script. Initial visible hero, keyboard-focused elements, direct anchor targets and fast-scroll destinations appear immediately. Existing pause control and OS reduced motion show all content in final position and disable decorative pseudo-element motion. Preference changes during animation also settle instantly. No change to route/business logic.

## Acceptance and release

Compare before/after browser recordings, not only screenshots. At 320px, 390x660, 390x844, 884px and 1440px, review a slow scroll, a fast fling, reverse scroll, anchor navigation and keyboard navigation. Capture settled full-page screenshots plus short motion recordings. Confirm sections visibly assemble, then become quiet; no clipping, flash of hidden content, overflow, layout shifts or delayed CTA access.

Inspect control/text contrast across the light trajectory; maintain 44px comfortable controls. Test selector state changes, pause persistence, reduced-motion toggled at runtime, no JavaScript, images loading slowly and neighboring customer journeys. Profile representative phone-sized rendering; no frame-time or real-device claim without measurements.

Run npm test, npm run build, npm run typecheck, verify:public and verify:digital-member with system Chromium. Repair environmental failures or report them precisely. Existing generic verify:browser homepage expectation is outdated. Verify current remote main before integration; release only homepage/supporting files. Confirm Vercel READY, production commit, live HTML/CSS, and rendered mobile/desktop experience before claiming completed delivery.

## Creative decision

Proceed with this restrained arrival choreography as the proposed next build. Motion must reveal hierarchy and material depth while preserving effortless browsing. The supplied Imperial Steel reference image is still absent from this chat; do not claim it has been studied.
