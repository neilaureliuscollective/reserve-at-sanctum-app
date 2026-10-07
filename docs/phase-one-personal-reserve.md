# Phase One: Personal Reserve and member Aethelios

Status: implementation prepared for review. Production release and hosted migration are separate, unexecuted steps.

## Member experience

Legacy Reserve is the digital ecosystem. Legacy Reserve Sanctum is the physical destination. The approved green, obsidian, gold, typography, seals and arrival scene remain. Arrival copy now introduces presence, performance and wellbeing without limiting the master brand to men.

Four primary destinations: Reserve (`/home`), Pathways (`/pathways`), Sanctum (`/visit`), Collection (`/shop`). Aethelios is accessible from the header. Membership, personal preferences, booking, The Chair and account management remain in the menu and relevant contextual links. Staff still enter `/studio`.

Personal Reserve foregrounds one saved priority and a short routine, then existing visit continuity and membership. Pathways supplies editable foundations for presence, performance and wellbeing. Members must explicitly save a proposal. They can edit or clear their routine. Revision checks reject conflicting updates. Clearing erases title/steps while retaining a revision tombstone to prevent a stale tab recreating deleted content.

Sanctum reads authoritative location and booking status. Candidate cities are not advertised as confirmed openings. Existing service, provider, appointment and preference records retain their internal identifiers. Published commerce remains a concept collection; no checkout, discount or inventory is fabricated.

## Aethelios architecture and privacy

`@aethelios/concierge-core` is a dependency-free package authored in the existing private Aethelios repository at `packages/concierge-core`. The consumer vendors the exact package at commit `7405ebf87625291b25cece7365c2cf44db9843c1`. `vendor/aethelios-concierge-core/provenance.json` and tests verify each SHA-256 digest. This avoids private repository credentials in deployment and avoids a separate personality implementation.

This is shared intelligence source and capability contract, **not** a connection to private founder memory, account federation, or a shared runtime. No Council, agents, private operating-system features, staff notes or Chair context are imported. Future runtime federation needs a dedicated scoped member gateway and its own review.

`POST /api/aethelios/member` verifies the current customer session on the server, enforces same-origin JSON, bounds streamed request bytes, rejects unknown fields and rate-limits each member to six requests per minute. No client-supplied user or tenant ID is accepted. Owner/operator/staff roles cannot use member tools as customers.

Common intents use deterministic tools:

- Membership: actor-owned membership and captured privileges; effective dates, paused access and closed locations remain authoritative.
- Appointments: actual published operational catalog and availability; explicit location/service/date confirmation; booking URL handoff. No concierge booking write. The existing booking transaction revalidates the time and requires confirmation.
- Routines: a general foundation for review and saving through Pathways; no AI automatic persistence.
- Collection: truthful concept discovery and current checkout/member-price status.
- Wellness: static educational guidance and provider boundaries. Emergency and other clinical language is routed away from general conversation. No medical intake, diagnosis, treatment, lab interpretation, dosing, partner claims or referral commissions.

Conversation turns exist only in component memory; no transcript table, localStorage or sessionStorage. They clear on leaving/reloading. Durable routines are separately account-owned. When optional general AI is enabled, only the message and explicit minimal projection of the member's own routine/priority are sent. The UI explains this and asks members not to provide sensitive medical information. Provider requests specify `store:false`; this is not a claim of provider-wide zero retention or medical compliance.

## Optional model costs

Verified tools and templates require no model calls. General conversation remains disabled unless server-only `OPENAI_API_KEY`, `RESERVE_CONCIERGE_MODEL` and both exact current per-million token prices are configured. The existing staff assistant's configuration is unchanged.

The consumer reserves conservative estimated maximum cost before dispatch, using UTF-8 input bytes plus framing allowance and a 600-token output cap. Atomic tenant-then-member updates enforce monthly admission ceilings across instances. Defaults are 200 cents/member and 2,500 cents overall; these are configurable operational limits, not a researched service price or membership inclusion. Current provider prices must be supplied and kept current for the configured model.

