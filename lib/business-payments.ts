import { randomUUID } from "node:crypto";
import { z } from "zod";
import { BookingError, type Actor } from "./booking";
import type { Database } from "./db";
import { requireBusinessAccess } from "./business-authority";
const squareObservation=z.object({environment:z.enum(["sandbox","production"]),sellerId:z.string().min(1).max(100),paymentId:z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),locationId:z.string().min(1).max(100),state:z.enum(["APPROVED","PENDING","COMPLETED","CANCELED","FAILED"]),amountCents:z.number().int().min(0).max(2147483647),currency:z.string().regex(/^[A-Z]{3}$/),observedAt:z.iso.datetime()}).strict();

/** Server adapter boundary only; no HTTP route accepts unverified payment data.
 * A future seller-scoped Square GET/webhook adapter must verify these observations.
 * This function cannot charge, refund, create a subscription or change a booking. */
export async function associateObservedSquarePayment(db:Database,actor:Actor,businessId:string,appointmentId:string,observation:unknown,env:Record<string,string|undefined>=process.env){
 if(env.RESERVE_PAYMENT_ASSOCIATION_ENABLED!=="true")throw new BookingError("Payment association is not commissioned.",503);
 const p=squareObservation.parse(observation);
 return db.transaction(async tx=>{
  const membership=await requireBusinessAccess(tx,actor,businessId,"payments.associate",env);
  const [appointment]=await tx.query<{provider_id:string;status:string}>(`SELECT a.provider_id,a.status FROM reserve_appointments a
   JOIN reserve_business_providers bp ON bp.provider_id=a.provider_id WHERE a.id=$1 AND bp.business_id=$2
   AND ($4::boolean OR EXISTS(SELECT 1 FROM reserve_business_staff_assignments sa WHERE sa.business_id=$2 AND sa.user_id=$3 AND sa.provider_id=a.provider_id))
   FOR SHARE OF a`,[appointmentId,businessId,actor.id,membership.role!=="staff"]);
  if(!appointment)throw new BookingError("Appointment access is not authorized.",403);
  if(appointment.status!=="completed")throw new BookingError("Post-appointment payment association requires a completed visit.",409);
  const [seller]=await tx.query("SELECT business_id FROM reserve_business_square_locations WHERE business_id=$1 AND environment=$2 AND seller_id=$3 AND square_location_id=$4 FOR SHARE",[businessId,p.environment,p.sellerId,p.locationId]);
  if(!seller)throw new BookingError("Square seller and location are not verified for this business.",409);
  const [prior]=await tx.query<{id:string;appointment_id:string;business_id:string}>("SELECT id,appointment_id,business_id FROM reserve_appointment_payment_links WHERE environment=$1 AND seller_id=$2 AND external_payment_id=$3 FOR UPDATE",[p.environment,p.sellerId,p.paymentId]);
  if(prior){
   if(prior.appointment_id!==appointmentId||prior.business_id!==businessId)throw new BookingError("This payment is already associated with another appointment.",409);
   // Observations may arrive out of order. Only a later verified observation
   // updates processor evidence. A duplicate does not add a second receipt.
   await tx.query("UPDATE reserve_appointment_payment_links SET state=$2,amount_cents=$3,currency=$4,observed_at=$5 WHERE id=$1 AND observed_at<$5::timestamptz",[prior.id,p.state,p.amountCents,p.currency,p.observedAt]);
   return {id:prior.id};
  }
  const id=randomUUID();
  await tx.query(`INSERT INTO reserve_appointment_payment_links(id,business_id,provider_id,appointment_id,environment,seller_id,external_payment_id,external_location_id,state,amount_cents,currency,observed_at,recorded_by)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,[id,businessId,appointment.provider_id,appointmentId,p.environment,p.sellerId,p.paymentId,p.locationId,p.state,p.amountCents,p.currency,p.observedAt,actor.id]);
  await tx.query("INSERT INTO reserve_business_events(business_id,actor_id,action) VALUES($1,$2,'square_associated')",[businessId,actor.id]);
  return {id};
 });
}
