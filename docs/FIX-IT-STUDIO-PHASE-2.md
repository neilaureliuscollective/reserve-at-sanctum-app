# Fix It Shop — Katie’s private Studio, Phase 2

## Outcome and scope

The founder authorized research, planning and execution of the next phase October 9, 2026. Assigned staff now enter `/studio/today` instead of the multi-tool calendar. Katie’s workspace receives her sapphire/obsidian/gold identity across Today, calendar, clients, availability and brand tools. The master owner Command experience remains its existing entrance. A verified Katie staff account sees an Open my Studio link in the customer app. This links to the existing private `/studio` scope; it does not promise a separate installed staff application or shared cookies in all installed contexts.

Today provides assigned-location/date selection, confirmed/completed/cancelled counts, current/next client, chronological agenda, authorized client-history links, and actual available start times for a selected service. Selecting a start opens the existing manual booking form with date/location/service/time prefilled. The server checks availability again on save. Available starts overlap; they are not counted as independent gaps or promised capacity.

Calendar gains previous/next day or seven-day window controls, dated links from Today and client-history links for both contact-only and account clients. Existing revision checks, atomic occupancy, rescheduling, cancellation and message confirmations remain. Client history uses each visit’s actual location timezone. Private Chair notes remain in their existing consented environment; the new day projection selects no notes or contact details.

## Research and architecture

Inspected staff entry/layout/navigation, provider-scope authorization, booking pilot forms/APIs, appointments, client histories, time blocks and existing synthetic browser checks. Consulted installed Next 16.3.5 client-component docs and the previously read React checklist.

- https://www.fresha.com/help-center/knowledge-base/calendar — working-day controls and day/week navigation.
- https://www.fresha.com/help-center/academy/run-your-business/manage-your-clients/lessons/100296 — immediate client context and history.
- https://resources.getsquire.com/new-commander/ — common tasks in bottom navigation and history near appointment actions.
- https://supabase.com/changelog.md — October 9 UTC summary reviewed, including September database changes; no extension, middleware, adapter or schema upgrade required here.
- https://supabase.com/docs/guides/api/securing-your-api — keep private data server-authorized; grants and RLS are separate boundaries.

`GET /api/studio/day` requires verified identity, Studio access, appointment-read capability and server-assigned provider scope. Requested locations must be assigned to that provider; services must belong to it. Parameterized bounded reads return at most 100 entries and an explicit partial-summary notice. Day boundaries use the selected location timezone, including DST. Primary-location fallback preserves historic appointments without a saved location; the existing calendar filter is corrected to use the same fallback. Client-history links and working actions respect capability overrides. Owner authority is unchanged.

Client refresh has cancellation, request ordering, timeout, focus/visibility refresh and a 45s visible-page refresh. Unavailable data clears the previous business summary and offers retry. No private records are stored offline or in localStorage. No new table, privileged function, auth model, paid integration, payment, automated notification delivery or real staff/client provisioning.

## Verification

New integration tests exercise real seeded SQL reads, availability versus occupied/blocked time, legacy-location compatibility, client and other-provider denial, foreign locations, invalid dates, capability denial, suppressed history links, closed-booking preservation and another location’s midnight boundaries.

Extended isolated staff browser journey covers Today, six widths, actual manual-appointment projection, authorized history navigation, slot-to-prefilled-booking handoff, reschedule/cancel/reload, private calendar files, client denial, CSV import and unavailable/retry state. The complete 167-test suite and both the extended staff browser journey and existing customer browser regression passed locally. Synthetic fixtures run only locally, never against hosted credentials. Mobile screenshots are reviewed and adjusted for five-item navigation and long client names.

Production acceptance still needs Katie’s verified staff assignment and approved operating configuration, actual hosted sign-in and physical Samsung/iPhone testing. No pilot-ready or paid-revenue claim follows from this release. Phase 3 remains retention and verified business reporting.

## Rollback

Revert the release to restore the previous staff calendar entrance and styling. No migration or data rollback is needed; existing appointments, contacts, settings and private notes remain intact.
