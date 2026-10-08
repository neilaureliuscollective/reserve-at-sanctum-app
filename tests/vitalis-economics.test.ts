import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { schema, seed, wrapPglite } from "../lib/db";
import {
  forecast,
  forecastSchema,
  preset,
  scaleEconomics,
  tierEconomics,
  productEconomics,
  exportCsv,
} from "../lib/vitalis/economics";
import { revenueOverview, saveForecast } from "../lib/vitalis/revenue-store";
import {
  billingBoundary,
  vitalisMembershipDesign,
} from "../lib/vitalis/membership-design";
import type { Actor } from "../lib/booking";
const close = (a: number, b: number) =>
  assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
function simple() {
  const s = preset("base");
  s.signups = [10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  s.tiers.forEach((t, i) => {
    t.mix = i === 0 ? 1 : 0;
    t.price = 100;
    t.churn = 0.1;
    t.digital = 0;
    t.support = 0;
    t.clinical = 0;
    t.labs = 0;
    t.onboarding = 0;
    t.quarterlyBox = 0;
  });
  s.cacStart = 10;
  s.cacEnd = 10;
  s.processingRate = 0;
  s.processingFixed = 0;
  s.membershipRefund = 0;
  s.productAttach = 0;
  s.fixed = 0;
  s.platform = 0;
  s.capacityCost = 0;
  s.upgradeEssential = 0;
  s.upgradeOptimize = 0;
  s.downgradeOptimize = 0;
  s.downgradeSovereign = 0;
  s.startup = 0;
  s.inventoryDeposit = 0;
  return s;
}
test("independent cohort rollforward, revenue, CAC and annual run-rate arithmetic", () => {
  const s = simple(),
    f = forecast(s);
  close(f.rows[0].active, 10);
  close(f.rows[1].active, 9);
  close(f.rows[11].active, 10 * 0.9 ** 11);
  close(f.rows[0].mrr, 1000);
  close(f.rows[0].operating, 900);
  close(f.year.netRevenue, (1000 * (1 - 0.9 ** 12)) / 0.1);
  close(f.rows[11].arr, f.rows[11].mrr * 12);
  assert.notEqual(f.year.netRevenue, f.rows[11].arr);
});
test("tier movements conserve members after cancellations and incur clinical onboarding", () => {
  const s = simple();
  s.tiers[0].mix = 0.5;
  s.tiers[1].mix = 0.5;
  s.upgradeEssential = 0.2;
  s.upgradeOptimize = 0.1;
  s.downgradeOptimize = 0.2;
  s.tiers[1].onboarding = 30;
  const f = forecast(s);
  close(f.rows[1].active, 9);
  close(f.rows[1].tiers[0], 4.5);
  close(f.rows[1].tiers[1], 4.05);
  close(f.rows[1].tiers[2], 0.45);
  close(f.rows[1].onboarding, 27);
});
test("medication inclusion changes cost only; partner-billed gross is never our revenue", () => {
  const s = simple();
  s.tiers[0].mix = 0;
  s.tiers[1].mix = 1;
  const f = forecast(s);
  s.tiers[1].medicationIncluded = true;
  s.tiers[1].medication = 100;
  s.tiers[1].medicationEligibility = 0.8;
  s.partnerTreatmentAttach = 0.5;
  s.partnerTreatmentPrice = 100;
  const g = forecast(s);
  close(g.rows[0].medication, 800);
  close(g.rows[0].operating, f.rows[0].operating - 800);
  close(g.rows[0].partnerGross, 500);
  close(g.rows[0].grossRevenue, f.rows[0].grossRevenue);
});
test("quarterly expense and quarterly cash are distinct, startup and inventory consume cash", () => {
  const s = simple();
  s.tiers[0].mix = 0;
  s.tiers[2].mix = 1;
  s.tiers[2].quarterlyBox = 60;
  s.startup = 5000;
  s.inventoryDeposit = 1000;
  const f = forecast(s);
  close(f.rows[0].boxExpense, 200);
  close(f.rows[0].boxCash, 0);
  close(f.rows[2].boxCash, 486);
  close(f.rows[0].cashFlow, f.rows[0].operating + 200);
  close(
    f.year.cashFlow,
    f.year.operating +
      f.rows.reduce((n, r) => n + r.boxExpense - r.boxCash, 0) -
      6000,
  );
  assert.ok(f.capital >= 6000);
});
test("discount protection excludes loss-making orders and refunds are deducted once", () => {
  const s = simple();
  s.productAttach = 1;
  s.productPrice = 50;
  s.productCost = 40;
  s.productFulfillment = 10;
  s.tiers[0].discount = 0.2;
  const p = productEconomics(s, 0);
  assert.equal(p.allowed, false);
  const f = forecast(s);
  close(f.rows[0].productGross, 0);
  s.productCost = 10;
  s.productFulfillment = 2;
  s.productRefund = 0.1;
  s.membershipRefund = 0.1;
  const g = forecast(s);
  close(g.rows[0].grossRevenue, 1400);
  close(g.rows[0].refunds, 140);
  close(g.rows[0].netRevenue, 1260);
  close(g.rows[0].productCosts, 120);
});
test("input validation prevents negative, NaN, extra fields, bad mix and impossible transitions", () => {
  const s = simple();
  assert.throws(() => forecast({ ...s, cacStart: -1 }));
  assert.throws(() => forecast({ ...s, fixed: NaN }));
  assert.throws(() => forecast({ ...s, patient: "private" }));
  assert.throws(() => forecast({ ...s, signups: [1] }));
  assert.throws(() =>
    forecast({ ...s, upgradeOptimize: 0.6, downgradeOptimize: 0.6 }),
  );
  s.tiers[0].mix = 0.5;
  assert.throws(() => forecast(s));
});
test("LTV is undefined at zero churn, negative contribution has no payback; steady scale replaces lost cohorts", () => {
  const s = simple();
  s.tiers[0].churn = 0;
  assert.equal(tierEconomics(s, 0).ltv, null);
  s.tiers[0].churn = 0.1;
  s.tiers[0].onboarding = 30;
  s.tiers[0].digital = 110;
  assert.equal(tierEconomics(s, 0).payback, null);
  const r = scaleEconomics(s, 100);
  close(r.acquisition, 100);
  close(r.onboarding, 300);
  close(r.operating, -1400);
});
test("presets are independent drafts; CSV has twelve numeric rows; billing stays inert", () => {
  const a = preset("base"),
    b = preset("base");
  a.tiers[1].price = 999;
  assert.equal(b.tiers[1].price, 149);
  for (const k of ["base", "strong", "conservative"] as const) {
    assert.ok(forecastSchema.safeParse(preset(k)).success);
    assert.equal(exportCsv(preset(k)).split("\n").length, 13);
  }
  assert.equal(billingBoundary.canCharge, false);
  assert.equal(billingBoundary.canEnroll, false);
  assert.equal(billingBoundary.canGrantDiscount, false);
  assert.deepEqual(
    vitalisMembershipDesign.map((p) => p.price),
    [49, 149, 249],
  );
});
let pg: PGlite, db: ReturnType<typeof wrapPglite>;
const owner: Actor = {
  id: "preview-neil",
  role: "owner",
  name: "Test",
  email: "test@preview.invalid",
  provider_id: null,
};
before(async () => {
  pg = new PGlite();
  await pg.waitReady;
  db = wrapPglite(pg);
  await schema(db);
  await seed(db);
});
after(async () => pg.close());
test("founder-only scenario persistence, no fake paid metrics, atomic stale-edit protection and private grants", async () => {
  const s = preset("base"),
    staff = { ...owner, role: "operator" as const };
  await assert.rejects(revenueOverview(db, staff), /Owner/);
  await assert.rejects(
    saveForecast(db, staff, { key: "base", revision: 0, assumptions: s }),
    /Owner/,
  );
  const results = await Promise.allSettled([
    saveForecast(db, owner, { key: "base", revision: 0, assumptions: s }),
    saveForecast(db, owner, { key: "base", revision: 0, assumptions: s }),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  await assert.rejects(
    saveForecast(db, owner, { key: "base", revision: 0, assumptions: s }),
    /changed/,
  );
  const saved = await revenueOverview(db, owner);
  assert.equal(saved.actuals.paidRevenue, null);
  assert.equal(saved.scenarios.find((x) => x.key === "base")?.revision, 1);
  await saveForecast(db, owner, {
    key: "base",
    revision: 1,
    assumptions: { ...s, cacStart: 180 },
  });
  const reread = await revenueOverview(db, owner);
  assert.equal(
    reread.scenarios.find((x) => x.key === "base")?.assumptions.cacStart,
    180,
  );
  const [r] = await db.query(
    "SELECT relrowsecurity FROM pg_class WHERE relname='reserve_vitalis_forecasts'",
  );
  assert.equal(r.relrowsecurity, true);
  assert.equal(
    (
      await db.query(
        "SELECT * FROM pg_policies WHERE tablename='reserve_vitalis_forecasts'",
      )
    ).length,
    0,
  );
  assert.equal(
    (
      await db.query(
        "SELECT * FROM information_schema.role_table_grants WHERE table_name='reserve_vitalis_forecasts' AND grantee='PUBLIC'",
      )
    ).length,
    0,
  );
});
