import { randomUUID } from "node:crypto";
import { DateTime } from "luxon";
import { BookingError, ZONE, type Actor, type Appointment } from "./booking";
import type { Database, Queryable, Row } from "./db";
import {
  capabilityScope,
  hasCapability,
  requireCapability,
} from "./studio-permissions";
export type WorkspaceStatus = "captured" | "building" | "review" | "approved";
export type WorkspaceLane = "reserve" | "fix-it" | "gent";
export type WorkspaceKind =
  | "idea"
  | "feedback"
  | "decision"
  | "task"
  | "content";
export type WorkspaceAssignee = "neil" | "katie" | "both";
export type WorkspaceItem = Row & {
  id: string;
  kind: WorkspaceKind;
  lane: WorkspaceLane;
  title: string;
  detail: string;
  assignee: WorkspaceAssignee;
  assignee_user_id: string | null;
  visibility: "shared" | "owner";
  status: WorkspaceStatus;
  revision: number;
  created_by: string;
  updated_by: string;
  creator_name: string;
  updater_name: string;
  created_at: string | Date;
  updated_at: string | Date;
  completed_at: string | null;
  archived_at: string | null;
  approved_revision: number | null;
};
export function requireOperator(actor: Actor) {
  requireCapability(actor, "studio.read");
}
function workspaceWhere(actor: Actor) {
  const scope = capabilityScope(actor, "workspace.read");
  if (scope === "company") return { sql: "TRUE", params: [] as unknown[] };
  if (scope === "shared")
    return { sql: "w.visibility='shared'", params: [] as unknown[] };
  if (scope === "assigned")
    return {
      sql: "w.visibility='shared' AND w.assignee_user_id=$1",
      params: [actor.id] as unknown[],
    };
  throw new BookingError("Shared work access is required.", 403);
}
function canEdit(actor: Actor, item: WorkspaceItem) {
  requireCapability(actor, "workspace.edit");
  const scope = capabilityScope(actor, "workspace.edit");
  if (
    actor.role !== "owner" &&
    (item.visibility === "owner" ||
      (scope === "assigned" && item.assignee_user_id !== actor.id))
  )
    throw new BookingError("That work is outside your Studio access.", 403);
}
export async function commandCenter(
  db: Queryable,
  actor: Actor,
  page = 0,
  kind?: WorkspaceKind,
) {
  requireOperator(actor);
  requireCapability(actor, "workspace.read");
  const where = workspaceWhere(actor);
  if (kind) {
    where.params.push(kind);
    where.sql += ` AND w.kind=$${where.params.length}`;
  }
  const n = where.params.length;
  const [items, counts, people] = await Promise.all([
    db.query<WorkspaceItem>(
      `SELECT w.*,creator.name AS creator_name,updater.name AS updater_name FROM reserve_workspace_items w JOIN reserve_users creator ON creator.id=w.created_by JOIN reserve_users updater ON updater.id=w.updated_by WHERE ${where.sql} AND w.archived_at IS NULL ORDER BY CASE w.status WHEN 'review' THEN 0 WHEN 'building' THEN 1 WHEN 'captured' THEN 2 ELSE 3 END,w.updated_at DESC,w.id LIMIT 31 OFFSET $${n + 1}`,
      [...where.params, page * 30],
    ),
    db.query<{ open: string; review: string; total: string }>(
      `SELECT count(*) FILTER(WHERE w.completed_at IS NULL)::text AS open,count(*) FILTER(WHERE w.status='review' AND w.completed_at IS NULL)::text AS review,count(*)::text AS total FROM reserve_workspace_items w WHERE ${where.sql} AND w.archived_at IS NULL`,
      where.params,
    ),
    db.query<{ id: string; name: string; role: string }>(
      "SELECT id,name,role FROM reserve_users WHERE role IN ('owner','operator','staff') ORDER BY name",
    ),
  ]);
  const visible = items.slice(0, 30);
  const events = visible.length
    ? await db.query(
        `SELECT e.*,u.name AS actor_name FROM reserve_workspace_events e JOIN reserve_users u ON u.id=e.actor_id WHERE e.item_id=ANY($1::text[]) ORDER BY e.created_at DESC LIMIT 300`,
        [visible.map((i) => i.id)],
      )
    : [];
  return {
    items: visible,
    events,
    people:
      actor.role === "staff" ? people.filter((p) => p.id === actor.id) : people,
    workspaceReady: true,
    page,
    hasMore: items.length > 30,
    pulse: {
      openBuild: Number(counts[0]?.open || 0),
      needsReview: Number(counts[0]?.review || 0),
    },
    canApprove: hasCapability(actor, "workspace.approve"),
    canRequestReview: hasCapability(actor, "workspace.request_review"),
    canCreate: hasCapability(actor, "workspace.create"),
    canEdit: hasCapability(actor, "workspace.edit"),
  };
}
async function event(
  db: Queryable,
  actor: Actor,
  item: WorkspaceItem,
  action: string,
  feedback = "",
) {
  await db.query(
    "INSERT INTO reserve_workspace_events(id,item_id,actor_id,action,revision,feedback) VALUES($1,$2,$3,$4,$5,$6)",
    [randomUUID(), item.id, actor.id, action, item.revision, feedback],
  );
}
export async function createWorkspaceItem(
  db: Database,
  actor: Actor,
  input: {
    kind: WorkspaceKind;
    lane: WorkspaceLane;
    title: string;
    detail: string;
    assignee: WorkspaceAssignee;
    assignee_user_id?: string | null;
    visibility?: "shared" | "owner";
  },
) {
  requireOperator(actor);
  requireCapability(actor, "workspace.create");
  const visibility = input.visibility ?? "shared";
  if (visibility === "owner" && actor.role !== "owner")
    throw new BookingError("Owner-only work requires owner access.", 403);
  return db.transaction(async (tx) => {
    let assignee = input.assignee_user_id;
    if (!assignee && input.assignee !== "both") {
      const role = input.assignee === "neil" ? "owner" : "operator";
      const candidates = await tx.query<{ id: string }>(
        "SELECT id FROM reserve_users WHERE role=$1 ORDER BY id",
        [role],
      );
      if (candidates.length === 1) assignee = candidates[0].id;
    }
    if (capabilityScope(actor, "workspace.create") === "assigned")
      assignee = actor.id;
    if (assignee) {
      const [person] = await tx.query(
        "SELECT id FROM reserve_users WHERE id=$1 AND role IN ('owner','operator','staff')",
        [assignee],
      );
      if (!person)
        throw new BookingError("Choose a verified team account.", 400);
    }
    const [item] = await tx.query<WorkspaceItem>(
      `INSERT INTO reserve_workspace_items(id,kind,lane,title,detail,assignee,assignee_user_id,visibility,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$9) RETURNING *`,
      [
        randomUUID(),
        input.kind,
        input.lane,
        input.title,
        input.detail,
        input.assignee,
        assignee || actor.id,
        visibility,
        actor.id,
      ],
    );
    await event(tx, actor, item, "captured");
    return item;
  });
}
export async function updateWorkspaceItem(
  db: Database,
  actor: Actor,
  id: string,
  input: {
    revision: number;
    status?: WorkspaceStatus;
    title?: string;
    detail?: string;
    assignee_user_id?: string;
    action?: "complete" | "archive" | "request_changes";
    feedback?: string;
  },
) {
  requireOperator(actor);
  return db.transaction(async (tx) => {
    const [existing] = await tx.query<WorkspaceItem>(
      "SELECT * FROM reserve_workspace_items WHERE id=$1 FOR UPDATE",
      [id],
    );
    if (
      !existing ||
      (actor.role !== "owner" &&
        (existing.visibility === "owner" ||
          (capabilityScope(actor, "workspace.read") === "assigned" &&
            existing.assignee_user_id !== actor.id))) ||
      !hasCapability(actor, "workspace.read")
    )
      throw new BookingError("That work is unavailable in your Studio.", 404);
    canEdit(actor, existing);
    if (existing.revision !== input.revision)
      throw new BookingError(
        "This work changed in another window. Reload before saving.",
        409,
      );
    if (existing.archived_at)
      throw new BookingError("This work is archived.", 409);
    if (input.status === "approved" || input.action === "request_changes")
      requireCapability(actor, "workspace.approve");
    if (input.status === "review")
      requireCapability(actor, "workspace.request_review");
    if (input.status === "approved" && existing.status !== "review")
      throw new BookingError("Send this work to review first.", 409);
    if (
      input.action === "complete" &&
      actor.role !== "owner" &&
      (existing.kind !== "task" || existing.status === "review")
    )
      throw new BookingError("This decision needs owner review.", 403);
    if (input.action === "archive" && actor.role !== "owner")
      throw new BookingError("Archiving requires owner access.", 403);
    if (input.assignee_user_id) {
      if (
        actor.role === "staff" &&
        input.assignee_user_id !== existing.assignee_user_id
      )
        throw new BookingError("Reassignment requires operator access.", 403);
      const [person] = await tx.query(
        "SELECT id FROM reserve_users WHERE id=$1 AND role IN ('owner','operator','staff')",
        [input.assignee_user_id],
      );
      if (!person)
        throw new BookingError("Choose a verified team account.", 400);
    }
    const changed =
      input.title !== undefined ||
      input.detail !== undefined ||
      input.assignee_user_id !== undefined;
    if (changed && input.status === "approved")
      throw new BookingError("Save your changes before approving.", 409);
    let status =
      input.action === "request_changes"
        ? "building"
        : (input.status ?? existing.status);
    if (changed && existing.status === "approved") status = "review";
    const approved = input.status === "approved" && !changed;
    const [item] = await tx.query<WorkspaceItem>(
      `UPDATE reserve_workspace_items SET title=$1,detail=$2,assignee_user_id=$3,status=$4,revision=revision+1,updated_by=$5,updated_at=now(),approved_by=CASE WHEN $6 THEN $5 WHEN $4='approved' THEN approved_by ELSE NULL END,approved_revision=CASE WHEN $6 THEN revision+1 WHEN $4='approved' THEN approved_revision ELSE NULL END,approved_at=CASE WHEN $6 THEN now() WHEN $4='approved' THEN approved_at ELSE NULL END,completed_at=CASE WHEN $7='complete' THEN now() WHEN $8 THEN NULL ELSE completed_at END,archived_at=CASE WHEN $7='archive' THEN now() ELSE archived_at END WHERE id=$9 RETURNING *`,
      [
        input.title ?? existing.title,
        input.detail ?? existing.detail,
        input.assignee_user_id ?? existing.assignee_user_id,
        status,
        actor.id,
        approved,
        input.action ?? "",
        changed || input.status === "captured",
        id,
      ],
    );
    await event(
      tx,
      actor,
      item,
      input.action ?? (changed ? "edited" : status),
      input.feedback ?? "",
    );
    return item;
  });
}
export async function studioOverview(db: Queryable, actor: Actor) {
  requireOperator(actor);
  requireCapability(actor, "appointments.read");
  const company = actor.role === "owner",
    params = company ? [] : [actor.provider_id];
  const provider = company ? "TRUE" : "p.id=$1";
  const appointment = company ? "TRUE" : "a.provider_id=$1";
  const now = DateTime.now().setZone(ZONE),
    begin = now.startOf("day").toUTC().toISO(),
    end = now.plus({ days: 1 }).startOf("day").toUTC().toISO();
  const offset = params.length;
  const [setup, today, next, work] = await Promise.all([
    db.query<{ providers: string; services: string }>(
      `SELECT (SELECT count(*) FROM reserve_providers p WHERE ${provider} AND p.enabled)::text AS providers,(SELECT count(*) FROM reserve_services s JOIN reserve_providers p ON p.id=s.provider_id WHERE ${provider} AND s.enabled AND p.enabled)::text AS services`,
      params,
    ),
    db.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM reserve_appointments a WHERE ${appointment} AND a.status='confirmed' AND a.starts_at>=$${offset + 1} AND a.starts_at<$${offset + 2}`,
      [...params, begin, end],
    ),
    db.query<Appointment>(
      `SELECT a.id,a.starts_at,s.name AS service_name,COALESCE(c.name,u.name) AS client_name FROM reserve_appointments a JOIN reserve_services s ON s.id=a.service_id LEFT JOIN reserve_users u ON u.id=a.client_id LEFT JOIN reserve_clients c ON c.id=a.crm_client_id WHERE ${appointment} AND a.status='confirmed' AND a.starts_at>=$${offset + 1} ORDER BY a.starts_at LIMIT 1`,
      [...params, now.toUTC().toISO()],
    ),
    hasCapability(actor, "workspace.read")
      ? commandCenter(db, actor)
      : Promise.resolve({
          items: [],
          events: [],
          people: [],
          pulse: { openBuild: 0, needsReview: 0 },
        }),
  ]);
  const [team] = company
    ? await db.query<{ operators: string }>(
        "SELECT count(*)::text AS operators FROM reserve_users WHERE role='operator' AND provider_id='katie'",
      )
    : [{ operators: "0" }];
  const [operationCount] = await db.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM reserve_operation_proposals WHERE state='review' ${company ? "" : "AND provider_id=$1"}`,
    params,
  );
  const ready =
    Number(setup[0]?.providers) > 0 && Number(setup[0]?.services) > 0;
  return {
    ready,
    setup: setup[0],
    operationReviews: Number(operationCount?.count || 0),
    operatorReady: company ? Number(team.operators) > 0 : null,
    today: Number(today[0]?.count ?? 0),
    nextVisit: next[0] ?? null,
    work,
    refreshedAt: now.toISO(),
    brief: !ready
      ? "Your Studio is ready. Approved services and availability are needed before the service operation opens."
      : `${today[0]?.count ?? 0} confirmed visits today. ${work.pulse.needsReview} work items awaiting review.`,
    financeConnected: false,
    location: {
      id: "eunice",
      label: "Legacy Reserve — Eunice",
    },
  };
}
export async function studioClients(db: Queryable, actor: Actor, page = 0) {
  requireOperator(actor);
  requireCapability(actor, "clients.read");
  const company = actor.role === "owner",
    where = company ? "TRUE" : "a.provider_id=$1",
    params = company ? [] : [actor.provider_id];
  return db.query<{
    id: string;
    name: string;
    visits: string;
    last_visit: string;
  }>(
    `SELECT u.id,u.name,count(*) FILTER(WHERE a.status='completed')::text AS visits,max(a.starts_at) AS last_visit FROM reserve_users u JOIN reserve_appointments a ON a.client_id=u.id WHERE ${where} GROUP BY u.id,u.name ORDER BY max(a.starts_at) DESC,u.id LIMIT 31 OFFSET $${params.length + 1}`,
    [...params, page * 30],
  );
}
export async function clientHistory(
  db: Queryable,
  actor: Actor,
  id: string,
  page = 0,
) {
  requireOperator(actor);
  requireCapability(actor, "clients.read");
  const company = actor.role === "owner";
  const [client] = await db.query<{ id: string; name: string }>(
    `SELECT u.id,u.name FROM reserve_users u WHERE u.id=$1 AND EXISTS(SELECT 1 FROM reserve_appointments a WHERE a.client_id=u.id ${company ? "" : "AND a.provider_id=$2"})`,
    company ? [id] : [id, actor.provider_id],
  );
  if (!client)
    throw new BookingError(
      "Client history is unavailable in your Studio.",
      404,
    );
  const rows = await db.query(
    `SELECT a.id,a.starts_at,a.status,s.name AS service_name,COALESCE(l.timezone,'America/Chicago') AS timezone FROM reserve_appointments a JOIN reserve_services s ON s.id=a.service_id LEFT JOIN reserve_locations l ON l.id=a.location_id WHERE a.client_id=$1 ${company ? "" : "AND a.provider_id=$2"} ORDER BY a.starts_at DESC,a.id LIMIT 31 OFFSET $${company ? 2 : 3}`,
    company ? [id, page * 30] : [id, actor.provider_id, page * 30],
  );
  return { client, visits: rows.slice(0, 30), hasMore: rows.length > 30 };
}

export async function workspaceItem(db: Queryable, actor: Actor, id: string) {
  requireOperator(actor);
  const where = workspaceWhere(actor);
  const [item] = await db.query<WorkspaceItem>(
    `SELECT w.* FROM reserve_workspace_items w WHERE ${where.sql} AND w.id=$${where.params.length + 1} AND w.archived_at IS NULL`,
    [...where.params, id],
  );
  if (!item)
    throw new BookingError("That work is unavailable in your Studio.", 404);
  return item;
}
