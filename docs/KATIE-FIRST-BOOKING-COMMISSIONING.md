# Katie’s first booking — review candidate and commissioning packet

Prepared October 12–13, 2026. **Not a launch approval.** Work is confined to
`neilaureliuscollective/reserve-at-sanctum-app`. Katie’s independent Fix It Shop,
existing customer app, booking engine, Studio and Founder Command are preserved.
Square remains separate payment after the appointment; completion is not payment.

## Exact review lineage and target evidence

| Item | Verified value / decision |
| --- | --- |
| Main | `e533089b1b283240d46ce4847d631354ded860a9` |
| #65 | `4ca705c3a68ac1ca5e8cfe6bea14741abffdace9`, open draft |
| #67 | `c82ae4682c114e0b8bdf4584078f7e1e1ccf94df`, open draft, parent #65 |
| Parent #68 | `fed033356b87b5213056275a423cee3739cb2667`, open draft, parent #67 |
| This branch | `codex/katie-first-booking-readiness`, based directly on refreshed #68 |
| Review order | #65 → #67 → #68 → this PR. No dependency was merged. Recheck all heads before approval/retargeting. |
| Duplicate-work check | Open PR inventory and #68 body/comments checked before implementation; no newer PR owned this increment. |
| Vercel team | `team_LJpmefIarra3F19Ad9QpGqMx` / `stutes-legacy` |
| Vercel project | `prj_GKN7RVVFAiQfWdTpHT63e0wNydgn` / `reserve-at-sanctum-app` |
| Production | Read-only deployment inspection: `dpl_HttBfcdJqM7d6wV7fE18BQ2km5Bv`, READY, git main at the main SHA above; aliases include `www.reserveatsanctum.app` and `reserveatsanctum.app` |
| Parent review preview | `dpl_7exirQMo656Y3RQK7hsqAzug37gh`, READY, nonproduction. Git integration builds review branches; no production push/promotion authorized. |
| Connected RAS | Prior handoff: `wffmdiszikhmkmoiorac`, unconfigured and missing #67 migration. **Not queried or written by this increment.** |
| Runtime/database mapping | **Unproven.** A connected database is not evidence of the live runtime’s connection. Do not apply anything to RAS on that assumption. |
| Library support | `libfile_3960e365bb408191b5c89984a54ee539` resolved to a 31,109-byte Markdown transfer. Current Library helper failed with `library file transfer failed: download failed`, including one explicitly local retry. No readable bytes materialized; implementation uses the self-contained handoff. |
| Local guidance | AGENTS, README, architecture and phase-one instructions read. No checkout `.agents/skills` directory was available. Installed Next 16.3.8 route/metadata guides reviewed. |

Vercel project read showed no enabled password/SSO/IP deployment protection.
Review previews are noindex, but noindex is not access control. Before any hosted
fixture or client pilot, confirm appropriate preview access controls separately.

## Implementation and operating consequences

- Service duration and buffer accept exact five-minute steps. The approved menu
  is **not seeded, published or repriced**. Existing quarter-hour appointment
  starts and shared provider occupancy remain. Every touched 15-minute unit is
  reserved with ceiling division; `ends_at`, `busy_until` and captured price stay
  exact. A 20-minute visit at 10:00 with zero buffer ends at 10:20, with the next
  grid start at 10:30. A 25-minute visit with a five-minute buffer can end its busy
  period exactly at 17:00. Katie must approve this start-grid behavior.
- Buffers still count toward closing time. No working hours, actual buffer,
  address, cancellation policy or business location is inferred from the menu.
- Initial booking uses the existing client-bound idempotency key and transaction.
  Only `{requestKey, actorId}` enters tab session storage. No note, contact,
  service/time draft or credentials are persisted there. Blocked storage prevents
  submission with a clear explanation. Closing the tab loses the local pointer;
  account history remains the recovery destination before another booking.
