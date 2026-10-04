import { randomUUID } from 'node:crypto';
import type { Actor } from './booking';
import { BookingError } from './booking';
import { verifiedOperator } from './command-access';
import type { Database, Queryable, Row } from './db';
export type BusinessFact=Row & {id:string;lane:string;title:string;body:string;source:string;confirmed_at:string;review_at:string|null;revision:number;active:boolean};
export async function knowledge(db:Queryable,actor:Actor){
  actor=await verifiedOperator(db,actor);
  const facts=await db.query<BusinessFact>('SELECT * FROM reserve_business_facts ORDER BY confirmed_at DESC LIMIT 100');
  const services=await db.query('SELECT s.id,s.name,s.minutes,s.price,p.name AS provider FROM reserve_services s JOIN reserve_providers p ON p.id=s.provider_id WHERE s.enabled AND p.enabled ORDER BY s.name');
  return {facts,services,canConfirm:actor.role==='owner',asOf:new Date().toISOString()};
}
export async function confirmFact(db:Database,actor:Actor,input:{lane:string;title:string;body:string;source:string;review_at?:string|null}){
  return db.transaction(async tx=>{
    actor=await verifiedOperator(tx,actor);
    if(actor.role!=='owner')throw new BookingError('Founder confirmation is required.',403);
    const id=randomUUID();
    const [fact]=await tx.query<BusinessFact>('INSERT INTO reserve_business_facts(id,lane,title,body,source,confirmed_by,review_at) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[id,input.lane,input.title,input.body,input.source,actor.id,input.review_at||null]);
    await tx.query("INSERT INTO reserve_command_audit(actor_id,resource_id,action,revision) VALUES($1,$2,'knowledge-confirmed',1)",[actor.id,id]);
    return fact;
  });
}
export async function retireFact(db:Database,actor:Actor,id:string,revision:number){
  return db.transaction(async tx=>{
    actor=await verifiedOperator(tx,actor);
    if(actor.role!=='owner')throw new BookingError('Founder confirmation is required.',403);
    const [fact]=await tx.query<BusinessFact>('UPDATE reserve_business_facts SET active=false,revision=revision+1 WHERE id=$1 AND revision=$2 RETURNING *',[id,revision]);
    if(!fact)throw new BookingError('This fact changed. Refresh before updating.',409);
    await tx.query("INSERT INTO reserve_command_audit(actor_id,resource_id,action,revision) VALUES($1,$2,'knowledge-retired',$3)",[actor.id,id,fact.revision]);
    return fact;
  });
}
