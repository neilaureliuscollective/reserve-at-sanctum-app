import { z } from "zod";
import { randomUUID } from "node:crypto";
import { BookingError, type Actor } from "./booking";
import type { Database, Queryable, Row } from "./db";
import { requireCapability, hasCapability } from "./studio-permissions";
const providerId = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(
    /^[a-z0-9-]+$/,
    "Use lowercase letters, numbers and hyphens for the provider identifier.",
  );
const revision = z.number().int().min(0);
const common = {
  provider_id: providerId,
  target_revision: revision,
  enabled: z.boolean(),
};
export const operationInput = z
  .discriminatedUnion("kind", [
    z
      .object({
        ...common,
        kind: z.literal("provider"),
        name: z.string().trim().min(1).max(80),
        open_hour: z.number().int().min(0).max(23),
        close_hour: z.number().int().min(1).max(24),
        weekdays: z.array(z.number().int().min(1).max(7)).min(1).max(7),
        location_id: z
          .string()
          .trim()
          .min(1)
          .max(80)
          .regex(/^[a-z0-9-]+$/)
          .nullable()
          .optional(),
      })
      .strict(),
    z
      .object({
        ...common,
        kind: z.literal("service"),
        service_id: z.string().min(1).max(100).optional(),
        name: z.string().trim().min(1).max(90),
        description: z.string().trim().min(1).max(600),
        minutes: z.number().int().min(15).max(480).multipleOf(15),
        buffer: z.number().int().min(0).max(120).multipleOf(15),
        price: z.number().int().min(0).max(1000000),
      })
      .strict(),
  ])
  .superRefine((x, ctx) => {
    if (
      x.kind === "provider" &&
      (x.close_hour <= x.open_hour ||
        new Set(x.weekdays).size !== x.weekdays.length)
    )
      ctx.addIssue({
        code: "custom",
        message: "Choose unique working days and a closing hour after opening.",
      });
  });
