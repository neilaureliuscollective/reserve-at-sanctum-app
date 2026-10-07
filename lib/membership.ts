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
  availability?: "available" | "planned";
  destination?: "none" | "profile" | "chair" | "book" | "collection";
};

export type MembershipPlan = Row & {
  id: string;
  name: string;
  tagline: string;
  benefits: string[];
  benefit_model: MembershipBenefit[];
  active: boolean;
  sort_order: number;
  revision: number;
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
  location_enabled?: boolean;
  location_booking_enabled?: boolean;
  location_timezone?: string;
  revision: number;
  access_basis: "legacy" | "complimentary";
  plan_snapshot: {
    name: string;
    tagline: string;
    privileges: MembershipBenefit[];
    revision: number;
  } | null;
};

function asBenefits(value: unknown): string[] {
  if (Array.isArray(value))
    return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string") {
    try {
      return asBenefits(JSON.parse(value));
    } catch {
      return [];
    }
  }
  return [];
}

function asBenefitModel(
  value: unknown,
  fallback: string[],
): MembershipBenefit[] {
  if (Array.isArray(value)) {
    const parsed = value.flatMap((item) => {
      if (
        item &&
        typeof item === "object" &&
        "kind" in item &&
        "label" in item
      ) {
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
          return [
            {
              ...item,
              kind: kind as MembershipBenefitKind,
              label,
            } as MembershipBenefit,
          ];
      }
      return [];
    });
    if (parsed.length) return parsed;
  }
  return fallback.map((label) => ({ kind: "recognition", label }));
}

export async function listMembershipPlans(db: Queryable) {
  const rows = await db.query<MembershipPlan>(
    "SELECT id,name,tagline,benefits,benefit_model,active,sort_order,revision FROM reserve_membership_plans ORDER BY sort_order",
  );
  return rows.map((row) => {
    const benefits = asBenefits(row.benefits);
    return {
      ...row,
      benefits,
      benefit_model: asBenefitModel(row.benefit_model, benefits),
    };
  });
}
export async function readMembership(db: Queryable, actor: Actor) {
  const [row] = await db.query<Membership>(
    `SELECT m.*,COALESCE(m.plan_snapshot->>'name',p.name) AS plan_name,l.short_name AS location_name,l.enabled AS location_enabled,l.booking_enabled AS location_booking_enabled,l.timezone AS location_timezone FROM reserve_memberships m
     JOIN reserve_membership_plans p ON p.id=m.plan_id LEFT JOIN reserve_locations l ON l.id=m.location_id
     WHERE m.user_id=$1 ORDER BY CASE WHEN m.status='active' AND (m.ends_at IS NULL OR m.ends_at>now()) AND (m.starts_at IS NULL OR m.starts_at<=now()) THEN 0 WHEN m.status IN ('active','pending','paused') AND (m.ends_at IS NULL OR m.ends_at>now()) THEN 1 ELSE 2 END,m.created_at DESC LIMIT 1`,
    [actor.id],
  );
  return row ?? null;
}
export function membershipState(member: Membership | null, now = new Date()) {
  if (!member) return "none" as const;
  if (member.ends_at && new Date(member.ends_at).getTime() <= now.getTime())
    return "ended" as const;
  if (
    member.status === "active" &&
    member.starts_at &&
    new Date(member.starts_at).getTime() > now.getTime()
  )
    return "pending" as const;
  return member.status;
}
export async function membershipDesk(db: Queryable, actor: Actor | null) {
  const [plans, membership] = await Promise.all([
    listMembershipPlans(db),
    actor ? readMembership(db, actor) : Promise.resolve(null),
  ]);
  return {
    membership,
    plans,
    offered: plans.some((plan) => plan.active),
  };
}
