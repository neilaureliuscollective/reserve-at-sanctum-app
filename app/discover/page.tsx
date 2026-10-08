import Image from "next/image";
import Link from "next/link";
import { Arrival } from "@/components/arrival";
import { PublicCompass, PublicDirector } from "@/components/public-reserve";
import { PublicHouseScene, PublicVitalisScene, PublicCollection } from "@/components/public-worlds";
import "../reserve-home.css";
import "../reserve-cinema-v2.css";
import "./public-reserve.css";
import "./public-worlds.css";
export const metadata = { title: "Legacy Reserve · Presence, Performance & Wellbeing", description: "Discover the Legacy Reserve house: men’s grooming, considered products and Vitalis health intelligence and longevity." };
export default function Discover() {
  return <main id="main" className="reserve-home public-reserve">
    <PublicDirector />
    <Arrival />
    <nav className="public-chapters" aria-label="Homepage chapters"><a href="#the-place">The house</a><a href="#grooming">Grooming</a><a href="#vitalis">Vitalis</a><a href="#the-collection">Collection</a><a href="#membership">Membership</a></nav>
    <PublicHouseScene />
    <section id="grooming" className="public-grooming" aria-labelledby="grooming-title">
      <div className="public-section-heading"><p className="experience-kicker">02 / GROOMING & PERSONAL PRESENCE</p><h2 id="grooming-title">Craft in the chair.<br /><em>Discipline beyond it.</em></h2></div>
      <div className="public-people">
        <article className="public-person public-person-katie public-scene" data-public-scene><div className="public-person-image public-camera" aria-hidden="true"><Image src="/images/katie/craft-close.webp" alt="" fill sizes="(max-width: 760px) 100vw, 50vw" /></div><div className="public-person-copy"><p className="experience-kicker">KATIE GUIDRY / FIX IT SHOP</p><h3>Personal attention.<br />A sharper finish.</h3><p>Men’s salon care, hair services and a visit shaped around your preferences.</p><Link href="/fix-it-shop" className="button button-outline">Meet Katie ↗</Link></div><small className="public-concept">CONCEPT IMAGERY</small></article>
        <article className="public-person public-person-neil public-scene" data-public-scene><div className="public-person-image public-camera" aria-hidden="true"><Image src="/images/neil/ritual-plinth.webp" alt="" fill sizes="(max-width: 760px) 100vw, 50vw" /></div><div className="public-person-copy"><p className="experience-kicker">NEIL STUTES / GENT ASCEND COLLECTIVE</p><h3>Own your presence.<br />Keep your standard.</h3><p>Grooming direction, hair and beard rituals, and considered products for the time between visits.</p><Link href="/gent-ascend" className="button button-outline">Explore Neil’s world ↗</Link></div><small className="public-concept">CONCEPT IMAGERY</small></article>
      </div>
    </section>
    <PublicVitalisScene />
    <PublicCollection />
    <PublicCompass />
    <section id="membership" className="public-membership" aria-labelledby="membership-title"><p className="experience-kicker">05 / YOUR NEXT CHAPTER</p><h2 id="membership-title">Make room for<br /><em>a higher standard.</em></h2><p>Explore the membership vision, meet your Aethelios concierge, or begin with a visit. Each entrance tells you what is available and what comes next.</p><div className="public-actions"><Link href="/discover/membership" className="button button-gold">Explore membership ↗</Link><Link href="/book" className="button button-outline">Explore appointments ↗</Link></div><div className="public-concierge concierge-world"><div className="concierge-lens" aria-hidden="true"><i /><i /><i /></div><span>AETHELIOS / YOUR DIGITAL CONCIERGE</span><p>Guidance through your Reserve: grooming priorities, available experiences and your next step.</p><Link href="/aethelios" className="text-link">Meet Aethelios ↗</Link></div></section>
  </main>;
}
