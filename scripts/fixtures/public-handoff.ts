// Isolated synthetic records only. No provider-generation API or hosted target.
import { PGlite } from "@electric-sql/pglite";
import { schema, seed, wrapPglite } from "../../lib/db";
import { katieProfile } from "../../lib/provider-brand-display";
async function main() {
if (process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NODE_ENV === "production") throw Error("Synthetic fixture only");
const pg = new PGlite(".data/reserve"); await pg.waitReady;
try {
  const db = wrapPglite(pg); await schema(db); await seed(db);
  await db.query("INSERT INTO reserve_providers(id,name,enabled,location_id) VALUES('synthetic-other','Synthetic Other',true,'eunice') ON CONFLICT DO NOTHING");
  await db.query("INSERT INTO reserve_provider_locations(provider_id,location_id) VALUES('synthetic-other','eunice') ON CONFLICT DO NOTHING");
  await db.query("INSERT INTO reserve_services(id,provider_id,name,description,minutes,buffer,price,enabled) VALUES('synthetic-other-service','synthetic-other','Synthetic other service','Synthetic fixture only',30,15,2000,true) ON CONFLICT DO NOTHING");
  const profile=JSON.stringify({...katieProfile,name:"Synthetic Other",professional:"Synthetic Other"});
  await db.query("INSERT INTO reserve_provider_brands(provider_id,slug,draft,published,published_revision,updated_by) VALUES('synthetic-other','synthetic-other',$1::jsonb,$1::jsonb,1,'preview-neil') ON CONFLICT DO NOTHING",[profile]);
} finally { await pg.close(); }

}
main().catch(error=>{console.error(error);process.exitCode=1;});
