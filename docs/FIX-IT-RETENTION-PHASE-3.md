# Fix It Shop — client continuity and verified operational reporting

Founder authorized the next Katie build phase October 9, 2026. This closes the three-phase premium app build with a focused Insights screen at `/studio/insights`, connected from Today and Clients without crowding the five-item phone navigation.

## Research and plan

Inspected the current main branch, assigned provider permissions, CRM/account linking, appointment completion, calendar revisions and the existing manual booking workflow. Reviewed current Fresha Client Insights and Client Summary documentation: useful client context includes the last appointment, future booking and explicit location/team scope. Reporting must distinguish future booking coverage from realized return visits. Reviewed the Supabase changelog October 9; no relevant dependency/auth/schema upgrade is needed. Consulted installed Next 16.3.5 Route Handlers documentation.

- https://www.fresha.com/help-center/knowledge-base/reports/324-client-insights-report
- https://www.fresha.com/help-center/knowledge-base/reports/331-client-summary-article-1
- https://supabase.com/changelog.md

Build priority: operational facts, a useful manual follow-up list, honest metric definitions, and private server-authorized reads. No new messaging, payment activation, client provisioning, fabricated sales, health inference or AI access to notes.

## Implementation and definitions

Insights supports 30/90 local calendar days ending at the server's current time, assigned-location selection, refresh, request cancellation/order protection, timeout, focus/visibility refresh and retry. Counts come from one SQL statement snapshot; list pagination does not reduce aggregate totals. Private data has no offline/localStorage cache. Failures clear business summaries.

- Completed visits require explicit completed status and an end time already passed. Past confirmed appointments do not prove attendance.
- Clients served count canonical identities with a completed visit at the selected location in the window. Account and CRM records are combined only using explicit saved links; contact-text matching is never inferred.
- Returning clients have an earlier completed visit with this provider before their first completed visit in the selected window. Earlier visits may be at another assigned house.
- Next visit booked is the current percentage of served clients with a future confirmed appointment with this provider, at any house. Empty cohorts show an em dash. This is not same-day rebooking or a realized retention rate.
- Upcoming visits count confirmed starts in the next 30 calendar days at the selected location. Cancelled visits use their scheduled starts within the historical window.
- Completed appointment hours sum scheduled duration for completed visits. They are not payroll, measured labor, revenue or payments collected.
- Without a next visit lists served clients with no future confirmed booking with this provider at any house, oldest last visit first, 30 per page. History and existing manual scheduling links support an informed conversation; the list sends no messages and asserts no outreach consent or default maintenance deadline.

`GET /api/studio/insights` requires verified identity, `studio.read`, `appointments.read`, `clients.read` and server-assigned provider scope. Requested locations must be assigned. Owner authority remains unchanged. Input windows and pages are bounded. No contact details, notes, prices, payment records or sensitive Chair fields are selected. Disabled operating configuration does not hide already recorded history. Legacy null locations use the existing primary-location fallback.

## Verification and acceptance

SQL integration tests cover linked CRM/account deduplication, explicit attendance, cancelled bookings, cross-location future booking coverage, provider exclusion, capability denials, invalid filters, local midnight/DST, empty cohorts, and stable pagination with complete totals beyond thirty clients. The staff browser journey checks real API permissions/no-store, window switching, six widths, queue/history handoff and pagination with an isolated synthetic transport, unavailable state and retry. All browser fixtures are local and refuse hosted credentials.

Local release verification: all 172 tests passed; TypeScript passed; the extended staff browser journey passed at six Insights widths, including appointment/reload/reschedule/cancel, CSV import, unauthorized access, queue/history navigation, pagination, unavailable state and retry. Narrow-phone screenshots were reviewed. Final production build and hosted release checks follow. Hosted Katie sign-in, approved operating setup, actual physical Samsung/iPhone acceptance, payment-backed reporting and live reminder delivery remain separate acceptance/integration work. Completion of this scoped build is not a claim that those integrations are live. No further phase remains in the three-phase premium Katie build.

## Rollback

Revert the release. No migration or data rollback is required; this release adds read-only projections and presentation.
