# Reserve Command and Aethelios — Phase 1

This release prepares Neil's Reserve Command and Katie's Fix It Shop Studio in
the existing authenticated `/studio` application. It does not activate hosted
AI, apply a hosted migration, or connect commerce by itself.

## Delivered

Today, Schedule, Work, Talk and Knowledge share a phone-first workspace. Neil
sees the Reserve business scope; Katie sees her provider scope and shared work.
Work has revision-checked edits, explicit visibility, due dates, completion,
handoff and recipient acknowledgement. Approval and completion are separate.
The existing visit, blocking and Chair tools remain available.

Talk is a full-height coworker conversation with persisted history, named room
members, copyable replies and links to the records used. Desktop has a scoped
working-context panel; smaller displays can open it from the conversation.
Private founder and provider rooms remain private, including from the other
operator. Neil explicitly creates a shared Operations Room with Katie's
verified account. Revoking membership prevents subsequent reads and answer
publication.

Aethelios has three read-only tools: schedule, work and approved business facts.
Schedule inputs omit client names and private appointment notes. The AI never
queries Chair profiles, Chair notes, consented life context or personal Aethelios
memory. Shared rooms use Katie's schedule and shared work only, even when Neil
asks the question. Native catalog prices are quotes, not proof of payment.
Commerce stays visibly disconnected until a later verified integration.
The provider may process business prompts and scoped tool results; `store:false`
is sent to Responses, without claiming that all provider-side retention is zero.

## Activation order

1. Review the branch and deploy first to the intended protected hosted preview.
   Keep `RESERVE_DEV_PREVIEW=false`; production rejects embedded development
   storage and synthetic identities. Never load the local AI fixture in Vercel.
2. Run `npm run db:migrate` with the intended server-only `DATABASE_URL`.
   Migration `005_command_coworker.sql` is additive to 004 and preserves work.
   New tables have RLS enabled with no browser-access policies. The server
   database role needs the same private query privileges as existing routes.
3. Confirm Neil's real account has `owner` and Katie's real account has `staff`
   with provider ID `katie`. Use verified Supabase account IDs; no editable
   signup metadata grants privileges. Confirm both can sign in on the preview.
4. Set server-only `OPENAI_API_KEY` and an approved Responses-compatible
   `RESERVE_AI_MODEL` with access in that OpenAI project. Then set
   `RESERVE_AI_ENABLED=true`. No key belongs in chat, source or `NEXT_PUBLIC_*`.
5. Run the hosted acceptance journey below before promoting the release.

Missing AI configuration leaves the native workspace usable and explains why
Talk cannot send. Missing command schema shows an activation notice.

## Runtime and cost controls

Each send claims one durable turn with an actor-bound request key before any
provider call. Same-request retries return that turn; different content with
the same key is rejected. Only one pending turn can exist per conversation.
Short burst protection allows 12 attempts per actor per minute.

Daily ceilings default to disabled. Optional positive values in
`RESERVE_AI_DAILY_ATTEMPTS` and `RESERVE_AI_BUSINESS_DAILY_ATTEMPTS` cap attempts
per user and business, including failures, by UTC day. They are attempt counts,
not dollar budgets. Business budget claims serialize on a database lock row.

The server uses Next.js `after` for bounded background work, with a 60-second
route duration, a 40-second provider budget, up to four read-tool rounds and
bounded recent conversation history. Ready answers, evidence and reported
usage are saved before display. This is persisted request/response, not token
streaming or a separate durable worker. History reads mark pending turns older
than two minutes interrupted. Failed or interrupted requests are not
automatically sent to the provider again; a deliberate new message is a new
attempt. Visible clients poll pending history without calling the model.

## Verification and release gate

Local verification: 48 tests cover the existing booking core and new work,
identity, provider scope, revisions, handoffs, room membership, read-tool scope,
private-data exclusion, idempotency, in-flight revocation and interruption.
Typecheck and production build pass. Browser verification exercises the two
operator roles, client rejection, task handoff/acknowledgement/completion,
shared replies surviving reload, source links, revocation and layouts at
320, 390, 540, 884, 1440 and 2560 pixels, plus reduced motion.

The browser AI response uses a strictly local synthetic transport. These checks
do not establish hosted credentials, actual model entitlement or live answer
quality. Run `CHROMIUM_PATH=<local executable> node scripts/verify-command.mjs`
for local verification; absent that variable, Playwright's installed Chromium
is used. Screenshots go to ignored `artifacts/`.

Hosted acceptance must verify:

- Both real accounts retain their own scopes after sign-in and refresh; a
  client cannot enter operator routes. Existing booking concurrency still holds.
- Create a real test work item, hand it to Katie, acknowledge it, complete it,
  and confirm both views. Conflicting edits return a reloadable conflict.
- Katie's private conversation is inaccessible to Neil. Shared room sources
  exclude founder/private-provider work and all Chair notes. Removing Katie
  blocks subsequent reads and a response already in flight.
- One live read-tool answer cites the correct current schedule/work/facts;
  no claimed availability, payment, earnings or action is invented. Confirm
  model access, deployment duration and provider usage in the actual project.
- Reload a saved reply; interrupt a test request and verify recovery without
  automatic resend. Check phone keyboard/composer and Katie's real device.

Rollback: set `RESERVE_AI_ENABLED=false` to stop new AI sends, retain the additive
tables and saved work, and roll back the application release if needed. Keep
the migration rather than dropping shared data. Existing room history remains
accessible to authorized members while sending is disabled.

## Next phases

Phase 2 can add reviewed incident/runbook workflows and human-approved action
proposals on this work ledger. Phase 3 can connect verified commerce events and
reconciliation. Autonomous changes, sending messages, refunds and deployments
are outside Phase 1. Personal Aethelios remains a separate context boundary.
