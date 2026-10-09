# Legacy Reserve — image emblem phase

## Scope and decision
Neil approved the researched image-art direction after rejecting the procedural crest, mechanism and emerald. This phase replaces the public hero crest and Presence, Performance and Vitalis sculpture surfaces with generated photographic artwork. No member workflows, billing, booking, icons, or database changes.

## Research
- Rolex 1908: light-catching fluted metal and precision movement presentation. https://www.rolex.com/watches/1908/features
- Bvlgari Emerald Strata: architectural gold settings, proportion and emerald material. https://www.bulgari.com/en-us/collection/high-jewellery/emerald-strata-necklace
- Bvlgari Eclectic Embrace: saturated emerald, black onyx and geometric volume. https://www.bulgari.com/en-us/collection/high-jewellery/eclectic-embrace-necklace
- MDN reduced-motion media query: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion
- Installed Next.js 16 image guide inspected before integration.

These references informed original art direction; the generated objects are conceptual brand artwork, not products for sale or functioning instruments.

## Implementation
Four transparent PNG masters were generated; the production WebP artwork is preserved in the repository at its full 1280px resolution. Built-in image generation was used, with the official crest as its identity reference. Reviewed lettering, silhouette, material depth and mobile presentation. Responsive 640/1280 WebP derivatives in public/brand/legacy-reserve/emblems preserve alpha. Versioned URLs avoid reusing the rejected asset URLs.

The same artwork remains visible in still and motion states. There is no canvas or WebGL renderer imported by either public component. CSS supplies a restrained 5–6px vertical breathing cycle, not a fabricated 360-degree view or mechanical animation. Shared motion controls preserve the existing persisted preference; visibility and reduced motion pause the artwork. Quiet Vitalis stays still. Images remain available without JavaScript. Supporting atmospheric image scenes and image-to-video loops are deferred beyond this replacement phase.

## Validation
143 tests passed; TypeScript and production build passed. Browser checks cover 320, 390, 430, 700, 884 and 1440px; all three selections and routes; decoded assets; no canvas; artwork opacity; pause persistence; reduced motion; offscreen pause; no-JavaScript crest. Screenshots are retained in docs/verification/emblems. Production release is checked separately after merging.

## Prompt set (built-in image generation)

### crest

Use case: precise-object-edit. Production website transparent artwork. Recreate the supplied official Legacy Reserve gold medallion as an ultra-realistic luxury studio photograph of a physical thick engraved gold and deep emerald enamel object. Preserve EXACT LR overlapping monogram silhouette, LEGACY top and RESERVE bottom lettering, circular borders, two symmetrical laurel branches, compass stars and small studs. No redesign. Rich brushed gold recessed edges and polished chamfers, crisp sharp readable letters, realistic green enamel and beautiful subtle surface microtexture. Nearly frontal view with only a very slight visible thickness along lower right edge. Studio key light upper left and champagne rim right. Entire circular object centered with 10 percent breathing room, no clipping, no pedestal, no background or ground shadow. Genuine transparent background. Premium restrained craftsmanship, no glow halos, no blur, no plastic, no invented text.

### presence

Use case: product-mockup. Website signature emblem The Standard for masculine luxury brand Legacy Reserve. Ultra-realistic luxury studio product photograph of a handcrafted dark heritage emerald enamel shield with thick sculpted 18k yellow gold chamfered border, concave top edge and elegant pointed bottom. A central raised polished gold eight-point compass star within a fine engraved gold circle. Symmetrical realistically sculpted gold laurel sprigs follow the inside lower sides. Three-quarter thickness barely visible, face nearly straight toward camera. Exquisite jewelry craftsmanship, brushed recesses, polished highlights, deep dimensional shadows, small fine engraving, black-green enamel. One coherent elegant object, centered, entire silhouette visible, generous 12 percent transparent margin. Directional upper-left softbox and subtle champagne rim right. True transparent background. No letters, no text, no pedestal, no scene, no halo, no plastic, no cartoon, no military lettering, no crown.

### performance

Use case: product-mockup. Single transparent website emblem for Legacy Reserve Performance named The Engine. Ultra-realistic macro luxury studio photograph of a bespoke circular precision mechanical movement viewed almost straight on with visible sculptural thickness. Beautiful layered brushed yellow gold bridges, dark obsidian recessed plates, tiny finely machined screws, nested toothed gears with credible meshing, three emerald jewel bearings. A tasteful small eight-point gold compass star on the central bridge. Skeleton construction with convincing dark depth and hand-finished polished beveled edges. Carefully composed asymmetric machinery within a symmetric thick circular gold outer case. Quiet masculine elegance, a collector-grade timepiece movement object. Upper-left softbox and champagne rim right, real microtextures and rich shadows. Entire circular silhouette centered with generous transparent margin. No dial, clock hands, numbers, words, logos, crown, strap, pedestal, floating disconnected parts, plastic, neon, flat illustration, background or halo. Genuine transparent background.

### wellness

Use case: product-mockup. Transparent website signature artwork for Legacy Reserve Vitalis called The Core. Ultra-realistic luxury studio photograph of a luminous polished emerald mineral core held by three gracefully sculpted flowing gold supports. A large vertically oval cabochon emerald, smooth gently domed surface with tiny natural inclusions and deeply believable translucent forest green mineral interior, subtle pale mint light naturally refracted through the center. The gold supports curl around its lower half like organic architectural ribs, embracing rather than caging the stone, leaving most emerald exposed. Compact sculptural silhouette, no trophy pedestal, no rings orbiting, no facets like a polygon, no levitating disconnected pieces. Physically convincing gemstone and polished solid gold, softly brushed inner surfaces, rich shadow and restrained jewel radiance. Upper-left softbox, champagne rim right. Entire object centered with generous margin on truly transparent background. Masculine contemporary high jewelry, elegant organic life and balance. No text, logos, symbols, neon, plastic, flowers, heart shapes or background.
