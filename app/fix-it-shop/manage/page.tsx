import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { fixItBusiness } from "@/lib/business-workspace";
import { requireBusinessAccess } from "@/lib/business-authority";
import { BusinessWorkspace } from "@/components/business-workspace";
import "./workspace.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Fix It Shop · Management",
  robots: { index: false, follow: false },
};
export default async function Page() {
  const actor = await currentUser();
  if (!actor) redirect("/fix-it-shop/app/signin?next=/fix-it-shop/manage");
  try {
    const db = await database();
    await requireBusinessAccess(
      db,
      actor,
      await fixItBusiness(db),
      "appointments.read",
    );
  } catch {
    return (
      <main id="main" className="business-workspace">
        <h1>Management access is not ready</h1>
        <p>
          A verified Fix It Shop business membership is required. Signing in or
          confirming an email does not grant business authority.
        </p>
        <Link href="/fix-it-shop/app">Return to Fix It Shop</Link>
      </main>
    );
  }
  return (
    <main id="main" className="business-workspace">
      <nav aria-label="Management navigation"><Link href="/fix-it-shop/app">Fix It Shop</Link> · <Link href="/account">My account</Link></nav>
      <p className="eyebrow">FIX IT SHOP · POWERED BY AETHELIOS BOOKING</p>
      <h1>Your business. Your calendar.</h1>
      <BusinessWorkspace />
      <Link href="/fix-it-shop/app">Customer view</Link>
    </main>
  );
}
