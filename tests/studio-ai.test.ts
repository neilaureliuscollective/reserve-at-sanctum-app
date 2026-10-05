import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { schema, seed, wrapPglite, type Database } from "../lib/db";
import type { Actor } from "../lib/booking";
import {
  assistantInput,
  generateStudioAnswer,
  reserveAiSlot,
} from "../lib/studio-ai";
import {
  createWorkspaceItem,
  updateWorkspaceItem,
  commandCenter,
  workspaceItem,
} from "../lib/command-center";
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
before(async () => {
  pg = new PGlite();
  await pg.waitReady;
  db = wrapPglite(pg);
  await schema(db);
  await seed(db);
  await schema(db);
});
after(async () => pg.close());
test("long content drafts persist, stay scoped and invalidate revision-bound approval", async () => {
  const draft = await createWorkspaceItem(db, operator, {
    kind: "content",
    lane: "fix-it",
    title: "Launch message",
    detail: "Draft ".repeat(500),
    assignee: "both",
  });
  const privateDraft = await createWorkspaceItem(db, owner, {
    kind: "content",
    lane: "reserve",
    title: "Private",
    detail: "Owner only",
    assignee: "neil",
    visibility: "owner",
  });
  assert.equal(
    (await workspaceItem(db, operator, draft.id)).detail.length,
    3000,
  );
  await assert.rejects(workspaceItem(db, operator, privateDraft.id));
  assert.deepEqual(
    (await commandCenter(db, operator, 0, "content")).items.map((x) => x.id),
    [draft.id],
  );
  const review = await updateWorkspaceItem(db, operator, draft.id, {
    revision: 1,
    status: "review",
  });
  await assert.rejects(
    updateWorkspaceItem(db, operator, draft.id, {
      revision: review.revision,
      status: "approved",
    }),
  );
  const approved = await updateWorkspaceItem(db, owner, draft.id, {
    revision: review.revision,
    status: "approved",
  });
  const edited = await updateWorkspaceItem(db, operator, draft.id, {
    revision: approved.revision,
    detail: "New copy",
  });
  assert.equal(edited.status, "review");
  assert.equal(edited.approved_revision, null);
  await assert.rejects(
    updateWorkspaceItem(db, operator, draft.id, {
      revision: approved.revision,
      detail: "Stale copy",
    }),
    /changed/,
  );
});
test("AI limiter is atomic, bounded and denies client identity", async () => {
  const denied = { ...operator, role: "client" } as Actor;
  await assert.rejects(reserveAiSlot(db, denied));
  const requests = await Promise.allSettled(
    Array.from({ length: 10 }, () => reserveAiSlot(db, operator)),
  );
  assert.equal(requests.filter((x) => x.status === "fulfilled").length, 6);
});
test("model adapter sends only explicit draft and rejects failures without leaking provider details", async () => {
  const previous = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";
  try {
    const input = assistantInput.parse({
      prompt: "Refine this",
      draft: "Our welcome",
      lane: "fix-it",
      room: "content",
    });
    const fake = (async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      assert.equal(body.store, false);
      assert.equal(
        body.input,
        "Request:\nRefine this\n\nExplicit working draft:\nOur welcome",
      );
      assert.ok(body.instructions.includes("server-verified role operator"));
      assert.ok(!body.input.includes("private"));
      return Response.json({
        status: "completed",
        output: [
          {
            type: "message",
            content: [{ type: "output_text", text: "Welcome to the Reserve." }],
          },
        ],
      });
    }) as typeof fetch;
    assert.equal(
      await generateStudioAnswer(operator, input, fake),
      "Welcome to the Reserve.",
    );
    await assert.rejects(
      generateStudioAnswer(operator, input, (async () =>
        Response.json(
          { secret: "provider detail" },
          { status: 401 },
        )) as typeof fetch),
      /temporarily unavailable/,
    );
    await assert.rejects(
      generateStudioAnswer(operator, input, (async () =>
        Response.json({ status: "incomplete", output: [] })) as typeof fetch),
      /could not finish/,
    );
    assert.throws(() => assistantInput.parse({ ...input, user_id: owner.id }));
  } finally {
    if (previous === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previous;
  }
});
