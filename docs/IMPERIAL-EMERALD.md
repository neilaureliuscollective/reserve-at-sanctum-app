# Imperial Emerald — October 8, 2026

## Audit and scope

Baseline: `7fb6b2f`. Vercel's production project is connected to the repository's
main branch and the existing domain. The live `/api/health` returned `ready`.
Supabase and DATABASE_URL are configured; no secret values, settings, migrations,
entry rules, booking authority, clinical integrations or payment flags change.

Existing fonts, Lucide icons, SVG instrument, scroll director, motion preference
and returning-member entry are reused. The weaknesses were inconsistent greens,
flat product surfaces and a homepage console exposing only three primary worlds.

## Research applied

- [Porsche Driver Experience](https://newsroom.porsche.com/en/2023/products/porsche-cayenne-driver-experience-31790.html): instrument hierarchy and quick access inspire the separated dock/content planes.
- [Aman New York](https://www.aman.com/hotels/aman-new-york): architectural destination presentation informs editorial composition. This is our design interpretation, not a usability measurement.
- [Apple materials](https://developer.apple.com/design/human-interface-guidelines/materials): navigation glass is distinct from opaque, readable content.
- [Anthropic artifacts](https://support.anthropic.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them): focused conversation informs the restrained Aethelios tool environment.
- [Animation performance](https://web.dev/articles/animations-and-performance): use transform and opacity for motion.
- [W3C reduced motion](https://www.w3.org/WAI/WCAG22/Techniques/css/C39): respect system preferences alongside the existing manual still setting.
- Installed Next.js 16.3.5 CSS/template documentation: shared root stylesheet; a keyed content plane rather than a new template resetting unrelated layout state.

## Implementation

Global palette tokens are canonical. Imperial aliases define materials, borders,
shadow levels, radii, easing and timing. `ImperialSurface` and `surfaceClass`
provide architectural, glass and hero materials without another client runtime.

| Color | Hex |
| --- | --- |
| Obsidian | `#080D0B` |
| Midnight Emerald | `#0D211B` |
| Imperial Emerald | `#12382D` |
| Illuminated Jade | `#205443` |
| Reserve Gold | `#C4912F` |
| Champagne Gold | `#E4BD70` |
| Warm Ivory | `#F2EEE4` |

The public introduction now exposes five worlds in its floating console. Reserve
has a compact member world rail and dimensional actual routines/wellness data.
Vitalis gains instrument framing; Aethelios gains lit conversation materials;
Sanctum gains architectural service/professional framing; Collection gains lit
product plinths. Katie's independent blue/gold world is preserved.

The existing SVG instrument now has projected metallic rings and an emerald core.
Selection changes geometry; existing scroll progression changes depth. Dock
active states, press response, safe-area placement and route entrances share
the same materials. Loading uses transform/opacity. Unsupported backdrop blur
falls back to an opaque surface. Both manual and system still preferences disable
new motion. No dependency, render loop, WebGL scene or synthetic metric is added.

## Verification

140 existing tests passed. TypeScript and optimized build passed. Public browser
suite passed at 320, 390, short-phone, 884 and 1440 widths, including visible
selected CTAs above the dock, keyboard/world transitions, product selection,
scroll depth, manual/system still and zero page errors. The public test brings
lazy product imagery into view before decode, avoiding an offscreen wait.

Member verification uses isolated synthetic local accounts; production accounts,
appointments and payments are never modified. There is no repository lint
script; whitespace is checked with `git diff --check`. Browser emulation does not
establish physical-device frame rate, battery consumption or PWA installation.

Production follows the existing GitHub verification/Vercel workflow. Verify the
release header and live database health after the deployment reaches READY.

## Next visual phase

Consolidate older material rules, art-direct real product assets and refine the
larger Aethelios conversation presence. Validate on the founder's actual Fold
and iPhone before introducing heavier rendering.
