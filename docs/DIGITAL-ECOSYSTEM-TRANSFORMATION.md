# Legacy Reserve — Digital ecosystem transformation

The product is a premium personal digital ecosystem for presence, performance
and wellbeing. Sanctum is an optional physical destination within it. A member
who never visits Eunice must have a useful reason to enter and return.

## Research and design decisions

- Apple’s spatial interface guidance uses depth, scale and position to clarify
  hierarchy. Reserve therefore uses constructed instruments, glass layers and
  deliberate light around readable controls rather than immersive room imagery.
  https://developer.apple.com/design/human-interface-guidelines/spatial-layout
  https://developer.apple.com/design/human-interface-guidelines/materials
- WHOOP connects personal context to useful next steps and daily actions. Reserve
  leads with a chosen priority and existing tools, with no fabricated scores,
  wearable readings or claims of equivalent connected capabilities.
  https://www.whoop.com/us/en/product-feature/
  https://www.whoop.com/us/en/thelocker/new-ai-guidance-from-whoop/
- Function organizes longitudinal information around review, patterns and action.
  Vitalis’s present pilot centers on the member’s actual chosen rhythm and marked
  days. Biomarkers and clinical connections remain clearly future capabilities.
  https://www.functionhealth.com/how-it-works

These references inform interaction principles, not copied visual branding.
Reserve retains obsidian, heritage green, dimensional #C4912F gold and its crest.
Katie retains blue/gold; Neil retains green/gold.

## Executed phase

1. **Digital entrance.** Anonymous entry reaches the public digital homepage
   immediately. Authenticated entry continues its existing role destination.
   The public page is always directly accessible from a signed-in account.
2. **Personal worlds.** Presence, Performance and Vitalis change the current
   viewport’s instrument, explanation, illustrative routine and genuine CTA.
   Public previews store no answers. Links open the existing real tool.
3. **Vitalis prominence.** Available free wellness pilot is separated from planned
   clinical intelligence. Public homepage and member home give it a clear place.
4. **Aethelios clarity.** A session-independent public introduction offers curated
   conversations. Private customer concierge retains its current authority.
5. **Member continuity.** Existing routine records lead the personal Reserve.
   Actual private Vitalis days and target appear when saved; unavailable reads
   show an explicit recovery action. Empty data never appears as invented progress.
6. **Membership introduction.** Digital value is explained before physical visits.
   Existing offers and access stay in the member account. No payment activation.
7. **Ecosystem connections.** Collection retains labeled product concepts;
   Sanctum, Fix It Shop and GENT Ascend are optional connected destinations.

## Screen and interaction sequence

Public: digital identity → interactive personal worlds → Vitalis → Aethelios →
Collection → optional Sanctum → account invitation.

Member: chosen direction and saved routine → three digital worlds → actual
Vitalis rhythm → concierge → verified membership → optional visit → profile.

Pathways: interactive direction preview → existing routine editor → Vitalis
connection → existing educational content → private concierge entrance.

Each selected path has an in-viewport destination on narrow and short phones.
Controls support keyboard, touch and reduced motion. Decorative SVGs have no
screen-reader content. Content remains server rendered; no WebGL requirement,
new animation package or external image dependency is introduced.

## Authority and release

No booking/auth mutation logic, access policy, provider scope, customer data,
clinical integration, payment setting or staff workflow was rewritten. No schema
migration is required. Existing roles still resolve on the server. Public previews
cannot grant a founder access to a customer's private wellness information.

Run `npm test`, `npm run typecheck`, `npm run build`, then
`CHROMIUM_PATH=/path/to/chromium node scripts/verify-public-experience.mjs`.
The browser script verifies 320px, phone, short phone, Fold and desktop layouts,
world selections and visible CTAs, real routes, Aethelios examples, collection,
keyboard operation, motion preferences, image decoding and runtime errors.
The isolated member verification additionally checks saved routine persistence,
account ownership, stale edits and the private concierge handoff.

## Validation recorded

137 automated tests passed, with typecheck and the production build. Public
browser checks passed on 320px, 390px, short 390×660, 884px Fold and 1440px
desktop, including all world destinations, still modes and keyboard selection.
`verify-digital-member.mjs` checks actual saved routine and wellness-day display,
private account isolation, founder public previews and retained Studio routing.
