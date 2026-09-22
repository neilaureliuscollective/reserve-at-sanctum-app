# Phase-one verification

Historical baseline from the original archive. For the September 21 recovered
visual continuation and its current delivery status, see VISUAL-DIRECTION.md.

Verified in this workspace on September 20, 2026:

- All 10 Node tests passed: server-owned pricing, persisted records, simultaneous
  conflicts, idempotent retry, reschedule/cancel, rollback, ownership/provider
  access, stale revisions, buffers/blocks, time limits, production preview
  exclusion, and an abrupt-process-exit persistence regression check.
- `npm run typecheck` and `npm run build` passed with Next.js 16.3.5.
- Chromium desktop (1440px) and phone (390px) walkthrough passed: live WebGL,
  pause/reduced motion, mobile navigation, both brand worlds, booking and sign-in
  return, client records, Katie's appointment book, reschedule/cancel, and rejected
  studio/cross-origin requests.
- The complete walkthrough passed again after the local database reopened.
  PGlite was upgraded to 0.5.8 after the initial version failed that restart check.
  Earlier synthetic data was archived for diagnosis; no real customer data exists
  in the development database.
- Desktop and phone screenshots were visually inspected. Phone content did not
  overflow horizontally; the final booking review shows service, date, time,
  duration, and illustrative total above confirmation.

Historical verification screenshots remain in the preserved recovery archive.
They are treated as generated browser output and are not committed to the
canonical source repository.

Not yet verified: a hosted Vercel deployment, hosted Postgres transactions,
Supabase signup/confirmation/refresh, physical-device Safari, installation on a
phone home screen, or any real operational service menu. Those require hosted
configuration and approved business details. The screenshots do not establish
those capabilities as live.

Original repository delivery: the complete source was committed in that checkout.
The shell had no GitHub credentials, and the connected GitHub integration
returned HTTP 403 (`Resource not accessible by integration`) for a repository
write. The official GitHub repository was not changed. A source ZIP is provided
as the handoff; enable repository write access before syncing this commit.
