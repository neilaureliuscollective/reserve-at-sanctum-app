# Fix It Shop — branded booking Phase 2

## Delivered experience

Canonical entry: https://www.reserveatsanctum.app/fix-it-shop/app

A focused blue/obsidian/gold customer app identifies Katie Guidry as founder of Fix It Shop. Home presents only Katie's published services and available locations; book, appointments, sign-in/recovery and phone setup stay in the branded shell. Existing marketing at `/fix-it-shop` is preserved and its published booking links lead into the branded app. Legacy Reserve's master website, account, manifest identity and staff workspace remain intact.

The existing BookingFlow and Visits components accept a trusted server-selected presentation identity. Query-string provider tampering cannot change the Fix It Shop menu. Appointment queries filter by the authenticated account AND provider before pagination. Existing server ownership, revisions, price capture, occupancy transactions and authorization still control booking and edits. No database migration, new booking database, external scheduler, paid service or separate application codebase is introduced.

Clients can book, download a private calendar file, see their own Katie appointments, reschedule/cancel and rebook. The same appointments appear in Legacy Reserve and Katie's authorized staff calendar. Owner/staff visitors to this customer entry see their own account's customer appointments, not privileged company records. Imported CRM-only appointments remain staff-managed until explicitly linked to a verified client identity; names/email matches never grant access.

## Authentication

The same-origin website shares Supabase cookie authentication with Legacy Reserve; it does not create a separate credential store. Branded sign-in clamps return paths to this app, preserves the pending service/date/start through sign-in and signup confirmation, and keeps callback failures inside Fix It Shop. Password recovery returns to its branded reset screen. The proxy refreshes cookies on nested routes; each private page/API still verifies the user and server-owned role.

Actual hosted email/OAuth delivery and Supabase redirect allowlists still require account/device acceptance. There is no new cross-domain cookie sharing or native authentication claim. Shared browser sign-out affects the Reserve session; installed app sessions may differ.

## PWA research and practical decision

- [MDN manifest identity](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/id) defines a stable id distinct from the master app. Fix It Shop uses `/fix-it-shop/app`; Legacy Reserve retains `/`.
- [Google's multiple-PWA guidance](https://web.dev/articles/building-multiple-pwas-on-the-same-domain) recommends separate origins for strongest independence and documents nested-scope limitations. Existing root Reserve scope cannot be removed without changing its installation. Phase 2 therefore delivers a same-origin branded entry and qualified home-screen setup, with no guarantee of two independent installed apps on every browser.
- [MDN scope](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/scope): the manifest at `/fix-it-shop/booking.webmanifest` starts at `/fix-it-shop/app`, scopes `/fix-it-shop/`, and includes scoped booking/appointment shortcuts. All customer app routes link this manifest; the master manifest is untouched.
- [WebKit Safari 17.2](https://webkit.org/blog/14787/webkit-features-in-safari-17-2/) documents initial cookie copying on installation and separate subsequent website data. Test on actual iPhone/Android; do not assume continuous browser/installed-session sharing.

Icons are size exports of Katie's existing approved blue/gold crest, without new generated artwork. 180px Apple touch icon and 192/512px manifest icons are provided; nested file-based Next.js icons override the inherited master touch icon. The install UI captures a real browser installation event across app navigation, renders a prompt button only when the event exists, and always provides manual Safari/Chrome/Samsung Internet instructions. A standalone window alone is not proof that the correct branded app was installed.

Booking remains online-only. No worker caches private data or attempts offline writes. No native App Store package, push notification transport, guaranteed browser prompt or guaranteed independent installation is claimed.

## Verification and pilot gates

`npm test`, `npm run build` and `npm run verify:fix-it-booking` cover manifest identity/master preservation, safe auth returns, account/provider filtering, Chromium manifest validation, scoped Apple icons, six home widths, five appointment widths, provider-fixed booking through sign-in, reload/persistence, shared staff calendar, rescheduling, cancellation, rebooking and another account's denial. A simulated installation event verifies UI handling only; it does not establish native installation.

Production currently has no approved services, no assigned Katie staff account and closed Eunice booking. The branded app must display preparation rather than illustrative services there. Phase 1's real account, menu/prices/durations/buffers/hours/address and hosted booking/concurrency gates still apply before 3–5 real clients are invited. Verify home-screen name/icon, reopen and sign-in, both apps installed in each order, and uninstall/session behavior on Katie's physical iPhone and Android.

## Release and rollback

Publish through the canonical repository/Vercel project after tests/build pass. Verify the exact commit and canonical live routes, manifest id/scope/icon URLs, master manifest unchanged, closed live catalog and anonymous private API denial. No production booking configuration is enabled by this release. Roll back the application deployment if needed; there is no Phase 2 schema migration. Phase 1's CRM-compatible rollback constraints continue to apply.

## One build phase remains

Phase 3 is the universal provider branding studio: reusable provider/brand settings, controlled logo/image uploads, provider onboarding, authorized customization and multiple locations. Model brand/business membership separately from master-platform roles; Katie can own Fix It Shop while retaining provider-scoped Legacy Reserve operations access. Add optional subdomains/custom domains only with verified DNS, origin-bound authentication, redirect allowlists and device installation tests. Provider branding is presentation; server-side identity and client boundaries remain authoritative. Do not build a database or independent app per provider.
