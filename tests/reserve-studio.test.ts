import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { schema, seed, wrapPglite, type Database } from "../lib/db";
import { type Actor, visits, canAccess } from "../lib/booking";
import {
  commandCenter,
  createWorkspaceItem,
  updateWorkspaceItem,
  studioOverview,
  clientHistory,
} from "../lib/command-center";
import { hasCapability } from "../lib/studio-permissions";
import { entryDestination } from "../lib/experience/entry";
import { blockTime, listBlocks, removeBlock } from "../lib/studio-blocks";
import { listChairs, saveChair, saveChairNote } from "../lib/chair-store";
import { emptyChair } from "../lib/chair";
let pg: PGlite, db: Database;
const owner: Actor = {
  id: "preview-neil",
  name: "Neil",
  email: "neil@preview.invalid",
  role: "owner",
  provider_id: null,
};
const operator: Actor = {
  id: "preview-katie",
  name: "Katie",
  email: "katie@preview.invalid",
  role: "operator",
  provider_id: "katie",
};
const staff: Actor = {
  id: "future-staff",
  name: "Staff",
  email: "staff@preview.invalid",
  role: "staff",
  provider_id: "other",
};
const client: Actor = {
  id: "preview-client",
  name: "Client",
  email: "jordan@preview.invalid",
  role: "client",
  provider_id: null,
};
before(async () => {
  pg = new PGlite();
  await pg.waitReady;
  db = wrapPglite(pg);
  await schema(db);
  await seed(db);
  await schema(db);
  await db.query(
    "UPDATE reserve_users SET role='operator' WHERE id='preview-katie'",
  );
  await db.query(
    "INSERT INTO reserve_users(id,name,email,role,provider_id) VALUES($1,$2,$3,$4,$5)",
    [staff.id, staff.name, staff.email, staff.role, staff.provider_id],
  );
  await db.query(
    "INSERT INTO reserve_providers(id,name,enabled) VALUES('other','Other',true)",
  );
});
after(async () => pg.close());
test("operator entry and resource authority; unknown/client fail closed", () => {
  assert.equal(entryDestination(operator), "/studio");
  assert.equal(hasCapability(operator, "workspace.approve"), false);
  assert.equal(hasCapability(owner, "users.admin"), true);
  assert.equal(
    hasCapability({ ...operator, provider_id: null }, "appointments.read"),
    false,
  );
  assert.equal(hasCapability(client, "studio.read"), false);
  assert.equal(
    hasCapability(
      { ...operator, role: "invalid" } as unknown as Actor,
      "studio.read",
    ),
    false,
  );
  assert.equal(
    hasCapability(
      {
        ...operator,
        capability_overrides: [
          {
            capability: "workspace.approve",
            decision: "allow",
            scope: "company",
          },
        ],
      },
      "workspace.approve",
    ),
    false,
  );
  assert.equal(
    hasCapability(
      {
        ...operator,
        capability_overrides: [
          { capability: "blocks.manage", decision: "deny", scope: "provider" },
        ],
      },
      "blocks.manage",
    ),
    false,
  );
});
test("private work, assignment scope and capability denial survive guessed IDs", async () => {
  const privateItem = await createWorkspaceItem(db, owner, {
    kind: "idea",
    lane: "reserve",
    title: "Owner only",
    detail: "Private",
    assignee: "neil",
    visibility: "owner",
  });
  const shared = await createWorkspaceItem(db, operator, {
    kind: "task",
    lane: "fix-it",
    title: "Shared",
    detail: "Work",
    assignee: "both",
  });
  const assigned = await createWorkspaceItem(db, owner, {
    kind: "task",
    lane: "reserve",
    title: "Staff task",
    detail: "Work",
    assignee: "both",
    assignee_user_id: staff.id,
  });
  assert.ok(
    (await commandCenter(db, owner)).items.some((i) => i.id === privateItem.id),
  );
  assert.ok(
    !(await commandCenter(db, operator)).items.some(
      (i) => i.id === privateItem.id,
    ),
  );
  assert.deepEqual(
    (await commandCenter(db, staff)).items.map((i) => i.id),
    [assigned.id],
  );
  await assert.rejects(
    updateWorkspaceItem(db, operator, privateItem.id, {
      revision: 1,
      detail: "Forged",
    }),
  );
  await assert.rejects(
    updateWorkspaceItem(db, staff, shared.id, {
      revision: 1,
      detail: "Forged",
    }),
  );
  await assert.rejects(
    createWorkspaceItem(db, operator, {
      kind: "idea",
      lane: "reserve",
      title: "Forged",
      detail: "",
      assignee: "both",
      visibility: "owner",
    }),
  );
  await assert.rejects(commandCenter(db, client));
  await assert.rejects(
    createWorkspaceItem(
      db,
      {
        ...operator,
        capability_overrides: [
          { capability: "workspace.create", decision: "deny", scope: "shared" },
        ],
      },
      {
        kind: "task",
        lane: "reserve",
        title: "No",
        detail: "",
        assignee: "both",
      },
    ),
  );
});
test("approval is owner-only, revision-bound and invalidated by edits; concurrent edits conflict", async () => {
  const item = await createWorkspaceItem(db, operator, {
    kind: "decision",
    lane: "reserve",
    title: "Campaign decision",
    detail: "Terms",
    assignee: "both",
  });
  await assert.rejects(
    updateWorkspaceItem(db, operator, item.id, {
      revision: 1,
      status: "approved",
    }),
  );
  const review = await updateWorkspaceItem(db, operator, item.id, {
    revision: 1,
    status: "review",
  });
  const approved = await updateWorkspaceItem(db, owner, item.id, {
    revision: review.revision,
    status: "approved",
  });
  assert.equal(approved.approved_revision, approved.revision);
  const changed = await updateWorkspaceItem(db, operator, item.id, {
    revision: approved.revision,
    detail: "Different terms",
  });
  assert.equal(changed.status, "review");
  assert.equal(changed.approved_revision, null);
  await assert.rejects(
    updateWorkspaceItem(db, owner, item.id, {
      revision: approved.revision,
      status: "approved",
    }),
    /changed/,
  );
  const edits = await Promise.allSettled([
    updateWorkspaceItem(db, operator, item.id, {
      revision: changed.revision,
      detail: "A",
    }),
    updateWorkspaceItem(db, owner, item.id, {
      revision: changed.revision,
      detail: "B",
    }),
  ]);
  assert.equal(edits.filter((r) => r.status === "fulfilled").length, 1);
  const events = await db.query(
    "SELECT * FROM reserve_workspace_events WHERE item_id=$1",
    [item.id],
  );
  assert.equal(events.length, 5);
  await assert.rejects(
    updateWorkspaceItem(db, operator, item.id, {
      revision: 4,
      action: "complete",
    }),
  );
});
test("routine operator tasks complete without owner approval; archive is owner-only", async () => {
  const item = await createWorkspaceItem(db, operator, {
    kind: "task",
    lane: "fix-it",
    title: "Prepare the room",
    detail: "",
    assignee: "both",
  });
  const done = await updateWorkspaceItem(db, operator, item.id, {
    revision: 1,
    action: "complete",
  });
  assert.ok(done.completed_at);
  assert.equal(done.approved_revision, null);
  await assert.rejects(
    updateWorkspaceItem(db, operator, item.id, {
      revision: done.revision,
      action: "archive",
    }),
  );
  const reopened = await updateWorkspaceItem(db, operator, item.id, {
    revision: done.revision,
    status: "captured",
  });
  assert.equal(reopened.completed_at, null);
});
test("aggregates exceed page caps; no unscoped provider pulse or client notes", async () => {
  await db.query(
    "INSERT INTO reserve_appointments(id,client_id,provider_id,service_id,starts_at,ends_at,busy_until,price,status,note,request_key,original_start) VALUES('studio-katie','preview-client','katie','signature',now()+interval '1 hour',now()+interval '2 hours',now()+interval '2 hours',4500,'confirmed','private note','studio-katie',now()),('studio-other','preview-other','other','signature',now()+interval '30 minutes',now()+interval '1 hour',now()+interval '1 hour',4500,'confirmed','other private note','studio-other',now())",
  );
  const view = await studioOverview(db, operator);
  assert.equal(view.nextVisit?.id, "studio-katie");
  assert.ok(!JSON.stringify(view).includes("private note"));
  assert.equal((await visits(db, operator, true)).length, 1);
  assert.ok(canAccess(operator, (await visits(db, operator, true))[0]));
  await assert.rejects(clientHistory(db, operator, "preview-other"));
  const history = await clientHistory(db, operator, "preview-client");
  assert.equal(history.visits.length, 1);
  assert.ok(!JSON.stringify(history).includes("private note"));
  await db.query(
    "INSERT INTO reserve_workspace_items(id,kind,lane,title,assignee,assignee_user_id,created_by,updated_by) SELECT 'bulk-'||x,'task','reserve','Bulk work','both','preview-katie','preview-neil','preview-neil' FROM generate_series(1,125) x",
  );
  const result = await commandCenter(db, operator);
  assert.equal(result.items.length, 30);
  assert.ok(result.hasMore);
  assert.ok(result.pulse.openBuild >= 125);
  assert.equal((await commandCenter(db, operator, 4)).items.length > 0, true);
});
test("operator preserves consented human Chair while notes stay out of client history", async () => {
  await saveChair(db, client, { ...emptyChair, share_with_katie: true });
  await saveChairNote(db, operator, {
    user_id: client.id,
    body: "Provider-only note",
    revision: 0,
  });
  assert.equal(
    (await listChairs(db, operator))[0].service_note,
    "Provider-only note",
  );
  assert.ok(
    !JSON.stringify(await clientHistory(db, operator, client.id)).includes(
      "Provider-only note",
    ),
  );
});

