# Katie’s complete founder image — local fix

Base: `2ab51dac9d26afa8e544fafafd816c1ecbcfb763`, freshly verified with
`git ls-remote origin refs/heads/main` and fetched before creating the isolated
`fix/katie-full-original-image` worktree. This matches the supplied last-verified
production commit. No code from Booking draft PR #70 was imported. No push,
deployment, hosted database operation, booking activation or outbound message
was performed.

## Source and identity

The existing `public/images/founder/katie-guidry.webp` is unchanged: 1280 × 720,
113,034 bytes, SHA256
`73c26021fa17a2777a9024abb95ae17cc6f568706d03a7127441bbee2cfd6c28`.
Local pixel inspection confirms Katie center-left, her arm across the counter,
the complete circular upper-right Fix It Shop logo, the lower-right branded
product, and the black-and-gold interior. Existing provenance records its source
as `2258.jpg`; the repository does not contain the full-resolution `2258.png`.

The resolved Library reference `libfile_fdafc2d046f88191a8739caa05b137cc` was
prepared and its transfer attempted using the current Library helper in this
executor. The initial attempt and single permitted fresh preparation/transfer
retry failed; no readable Library file was produced. No alternate URL was guessed.
The supplied independent reference metadata is 1672 × 941 PNG, 2,298,912 bytes,
SHA256 `fe25823eea8f3722717f80d7b52346eef417c6664689e9c97b7743af93405db2`.
The local composition is consistent with that description, but byte identity and
pixel equivalence to the inaccessible PNG cannot be confirmed. The existing WebP
is smaller and separately encoded. This fix cannot recover detail absent from it.

## Change

Affected presentations are the founder feature at `/fix-it-shop/app#katie`
(also reached through `/`) and the opening at `/fix-it-shop/app/founder#katie`.
The unrelated illustrative homepage hero and `/fix-it-shop` marketing page are
unchanged. Existing booking links, navigation, identity, content, metadata and
server logic remain in place.

`FounderPortrait` now uses the asset’s intrinsic dimensions, responsive width and
automatic height. Its image fits the complete composition and is capped at native
width. The existing 113 KB WebP is served directly with `unoptimized`; there is no
second lossy optimizer pass, generated crop, placeholder blur, filter or transform.
No pixels were regenerated, retouched, cut out or replaced.

Phones and Fold/tablet widths use a full-width image block; desktop uses a wider
image column. The inset image shading is removed and the vertical overlay rail
becomes a caption below the image. Katie’s blue, gold and steel surfaces remain.
The story image is preloaded and the homepage feature remains lazy-loaded.
Empty photograph reservations retain their existing treatment.

## Validation and evidence

- `npm ci` installed the lockfile (Next.js 16.3.8, Node 24.19.0); an initial
  network reset required a successful cached retry.
- `npm test`: 191 passed, zero failures.
- `npm run typecheck`: passed.
- `npm run build`: passed using the normal Turbopack production build.
- No lint script, linter dependency or lint configuration exists in this repository.
- `git diff --check`: passed.
- `node scripts/verify-katie-image.mjs`: passed against local development and
  production servers at 320, 390, 540, 768, 884, 1440 and 1920 px, including
  high-DPR phone/Fold contexts. Checks source-byte identity, natural ratio, no
  native-width enlargement, full frame containment, no veil/filter/transform or
  caption overlap, no overflow, homepage → founder → booking links, reduced
  motion, no-JavaScript content and zero browser errors. No real reservation made.

Source-area preservation, calculated from rendered boxes and `object-fit`:

| Viewport | Home before | Founder before | Both after |
| --- | ---: | ---: | ---: |
| 320 | 37.3% | 35.6% | 100% |
| 390 | 46.9% | 44.7% | 100% |
| 540 | 67.5% | 64.4% | 100% |
| 768 | 31.9% | 37.2% | 100% |
| 884 | 36.7% | 42.8% | 100% |
| 1440 | 45.1% | 60.1% | 100% |
| 1920 | 44.7% | 64.2% | 100% |

Evidence is preserved in local `artifacts/katie-image/`: `before/` (unmodified
base presentation), `after-development/`, and `after/` (production build).
Each contains section renders, rendered-image captures, unchanged source WebP
and browser metrics. Baseline metrics record image-box `width` and `height`;
viewport order is the table above, home then founder, and screenshot filenames
record viewport width. After metrics explicitly label viewport dimensions too.
The gallery and validation logs live alongside these directories. Artifacts are
local and ignored by Git.

Reproduce with a local server on port 3100, or set
`KATIE_IMAGE_ORIGIN=http://127.0.0.1:3101` for a local production server. Set
`KATIE_IMAGE_BASELINE=true` only against the base revision to capture old crops.

Remaining gate: visual acceptance and the separately authorized release process.
A successful future Library transfer is required to establish exact PNG
equivalence or approve a higher-resolution source replacement. High-DPR displays
remain limited by the unchanged 1280 × 720 asset.
