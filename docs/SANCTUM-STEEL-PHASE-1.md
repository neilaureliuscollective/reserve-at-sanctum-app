# Sanctum Steel — Phase 1

Base inspected: ef683fdcbf8c0a0f0e7e7f95f0a9eec959fee2be, clean main checkout. Production Vercel project prj_GKN7RVVFAiQfWdTpHT63e0wNydgn, team team_LJpmefIarra3F19Ad9QpGqMx served that same commit during inspection. Open connected-business branch #52 is deliberately excluded.

## Actual architecture and audit
- `app/fix-it-shop/page.tsx`, `katie-cinema.css`: cinematic founder world with labeled concept scenes, real published-service presentation, Chair preferences, still-mode control. Existing overlapping sapphire/gold rules created inconsistent material treatment.
- `app/fix-it-shop/app/page.tsx`, `layout.tsx`, `booking.css`: customer home with published headline/bio/assets, services from the server directory, signed-in next visit and Katie-only Studio entrance. Existing large circular crest and blue background lacked dimensional composition.
- `components/provider-booking-world.tsx`: shared shell across providers. Kept unchanged; new selectors require Katie's existing `fix-it-premium` class.
- `components/fix-it-customer.tsx`: bottom navigation, active page, bounded appointment fetching with loading/guest/error states. No behavioral change.
- `app/fix-it-shop/app/book`, `appointments`, `signin`, `forgot-password`, `reset-password`, `install`: existing booking/account/PWA routes. Core forms and server permissions retained.
- `app/studio/layout.tsx`, `today`, `schedule`, `clients`, `insights`, `provider-studio.css`: authenticated operating surfaces; Katie gets `fix-it-studio`, owner stays separate. Deferred to Phase 3.
- Provider profile and custom branding remain server-managed. No Supabase, auth, API, payment, schema or staff source changes.

## Research translated into design
Apple materials and foundations: hierarchy and readable controls above decorative material. Porsche design system/configurator: coherent reusable controls and clear next action. Aesop architectural spaces: local identity through proportion and material restraint. Square booking: service/time clarity and returning-customer access. WCAG 2.2: target spacing, visible focus, keyboard access. MDN gradients: CSS-only directional lighting and fine brushed texture, avoiding image/3D payload. Web Vitals: preserve self-hosted fonts and local images; no added dependency or permanent animation. This is our design interpretation, not a copied brand system.

Sources: https://developer.apple.com/design/human-interface-guidelines/materials ; https://developer.apple.com/design/human-interface-guidelines/foundations ; https://designsystem.porsche.com/v4/ ; https://newsroom.porsche.com/en/2022/products/porsche-new-car-configurator-29875.html ; https://www.aesop.com/de/en/r/store-experience/ ; https://squareup.com/help/us/en/article/5355-set-up-online-booking-with-square-appointments ; https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum ; https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Images/Using_gradients ; https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion ; https://web.dev/articles/vitals

## Implementation boundary
Reusable semantic tokens/material backgrounds in `app/fix-it-shop/sanctum-steel.css`, imported only by Katie pages. Steel crest architecture, new opening hierarchy, blue-lit navigation, pressed gold controls, stone-white published-service area and mobile spacing. The cinematic founder route gets a dedicated local navigation and the same material vocabulary. No generated imagery. Existing imagery provenance captions retained. No fictional menu or price copied from the reference.

## Following phases — not implemented
2. Booking/customer: service/date/time/confirmation hierarchy, readable forms, appointment details and recovery states; test full authenticated hosted booking.
3. Private command: Katie-scoped Today, Schedule and Clients surfaces, compact actions and state hierarchy. Preserve owner/other-provider separation and all permission checks.
4. Final polish: unified motion and material consistency, keyboard/contrast review, installed Android/iPhone acceptance, mobile-network performance, final production QA. Device testing and field Core Web Vitals are not established by desktop Chromium.

Rollback: revert this isolated visual commit. No database rollback required.
