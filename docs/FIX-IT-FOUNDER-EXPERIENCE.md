# Katie Guidry — founder experience

## Creative specification and research

One existing customer application, one legitimate booking flow. Keep the approved
blue/gold/steel identity and bundled Cormorant Garamond/Manrope typography. Frame
Katie as the owner, with a personal story rather than an institutional biography.
Use five distinct editorial environments: portrait/identity, family keepsake,
light steel statement of care, restrained service acknowledgment, warm invitation.
Use generous typography, asymmetric layouts, small metallic accents, visible
chapter navigation and optional motion; no scroll hijacking or content hidden
behind JavaScript. On mobile, photography and copy occupy separate space to keep
Katie’s face clear. No new animation dependency or booking/data authority.

Research references, consulted October 11, 2026:
- https://www.rolex.com/watchmaking/our-vision — craftsmanship communicated through patient hierarchy and a consistent purpose.
- https://www.aesop.com/our-story.html — editorial rhythm, material restraint, architecture tied to the brand's actual context.
- https://www.aesop.com/de/en/r/store-experience/ — distinct settings rather than repeated cards.
- https://www.w3.org/WAI/WCAG22/Techniques/css/C39.html — motion is optional, with reduced-motion support.
- https://books.google.com/books/about/Mr_Bell_s_Fixit_Shop.html?id=SSb1KQAACAAJ — 1981 publication and the child's damaged doll; family provenance comes exclusively from the user brief.

## Routes and assets

Homepage `/fix-it-shop/app` (also the root redirect) links to
`/fix-it-shop/app/founder`. Shared footer and historical `/fix-it-shop` introduction
link to the story. Booking uses `/fix-it-shop/app/book`, unchanged.

`lib/founder-content.ts` owns identity, biography, five chapters, SEO, booking,
portrait, alternate portraits, book photograph, military photograph and optional
approved personal quote. Null photo values deliberately produce labeled editorial
reservations using the approved emblem; no invented person or replica family book.

Install Katie’s approved portrait at `/images/founder/katie-guidry.webp` and set
`portrait` to `{src, alt, position: "50% 30%"}`. Install a genuine photo of her
preserved copy at `/images/founder/katies-family-book.webp`, then set
`bookPhotograph`. Optional alternate/military photos and quotes require Katie's
approval. No rank, deployment, years of experience, family member or personal
memory is invented. The Marine Corps copy acknowledges service without asserting
that it caused particular traits. The book story is paraphrased, not reproduced.

Metadata inherits the existing private-preview/noindex policy. Canonical URL uses
the configured application origin; ProfilePage structured data contains supported
identity facts only. No database, auth, payment, permission or domain changes.

## Verification

Run `npm run typecheck`, `npm test`, `npm run build`. Browser harness:
`FOUNDER_VERIFY_ORIGIN=http://127.0.0.1:3131 CHROMIUM_PATH=/usr/bin/chromium node scripts/verify-founder-story.mjs`.
The harness inspects 320, 390, 540, 768, 884 and 1440px; story and booking links,
keyboard chapter links, manual/reduced motion, no-JS content and metadata/schema.
Screenshots go to ignored `artifacts/founder-story`. No real appointment is created.

Local restricted executor: TypeScript passes, production compilation succeeds;
Next's TypeScript subprocess fails to parse showConfig. 32/35 test files pass;
three subprocess/network tests and Chromium/server sockets are sandbox-blocked.
These failures require independent unrestricted checks, not disabling validation.
