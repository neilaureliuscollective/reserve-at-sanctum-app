# Fix It Shop — Katie Guidry Founder World

Neil approved Phase 1 on October 8, 2026. Katie Guidry is presented as founder
and owner of Fix It Shop, with her own sapphire/obsidian/gold identity.

## Scope

- Founder hero with Katie’s name, ownership and clear visit invitation.
- Founder introduction and principles using the established personal-care approach;
  no invented biography, credentials, milestones, reviews or client images.
- Retained Fix It Shop crest and labeled existing concept environments. A future
  portrait requires an actual Katie reference; no likeness was generated in this phase.
- Cinematic three-chapter approach, published services, optional Chair preferences,
  location/arrival details and existing upcoming-visit continuity.
- Provider-scoped booking handoffs: Katie, destination and selected service persist
  into the existing booking flow. Server-side booking authority is unchanged.
- A small visit shortcut appears after the hero and clears the five-world dock.
  It hides while the service section is visible so it does not cover the menu.
- Katie’s founder ownership appears on Sanctum and older world entrance cards.

## Publication and failure behavior

Public services use the existing Sanctum directory projection and catalog gates.
Only an enabled bookable destination with Katie’s published services receives
“Book with Katie.” Other professionals’ services never appear on her page.
Unpublished menus show preparation; failed or slow reads show unavailable details.
No prices, times, addresses or live booking status are invented. Account-owned
upcoming visits continue through the existing VisitContext component.

No new service records, payments, auth, membership changes, database migrations,
booking activation or Square connection changes.

## Validation

`node --import tsx --test --test-concurrency=1 tests/*.test.ts`, `npm run build`, `CHROMIUM_PATH=/tmp/chromium node scripts/verify-katie-world.mjs`.
Publication tests cover closed destinations, empty/foreign professional menus,
read failures, escaped booking context and explicit public service projection.
Browser checks cover 320px, short/tall phone, Fold and desktop: founder identity,
hero invitation, dock-safe shortcut, preparation state, Chair keyboard interactions,
cinematic chapter progression, manual/system still views and route handoffs.

Validation result: 143 tests pass. The suite runs serially in this workspace to
avoid memory pressure from concurrent embedded database processes.
