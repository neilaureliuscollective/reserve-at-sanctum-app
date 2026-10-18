# Fix It Shop concept translation — local review candidate

This pass supersedes the rejected 7a70937 dashboard/material arrangement. It is a
composition plus material translation for Home at 390px and 884px, with the
expanded My Card relationship and adaptive five-destination navigation. It is not
a new booking app, a release or finished brand acceptance.

## Reference and identity status

The five new Library references were prepared and transferred using the supported
consumer-local flow, followed by one fresh supported retry per input. All ten
transfers failed; no readable PNG was produced. This executor did **not** view
those images. Implementation proceeds under Neil's explicit authorization from
the detailed measured specification prepared by direct inspection in the parent.

| Supplied reference | Library ID | Role |
| --- | --- | --- |
| 2804.png | libfile_3e2b77abf5c48191bda9ff70ed277863 | Material/palette board |
| 2805.png | libfile_20e47ea33248819197fe95043e5c228c | Rejected phone screenshot |
| 2806.png | libfile_8d572dbbcb7c8191840a42fb97b7c4d6 | Rejected Fold screenshot |
| 2807.png | libfile_931602ee64a481919a2fdfd2a3507832 | Intended earlier phone concept |
| 2808.png | libfile_8d7cd3e4b9a88191b9818942f81f4e51 | Intended earlier unfolded concept |

The approved new crest (`libfile_0edeab1bb1688191b86b0579b3dbe253`) and icon
(`libfile_834a1f7182c481918ed81c9feda69bdc`) remain unavailable locally. No exhausted logo
transfer was retried, no replacement was generated, and no old crest is displayed
in this app's visible UI. The stage and Katie identity area explicitly label the
missing approved crest. This blocks full identity/visual acceptance. Existing
shared install manifests/IDs/start URLs and legacy OS icon metadata are retained
for compatibility, not represented as the approved new identity. No physical
installation or production logo replacement is claimed.

## Translation

Home now has a continuous, unframed ink/navy stage with selective irregular blue
microtexture, live editorial copy, a separate diagonal warm-metal sweep, and a
single dominant visible gold booking action. The old abstract enclosing dashboard
arch/card is not retained. Phone booking stays in the opening viewport; expanded
Home uses a lower booking bar without a second bottom navigation bar.

Two quieter cropped material openings lead to the existing shop and My Card.
Services remains directly available in the unchanged five destinations. The
consultation entry is concise on phone and becomes a right-side preview on the
expanded layout. Its three prompts are a static list and the whole entry opens
My Card: there are no fake fields or save controls on Home. Its saved/empty text
still comes from the actual existing device state, with no premature checkmark.
Sharing and storage/privacy copy remain quieter lower content.

At 800px and above, Home, Services, My Card, The Shop and Katie use a labeled left
rail with the same hashes, selected state and browser history. Below that, the
same links form the bottom bar. Expanded My Card places the brand stage beside
the original **single** form; at 884px its textareas are one column. Two columns
are allowed only when the real form pane is at least 540px wide. There is no
duplicate form ID, independently diverging draft, second save handler or fake
job state. Inner content outside Home/My Card is not broadly redesigned; visible
old-crest removal and the shared adaptive shell are the limited related changes.

Spacing is not frozen to the rejected candidate. Normal page scrolling is used,
without nested content panes or a WebGL/video/animation runtime. At short heights,
decorative staging yields space; enlarged text reflows instead of scaling controls
down. Measured header/navigation/booking-bar insets and a presentation-only focus
reveal keep focused controls clear of fixed surfaces. Conditional viewport-segment
rules keep actionable content within usable segments if a browser exposes a
separating hinge. Ordinary responsive layout works without that API.

## Material responsibilities

The documented palette anchors are retained as references, not broad flat fills.
The scene is substantially darker than the rejected gray-cyan hero, using ink
backing around #010D1A/#021321, localized deeper blue reflections and irregular
microrelief. Blue material, lighting, gold sweep and functional type are separate
layers. The two checked-in WebPs contain **no logo, text, device frame, status bar,
button, shop interior or person**. They are original abstract material art, not
photography or evidence of the premises.

