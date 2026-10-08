# Legacy Reserve command dock phase — October 8, 2026

## Research and decision

A customer should stay inside one digital ecosystem while moving between worlds. Apple's tab-bar guidance recommends stable destinations, five or fewer primary tabs, and continuity between compact and larger layouts:
https://developer.apple.com/design/human-interface-guidelines/tab-bars

This phase uses five persistent destinations: Reserve, Vitalis, Aethelios, Sanctum and Collection. Aethelios occupies the center. Pathways and account tools belong inside Reserve and the account menu, rather than competing with primary worlds. A compact masthead replaces two inconsistent navigation rows. The dock stays at the bottom on phone, Fold and desktop; labels, selected state, keyboard focus and safe-area clearance remain available.

## Implementation

- Role-aware `/reserve` and `/concierge` entrances let customers reach their tools and founders explore public experiences without changing `/enter` or Studio permissions.
- Account menu provides public homepage and dashboard access, profile, routines, membership, appointments, install help and motion settings. Pilot status moves into this menu, removing competing fixed footer chrome.
- Sanctum has one physical-world entrance, location status, professional selection, approved services and direct booking handoff. Katie's Fix It Shop and Neil's GENT Ascend retain independent identities.
- The directory projects only public provider/service fields from the existing server-authoritative catalog. Unconfirmed locations, disabled providers and closed booking catalogs cannot appear as bookable.
- Service deep links preserve location, provider and service. An unknown provider fails visibly instead of silently offering another provider. Browser catalog and availability reads have bounded loading and retry guidance.
- World-selection actions reveal their destination above the dock. Conversation composition has dock clearance; the dock yields to an observed software keyboard.

## Production readiness observed

Read-only inspection found Eunice planned, disabled and closed for booking, with no published providers, services or provider-location assignments. This build does not invent operational data or activate booking. Katie remains discoverable through her established public identity. The owner must publish actual approved provider assignments, service menus and schedules before customer appointment launch.

## Validation

Run the existing unit/integration suite, typecheck and production build. Browser verification covers the public digital experience, saved member data and isolation, founder preview routes, five stable destinations, provider/service handoff and invalid-provider behavior, plus 320px, 390px, Fold and desktop layouts. Production verification must confirm the exact release and customer navigation before announcing completion.