- Recovery authenticates the same account and serializes with creation on its
  user row using `FOR NO KEY UPDATE`. Creation includes the pointer’s expected
  account ID and rejects a changed session before booking; the ID never grants
  authority. Legacy API callers without a recovery pointer remain compatible.
  A saved request returns its current snapshot, even after reschedule
  or cancellation. An absent request is durably retired; late original requests
  cannot commit. Only then can the client use a fresh key for changed intent.
  The retired-key table is private under RLS, contains no draft, and must not be
  periodically cleared in a live environment.
- POST/recovery requests have a 12-second client timeout. Timeout/offline means
  **unknown**, never “failed to save.” Submission/editing stays blocked until
  recovery resolves. Reconnect retries recovery; expired sessions expose sign-in;
  account switching cannot settle another account’s pointer. Repeated successful
  reloads show the saved visit until “Book another visit” is explicitly chosen.
- Saved appointment and email are separate facts. Customer copy distinguishes
  queued follow-up, provider acceptance, provider-reported delivery, attention
  and unavailable evidence. Delivery is not a read receipt. Email evidence errors
  never turn a committed appointment into a failed booking.
- Public Chair privacy now matches #68. Katie’s scoped team and consent remain
  authoritative. Platform owners, including forged overrides/provider assignment,
  remain denied. No permission is broadened and no private record is rewritten.
- `RESERVE_KATIE_CALENDAR=glossgenius` is the default hosted calendar decision.
  Public entry and closed booking, including legacy `/book` links, point to
  `https://fixitshop.glossgenius.com/`. Other professionals keep their own scope.
  Public and staff manual creation/availability are gated, including Studio
  calendar openings; no dual native menu is presented. Existing history and
  cancellation remain accessible. No reconciliation/import bypass was added.
  After an approved `native` cutover, an outage offers existing-visit recovery
  and contact guidance, not a second availability claim. Do not reopen GlossGenius
  booking while native appointments remain unreconciled.
- Public canonical metadata is prepared for three public pages only. It requires
  an explicit HTTPS `RESERVE_PUBLIC_CANONICAL_ORIGIN` and Vercel production target.
  Previews have no canonical; private routes inherit none. Global noindex/nofollow
  headers/meta and disallow-all robots remain. No search activation flag was added.

## Schema review and recovery gate

Run `npm run db:migrate` to generate a checksum plan only. It contacts no database.
Historical migration bytes are unchanged. Preserve the generated manifest with
the exact candidate SHA and reconcile it against the intended target’s actual
history, constraints, RLS, grants, runtime role and backups before any application.
The existing runner replays the repository schema; **do not blindly run its apply
mode against an established or unproven target**.

The [complete local checksum plan](verification/katie-migrations.json) and
[readiness output from empty/seeded synthetic databases](verification/katie-readiness-synthetic.json)
are included. Both correctly leave commissioning unverified.

| Additive review item | SHA-256 / required review |
| --- | --- |
| #67 `20261012155107_booking_delivery_and_visit_lifecycle.sql` | `bbcba0826bc2583a347965467692c7cc9f0da4e3ff1924ba5e91926c6897691c` — attendance columns/constraints, delivery evidence and private receipt ledger |
| This increment `20261012232737_katie_booking_duration_and_recovery.sql` | `64bef523e2f3303221cdfe6e43bcad450858b096e5b6e331421cbb83a35ea4a1` — broadens duration/buffer checks from multiples of 15 to 5; adds private retired-request ledger; no catalog/customer/occupancy rewrite |

Before approval, inspect the named existing service constraints and confirm there
are no additional historic constraints that still require multiples of 15. Confirm
all legacy service values satisfy the replacement checks. Review the user-row lock
order against the intended Postgres runtime. Inspect/revoke browser grants through
the existing lockdown tool and separately review runtime SELECT/INSERT privileges
for the retired-request table; do not widen Auth grants for diagnostics.

The automated restore rehearsal creates a synthetic PGlite archive, loads it into
a separate database, compares exact appointment snapshots and verifies retired-key
protection. This is **not** a hosted backup restore. Hosted recovery gate requires:

