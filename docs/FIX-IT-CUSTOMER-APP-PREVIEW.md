# Fix It Shop customer app — local preview slice

This builds on local public-handoff candidate
`125a572e6e989326593f34e558f91c3cd72a5924`. Production main and the preserved
PR73 native owner implementation are not changed or prerequisites for this slice.
The public website remains at `/fix-it-shop/app`; the compact customer app is
`/fix-it-shop-app/index.html`. This is a local review candidate, not a live release.

## Research applied

- [GlossGenius online booking](https://glossgenius.com/online-booking): use Katie’s
  existing booking site directly. The app has no appointment sync, booking
  completion inference, merchant API integration, scraping or private endpoint.
- [web.dev app design](https://web.dev/learn/pwa/app-design): give standalone
  customers visible navigation, focused screens, useful titles, safe-area spacing,
  accessible controls and a route home without relying on browser chrome.
- [web.dev offline data](https://web.dev/learn/pwa/offline-data): use bounded,
  versioned device data with honest deletion/storage-failure states. Offline
  capability is separate from booking or live data.
- [web.dev install promotion](https://web.dev/articles/promote-install): show an
  inline, dismissible home-screen invitation after saving a useful card, not an
  interstitial before booking. No outbound click is treated as a conversion.

## Completed first slice

Home puts **Book with Katie** in the opening viewport; a persistent header
booking link stays one tap away on every screen. Services directs current
menu/prices/times to the exact `https://fixitshop.glossgenius.com/` root URL. The
shop and Katie screens reuse verified founder/business information. Visit help
points customers to their actual GlossGenius confirmation link; it does not
invent a universal management link or pretend to list appointments. Existing
website history is still available separately at `/account`.

The optional consultation card has three bounded text fields: change, keep and
questions. Save explicitly stores only those fields and a schema version in
localStorage. Unsaved edits use sessionStorage for the current tab so returning
from booking does not erase them. A reset token contains no card content and
invalidates stale drafts after deletion, including other open app tabs. The
card is editable/deletable, has a clean **Show Katie** view, requires no account,
and is labeled local/not sent. Clearing browser data can remove it; it is not
backed up or synced across devices. It is separate from The Chair and never
enters its consent/sharing or server records.

Native sharing sends only the website URL/title/text. It never includes the
consultation card. Missing/failed share capability exposes a copyable link;
cancelled native sharing is quiet. Pending sharing and install actions avoid
duplicate calls.

The new app is brand-led: existing approved crest/icon, blue/gold/steel surfaces,
restrained static composition, and factual founder copy. It displays and caches
**no generated portrait of Katie**. Original assets remain in storage. Existing
public website imagery was not redesigned in this slice. No AI booking/grooming
assistant or unapproved care guide was added.

## Entry and offline boundary

Both Fix It Shop manifests preserve their IDs and open the compact app Home.
The old nested `/launch` and root `/enter` retain verified staff routing to
Studio and send customers to the compact app. Ordinary browser visits to the
public website remain directly browsable. Katie’s factual app story stays within
its person-free screen. Other professionals’ manifests and routes are intact.
Physical device manifest adoption, OS windows, browser external-link behavior and
installation still need acceptance on the actual phones; emulation is not proof.

The service worker is scoped to `/fix-it-shop-app/`. Its explicit allowlist
contains only static public app HTML/CSS/JS and the approved crest/icon. Cache
requests omit credentials. There is no runtime caching of Next server pages,
auth, APIs, account/appointment/Chair records, provider pages or external sites.
It removes only older caches with this app’s own prefix. Future asset updates
must bump the worker cache version together with the assets.

After a successful online open, the static app and saved card can reopen offline.
Booking, current details and the full website still need a connection. Offline
links explain that boundary without deleting or claiming a booking. First-time
offline access, evicted storage, browsers without worker support, or blocked
storage cannot promise offline reopening or persistence.

## Validation and remaining content

Run with no hosted environment files/credentials:

```sh
npm test
npm run typecheck
npm run build
CHROMIUM_PATH=/usr/bin/chromium node scripts/verify-customer-app.mjs --production
CHROMIUM_PATH=/usr/bin/chromium node scripts/verify-public-glossgenius.mjs
```

The app browser harness captures actual phone/Fold screenshots and exercises
keyboard/focus, Back/Forward, repeated clicks, direct booking return, saved/draft
state, safe Show Katie rendering, native-share/copy fallback, deletion, blocked
storage, offline fresh-page reopening and a strict cache allowlist. Merchant
requests and native share are mocked locally; nothing is booked or messaged.
Chromium’s network emulation resets `navigator.onLine` on a newly navigated
cached document: transport remains offline for the reopen, then the harness
re-toggles transport to test the offline event on that new target. Standalone
entry is emulated through display-mode detection, not a real OS installation.
The retained public handoff harness covers synthetic other-professional routing
and native preview isolation. The final portable report records exact results.

Katie-approved care guides remain a later content dependency. Current services,
prices, hours/address, appointment changes and payments remain in GlossGenius.
No new photos, testimonials or availability were invented. Existing public-site
noindex and deployment decisions remain outside this preview. No GitHub writes,
push, merge, deployment, account/merchant/database settings, paid providers,
spending or infrastructure provisioning are authorized or performed here.

## Material restoration after a8fa439

This bounded presentation pass restores the repository’s Cormorant Garamond and
Manrope typefaces, imperial blue, warm metallic gold, brushed steel and layered
glass edges. Sources are the existing `sanctum-steel.css`, customer `home.css`,
and local rendered reference screenshots. The app retains its compact tasks;
Fold gains a two-column Home and paired consultation fields. No app data,
booking URL, sharing logic or private/native implementation is changed.

Existing room/environment plates are documented concept art, not verified shop
photographs, so no new photographic setting is introduced. Depth uses CSS light,
material edges and the existing crest. The currently displayed logo remains
explicitly provisional relative to the separately approved replacement: the exact
new logo/icon Library files could not be materialized in the earlier bounded
attempt. Those exhausted transfers are not retried and no approximation is used.

Four existing Fontsource WOFF2 files are bundled locally with their licenses and
added to the worker’s public-only allowlist. Cache revision v10 updates the
presentation/fonts without touching consultation data. The pass uses static
layers rather than animation; reduced motion, focus/touch sizing and safe-area
clearance remain tested. The review package includes paired a8fa439 and current
phone/Fold captures, plus the patch, local commit bundle and validation logs.
Visual acceptance is for Neil’s review; passing tests alone does not approve it.
