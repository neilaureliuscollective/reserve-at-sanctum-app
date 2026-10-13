import { studioActor } from "@/lib/studio-session";
import { requireFounder } from "@/lib/founder-command";
import { businessDirectory } from "@/lib/business-management";
import { database } from "@/lib/db";
import { BusinessDraftForm } from "@/components/business-draft-form";
import styles from "@/components/founder-command.module.css";
export default async function BusinessManagement(){
 const actor=await studioActor();requireFounder(actor);
 let rows:Awaited<ReturnType<typeof businessDirectory>>|null=null;
 try{rows=await businessDirectory(await database(),actor);}catch{}
 return <div className={styles.world}><header className={styles.heading}><p className={styles.eyebrow}>FOUNDER COMMAND · BUSINESS MANAGEMENT</p><h1>Independent <em>businesses.</em></h1><p>Prepare closed business identities separately from professional profiles. Ownership verification and memberships require commissioning; creating a draft grants nobody access.</p></header>
 <section className={styles.panel}><h2>Business directory.</h2>{rows===null?<p role="status">The business foundation migration is not available or its read failed. Existing professional operations remain in Team & brands.</p>:rows.length?<div className={styles.directory}>{rows.map(row=><article className={styles.provider} key={String(row.id)}><h3>{String(row.display_name)}</h3><p>{String(row.state)} · Booking {String(row.booking_status)} · Subscription {String(row.subscription_status)}</p><dl className={styles.facts}>{["verified_owners","professionals","locations","open_cases"].map(key=><div key={key}><dt>{key.replaceAll("_"," ")}</dt><dd>{String(row[key])}</dd></div>)}</dl></article>)}</div>:<p>No independent businesses have been registered. Historical organizations have not been migrated automatically.</p>}</section>
 <section className={styles.panel}><h2>Prepare a closed business.</h2><BusinessDraftForm available={rows!==null}/></section></div>;
}
