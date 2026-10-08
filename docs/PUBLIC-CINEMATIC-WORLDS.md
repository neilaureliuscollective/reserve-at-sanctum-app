# Legacy Reserve — public cinematic experience

The customer website lives at `/discover`. Member Home (`/home`) and private
Studio (`/studio`) keep their existing role and data boundaries. Signed-in
founders can use **View public website** above their dashboard and return through
`/enter`, which resolves the verified account's destination.

## Scene storyboard

1. **Arrival:** retain the existing hero, crest and partner identities.
2. **The house:** a native-scroll camera moves through layered door frames;
   shutters recede and the floor advances. The purpose and Eunice entrance stay
   readable throughout. Existing architecture imagery remains labeled concept.
3. **Grooming:** Katie's blue/gold craft environment and Neil's green/gold ritual
   environment use distinct existing imagery and deeper camera movement.
4. **Vitalis:** a bespoke CSS/SVG observatory with intersecting meridians, a
   dimensional core and a horizon plinth. Scroll changes camera and orbit
   orientation. The free wellness pilot is the primary action; diagnostics and
   clinical partnerships remain explicitly planned.
5. **Collection:** an architectural arch, light, plinth and floating product.
   Selecting a product changes its object and accessible description. Obsidian
   Noir retains explicitly labeled previous-packaging concept imagery.
6. **Compass:** Grooming, Vitalis and Collection each swap their architecture,
   object, palette and destination. Selection centers the entire stage on mobile
   so the resulting action stays within the current viewport.
7. **Membership and concierge:** introduce belonging and Aethelios. Public
   membership at `/discover/membership` is independent of private account
   records, so a founder can explore it without a Studio redirect.

## Implementation

Public marketing pages are statically rendered. No new database query, service,
price, entitlement, paid enrollment, synthetic user or clinical result is added.
The public scene controller batches scroll updates with requestAnimationFrame;
scrolling remains native. No video download or additional rendering library is
required. System reduced motion and the saved Still preference both flatten
sticky sequences and disable camera transforms.

## Verification

`CHROMIUM_PATH=<available Chromium> node scripts/verify-public-experience.mjs`
starts an isolated local production server. It checks 320×780, 390×844,
390×660, 884×900 and 1440×1000: document overflow, all Compass selections and
visible actions, product selection, actual scroll-driven camera changes, manual
Still/system reduced motion, public Vitalis and membership navigation, image
loading and browser runtime errors. Screenshots are written to ignored artifacts.
Run `npm test`, `npm run typecheck` and `npm run build` for app regression checks.
