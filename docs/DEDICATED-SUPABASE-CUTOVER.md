# Dedicated Reserve Supabase cutover

Target project: `wffmdiszikhmkmoiorac`.
Production origin, verified from Vercel project domains: `https://www.reserveatsanctum.app`.
The apex `https://reserveatsanctum.app` redirects to that origin.

## Cutover prerequisites — do not merge/deploy this fix before these are ready

The production client previously ignored environment variables and selected a
hardcoded old project. The fix reads `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, retaining the existing anon-key fallback.
Both public variables have been configured for Production, Preview and Development.
No unrelated environment variables were removed.

**A publishable key is insufficient for the database.** The application uses
server-side Postgres (`DATABASE_URL`), not a Supabase service-role/secret API key.
There is no service-role environment variable required by this checkout.
The existing sensitive `DATABASE_URL` could not be recovered or verified, and
must not be assumed to point to the new project. No migrations have been run.

1. In the new Supabase project, click **Connect**, select the **Transaction
   pooler**, and copy the Postgres URI. Fill in the database password privately.
   Use the actual pooler host/region shown there, port 6543, and the username for
   this project. Do not guess a region or reuse the old project's password.
2. In Vercel → reserve-at-sanctum-app → Settings → Environment Variables, set
   server-only `DATABASE_URL` for the intended environments. Keep it sensitive.
   Do not put it in a `NEXT_PUBLIC_*` variable or commit it. For Preview and
   Development, only use this same database if sharing production data is intended.
3. Apply `migrations/001_core.sql`, `002_chair.sql`, `003_studio_blocks.sql`,
   then `004_command_center.sql` to the **new** project's SQL Editor. Alternatively,
   run `npm run db:migrate` with its private `DATABASE_URL` securely supplied.
   These authoritative migrations define 14 tables, indexes, constraints and
   RLS on every table. They deliberately add no browser-access policies.
   Do not run `preview:reset` or seed synthetic users in the hosted project.
4. Set Production `APP_ORIGIN=https://www.reserveatsanctum.app`.
   Preview/Development must use their own exact origins: `mutationOrigin()`
   rejects mismatched origins. Keep `RESERVE_DEV_PREVIEW=false` for hosted use.
5. Supabase → Authentication → URL Configuration:
   - Site URL: `https://www.reserveatsanctum.app`
   - Redirect URL: `https://www.reserveatsanctum.app/auth/callback**`
     (includes the existing `next` query parameter).
   - Add each trusted preview origin's `/auth/callback**` separately if needed.
     Do not allow arbitrary external origins.
   Email signup sends `/auth/callback?next=%2Fenter`; social auth constructs
   the same route using the browser origin. The callback exchanges the PKCE code
   and uses a sanitized local destination. Enable/configure Google and Apple
   providers separately if those existing buttons should be used. Inspect the
   new project's email-confirmation template/PKCE confirmation flow and test
   a real confirmation email; that configuration was not accessible here.
6. Merge the configuration PR into `main`, let the normal Vercel Git production
   deployment finish, and verify the canonical production domain. Do not promote
   an unrelated feature branch.

## Existing foundation (no invented duplicate systems)

- Core: users with client/staff/owner roles, providers, services, appointments,
  atomic occupancy, preview sessions, audit, grooming profiles / saved Mirror.
- Chair: profiles, consented expiring context, Katie's private notes, aggregate funnel.
- Studio: schedule blocks and occupancy block references.
- Command: scoped workspace items for Reserve/Fix It/Gent lanes.
- No authoritative Supabase Edge Functions, storage buckets, custom RPCs,
  database triggers, standalone membership/product tables, or live catalog seed
  were found in this checkout. Existing product presentation is not a reason
  to invent database tables. Supabase supplies its own Auth infrastructure.
- Hosted migration does not seed staff identities, services, prices or hours.
  Approved offerings must be configured through the existing setup workflow.

## Neil and Katie

After the database and Auth setup are complete, each person signs up through
`/signin`, uses their own password (minimum 12 characters), confirms their email,
and signs in to Reserve once to create their `reserve_users` row.
Use the existing secure provisioning command with each verified UUID/email:

```
npm run staff:provision -- <Neil-verified-UUID> <Neil-email> owner --confirm-verified-account
npm run staff:provision -- <Katie-verified-UUID> <Katie-email> staff --confirm-verified-account
```

Supply the new `DATABASE_URL` privately to this trusted local process. The command
verifies confirmed `auth.users` accounts; Katie maps to provider `katie`, disabled
until reviewed. No credentials or identities should be fabricated. Sign in again
and open `/setup` to review offerings/hours.

## Verification still required

This session cannot request deployment URLs or access/manage this external
Supabase project. A build passing is not a live test. Before declaring completion,
check production/PWA loading and entrance recovery, real signup/confirmation/login,
private routes, expected tables and queries, owner/staff/client separation, and
RLS denying anon/authenticated Data API access. All 14 tables must have RLS enabled
with no unintended policies. Verify the new database connection and Auth project
match before enabling bookings. The old production deployment was left unchanged.
