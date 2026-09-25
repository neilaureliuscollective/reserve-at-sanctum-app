# Reserve as location #001

## Ownership

| Experience | Owner | Reserve responsibility |
| --- | --- | --- |
| Men's salon service and Chair | Katie / Fix It Shop | Discover, book, manage visits and consented preparation at this location |
| Products, grooming direction, performance, wellness, LifeOS | Neil / Gent Ascend Collective | Introduce the independent company and offer an optional link |
| Physical setting | Katie and Neil together | Arrival, location details and the in-person connection |

The booking engine remains in this app for Katie's first pilot. This decision
does not transfer ownership of Katie's service to the Reserve brand. Do not
move the booking engine into the unfinished Gent Ascend LifeOS as a launch
dependency. Future Neil appointments at this location need approved services
and a provider scope of their own before being listed.

## Phase delivered here

- Public Reserve pages describe a shared physical location and separate
  businesses. Katie's booking and Chair routes are retained.
- The Reserve grooming Blueprint is a stated-priority intake, not a facial
  scan. The camera imitation is removed and new saves do not mark a scan done.
- A fixed external link opens Gent Ascend's stable production origin. No
  Reserve record, user ID, session or return token is sent in the URL. Gent
  Ascend does not currently have a dedicated Reserve return route.
- Reserve's account page identifies visit, Chair and intake information as
  Reserve-owned. A second sign-in may be needed in the Gent app.

## Dependencies before Katie can use real booking

1. Determine whether the old Reserve Supabase project
   `wfbiytzlaokchfaxgwtt` still exists under another owner and whether it
   contains records. The connected account cannot access it. The production
   availability endpoint currently returns 503 with a pooler tenant error.
2. Decide whether to recover that project or, after a data audit, deliberately
   use a dedicated or shared project. A shared Auth project can mean one
   account record but does not merge installed-app sessions or private records.
3. Verify intended hosted credentials and actual pooler endpoint; apply
   reviewed Reserve migrations 001–004. Do not use the illustrative local
   catalog or promote the unmerged organization/location migration to repair
   connectivity.
4. Confirm Katie's and Neil's identities and server-assigned roles. Approve
   Katie's actual services, prices, buffers, and hours.
5. Test the full book, view, reschedule, cancel, schedule-block, collision and
   permission journey against hosted Postgres with separate staff and client
   accounts. Install from the stable origin on Katie's real phone.

## Later, separately planned

Build advanced grooming analysis in Gent Ascend once its grooming product is
real. Any migration of old Reserve Blueprint records must be opt-in, bounded
to client-owned grooming fields and revocable. Katie's notes and seven-day
Chair life context never flow into Gent Ascend by default. Shared Auth,
cross-app return routes, account migration, payment, reminders and importing
existing clients need their own reviewed implementation and hosted tests.
