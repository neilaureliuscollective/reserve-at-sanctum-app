import type { Queryable, Row } from "./db";
import type { Actor } from "./booking";

export type MembershipStatus = "pending" | "active" | "paused" | "ended";

export type MembershipPlan = Row & {
  id: string;
  name: string;
  tagline: string;
  benefits: string[];
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
      "Location-specific privileges",
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

export async function listMembershipPlans(db: Queryable) {
  try {
    const rows = await db.query<MembershipPlan>(
      "SELECT id,name,tagline,benefits,active,sort_order FROM reserve_membership_plans ORDER BY sort_order",
    );
    if (rows.length)
      return rows.map((row) => ({ ...row, benefits: asBenefits(row.benefits) }));
  } catch {
    /* Additive table may not exist on an unmigrated preview. */
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
