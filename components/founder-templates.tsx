"use client";
import { useState } from "react";
import { bookingEmailKinds,renderBookingEmail,type BookingEmailKind } from "@/lib/booking-email-template";
import styles from "./founder-command.module.css";
export function FounderTemplates() {
  const [kind,setKind]=useState<BookingEmailKind>("booked"),[season,setSeason]=useState("summer"),[linked,setLinked]=useState(true),[tested,setTested]=useState(false);
  const starts_at=season==="summer"? "2027-07-06T15:00:00Z":"2027-01-05T16:00:00Z";
  const preview=renderBookingEmail({ kind,starts_at,ends_at: season==="summer"? "2027-07-06T15:45:00Z":"2027-01-05T16:45:00Z",timezone: "America/Chicago",price: 4500,provider_name: "Synthetic professional",service_name: "Synthetic service",address: "Synthetic location · not a business address",accountLinked: linked },"https://booking.example.com");
  return <div className={styles.templates}>
    <h3>Template library & safe rehearsal.</h3>
    <p>The four transactional templates below use the exact renderer used by the booking worker. All values are synthetic and the preview has no recipient.</p>
    <div className={styles.controls}>
      <label>
        <span id="founder-kind-label">Booking message</span>
        <select aria-labelledby="founder-kind-label" value={kind} onChange={e => { setKind(e.target.value as BookingEmailKind); setTested(false); }}>{bookingEmailKinds.map(k => <option key={k} value={k}>{k}</option>)}</select>
      </label>
      <label>
        <span id="founder-zone-label">Time-zone rehearsal</span>
        <select aria-labelledby="founder-zone-label" value={season} onChange={e => { setSeason(e.target.value); setTested(false); }}>
          <option value="summer">Summer · CDT</option>
          <option value="winter">Winter · CST</option>
        </select>
      </label>
      <label>
        <span id="founder-customer-label">Customer experience</span>
        <select aria-labelledby="founder-customer-label" value={linked? "account":"guest"} onChange={e => { setLinked(e.target.value==="account"); setTested(false); }}>
          <option value="account">Signed-in account</option>
          <option value="guest">Guest · manual contact</option>
        </select>
      </label>
    </div>
    <div className={styles.preview} aria-label="Synthetic email preview">
      <p>
        <strong>Subject:</strong> {preview.subject}</p>
      <pre>{preview.text}</pre>
    </div>
    <button type="button" className="button button-gold" onClick={() => setTested(true)}>Rehearse template locally</button>
    <p role="status">{tested? "Synthetic rendering completed. No email was sent. Provider acceptance and inbox delivery remain unverified.":"Local rehearsal only. Real test sending requires approved commissioning."}</p>
    <details>
      <summary>Business onboarding draft · review only</summary>
      <p>Subject: Preparing your Aethelios Booking pilot</p>
      <p>We would like to review your approved business identity, verified owner account, team assignments, services, hours, location and booking policies. A private rehearsal and communications verification come before activation. Please confirm these details with the founder through your agreed contact method.</p>
      <p>This is an unsent draft, not an account invitation, access grant or live onboarding system.</p>
    </details>
    <details>
      <summary>Platform service communication draft · review only</summary>
      <p>Subject: Aethelios Booking commissioning review</p>
      <p>Your booking environment is awaiting final verification. We will confirm the rehearsal results, calendar cutover and fallback procedure together before approving activation.</p>
      <p>Marketing communications, bulk contacts and affiliate commerce are outside this phase.</p>
    </details>
  </div>;
}
