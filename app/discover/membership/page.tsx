import Link from "next/link";
import Image from "next/image";
import { brand } from "@/lib/brand";
import "../public-reserve.css";
import "../public-worlds.css";
export const metadata = { title: "Membership · A place in Legacy Reserve", description: "Explore the Legacy Reserve membership vision: personal presence, wellbeing and a standard to return to." };
export default function PublicMembership() {
  return <main id="main" className="public-reserve membership-world">
    <section className="membership-arrival" aria-labelledby="membership-arrival-title">
      <div className="membership-crest" aria-hidden="true"><div className="membership-crest-ring" /><Image src={brand.mark} alt="" width={250} height={250} /></div>
      <div><p className="experience-kicker">LEGACY RESERVE / THE MEMBERSHIP VISION</p><h1 id="membership-arrival-title">A place to belong.<br /><em>A standard to return to.</em></h1><p>Grooming, considered products and a growing wellbeing experience. One relationship with the house, shaped around your direction.</p><div className="public-actions"><Link href="/signin?next=/membership" className="button button-gold">Create or access your Reserve ↗</Link><Link href="/enter" className="text-link">Open your dashboard ↗</Link></div><small>MEMBERSHIP IS IN PREPARATION · NO PAID ENROLLMENT ON THIS PAGE</small></div>
    </section>
    <section className="membership-foundations" aria-labelledby="membership-foundations-title"><p className="experience-kicker">THE CONNECTED EXPERIENCE</p><h2 id="membership-foundations-title">More than a visit.<br /><em>A personal direction.</em></h2><div className="membership-foundation-list">
      <article><span>01 / PRESENCE</span><h3>Your time in the house.</h3><p>Meet Katie and Fix It Shop, explore Neil’s GENT Ascend Collective world, and keep your grooming preferences ready for your next visit.</p><Link href="/discover#grooming" className="text-link">Explore grooming & presence ↗</Link></article>
      <article><span>02 / WELLBEING</span><h3>Your longer horizon.</h3><p>The free Vitalis wellness pilot offers a private everyday rhythm. Future health intelligence and clinical partnerships are part of the division’s developing vision.</p><Link href="/vitalis" className="text-link">Discover Legacy Reserve Vitalis ↗</Link></article>
      <article><span>03 / DAILY RITUALS</span><h3>Your standard, at home.</h3><p>Explore the Legacy Reserve collection. Each product’s page distinguishes concepts from published products and available purchases.</p><Link href="/shop" className="text-link">Explore the collection ↗</Link></article>
    </div></section>
    <section className="membership-next"><p className="experience-kicker">BEGIN WITH WHAT IS AVAILABLE</p><h2>Your Reserve starts with you.</h2><p>Your account keeps your visits and preferences together. Membership offers and benefits appear in your account when the house makes them available.</p><div className="public-actions"><Link href="/membership" className="button button-gold">Check your membership account ↗</Link><Link href="/discover" className="text-link">Explore the public website ↗</Link></div></section>
  </main>;
}