1. Founder verifies the intended Vercel environment, exact deployed SHA, runtime
   database host/project ref, Supabase Auth URL and callbacks as one mapping.
   Record nonsecret identifiers only; never paste connection secrets in the PR.
2. Obtain an approved backup and record timestamp, source, retention, restore
   procedure and storage-object coverage. Create a separate authorized restore
   target; do not use production or the unproven connected RAS project.
3. Restore into that isolated target and compare schema/history, account and
   appointment totals, exact snapshots, provider scopes, occupancy and private
   grants. Apply only the reviewed delta after baseline reconciliation.
4. Exercise real Postgres multi-session collisions, recovery/book ordering,
   block overlaps, interrupted commit, reschedule/cancel, revocation and restore
   rollback there. Record the exact target/ref/SHA and result, then close access.

No hosted migration, backup, restore, data reset, test fixture or privilege grant
has been performed by this task. Supabase CLI was used only to generate the local
migration filename. No payment processor or Square Bookings migration is included.

### Independent local PostgreSQL concurrency evidence

The added `verify:katie-postgres` script uses only a disposable PostgreSQL 17
container on `127.0.0.1:55439`, with tmpfs data and a unique database per run. It
checks the local Docker socket, image, loopback port and tmpfs before connecting;
it cannot accept a hosted connection string. It removes its database afterward.
It calls the real booking/manual/recovery functions with a linked CRM client.

