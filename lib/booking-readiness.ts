import type { Queryable } from "./db";
/** Read-only commissioning evidence. Configuration checks are prerequisites,
 * never a claim of real Auth, email, browser or production acceptance. */
export async function bookingReadiness(db: Queryable) {
  const columns=await db.query<{table_name:string;column_name:string}>("SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('reserve_appointments','reserve_booking_messages','reserve_booking_receipts')");
  const required={reserve_appointments:["revision","arrived_at","no_show_at"],reserve_booking_messages:["provider_message_id","accepted_at","recipient_email","delivery_status","delivery_handled_at"],reserve_booking_receipts:["id","provider_message_id","message_id","status","occurred_at"]};
  const missingColumns=Object.entries(required).flatMap(([table,names])=>names.filter(name=>!columns.some(c=>c.table_name===table&&c.column_name===name)).map(name=>`${table}.${name}`));
  const [configuration]=await db.query<{
    booking_locations:number;enabled_providers:number;enabled_services:number;assigned_providers:number;scoped_staff:number;
  }>(`SELECT
    (SELECT count(*)::int FROM reserve_locations WHERE enabled AND booking_enabled AND address<>'') AS booking_locations,
    (SELECT count(*)::int FROM reserve_providers WHERE enabled) AS enabled_providers,
    (SELECT count(*)::int FROM reserve_services s JOIN reserve_providers p ON p.id=s.provider_id WHERE s.enabled AND p.enabled) AS enabled_services,
    (SELECT count(DISTINCT p.id)::int FROM reserve_providers p JOIN reserve_provider_locations pl ON pl.provider_id=p.id JOIN reserve_locations l ON l.id=pl.location_id WHERE p.enabled AND l.enabled AND l.booking_enabled) AS assigned_providers,
    (SELECT count(*)::int FROM reserve_users u JOIN reserve_providers p ON p.id=u.provider_id WHERE p.enabled AND u.role IN ('operator','staff') AND u.id ~ '^[0-9a-f-]{36}$') AS scoped_staff`);
  const [privacy]=await db.query<{private_tables:number;rls_enabled:number}>("SELECT count(*)::int AS private_tables,count(*) FILTER (WHERE c.relrowsecurity)::int AS rls_enabled FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('reserve_users','reserve_appointments','reserve_clients','reserve_booking_messages','reserve_booking_receipts')");
  const [occupancy]=await db.query<{protected:boolean}>(`SELECT EXISTS(
    SELECT 1 FROM information_schema.table_constraints t WHERE t.table_schema='public' AND t.table_name='reserve_occupancy' AND t.constraint_type='PRIMARY KEY'
    AND (SELECT array_agg(k.column_name::text ORDER BY k.ordinal_position) FROM information_schema.key_column_usage k WHERE k.constraint_schema=t.constraint_schema AND k.constraint_name=t.constraint_name)=ARRAY['provider_id','starts_at']::text[]
  ) AS protected`);
  return {schema:{missingColumns},configuration,privacy,occupancyProtected:occupancy.protected,
    configurationPrerequisitesMet:missingColumns.length===0&&Object.values(configuration).every(n=>n>0)&&privacy.private_tables===5&&privacy.rls_enabled===5&&occupancy.protected,
    liveAcceptance:"unverified" as const};
}
