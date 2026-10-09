# Legacy Reserve app material correction

The previous release changed shared tokens but retained dark green app canvases,
and did not theme the owner's Studio destination. It did not fulfill the whole-app
transformation. This correction gives customer routes and Legacy Studio explicit
theme boundaries and the homepage's material hierarchy.

- Architectural ivory is the dominant reading canvas and white/ivory is used for
  cards, forms, work panels, progress and product details.
- Carbon navigation and brushed steel feature scenes provide depth.
- Imperial Green is reserved for identity type, actions and selected states.
- Gold becomes legible bronze on ivory and champagne on dark scenes.
- Profile and Mirror are included, as are owner work rooms and assistant dialogs.
- Katie's dedicated customer app and private Studio do not receive this theme.
  Founder public worlds also retain their separate identity.

The `legacy-app-theme.css` scope is applied by ExperienceChrome and the Studio
layout. It changes presentation only. Authentication, authorization, appointments,
commerce and account data are preserved. The release is based on the latest main
branch, including the separately published Shopify catalog/cart work.

`scripts/verify-app-materials.mjs` runs against an isolated development server with
synthetic customer, founder and Katie identities. It verifies actual computed
canvas and feature materials, captures route screenshots at 390 and 1440 pixels,
checks overflow and browser exceptions, and checks Katie's theme exclusion.
Synthetic preview mode remains prohibited in production. Existing motion tests
cover route cleanup, streaming, pause/resume, keyboard focus and anchors.

The visual review uncovered a cascade conflict between reading surfaces and dark
feature scenes. Dark scenes are explicitly excluded from the reading-surface rule;
the browser check now asserts both steel backgrounds and ivory foregrounds.

Research basis: Material's semantic color roles
(https://m3.material.io/styles/color/roles), WCAG text contrast
(https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), and web.dev's
compositor-friendly animation guidance (https://web.dev/articles/animations-guide).
