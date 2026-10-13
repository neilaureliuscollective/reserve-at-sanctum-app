import { BookingError,type Actor } from "./booking";
import type { Queryable } from "./db";
import { requireCapability } from "./studio-permissions";
import { deliveryConfig } from "./booking-delivery-config";
export function requireFounder(actor: Actor) {
  requireCapability(actor,"studio.read");
  if(actor.role!=="owner")
    throw new BookingError("Founder Command requires platform administration access.",403);
}
export function communicationConfiguration(env: Record<string,string|undefined>=process.env) {
  let sendConfiguration: "disabled"|"configured"|"invalid"="disabled";
  try {
    if(deliveryConfig(env))
      sendConfiguration="configured";
  }
  catch {
    sendConfiguration="invalid";
  }
  // Only readiness booleans leave the server. Presence never establishes DNS verification or delivery.
  return {
    sendConfiguration,schedulerEnabled: env.RESERVE_BOOKING_CRON_ENABLED==="true",
    keyPresent: Boolean(env.RESEND_API_KEY),senderPresent: Boolean(env.RESERVE_BOOKING_EMAIL_FROM),
    webhookPresent: Boolean(env.RESEND_WEBHOOK_SECRET),domainVerification: "unavailable" as const,
    deliveryAcceptance: "unverified" as const
  };
}
export type ProviderReadiness={
  id: string;
  name: string;
  enabled: boolean;
  revision: number;
  services: number;
  locations: number;
  addressed_locations: number;
  staff: number;
  verified_staff: number|null;
  hours_valid: boolean;
  brand_published: boolean;
};
export function providerReadiness(p: ProviderReadiness) {
  const blockers=[
    ...(!p.services? ["No enabled services"]:[]),
    ...(!p.locations? ["No assigned location"]:[]),
    ...(!p.addressed_locations? ["No enabled location with an address"]:[]),
    ...(!p.hours_valid? ["Operating hours need review"]:[]),
    ...(!p.staff? ["No scoped staff account"]:[]),
    ...(p.verified_staff===null? ["Account confirmation unavailable"]:!p.verified_staff? ["No confirmed scoped staff account"]:[]),
  ];
  return {
    status: !p.services&&!p.locations&&!p.staff? "Not configured":blockers.length? "Blocked":"Needs review",
    blockers,ownership: "Not verified" as const,pilot: "Unverified" as const,
    activation: "Approval required" as const
  };
}
export type Evidence<T>={
  available: true;
  data: T;
}|{
  available: false;
  data: null;
};
async function evidence<T>(read: () => Promise<T>): Promise<Evidence<T>> {
  try {
    return { available: true,data: await read() };
  }
  catch {
    return { available: false,data: null };
  }
}
export async function founderCommand(db: Queryable,actor: Actor,env: Record<string,string|undefined>=process.env) {
  requireFounder(actor); // Before any query, including schema diagnostics.
  const [directory,communications,approvals,activity]=await Promise.all([
    evidence(async () => {
      const rows=await db.query<ProviderReadiness>(`SELECT p.id,p.name,p.enabled,p.revision,
        (SELECT count(*)::int FROM reserve_services s WHERE s.provider_id=p.id AND s.enabled) AS services,
        (SELECT count(*)::int FROM reserve_provider_locations pl WHERE pl.provider_id=p.id) AS locations,
        (SELECT count(*)::int FROM reserve_provider_locations pl JOIN reserve_locations l ON l.id=pl.location_id WHERE pl.provider_id=p.id AND l.enabled AND length(trim(l.address))>0) AS addressed_locations,
        (SELECT count(*)::int FROM reserve_users u WHERE u.provider_id=p.id AND u.role IN ('operator','staff')) AS staff,
        NULL::int AS verified_staff,
        (p.open_hour>=0 AND p.close_hour<=24 AND p.open_hour<p.close_hour AND cardinality(p.weekdays)>0 AND p.weekdays<@ARRAY[1,2,3,4,5,6,7]) AS hours_valid,
        EXISTS(SELECT 1 FROM reserve_provider_brands b WHERE b.provider_id=p.id AND b.published IS NOT NULL) AS brand_published
        FROM reserve_providers p ORDER BY p.name,p.id LIMIT 201`);
      // Runtime SQL may intentionally lack access to Auth. Do not widen grants
      // just to show confirmation counts, or hide usable catalog evidence.
      const confirmations=await evidence(() => db.query<{ provider_id: string; count: number }>(
        "SELECT u.provider_id,count(*)::int AS count FROM reserve_users u JOIN auth.users a ON a.id::text=u.id WHERE u.role IN ('operator','staff') AND a.email_confirmed_at IS NOT NULL GROUP BY u.provider_id"
      ));
      const verified=new Map(confirmations.available? confirmations.data.map(r => [r.provider_id,r.count]):[]);
      return {
        providers: rows.slice(0,200).map(row => {
          const p={ ...row,verified_staff: confirmations.available? verified.get(row.id)??0:null };
          return { ...p,readiness: providerReadiness(p) };
        }),truncated: rows.length>200,
        businessOwnership: "unavailable" as const,publicMultiBusinessActivation: "disabled" as const
      };
    }),
    evidence(async () => {
      const [queue]=await db.query<{
        pending: number;
        failed: number;
        accepted: number;
        delivered: number;
        attention: number;
        manually_handled: number;
        retry_eligible: number;
      }>(`SELECT
        count(*) FILTER(WHERE m.state='manual_required')::int AS pending,
        count(*) FILTER(WHERE m.state='failed')::int AS failed,
        count(*) FILTER(WHERE m.state='sent')::int AS accepted,
        count(*) FILTER(WHERE m.delivery_status='delivered')::int AS delivered,
        count(*) FILTER(WHERE m.state='sent' AND m.delivery_status IN ('delayed','bounced','complained','failed','suppressed') AND m.delivery_handled_at IS NULL)::int AS attention,
        count(*) FILTER(WHERE m.state='confirmed_manual' OR m.delivery_handled_at IS NOT NULL)::int AS manually_handled,
        count(*) FILTER(WHERE m.state='failed' AND m.provider_message_id IS NULL AND m.attempts<3 AND m.handled_at>now()-interval '23 hours' AND m.revision=a.revision AND a.provider_id='katie' AND (CASE WHEN m.kind='cancel' THEN a.status='cancelled' ELSE a.status='confirmed' AND a.starts_at>now() END) AND (m.kind<>'reminder' OR a.arrived_at IS NULL) AND NOT EXISTS(SELECT 1 FROM reserve_booking_messages s WHERE lower(s.recipient_email)=lower(m.recipient_email) AND s.delivery_status IN ('bounced','complained','suppressed')))::int AS retry_eligible
        FROM reserve_booking_messages m JOIN reserve_appointments a ON a.id=m.appointment_id`);
      const receipts=await db.query<{
        status: string;
        count: number;
      }>("SELECT status,count(*)::int AS count FROM reserve_booking_receipts GROUP BY status ORDER BY status");
      const [unlinked]=await db.query<{
        count: number;
      }>("SELECT count(*)::int AS count FROM reserve_booking_receipts WHERE message_id IS NULL");
      const recent=await db.query<{
        kind: string;
        state: string;
        attempts: number;
        delivery_status: string|null;
        created_at: Date|string;
        accepted_at: Date|string|null;
        delivery_updated_at: Date|string|null;
        delivery_handled_at: Date|string|null;
      }>("SELECT kind,state,attempts,delivery_status,created_at,accepted_at,delivery_updated_at,delivery_handled_at FROM reserve_booking_messages ORDER BY created_at DESC,id DESC LIMIT 20");
      return { queue,receipts,unlinkedReceipts: unlinked.count,recent };
    }),
    evidence(async () => {
      const [row]=await db.query<{
        configurations: number;
        workspace: number;
      }>("SELECT (SELECT count(*)::int FROM reserve_operation_proposals WHERE state='review') AS configurations,(SELECT count(*)::int FROM reserve_workspace_items WHERE status='review' AND completed_at IS NULL AND archived_at IS NULL) AS workspace");
      return row;
    }),
    evidence(async () => db.query<{
      action: string;
      revision: number;
      created_at: Date|string;
    }>("SELECT action,revision,created_at FROM reserve_provider_brand_events ORDER BY created_at DESC,id DESC LIMIT 12")),
  ]);
  return { directory,communications,approvals,activity,configuration: communicationConfiguration(env),refreshedAt: new Date().toISOString() };
}
export type FounderCommandData=Awaited<ReturnType<typeof founderCommand>>;
