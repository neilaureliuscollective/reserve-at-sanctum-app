import { randomUUID } from "node:crypto";
import { z } from "zod";
import { BookingError, type Actor } from "./booking";
import type { Database, Queryable, Row } from "./db";
import {
  listMembershipPlans,
  membershipState,
  type Membership,
  type MembershipPlan,
} from "./membership";

export const privilegeSchema = z
  .object({
    kind: z.enum([
      "recognition",
      "digital_access",
      "location_eligibility",
      "product_discount",
      "service_benefit",
      "credits",
    ]),
    label: z.string().trim().min(3).max(160),
    availability: z.enum(["available", "planned"]),
    destination: z.enum(["none", "profile", "chair", "book", "collection"]),
  })
  .strict()
  .superRefine((b, ctx) => {
    if (
      b.availability === "available" &&
      ["product_discount", "service_benefit", "credits"].includes(b.kind)
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Pricing, service redemption and credits are not activated yet.",
      });
  });
export type Privilege = z.infer<typeof privilegeSchema>;
export const planInput = z
  .object({
    id: z.string().min(1).max(80),
    revision: z.number().int().positive(),
    name: z.string().trim().min(3).max(80),
    tagline: z.string().trim().max(240),
    active: z.boolean(),
    benefit_model: z.array(privilegeSchema).min(1).max(12),
  })
  .strict()
  .superRefine((p, ctx) => {
    if (
      p.active &&
      !p.benefit_model.some((b) => b.availability === "available")
    )
      ctx.addIssue({
        code: "custom",
        message: "Publish only when at least one privilege is available.",
      });
  });
export const grantInput = z
  .object({
    email: z
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    planId: z.string().min(1).max(80),
    planRevision: z.number().int().positive(),
    locationId: z.string().max(80).nullable(),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
    acknowledge: z.literal(true),
  })
  .strict()
  .refine((p) => Date.parse(p.endsAt) > Date.parse(p.startsAt), {
    message: "End must follow start.",
  });
