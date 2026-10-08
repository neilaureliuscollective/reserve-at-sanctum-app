# Legacy Reserve

Official repository: neilaureliuscollective/reserve-at-sanctum-app.
Read README.md and docs/ARCHITECTURE.md before changing architecture.
Next.js 16: consult installed node_modules/next/dist/docs for relevant APIs.
The public master brand is Legacy Reserve. Reserve at Sanctum is retired from
customer-facing identity. Physical houses use Legacy Reserve — Eunice (first
operating location), with Lafayette, Austin, and Dallas planned. Do not hard-code
the product around a single city.
Preserve Neil + Katie / Fix It Shop × GENT Ascend Collective. No Recovery Room.
Legacy Reserve uses heritage green, obsidian and dimensional #C4912F gold.
GENT Ascend remains its own deep-green world. It is a men's grooming house,
not the separate digital-infrastructure company.
Katie is a men's salon professional; no barber language or imagery.
Never enable developer identities or embedded development storage in production.
Appointments and permission checks are server-authoritative. Test simultaneous booking and ownership whenever modifying the core.
Keep generated concept images labeled. Never invent live services, prices, results or contact details.
Do not rename reserve_* tables, env vars, or production domains without an
explicit data-safe migration. Public copy matters more than internal identifiers.

## Digital ecosystem direction (Neil, 2026-10-08)

Legacy Reserve is a DIGITAL company and personal ecosystem. Sanctum is its
optional physical destination; Fix It Shop and GENT Ascend retain independent
worlds within it. The public introduction must lead with useful digital Presence,
Performance, Vitalis and Aethelios experiences from anywhere. Do not use the
physical house or a Louisiana location as the master product narrative.
The October 8 transformation explicitly supersedes preservation of the old
physical Arrival hero. Public previews must remain usable while signed in as a
founder and must not display fabricated personal data or promised integrations.
See docs/DIGITAL-ECOSYSTEM-TRANSFORMATION.md for the current direction.

## Reserve homepage cinematic standard (Neil, 2026-09-23)

The current post-hero homepage is a failed visual baseline, not an accepted design target.
Neil specifically rejects repeated cropped placeholder images, compressed layouts, flat
rectangular cards, hover-only depth, a mostly static Compass with tiny ring movement,
and scroll effects that only fade or lift text into place. Do not present a minor CSS
polish of these elements as a cinematic rebuild.

For the next homepage build, storyboard and implement distinct scroll-controlled scene
transitions with spatial depth, changing environments, purposeful camera/object movement,
generous negative space, and materially dimensional interactive surfaces. A Compass
selection must visibly transform its scene and show the resulting path within the
current mobile viewport; it cannot depend on hover or a result below the fold.
Different sections need bespoke, art-directed environments rather than repeated crops
of one triptych. Make mobile and Fold cover states first-class. Preserve the Legacy Reserve heritage-green/obsidian/gold palette,
Katie's blue/gold identity, Neil's green/gold identity, and all booking/auth business logic.
Verify the actual interaction and scroll experience on narrow mobile before claiming
the cinematic work is complete; a passing build alone does not meet this standard.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