test("hosted lockdown revokes unused browser privileges without changing server access", async () => {
  const { lockdownStudio } = await import("../lib/studio-lockdown");
  await db.query("CREATE ROLE anon");
  await db.query("CREATE ROLE authenticated");
  await db.query(
    "GRANT ALL ON ALL TABLES IN SCHEMA public TO anon,authenticated",
  );
  await lockdownStudio(db);
  const rights = await db.query<{ allowed: boolean }>(
    "SELECT has_table_privilege('anon','reserve_users','SELECT') OR has_table_privilege('authenticated','reserve_workspace_items','UPDATE') OR has_table_privilege('authenticated','reserve_workspace_events','TRUNCATE') AS allowed",
  );
  assert.equal(rights[0].allowed, false);
  assert.ok((await db.query("SELECT * FROM reserve_users")).length > 0);
  const rls = await db.query<{ relrowsecurity: boolean }>(
    "SELECT relrowsecurity FROM pg_class WHERE relname IN ('reserve_user_capabilities','reserve_workspace_events')",
  );
  assert.equal(rls.length, 2);
  assert.ok(rls.every((r) => r.relrowsecurity));
});

test("operator completion preserves the owner who approved the artifact", async () => {
  const item = await createWorkspaceItem(db, operator, {
    kind: "task",
    lane: "reserve",
    title: "Approved campaign task",
    detail: "Exact agreed text",
    assignee: "both",
  });
  const review = await updateWorkspaceItem(db, operator, item.id, {
    revision: 1,
    status: "review",
  });
  const approved = await updateWorkspaceItem(db, owner, item.id, {
    revision: review.revision,
    status: "approved",
  });
  const completed = await updateWorkspaceItem(db, operator, item.id, {
    revision: approved.revision,
    action: "complete",
  });
  assert.equal(completed.approved_by, owner.id);
  assert.equal(completed.approved_revision, approved.approved_revision);
  assert.ok(completed.completed_at);
});
