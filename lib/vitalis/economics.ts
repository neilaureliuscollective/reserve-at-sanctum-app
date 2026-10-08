import { z } from "zod";
export const tierNames = ["Essential", "Optimize", "Sovereign"] as const;
const money = z.number().finite().min(0).max(100000);
const ratio = z.number().finite().min(0).max(1);
export const tierSchema = z
  .object({
    price: money,
    mix: ratio,
    churn: ratio,
    digital: money,
    support: money,
    clinical: money,
    labs: money,
    onboarding: money,
    medicationIncluded: z.boolean(),
    medication: money,
    medicationEligibility: ratio,
    discount: ratio,
    quarterlyBox: money,
  })
  .strict();
export const forecastSchema = z
  .object({
    version: z.literal(1),
    signups: z.array(z.number().int().min(0).max(10000)).length(12),
    tiers: z.array(tierSchema).length(3),
    cacStart: money,
    cacEnd: money,
    upgradeEssential: ratio,
    upgradeOptimize: ratio,
    downgradeOptimize: ratio,
    downgradeSovereign: ratio,
    productAttach: ratio,
    productPrice: money,
    productCost: money,
    productFulfillment: money,
    productRefund: ratio,
    processingRate: ratio,
    processingFixed: money,
    membershipRefund: ratio,
    partnerTreatmentAttach: ratio,
    partnerTreatmentPrice: money,
    fixed: money,
    platform: money,
    capacityStep: z.number().int().min(1).max(10000),
    capacityCost: money,
    startup: money,
    inventoryDeposit: money,
  })
  .strict()
  .superRefine((s, ctx) => {
    if (Math.abs(s.tiers.reduce((n, t) => n + t.mix, 0) - 1) > 0.000001)
      ctx.addIssue({
        code: "custom",
        message: "New-member tier mix must total 100%.",
      });
    if (s.upgradeOptimize + s.downgradeOptimize > 1)
      ctx.addIssue({
        code: "custom",
        message: "Optimize transition rates cannot exceed 100%.",
      });
  });
