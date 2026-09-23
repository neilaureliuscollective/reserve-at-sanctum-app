import { randomUUID } from "node:crypto";
import { DateTime } from "luxon";
import type { Actor, Appointment } from "./booking";
import { BookingError, ZONE } from "./booking";
import type { Queryable, Row } from "./db";

export type WorkspaceStatus = "captured" | "building" | "review" | "approved";
export type WorkspaceLane = "reserve" | "fix-it" | "gent";
export type WorkspaceKind = "idea" | "feedback" | "decision" | "task";
export type WorkspaceAssignee = "neil" | "katie" | "both";

export type WorkspaceItem = Row & {
  id: string;
  kind: WorkspaceKind;
  lane: WorkspaceLane;
  title: string;
  detail: string;
  assignee: WorkspaceAssignee;
  status: WorkspaceStatus;
  created_by: string;
  updated_by: string;
  creator_name: string;
  updater_name: string;
  created_at: string | Date;
  updated_at: string | Date;
};

export type CommandPulse = {
  today: number;
  nextSevenDays: number;
  openBuild: number;
  needsReview: number;
  nextVisit: (Appointment & { service_name?: string; client_name?: string }) | null;
};

export function requireOperator(actor: Actor) {
  if (actor.role !== "owner" && actor.role !== "staff")
    throw new BookingError("Reserve Command access is required.", 403);
}

function missingWorkspaceTable(error: unknown) {
  const value = error as { code?: string; message?: string };
  return value.code === "42P01" || value.message?.includes("reserve_workspace_items");
}

export async function commandCenter(db: Queryable, actor: Actor) {
  requireOperator(actor);
  const now = DateTime.now().setZone(ZONE);
  const todayStart = now.startOf("day").toUTC().toISO()!;
  const tomorrow = now.plus({ days: 1 }).startOf("day").toUTC().toISO()!;
  const sevenDays = now.plus({ days: 7 }).endOf("day").toUTC().toISO()!;

  const [todayRows, weekRows, nextRows] = await Promise.all([
    db.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM reserve_appointments WHERE status='confirmed' AND starts_at >= $1 AND starts_at < $2",
      [todayStart, tomorrow],
    ),
    db.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM reserve_appointments WHERE status='confirmed' AND starts_at >= $1 AND starts_at <= $2",
      [now.toUTC().toISO(), sevenDays],
    ),
    db.query<Appointment & { service_name?: string; client_name?: string }>(
      `SELECT a.*,s.name AS service_name,u.name AS client_name
       FROM reserve_appointments a
       JOIN reserve_services s ON s.id=a.service_id
       JOIN reserve_users u ON u.id=a.client_id
       WHERE a.status='confirmed' AND a.starts_at >= $1
       ORDER BY a.starts_at ASC LIMIT 1`,
      [now.toUTC().toISO()],
    ),
  ]);

  let items: WorkspaceItem[] = [];
  let workspaceReady = true;
  try {
    items = await db.query<WorkspaceItem>(
      `SELECT w.*,creator.name AS creator_name,updater.name AS updater_name
       FROM reserve_workspace_items w
       JOIN reserve_users creator ON creator.id=w.created_by
       JOIN reserve_users updater ON updater.id=w.updated_by
       ORDER BY
         CASE w.status WHEN 'review' THEN 0 WHEN 'building' THEN 1 WHEN 'captured' THEN 2 ELSE 3 END,
         w.updated_at DESC
       LIMIT 120`,
    );
  } catch (error) {
    if (!missingWorkspaceTable(error)) throw error;
    workspaceReady = false;
  }

  const openBuild = items.filter((item) => item.status !== "approved").length;
  const needsReview = items.filter((item) => item.status === "review").length;
  const pulse: CommandPulse = {
    today: Number(todayRows[0]?.count || 0),
    nextSevenDays: Number(weekRows[0]?.count || 0),
    openBuild,
    needsReview,
    nextVisit: nextRows[0] || null,
  };

  return { pulse, items, workspaceReady };
}

export async function createWorkspaceItem(
  db: Queryable,
  actor: Actor,
  input: {
    kind: WorkspaceKind;
    lane: WorkspaceLane;
    title: string;
    detail: string;
    assignee: WorkspaceAssignee;
  },
) {
  requireOperator(actor);
  const id = randomUUID();
  try {
    const [item] = await db.query<WorkspaceItem>(
      `INSERT INTO reserve_workspace_items
       (id,kind,lane,title,detail,assignee,status,created_by,updated_by)
       VALUES($1,$2,$3,$4,$5,$6,'captured',$7,$7)
       RETURNING *`,
      [id, input.kind, input.lane, input.title, input.detail, input.assignee, actor.id],
    );
    return item;
  } catch (error) {
    if (missingWorkspaceTable(error))
      throw new BookingError("The shared Build Room database migration still needs to be activated.", 503);
    throw error;
  }
}

export async function updateWorkspaceItem(
  db: Queryable,
  actor: Actor,
  id: string,
  input: {
    status?: WorkspaceStatus;
    assignee?: WorkspaceAssignee;
    title?: string;
    detail?: string;
  },
) {
  requireOperator(actor);
  const [existing] = await db.query<WorkspaceItem>(
    "SELECT * FROM reserve_workspace_items WHERE id=$1",
    [id],
  );
  if (!existing) throw new BookingError("That Build Room item no longer exists.", 404);
  const status = input.status ?? existing.status;
  const assignee = input.assignee ?? existing.assignee;
  const title = input.title ?? existing.title;
  const detail = input.detail ?? existing.detail;
  const [updated] = await db.query<WorkspaceItem>(
    `UPDATE reserve_workspace_items
     SET status=$1,assignee=$2,title=$3,detail=$4,updated_by=$5,updated_at=now()
     WHERE id=$6 RETURNING *`,
    [status, assignee, title, detail, actor.id, id],
  );
  return updated;
}
