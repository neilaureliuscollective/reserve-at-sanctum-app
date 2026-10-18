# Fix It Shop customer-app direct release

Neil authorized direct production publication of the approved frontend candidate,
subject to proportionate release checks. A separate hosted preview is not a gate.
The subsequent logo hold is resolved only after the supplied transparent center
emblem passes focused phone/Fold review; no full wordmark or rectangular image
plate belongs in that in-page slot. See [exact asset provenance](FIX-IT-APPROVED-IDENTITY.md).

This continuation is based on `66a820cdbee76f77c075193c0a6f749a9ad47af9`,
preserving `2f049d7`, the reading-overlap repair and approved blue/steel/gold design.
PR73 owner/auth/native-booking changes and its CI are outside this release.

## Exact public behavior

- Ordinary `/` and `/fix-it-shop/app` entrances retain the existing full website.
  `/enter`, the installed launch and both manifest start URLs reach
  `/fix-it-shop-app/index.html#home` for customers; verified team entry remains.
- Public Katie/default booking and app Book actions lead to exactly
  `https://fixitshop.glossgenius.com/`, with no native signup/calendar fallback.
  Explicit other-provider links keep their own native intent.
- GlossGenius remains the appointment/payment authority. This work does not
  commission native calendars, owner permissions, Auth, catalog, email or payment.
- The optional consultation card stays on the customer's device. Explicit save,
  draft, reload, Show Katie, delete, blocked-storage and offline behavior remain.
  No card, private note or appointment is sent by sharing the website.
- Stable manifest IDs `/` and `/fix-it-shop/app`, root scope, start URL and
  shortcuts are unchanged by the transparent-emblem correction. All installation
  icons remain opaque. The three in-page images use the supplied text-free alpha
  emblem with bounded light/depth and reduced-motion-aware breathing.
- Public worker v18 keeps the same allowlist boundary and storage keys. The
  actual v17→v18 update retains saved card and unrelated local records; no
  clear-storage instruction is an update mechanism.

## Verification and release process

The preserved `66a820c` evidence includes 207 tests, types/build, both functional
browsers, 40 geometry/paint comparisons, reading checks and 1,068 text plus 40
control/focus contrast samples. Reuse that evidence for unchanged behavior;
never relabel old results as CI for a new head.

The narrow correction adds source-hash/alpha checks, all platform-icon invariants,
cache activation/allowlist tests, phone/Fold and enlarged-text comparisons,
normal/reduced-motion assertions, saved-data worker update and the production
customer-app browser. Run typecheck/build and applicable CI on the exact published
release commit. Review actual screenshots before release. No hosted mutation
fixture, real appointment, email or payment is part of acceptance.

Read-only preflight on October 18 found remote main
`092425f12f001a211d8ff04609ce61629ccc3900` as the candidate's ancestor with no
conflicting commits. Refresh that check immediately before publication/merge.
Existing production is project `prj_GKN7RVVFAiQfWdTpHT63e0wNydgn`, team
`team_LJpmefIarra3F19Ad9QpGqMx`, Next.js/Node 24, domain
`www.reserveatsanctum.app`; the apex redirects there. Preserve its existing
settings, credentials, database, security and domain configuration.

Rollback reference before release is production deployment
`dpl_8w9ahkLKSNyDo8ZP2riADPbvuXP1` at main `092425f`. Preserve that immutable
deployment ID and full commit alongside the new deployment receipt. No schema
rollback is needed. If unexpected risk appears, stop and report the precise
blocker; do not bypass checks or blindly roll back unrelated work.

After publication, verify Vercel's actual production deployment SHA and domain
assignment, public entrances, Katie booking redirect/links, real icon/emblem bytes,
manifest identity and public cache behavior without submitting an appointment.
Report the checked production URL only after that verification. Do not infer a
live release from a successful push or build alone.

Physical iPhone/Samsung/Fold install, OS icon refresh, native hinge behavior and
manual assistive-technology acceptance remain unverified physical checks. They
are reported honestly; the public booking handoff needs no native backend launch.
No new credentials, paid services, production SQL, grants, real messages or
settings expansion is authorized by this frontend release.
