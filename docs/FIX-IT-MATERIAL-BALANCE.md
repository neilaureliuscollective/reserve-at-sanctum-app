# Fix It Shop — bounded final material balance

This records the preserved `2f049d7` material pass. The later [identity integration](FIX-IT-APPROVED-IDENTITY.md) resolves its historical missing-logo dependency without changing these materials or layout.

The baseline is the preserved overlap/readiness commit
`da71f2079b303e2461b54103d247500b3b72de0a`, directly after the approved blue/button
geometry candidate `2e1f3ba6400dc4062cfc5efb2c12348a11e99487`. This is the requested
selector-limited material pass, not a new composition or cross-promotion feature.
No asset download/retry, generated texture, paid API, push or deployment occurred.
The exact new crest/icon are still unavailable and have not been approximated.

## Material map actually applied

- The existing `.stage-ribbon` keeps its geometry, clipping, original grain,
  opacity and shadow extents. Its existing 0/13/33/48/56/78/100 reflection ramp
  becomes neutral steel: `#242B31`, `#303940`, `#5A6168`, `#8A949C`, `#737D85`,
  `#3E464D`, `#242B31`. Its edge and inset reflection become neutral. The current
  stage shade and all blue art/crops remain unchanged.
- `.app-nav` shell and `.expanded-booking` backing use opaque charcoal-steel
  paint with the already checked-in grain (mean alpha about 9/255), blended only
  on those surfaces. The navigation's selected blue inset, gold state border and
  Stone White focus/selected content remain. Inactive labels become Stone White.
  No header, story-card, input or right-pane steel fill was added.
- `.consultation-entry` and `.card-pane` change border/edge-light colors only.
  Their original edge alpha is retained so even gradient-compositor rounding
  cannot recolor the protected blue interiors. The header changes only its
  existing bottom rule. Panel background declarations remain exact.
- The existing scoped primary button keeps its layers, 112° reflection, 180°
  body gradient, grain, 0/24/58/100 stop positions, geometry, type and shadow
  extents. The body becomes `#D4A853` → `#CCA052` → `#BD9045` → `#B58842`.
  Warm reflection/lip colors stay localized; the lower return stays bronze.
  Small captions use Carbon `#121417`. No unrelated `.primary` rule changes.

The blue masters remain exact:

| Asset | SHA-256 |
| --- | --- |
| `stage-phone.webp` | `3d774d4b5322d2863659f68158117806d5569f183a9acd789b372290637638cb` |
| `stage-wide.webp` | `f83ca425cd3c18a691100112fb5cb8ef02785456d78823adf478f81d0b63f010` |

## Bounded proof

`scripts/verify-customer-app-materials.mjs` captures the same Chromium version,
390/884×900 viewport, locale, timezone, reduced motion, decoded fonts/images,
mouse location, empty synthetic device state and blocked external requests.
It inspects all five selected navigation states, Home full/viewport, expanded
My Card full/viewport and its Save view, plus 2× gold close-ups.

Each material mask comes from that element's isolated actual paint, retaining
its current clip, radii and shadows. Frame masks hide their blue background and
text, leaving only borders/edge light/shadow. The header mask is its one-pixel
bottom rule. The selected tile's blue interior is explicitly carved out of the
navigation mask, apart from its existing three-pixel border/antialiasing edge.
No whole-scene or whole-panel rectangular mask and no overall similarity score
is used. Document/viewport coordinates are handled separately for the Save view.

All **14 comparisons have zero changed pixels outside those explicit masks**.
Protected canvas, image source/crop/filter/blend/shade, story-card and pane
background declarations compare exactly. Live control/type rectangles, padding,
radius, font metrics, transform, gradient structure and shadow extents match the
overlap-fixed baseline, including CDP-forced hover/pressed/focus CSS states.
The separate functional browser exercises actual keyboard/touch navigation.

The fresh composite scan has **1,070 text samples**, all meeting their normal/
large thresholds. The minimum is **5.764:1**, also the small gold-caption minimum.
**40 control/focus samples** meet 3:1; minimum **4.861:1**. Focus samples use the
actual rendered ring against the same point in its unfocused background. Gold
control tests compare its visible face to the actual surrounding blue/steel.
The pre-pass scan found 4.496:1 where wide lead copy crossed the old gold ribbon;
the permitted darker steel replacement removes that hotspot without changing
the protected blue or the copy's color. No failing sample was rounded up.

Blank-band medians demonstrate a deeper face with retained directional falloff:

| Control | Top RGB | Bottom RGB |
| --- | --- | --- |
| Phone booking | 205,161,82 | 184,139,67 |
| Expanded booking | 205,161,82 | 184,139,67 |
| Expanded Save | 203,158,81 | 185,141,68 |

These measurements support material/contrast assessment; they are not aesthetic
approval. The final actual images remain for Neil's review before publication.
The reading regression still passes 33 ordinary-scroll samples and 85 keyboard
targets, including short expanded height and 200% text. The booking strip retains
its real row before Share. Native hinge and physical-device acceptance remain
unverified; no image shows an invented device frame or simulated physical claim.

The parent-supplied design rationale references [W3C text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html),
[patterned-background technique G18](https://www.w3.org/WAI/WCAG22/Techniques/general/G18),
[non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
and [Filament material principles](https://google.github.io/filament/Materials.md.html).
The exact paints are the bounded design proposal, not colors prescribed by those
sources. See the [release review](FIX-IT-CUSTOMER-APP-RELEASE-READINESS.md) for
functional evidence, remaining identity/install gates and minimal release path.
