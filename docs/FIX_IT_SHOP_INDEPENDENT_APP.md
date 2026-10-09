# Fix It Shop independent application — implementation and release plan

## Evidence recovered on 9 October 2026

Repository: neilaureliuscollective/reserve-at-sanctum-app, inspected main commit 1aeafea2324fdac690a0111b1d80433bea0127d1. Legacy Reserve production remains www.reserveatsanctum.app. No independent Fix It Shop Vercel project was found during the initial inspection.

Existing functionality includes Katie's branded customer booking world, official crest icons (180/192/512), appointment availability and transaction conflict protection, client booking/reschedule/cancel, provider-scoped Today/calendar, manual appointments, client history, availability blocks, and Chair consent controls. The approved gold architectural phone symbol and existing blue/gold direction are reused; the text-bearing marketing crest remains separate. Concept images are not treated as approved new branding.

RAS App Supabase project wffmdiszikhmkmoiorac is available. All 52 public application tables have RLS enabled with no browser grants; application data is accessed through authenticated server-side Postgres. An owner exists, but there were no Katie provider, provider-service, client, or appointment rows at inspection. Eunice booking is disabled. A table's presence does not establish a functioning operating business.

Before publishing, upstream main advanced eight commits to 2add29cc541606cc851e4cf43d6630905aa04323. Its cinematic Katie homepage, explicitly approved text-free steel/gold phone symbol, material refinements and Shopify cart source are preserved. Shopify source presence does not establish configured POS or tested live payments.

## Architecture selected

Use a separately deployed Next application at apps/fix-it-shop in the existing repository, with shared tested scheduling modules and selective generated route imports. The independent Vercel project builds from this directory, installs dependencies from the repository root, and permits source imports outside its root. The preparation script copies allowed route source during build; generated directories are ignored. It excludes Legacy owner commerce, membership, content, and AI tools.

This avoids both a source-code fork and a risky domain-based brand switch in the parent deployment. A separate repository is unnecessary for this milestone. Future extraction to workspace packages is possible if the applications develop different release needs.

NEXT_PUBLIC_APP_EDITION is fixed by the independent Next configuration. The root app retains its default behavior. Fix It Shop has a root-scoped manifest, root launch route, separate origin/session, official icons, dedicated iOS metadata, standalone display, its own headers, and a generic offline page. Offline mode never caches appointment responses or private pages and never queues mutations. An installed browser PWA is the initial delivery, not an App Store binary.

Katie's staff access requires a server-verified staff/operator account assigned provider_id=katie. Other staff and owner accounts use the parent environment. Customers can access only their own Katie appointments in this edition. Server checks also deny foreign services and idempotent replay of another provider's booking.

Reuse the existing RAS database and auth initially. Keep server-only database access and existing provider permission boundaries. Do not create another project or migrate production data. Stronger business tenancy is a later audited schema deliverable if more businesses are added. Shared commerce remains explicitly linked to Legacy Reserve; no payment/POS/reminder integration is represented as active.

## Six independently testable phases

| Phase | Objective / reuse and implementation | GitHub / Vercel | Supabase | Dependencies / acceptance | Deploy / complexity |
| --- | --- | --- | --- | --- | --- |
| 1: Independent installation | Reuse approved assets, auth and booking shell; dedicated app root, metadata, manifest, session boundary, private launch and safe offline fallback | App target and isolated branch; separate project; dedicated HTTPS domain | Reuse RAS; securely configure server connection and auth redirects; provision verified Katie account | Correct Fix It Shop name/icon on iOS and Android; staff reopens Today; client/foreign-account denial; real-device sign-out and restart | Required; medium |
| 2: Customer booking | Reuse transaction scheduling and visits; steel booking presentation, bounded requests, retry/error states, selection validation | Shared components with edition safeguards; independent deployment | Configure founder-approved services, prices, duration/buffer, opening hours and enabled location; no fabricated catalog | Concurrent booking has one winner; client ownership; reschedule/cancel/replay; network uncertainty directs clients to saved visits | Required; medium |
| 3: Katie's working day | Reuse Today, calendar, manual booking, clients, blocks/history; private steel theme, date navigation and refresh visibility | Scoped styling and staff component improvements; independent deployment | Existing provider-scoped tables; verify Katie assignment and capabilities | Day accuracy, stale/error states, client history consent, manual booking/block conflicts and phone usability | Required; medium |
| 4: Business isolation and continuity | Audit roles, preferences, consent/history, team invitation and business tenancy if needed | Permission tests and scoped API changes | Reviewed additive migrations only if justified; explicit deny-by-default policies and retention model | Cross-provider/tenant isolation; consent revoke; staff offboarding; existing production preserved | Required; high |
| 5: Retail and POS integration | Confirm actual Shopify configuration and operating workflow before choosing integration; reuse Legacy links first | Verified server adapters only after API/credential audit | Minimal mappings/audit records if required | Demonstrated test transaction, inventory reconciliation, refund and failure handling; no unsupported claims | Required for active integration; high |
| 6: Release hardening and growth | Accessibility, observability, backups, recovery, reminder feasibility and optional team operations | CI, release checks, documented rollback and support runbook | Backup/restore and least-privilege credential review | Real-device matrix, load/error recovery, restore exercise and approved workflow | Required; medium/high |

Phases 1–3 code can be developed together to reuse the existing implementation. Installation acceptance remains a separate release gate; code completion is not phone-installation completion.

## Deployment runbook and outstanding inputs

1. Build root and independent targets and run permission/concurrency tests. Publish an isolated branch and draft PR; do not merge the parent production branch for an independent preview.
2. Create the separate fix-it-shop Vercel project only after confirming it does not exist. Root directory apps/fix-it-shop; install `cd ../.. && npm ci`; build `npm run build`; Node 22; sourceFilesOutsideRootDirectory true.
3. Configure DATABASE_URL privately in Vercel, never in source or chat. Set public Supabase URL/publishable key from the existing project and APP_ORIGIN to the dedicated production HTTPS URL. Do not enable RESERVE_DEV_PREVIEW in hosted environments.
4. Confirm dedicated domain ownership/DNS and add only that hostname. Update the existing Supabase redirect allowlist for the new origin; preserve parent redirects.
5. Obtain Katie's actual auth email and approved service/hours/location details. Provision account/provider assignments and business settings through a reviewed, idempotent operation. Preserve all existing data. Payments and reminders remain unavailable until verified.
6. Run the local synthetic browser suite `npm run prepare:app --prefix apps/fix-it-shop` then `npm run verify:fix-it-independent` on a machine allowed to bind localhost. Run authenticated staging checks and physical iPhone/Android install tests. Verify fresh launch, returning session, sign-out, wrong-account denial, offline reconnect and appointment updates.
7. Activate booking only after these checks. Rollback the new project alone; Legacy production is untouched.

The managed workspace blocks localhost listeners and subprocess-output checks. Socket-based browser/restart verification cannot be claimed here. Build and in-process PGlite tests are available. The browser script is a reviewable release check, not evidence that real-device installation was tested.

References: [MDN PWA installation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable), [WCAG touch targets](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [Supabase API security](https://supabase.com/docs/guides/api/securing-your-api).
