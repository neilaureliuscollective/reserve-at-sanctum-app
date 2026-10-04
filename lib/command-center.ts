import { randomUUID } from "node:crypto";
import { DateTime } from "luxon";
import { BookingError, ZONE, type Actor } from "./booking";
import type { Database, Queryable, Row } from "./db";
import { requireOperator, verifiedOperator, workPredicate, workParams } from "./command-access";
export { requireOperator } from "./command-access";
export type WorkspaceStatus = "captured" | "building" | "review" | "approved";
export type WorkspaceLane = "reserve" | "fix-it" | "gent";
export type WorkspaceKind = "idea" | "feedback" | "decision" | "task";
export type WorkspaceAssignee = "neil" | "katie" | "both";
export type WorkspaceVisibility = "shared" | "founder" | "provider";
export type WorkspaceItem = Row & {
  id: string; kind: WorkspaceKind; lane: WorkspaceLane; title: string; detail: string;
  assignee: WorkspaceAssignee; status: WorkspaceStatus; visibility: WorkspaceVisibility;
  provider_id: string | null; revision: number; due_date: string | null; completed_at: string | null;
  handoff_to: string | null; handoff_state: "none" | "proposed" | "acknowledged" | "done";
  handoff_by: string | null; created_by: string; updated_by: string;
  creator_name: string; updater_name: string; updated_at: string | Date;
};
export type DayVisit = Row & { id: string; provider_id: string; service_name: string; client_name: string; starts_at: string; ends_at: string; status: string };
export function dayRange(date: string) {
  const start = DateTime.fromISO(date, { zone: ZONE });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !start.isValid || start.toISODate() !== date)
    throw new BookingError("Choose a valid day.");
  return [start.startOf('day').toUTC().toISO()!, start.plus({ days: 1 }).startOf('day').toUTC().toISO()!];
}
export async function scheduleDay(db: Queryable, actor: Actor, date: string) {
  requireOperator(actor);
  const [start, end] = dayRange(date);
  return db.query<DayVisit>(`SELECT a.id,a.provider_id,a.starts_at,a.ends_at,a.status,s.name AS service_name,u.name AS client_name
    FROM reserve_appointments a JOIN reserve_services s ON s.id=a.service_id JOIN reserve_users u ON u.id=a.client_id
    WHERE a.starts_at >= $1 AND a.starts_at < $2 AND ($3::text IS NULL OR a.provider_id=$3)
    ORDER BY a.starts_at LIMIT 250`, [start, end, actor.role === 'owner' ? null : actor.provider_id]);
}
export async function listWork(db: Queryable, actor: Actor, offset = 0, sharedOnly = false) {
  const params = workParams(actor, sharedOnly);
  return db.query<WorkspaceItem>(`SELECT w.*,creator.name AS creator_name,updater.name AS updater_name
    FROM reserve_workspace_items w JOIN reserve_users creator ON creator.id=w.created_by JOIN reserve_users updater ON updater.id=w.updated_by
    WHERE ${workPredicate(actor, sharedOnly)} ORDER BY (w.completed_at IS NOT NULL),
    CASE w.status WHEN 'review' THEN 0 WHEN 'building' THEN 1 WHEN 'captured' THEN 2 ELSE 3 END,w.updated_at DESC,w.id
    LIMIT 51 OFFSET $${params.length + 1}`, [...params, offset]);
}
export async function commandCenter(db: Queryable, actor: Actor, date?: string, offset = 0) {
  actor = await verifiedOperator(db, actor);
  const now = DateTime.now().setZone(ZONE);
  const selectedDay = date || now.toISODate()!;
  const [start, end] = dayRange(now.toISODate()!);
  const provider = actor.role === 'owner' ? null : actor.provider_id;
  const [counts, nextRows, day] = await Promise.all([
    db.query<{ today: string; week: string }>(`SELECT
      count(*) FILTER(WHERE starts_at >= $1 AND starts_at < $2)::text AS today,
      count(*) FILTER(WHERE starts_at >= $3 AND starts_at < $4)::text AS week
      FROM reserve_appointments WHERE status='confirmed' AND ($5::text IS NULL OR provider_id=$5)`,
      [start,end,now.toUTC().toISO(),now.plus({days:7}).toUTC().toISO(),provider]),
    db.query<DayVisit>(`SELECT a.id,a.provider_id,a.starts_at,a.ends_at,a.status,s.name AS service_name,u.name AS client_name
      FROM reserve_appointments a JOIN reserve_services s ON s.id=a.service_id JOIN reserve_users u ON u.id=a.client_id
      WHERE a.status='confirmed' AND a.ends_at > $1 AND ($2::text IS NULL OR a.provider_id=$2)
      ORDER BY a.starts_at LIMIT 1`, [now.toUTC().toISO(),provider]),
    scheduleDay(db,actor,selectedDay),
  ]);
  let items: WorkspaceItem[] = [], workspaceReady = true, openBuild = 0, needsReview = 0;
  try {
    const params = workParams(actor);
    const [rows, aggregate] = await Promise.all([
      listWork(db,actor,offset),
      db.query<{ open: string; review: string }>(`SELECT count(*) FILTER(WHERE completed_at IS NULL)::text AS open,
        count(*) FILTER(WHERE status='review' AND completed_at IS NULL)::text AS review
        FROM reserve_workspace_items w WHERE ${workPredicate(actor)}`, params),
    ]);
    items = rows.slice(0,50); openBuild = Number(aggregate[0]?.open || 0); needsReview = Number(aggregate[0]?.review || 0);
    return { role:actor.role, providerId:actor.provider_id, asOf:new Date().toISOString(), selectedDay, day, dayTruncated:day.length===250,
      workspaceReady, hasMore:rows.length>50, offset, items, pulse:{today:Number(counts[0]?.today || 0),nextSevenDays:Number(counts[0]?.week || 0),openBuild,needsReview,nextVisit:nextRows[0] || null} };
  } catch (error) {
    if (!['42P01','42703'].includes((error as { code?:string }).code || '')) throw error;
    workspaceReady = false;
  }
  return { role:actor.role, providerId:actor.provider_id, asOf:new Date().toISOString(), selectedDay, day, dayTruncated:day.length===250,
    workspaceReady, hasMore:false, offset, items, pulse:{today:Number(counts[0]?.today || 0),nextSevenDays:Number(counts[0]?.week || 0),openBuild,needsReview,nextVisit:nextRows[0] || null} };
}
export type WorkInput = { kind:WorkspaceKind;lane:WorkspaceLane;title:string;detail:string;assignee:WorkspaceAssignee;visibility?:WorkspaceVisibility;due_date?:string|null };
export async function createWorkspaceItem(db: Database, actor: Actor, input: WorkInput) {
  return db.transaction(async tx => {
    actor = await verifiedOperator(tx,actor);
    const visibility = input.visibility || 'shared';
    if (visibility === 'founder' && actor.role !== 'owner') throw new BookingError('Founder access is required.',403);
    if (visibility === 'provider' && actor.role === 'owner') throw new BookingError('Choose shared or founder work.',400);
    const id = randomUUID();
    const [item] = await tx.query<WorkspaceItem>(`INSERT INTO reserve_workspace_items
      (id,kind,lane,title,detail,assignee,visibility,provider_id,due_date,created_by,updated_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10) RETURNING *`,
      [id,input.kind,input.lane,input.title,input.detail,input.assignee,visibility,visibility==='provider'?actor.provider_id:null,input.due_date||null,actor.id]);
    await tx.query("INSERT INTO reserve_command_audit(actor_id,resource_id,action,revision) VALUES($1,$2,'work-created',1)",[actor.id,id]);
    return item;
  });
}
export type WorkChanges = {revision:number;status?:WorkspaceStatus;assignee?:WorkspaceAssignee;title?:string;detail?:string;completed?:boolean;handoff_to?:string;acknowledge?:boolean};
export async function updateWorkspaceItem(db: Database, actor: Actor, id: string, input: WorkChanges) {
  return db.transaction(async tx => {
    actor=await verifiedOperator(tx,actor);
    const params=workParams(actor);
    const [existing]=await tx.query<WorkspaceItem>(`SELECT w.* FROM reserve_workspace_items w WHERE ${workPredicate(actor)} AND w.id=$${params.length+1} FOR UPDATE`,[...params,id]);
    if(!existing)throw new BookingError('Work item not found.',404);
    if(existing.revision!==input.revision)throw new BookingError('This item changed. Refresh before saving.',409);
    let handoffTo=existing.handoff_to, handoffState=existing.handoff_state, handoffBy=existing.handoff_by;
    if(input.handoff_to){
      if(existing.visibility!=='shared')throw new BookingError('Only shared work can be handed off.',400);
      const [recipient]=await tx.query<Actor>("SELECT * FROM reserve_users WHERE id=$1 AND (role='owner' OR (role='staff' AND provider_id='katie'))",[input.handoff_to]);
      if(!recipient || recipient.id===actor.id)throw new BookingError('Choose another Reserve operator.',400);
      handoffTo=recipient.id;handoffState='proposed';handoffBy=actor.id;
    }
    if(input.acknowledge){
      if(handoffTo!==actor.id || handoffState!=='proposed')throw new BookingError('This handoff is not waiting on you.',403);
      handoffState='acknowledged';
    }
    if(input.completed && handoffTo===actor.id)handoffState='done';
    const [item]=await tx.query<WorkspaceItem>(`UPDATE reserve_workspace_items SET
      status=$1,assignee=$2,title=$3,detail=$4,completed_at=$5,handoff_to=$6,handoff_state=$7,handoff_by=$8,
      revision=revision+1,updated_by=$9,updated_at=now() WHERE id=$10 AND revision=$11 RETURNING *`,
      [input.status??existing.status,input.assignee??existing.assignee,input.title??existing.title,input.detail??existing.detail,
      input.completed===undefined?existing.completed_at:input.completed?new Date().toISOString():null,
      handoffTo,handoffState,handoffBy,actor.id,id,input.revision]);
    if(!item)throw new BookingError('This item changed. Refresh before saving.',409);
    await tx.query("INSERT INTO reserve_command_audit(actor_id,resource_id,action,revision) VALUES($1,$2,'work-updated',$3)",[actor.id,id,item.revision]);
    return item;
  });
}
