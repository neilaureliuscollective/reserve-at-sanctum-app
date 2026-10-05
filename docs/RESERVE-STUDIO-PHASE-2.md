# Reserve Studio — Phase 2 recovery

The interrupted session left Phase 1 saved in PR #24, with no Phase 2 branch. This change builds on `codex/reserve-studio-phase-1` and is delivered separately so Phase 1's operating/permission foundation stays reviewable.

## Delivered

Command now presents a petrol/gold dimensional Aethelios orb, a short record-derived pulse and one switchable Attention/Work/Activity panel. No invented intelligence, revenue or appointments are shown. Schedule, Build Room, Clients and Operations remain directly available. Orb rendering uses CSS, with reduced motion, keyboard activation and no WebGL dependency.

`/studio/content` is a dedicated writing room with three brand lanes, a paginated saved-draft library, a large editor, server persistence, copy length/word count, unsaved-change protection and review handoff. Content is a new kind of existing workspace item rather than a parallel approval system. Owner-only content remains owner-only; shared/operator/assigned capability scope comes from the same domains. Neil reviews the exact saved draft in Build Room. Editing approved content invalidates approval. The editor preserves local text on save/conflict/connection errors. Brand lane becomes fixed when saved; start a new draft to change it. AI suggestions remain unsaved until a human saves.

Aethelios is available through a native modal from every Studio room and directly from Content Studio. Its server-only Responses API adapter receives only the explicit prompt, optional working draft, room and selected brand lane; it does not query Chair records, customer details, appointment notes, founder memory or other conversations. This phase is single-request assistance, not durable conversation memory, live voice, image/video generation or social publishing. The model cannot call tools or grant approvals. `store:false` disables Responses storage for these requests; it is not a claim of zero provider retention.

Requests require a verified team session, `studio.read`, `workspace.read`, configured origin, bounded JSON and validation. A database-backed counter admits six requests per person per minute across instances. It stores counters only, cleans old buckets on requests and never stores prompts. The provider request has a 45-second timeout, bounded output and safe failure messages. Completed output is rendered as plain text. `OPENAI_API_KEY` remains server-only. Model order is `RESERVE_AI_MODEL`, existing `OPENAI_MODEL`, then `gpt-4.1-mini`. Vercel metadata confirmed the key is configured in production and preview; this recovery did not read, replace or print it.

## Research decisions

- [WAI tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/): one panel at a time, selected tab, roving focus and Arrow/Home/End controls.
- [OpenAI Responses creation](https://developers.openai.com/api/reference/resources/responses/methods/create): explicit instructions/input, no provider-side conversation chaining, bounded output and storage disabled.
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security): preserve the server-authoritative architecture, enable RLS, revoke browser grants and open no browser policies.
- Next.js 16.3.5 installed Route Handlers and Server/Client Components documentation checked before implementation.
- Supabase changelog checked, including PostgreSQL 17.11 extension changes; this migration uses built-in text constraints and a counter table, not the affected extension operations.

## Database and release

The CLI-generated `20261005175639_reserve_studio_content.sql` is held in this repository's existing `migrations/` directory so the existing idempotent migrator and local preview both apply it. It expands the workspace kind constraint and draft limit to 6,000 characters and adds `reserve_ai_usage`. The hosted migrator continues to revoke browser grants with `lockdownStudio`.

Applied to dedicated healthy project `wffmdiszikhmkmoiorac` as `reserve_studio_content`; hosted apply included explicit revocation of anon/authenticated privileges on the new counter table. Verification confirmed RLS enabled, zero counter policies, no browser read/update privileges, 6,000-character constraint and the existing single owner preserved. No users, offerings or synthetic content were inserted into production. Katie's operator account is still pending. The security advisor's no-policy informational notices match the private server-only architecture; the pre-existing leaked-password setting remains unchanged ([setting reference](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)).

This source change is not merged into main or promoted to the canonical domain. Merge Phase 1 before releasing Phase 2. Confirm canonical-domain owner authentication, content save/review and one actual Aethelios response after release; local synthetic/mocked verification is not proof of a live model response. The preview APP_ORIGIN must match the domain used for write tests.

## Verification

- All 46 domain tests passed, including booking concurrency and Chair boundaries, long content persistence, owner/operator/private scoping, approval invalidation, stale revisions, atomic AI request limiting and model adapter success/error handling with a mocked provider.
- Production build and TypeScript checks passed.
- `verify:studio` passed owner/operator rooms at 320/390/884/1440px, draft persistence after reload, review handoff, command keyboard tabs, approval/invalidation/conflicts and client isolation.
- `verify:studio-ai` passed mocked suggestion insertion, failure leaving the draft unchanged, client/origin/forged identity denial, unsaved internal-navigation protection, four content layout widths and zero page errors.
- Home, Content Studio and assistant screenshots visually inspected. Optional animation respects reduced motion. Browser checks used isolated synthetic local users and a synthetic API key, never hosted credentials or real customer records.

## Next

Phase 3 remains approved service/availability configuration and operating follow-up. Phase 4 remains Shopify commerce/inventory signals. Voice/media creation can follow explicit provider/asset requirements; no fictional controls for those functions were added here.
