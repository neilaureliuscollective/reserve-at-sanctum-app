import { PGlite } from "@electric-sql/pglite";
import { schema, seed, wrapPglite } from "../../lib/db";
async function main() {
  const path = process.argv[2],
    id = process.argv[3];
  if (
    process.env.RESERVE_VERIFY !== "true" ||
    process.env.NODE_ENV === "production" ||
    !/^\.data\/shopify-verify-\d+$/.test(path) ||
    !/^[a-f0-9-]{36}$/.test(id)
  )
    throw Error("Isolated synthetic verifier only.");
  const pg = new PGlite(path);
  await pg.waitReady;
  const db = wrapPglite(pg);
  try {
    await schema(db);
    await seed(db);
    await db.query(
      "INSERT INTO reserve_customer_locations(customer_id,location_id) VALUES('preview-client','eunice') ON CONFLICT DO NOTHING",
    );
    await db.query(
      "INSERT INTO reserve_appointments(id,client_id,customer_id,provider_id,service_id,location_id,organization_id,starts_at,ends_at,busy_until,original_start,price,status,request_key) VALUES($1,'preview-client','preview-client','katie','signature','eunice','reserve',now(),now()+interval '45 minutes',now()+interval '60 minutes',now(),4500,'checked_in',$1)",
      [id],
    );
  } finally {
    await pg.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
