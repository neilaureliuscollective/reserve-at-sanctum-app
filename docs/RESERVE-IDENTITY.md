# Reserve visual identity, September 2026

## Baseline and plan

The existing Next application, routes, bookings, authentication, profiles, Reserve Command, and brand world pages are the baseline. The September homepage had cinematic narrative sections and three living emblems, but its Reserve-only styles used older olive green and shared root styles used blue-black and champagne. GENT's world card had also lost the depth of its former stage. This update changes the Reserve visual shell and supporting surfaces, not the two independent brand systems or product logic.

1. Canonical colors live in `app/globals.css` as `--reserve-obsidian`, `--reserve-deep-petrol`, `--reserve-petrol`, `--reserve-gold`, and `--reserve-gold-light`, with shared edge/glass primitives.
2. The approved emblem is served from `public/images/reserve-petrol-official.webp`. The supplied art stays intact; only its outer dark square is feathered into transparent corners and optimized. Ceremonial use belongs in the home arrival; a small provenance stamp belongs in the footer. The header uses its existing geometric diamond and explicit Reserve wordmark so the tiny label stays legible.
3. Reserve sections use obsidian negative space, petrol where light falls, and gold as edge, hierarchy, or action. Katie's blue and Neil's green remain in the transition rooms and individual pages.
4. Responsive constraints include 320–390px cover screens, standard phones, 760px, tablet, and desktop breakpoints. Motion is optional via the existing pause control and `prefers-reduced-motion` support.

## Research principles

The [Aman hospitality experience](https://www.aman.com/) gives destinations and experiences breathing room; [Aman interiors](https://www.aman.com/interiors) emphasizes the material and architectural qualities of space. [Six Senses Vana](https://www.sixsenses.com/en/hotels-resorts/asia-the-pacific/india/vana/) grounds wellness in a real place and its practices. [Porsche's design system](https://designsystem.porsche.com/v3/) keeps brand expression consistent alongside accessible controls. The implementation translates those principles to this real Eunice project without copying their layouts or claiming the concept imagery is a built facility. [web.dev](https://web.dev/articles/animations-guide) recommends transform/opacity for performant animation, and its [motion guidance](https://web.dev/articles/prefers-reduced-motion) supports honoring reduced motion.

## Asset and scope rules

- Do not alter `fix-it-official.jpg`, `gent-ascend-official.jpg`, their brand palettes, or the brand page compositions.
- The source emblem's text and fine detail are not regenerated or retypeset. Transparent outer corners let the CSS stage provide the depth.
- Concept imagery remains clearly marked as concept imagery.
- A passed local build does not itself prove the deployed URL updated; confirm the target deployment and visual checks separately.
