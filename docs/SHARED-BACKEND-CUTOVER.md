# Reserve booking on the Gent Ascend backend

## Product boundary

The Reserve remains the site and installed phone experience. Fix It Shop is
Katie's service identity within Reserve booking and the studio. Gent Ascend is
the separate LifeOS. One Supabase Auth user can sign in to each app separately.
The Reserve role does not grant LifeOS privileges; Gent's beta or membership
grant does not grant Reserve studio access. No Chair context, studio notes, or
Mirror Blueprint is sent to Gent AI.

## Current block and safe order

1. The former Reserve project `wfbiytzlaokchfaxgwtt` is inaccessible from the
   connected Supabase organization. Establish whether it has any real clients,
   bookings, or Chair data before deciding on record migration. Do not overwrite
   or delete it. Reserve production still points to it until a verified cutover.
2. **Done September 25, 2026:** Reserve migrations 001-004 and
   `ops/shared-project-access.sql` were applied to the Gent project
   `volpzkfsnmtztrovexcw`. This created 14 empty `reserve_*` tables and a
   `reserve_app` role without login. Verified: the role has no direct table
   grants to `persons`, `ai_memories`, or `auth.users`; it cannot bypass RLS.
   No sample provider, hours, or services were inserted. Future migrations
   need to grant this restricted role access to any new Reserve tables.
3. Set a unique password for the `reserve_app` database role in a trusted
   Supabase administrative session, then enable LOGIN. Build its connection
   string by copying the **transaction pooler** host from that project's
   Connect panel, port 6543, and changing only the username to
   `reserve_app.volpzkfsnmtztrovexcw`. Do not guess the pooler hostname.
   Verify the role can operate on `reserve_*` tables and cannot read
   `public.persons`, `public.ai_memories`, or `auth.users`.
4. Configure the Reserve Vercel **Production** environment with that
   server-only `DATABASE_URL`, the Gent project's URL and its publishable key,
   and `APP_ORIGIN` matching Reserve's stable HTTPS domain. Do not put the
   admin connection in Vercel. Update Supabase Auth's allowed redirect list to
   include Reserve's exact `/auth/callback` while retaining Gent's URLs.
   Configure a real Auth email sender before client signup; the default SMTP
   only sends to organization team addresses.
5. Deploy only after the new database connection and grants pass live queries.
   Neil signs in with his existing Gent identity. Katie signs in with her own
   verified identity. Reserve creates a client-scoped `reserve_users` row on
   first sign-in. Run `staff:provision` with a temporary, trusted
   `ADMIN_DATABASE_URL` (the Gent project's **session pooler** URL with the
   `postgres.<ref>` user) to assign Neil `owner` and Katie `staff/katie` after
   independently checking both UUID/email pairs. Remove the temporary admin
   URL immediately. Do not assign roles based on email strings or metadata.
6. Katie approves actual services, prices, durations, buffers and operating
   days/hours before enabling her provider or accepting live bookings. Test
   separate owner/staff/client accounts on actual phones: sign-in and install,
   book/view/reschedule/cancel, competing booking requests, staff blocks,
   no client studio access, Chair consent/revocation, Gent AI isolation, and
   return links. No automatic sharing of sessions or private data.

The shared project currently creates a Gent `persons` and free
`membership_accounts` record for each Auth signup. That is an identity/profile
side effect, not a paid entitlement. A Katie LifeOS beta grant is an independent
decision and should be provisioned through Gent's access controls; Reserve
staff roles never change those controls.