The gold control now has vertical top-to-bottom light falloff, warm intermediate
reflection, a bright rim and bronze return. Fine grain is subordinate. This
replaces the prior nearly uniform mustard plate plus one diagonal stripe. All
labels and controls remain real HTML. Concept phone frames, hinges, floor
reflections and presentation captions are not shipped as app UI.

The separation of base appearance, reflection and microsurface detail is informed
by the [Filament material guide](https://google.github.io/filament/Materials.md.html);
this is a lightweight CSS/image approximation, not a claim of physical rendering.
The adaptive bar/rail pattern follows [Android adaptive navigation guidance](https://developer.android.com/develop/ui/compose/layouts/adaptive/build-adaptive-navigation).
The implementation uses native [responsive picture selection](https://web.dev/learn/images/responsive-images)
and real text, and checks [focus not obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html).

## Assets, performance and cache

`materials/stage-phone.webp` is 640×880 / 20,874 bytes;
`materials/stage-wide.webp` is 900×1100 / 37,488 bytes. Both are art-directed crops
of one original deterministic material master. `scripts/generate-fix-it-stage.py`
records the process (NumPy/Pillow were already installed in the executor; no new
package was installed or added to runtime/build dependencies). Checked-in WebPs
are served directly; npm builds do not invoke that optional maintenance script.
The seed, dimensions, hashes and provenance are in `materials/stage-provenance.json`.
The earlier original 22,636-byte neutral grain is reused for the gold control.

The first stage is eager/high priority. Native picture media selects one master,
not both. Secondary uses share the same selected URL and may load lazily. Worker
v14 installs only core public files; a scope-checked message warms only the
selected public stage. The static image fetch path may cache only the two exact
stage paths. Unlisted paths, queries, external origins, private pages and APIs
are not intercepted/cached. No account, Chair, card or booking data enters the
worker. The card still uses the same explicit localStorage save and tab draft.
Unit tests cover no dual-master installation, selected-only/deduplicated warming,
and denial of forged private paths/origins/sources. Optional art failure leaves
an abstract CSS backing and does not disable the real form or booking link.

## Preserved semantics and acceptance

`app.mjs` and `state.mjs` remain byte-identical to 7a70937. All booking links still
use exactly https://fixitshop.glossgenius.com/ with no intro or confirmation gate.
The existing save, Show Katie, delete/draft invalidation, native-share/fallback,
install-promotion and offline boundary remain real. The card is local, not sent
to Katie, and separate from private/native website records. No service, price,
claim, portrait, job state, backend or authority was invented.

The companion review bundle records actual phone/Fold/Home/My Card renders,
200% type/reflow, keyboard visibility, composited contrast, responsive-source
requests, gold light-falloff measurements and functional regressions. Passing
checks do not establish a visual match to images this executor could not view.
Parent comparison against the actual concept interiors, exact approved-logo
integration, physical devices and final brand acceptance remain required.

No push, merge, deployment, live database/settings change or paid API call is
included in this bounded local pass.

## Final local validation record

The focused suite passed 30 tests, including the new selected-art cache/privacy
checks. Typecheck, production build, JS syntax and both customer-app/public
functional browser suites passed. No lint script/config is present. The actual
composition audit covered all seven routes/selected states at 320, 390, 540, 884
and 1440px, plus 200% text at 320px. All 330 sampled text rectangles met their
normal/large-text contrast thresholds, and all 217 tested keyboard targets were
visible. Measured control/focus samples met 3:1, with a minimum of 4.77:1.

Initial image requests used only the matching phone or wide source at every
width. Gold blank-band medians were approximately RGB 233,192,123 at the top
and 222,176,104 below on phone; expanded results were similar. These measurements
confirm differentiated light falloff, not visual acceptance or exact reference
matching. Parent comparison to the actual concepts is still required.

The native hinge-emulation command was accepted but the segment media query
remained false in this browser. A separate synthetic contract substituted two
432px segments and a 20px gap into the real parsed conditional rules; controls
remained within usable segments across all seven screens. This does not establish
native API or physical folding-device acceptance.
