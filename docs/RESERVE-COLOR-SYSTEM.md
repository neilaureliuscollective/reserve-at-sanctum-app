# Reserve petrol and metal refinement — 2026-10-05

## Audit and plan

The app uses native CSS, not Tailwind. Root variables were competing with hard-coded petrol, navy-black, warm gold, and role-specific Studio values across 18 stylesheets and the Command CSS module. Gold was functioning as a default typography hierarchy. The current production main is 04d382c; the approved Studio continuation exists on codex/reserve-studio-phase-2-recovery and has not reached production.

Execution: consolidate semantic tokens; normalize shells and materials; preserve layouts and server authority; apply to booking, Chair, auth, customer/profile surfaces and role-specific Studio; replace routine gold text with neutrals; verify phone and desktop; publish only the visual main delta. Carry the same refinement on the existing Studio branch so its future merge retains the palette.

## System

- Signature petrol #12373A; deep petrol #081719; obsidian #090B0B.
- Intermediate #163E43 remains a named token. Neutral surface/raised/glass, text, borders, focus, shadows and functional-state tokens are shared.
- Gold #C4912F and champagne #D9B568 are reserved for identity, icons, fine selected edges and premium actions. Static directional metal has no animated shine. Bronze is a shadow token, never small body text.
- Routine headings and emphasized titles are light neutrals. Explicit identity text uses supported background clipping with solid, forced-color and increased-contrast fallbacks.
- Buttons share default/hover/press/focus/disabled treatments; existing loading labels remain. Primary petrol, secondary architectural, ghost and danger styles are available. Cancellation confirmation uses the danger variant.
- Controls have readable borders; mobile text fields use 16px to avoid iOS input zoom. Safe-area spacing, minimum touch areas, dialog viewport limits, reduced motion and reduced transparency are supported.
- Gent Ascend's independent green world remains distinct. Existing photography, logo geometry and installed raster icons are preserved; PWA chrome colors are aligned.
- No permission, booking, authentication, API, schema, or production-data changes.

## Research translated into design decisions

- Apple dark mode and materials: distinguish base/elevated surfaces and use materials to preserve hierarchy rather than decoration. https://developer.apple.com/design/human-interface-guidelines/dark-mode and https://developer.apple.com/design/human-interface-guidelines/materials
- W3C text and component contrast: text target 4.5:1; visible controls/focus target 3:1. https://www.w3.org/WAI/WCAG20/Understanding/contrast-minimum.html and https://www.w3.org/WAI/WCAG21/understanding/non-text-contrast.html
- MDN text clipping and forced colors: explicit fallback instead of transparent text without an accessible alternate. https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/background-clip and https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/forced-colors
- Hospitality/automotive reference review: restrained hierarchy and immediate readability; no brand imitation or IA changes. https://www.fourseasons.com/ and https://media.mercedes-benz.com/en/article/e26bbac4-2006-4b52-a148-a3b39c72582d

## Validation

- Main: production build, TypeScript, all 35 existing tests pass.
- Studio continuation: production build, TypeScript, all 46 existing tests pass.
- Browser: 40 loaded route/viewport checks at 320/390/430/1440, public booking/Chair/sign-in/home plus owner and Katie Command/Build/Content/Operations. No horizontal overflow or page errors. Inspected booking, Chair, sign-in and owner screenshots. Synthetic local identities only.
- Primary/secondary/muted text contrast across obsidian/deep petrol/petrol/raised is at least 11.20/8.46/6.06:1 respectively. Gold's darkest typography stop is at least 4.55:1; control-border minimum 3.14:1. This is token verification, not a full WCAG certification.
- git diff --check passes. No lint script/tool is configured in the repository; no lint pass is claimed.
- Agent-browser CLI could not start its daemon; the installed Chromium/Playwright browser supplied the checks instead.

## Remaining verification

Physical iPhone/Samsung installed-PWA display, open-keyboard behavior and direct sunlight require real-device review. Existing raster icons/photography were not recolored. Recent Studio functional work still requires its own deployment/migration review; its visual refinement is saved on its existing branch.
