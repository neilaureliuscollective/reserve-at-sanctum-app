import { database } from "../lib/db";
import { bookingReadiness } from "../lib/booking-readiness";
async function main(){
 const value=process.env.DATABASE_URL;
 if(!value)throw Error("Configure the intended server-only DATABASE_URL securely.");
 const target=new URL(value),ref=process.argv.find(a=>a.startsWith("--expected-project-ref="))?.split("=")[1];
 if(!ref||!/^[a-z]{20}$/.test(ref)||!(target.hostname===`db.${ref}.supabase.co`||target.hostname.endsWith(".pooler.supabase.com")&&decodeURIComponent(target.username).endsWith(`.${ref}`)))throw Error("The connection must match an explicitly reviewed Supabase project reference.");
 console.log(JSON.stringify(await bookingReadiness(await database(), {providerId:"katie",locationId:process.env.RESERVE_READINESS_LOCATION_ID || "eunice",accountId:process.env.RESERVE_READINESS_KATIE_ACCOUNT_ID || ""}),null,2));
 console.log("Read-only prerequisites checked. Real identity, inbox delivery, restoration and phone acceptance still require verification.");
 process.exit(0);
}
main().catch(()=>{console.error("Readiness check unavailable: verify the reviewed project, runtime connection, baseline and grants. No credentials or customer records are printed.");process.exitCode=1;});
