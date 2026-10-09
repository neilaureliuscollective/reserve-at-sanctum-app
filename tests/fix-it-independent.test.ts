import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { DateTime } from "luxon";
import { wrapPglite, schema, seed } from "../lib/db";
import { catalog, service, book, visits, change, canAccess, type Actor } from "../lib/booking";
import { editionActor } from "../lib/app-edition";
import { fixItManifest, fixItDestination, accountEntranceFor } from "../lib/fix-it-booking";

test("independent app binds identity and customer/staff data to Katie without changing Legacy", async () => {
  const pg = new PGlite(); await pg.waitReady;
  const db = wrapPglite(pg); await schema(db); await seed(db);
  const previous = process.env.NEXT_PUBLIC_APP_EDITION;
  const client: Actor = { id: "preview-client", name: "Client", email: "client@preview.invalid", role: "client", provider_id: null };
  const katie: Actor = { ...client, id: "preview-katie", role: "staff", provider_id: "katie" };
  const owner: Actor = { ...client, id: "preview-neil", role: "owner" };
  let day = DateTime.now().setZone("America/Chicago").plus({ days: 2 }).startOf("day");
  while (![2,3,4,5,6].includes(day.weekday)) day = day.plus({ days: 1 });
  const start = day.set({ hour: 10 }).toUTC().toISO()!;
  try {
    delete process.env.NEXT_PUBLIC_APP_EDITION;
    await db.query("INSERT INTO reserve_providers(id,name,enabled) VALUES('other-provider','Another provider',true)");
    await db.query("INSERT INTO reserve_provider_locations(provider_id,location_id) VALUES('other-provider','eunice')");
    await db.query("INSERT INTO reserve_services(id,provider_id,name,description,minutes,buffer,price,enabled) VALUES('other-service','other-provider','Other service','',30,15,3000,true)");
    const foreignInput = { serviceId: "other-service", start, note: "", requestKey: randomUUID() };
    const foreign = await book(db, client, foreignInput);
    assert.ok((await catalog(db)).some(s => s.provider_id === "other-provider"));
    assert.equal(editionActor(owner), owner);

    process.env.NEXT_PUBLIC_APP_EDITION = "fix-it-shop";
    const manifest = fixItManifest();
    assert.equal(manifest.name, "Fix It Shop"); assert.equal(manifest.id, "/");
    assert.equal(manifest.start_url, "/"); assert.equal(manifest.scope, "/");
    assert.ok(manifest.shortcuts?.some(s => s.url === "/studio/today"));
    assert.equal(fixItDestination("/studio/today"), "/studio/today");
    assert.equal(fixItDestination("https://outside.invalid"), "/fix-it-shop/app/appointments");
    assert.equal(accountEntranceFor("/studio/today"), "/fix-it-shop/app/signin");
    assert.equal(editionActor(owner), null);
    assert.equal(editionActor({ ...katie, provider_id: "other-provider" }), null);
    assert.equal(editionActor(katie), katie); assert.equal(editionActor(client), client);
    assert.ok((await catalog(db)).every(s => s.provider_id === "katie"));
    await assert.rejects(service(db, "other-service"), /not available/);
    await assert.rejects(book(db, client, { ...foreignInput, requestKey: randomUUID() }), /not available/);
    await assert.rejects(book(db, client, foreignInput), /not found/);
    assert.equal(canAccess(client, foreign), false);
    assert.equal(canAccess(owner, foreign), false);
    await assert.rejects(change(db, client, foreign.id, { action: "cancel", revision: 1 }), /not found/);
    assert.ok(!(await visits(db, client)).some(a => a.id === foreign.id));
    await assert.rejects(visits(db, client, false, 0, "", 1, "other-provider"), /Provider access/);
    const results = await Promise.allSettled([
      book(db, client, { serviceId: "signature", start, note: "", requestKey: randomUUID() }),
      book(db, { ...client, id: "preview-other" }, { serviceId: "signature", start, note: "", requestKey: randomUUID() }),
    ]);
    assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
    assert.equal(results.filter(r => r.status === "rejected").length, 1);
    delete process.env.NEXT_PUBLIC_APP_EDITION;
    assert.equal(editionActor(owner), owner);
    assert.ok((await visits(db, client)).some(a => a.id === foreign.id));
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_APP_EDITION;
    else process.env.NEXT_PUBLIC_APP_EDITION = previous;
    await pg.close();
  }
});
