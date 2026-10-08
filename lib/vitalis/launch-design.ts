import { z } from "zod";
export const launchGates = [
  {
    key: "offer",
    title: "One viable launch offer",
    detail:
      "Validate member value, price, included services, exclusions and the margin floor using a written cost stack.",
  },
  {
    key: "partner",
    title: "Partner costs and operating terms",
    detail:
      "Written quote for consultation frequency, labs, medications, dispensing, shipping, platform usage and minimums.",
  },
  {
    key: "clinical",
    title: "Clinical responsibilities and availability",
    detail:
      "Confirm licensed-provider responsibility, supported states, eligibility, follow-up, pharmacy and escalation pathways.",
  },
  {
    key: "processor",
    title: "Approved billing arrangement",
    detail:
      "Written processor/partner approval for the actual offer. Square online prescription restrictions still apply.",
  },
  {
    key: "privacy",
    title: "Consent and privacy review",
    detail:
      "Confirm data flows, partner consent, privacy obligations, retention, incident response and account deletion.",
  },
  {
    key: "products",
    title: "Verified retail margins",
    detail:
      "Confirm SKU landed costs, shipping, bundle costs, exclusions and a positive margin floor before activating discounts.",
  },
  {
    key: "operations",
    title: "Support, cancellation and refunds",
    detail:
      "Set realistic response capacity, renewal disclosures, cancellation, refunds and fulfillment responsibilities.",
  },
  {
    key: "pilot",
    title: "Member value validation",
    detail:
      "Observe a voluntary pilot and obtain member feedback with permission. Habit activity alone does not prove willingness to pay.",
  },
  {
    key: "sandbox",
    title: "Billing and handoff verification",
    detail:
      "Test approved sandbox billing, renewal failures, refunds, entitlements and separate partner handoffs before final paid-launch approval.",
  },
] as const;
export const gateKeys = launchGates.map((g) => g.key) as [
  "offer",
  "partner",
  "clinical",
  "processor",
  "privacy",
  "products",
  "operations",
  "pilot",
  "sandbox",
];
export const launchInput = z
  .object({
    key: z.enum(gateKeys),
    reviewed: z.boolean(),
    reference: z
      .string()
      .trim()
      .max(500)
      .refine((value) => {
        if (!value) return true;
        if (
          /^docs\/[a-zA-Z0-9_/-]+\.(md|pdf)$/.test(value) &&
          !value.includes("..")
        )
          return true;
        try {
          const u = new URL(value);
          return (
            u.protocol === "https:" &&
            !u.username &&
            !u.password &&
            !u.search &&
            !u.hash &&
            !u.port &&
            u.hostname.includes(".") &&
            !/^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(u.hostname)
          );
        } catch {
          return false;
        }
      }, "Use a document reference or HTTPS URL without access tokens."),
    revision: z.number().int().nonnegative(),
  })
  .strict()
  .refine(
    (i) => !i.reviewed || Boolean(i.reference),
    "A recorded review needs an evidence reference.",
  );
export type LaunchRecord = {
  key: string;
  reviewed: boolean;
  reference: string;
  revision: number;
  updated_at: string | null;
};
export const commercialBoundary = Object.freeze({
  canCharge: false,
  canEnrollClinical: false,
  canGrantDiscount: false,
});
