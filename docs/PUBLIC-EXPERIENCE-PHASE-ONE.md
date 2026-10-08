# Public Experience — Phase One

## Problem and result

The arrival sent anonymous visitors to `/home`, a member workspace. The public brand story lived on `/explore` and Vitalis was absent from primary navigation. The new `/discover` page is the public homepage. The original arrival remains intact, but entering it now opens `/discover`; returning authenticated users retain their role-aware dashboard destination.

Story: original hero → house → Katie and Neil → Vitalis → collection → interactive Compass → membership and concierge. The public navigation names Home, Grooming, Vitalis, Collection and Membership. Existing member navigation stays intact on member screens. Studio and member screens expose “View public website”; public browsing exposes “Return to dashboard” through the existing role-aware `/enter` route. Browsing never logs the visitor out.

## Visual implementation

Distinct local concept assets for architecture, Katie’s craft, Neil’s ritual and product chamber. Scroll drives camera translation/scale, architectural panels, Vitalis sphere tilt and product movement through one passive requestAnimationFrame director. The Vitalis instrument is procedural CSS geometry, not a diagnostic display. Native scrolling remains intact. The touch Compass changes its entire image, color, rings, description and destination while keeping the action in the current viewport. System reduced motion and the existing Still preference stop movement without removing content or destinations.

No new generated imagery. Product concepts identify previous packaging. The founder’s latest name, Obsidian Noir, replaces the oil’s display name while preserving the existing internal concept ID. No inventory, pricing, clinical service, account permissions, billing or booking business logic changes.

## Research grounding

[Aman wellness](https://www.aman.com/wellness) and [Six Senses integrated wellness](https://www.sixsenses.com/en/wellness-spa) present wellness as a named, discoverable destination in a larger hospitality experience. The applicable design choice here is an unmistakable Vitalis destination with clear current availability, distinct from future clinical access.

## Validation

- Production build and TypeScript.
- 137 existing tests, including appointment ownership, concurrency, permissions and Vitalis account isolation.
- Browser verification at 320, 390, 884 and 1440 pixels: no horizontal overflow, three Compass states with visible destinations, reduced motion, arrival route and JavaScript errors.
- Visual review of actual rendered mobile scenes.

## Remaining elevation

Phase Two: extend the visual language and shared navigation through the connected Grooming, Vitalis, Collection and Membership pages; replace previous product packaging when approved assets exist.
Phase Three: production journey acceptance on the founder’s devices and configured commerce/clinical activation only when the corresponding approved external setup is ready. Public visual completion does not activate appointments, subscriptions or clinical access.