export type MemberRequest = Row & {
  id: string;
  user_id: string;
  status: "submitted" | "closed" | "withdrawn" | "fulfilled";
  interest: string;
  revision: number;
  updated_at: string | Date;
};
export function requireMembershipOwner(actor: Actor) {
  if (actor.role !== "owner")
    throw new BookingError(
      "Membership management is reserved for the owner.",
      403,
    );
}
async function audit(
  db: Queryable,
  actor: Actor,
  subject: string,
  event: string,
  detail: object = {},
) {
  await db.query(
    "INSERT INTO reserve_membership_events(id,actor_id,subject_id,event,detail) VALUES($1,$2,$3,$4,$5::jsonb)",
    [randomUUID(), actor.id, subject, event, JSON.stringify(detail)],
  );
}
export async function memberRequest(db: Queryable, actor: Actor) {
  const [row] = await db.query<MemberRequest>(
    "SELECT id,user_id,status,interest,revision,updated_at FROM reserve_membership_requests WHERE user_id=$1",
    [actor.id],
  );
  return row ?? null;
}
export async function requestMembership(
  db: Database,
  actor: Actor,
  raw: unknown,
) {
  if (actor.role !== "client")
    throw new BookingError("Use your member account to request access.", 403);
  const input = z
    .object({ interest: z.enum(["membership", "services", "products"]) })
    .strict()
    .parse(raw);
  return db.transaction(async (tx) => {
    await tx.query("SELECT id FROM reserve_users WHERE id=$1 FOR UPDATE", [
      actor.id,
    ]);
    const current = await memberRequest(tx, actor);
    if (current?.status === "submitted" || current?.status === "fulfilled")
      return current;
    // Closed requests require owner review rather than repeated queue submissions.
    if (current?.status === "closed")
      throw new BookingError(
        "Your request has been reviewed. It remains in your Reserve record.",
        409,
      );
    const [row] = await tx.query<MemberRequest>(
      `INSERT INTO reserve_membership_requests(id,user_id,interest) VALUES($1,$2,$3)
      ON CONFLICT(user_id) DO UPDATE SET status='submitted',interest=EXCLUDED.interest,revision=reserve_membership_requests.revision+1,updated_at=now() RETURNING *`,
      [randomUUID(), actor.id, input.interest],
    );
    await audit(tx, actor, row.id, "request.submitted");
    return row;
  });
}
export async function closeRequest(
  db: Database,
  actor: Actor,
  id: string,
  revision: number,
  withdraw = false,
) {
  if (!withdraw) requireMembershipOwner(actor);
  return db.transaction(async (tx) => {
    const [r] = await tx.query<MemberRequest>(
      "SELECT * FROM reserve_membership_requests WHERE id=$1 FOR UPDATE",
      [id],
    );
    if (!r || (withdraw && r.user_id !== actor.id))
      throw new BookingError("Request not found.", 404);
    if (r.revision !== revision || r.status !== "submitted")
      throw new BookingError(
        "This request changed. Refresh before trying again.",
        409,
      );
    await tx.query(
      "UPDATE reserve_membership_requests SET status=$2,revision=revision+1,updated_at=now() WHERE id=$1",
      [id, withdraw ? "withdrawn" : "closed"],
    );
    await audit(
      tx,
      actor,
      id,
      withdraw ? "request.withdrawn" : "request.closed",
    );
  });
}
export async function savePlan(db: Database, actor: Actor, raw: unknown) {
  requireMembershipOwner(actor);
  const input = planInput.parse(raw);
  return db.transaction(async (tx) => {
    const [p] = await tx.query<MembershipPlan>(
      "SELECT * FROM reserve_membership_plans WHERE id=$1 FOR UPDATE",
      [input.id],
    );
    if (!p) throw new BookingError("Plan not found.", 404);
    if (p.revision !== input.revision)
      throw new BookingError("This plan changed. Refresh before saving.", 409);
    await tx.query(
      "UPDATE reserve_membership_plans SET name=$2,tagline=$3,active=$4,benefits=$5::jsonb,benefit_model=$6::jsonb,revision=revision+1 WHERE id=$1",
      [
        input.id,
        input.name,
        input.tagline,
        input.active,
        JSON.stringify(input.benefit_model.map((b) => b.label)),
        JSON.stringify(input.benefit_model),
      ],
    );
    await audit(tx, actor, input.id, "plan.updated", {
      revision: input.revision + 1,
      published: input.active,
    });
  });
}
export async function grantMembership(
  db: Database,
  actor: Actor,
  raw: unknown,
) {
  requireMembershipOwner(actor);
  const input = grantInput.parse(raw);
  if (Date.parse(input.endsAt) <= Date.now())
    throw new BookingError("Membership must end in the future.", 400);
  return db.transaction(async (tx) => {
    const users = await tx.query<{ id: string }>(
      "SELECT id FROM reserve_users WHERE lower(email)=$1 AND role='client' FOR UPDATE",
      [input.email],
    );
    const user = users[0];
    if (!user)
      throw new BookingError(
        "No member account matches that email. Ask them to sign in first.",
        404,
      );
    if (users.length !== 1)
      throw new BookingError(
        "More than one account matches this email. Review the account records before granting access.",
        409,
      );
    const [plan] = await tx.query<MembershipPlan>(
      "SELECT * FROM reserve_membership_plans WHERE id=$1 FOR UPDATE",
      [input.planId],
    );
    if (!plan?.active)
      throw new BookingError(
        "Publish the approved plan before granting access.",
        409,
      );
    if (plan.revision !== input.planRevision)
      throw new BookingError(
        "Plan changed. Review its current privileges first.",
        409,
      );
    const privileges = z
      .array(privilegeSchema)
      .min(1)
      .parse(plan.benefit_model);
    if (input.locationId) {
      const [house] = await tx.query<{ enabled: boolean }>(
        "SELECT enabled FROM reserve_locations WHERE id=$1 FOR SHARE",
        [input.locationId],
      );
      if (!house?.enabled)
        throw new BookingError(
          "Choose an operating house or grant digital access without a house.",
          400,
        );
    }
    const current = await tx.query<Membership>(
      "SELECT * FROM reserve_memberships WHERE user_id=$1 FOR UPDATE",
      [user.id],
    );
    if (
      current.some((m) =>
        ["active", "pending", "paused"].includes(membershipState(m)),
      )
    )
      throw new BookingError(
        "This member already has current access. Manage it before granting another plan.",
        409,
      );
    const [member] = await tx.query<Membership>(
      `INSERT INTO reserve_memberships(id,user_id,plan_id,location_id,status,starts_at,ends_at,access_basis,plan_snapshot,granted_by)
      VALUES($1,$2,$3,$4,'active',$5,$6,'complimentary',$7::jsonb,$8)
      ON CONFLICT(user_id,plan_id) DO UPDATE SET location_id=EXCLUDED.location_id,status='active',starts_at=EXCLUDED.starts_at,ends_at=EXCLUDED.ends_at,access_basis='complimentary',plan_snapshot=EXCLUDED.plan_snapshot,granted_by=EXCLUDED.granted_by,revision=reserve_memberships.revision+1 RETURNING *`,
      [
        randomUUID(),
        user.id,
        plan.id,
        input.locationId,
        input.startsAt,
        input.endsAt,
        JSON.stringify({
          name: plan.name,
          tagline: plan.tagline,
          privileges,
          revision: plan.revision,
        }),
        actor.id,
      ],
    );
    const fulfilled = await tx.query<{ id: string }>(
      "UPDATE reserve_membership_requests SET status='fulfilled',revision=revision+1,updated_at=now() WHERE user_id=$1 AND status='submitted' RETURNING id",
      [user.id],
    );
    if (fulfilled[0])
      await audit(tx, actor, fulfilled[0].id, "request.fulfilled", {
        membership_id: member.id,
      });
    await audit(tx, actor, member.id, "membership.granted", {
      user_id: user.id,
      plan_id: plan.id,
      plan_revision: plan.revision,
      access_basis: "complimentary",
      location_id: input.locationId,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      plan_snapshot: member.plan_snapshot,
      revision: member.revision,
    });
    return member;
  });
}
export async function changeMembership(
  db: Database,
  actor: Actor,
  raw: unknown,
) {
  requireMembershipOwner(actor);
  const i = z
    .object({
      id: z.string().min(1).max(80),
      revision: z.number().int().positive(),
      action: z.enum(["pause", "resume", "end"]),
    })
    .strict()
    .parse(raw);
  return db.transaction(async (tx) => {
    // Lock the member user before membership rows, matching grant lock order.
    const [ref] = await tx.query<{ user_id: string }>(
      "SELECT user_id FROM reserve_memberships WHERE id=$1",
      [i.id],
    );
    if (!ref) throw new BookingError("Membership not found.", 404);
    await tx.query("SELECT id FROM reserve_users WHERE id=$1 FOR UPDATE", [
      ref.user_id,
    ]);
    const [m] = await tx.query<Membership>(
      "SELECT * FROM reserve_memberships WHERE id=$1 FOR UPDATE",
      [i.id],
    );
    if (!m || m.revision !== i.revision)
      throw new BookingError(
        "Membership changed. Refresh before trying again.",
        409,
      );
    const state = membershipState(m);
    if (
      state === "ended" ||
      (i.action === "pause" && m.status !== "active") ||
      (i.action === "resume" && m.status !== "paused")
    )
      throw new BookingError(
        "That transition is not available for this membership.",
        409,
      );
    const status =
      i.action === "pause"
        ? "paused"
        : i.action === "resume"
          ? "active"
          : "ended";
    await tx.query(
      "UPDATE reserve_memberships SET status=$2,revision=revision+1 WHERE id=$1",
      [i.id, status],
    );
    await audit(tx, actor, i.id, `membership.${i.action}`, {
      revision: i.revision + 1,
    });
  });
}
export async function membershipOperations(
  db: Queryable,
  actor: Actor,
  page = 0,
) {
  requireMembershipOwner(actor);
  const [plans, locations, requests, members, events] = await Promise.all([
    listMembershipPlans(db),
    db.query(
      "SELECT id,name,enabled,timezone FROM reserve_locations ORDER BY name",
    ),
    db.query<MemberRequest>(
      "SELECT r.*,u.name,u.email FROM reserve_membership_requests r JOIN reserve_users u ON u.id=r.user_id ORDER BY CASE r.status WHEN 'submitted' THEN 0 ELSE 1 END,r.updated_at DESC LIMIT 25 OFFSET $1",
      [page * 25],
    ),
    db.query<Membership & { name: string; email: string }>(
      "SELECT m.*,u.name,u.email,p.name AS plan_name FROM reserve_memberships m JOIN reserve_users u ON u.id=m.user_id JOIN reserve_membership_plans p ON p.id=m.plan_id ORDER BY m.created_at DESC LIMIT 25 OFFSET $1",
      [page * 25],
    ),
    db.query(
      "SELECT e.event,e.subject_id,e.detail,e.created_at,u.name AS actor_name FROM reserve_membership_events e JOIN reserve_users u ON u.id=e.actor_id ORDER BY e.created_at DESC LIMIT 25 OFFSET $1",
      [page * 25],
    ),
  ]);
  return {
    plans,
    locations,
    requests,
    members: members.map((m) => ({
      ...m,
      effective_state: membershipState(m),
    })),
    events,
    page,
  };
}
const paths = {
  none: null,
  profile: "/profile",
  chair: "/chair",
  book: "/book",
  collection: "/shop",
} as const;
export function membershipPrivileges(
  member: Membership | null,
  plan: MembershipPlan | undefined,
  houseEnabled: boolean,
  bookingEnabled = false,
) {
  const raw =
    member?.plan_snapshot?.privileges ??
    (plan?.benefit_model ?? []).map((b) => ({
      ...b,
      availability: "planned" as const,
    }));
  const active = membershipState(member) === "active";
  return (Array.isArray(raw) ? raw : []).flatMap((b: unknown) => {
    // Old descriptive benefits never turn into live privileges implicitly.
    const legacy =
      b && typeof b === "object" ? (b as Record<string, unknown>) : {};
    const parsed = privilegeSchema.safeParse({
      ...legacy,
      availability: legacy.availability ?? "planned",
      destination: legacy.destination ?? "none",
    });
    if (!parsed.success) return [];
    const benefit = parsed.data;
    const physical =
      benefit.kind === "location_eligibility" || benefit.destination === "book";
    const houseUnavailable =
      physical &&
      (!member?.location_id ||
        !houseEnabled ||
        (benefit.destination === "book" && !bookingEnabled));
    const available =
      active && benefit.availability === "available" && !houseUnavailable;
    return [
      {
        ...benefit,
        state: !active
          ? "inactive"
          : benefit.availability === "planned"
            ? "planned"
            : houseUnavailable
              ? "house_unavailable"
              : "available",
        href: available
          ? benefit.destination === "book"
            ? `/book?location=${encodeURIComponent(member!.location_id!)}`
            : paths[benefit.destination]
          : null,
      },
    ];
  });
}
