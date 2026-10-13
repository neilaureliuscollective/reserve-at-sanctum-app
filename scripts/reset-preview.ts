import { PGlite } from "@electric-sql/pglite";
import path from "node:path";
import { existsSync } from "node:fs";
async function main() {
if (process.env.NODE_ENV === "production" || process.env.DATABASE_URL || process.env.RESERVE_DEV_PREVIEW !== "true")
  throw new Error("Reset is restricted to the explicitly enabled local synthetic preview.");
const location=path.resolve(".data/reserve");
if(!existsSync(location))console.log("No local preview database exists. Nothing to reset.");
else {
 const pg=new PGlite(location);
 try {
  await pg.transaction(async tx=>{
   // Child notification rows must be cleared before their synthetic appointment.
   // Older preview baselines may not yet include the additive receipt table.
   for(const table of ["reserve_booking_receipts","reserve_booking_messages","reserve_occupancy","reserve_audit","reserve_appointments","reserve_sessions"]){
    const {rows}=await tx.query<{name:string|null}>("SELECT to_regclass($1) AS name",[`public.${table}`]);
    if(rows[0].name)await tx.exec(`DELETE FROM ${table}`);
   }
  });
  console.log("Local synthetic appointments, messages and sessions cleared. Catalog, accounts and profiles preserved.");
 }finally{await pg.close();}
}
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Preview reset failed."); process.exitCode=1; });
