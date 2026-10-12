import test from "node:test";
import assert from "node:assert/strict";
import { operatorIdentity } from "../lib/booking-operator-identity";
import { hasCapability } from "../lib/studio-permissions";
import type { Actor } from "../lib/booking";

test("Katie's independent business presentation does not confer platform administration", () => {
  for (const role of ["staff", "operator"] as const) {
    const actor: Actor = { id: "synthetic-katie", name: "Synthetic Katie", email: "katie@example.invalid", role, provider_id: "katie" };
    assert.equal(operatorIdentity(actor).affiliation, "FIX IT SHOP · KATIE’S STUDIO");
    assert.equal(hasCapability(actor, "appointments.manage"), true);
    for (const capability of ["users.admin", "finance.read", "operations.configure"] as const) {
      assert.equal(hasCapability(actor, capability), false);
    }
  }
});

test("platform administrators and unrelated providers are not labeled as Fix It Shop operators", () => {
  for (const provider_id of [null, "katie", "synthetic-other"]) {
    assert.equal(operatorIdentity({ role: "owner", provider_id }).affiliation, "PLATFORM · OPERATIONS");
  }
  for (const role of ["staff", "operator"] as const) {
    for (const provider_id of [null, "synthetic-other"]) {
      const identity = operatorIdentity({ role, provider_id });
      assert.equal(identity.affiliation, "PROVIDER · OPERATIONS");
      assert.equal(identity.customerLabel, "View Fix It Shop");
    }
  }
});