export type Forecast = z.infer<typeof forecastSchema>;
export const scenarioKeys = ["conservative", "base", "strong"] as const;
export type ScenarioKey = (typeof scenarioKeys)[number];
export function preset(key: ScenarioKey): Forecast {
  const base: Forecast = {
    version: 1,
    signups: [15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 46, 50],
    tiers: [
      {
        price: 49,
        mix: 0.25,
        churn: 0.07,
        digital: 12,
        support: 8,
        clinical: 0,
        labs: 0,
        onboarding: 0,
        medicationIncluded: false,
        medication: 0,
        medicationEligibility: 0,
        discount: 0.1,
        quarterlyBox: 0,
      },
      {
        price: 149,
        mix: 0.6,
        churn: 0.07,
        digital: 10,
        support: 15,
        clinical: 25,
        labs: 20,
        onboarding: 30,
        medicationIncluded: false,
        medication: 35,
        medicationEligibility: 0.8,
        discount: 0.15,
        quarterlyBox: 0,
      },
      {
        price: 249,
        mix: 0.15,
        churn: 0.07,
        digital: 15,
        support: 35,
        clinical: 35,
        labs: 25,
        onboarding: 30,
        medicationIncluded: false,
        medication: 35,
        medicationEligibility: 0.8,
        discount: 0.2,
        quarterlyBox: 45,
      },
    ],
    cacStart: 150,
    cacEnd: 120,
    upgradeEssential: 0.01,
    upgradeOptimize: 0.005,
    downgradeOptimize: 0.01,
    downgradeSovereign: 0.01,
    productAttach: 0.2,
    productPrice: 50,
    productCost: 18,
    productFulfillment: 4,
    productRefund: 0.02,
    processingRate: 0.035,
    processingFixed: 0.15,
    membershipRefund: 0.015,
    partnerTreatmentAttach: 0,
    partnerTreatmentPrice: 100,
    fixed: 4000,
    platform: 150,
    capacityStep: 100,
    capacityCost: 500,
    startup: 10000,
    inventoryDeposit: 1000,
  };
  if (key === "conservative") {
    base.signups = [8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 19, 20];
    base.cacStart = 220;
    base.cacEnd = 200;
    base.productAttach = 0.12;
    base.membershipRefund = 0.03;
    base.startup = 15000;
    base.tiers.forEach((t) => {
      t.churn = 0.1;
      t.support *= 1.25;
      t.clinical *= 1.4;
      t.labs *= 1.25;
      t.onboarding = t.onboarding ? 60 : 0;
    });
  }
  if (key === "strong") {
    base.signups = [25, 30, 35, 40, 45, 50, 60, 65, 75, 80, 90, 95];
    base.cacStart = 120;
    base.cacEnd = 90;
    base.productAttach = 0.3;
    base.membershipRefund = 0.01;
    base.startup = 15000;
    base.tiers.forEach((t) => {
      t.churn = 0.05;
    });
  }
  return base;
}
export function productEconomics(s: Forecast, tier: number) {
  const t = s.tiers[tier],
    gross = s.productPrice * (1 - t.discount);
  const refunds = gross * s.productRefund,
    fees = gross * s.processingRate + s.processingFixed;
  const net = gross - refunds,
    margin = net - s.productCost - s.productFulfillment - fees;
  return { gross, net, refunds, fees, margin, allowed: margin >= 0 };
}
export function tierEconomics(s: Forecast, i: number) {
  const t = s.tiers[i],
    med = t.medicationIncluded ? t.medication * t.medicationEligibility : 0;
  const service = t.digital + t.support + t.clinical + t.labs + med;
  const product = productEconomics(s, i),
    productContribution = product.allowed
      ? s.productAttach * product.margin
      : 0;
  const box = t.quarterlyBox / 3,
    refunds = t.price * s.membershipRefund,
    fees = t.price * s.processingRate + s.processingFixed;
  const contribution =
    t.price - refunds - fees - service - box + productContribution;
  const headroom =
    t.price -
    refunds -
    fees -
    (t.digital + t.support + t.clinical + t.labs) -
    box +
    productContribution;
  const ltv = t.churn > 0 ? contribution / t.churn - t.onboarding : null;
  return {
    service,
    med,
    box,
    refunds,
    fees,
    productContribution,
    contribution,
    headroom,
    ltv,
    margin: t.price > 0 ? contribution / t.price : null,
    ltvCac: ltv !== null && s.cacStart > 0 ? ltv / s.cacStart : null,
    payback: contribution > 0 ? s.cacStart / contribution : null,
  };
}
export function forecast(input: unknown) {
  const s = forecastSchema.parse(input);
  let closing = [0, 0, 0],
    cumulative = -s.startup - s.inventoryDeposit;
  const rows = s.signups.map((joins, m) => {
    const opening = [...closing],
      cancellations = opening.map((n, i) => n * s.tiers[i].churn);
    const survivors = opening.map((n, i) => n - cancellations[i]);
    const moves = [
      survivors[0] * s.upgradeEssential,
      survivors[1] * s.upgradeOptimize,
      survivors[1] * s.downgradeOptimize,
      survivors[2] * s.downgradeSovereign,
    ];
    closing = [
      survivors[0] - moves[0] + moves[2] + joins * s.tiers[0].mix,
      survivors[1] +
        moves[0] -
        moves[1] -
        moves[2] +
        moves[3] +
        joins * s.tiers[1].mix,
      survivors[2] + moves[1] - moves[3] + joins * s.tiers[2].mix,
    ];
    const active = closing.reduce((a, b) => a + b, 0),
      churned = cancellations.reduce((a, b) => a + b, 0);
    let membership = 0,
      productRevenue = 0,
      productGross = 0,
      productCosts = 0,
      fees = 0,
      refunds = 0,
      clinical = 0,
      labs = 0,
      digital = 0,
      support = 0,
      medication = 0,
      boxExpense = 0,
      boxCash = 0,
      onboarding = 0,
      productOrders = 0;
    closing.forEach((n, i) => {
      const t = s.tiers[i],
        p = productEconomics(s, i),
        e = tierEconomics(s, i),
        orders = p.allowed ? n * s.productAttach : 0;
      membership += n * t.price;
      refunds += n * e.refunds + orders * p.refunds;
      fees += n * e.fees + orders * p.fees;
      productGross += orders * p.gross;
      productRevenue += orders * p.net;
      productCosts += orders * (s.productCost + s.productFulfillment);
      productOrders += orders;
      clinical += n * t.clinical;
      labs += n * t.labs;
      digital += n * t.digital;
      support += n * t.support;
      medication += n * e.med;
      boxExpense += n * e.box;
      boxCash += (m + 1) % 3 === 0 ? n * t.quarterlyBox : 0;
      // A modeled upgrade into a clinical tier incurs its onboarding allowance too.
      onboarding += (joins * t.mix + (i === 1 ? moves[0] : 0)) * t.onboarding;
    });
    const cac = s.cacStart + ((s.cacEnd - s.cacStart) * m) / 11,
      acquisition = joins * cac;
    const grossRevenue = membership + productGross,
      netRevenue = grossRevenue - refunds;
    const delivery =
      clinical +
      labs +
      digital +
      support +
      medication +
      boxExpense +
      onboarding +
      productCosts;
    const grossProfit = netRevenue - delivery,
      contribution = grossProfit - fees;
    const capacity =
      Math.max(0, Math.ceil(active / s.capacityStep) - 1) * s.capacityCost;
    const overhead = s.fixed + s.platform + capacity,
      operating = contribution - acquisition - overhead;
    const cashFlow = operating + boxExpense - boxCash;
    cumulative += cashFlow;
    const partnerGross =
      (closing[1] + closing[2]) *
      s.partnerTreatmentAttach *
      s.partnerTreatmentPrice;
    return {
      month: m + 1,
      opening: opening.reduce((a, b) => a + b, 0),
      joins,
      churned,
      upgrades: moves[0] + moves[1],
      downgrades: moves[2] + moves[3],
      tiers: [...closing],
      active,
      mrr: membership,
      arr: membership * 12,
      arpm: active ? membership / active : 0,
      membership,
      productGross,
      productRevenue,
      productOrders,
      productCosts,
      productContribution:
        productRevenue -
        productCosts -
        productOrders * s.processingFixed -
        productGross * s.processingRate,
      partnerGross,
      grossRevenue,
      netRevenue,
      refunds,
      fees,
      clinical,
      labs,
      digital,
      support,
      medication,
      boxExpense,
      boxCash,
      onboarding,
      delivery,
      grossProfit,
      contribution,
      acquisition,
      cac,
      capacity,
      overhead,
      operating,
      cashFlow,
      cumulative,
    };
  });
  const sum = (k: keyof (typeof rows)[number]) =>
    rows.reduce(
      (n, r) => n + (typeof r[k] === "number" ? (r[k] as number) : 0),
      0,
    );
  const firstOperating = rows.find((r) => r.operating >= 0)?.month ?? null;
  const sustainedOperating =
    rows.find(
      (r, i) =>
        r.operating >= 0 && rows.slice(i).every((x) => x.operating >= 0),
    )?.month ?? null;
  const capital = Math.max(
    0,
    -Math.min(
      -s.startup - s.inventoryDeposit,
      ...rows.map((r) => r.cumulative),
    ),
  );
  return {
    rows,
    year: {
      grossRevenue: sum("grossRevenue"),
      netRevenue: sum("netRevenue"),
      operating: sum("operating"),
      cashFlow: sum("cashFlow") - s.startup - s.inventoryDeposit,
      acquisition: sum("acquisition"),
      refunds: sum("refunds"),
      fees: sum("fees"),
      partnerGross: sum("partnerGross"),
    },
    capital,
    firstOperating,
    sustainedOperating,
    cashRecovery: rows.find((r) => r.cumulative >= 0)?.month ?? null,
  };
}
export function scaleEconomics(input: unknown, active: number) {
  const s = forecastSchema.parse(input);
  if (!Number.isFinite(active) || active < 0) throw Error("Invalid scale");
  const mrr = s.tiers.reduce((n, t) => n + active * t.mix * t.price, 0);
  const contribution = s.tiers.reduce(
    (n, t, i) => n + active * t.mix * tierEconomics(s, i).contribution,
    0,
  );
  const replacement = active * s.tiers.reduce((n, t) => n + t.mix * t.churn, 0),
    acquisition = replacement * s.cacEnd;
  const onboarding =
    active * s.tiers.reduce((n, t) => n + t.mix * t.churn * t.onboarding, 0);
  const overhead =
    s.fixed +
    s.platform +
    Math.max(0, Math.ceil(active / s.capacityStep) - 1) * s.capacityCost;
  return {
    active,
    mrr,
    contribution,
    acquisition,
    onboarding,
    overhead,
    operating: contribution - acquisition - onboarding - overhead,
  };
}
export function exportCsv(input: unknown) {
  const r = forecast(input);
  const keys = Object.keys(r.rows[0]).filter(
    (k) => k !== "tiers",
  ) as (keyof (typeof r.rows)[number])[];
  return [
    keys.join(","),
    ...r.rows.map((row) => keys.map((k) => row[k]).join(",")),
  ].join("\n");
}
