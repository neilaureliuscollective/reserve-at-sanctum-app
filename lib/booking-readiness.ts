import type { Queryable } from "./db";
/** Read-only commissioning evidence. Configuration checks are prerequisites,
 * never a claim of real Auth, email, browser or production acceptance. */
export async function bookingReadiness(db: Queryable, scope = { providerId: "katie", locationId: "eunice", accountId: "" }) {
  const columns=await db.query<{table_name:string;column_name:string}>("SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('reserve_appointments','reserve_booking_messages','reserve_booking_receipts','reserve_booking_request_fences')");
  const required={reserve_booking_request_fences:["client_id","request_key"],reserve_appointments:["revision","arrived_at","no_show_at"],reserve_booking_messages:["provider_message_id","accepted_at","recipient_email","delivery_status","delivery_handled_at"],reserve_booking_receipts:["id","provider_message_id","message_id","status","occurred_at"]};
  const missingColumns=Object.entries(required).flatMap(([table,names])=>names.filter(name=>!columns.some(c=>c.table_name===table&&c.column_name===name)).map(name=>`${table}.${name}`));
  const [configuration]=await db.query<{
    booking_locations:number;enabled_providers:number;enabled_services:number;assigned_providers:number;scoped_business_owners:number;
  }>(`SELECT
    (SELECT count(*)::int FROM reserve_locations WHERE id=$2 AND enabled AND booking_enabled AND length(trim(address))>0) AS booking_locations,
    (SELECT count(*)::int FROM reserve_providers WHERE id=$1 AND enabled AND open_hour>=0 AND close_hour<=24 AND close_hour>open_hour AND cardinality(weekdays)>0 AND weekdays<@ARRAY[1,2,3,4,5,6,7]) AS enabled_providers,
    (SELECT count(*)::int FROM reserve_services s JOIN reserve_providers p ON p.id=s.provider_id WHERE s.provider_id=$1 AND s.enabled AND p.enabled) AS enabled_services,
    (SELECT count(DISTINCT p.id)::int FROM reserve_providers p JOIN reserve_provider_locations pl ON pl.provider_id=p.id JOIN reserve_locations l ON l.id=pl.location_id WHERE p.id=$1 AND l.id=$2 AND p.enabled AND l.enabled AND l.booking_enabled) AS assigned_providers,
    (SELECT count(*)::int FROM reserve_business_memberships m JOIN reserve_business_providers bp ON bp.business_id=m.business_id JOIN reserve_businesses b ON b.id=m.business_id WHERE bp.provider_id=$1 AND m.user_id=$3 AND m.role='business_owner' AND m.revoked_at IS NULL AND m.verified_at IS NOT NULL AND b.slug='fix-it-shop' AND b.state<>'archived' AND m.user_id ~ '^[0-9a-f-]{36}$') AS scoped_business_owners`,[scope.providerId,scope.locationId,scope.accountId]);
  let accountConfirmed: boolean | null = null;
  try {
    const [confirmation] = await db.query<{confirmed:boolean}>("SELECT EXISTS(SELECT 1 FROM auth.users a JOIN reserve_users u ON u.id=a.id::text WHERE u.id=$1 AND a.email_confirmed_at IS NOT NULL) AS confirmed", [scope.accountId]);
    accountConfirmed = confirmation.confirmed;
  } catch { /* Unavailable Auth evidence must not become a verified account. */ }
  const [privacy]=await db.query<{private_tables:number;rls_enabled:number}>("SELECT count(*)::int AS private_tables,count(*) FILTER (WHERE c.relrowsecurity)::int AS rls_enabled FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('reserve_users','reserve_appointments','reserve_clients','reserve_booking_messages','reserve_booking_receipts','reserve_booking_request_fences')");
  const [occupancy]=await db.query<{protected:boolean}>(`SELECT EXISTS(
    SELECT 1 FROM information_schema.table_constraints t WHERE t.table_schema='public' AND t.table_name='reserve_occupancy' AND t.constraint_type='PRIMARY KEY'
    AND (SELECT array_agg(k.column_name::text ORDER BY k.ordinal_position) FROM information_schema.key_column_usage k WHERE k.constraint_schema=t.constraint_schema AND k.constraint_name=t.constraint_name)=ARRAY['provider_id','starts_at']::text[]
  ) AS protected`);
  const durationChecks = await db.query<{definition:string}>("SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid='reserve_services'::regclass AND contype='c' AND conname IN ('reserve_services_minutes_check','reserve_services_buffer_check')");
  const exactDurationsSupported = ["minutes", "buffer"].every(column => durationChecks.some(c => c.definition.includes(`${column} % 5`)));
  return {scope:{providerId:scope.providerId,locationId:scope.locationId,expectedAccountProvided:Boolean(scope.accountId)},accountConfirmed,schema:{missingColumns,exactDurationsSupported},configuration,privacy,occupancyProtected:occupancy.protected,
    configurationPrerequisitesMet:accountConfirmed===true&&exactDurationsSupported&&missingColumns.length===0&&Object.values(configuration).every(n=>n>0)&&privacy.private_tables===6&&privacy.rls_enabled===6&&occupancy.protected,
    liveAcceptance:"unverified" as const};
}
