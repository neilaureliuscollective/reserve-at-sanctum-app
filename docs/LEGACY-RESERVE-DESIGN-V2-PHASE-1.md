# Legacy Reserve Design 2.0 — recovered Phase 1

## Recovery evidence — October 9, 2026

Canonical repository: `neilaureliuscollective/reserve-at-sanctum-app`.
Base commit: `de19afb70d95baa2b258d69cd7e93f412baef37e`.
Recovered source: `Legacy-Reserve-Design-2.0-Phase-1-Plan.md`, created October 9 at 06:05 UTC. That document explicitly records planning only, no implementation, merge, deployment or database mutation. Its audited base was `ef683fdc`. No Design 2.0 implementation branch or PR was found among the current remote branches, open PRs and recent history. Earlier master-platform work remains preserved in main.

PR #56, `de19afb`, merged October 9 at 06:08 UTC, independently implemented Sanctum Steel. Its five changed files are exclusively the Katie customer page, customer-app layout/home, locally imported stylesheet and its documentation. Vercel production `dpl_7KPXwVfvFhwLPqSTxG5kMt5Q121a` was READY at that SHA. This predates the mistaken recovery conversation at approximately 06:28 UTC. No evidence was found of subsequent changes caused by that recovery instruction. No revert is justified; this release preserves #56 unchanged. Open connected-business PR #52 remains separate.

The exact source of the previous “Too many requests” interruption could not be established from the available repository and deployment records. Successful builds do not identify the source of that error.

## Authorized scope completed

Phase 1 follows the recovered execution plan: scoped foundation, public chrome and `/discover` flagship. The founder's current recovery instruction authorizes completing the approved phase; no subsequent design phase is started.

- Mineral cream/ivory, Imperial Green, Reserve Gold #C4912F, dark readable gold labels, selective Imperial Blue atmosphere. Raw palette tokens are reusable; semantic themes require explicit opt-in. Root color-scheme is unchanged.
- Editorial hero, standards, earlier Virelis feature, concept collection, founder chapter, useful personal directions, free Vitalis pilot, membership/physical experiences and functional footer.
- New public header/menu replaces the member dock only on `/discover`. Returning-member, owner and staff entry still use existing server routing. Native nonmodal menu supports keyboard/Escape/focus return and works without JavaScript.
- Existing installed fonts and reviewed existing images; no new generation, purchases, invented products, prices, inventory or credentials. Former Vitalis packaging remains labeled; stable `/shop/vitalis` concept ID is preserved.
- Small direction island retains useful Presence/Performance/Vitalis handoffs. Existing motion preference persists, system reduced motion is honored, and no hidden animated reveal gates access to content.
- Public links disable automatic background prefetch. Navigation supports opaque/contrast/transparency preferences and forced colors. Buttons retain visible focus and immediate pressed feedback.
- A scoped no-JavaScript stylesheet exposes only completed flagship content from the shared streamed loading boundary, hides the duplicate loading entrance and inert direction controls, and supplies direct direction links. No dependency on generated stream IDs; other route loading behavior is unchanged.

No auth, API, database, staff, payment, booking or commerce-authority modules changed. Katie, provider and Studio styles remain independent. Existing unused homepage artwork/components are retained for other routes and rollback.

## Validation

- All 172 automated tests pass (serial execution for predictable workspace load).
- TypeScript and optimized Next.js production build pass.
- Public browser composition, menu/Escape/focus, three selected direction handoffs and visible mobile CTAs pass at 320x780, 360x800, 390x844, 390x660, 430x932, 600x900, 768x1024, 884x900, 1024x768 and 1440x1000. Phone and desktop screenshots manually inspected.
- Authenticated digital-member regression passes: saved routine, actual wellness check-in/history, account isolation, member layouts, founder public previews, unchanged Studio role entry and real service/concierge handoffs.
- Isolated synthetic Collection commerce regression passes: Shopify handoff, guest/client/staff/owner boundaries, price/origin tampering, private/idempotent attempts, unavailable state, five widths and zero runtime errors. No external Shopify calls or charges.
- Final public checks pass: eight route regressions, persisted/system still mode, keyboard, no-JavaScript navigation, forced colors and 200% root text; zero runtime errors. Release identifiers are recorded in the PR and founder report.
- Hosted preview of commit `90d3dd8` is READY and visually verified. Duplicate GitHub verification jobs initially yielded one pass and one native Node 24.21.0/V8 WASM teardown assertion (`jit_page_->allocations_.erase(addr) == 1`) in an unchanged PGlite test suite. CI is aligned to the locally verified Node 24.19.0 and serial suite command, retaining all test assertions and internal simultaneous-booking checks.

Browser scripts never mutate live customer records. Development suites use isolated synthetic storage. Earlier harness issues involved background-network waits, asynchronous media updates and transient duplicate streamed headings; checks now wait for the actual UI state with bounded timeouts. A genuine no-JavaScript visibility defect was found and fixed rather than disabling the check.

## Remaining phases — require new approval

Phase 2: collection/product/account/auth and membership presentation. Phase 3: personal/member platform, booking/visits, concierge and final mobile cohesion. No Phase 2/3 UI is represented as completed by this release.

Physical iPhone/Samsung standalone checks and field Core Web Vitals are not measured here. The current imagery remains explicitly illustrative or packaging concepts; a finalized Virelis label is an asset follow-up.

Rollback: revert this isolated Phase 1 commit. No data rollback is necessary.
