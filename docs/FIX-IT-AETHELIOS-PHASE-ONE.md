# Fix It Shop × Aethelios Booking — Phase One

Founder directive: October 10, 2026. Review branch only; no production merge,
deployment, database mutation, domain change or payment activation authorized.

## Recovered baseline and findings

Canonical repository recovered at `b152276` (GitHub main confirmed through the
connected GitHub API). Original working tree clean on `work`; stale local
`origin/main` was not used as the baseline. Shell fetch failed through the
executor proxy; connected GitHub reads established the exact current main SHA.

Inspected README, AGENTS, architecture, Chair, Studio phases, booking pilot,
provider branding, premium customer/Studio/retention releases, cinematic home
and approved-symbol provenance, current materials release, route inventory,
migrations, auth, capability rules, booking/occupancy and browser tests.

Already built: premium Katie customer home and public story, published service
menu, fixed-provider booking, clients/account history, calendar download,
rescheduling/cancellation, day/week staff calendar, manual CRM appointments,
client imports/history, availability blocks, approval-based service/hours setup,
provider branding/onboarding, scoped operational insights, The Chair and PWA.
No replacement scheduler or application is needed.

Known limitations: live catalog/configuration is not verified here; synthetic
prices/hours are illustrative. Notifications, payment-backed reporting and
physical-device acceptance are not established by local tests. Provider identity
is the current access unit; there is no business membership/owner-role layer.
The Chair is explicitly shared with Katie and the platform owner; it is not
silently shared with newly onboarded professionals. A platform `owner` role is
broad technical authority, not proof of legal ownership of Katie’s business.

