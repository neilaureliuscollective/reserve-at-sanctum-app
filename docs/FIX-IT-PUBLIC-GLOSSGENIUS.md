# Fix It Shop public booking handoff

Local candidate based on production main `092425f12f001a211d8ff04609ce61629ccc3900`.
The native owner-launch work remains on `codex/katie-owner-launch` at
`a0899600ddf7909f18bc7fa63bff16c9b2910df0`; it is not a prerequisite for this candidate.
No GitHub write, deployment, hosted SQL, merchant setting or credential change is
part of this work. GlossGenius is Katie’s appointment and payment authority.
Native onboarding, database commissioning and native checkout are not prerequisites
for this website handoff.

## Public behavior

The exact destination is `https://fixitshop.glossgenius.com/`, without native
service IDs, dates, client details or guessed service deep links. Links open in
the same tab, identify GlossGenius in their visible or accessible labels, and
support browser Back. The public homepage, Katie’s story/experience, service
section, header/footer, mobile dock and scrolling shortcut use that destination.
The founder-story transition uses ordinary document links so Back restores the
correct visible page as well as its URL.

The website does not require a published native catalog to show a working booking
link. Current services, prices, available times, location/arrival details and
appointment management are directed to GlossGenius. No service or price is invented.

In normal public runtime, `/fix-it-shop/app/book`,
`/fix-it-shop/app/appointments`, unscoped `/book`, `/book?location=eunice` and
explicit `/book?provider=katie` links hand off automatically. Legacy service-only
links resolve their actual provider before redirecting. Unknown services and
explicit other-provider/destination links retain the existing native engine.
Katie service cards in shared directories also link directly to GlossGenius.

PWA shortcut URLs must remain in scope. Both Fix It Shop manifests therefore use
clearly labeled local `/fix-it-shop/app/book` shortcuts that immediately redirect
to GlossGenius, with no intermediate calendar or sign-in screen. Manifest IDs,
icons, installed launch behavior, private Studio and The Chair shortcuts remain.

## Preserved paths and data

Native booking APIs, appointments, ownership/concurrency rules, permissions and
payment integrations are unchanged. `/account` still exposes the existing
account-owned website records through an explicit **Website appointment history**
link. Those records are separate from GlossGenius appointments. Katie rebooking
links from existing records use GlossGenius in public runtime.

Native Katie booking screens remain reachable at their existing routes only in
the established isolated synthetic preview (`NODE_ENV` nonproduction and
`RESERVE_DEV_PREVIEW=true`). There is no URL-parameter bypass. Other provider
routes and manifests retain their own services, booking URLs and appointment
history. This candidate does not add hosted native activation or delete PR73 work.

## Local validation

Run in an isolated checkout with no hosted environment files or credentials:

```sh
npm ci
npm test
npm run typecheck
npm run build
CHROMIUM_PATH=/usr/bin/chromium node scripts/verify-public-glossgenius.mjs
```

The browser harness tests public mode without Auth/database configuration, then
uses synthetic PGlite fixture rows for another professional and the retained
native preview. It makes no appointment, payment, provider-generation or messaging
API requests. Merchant navigation GETs are intercepted locally: it verifies the
exact outbound URL, keyboard activation, same-tab and Back behavior, not hosted
GlossGenius availability or a real checkout. Five widths cover 320/390/540/884/1440.
Local evidence is written under `artifacts/public-glossgenius/`.
There is no configured lint script; TypeScript and `git diff --check` cover the
available static checks. The delivery report records exact results and commit.

## Content and release items still requiring review

- Katie’s family-book photograph, military photograph and personal quote are
  absent in the existing content model. Existing labeled placeholders stay honest.
- The atmospheric salon/process images remain explicitly illustrative; no new
  client/work photograph or service claim has been supplied.
- The website has no independently approved current address, hours, prices or
  service catalog to reproduce. Visitors use GlossGenius for these details.
- Existing global `noindex, nofollow` metadata and response headers remain.
  Search visibility, domain/deployment and physical-device installed-shortcut
  acceptance require release review; this local candidate does not publish it.
- Real merchant reachability and the actual appointment/payment journey were
  deliberately not exercised. No production readiness claim follows from mocks.
