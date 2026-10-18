# Fix It Shop customer app — current release review

This report travels with the exact approved-identity continuation of
`2f049d79628a61731d668dc49cb310076b47157a`. The companion `commit.txt`,
`validation.json` and source hashes bind all final evidence to its precise local
commit. It preserves `da71f20` and `2e1f3ba`; no PR73 owner-auth implementation or
old CI is evidence for this customer-app candidate.

**Status: the missing-logo blocker is resolved and the local public customer flow
is reviewable. Hosted preview isolation and physical installation/update acceptance
remain open.** No production release is implied.

## Verified identity and preservation

The exact full logo and app icon come from asset commit
`a4cab5fcde22052cab12142c3c53d41b95b99aa9`. Both supplied SHA-256 hashes pass;
originals stay opaque RGB 1254-square. Complete uniform resized exports replace
all three missing-logo notices, plus root/Katie app, maskable, Apple and favicon
assets. No crop, redraw, invented transparency or exhausted download route is
used. Native-size and simulated-mask captures are supplied. See
[identity provenance and processing](FIX-IT-APPROVED-IDENTITY.md).

The approved blue, steel, gold, all button/type dimensions and the repaired
booking/Share placement remain unchanged. Forty viewport/state comparisons
against `2f049d7` show matching geometry/materials and zero changed pixels outside
the replaced identity paint areas (including the old placeholder's existing
paint overflow at enlarged text). The one original form and five destinations
remain. Inner-page aesthetic polish is deferred.

## Customer-flow evidence

| Boundary | Observed result / limit |
| --- | --- |
| Public booking | Compact-app Book actions are exactly `https://fixitshop.glossgenius.com/`. Existing public website links and Katie/default legacy redirects use that same destination, without signup or closed native-calendar fallback. Other-provider intent remains separate. The merchant is intercepted locally; no real booking/payment is made. |
| Navigation and return | Home, Services, My card, The shop and Katie retain hashes and selected state. Shop/prepare paths, browser Back/Forward and direct booking return preserve the local card/draft. Phone/Fold widths, short-height touch and keyboard are tested synthetically. |
| Card/privacy | Explicit save, reload, tab edit/draft, text-only Show Katie, delete/cancel/confirm, cross-tab invalidation, unavailable storage and offline reopening remain. No automatic Katie delivery, account sync or booking inference exists. Share contains only the website URL. Anyone using that browser profile can read the card; it is not a backup service. |
| Entry routes | Installed launches, `/enter` and both manifest start URLs reach `/fix-it-shop-app/index.html#home`. Ordinary `/` and `/fix-it-shop/app` visits retain the separate existing full website. Private records and other-provider routes are not repurposed. |
| Install metadata | Stable manifest IDs `/` and `/fix-it-shop/app`, scope `/`, start URL and shortcuts remain. Versioned icon responses must match the approved derivative bytes, including maskable. Root favicon and Apple assets are derived from the approved app icon. Physical icon/name refresh and overlapping installations are not established by emulation. |
| Public cache/update | v17 precaches 16 exact public files (11 existing core + five identity files), with only the chosen existing blue image warmed. The suite visits both sizes and can observe 18 allowlisted paths. Actual same-origin v16→v17 controller update, online reload and fresh offline reopen preserve a saved synthetic card and unrelated local record byte-for-byte. No localStorage clearing, API/private record caching or offline booking is introduced. |
| Reading/contrast | Five ordinary-reading cases, 33 scroll samples and 85 keyboard targets pass, including 884×600 and 200% text. A fresh identity-era scan has 1,068 passing text samples (caption minimum 5.764:1) and 40 control/focus samples (minimum 4.861:1). These sampled checks are not full accessibility certification. |
| Tests/build | Thirty-five focused tests pass before committing. The exact final head's full repository tests, typecheck/build and production customer-app/public regression runs are recorded in the companion validation/logs, not inferred from older heads. No lint task is configured. No GitHub CI exists for the unpublished local head. |

GlossGenius remains the appointment/payment authority. This public-app work does
not commission native scheduling, Katie management, Auth roles, email delivery,
payments or database schema. There is no new credential or production SQL.

## Hosted preview — specific bounded requirement

No working shared preview URL has been verified for this exact candidate.
Read-only Vercel metadata identified the existing project
`prj_GKN7RVVFAiQfWdTpHT63e0wNydgn` (`reserve-at-sanctum-app`, team Stutes Legacy,
Node 24/Next.js) and no overrides for `codex/katie-public-glossgenius`.
Global DATABASE_URL and Auth/AI/commerce bindings are assigned to both production
and preview. Values were not decrypted or retained; no setting was changed.
Publishing the full Next application to this inherited environment would not
establish an isolated non-production acceptance target.

Before hosted publication, authorize either a clean non-production preview
project or **preview-only, candidate-branch-scoped isolation** of inherited hosted
DB/Auth/outbound integrations. For this public app, hosted DB/Auth/AI/payment/mail
credentials are unnecessary: preview can run without those bindings, with
`RESERVE_DEV_PREVIEW=false`, booking email/cron disabled and APP_ORIGIN set to its
actual HTTPS preview origin. Keep production bindings/domains untouched and
retain preview access protection. Publication of the exact reviewed candidate
ref must also be authorized; no new task/competing implementation is required.
No credentials should be pasted into the review artifact or created for this.

## Remaining release path

1. Review the supplied exact-identity phone/Fold captures and icon-size sheet;
   the former missing-logo dependency is complete. Keep the approved materials
   and layout. Broader inner-page/marketing polish is not part of this release.
2. Authorize the bounded isolated preview setup and candidate publication above.
   Run this exact candidate's own CI and the supplied customer-app/identity/update
   suites against the approved HTTPS target without hosted mutation fixtures.
3. Verify fresh and existing iPhone/Samsung/Fold installs, icon/launch, online
   update/reopen, short/folded navigation, Back, local card/offline/delete, and GG
   handoff. Include manual assistive-technology acceptance. OS behavior and native
   hinge support remain physical-device checks.
4. After those gates and exact target/SHA are accepted, obtain explicit approval
   before any production deployment. No merge/deploy/domain/DB/permission/payment
   or native-calendar cutover is included here. Preserve saved storage keys and
   use online worker update/reload; never clear customer card storage to update.
