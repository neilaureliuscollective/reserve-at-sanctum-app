# Fix It Shop — exact approved identity integration

This continuation preserves release candidate `2f049d79628a61731d668dc49cb310076b47157a`,
the `da71f20` reading-overlap repair and approved `2e1f3ba` composition/blue. It
fetches asset commit `a4cab5fcde22052cab12142c3c53d41b95b99aa9` and copies **only**
its two approved source PNGs; the asset branch is not checked out or merged.
The candidate's own local history remains authoritative.

| Original | SHA-256 |
| --- | --- |
| `assets/approved/fix-it-shop/full-logo.png` | `c8f5c125f3529761a8a4303a4fddca9d30d2b2f7179286d1e81fec723c56366c` |
| `assets/approved/fix-it-shop/app-icon.png` | `97a168d3bc0983a2e3fc37879b7f771f702299ea665a3055ebe7a2403192f9b7` |

Both originals remain opaque RGB, 1254×1254. They are not redrawn, cropped,
background-removed or given invented transparency. `generate-fix-it-identity.mjs`
uses the installed Sharp 0.35.5/libvips 8.18.7 and uniform Lanczos3 resizing.
Two lossless logo WebPs (280/560), opaque PNG icons (180/192/512), favicon PNGs
(16/32/48), a PNG-backed ICO and a padded opaque 512 maskable export are checked
in. The second generator run reproduced all ten outputs and provenance exactly.
`derivatives.json` records sizes, hashes, role and processing.

The maskable export uniformly scales the entire app-icon original to 448px and
centers it on an opaque 512px navy canvas, with 32px padding on each side. Its
entire detected gold emblem fits more than eight pixels inside the central
40%-radius safe circle. That circle follows the [W3C manifest safe-zone rule](https://www.w3.org/TR/appmanifest/#icon-masks).
No source art is cut away. The review sheet shows native 16/32/48/180/192 sizes
and a separately labeled simulated circular OS mask. The 16px image retains a
small gold/blue silhouette; fine interior detail is naturally limited at favicon
size. The text-free original icon is used for these exports, not tiny full-logo
lettering. A physical OS installation has not been inferred from this sheet.

## Integration boundary

The missing-identity notices in Home, expanded My Card and Katie are replaced by
the exact complete logo. Home/My Card retain the same reserved slot geometry;
Katie retains its prior identity-row line-box/padding geometry, including
container-dependent enlarged-text rows. An absolutely positioned, uniformly fit
image stays inside that row. Blank nonsemantic line boxes reserve its old space;
no false missing-logo text remains. No inner-page aesthetic restyling is included.
The logo's supplied opaque background remains visible rather than being faked
as a transparent cutout.

The existing root/Katie icon files now contain the approved icon exports. Both
manifests retain IDs (`/`, `/fix-it-shop/app`), scope `/`, start URL and shortcuts;
only icon asset versions change. Root favicon and explicit compact-app favicon/
Apple links use the derived assets. No account ID, route, saved-card/draft/reset
key or booking destination changes. The old marketing image assets remain
preserved; this bounded pass does not repaint the separate full website.

Worker v17 precaches five exact, public identity files alongside its 11 existing
core files, then warms only the selected existing blue master. Unused large icon/
logo exports are not added to its precache. Private routes, Auth, APIs and card
records remain outside the worker. Updating the cache never clears localStorage.

## Observed verification

- Forty before/after viewport/state comparisons at 320/390/540/884/1440, short
  expanded height and 200% text pass: live geometry/type/material declarations
  remain equal and changed pixels stay within replaced identity paint areas.
  The baseline's old placeholder paragraphs could overflow their slot at 200%;
  their actual old painted box is explicitly included in the replacement mask.
  No whole-stage or whole-pane mask conceals a blue/material change.
- A fresh composite inspection has 1,068 passing text samples, small CTA-caption
  minimum 5.764:1, and 40 passing control/focus samples, minimum 4.861:1. The prior
  2f049d7 material audit remains historical rather than being relabeled.
- Ordinary reading still passes five cases, 33 scroll samples and 85 keyboard
  targets, including 884×600 and enlarged text. The real booking row remains
  before Share; no focus operation repairs the reading captures.
- A real same-origin browser worker transition from v16 to v17 waits for the new
  controller, then reloads the new cached document. The saved synthetic card and
  an unrelated local record remain byte-identical. A fresh offline reopen keeps
  the card and decodes the approved logo from the v17 public cache.
- Thirty-four targeted identity/cache/card/booking/provider tests pass. The final
  commit's full-test, typecheck, build and production browser results are bound
  separately in the accompanying exact-head review evidence.

No Library asset download/retry, paid call, credential creation, production data
mutation, merge or deployment occurred. The exact identity dependency is now
resolved. Final visual/device acceptance and preview isolation remain release
work; see the [current release review](FIX-IT-CUSTOMER-APP-RELEASE-READINESS.md).
