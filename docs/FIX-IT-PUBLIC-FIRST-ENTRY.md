# Public Home first; Visit guide by choice

Local correction based on deployed `ec897ef440a61a3b2b5f72480f216043e61ed8e7`.
This new behavior is not covered by PR74's exact-head production approval.
No publication, merge or deployment is part of this correction task.

## Observed production behavior

The actual October 18 browser audit covers 24 combinations of first/returning
visitors and browser/emulated standalone entry. `/` and `/fix-it-shop/app` open
the established cinematic public Home. `/enter`, `/fix-it-shop/app/launch`, and
the supplied `/fix-it-shop-app/index.html#home` link open the tools Home instead.
A saved local card does not change that destination. `#card` retains the task.
The cinematic primary booking action is already visible at phone/Fold sizes.

Both manifests already have scope `/`, IDs `/` and `/fix-it-shop/app`, and start
URL `/fix-it-shop-app/index.html#home`. The offline worker's separate scope is
only `/fix-it-shop-app/`. These are distinct boundaries; neither is widened.

## Chosen flow

| Intent | Result |
| --- | --- |
| Public browser entry, customer `/enter` or `/launch` | Existing cinematic public Home |
| New or old installed default URL, online public Home reachable | Compatibility bridge opens that same public Home |
| Home navigation | Public Home, regardless of saved-card presence |
| Services | Public Home's existing services section |
| Visit guide | Deliberately open the approved blue tool surface at `#guide` |
| Prepare a card / existing `#card`, `#show`, `#visit` or other meaningful link | Open that task directly; refresh and history retain it |
| Existing open/resumed task | No automatic Home reset on pageshow or reconnection |
| Offline or public Home unavailable | Keep cached Visit guide and local-card access |
| Book now | Direct exact GlossGenius URL; no intermediate account or install step |
| Verified team `/enter` or `/launch` | Existing server-verified Studio routing remains |

Home, Services and Visit guide form the primary navigation, alongside the
dominant direct Book now action. Generic preparation/help is called Visit guide;
no personal appointment dashboard or appointment synchronization is claimed.
The existing cinematic implementation is reused rather than copied, embedded
or ported into a second marketing Home. Existing tools and all approved imagery,
emblem, opaque install icons, palette and material files remain.

The old default URL is handled before the tool Home is revealed. Its small
same-origin HEAD probe uses no credentials, no stored card and a 1.5-second
deadline. It handles connected Wi-Fi without actual Internet access; a failed
probe keeps the cached guide. A late result rechecks the current route before
navigating, so it cannot take someone away from a newly opened card task.
There is no onboarding flag, returning-user heuristic or new account system.

The manifest IDs, start URL, scope, icon payloads and shortcuts are unchanged.
Worker v19 adds the public entry script to the same narrow public-file cache;
it does not cache the dynamic website, Auth, private records or APIs. Activation
does not navigate clients or clear browser storage. A currently open v18 document
keeps its task; after the normal online update/reload, its old default launch
URL gains the new bridge. Existing installs may retain old resources until that
update occurs. Never clear storage to force an update.

## Evidence and implementation limits

The new isolated browser suite covers 48 first/returning, browser/standalone,
phone/Fold default-route cases, actual Home→Services→Visit guide→card actions,
Back/Forward, refresh, old deep links, saved/unsaved/unrelated data, session resume,
media failure, reduced motion, 44px keyboard booking and focus visibility, and the
existing no-JavaScript direct-booking fallback. The configured isolated CI browser
job includes this suite for a future published candidate; no CI run is claimed
for the unpublished local branch.

The real local v18→v19 worker transition tests an uninterrupted open card,
unsaved draft and saved card, plus fresh offline opening of the old default URL.
No fixture is run against production or a shared hosted preview. Booking
navigation uses a mock merchant transport; no real appointment, payment or email
is submitted. Browser standalone/session emulation does not establish physical
iPhone/Samsung/Fold installation or OS resume behavior.

The React review keeps server-rendered readable content and links, existing
parallel public profile reads, semantic anchors and no additional client account
fetches. The entry probe is bounded/deduplicated and conditional on a default
route. Media and installation never gate booking. Existing pause/still and
reduced-motion support are preserved.

Research supports a public, low-friction booking entrance: [GlossGenius online
booking](https://glossgenius.com/online-booking) supports booking without a client
login/download. [Manifest start URL](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/start_url),
[scope](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/scope)
and [identity](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/id)
inform the compatibility approach. [Installation promotion](https://web.dev/articles/promote-install)
remains optional; [onboarding guidance](https://developer.apple.com/design/human-interface-guidelines/onboarding)
does not justify a new account wall. Existing motion controls support
[pause/stop/hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide).

## Explicit next release scope

Only customer entry routing, public/tool navigation and labels, the bounded old
entry bridge, narrow public-cache version, and related regression tests change.
No Auth/role/permission, appointment engine, provider boundaries, database,
catalog, payment, credentials, domain or production setting changes occur.

A future release needs review of the new exact candidate and separate approval
to publish/merge/deploy. Preserve production baseline/rollback deployment
`dpl_5CFVDZH2oWBRDmNMeoTV7dH7g7Ty` at `ec897ef`; older rollback `092425f`
also remains in history. Verify the new production SHA and customer entry paths
only after a separately approved release; this local report is not a live result.
