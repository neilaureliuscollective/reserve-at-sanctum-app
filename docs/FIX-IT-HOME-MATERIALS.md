> Historical 7a70937 material proof, superseded for Home/My Card by
> [the concept translation](FIX-IT-CONCEPT-TRANSLATION.md). Retained for traceability.

# Home material correction — local review

This correction is Home-only, including its visible header and dock. It preserves
the accepted e53740f layout, type, spacing, arches, card and button dimensions,
navigation, shadow geometry and behavior. The pre-edit neutral Home proof was
rendered at 390px and 884px before any edit and preserved with its patch/source.
This is a material candidate for review, not finished brand acceptance.

## Roles

| Existing surface | Material |
| --- | --- |
| Hero, consultation card, Visit Help card | Opaque deep Reserve Blue satin/enamel; no grain |
| Dock body | Dark Reserve Blue; no grain |
| Services card | The single charcoal-steel card, with restrained brushing |
| Header and share row | Carbon; no broad steel or blue wash |
| Primary booking CTA | Existing dimensional gold finish, unchanged |
| General edges/hardware | Restrained steel/Stone White; limited gold trim |

The brand anchors remain Reserve Blue `#0F3B4C`, Sanctum Steel `#5A6168`,
Reserve Gold `#D4A853`, Stone White `#F5F4EF`, Carbon `#121417`. The blue faces
shade through `#214654`, `#102B37` and `#0B2733`; those are material shades,
not additional official palette colors. The neutral Carbon canvas has no global
blue haze. Opaque faces establish blue identity without tinting brushed metal.
The gold CTA paint/reflection/grain is retained exactly from the pre-edit proof.
Services' action/icon and keyboard ring use Stone White. The dock keyboard ring
also uses Stone White where it crosses the steel rim; its selected border is gold.

All correction selectors are gated by a visible Home section. Services, My Card,
Show Katie, The Shop, Katie and Visit Help screens retain their existing render.
No HTML, copy, app/state JS, fonts, identity image or backend behavior changed.
The parent/reviewer inspected the reference board and supplied this role map;
this executor did not claim a new board inspection or retry exhausted transfers.
No example service, price or portrait was copied.

## Evidence and limits

The local review bundle contains before/after phone/Fold captures, a CTA close-up,
role allocation, geometry and composited-pixel contrast reports. The checks found:

- Geometry/type/arch metrics match across seven screens at both widths.
- All 12 non-Home screen/width images are pixel-identical to the pre-edit baseline.
- The interior of the gold CTA is pixel-identical to the baseline at both widths.
- All 175 sampled visible text rectangles pass 4.5:1 normal / 3:1 large thresholds;
  measured minima are 5.77:1 small and 4.10:1 large text.
- Measured keyboard-ring contrast is at least 5.03:1; selected-nav border contrast
  is at least 5.74:1 against its actual adjacent pixels.
- Main component-face allocation, accounting for the CTA separately from the hero,
  is blue 66.88% / 61.67% and steel 9.66% / 6.90% at 390px / 884px. This is a
  descriptive role balance, not a whole-page quota. The fixed Fold Services card
  yields less steel than the proposed 8–12%; its accepted geometry was retained.
- 27 affected tests, typecheck, production build, JS syntax and the customer-app
  and public/other-provider browser regressions pass. No lint script/config is
  present. Tests use local synthetic data and intercepted merchant/share transport.

These are rendered checks, not complete WCAG certification, physical-device
acceptance or final brand approval. No hosted data, real mail/payment, paid API,
credential change, push, merge or deployment is part of this correction.

## Texture and cache

`public/fix-it-shop-app/materials/home-grain.png` is original deterministic
procedural neutral grain: 512 × 128, 22,636 bytes, 256 KiB raw RGBA. It uses
Python's standard RNG with seed 20261018, irregular horizontal correlation
(0.93 previous sample / 0.07 new sample) and alpha 8–12/255 (3.14–4.71%). No
external texture, paid generation or board crop was used. Its SHA-256 is
`2c9310630640801e3791d79d67e70d86f3080554c2490e8c92b7ddb866510a1b`.

The visible blue faces do not use the texture. It remains on the Services steel,
the unchanged gold CTA and small recessed hardware from the preserved proof.
Physical/GPU performance was not measured. Worker cache v13 keeps the same
public-only boundary and includes the texture; matching harness expectations
verify the allowlist. Consultation data and private/native records remain separate.
