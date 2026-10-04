# Reserve experience Phase 2 — Provider worlds and visit continuity

## Rebaseline and ownership
Base: Phase 1 PR #13, commit a5126124d22c5f7e75130bd8e095fc6088787a3a. Main remains e2cf00e7; Katie/Neil draft worlds are retained. Parallel operating-system branch codex/reserve-phase-one (80da42d) is unmerged and changes tenancy, catalog, roles, workflows, and drafts. Do not copy its migrations or merge it incidentally. This phase uses a narrow read adapter against the reviewed base; it must be adapted to that branch's organization/location/customer scope during integration.

## Research and chosen direction
- W3C multi-page forms: logical stages, explicit optional skips, dynamic progress, headings and review; https://www.w3.org/WAI/tutorials/forms/multi-page/.
- Four Seasons app: practical itinerary and personalized visit continuity as a hospitality reference; https://www.fourseasons.com/mobileapp/. No conversion or animation-performance claim.
- Installed Next 16.3.5 layout, searchParams, notFound, cookies and serverExternalPackages docs. Server identity is authoritative; ordinary routes preserve direct links and history.
- React review: bounded serializable read model, no sensitive global client store, native radios/checkboxes, cancellation on async loads, no media around forms.

## Build packages
1. Account-owned visit read model: next, latest elapsed, optional explicit visit, current service rebook eligibility and saved Blueprint. No notes, Chair answers, or AI reads.
2. /my-visit: before/during/elapsed/cancelled states, appointment details, preparation, current grooming direction and currently offered service link. Elapsed time never means completed attendance; no fabricated aftercare or suggested return interval.
3. Contextual provider entrance: Katie gets next Katie visit or immediate Chair/booking actions. Neil gets immediate Mirror/saved-direction entry. Existing full worlds become optional exploration, not a prerequisite for useful action.
4. Chair and Mirror: art-directed still environments, compact task shell, uninterrupted DOM forms and explicit optional stages. Preserve consent, revocation, expiry and delete semantics. Mirror wording must accurately describe stated priorities; no claim of camera analysis or professional advice.
5. Home, booking success, client visits and profile link to visit continuity. Quiet staff schedule defaults to today (Central), current scoped visit API remains authoritative.
6. Verify 360x640, 320px, Fold-width, desktop, no-JS arrival, reduced motion, pause, keyboard, book/auth return, Chair skip/consent/delete and owned/foreign visit routes. Record screenshots and exact limits. Hosted transfer budgets and device performance remain launch gates. Draft PR only.

## Gates
Professional aftercare remains unavailable until an approved provider plan and backend read contract exist. Existing saved Blueprint is explicitly a preliminary direction from stated choices, not provider-approved aftercare. No checkout, membership, extra service availability, real portraits, AI, new permission or migration in this phase. Concept assets remain labeled. Entry telemetry remains coordinated with the operating thread, not a second database scheme. Real device and hosted OAuth cannot be inferred from local Chromium checks.

## Rollback
Revert this phase's commit while retaining PR #13. No database changes to roll back.

## Verification evidence
- Production build and TypeScript checks pass. Katie’s personalized entrance is explicitly dynamic even when a build runs without auth configuration.
- 29 unit/integration tests pass, including account isolation, current provider/service eligibility, elapsed versus completed state, and draft validation.
- Local Chromium browser suite passes at 320, 360, 884 and 1440px: no horizontal overflow, one primary heading, first Mirror action and arrival actions visible at 360×640, keyboard menu dismissal, returning entrance, reduced-motion navigation and no-JavaScript entrance.
- Full UI booking → guest sign-in return → confirmation → owned visit hub; Katie schedule → reschedule/cancel; unauthorized client studio and cross-origin writes rejected. Foreign visit IDs render an unavailable view without appointment data (Next streaming can return HTTP 200 before the not-found boundary).
- Mirror review makes no write; anonymous handoff requires confirmation after sign-in. Existing profile stays unchanged until confirmation; blocked session storage has a recoverable error. Saving no longer invents a completed scan.
- Screenshots inspected: mobile provider action, Chair choices, Mirror entrance and owned visit hub. Browser evidence is reproducible with scripts/verify-visit-continuity.mjs; artifacts are local synthetic-account evidence, not production client screenshots.
- Chair browser suite also passes at 320–1440px: consent, account/staff views, revocation, expiry, deletion, keyboard navigation and reduced motion. The image check scrolls/decode lazy images before asserting load.
- The agent-browser CLI could not start its daemon in this runtime. Direct Playwright Chromium was used successfully. No physical-device, hosted OAuth, provider-approved aftercare, production transfer or telemetry claim is made.
