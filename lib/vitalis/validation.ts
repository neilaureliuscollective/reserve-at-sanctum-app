import { z } from "zod";
export const noticeVersion = "vitalis-2026-10-08";
export const categories = [
  "hormones",
  "diagnostics",
  "longevity",
  "care-navigation",
] as const;
export const categoryLabels: Record<(typeof categories)[number], string> = {
  hormones: "Hormone health",
  diagnostics: "Advanced diagnostics",
  longevity: "Longevity & prevention",
  "care-navigation": "Clinical navigation",
};
export const states =
  "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY PR GU VI AS MP".split(
    " ",
  );
export const interestInput = z
  .object({
    interests: z
      .array(z.enum(categories))
      .max(4)
      .refine((x) => new Set(x).size === x.length),
    region: z.string().refine((x) => x === "" || states.includes(x)),
    outreach: z.boolean(),
    collectionConsent: z.literal(true),
    noticeVersion: z.literal(noticeVersion),
    revision: z.number().int().nonnegative(),
  })
  .strict();
export const revisionInput = z
  .object({ revision: z.number().int().nonnegative() })
  .strict();
export const settingsInput = z
  .object({
    visible: z.boolean(),
    registration_open: z.boolean(),
    revision: z.number().int().positive(),
  })
  .strict();
export const partnerInput = z
  .object({
    id: z.string().uuid(),
    name: z.string().trim().min(2).max(100),
    categories: z.array(z.enum(categories)).min(1).max(4),
    regions: z.array(z.string().refine((x) => states.includes(x))).max(56),
    status: z.enum(["draft", "in-review", "verified", "paused", "archived"]),
    kind: z.enum(["clinical", "nonclinical"]),
    destination: z
      .string()
      .max(500)
      .refine((x) => {
        if (!x) return true;
        try {
          const u = new URL(x);
          return (
            u.protocol === "https:" &&
            !u.username &&
            !u.password &&
            !u.port &&
            !u.search &&
            !u.hash &&
            u.hostname.includes(".") &&
            !/^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(u.hostname)
          );
        } catch {
          return false;
        }
      }, "Use a reviewed HTTPS destination without query parameters."),
    destinationReviewed: z.boolean(),
    revision: z.number().int().nonnegative(),
  })
  .strict()
  .refine(
    (x) => !x.destination || x.destinationReviewed,
    "Review the destination before saving.",
  );
export type Interest = {
  status: "active" | "withdrawn";
  interests: string[];
  region: string;
  outreach: boolean;
  revision: number;
};
export type Settings = {
  visible: boolean;
  registration_open: boolean;
  revision: number;
};
export type Partner = z.infer<typeof partnerInput> & { reviewed_at?: string };
