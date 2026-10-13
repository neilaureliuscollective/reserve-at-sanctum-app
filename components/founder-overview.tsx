import type { FounderOverviewData } from "@/lib/founder-overview";
import styles from "./founder-command.module.css";

export function FounderOverview({ data }: { data: FounderOverviewData | null }) {
  return <section id="overview" className={styles.panel} aria-labelledby="overview-title">
    <p className={styles.eyebrow}>EXECUTIVE OVERVIEW</p>
    <h2 id="overview-title">The platform, from actual records.</h2>
    {!data ? <p role="status">Executive evidence is unavailable.</p> : <>
      <dl className={styles.facts}>
        <div><dt>Registered businesses</dt><dd>{data.businesses.available ? data.businesses.data.total : "Unavailable"}</dd></div>
        <div><dt>Professionals</dt><dd>{data.professionals.available ? data.professionals.data.total : "Unavailable"}</dd></div>
        <div><dt>Scoped operating accounts</dt><dd>{data.professionals.available ? data.professionals.data.scoped_staff : "Unavailable"}</dd></div>
        <div><dt>Appointments saved</dt><dd>{data.bookings.available ? data.bookings.data.total : "Unavailable"}</dd></div>
        <div><dt>Created in last 30 days</dt><dd>{data.bookings.available ? data.bookings.data.last_30_days : "Unavailable"}</dd></div>
      </dl>
      {data.businesses.available ? <p>{data.businesses.data.active} active businesses · {data.businesses.data.inactive} inactive. Active configuration does not establish booking acceptance.</p> : <p>Independent business records are unavailable. Historical organizations and professional profiles are not counted as verified businesses.</p>}
      {data.bookings.available ? data.bookings.data.statuses.length ? <dl className={styles.facts}>{data.bookings.data.statuses.map(s => <div key={s.status}><dt>{s.status.replaceAll("_", " ")}</dt><dd>{s.count}</dd></div>)}</dl> : <p>No appointments recorded. Cancellation and no-show metrics will appear from saved status records.</p> : <p>Appointment status evidence is unavailable.</p>}
      <p>Subscription revenue: unavailable. Square service receipts and Aethelios subscription revenue are separate; no billing metrics are inferred.</p>
      <details><summary>Developer release & schema diagnostics</summary>
        {data.health.available ? <>
          <p>Database: {data.health.data.database} · environment: {data.health.data.environment}. Commit: <code>{data.health.data.release || "Not supplied by runtime"}</code>.</p>
          <p>Business authority: {data.health.data.businessAuthorityEnabled ? "Enabled flag · acceptance unverified" : "Disabled"}. Payment associations: {data.health.data.paymentAssociationEnabled ? "Enabled flag · acceptance unverified" : "Disabled"}.</p>
          {data.health.data.missingTables.length ? <><p>Migration-dependent modules remain unavailable:</p><ul>{data.health.data.missingTables.map(name => <li key={name}><code>{name}</code></li>)}</ul></> : <p>Foundation tables are present. This does not verify grants, constraints, migration history or hosted acceptance.</p>}
        </> : <p>Database diagnostics unavailable. No healthy state is assumed.</p>}
      </details>
    </>}
  </section>;
}
