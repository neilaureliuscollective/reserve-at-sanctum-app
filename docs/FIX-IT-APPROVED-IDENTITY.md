# Fix It Shop approved identity and transparent emblem

This narrow continuation preserves candidate `66a820cdbee76f77c075193c0a6f749a9ad47af9`,
its approved blue/steel/gold composition, buttons, layout and local consultation
card. The two opaque originals remain byte-identical to asset commit
`a4cab5fcde22052cab12142c3c53d41b95b99aa9`.

| Supplied source | SHA-256 |
| --- | --- |
| `full-logo.png` | `c8f5c125f3529761a8a4303a4fddca9d30d2b2f7179286d1e81fec723c56366c` |
| `app-icon.png` | `97a168d3bc0983a2e3fc37879b7f771f702299ea665a3055ebe7a2403192f9b7` |
| `hero-emblem-transparent.png` | `9a1ebc8924f0d322dcc349bf16a3f7bd6399213c13c8976baf39b9dcecfe2ce8` |

The transparent 1254-square RGBA emblem comes from asset commit
`ce64ab7e97ea36d84d71f846cfcf95d157485a69` on
`assets/fixit-approved-identity-20261018`. It is the supplied imagegen edit of the
approved text-free icon: center star, columns, doorway and steps, with no lettering
or rectangular background. Only that file is copied; the asset branch is never
merged into the customer-app candidate. No additional image generation occurs.
Original bytes and alpha are inspected locally. Most pixels are fully clear;
all four corners have alpha at most 1/255.

`scripts/generate-fix-it-identity.mjs` uniformly resizes the complete supplied
canvas into lossless alpha WebPs at 280/560 using the existing Sharp 0.35.5 and
libvips 8.18.7. There is no crop, redraw, color edit or new backplate.
`assets/approved/fix-it-shop/derivatives.json` records provenance and output hashes.

Home, expanded My Card and Katie use the transparent center emblem in their
existing three reserved identity slots. The existing page wordmark supplies the
business name; no wordmark is baked into these images. A small silhouette shadow
and restrained cool edge light connect the metal to the existing blue scene.
The nine-second breathing cycle rises at most 1.5px and varies brightness by
2.5%; it never spins, changes layout or moves controls. Reduced-motion preference
disables the animation. Katie's reserved line-box geometry and paint bounds remain.

Platform app icons remain opaque and byte-identical to `66a820c`: root/Katie PNGs,
Apple icon, favicons and padded maskable export. ICO entries have alpha fixed at
255 for Turbopack compatibility and identical approved RGB. The unchanged gold
maskable art fits more than eight pixels inside the central 40%-radius safe
circle specified by the [manifest standard](https://www.w3.org/TR/appmanifest/#icon-masks).
Neither manifest ID, scope, start URL, shortcuts nor icon version changes here.

Worker v18 replaces v17, swapping only the in-page logo entry for the transparent
emblem. It still precaches 16 exact public files and warms only the chosen blue
master. No Auth/API/private page, appointment, note or card record enters the
cache. Activation retires only older caches bearing this app's prefix; it never
clears localStorage. A real same-origin v17→v18 browser update and fresh offline
reopen preserve a synthetic saved card and unrelated local record byte-for-byte.

The focused review compares actual phone/Fold and enlarged-text renders against
`66a820c`; immutable material, layout, typography and button geometry are checked
separately from the authorized identity paint replacement. Browser checks assert
the transparent asset, absence of a backplate, normal subtle animation and the
reduced-motion still state. Physical OS installation and hinge behavior remain
physical-device checks rather than claims from browser emulation.

The earlier candidate's 207 tests, types/build, functional browsers and contrast
review are preserved as historical evidence. The changed candidate's affected
checks, build, CI and production revision must be recorded against its own exact
commit. See [release readiness](FIX-IT-CUSTOMER-APP-RELEASE-READINESS.md).
