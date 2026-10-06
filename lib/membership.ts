import type { Queryable, Row } from "./db";
import type { Actor } from "./booking";

export type MembershipStatus = "pending" | "active" | "paused" | "ended";

export type MembershipBenefitKind =
  | "recognition"
  | "product_discount"
  | "service_benefit"
  | "credits"
  | "digital_access"
  | "location_eligibility";

export type MembershipBenefit = {
  kind: MembershipBenefitKind;
  label: string;
};

export type MembershipPlan = Row & {
  id: string;
  name: string;
  tagline: string;
  benefits: string[];
  benefit_model: MembershipBenefit[];
  active: boolean;
  sort_order: number;
};

export type Membership = Row & {
  id: string;
  user_id: string;
  plan_id: string;
  location_id: string | null;
  status: MembershipStatus;
  starts_at: string | Date | null;
  ends_at: string | Date | null;
  plan_name?: string;
  location_name?: string;
};

const fallbackPlans: MembershipPlan[] = [
  {
    id: "house",
    name: "House",
    tagline: "Belong to a Legacy Reserve location.",
    benefits: [
      "Location recognition",
      "Member product pricing when offered",
      "Visit history kept with your account",
    ],
    benefit_model: [
      { kind: "recognition", label: "Location recognition" },
      { kind: "product_discount", label: "Member product pricing when offered" },
      { kind: "recognition", label: "Visit history kept with your account" },
    ],
    active: false,
    sort_order: 1,
  },
  {
    id: "circle",
    name: "Circle",
    tagline: "Recurring care and included visits, when the house is ready.",
    benefits: [
      "Everything in House",
      "Perk-based services as they open",
      "Early access to member drops",
    ],
    benefit_model: [
      { kind: "recognition", label: "Everything in House" },
      { kind: "service_benefit", label: "Perk-based services as they open" },
      { kind: "product_discount", label: "Early access to member drops" },
    ],
    active: false,
    sort_order: 2,
  },
  {
    id: "private",
    name: "Private",
    tagline: "Consultation, digital benefits, and future performance partners.",
    benefits: [
      "Everything in Circle",
      "Consultation benefits as they open",
      "Digital access as it opens",
      "Location-specific privileges",
    ],
    benefit_model: [
      { kind: "recognition", label: "Everything in Circle" },
      { kind: "credits", label: "Consultation benefits as they open" },
      { kind: "digital_access", label: "Digital access as it opens" },
      { kind: "location_eligibility", label: "Location-specific privileges" },
    ],
    active: false,
    sort_order: 3,
  },
];

function asBenefits(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string") {
    try {
      return asBenefits(JSON.parse(value));
    } catch {
      return [];
    }
  }
  return [];
}

function asBenefitModel(value: unknown, fallback: string[]): MembershipBenefit[] {
  if (Array.isArray(value)) {
    const parsed = value.flatMap((item) => {
      if (item && typeof item === "object" && "kind" in item && "label" in item) {
        const kind = String((item as MembershipBenefit).kind);
        const label = String((item as MembershipBenefit).label);
        if (
          label &&
          [
            "recognition",
            "product_discount",
            "service_benefit",
            "credits",
            "digital_access",
            "location_eligibility",
          ].includes(kind)
        )
          return [{ kind: kind as MembershipBenefitKind, label }];
      }
      return [];
    });
    if (parsed.length) return parsed;
  }
  return fallback.map((label) => ({ kind: "recognition", label }));
}

export async function listMembershipPlans(db: Queryable) {
  try {
    const rows = await db.query<MembershipPlan>(
      "SELECT id,name,tagline,benefits,benefit_model,active,sort_order FROM reserve_membership_plans ORDER BY sort_order",
    );
    if (rows.length)
      return rows.map((row) => {
        const benefits = asBenefits(row.benefits);
        return {
          ...row,
          benefits,
          benefit_model: asBenefitModel(row.benefit_model, benefits),
        };
      });
  } catch {
    try {
      const rows = await db.query<MembershipPlan>(
        "SELECT id,name,tagline,benefits,active,sort_order FROM reserve_membership_plans ORDER BY sort_order",
      );
      if (rows.length)
        return rows.map((row) => {
          const benefits = asBenefits(row.benefits);
          return { ...row, benefits, benefit_model: asBenefitModel(null, benefits) };
        });
    } catch {
      /* Additive table may not exist on an unmigrated preview. */
    }
  }
  return fallbackPlans;
}

export async function readMembership(db: Queryable, actor: Actor) {
  try {
    const [row] = await db.query<Membership>(
      `SELECT m.*, p.name AS plan_name, l.short_name AS location_name
       FROM reserve_memberships m
       JOIN reserve_membership_plans p ON p.id=m.plan_id
       LEFT JOIN reserve_locations l ON l.id=m.location_id
       WHERE m.user_id=$1
       ORDER BY CASE m.status WHEN 'active' THEN 0 WHEN 'pending' THEN 1 WHEN 'paused' THEN 2 ELSE 3 END, m.created_at DESC
       LIMIT 1`,
      [actor.id],
    );
    return row ?? null;
  } catch {
    return null;
  }
}

export async function membershipDesk(db: Queryable, actor: Actor | null) {
  const plans = await listMembershipPlans(db);
  const membership = actor ? await readMembership(db, actor) : null;
  return {
    membership,
    plans,
    offered: plans.some((plan) => plan.active),
  };
}