The provider has a 15-second timeout and no automatic retry. Verified usage settles a reservation once. Unknown/failed calls retain the full reserved amount. The ledger stores model, counts, cost, time and status, never prompts or responses. A crash leaves an accounted reservation. Reservations and pricing are conservative billing estimates, not a replacement for provider-side usage alerts. If provider usage exceeds the estimate, reconciliation records the actual amount and later admissions stop when the ceiling is reached.

## Database and deployment

Additive migration: `migrations/20261007230000_personal_reserve.sql`.

| Table                       | Purpose                                           |
| --------------------------- | ------------------------------------------------- |
| `reserve_member_routines`   | Private saved priority and short editable routine |
| `reserve_concierge_rate`    | One rolling minute bucket per customer            |
| `reserve_concierge_budgets` | Monthly per-member and tenant cost admission      |
| `reserve_concierge_calls`   | Prompt-free reservation and usage accounting      |

All four tables enable RLS with no browser policies and revoke PUBLIC privileges. Existing `scripts/migrate.ts` runs the repository's server-only lockdown across reserve tables, including anon/authenticated grants. Application authorization remains mandatory because server SQL is privileged.

No hosted migration, production environment change, membership grant, model activation, commerce activation, deployment, domain change or private-memory connection was performed during implementation.

For a separately authorized release:

1. Review both draft changes and confirm the pinned shared package source.
2. Back up the hosted database and apply the additive migration using the existing migration/lockdown procedure. Verify RLS and no browser grants on the four tables.
3. Deploy the consumer code through the existing release process. Keep optional member model disabled initially.
4. Verify real customer authentication, routine isolation, membership truth, location closure and existing booking/Chair/staff functionality. Do not create synthetic identities in production.
5. Configure optional model/accurate rates only after approval and monitor provider usage alongside the internal ledger.

Rollback: redeploy the prior application release and disable the optional model; retain the additive tables for safe recovery. No destructive down migration is required. Do not drop member routines as a rollback shortcut.

## Validation

Completed locally: 97 automated tests passed, TypeScript passed, and the optimized production build passed. All three browser verification scripts passed with no page errors. The new flows were checked at 320/360/390/884/1440 pixels. Shared package: 3 standalone tests passed.

Run `npm test`, `npm run typecheck`, `npm run build`. Domain tests cover actor isolation, role rejection, unknown-field rejection, conflicting saves, clear/resave revisions, clinical precedence, truthful commerce/membership/booking closure, concurrent rate admission, atomic spend rejection, uncertain-call accounting, once-only settlement, and upstream package integrity. Model tests use fake transport and incur no provider calls.

Local browser commands (synthetic preview only):

```sh
CHROMIUM_PATH=/path/to/chromium node scripts/verify-member-foundation.mjs
CHROMIUM_PATH=/path/to/chromium node scripts/verify-membership-operations.mjs
CHROMIUM_PATH=/path/to/chromium node scripts/verify-personal-reserve.mjs
```

The member verification's menu expectation and location label were updated for the approved navigation and Sanctum brand. The new verification covers saved routines, home personalization, cross-account privacy, stale/origin/role/input guards, actual availability links, medical/commerce boundaries, session clearing, and layouts at 320/360/390/884/1440 pixels. Screenshots and logs are local ignored artifacts.

The shared Aethelios package's three standalone tests pass. The private application's full build is not claimed from those package tests; its draft PR changes only the isolated package.

## Clinical education sources

Sources checked October 7, 2026. Wording is general education, not clinician-reviewed personalized advice.

- Endocrine Society, [Hypogonadism in Men](https://www.endocrine.org/patient-engagement/endocrine-library/hypogonadism): provider evaluation, diagnosis and follow-up.
- FDA, [Certain Bulk Drug Substances for Use in Compounding that May Present Significant Safety Risks](https://www.fda.gov/drugs/human-drug-compounding/certain-bulk-drug-substances-use-compounding-may-present-significant-safety-risks): substance-specific concerns; no blanket peptide safety/efficacy claim.

## Deliberately deferred

Paid membership checkout/renewals, actual member prices, product fulfillment, Shopify/Square provider decision, licensed wellness partners and consultation workflows, clinical records, cross-platform identity federation, persistent chat memory, community, wearables and complex progress tracking. This phase creates a coherent foundation for testing recurring member value without prematurely activating those dependencies.
