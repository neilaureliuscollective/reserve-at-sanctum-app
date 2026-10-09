import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { FixItSignout } from "../../runtime";
export const dynamic = "force-dynamic";
export const metadata = { title: "Your account" };
export default async function Account() {
  const actor = await currentUser();
  return <main id="main" className="inner-page section"><p className="eyebrow">FIX IT SHOP</p><h1>Your account.</h1>
    {actor ? <><p>Signed in as {actor.name}.</p><FixItSignout /></> : <p>Sign in with your own account. Staff access is assigned separately.</p>}
    <div className="hero-actions"><Link className="button button-gold" href="/fix-it-shop/app/signin?next=%2F">Sign in</Link><Link className="button" href="/">Open Fix It Shop</Link><Link href="/fix-it-shop/app/install">Phone setup</Link></div>
  </main>;
}
