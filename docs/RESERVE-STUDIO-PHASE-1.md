# The Reserve Studio — Phase 1

`/studio` is now the private operating shell. Neil opens Reserve Command; Katie opens Katie’s Studio after her verified account is explicitly provisioned as `operator`. Existing staff remain staff. Clients remain in their own experience.

## Delivered

- Role-aware Today home with a factual business brief, accurate appointment/work counts, next client, operational readiness, review queue and authorized recent activity.
- Quiet Today refresh, mobile navigation and desktop rail; Schedule, Build Room, Clients and Operations share the shell.
- Existing booking, appointment rescheduling/cancellation, Katie blocks and consented Chair are preserved. Schedule now uses server-side day filtering and pagination rather than truncating the visible day to the newest 100 records.
- Build Room is available to Katie. It retains the Reserve/Fix It/Gent lanes, with real accountable user IDs, owner-only visibility, atomic revision checks, owner review, completion/archive and immutable event history.
- Approval applies to an exact revision. Editing approved work returns it to review; normal operational tasks can complete without owner approval. Approval does not execute publishing, outreach or spending.
- Client service history comes from existing authorized appointment data. No new CRM records, free-text appointment notes or private Chair notes are copied into this history.
- Capability defaults and server-loaded overrides govern access. Owner retains full authority, operator sees shared work and assigned-provider operations, staff sees assigned work and provider scope. No editable signup metadata authorizes any action.
- Canonical install help now points to `https://www.reserveatsanctum.app`.

## Database and release order

The additive `005_reserve_studio.sql` migration and browser-grant lockdown were applied to `wffmdiszikhmkmoiorac` during this build. Hosted verification confirmed the existing single owner remained owner, both new tables have RLS, all Reserve browser-role grants are revoked and no browser policies were opened.

The migration extends workspace records and adds only `reserve_user_capabilities` and `reserve_workspace_events`. Legacy name assignments are mapped only when verified database identities are unambiguous. Historical approved items without a recorded approval revision return to review. No users, prices, services, providers or customer data were seeded in production.

`npm run db:migrate` applies repository migrations and now revokes unused browser-role privileges for Reserve tables. The application still queries through server-only Postgres with explicit human authorization; no service-role token is sent to the browser. Verify the server execution role has the required privileges when deploying to a new database.

Katie has not registered in the inspected dedicated database. When she has signed in and confirmed her account, the trusted provisioning script accepts `operator` alongside the existing owner/staff modes. It requires a matching confirmed UUID and email; no credentials or Katie identity have been invented. The provider remains disabled until offerings are approved.

This source branch is prepared for review, rather than silently merged into production. Apply the schema before deploying this branch because the new auth lookup reads capability overrides. Existing production source continues to work with the additive schema.

## Scope and remaining work

The brief is derived from records, not a simulated AI answer. No Aethelios/model calls are activated. Content authoring and actual Aethelios integration are Phase 2; approved service/hours setup and follow-up are Phase 3; Shopify money/inventory signals are Phase 4. Financial data is visibly disconnected; appointment value is never described as collected revenue. There is no permissions editor yet; capability overrides are server-administered records.

Chair continues to use the existing Katie-specific consent model. Another provider must not inherit Katie’s private notes merely because provider support is generalized later. Future AI adapters must exclude private Chair notes, emotional context, appointment free text, other users’ chats and personal founder memory.

The security advisor reports the expected informational “RLS enabled/no policy” notices for this server-only architecture. It also reports a pre-existing Auth setting: leaked-password protection is disabled. This build does not change account-security settings. Reference: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.

## Verification

Domain coverage checks owner/operator/staff/client boundaries, capability denial, guessed/private item IDs, provider scope, owner-only approvals, revision conflicts, approval invalidation, routine task completion, counts beyond page caps, Chair exclusions and browser-grant revocation. Existing booking concurrency/ownership and Chair consent/expiry tests remain part of the test suite.

`npm run verify:studio` runs an isolated synthetic browser journey: both homes and five rooms at 320/390/884/1440 widths; shared capture, owner review, approval invalidation, stale edits, client denial, and JavaScript errors. The verifier refuses hosted database/auth credentials. `scripts/local-browser-offline.cjs` suppresses optional Next.js version/telemetry calls only in local verification; it is not product runtime code.

Local browser checks do not establish a live authenticated device journey. Owner account, Katie’s eventual verified account and canonical-domain mutation behavior must be checked after deployment. There are no approved live providers/services in the current database, so the hosted home should show the readiness state.

### Completed checks

- Studio browser journey passed for owner/operator rooms at 320, 390, 884 and 1440 px, including shared creation, owner approval, approval invalidation, stale edits and client isolation.
- Existing pilot browser journey passed: client/staff boundaries, blocks creation/persistence/removal, origin checks, six responsive widths and reduced-motion setup.
- Existing Chair browser journey passed: client/account/studio, consent/privacy, keyboard, responsive layouts and reduced motion.
- Hosted schema checks passed: owner role preserved, operator allowed by the role constraint, new tables have RLS, no browser policies opened, and no remaining anon/authenticated table grants.