export type OperationInput = z.infer<typeof operationInput>;
export type Provider = Row & {
  id: string;
  name: string;
  enabled: boolean;
  open_hour: number;
  close_hour: number;
  weekdays: number[];
  revision: number;
  location_id?: string | null;
};
export type ManagedService = Row & {
  id: string;
  provider_id: string;
  name: string;
  description: string;
  minutes: number;
  buffer: number;
  price: number;
  enabled: boolean;
  revision: number;
};
export type OperationProposal = Row & {
  id: string;
  kind: "provider" | "service";
  provider_id: string;
  service_id: string | null;
  payload: OperationInput;
  baseline: Provider | ManagedService | null;
  target_revision: number;
  state: string;
  creator_name: string;
  affected_visits?: number;
};
function readScope(actor: Actor) {
  requireCapability(actor, "studio.read");
  requireCapability(actor, "appointments.read");
  return actor.role === "owner"
    ? { where: "TRUE", args: [] as unknown[] }
    : { where: "provider_id=$1", args: [actor.provider_id] as unknown[] };
}
function proposeScope(actor: Actor, provider: string) {
  requireCapability(actor, "workspace.create");
  requireCapability(actor, "workspace.request_review");
  requireCapability(actor, "appointments.read");
  if (
    !["owner", "operator"].includes(actor.role) ||
    (actor.role !== "owner" && actor.provider_id !== provider)
  )
    throw new BookingError(
      "Propose changes only for your assigned provider.",
      403,
    );
}
async function affectedVisits(db: Queryable, proposal: OperationProposal) {
  const p = proposal.payload;
  const [count] =
    p.kind === "service"
      ? await db.query<{ count: string }>(
          "SELECT count(*)::text AS count FROM reserve_appointments WHERE service_id=$1 AND status='confirmed' AND starts_at>now()",
          [proposal.service_id],
        )
      : await db.query<{ count: string }>(
          `SELECT count(*)::text AS count FROM reserve_appointments WHERE provider_id=$1 AND status='confirmed' AND starts_at>now() AND (NOT $2 OR NOT (EXTRACT(ISODOW FROM starts_at AT TIME ZONE 'America/Chicago')::int=ANY($3::int[])) OR starts_at AT TIME ZONE 'America/Chicago'<date_trunc('day',starts_at AT TIME ZONE 'America/Chicago')+make_interval(hours=>$4) OR busy_until AT TIME ZONE 'America/Chicago'>date_trunc('day',starts_at AT TIME ZONE 'America/Chicago')+make_interval(hours=>$5))`,
          [
            proposal.provider_id,
            p.enabled,
            p.weekdays,
            p.open_hour,
            p.close_hour,
          ],
        );
  return Number(count?.count || 0);
}
export async function operationOverview(db: Queryable, actor: Actor, page = 0) {
  const scope = readScope(actor);
  const providers = await db.query<Provider>(
    `SELECT * FROM reserve_providers WHERE ${actor.role === "owner" ? "TRUE" : "id=$1"} ORDER BY name`,
    scope.args,
  );
  const [services, rows] = await Promise.all([
    db.query<ManagedService>(
      `SELECT * FROM reserve_services WHERE ${scope.where} ORDER BY name`,
      scope.args,
    ),
    db.query<OperationProposal>(
      `SELECT q.*,u.name AS creator_name FROM reserve_operation_proposals q JOIN reserve_users u ON u.id=q.created_by WHERE ${actor.role === "owner" ? "TRUE" : "q.provider_id=$1"} AND q.state='review' ORDER BY q.created_at DESC,q.id LIMIT 21 OFFSET $${scope.args.length + 1}`,
      [...scope.args, page * 20],
    ),
  ]);
  const proposals = await Promise.all(
    rows
      .slice(0, 20)
      .map(async (p) => ({
        ...p,
        affected_visits: await affectedVisits(db, p),
      })),
  );
  return {
    providers,
    services,
    proposals,
    page,
    hasMore: rows.length > 20,
    owner: actor.role === "owner",
    canPropose:
      ["owner", "operator"].includes(actor.role) &&
      hasCapability(actor, "workspace.create") &&
      hasCapability(actor, "workspace.request_review"),
  };
}
export async function proposeOperation(
  db: Database,
  actor: Actor,
  raw: unknown,
) {
  const input = operationInput.parse(raw);
  proposeScope(actor, input.provider_id);
  return db.transaction(async (tx) => {
    const [provider] = await tx.query<Provider>(
      "SELECT * FROM reserve_providers WHERE id=$1",
      [input.provider_id],
    );
    if (!provider && actor.role !== "owner")
      throw new BookingError("Your provider setup is not ready yet.", 409);
    let baseline: Provider | ManagedService | null = provider || null;
    let serviceId: string | null = null;
    if (input.kind === "service") {
      if (!provider)
        throw new BookingError(
          "Approve the provider setup before adding a service.",
          409,
        );
      serviceId = input.service_id || randomUUID();
      const [existing] = await tx.query<ManagedService>(
        "SELECT * FROM reserve_services WHERE id=$1",
        [serviceId],
      );
      if (existing && existing.provider_id !== input.provider_id)
        throw new BookingError("That service is outside this provider.", 403);
      if (input.service_id && !existing)
        throw new BookingError("This service is unavailable.", 404);
      baseline = existing || null;
    }
    if ((baseline?.revision || 0) !== input.target_revision)
      throw new BookingError(
        "These settings changed. Refresh before proposing a change.",
        409,
      );
    const [proposal] = await tx.query<OperationProposal>(
      "INSERT INTO reserve_operation_proposals(id,provider_id,service_id,kind,payload,baseline,target_revision,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
      [
        randomUUID(),
        input.provider_id,
        serviceId,
        input.kind,
        JSON.stringify(input),
        baseline ? JSON.stringify(baseline) : null,
        input.target_revision,
        actor.id,
      ],
    );
    return proposal;
  });
}
export async function applyOperation(
  db: Database,
  actor: Actor,
  id: string,
  acknowledge = false,
) {
  requireCapability(actor, "operations.configure");
  try {
    return await db.transaction(async (tx) => {
      const [proposal] = await tx.query<OperationProposal>(
        "SELECT * FROM reserve_operation_proposals WHERE id=$1 FOR UPDATE",
        [id],
      );
      if (!proposal)
        throw new BookingError("This proposal is unavailable.", 404);
      if (proposal.state === "applied") return proposal;
      if (proposal.state !== "review")
        throw new BookingError("This proposal was dismissed.", 409);
      const p = operationInput.parse(proposal.payload);
      if (p.provider_id !== proposal.provider_id || p.kind !== proposal.kind)
        throw new BookingError("This proposal needs to be recreated.", 409);
      const [provider] = await tx.query<Provider>(
        "SELECT * FROM reserve_providers WHERE id=$1 FOR UPDATE",
        [p.provider_id],
      );
      let target: Provider | ManagedService | undefined = provider;
      if (p.kind === "service") {
        if (!provider)
          throw new BookingError(
            "The provider setup must be approved first.",
            409,
          );
        [target] = await tx.query<ManagedService>(
          "SELECT * FROM reserve_services WHERE id=$1 FOR UPDATE",
          [proposal.service_id],
        );
        if (target && target.provider_id !== p.provider_id)
          throw new BookingError("This service is outside the provider.", 409);
        if (
          p.enabled &&
          p.minutes + p.buffer > (provider.close_hour - provider.open_hour) * 60
        )
          throw new BookingError(
            "This service and buffer do not fit within provider hours.",
            409,
          );
      }
      if ((target?.revision || 0) !== proposal.target_revision)
        throw new BookingError(
          "Current settings changed since this proposal. Dismiss it and propose the current settings again.",
          409,
        );
      if ((await affectedVisits(tx, proposal)) > 0 && !acknowledge)
        throw new BookingError(
          "Review the existing visits and confirm they will be preserved before applying.",
          409,
        );
      if (p.kind === "provider") {
        if (p.enabled) {
          const services = await tx.query<ManagedService>(
            "SELECT * FROM reserve_services WHERE provider_id=$1 AND enabled",
            [p.provider_id],
          );
          if (!services.length)
            throw new BookingError(
              "Enable an approved service before opening this provider for booking.",
              409,
            );
          if (
            services.some(
              (s) => s.minutes + s.buffer > (p.close_hour - p.open_hour) * 60,
            )
          )
            throw new BookingError(
              "An enabled service does not fit these hours. Adjust the menu or hours first.",
              409,
            );
        }
        if (target)
          await tx.query(
            "UPDATE reserve_providers SET name=$2,enabled=$3,open_hour=$4,close_hour=$5,weekdays=$6,location_id=COALESCE($7,location_id),revision=revision+1 WHERE id=$1",
            [
              p.provider_id,
              p.name,
              p.enabled,
              p.open_hour,
              p.close_hour,
              p.weekdays,
              p.location_id ?? null,
            ],
          );
        else
          await tx.query(
            `INSERT INTO reserve_providers(id,name,enabled,open_hour,close_hour,weekdays,revision,location_id) VALUES($1,$2,$3,$4,$5,$6,1,$7) `,
            [
              p.provider_id,
              p.name,
              p.enabled,
              p.open_hour,
              p.close_hour,
              p.weekdays,
              p.location_id ?? "eunice",
            ],
          );
      } else {
        if (target)
          await tx.query(
            "UPDATE reserve_services SET name=$3,description=$4,minutes=$5,buffer=$6,price=$7,enabled=$8,revision=revision+1 WHERE id=$1 AND provider_id=$2",
            [
              proposal.service_id,
              p.provider_id,
              p.name,
              p.description,
              p.minutes,
              p.buffer,
              p.price,
              p.enabled,
            ],
          );
        else
          await tx.query(
            `INSERT INTO reserve_services(id,provider_id,name,description,minutes,buffer,price,enabled,revision) VALUES($1,$2,$3,$4,$5,$6,$7,$8,1) `,
            [
              proposal.service_id,
              p.provider_id,
              p.name,
              p.description,
              p.minutes,
              p.buffer,
              p.price,
              p.enabled,
            ],
          );
      }
      return (
        await tx.query<OperationProposal>(
          "UPDATE reserve_operation_proposals SET state='applied',applied_by=$1,applied_at=now() WHERE id=$2 RETURNING *",
          [actor.id, id],
        )
      )[0];
    });
  } catch (e) {
    if ((e as { code?: string }).code === "23505")
      throw new BookingError(
        "These settings were just created elsewhere. Refresh before proposing again.",
        409,
      );
    throw e;
  }
}
export async function dismissOperation(
  db: Queryable,
  actor: Actor,
  id: string,
) {
  requireCapability(actor, "studio.read");
  requireCapability(actor, "workspace.request_review");
  const [proposal] = await db.query<OperationProposal>(
    "SELECT * FROM reserve_operation_proposals WHERE id=$1",
    [id],
  );
  if (
    !proposal ||
    (actor.role !== "owner" &&
      (proposal.created_by !== actor.id ||
        proposal.provider_id !== actor.provider_id))
  )
    throw new BookingError("This proposal is unavailable.", 404);
  const rows = await db.query(
    "UPDATE reserve_operation_proposals SET state='dismissed' WHERE id=$1 AND state='review' RETURNING id",
    [id],
  );
  if (!rows.length)
    throw new BookingError(
      "This proposal has already changed. Refresh the review queue.",
      409,
    );
}
