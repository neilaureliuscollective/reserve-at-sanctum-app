# Katie’s phone pilot — September 22, 2026

## Focused inspection and plan

The existing engine already protects concurrent reservations and buffers, client
ownership, staff provider scope, revision-safe changes, and persistent history.
The Chair and Neil’s Mirror share the same verified Reserve account.

This phase adds provider-scoped time blocking, a secure staff provisioning tool,
and a phone setup route. It does not replace the booking engine or visual brand.
The separate homepage and logo branches remain untouched; merge them deliberately
with this branch before publishing a combined release.

## Research decisions

- [Supabase users](https://supabase.com/docs/guides/auth/users): editable user
  metadata cannot grant privileges. Provisioning matches BOTH confirmed email
  and user UUID in the same database’s auth.users, then assigns the server-owned
  Reserve role. No second authentication service, shared password or public
  staff-registration endpoint.
- [web.dev installation](https://web.dev/learn/pwa/installation): phone installation
  varies by browser, and iOS installed sessions can be separate. `/setup` gives
  real instructions rather than a fake universal install button. Private data
  remains online-only. Home-screen installation is not native App Store delivery.
- Blocks use the existing unique occupancy ledger, so a block and simultaneous
  reservation cannot both occupy the same interval. Failed blocks roll back fully.
  Only Katie’s assigned staff and the owner may manage Katie’s blocks. No personal
  reason is collected or exposed to clients; only unavailability affects slots.

## Hosted pilot checklist (required before calling it phone-ready)

1. Use the canonical repository and a dedicated protected HTTPS Vercel preview.
   Set DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL,
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, APP_ORIGIN; turn RESERVE_DEV_PREVIEW off.
   Never enable synthetic login or embedded storage in production.
2. `npm run db:migrate` against that intended database. This includes migration
   003, adding private reserve_blocks and a cascading block_id on occupancy.
3. Configure Supabase provider credentials and allow `/auth/callback` for the
   exact preview origin. Verify actual login on that origin; local login tests
   cannot verify provider setup. Katie signs up/signs in with her own account.
4. From a trusted server terminal, after verifying UUID and confirmed email:

   ```sh
   npm run staff:provision -- <Katie-UUID> <Katie-confirmed-email> staff --confirm-verified-account
   npm run staff:provision -- <Neil-UUID> <Neil-confirmed-email> owner --confirm-verified-account
   ```

   No email is sent. No catalog is silently enabled. This requires server access
   to auth.users and an existing Reserve user from an actual app sign-in.
5. Insert/approve actual pilot services, prices, durations, buffers and hours.
   Existing local illustrative services are not an approved operating menu.
6. Open `/setup` on Katie’s phone, install from her regular browser, reopen the
   icon and verify her own studio access. Use separate client and staff accounts.
7. Create a test appointment, verify it from both accounts, reload, reschedule,
   cancel. Block time, verify no client availability there, remove the block.
   Check Chair sharing/revocation and confirm a client cannot access studio data.
   Test simultaneous requests against hosted Postgres as well as local tests.

## Limits

No SMS/email reminders, payments, calendar sync or public launch is implied.
Recurring hours and the service catalog still require trusted configuration;
this phase’s self-service schedule controls are one-day blocks in 15-minute
steps. Password recovery and appointment completion/no-show tracking remain
follow-up work. Block records retain creator/time for service administration;
removing a block releases only its own occupancy, never appointment occupancy.
Upcoming block list is capped at 200. No patient or clinical data is collected.

## Local verification

- 19 automated tests pass, including booking conflict/ownership, Chair privacy,
  block-versus-book concurrency, rollback, permissions, restoration and validation.
- TypeScript and production build pass; no new dependencies. This repository has
  no configured lint command. `git diff --check` passes.
- `npm run verify:pilot` passes at 320, 390, 540, 768, 884 and 1440 pixels:
  client denied studio data, staff creates/reloads/removes a block, wrong-origin
  mutation rejected, no horizontal overflow or console errors, reduced-motion
  setup route. Mobile studio screenshot visually reviewed.
- Real Supabase provisioning, OAuth, hosted database and physical phone installation
  are not verified without the intended hosted configuration. These are release
  gates, not features represented as already working.
- Existing `verify:browser` regression also passes with the available Chromium:
  desktop/mobile visuals, Mirror and navigation, client sign-in return, saved
  booking, Katie view, reschedule/cancel, authorization and origin rejection.
