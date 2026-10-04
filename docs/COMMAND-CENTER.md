# Reserve Command

Reserve Command is the private operator layer for Neil and Katie inside the
existing authenticated Reserve application. Neil has Reserve-wide business
visibility; Katie has her provider view and shared work. Clients never receive
the operator workspace.

The workspace includes Today, Schedule, Work, Talk and Knowledge. Work supports
capture, building, review and approval, with separate completion, due dates,
explicit visibility, revision conflicts and recipient-acknowledged handoffs.
Visible views refresh every 45 seconds; changes use authenticated server routes.

Aethelios is an optional read-only business coworker with private founder and
provider conversations and explicitly shared Operations Rooms. It can read
scoped schedules, work and confirmed business facts, never private Chair notes
or personal context. No chat or board tap deploys code or changes production.

Apply migrations 004 and 005 through `npm run db:migrate` with the intended
server-only hosted connection. Until schema activation, the workspace explains
the missing capability. AI also requires a server-side key, approved model and
explicit feature enablement.

See [Phase 1 delivery and release gate](COMMAND-COWORKER-RELEASE.md) for the
permission model, provider transport, cost controls, verification and rollback.
