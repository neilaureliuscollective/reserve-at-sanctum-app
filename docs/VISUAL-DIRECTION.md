# Visual continuation — September 21, 2026

Latest continuation: [brand worlds, evidence, and verification](BRAND-WORLDS.md).
The screenshots in this package reflect the latest source; the sections below
describe the first visual pass that preceded the individual brand compositions.

## Source and scope

Continue the original Phase One source recovered from
`Reserve-at-Sanctum-Phase-One-Build.zip`. Automated workspace cleanup removed the
later checkout. The archive contains the original public worlds, booking,
accounts and studio, but not the later recovery/calendar/time-off commits or
Git history. This pass does not claim to restore those changes. No replacement
project or Git repository was initialized. The official GitHub repository is
now `neilaureliuscollective/reserve-at-sanctum-app`; the former repository is retained only as historical context.

Neil's revised direction prioritizes the website's visual experience. Further
booking work, accounts, deployment and the separate future grooming app are
outside this pass. Existing functional routes remain in place.

## Thesis

An architectural editorial destination: enter the sanctuary, understand the
place, discover two independent worlds, and meet the people behind it.
The image establishes atmosphere; the typography and space do the storytelling.
Gold defines a few important edges and actions. It does not cover every surface.

## Build sequence

1. Arrival and homepage: preserve the original concept architecture and headline;
   enlarge the editorial typography; move the dimensional Louisiana seal away
   from the central arch; introduce chapter links, a clear destination story,
   staggered brand portals, an atmospheric interlude, Neil/Katie introductions,
   and a quieter destination invitation.
2. Two worlds: carry Fix It Shop's navy and warmth through its full page; carry
   Aurelius's deep purple through its full page. Clarify Aurelius serves men and
   women. Add contextual links Fix It → Aurelius → Reserve. Preserve brands and
   existing concept-art labels; no invented photographs, menus or claims.
3. Interaction and responsive polish: readable body copy; larger controls;
   keyboard-friendly mobile navigation; reduced-motion support; cover-phone,
   unfolded and desktop checks. Preserve normal scrolling and server-rendered
   content without animation gates.

## Research translated into implementation

- [web.dev: high-performance animation](https://web.dev/articles/animations-guide):
  prefer transform/opacity. Keep the existing finite image drift and subtle
  image hover; remove animated brightness filters. No scroll-jacking, autoplay
  soundtrack, new animation library or loading intro.
- [web.dev: optimize LCP](https://web.dev/articles/optimize-lcp): expose the hero
  image in initial HTML, prioritize it, and defer the nonessential Three.js seal.
  Use the existing optimized WebP assets and self-hosted fonts. Performance is
  an implementation goal, not an unmeasured Lighthouse score claim.
- [W3C: animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html):
  respect reduced motion and retain the scene pause control. The paused WebGL
  scene draws once rather than continuing redundant GPU renders.
- [NN/g: recognition over recall](https://www.nngroup.com/articles/recognition-and-recall/):
  use visible chapter links and named onward destinations. The homepage's
  people and brand content are server-rendered, not hidden behind interactions.

Next Image API was checked against the installed Next 16.3.5 docs. Use eager
loading and high fetch priority for hero images instead of deprecated priority.
React review: public narrative sections stay server components; no new client
state, request waterfall or third-party library. Existing client code is limited
to navigation and the interactive hero.

## Follow-up after visual review

Tune imagery crops and editorial spacing from Neil's feedback. Replace concept
imagery only when approved real imagery exists. A future grooming app can link
from the website when it exists; no fake download control is added now.

Verification results are recorded below after the implementation checks.

## Verified delivery

- TypeScript check and final production build passed on the recovered source.
- All 10 original Node tests passed. No booking/auth/database/package changes.
- Chromium public-route checks passed at 320, 390, 768, 1024 and 1440 pixels:
  one main heading, no horizontal overflow, keyboard Escape/focus return, and
  Reserve → Fix It Shop → Aurelius → Reserve navigation.
- Original booking, sign-in return, client/staff records, rescheduling,
  cancellation, authorization and cross-origin rejection walkthrough passed.
- WebGL, scene pause, reduced motion and JavaScript-disabled homepage checked.
- Actual desktop and mobile screenshots reviewed; mobile line-break spacing
  corrected. Browser suite rerun on final source, followed by production build.
- A nonfatal Next development LCP advisory remains for reused arrival imagery;
  no uncaught browser errors. No field performance or physical-device claims.
- Original archive has no lint script/config; no lint result is claimed.
- No Git history exists in the recovered archive, so this pass is delivered as
  a saved source ZIP. No commit, GitHub update or hosted deployment was made.

The saved ZIP excludes dependencies, build output, credentials and test database
records. It includes this plan, source, lockfile and actual browser screenshots.

![Desktop Arrival](previews/visual-arrival-desktop.png)
![Phone Arrival](previews/visual-arrival-mobile.png)
![Full homepage](previews/visual-home-1440.png)
