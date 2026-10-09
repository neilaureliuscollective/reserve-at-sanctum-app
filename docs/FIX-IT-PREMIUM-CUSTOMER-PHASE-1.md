# Fix It Shop — premium customer experience, Phase 1

Founder authorized research, planning and execution October 8, 2026. Phase 2 (Katie’s working studio) and Phase 3 (retention/verified reporting) remain separate.

## Research and plan

Inspect existing booking identity, auth, service publication, shared appointment APIs and independent provider themes before changing customer presentation. Keep existing server-authoritative booking and ownership. Deliver Katie-specific sapphire/obsidian/gold surfaces across home, booking, appointments, authentication and installation; active icon navigation; next-visit account context; consistent loading/error states. No invented portraits, prices, services or operating configuration.

References checked October 9 UTC:
- https://web.dev/articles/accessible-tap-targets — 48px touch controls and spacing.
- https://web.dev/articles/sign-in-form-best-practices — legible mobile forms.
- https://www.fresha.com/help-center/knowledge-base/online-presence/102398-learn-how-clients-book-appointments-online — account-owned booking, rescheduling and repeat visits.
- Installed Next 16.3.5 Link documentation and Vercel React checklist.

## Implementation

Katie’s existing crest/profile remains authoritative. Dedicated class scopes the new treatment away from generic provider apps and private Studio. Home adds her Listen first / Work with care / Leave ready principles, dimensional service surfaces and next-visit panel. Returning context uses the existing authenticated provider-filtered appointments API with no-store, a 10s timeout, cancellation and stale-response suppression. Incomplete paginated lists never claim to identify the nearest appointment. Guest/empty/unavailable states link to the existing account-owned My visits flow. Exact provider and account permissions remain in the existing API.

Gold button feedback, sapphire booking/confirmation/account panels, selected service/time treatments, active icon navigation, visit introduction and install guidance stay consistent across widths. Reduced-motion rules remain inherited. Error recovery warns customers to check saved visits before booking again. No new paid integration, database migration, payment, outbound messaging or service activation.

## Verification

See release checks recorded below. Extend the existing isolated browser scenario to verify an actual booked visit appears on customer home and links back to appointment management. Existing booking, provider tampering, shared staff calendar, rescheduling, cancellation, rebooking, other-account denial, manifests/icons, callback and install checks remain required. Physical Samsung/iPhone installation and hosted sign-in remain acceptance checks. Synthetic fixtures must never run against production credentials.

## Rollback

Revert this release; additive presentation only, with no schema or appointment mutations introduced. Katie’s published branding and booking records remain compatible.

Release checks: 162/162 automated tests passed. TypeScript passed. Isolated full Fix It Shop browser regression passed at six home widths and five visit widths, including new next-visit handoff. Screenshots reviewed at narrow mobile; guests receive the founder/booking entrance directly, while known signed-in accounts receive the optional next-visit panel. The public identity read uses the existing bounded read-only helper and does not authorize records or create accounts. Final production build and hosted release checks follow.

Final updated-tree TypeScript, production build and full Fix It Shop browser regression passed. No schema changes or operating activation were required.
