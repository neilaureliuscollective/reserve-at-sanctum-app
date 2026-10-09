import Link from "next/link";
export const metadata = { title: "Your privacy" };
export default function Privacy() {
  return <main id="main" className="inner-page section"><p className="eyebrow">FIX IT SHOP</p><h1>Your information.</h1><p>Your account and appointments use the shared Reserve operating infrastructure. Customers access their own visits; Katie’s staff access is restricted to her assigned services, clients, and locations.</p><p>Optional Chair preferences have separate sharing controls. Private records require a connection and are not stored in the app’s offline cache. Payment collection and automated reminders are not activated by installing this app.</p><Link href="/fix-it-shop/app">Return to Fix It Shop ↗</Link></main>;
}
