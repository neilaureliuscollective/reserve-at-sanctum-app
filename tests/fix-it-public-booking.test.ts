import { test } from "node:test";
import assert from "node:assert/strict";
import { fixItPublicBooking, publicBookingHref, isKatiePublicBookingRequest } from "../lib/fix-it-public-booking";
import { fixItManifest } from "../lib/fix-it-booking";
import type { Queryable } from "../lib/db";

test("Katie public handoff uses only the confirmed root URL; other professionals retain full native intent", () => {
  const native = "/book?provider=another&service=their-service&location=elsewhere";
  assert.equal(publicBookingHref("katie", native), "https://fixitshop.glossgenius.com/");
  assert.equal(publicBookingHref("another", native), native);
});
test("legacy default/Katie routes hand off; explicit other providers and destinations do not", async () => {
  const noQuery: Queryable = {query: async()=>{ throw Error("must not query"); }};
  for (const query of [{}, {location:"eunice"}, {provider:"katie",service:"arbitrary"}])
    assert.equal(await isKatiePublicBookingRequest(query,noQuery),true);
  for (const query of [{provider:"another",service:"katie-service"}, {location:"other-house"}])
    assert.equal(await isKatiePublicBookingRequest(query,noQuery),false);
});
test("service-only deep links resolve ownership without stealing unknown/other-provider links", async () => {
  for (const owner of ["katie", "another", undefined]) {
    const db = {query:async(sql:string, params:unknown[])=>{
      assert.match(sql,/WHERE id=\$1/); assert.deepEqual(params,["existing-service"]);
      return owner ? [{provider_id:owner}] : [];
    }} as Queryable;
    assert.equal(await isKatiePublicBookingRequest({service:"existing-service"},db),owner==="katie");
  }
  assert.equal(await isKatiePublicBookingRequest({service:"unknown"}),false);
  const error=Error("database unavailable");
  await assert.rejects(isKatiePublicBookingRequest({service:"existing-service"},{query:async()=>{throw error;}}),e=>e===error);
});
test("installed shortcuts remain within app scope and clearly identify the external handoff", () => {
  const shortcuts=fixItManifest().shortcuts!;
  for (const item of shortcuts.filter(s=>s.name.includes("GlossGenius"))) {
    assert.equal(item.url,"/fix-it-shop/app/book");
  }
  assert.equal(shortcuts.filter(s=>s.name.includes("GlossGenius")).length,2);
  assert.equal(new URL(fixItPublicBooking.href).pathname,"/");
});
