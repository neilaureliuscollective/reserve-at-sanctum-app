# Studio loading fix — October 8, 2026

The founder reported every Studio room remained on “Bringing your work into focus…”. Production schema inspection confirmed the workspace columns exist; Vercel returned no recorded server errors. Authenticated local browser testing exposed an actual module-boundary failure: Visits imports shared Studio permissions, which imported BookingError from server booking logic and pulled node:crypto into the browser graph. Webpack rejected this import; the earlier Turbopack-only build check did not catch it.

BookingError now lives in a small browser-safe module. Booking re-exports the same class, preserving existing imports, instanceof behavior and API status handling. Permissions import only that neutral error class and erased Actor types. No booking rules, authentication, roles, private-record queries or data grants change. Studio retains its existing client navigation.

The shared loading boundary now offers native reload and Schedule links that work before React hydration. Fault injection showed a client-side timer cannot be relied on during an unfinished server stream, so recovery deliberately does not depend on client scripts. It never loops or represents unavailable records as empty results.

Regression verification checks the transitive runtime import graph of shared permissions, every owner/operator Studio room via actual navigation, and a guarded local PGlite stalled-read fixture. The fixture is never imported by app code and rejects production/hosted credentials. Test an unresolved read recovering by native reload before hydration, an independent Schedule escape, and mobile layouts. Both production bundlers must compile without browser node:crypto errors.

Deploy through the existing main-branch process and verify the exact live release marker and private anonymous API guards. No migration, credential change, payment activation or production synthetic account is required. Authenticated production phone-session behavior is not claimed from the signed-out live browser; local authenticated regression covers the room flow.

## Verification

All 108 automated tests passed, including concurrent booking, ownership, shared error identity and the browser dependency guard. TypeScript passed. Turbopack and Webpack production builds passed. Authenticated local owner/operator navigation passed for every permitted Studio room on 390/320px widths, including completion of appointment-book, blocked-time and Chair reads. Fault injection verified native reload before hydration and Schedule escape from a still-pending workspace read. No page errors or horizontal overflow.
