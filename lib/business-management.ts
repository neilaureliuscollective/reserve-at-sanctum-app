import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Actor } from "./booking";
import type { Database, Queryable } from "./db";
import { requireFounder } from "./founder-command";
export const businessDraftInput = z.object({displayName:z.string().trim().min(1).max(100),slug:z.string().regex(/^[a-z0-9][a-z0-9-]{1,62}$/)}).strict();
export const supportCaseInput = z.object({businessId:z.string().min(1).max(100),category:z.enum(["configuration","authentication","booking","communications","availability","billing"]),severity:z.enum(["routine","urgent"])}).strict();
export async function businessDirectory(db:Queryable,actor:Actor) {
 requireFounder(actor);
 return db.query(`SELECT b.id,b.display_name,b.slug,b.state,b.booking_status,b.subscription_status,b.support_status,b.revision,
 (SELECT count(*)::int FROM reserve_business_memberships m WHERE m.business_id=b.id AND m.role='business_owner' AND m.revoked_at IS NULL) AS verified_owners,
 (SELECT count(*)::int FROM reserve_business_providers p WHERE p.business_id=b.id) AS professionals,
 (SELECT count(*)::int FROM reserve_business_locations l WHERE l.business_id=b.id) AS locations,
 (SELECT count(*)::int FROM reserve_support_cases s WHERE s.business_id=b.id AND s.state='open') AS open_cases
 FROM reserve_businesses b ORDER BY b.created_at DESC,b.id LIMIT 200`);
}
export async function prepareBusiness(db:Database,actor:Actor,input:unknown) {
 requireFounder(actor);const data=businessDraftInput.parse(input);
 return db.transaction(async tx=>{
  const id=randomUUID();
  await tx.query("INSERT INTO reserve_businesses(id,slug,display_name,created_by) VALUES($1,$2,$3,$4)",[id,data.slug,data.displayName,actor.id]);
  await tx.query("INSERT INTO reserve_business_events(business_id,actor_id,action) VALUES($1,$2,'draft_created')",[id,actor.id]);
  return {id,bookingStatus:"closed"};
 });
}
export async function openSupportCase(db:Database,actor:Actor,input:unknown) {
 requireFounder(actor);const data=supportCaseInput.parse(input);
 return db.transaction(async tx=>{
  const id=randomUUID();
  await tx.query("INSERT INTO reserve_support_cases(id,business_id,category,severity,created_by) VALUES($1,$2,$3,$4,$5)",[id,data.businessId,data.category,data.severity,actor.id]);
  await tx.query("INSERT INTO reserve_business_events(business_id,actor_id,action) VALUES($1,$2,'support_opened')",[data.businessId,actor.id]);
  return {id};
 });
}
/** Categorical technical support only: no customer payload or Chair content. */
export async function supportOverview(db:Queryable,actor:Actor) {
 requireFounder(actor);
 const [cases,events]=await Promise.all([
  db.query("SELECT s.id,b.display_name,s.category,s.severity,s.state,s.revision,s.created_at FROM reserve_support_cases s JOIN reserve_businesses b ON b.id=s.business_id ORDER BY s.created_at DESC,s.id LIMIT 100"),
  db.query("SELECT b.display_name,e.action,e.created_at FROM reserve_business_events e JOIN reserve_businesses b ON b.id=e.business_id ORDER BY e.created_at DESC,e.id DESC LIMIT 100")
 ]);
 return {cases,events};
}