The prior `FOR UPDATE` user mutex was reproduced as a real `40P01` deadlock:
online held user A then waited on provider P; manual held provider P then waited
for its appointment FK key-share on user A. The corrected `FOR NO KEY UPDATE`
mutex allows that FK lock while remaining exclusive against another request
mutex, as described in [PostgreSQL’s row-lock compatibility rules](https://www.postgresql.org/docs/current/explicit-locking.html).
Both real transactions now commit. Separate sessions and `pg_blocking_pids`
verify book-first and recovery-first serialization (one appointment or a retired
key with zero appointments), plus an independent-account partial-slot collision.
This is stronger than serialized PGlite evidence but does not certify the hosted
runtime, pooler, role grants or backup restoration.

Reproduce in an isolated executor, never against the connected RAS database:

```sh
docker run --detach --name katie-first-booking-postgres \
  --publish 127.0.0.1:55439:5432 --env POSTGRES_HOST_AUTH_METHOD=trust \
  --env POSTGRES_DB=katie_isolated --tmpfs /var/lib/postgresql/data postgres:17
npm run verify:katie-postgres
docker rm --force katie-first-booking-postgres
```

## Katie’s scoped account and catalog decisions

Katie signs into the intended Supabase Auth project and confirms the account email
and UUID through the existing trusted provisioning workflow. Founder verifies
the exact account has only Katie’s `staff`/`operator` provider scope and required
capabilities; never grant platform `owner`. Test wrong provider, unrelated client,
expired session and revoked assignment. Business-owner tenancy is a later design.

The existing readiness command now scopes catalog, address, provider assignment,
hours and staff evidence to Katie and one intended location. It requires the exact
expected account and actual Auth confirmation; a UUID-shaped account or unrelated
provider does not satisfy it. Missing Auth permissions return `accountConfirmed:null`.
`configurationPrerequisitesMet` still does **not** mean live acceptance.

After secure target verification, read-only command:

```sh
# Supply reviewed DATABASE_URL and the confirmed account UUID securely.
# Do not use these as authorization to apply schema or provision accounts.
RESERVE_READINESS_KATIE_ACCOUNT_ID=<confirmed-uuid> \
RESERVE_READINESS_LOCATION_ID=<approved-existing-location-id> \
npm run verify:booking-readiness -- --expected-project-ref=<reviewed-20-letter-ref>
```

Menu supplied in the handoff as publicly verified October 12, 2026 at
[Katie’s service menu](https://fixitshop.glossgenius.com/services), **for Katie’s
confirmation only**. Direct retrieval in this executor was unavailable; no new
verification or permission to publish these values is claimed.

| Service | Price | Exact duration |
| --- | ---: | ---: |
| FIX-IT | $30 | 30 min |
| FIX-IT: JR. | $25 | 25 min |
| FIX-IT: EDGE | $45 | 60 min |
| THE FIX-IT: EDGE+ | $55 | 70 min |
| EDGE+ | $30 | 30 min |
| THE QUICK FIX | $20 | 20 min |

Katie must approve descriptions, distinct service names, every buffer, weekday
hours, address/location and cancellation/no-show policy through the existing
reviewed configuration workflow. Current engine: two-hour customer lead, 45-day
horizon, one daily integer-hour open/close window shared across enabled weekdays,
quarter-hour starts, cancellation before start. Flag any desired exceptions or
differences for a separately reviewed change; do not silently substitute rules.

## Inbox, scheduler, phones and controlled cutover

| Gate | Exact acceptance record still required | Current state |
| --- | --- | --- |
| Sender/inbox | Approved test inbox, verified sender/domain, server-only keys, valid signature, queued→accepted→delivered evidence and actual inbox observation. Bounce, complaint, suppression, delayed response, duplicate/out-of-order event, DB interruption and bounded retry tests. | No real email authorized or sent |
| Worker/scheduler | Keep `RESERVE_BOOKING_EMAIL_ENABLED=false` and `RESERVE_BOOKING_CRON_ENABLED=false`; approve a fresh UTC `RESERVE_BOOKING_EMAIL_NOT_BEFORE`, plan/cadence, cron authorization, duplicate/overlap behavior and backlog review. | Closed; no cron installed |
| Phones | Katie’s iPhone Safari installed app; Android Chrome; Samsung Fold cover/inner screens. Install, launch, sign-in persistence, back/reload, keyboard/screen reader, 200% text, network interruption after confirmation, account/history and calendar time zone, reschedule/cancel, update/reopen. | Physical devices not run |
| Staff pilot | Katie’s verified account: Today/calendar, manual booking, blocks, attendance corrections, client scope and Chair consent/revocation. Founder: safe Command evidence and denied Chair. | Synthetic evidence only |
| Existing calendar | Katie reconciles all future GlossGenius appointments/blocks and identifies the exact calendar of record. No customer export/import or inferred migration. | GlossGenius remains authoritative |
| Cutover | Founder/Katie approve exact candidate SHA, schema baseline/delta/restore, runtime mapping, catalog/rules, hosted and phone acceptance, time window, communication policy and rollback owner. Close old new-booking entry, reconcile final changes, then switch the approved native gate once. | Not authorized |
| Search | Approve public hostname, canonical paths and marketing content separately. Keep previews and all auth/account/Chair/Studio/API paths excluded; review robots, headers and metadata together. | All indexing closed |

First controlled real appointment requires fresh explicit authorization after
these records are complete. A successful test/build or ready preview is not it.

## Verification and rollback

See [verification evidence](verification/katie-first-booking.json) and the review
PR for exact final SHA, checks and screenshots. Browser screenshots contain only
synthetic fixtures. Full tests use isolated PGlite; browser interruption tests
use real local routes/persistence with selective network interception. The fallback
fixture and any mocked attendance evidence are labeled. Hosted/device/inbox
acceptance remains blocked by the gates above.

Before activation, discard/revert this application candidate and leave hosted
systems unchanged. After any future approved use of exact durations or retired
keys, **do not roll back to the old floor-division occupancy or remove fences**.
Close native new bookings first, retain safe occupancy/recovery and private schema,
and repair forward. Preserve saved visits, prices, revisions, consent and messages.
Reverting presentation alone needs no data rollback. Restoring 15-minute CHECKs
would reject Katie’s new catalog; do not round or delete it to force rollback.
Retain #68’s Chair denial in every rollback. Reopening GlossGenius reservations
requires calendar reconciliation and Katie’s approval; it is not an automatic
outage response.