Open PR inspection: #59 introduces an independent app edition; left unmerged
because this directive calls for transforming the existing app. #52 proposes
Public Aethelios connections and reviewed website publication; left unmerged
and unactivated. Older stacked commerce/command/arrival drafts (#12–17, #22)
are not a reason to activate billing, replace main or import unreviewed changes.

Deployment: Next 16.3.5; existing noindex/security/no-store headers retained;
GitHub Actions runs tests, TypeScript and build. No local `.vercel` linkage or
ready runtime secrets/outbound identity supplied by the cloud environment.
Connected Vercel project `reserve-at-sanctum-app` was verified. Draft PR #62
creates an automatic review preview; GitHub CI passed the first review commit.
Authenticated live booking acceptance is not inferable from a successful build. Historical domain and
Supabase PKCE/cookie refresh architecture remain unchanged. Migrations are
preserved byte-for-byte; no schema work is necessary for this presentation phase.

## Business and technology architecture

| Identity | Responsibility | Boundary |
| --- | --- | --- |
| Fix It Shop | Katie’s service identity, approved services/prices, professional operations and client relationships | Independent approved blue/gold/steel customer world; no manufactured retail ownership |
| Aethelios Booking | Scheduling, calendar, staff/client software and technical maintenance | `lib/booking-brand.ts` defines restrained software identity and approved palette; no public SaaS onboarding/billing |
| Aethelios Technologies | Aethelios software division | Aethelios — The Human Ascendance; no inferred access to private Chair information |
| Legacy Reserve / Aethelios Lifestyle | Founder’s product brand and product commerce | Existing Shopify links/adapters/history kept; service, rental and product revenue are not combined |

Shared engine remains `lib/booking.ts`, booking pilot/operations domains and
existing APIs. `reserve_*` identifiers are internal persistence, not public brand.
Business branding, provider identity, locations, service eligibility, availability
and appointments remain separate existing models. Service prices/durations/buffers
and appointment price/time snapshots are unchanged. No new payment flow or ledger.

## Route migration and ownership matrix

Classification: A keep for Fix It Shop; B software/operator layer; C preserve for
Legacy Reserve/Aethelios Lifestyle transition; D retired default positioning.
Existing application references and URL queries were inspected; no traffic
analytics credentials were supplied, so external traffic counts are unknown.
Temporary redirects are used for reversible entrance changes; no destructive
route deletion or guessed external Lifestyle destination.

| Route or family | Class | Phase One behavior / dependency |
| --- | --- | --- |
| `/` | A/D | Temporary redirect to existing `/fix-it-shop/app`; old cinematic marketing remains reachable at `/discover` |
| `/enter` | A/B | Verified team roles → `/studio`; customers/guests → Fix It Shop; existing safe local return handling retained |
| `/fix-it-shop/app`, `/fix-it-shop` | A | Existing premium customer home/public Katie story, approved imagery/materials; retired Sanctum/Reserve location copy removed |
| `/fix-it-shop/app/book` | A | Katie-fixed existing engine and published prices; no query-based provider switch |
| `/fix-it-shop/app/appointments` | A | Account-owned Katie-filtered visits, reschedule/cancel/rebook intact |
| `/fix-it-shop/app/signin`, `/forgot-password`, `/reset-password` beneath app | A | Existing branded Supabase/preview journeys; no credential migration |
| `/fix-it-shop/app/install`, `/setup` | A | Existing installation instructions plus staff/update guidance; `/setup` temporarily redirects to the same install page |
| `/fix-it-shop/app/launch` | A/B | New installed launch resolves existing verified-role routing; customers return to app home |
| `/book` | A | Preserved unfiltered engine and all service/location/provider query parameters; Fix It Shop service chrome; avoids losing another provider’s deep link |
| `/account` | A | Preserved full customer appointment history across providers; existing team redirect intact; does not erase visits hidden by Katie’s filtered view |
| `/signin`, `/forgot-password`, `/reset-password`, `/auth/callback` | A/B | Original safe return/recovery and server verification retained; service sign-in copy no longer leads with product brand |
| `/chair` | A | Fix It Shop service chrome, same answers, explicit consent, private notes, revocation and expiry; consent still discloses platform administrator access |
| `/my-visit` | A | Existing visit hub retained; linked appointment IDs preserved |
| `/visit` | A/D | Existing location/professional/service selector retained and reworded as services; no national discovery or additional booking availability invented |
| `/studio`, `/studio/today`, `/studio/schedule`, `/studio/clients`, `/studio/clients/[id]`, `/studio/operations`, `/studio/insights`, `/studio/brands` and private brand previews | B | Aethelios Booking shell and approved green/gold technology palette; existing scoped reads/mutations and owner-only onboarding/publication retained |
| `/studio/build`, `/studio/content` | B | Existing shared work/drafting retained; no new private-data retrieval or AI tooling |
| `/studio/commerce`, `/studio/memberships`, `/studio/vitalis/**` | C | Existing owner-only historical operations retained; no transfer to Katie and no financial activation |
| `/shop`, `/shop/cart`, `/shop/[id]`, `/shop/products/[handle]` | C | Existing product discovery/cart/checkout links preserved exactly; no new external redirect or mock product |
| `/discover`, `/discover/membership`, `/discover/aethelios`, `/explore` | C/D | Historical introductions accessible; `/discover` explicitly announces transition and links to Fix It Shop/service and product entrances |
| `/home`, `/reserve`, `/pathways`, `/my-reserve`, `/profile`, `/membership`, `/vitalis/**`, `/aethelios`, `/concierge`, `/mirror`, `/sanctum-mirror`, `/my-sanctum` | C | Existing personal/member records and legacy journeys preserved temporarily; not primary service navigation; future archive/migration requires verified destinations and consent/data review |
| `/founder`, `/founder/legacy-reserve`, `/founder/aethelios-technologies`, `/gent-ascend`, `/aurelius` | C/D | Historical founder content and existing redirects retained, removed from Katie’s service entrance |
| `/booking-technology` | B | Small factual explanation of service/software/product boundaries; no separate SaaS marketing site |
| `/privacy` | A | Factual information/access page closes existing broken footer destination; not an invented legal contract |
| `/manifest.webmanifest`, root icons | A/D | Same root manifest ID `/`, Fix It Shop name/approved symbol; old root installations can update identity |
| `/fix-it-shop/booking.webmanifest`, app icons | A | Stable existing ID `/fix-it-shop/app`, approved symbol; scope covers same-origin staff/Chair/auth paths |
| `/providers/[slug]/**` | A/B | Existing reviewed provider profiles/icons/manifests and shared engine retained, no unrelated-business isolation claim |
| `/api/auth`, `/api/session`, `/api/availability`, `/api/appointments/**`, `/api/locations`, `/api/chair/**`, `/api/studio/**` | B | No authority/input/persistence change; existing no-store/origin/capability/ownership and private calendars retained |
| `/api/shop/**`, `/api/orders`, `/api/webhooks/square`, membership/routine/Vitalis/profile/concierge APIs, `/api/health`, public brand-image APIs | B/C | Existing endpoints/records/integration flags untouched; no new AI/client-data sharing or payment changes |

A future verified Public Aethelios/Shopify destination can replace selected C
marketing routes after reviewing link traffic, data ownership and account return
journeys. Until then their records and actual commerce links stay accessible.
Historical location IDs and database names are not renamed.

## Permissions and additional-professional readiness

Supabase `getUser()` establishes identity; server `reserve_users` assigns role and
provider scope. Editable signup metadata is used for a display name, never role.
Server credentials remain server-only. Existing origin checks, strict input,
revision protections and audit remain authoritative; UI branding grants nothing.

Existing owner onboarding can create closed professionals, unpublished brand
drafts and location assignments. Services belong to providers; staff read/manage
only assigned providers. Hours/service changes require existing immutable
proposals and owner approval. New providers get no default access to Katie’s
Chair. Client history scope and contact/account linking remain explicit.

**Gap:** Katie’s operator/staff assignment does not allow creating professionals,
publishing all brands or approving prices/hours business-wide. Do not grant her
platform `owner` to solve this; it exposes unrelated legacy operations and notes.
Phase Two must add explicit Fix It Shop business membership and bounded owner
capabilities, define professional-specific shared clients/notes, and test revocation.
Existing server owner can prepare closed providers through Team & brands today;
this is not a claim that Katie can independently administer a whole future team.

Booth rental remains Katie’s business. Later use an accounting-provider boundary
for reviewed rental agreements/invoices/settlements; do not store rental payment
splits in appointment prices or Legacy Reserve product ledger. No accounting or
payment implementation in this phase.

## PWA and asset audit

Approved customer crest is `public/images/approved/fix-it-shop.webp`. Existing
approved phone symbol provenance is in `FIX-IT-SHOP-CINEMATIC-HOME.md` (supplied
2126.png, approved text removal/steel edit). Reused exact 180/192/512 PNG exports
and existing maskable icon. No invented logo. Root file-based icons now use these
same bytes; historical Legacy Reserve icon files remain in `public/brand`.

Both manifests retain prior IDs to avoid silently changing installed identity.
Their Fix It Shop name, shortcuts, online launch and scope now match this business.
Root `/enter` and nested `/launch` resolve verified team entry. Shared root scope
keeps staff/Chair/auth navigation inside the installed origin; it is not a privacy
or authorization boundary. Existing provider PWAs and older root/nested installs
can overlap on this origin. Independent duplicate installation is not guaranteed.

No worker caches appointments, client notes, credentials or offline mutations.
Existing auth-cookie refresh remains unchanged. Updates require an online reopen/
reload; OS name/icon refresh can require reinstall. Reinstall does not remove
server appointments. Actual Samsung/iPhone install, sign-in persistence and reopening
remain physical-device acceptance. No native store availability is claimed.

Research references from the inspected implementations: MDN manifest id/scope,
web.dev multiple PWAs on one domain, WebKit Safari 17.2 installed-cookie behavior,
web.dev touch targets/sign-in forms and motion accessibility. Installed Next 16.3.5
redirect and metadata/icon guidance reviewed. React component review applied:
no new private-data fetches, no role authorization in presentation, accessible
landmarks/links, scoped CSS, existing async checks and reduced-motion behavior.
No Supabase feature/schema/adapter change is introduced. Fresh Supabase October 8
changelog, September 25 Postgres patch notice, SSR authentication guidance and
web.dev multiple-PWA guidance were retrieved in the isolated validation sandbox.
These do not justify changing database versions or authentication in this phase.

## Future CRM / Concierge contracts (design only)

No speculative integration is activated. The existing vendored Concierge package
and optional drafting/member tools are not proof of verified phone answering.
Public connection draft #52 remains unmerged and must be reconciled with this
ownership model before use. A future integration should use a confidential,
revocable delegated credential with business/provider scope, not expose browser
service credentials or grant platform-owner access.

| Contract | Minimal input/output | Authority and consent |
| --- | --- | --- |
| Availability lookup | provider/service/location/date → actual available starts, duration and timezone | Existing availability domain; never infer availability from calendar summaries |
| Booking request | authenticated client or reviewed contact reference, service/start, idempotency key → saved ID/status/captured price/revision | Existing transactional booking function; caller confirmation, fresh server validation and original ownership required |
| Reschedule/cancel | owned appointment ID + expected revision → new revision/status | Existing ownership/collision/cancellation rules; explicit confirmation and audit attribution |
| Approved confirmation | saved appointment reference/time/status → minimal approved message | No confirmation before commit; delivery transport/consent must be separately verified |
| CRM relationship/event | explicit linked customer ID, completed/cancelled event, business/provider scope → idempotent consent-filtered event | No guessed identity from email; no private notes or Chair/life answers; no outreach without recorded purpose/consent |
| Transfer to Katie | reason category + minimal callback detail → accepted handoff | Verified phone infrastructure and authorized hours/contact destination; no fabricated number |

Keep these as domain adapter contracts, not parallel CRM tables or a duplicate
Concierge engine. Define token revocation, deduplication, event retries, minimal
retention and integration-specific consent before implementing.

## Validation and release gates

Validation uses synthetic PGlite records and preview identities in an isolated
Vercel Sandbox; it does not establish live hosted acceptance. All 179 unit tests
passed, including booking concurrency, revision/idempotency, ownership and provider
authorization. TypeScript and production build passed. Four behavioral browser
suites passed: Fix It Shop booking (reserve/reschedule/cancel/ownership), booking
pilot (staff operations/calendar/history/import/insights), The Chair (consent,
private notes, revocation and deletion), and provider brands (closed onboarding,
publish/unpublish and professional isolation). The transformation browser suite
checks role-aware launch, 15 pages at 320/390/1440 pixels, retained routes and
unauthorized staff API denial. All 15 automated WCAG A/AA audits passed after
correcting light-background service text contrast. Automated checks do not replace
manual assistive-technology or physical-device acceptance.

Review: [draft PR #62](https://github.com/neilaureliuscollective/reserve-at-sanctum-app/pull/62).
[Screenshot gallery](previews/fix-it-phase-one/README.md) includes customer home,
services/time selection, account, Chair, Katie’s dashboard, scheduling and install
setup. Screenshots contain synthetic data; preview prices are not approved prices.
No production deployment, merge, domain, database or payment change was made.

Before merge/release: founder reviews this exact PR and remaining permission
tradeoffs. Before real bookings: verify intended Supabase project/database,
existing migrations/private grants, Katie’s confirmed user/provider assignment,
approved real menu/prices/durations/buffers/hours/location/address and policy,
OAuth/email/recovery/refresh, hosted concurrency/ownership/Chair revocation,
physical-phone install/launch/update and complete client/staff pilot.
Payments, domain changes and external Lifestyle redirects require their own
verified configuration/approval. No claim of native app, real revenue metrics,
reminders or unrelated-business tenant isolation follows from this branch.

Rollback: revert application commit. No schema/data rollback needed. Restoring
older metadata can change installed branding on later refresh; existing appointment
records and provider/auth IDs remain compatible.

Phase Two priorities: (1) real hosted/device pilot, (2) business-owner permissions
and professional-specific note sharing, (3) approved location/customer photography
and measured mobile accessibility/performance, (4) verified Lifestyle route transfer,
(5) consented CRM/Concierge adapters only once external infrastructure is verified.
