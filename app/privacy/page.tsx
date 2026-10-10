import Link from "next/link";
export const metadata = { title: "Your information" };
export default function Privacy() {
 return <main id="main" className="inner-page section"><p className="eyebrow">FIX IT SHOP</p><h1>Your information.</h1>
 <p>Your existing account and saved appointments remain in the same booking system. Customers access their own appointments. Team access uses verified, server-assigned permissions and professional scope; signing up does not grant staff access.</p>
 <h2>The Chair</h2><p>Saving and sharing are separate choices. Katie and the authorized platform administrator can read a shared check-in. Other professionals do not automatically receive it. Private staff service notes are separate from customer answers. Optional life context expires after seven days; you can edit, revoke sharing or delete your Chair data.</p>
 <p>Booking and private records require a connection and are not cached offline. Chair information is not sent to general-purpose AI, CRM or Concierge integrations. The existing optional drafting tool receives only text deliberately supplied to it; avoid supplying private client information.</p>
 <p>Product commerce remains separate. An actual checkout link uses the configured commerce provider; installing the app does not activate payments or reminders.</p>
 <Link href="/chair">Manage The Chair ↗</Link> · <Link href="/account">Your appointment history ↗</Link></main>;
}
