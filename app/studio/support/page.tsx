import { studioActor } from "@/lib/studio-session";
import { requireFounder } from "@/lib/founder-command";
import { supportOverview } from "@/lib/business-management";
import { database } from "@/lib/db";
import styles from "@/components/founder-command.module.css";
export default async function PlatformSupport(){
 const actor=await studioActor();requireFounder(actor);let data:Awaited<ReturnType<typeof supportOverview>>|null=null;
 try{data=await supportOverview(await database(),actor);}catch{}
 return <div className={styles.world}><header className={styles.heading}><p className={styles.eyebrow}>FOUNDER COMMAND · PLATFORM SUPPORT</p><h1>Operational <em>support.</em></h1><p>Technical case categories and business audit actions. Private Chair notes and customer information are excluded.</p></header>
 <section className={styles.panel}><h2>Support cases.</h2>{!data?<p role="status">Support evidence unavailable. The reviewed business foundation migration and grants are required.</p>:!data.cases.length?<p>No support cases recorded.</p>:<ol className={styles.history}>{data.cases.map(row=><li key={String(row.id)}><strong>{String(row.display_name)} · {String(row.category)}</strong><span>{String(row.severity)} · {String(row.state)}</span></li>)}</ol>}</section>
 <section className={styles.panel}><h2>Business audit history.</h2>{!data?<p>Audit evidence unavailable.</p>:!data.events.length?<p>No business actions recorded.</p>:<ol className={styles.history}>{data.events.map((row,i)=><li key={i}><strong>{String(row.display_name)} · {String(row.action).replaceAll("_"," ")}</strong><time>{new Date(String(row.created_at)).toISOString()}</time></li>)}</ol>}</section></div>;
}
