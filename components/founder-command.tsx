import Link from "next/link";
import type { FounderCommandData } from "@/lib/founder-command";
import { FounderTemplates } from "./founder-templates";
import styles from "./founder-command.module.css";
const date=(value: Date|string) => new Date(value).toISOString().replace("T"," · ").slice(0,22)+" UTC";
export function FounderCommand({ data, overview }: {
  data: FounderCommandData|null;
  overview?: React.ReactNode;
}) {
  return <div className={styles.world}>
    <header className={styles.heading}>
      <p className={styles.eyebrow}>AETHELIOS TECHNOLOGIES · PRIVATE OPERATIONS</p>
      <h1>Founder <em>Command.</em>
      </h1>
      <p>One clear view of what is configured, what needs attention, and what still needs proof.</p>
      <nav className={styles.sections} aria-label="Founder Command sections">
        <a href="#overview">Executive overview</a>
        <a href="#businesses">Business readiness</a>
        <a href="#communications">Communications</a>
        <a href="#commissioning">Katie’s pilot</a>
      </nav>
    </header>
    {overview}
    {!data? <section className={styles.panel} role="alert">
      <h2>Operational evidence is unavailable.</h2>
      <p>The database could not be read. No readiness result has been inferred.</p>
      <Link href="/studio" className="button button-gold" prefetch={false}>Try again</Link>
    </section>:<>
      <section className={styles.focus} aria-labelledby="attention-title">
        <div>
          <p className={styles.eyebrow}>RELEASE POSITION</p>
          <h2 id="attention-title">Configuration is not acceptance.</h2>
          <p>Hosted pilot verification is still required. Independent business authority is prepared behind a disabled commissioning gate; existing provider operations remain the compatibility path.</p>
        </div>
        <dl className={styles.signals}>
          <div>
            <dt>Configuration reviews</dt>
            <dd>{data.approvals.available? data.approvals.data.configurations:"Unavailable"}</dd>
          </div>
          <div>
            <dt>Work awaiting approval</dt>
            <dd>{data.approvals.available? data.approvals.data.workspace:"Unavailable"}</dd>
          </div>
          <div>
            <dt>Business activation</dt>
            <dd className={styles.small}>Approval required</dd>
          </div>
        </dl>
        <div className={styles.links}>
          <Link href="/studio/operations">Review existing configuration →</Link>
          <Link href="/studio/build">Open review work →</Link>
          <Link href="/studio/businesses">Business management →</Link>
          <Link href="/studio/support">Platform support →</Link>
        </div>
      </section>
      <section id="businesses" className={styles.panel} aria-labelledby="business-title">
        <p className={styles.eyebrow}>BUSINESS DIRECTORY FOUNDATION</p>
        <h2 id="business-title">Professionals & readiness.</h2>
        <p>These are persisted provider records, not verified independent business accounts. A published brand does not prove ownership. Enabled services and accounts do not prove pilot acceptance.</p>
        {!data.directory.available? <p role="status">Directory unavailable. Check the migration baseline and database connection.</p>:!data.directory.data.providers.length? <p className={styles.empty}>No professionals have been configured. Start with the approved Fix It Shop provider in the existing Team & brands workflow.</p>:<div className={styles.directory}>{data.directory.data.providers.map(p => <article key={p.id} className={styles.provider}>
          <div className={styles.row}>
            <h3>{p.name}</h3>
            <span className={styles.badge}>{p.readiness.status}</span>
          </div>
          <p>{p.id==="katie"? "Fix It Shop · Katie’s independent business":"Provider identity · business association needs verification"}</p>
          <dl className={styles.facts}>
            <div>
              <dt>Services enabled</dt>
              <dd>{p.services}</dd>
            </div>
            <div>
              <dt>Locations assigned</dt>
              <dd>{p.locations}</dd>
            </div>
            <div>
              <dt>Confirmed staff accounts</dt>
              <dd>{p.verified_staff??"Unavailable"}</dd>
            </div>
            <div>
              <dt>Brand publication</dt>
              <dd>{p.brand_published? "Published snapshot":"Not published"}</dd>
            </div>
          </dl>
          <p>Provider {p.enabled? "enabled":"disabled"} · configuration revision {p.revision}. Ownership: {p.readiness.ownership}. Pilot: {p.readiness.pilot}.</p>
          {p.readiness.blockers.length? <ul>{p.readiness.blockers.map(b => <li key={b}>{b}</li>)}</ul>:<p>Local configuration prerequisites are present. Verify approved policies, hosted appointment flows and ownership before recording pilot acceptance.</p>}
        </article>)}</div>}
        {data.directory.available&&data.directory.data.truncated&&<p>Showing the first 200 providers. The directory needs pagination before expansion.</p>}
        <div className={styles.links}>
          <Link href="/studio/brands">Team, identity & branding →</Link>
          <Link href="/studio/operations">Services, pricing, locations & hours →</Link>
        </div>
      </section>
      <section id="communications" className={styles.panel} aria-labelledby="communications-title">
        <p className={styles.eyebrow}>COMMUNICATIONS COMMAND</p>
        <h2 id="communications-title">Booking messages, with evidence.</h2>
        <p>Acceptance means Resend accepted a message. Delivery means a signed provider receipt reports delivery; it does not establish that a customer read it.</p>
        <dl className={styles.configuration}>
          <div>
            <dt>Send control</dt>
            <dd>{data.configuration.sendConfiguration}</dd>
          </div>
          <div>
            <dt>Scheduler control</dt>
            <dd>{data.configuration.schedulerEnabled? "Enabled flag · schedule unverified":"Disabled"}</dd>
          </div>
          <div>
            <dt>Provider credential</dt>
            <dd>{data.configuration.keyPresent? "Present · permission unverified":"Not configured"}</dd>
          </div>
          <div>
            <dt>Sender configuration</dt>
            <dd>{data.configuration.senderPresent? "Present · domain verification unavailable":"Not configured"}</dd>
          </div>
          <div>
            <dt>Webhook verification secret</dt>
            <dd>{data.configuration.webhookPresent? "Present · hosted receipt test required":"Not configured"}</dd>
          </div>
        </dl>
        {!data.communications.available? <p role="status">Communication evidence unavailable. Delivery and receipt migrations may be missing. No counts are assumed.</p>:<>
          <dl className={styles.facts}>{Object.entries({ "Manual queue": data.communications.data.queue.pending,"Failed attempts": data.communications.data.queue.failed,"Provider accepted": data.communications.data.queue.accepted,"Reported delivered": data.communications.data.queue.delivered,"Receipts needing follow-up": data.communications.data.queue.attention,"Manually handled": data.communications.data.queue.manually_handled }).map(([label,value]) => <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>)}</dl>
          <p>{data.communications.data.queue.retry_eligible} failed messages meet initial retry checks. The existing worker rechecks the current appointment, suppression, attempt limit and first-attempt window before sending. No manual resend or send control is exposed here.</p>
          <p>{data.communications.data.unlinkedReceipts} receipts await message linking. {data.communications.data.receipts.length? data.communications.data.receipts.map(r => `${r.status}: ${r.count}`).join(" · "):"No provider receipts recorded."}</p>
          <details>
            <summary>Recent operational message history · no customer details</summary>{!data.communications.data.recent.length? <p>No messages recorded.</p>:<ol className={styles.history}>{data.communications.data.recent.map((m,i) => <li key={i}>
              <strong>{m.kind} · {m.state}</strong>
              <span>{m.delivery_status||"No provider receipt"} · {m.attempts} attempts{m.delivery_handled_at? " · Follow-up recorded":""}</span>
              <small>{date(m.created_at)}</small>
            </li>)}</ol>}</details>
        </>}
        <p>Manual customer follow-up stays in the assigned professional’s existing Today workflow. Automatic retries use the same booking message and idempotency key, at most three attempts within 23 hours.</p>
        <FounderTemplates />
      </section>
      <section id="commissioning" className={styles.panel} aria-labelledby="pilot-title">
        <p className={styles.eyebrow}>FIX IT SHOP · CONTROLLED COMMISSIONING</p>
        <h2 id="pilot-title">Before Katie relies on it.</h2>
        <ol className={styles.checklist}>
          <li>
            <strong>Establish the intended environment.</strong>
            <span>Verify the Supabase project and Vercel project mapping, reviewed migration baseline, backup and tested restore. Hosted evidence is not available in this console.</span>
          </li>
          <li>
            <strong>Confirm Katie’s account and approved business setup.</strong>
            <span>Confirmed account, provider-scoped permissions, real menu, prices, durations, buffers, location, hours and booking policies. Provider assignment is not ownership verification.</span>
          </li>
          <li>
            <strong>Rehearse the actual appointment journey.</strong>
            <span>Hosted new/returning booking, concurrent collision, session recovery, cancellation, rescheduling, calendar consistency and unauthorized access.</span>
          </li>
          <li>
            <strong>Commission communications separately.</strong>
            <span>Approve a controlled test inbox, verify the sender domain, signed delivery receipts, bounce/suppression and bounded retry. Approve sending and scheduling separately.</span>
          </li>
          <li>
            <strong>Verify phones and approve the cutover.</strong>
            <span>iPhone, Android and Samsung Fold installation/accessibility, existing customer consent and a single calendar authority. GlossGenius remains the fallback.</span>
          </li>
        </ol>
        <p className={styles.notice}>Pilot verification and activation approval are unrecorded. This console cannot activate a business, change account roles, schedule emails or transmit messages.</p>
      </section>
      <section className={styles.panel}>
        <h2>Recent platform actions.</h2>
        <p>Recorded brand configuration events only. Customer notes, Chair information, contacts and proposal payloads are excluded.</p>{!data.activity.available? <p>Audit evidence unavailable.</p>:!data.activity.data.length? <p>No brand actions recorded.</p>:<ol className={styles.history}>{data.activity.data.map((e,i) => <li key={i}>
          <strong>{e.action} · revision {e.revision}</strong>
          <small>{date(e.created_at)}</small>
        </li>)}</ol>}<p className={styles.meta}>Evidence read: {date(data.refreshedAt)}. Refresh to read current records.</p>
      </section>
    </>}
  </div>;
}
