import Image from "next/image";
import Link from "next/link";
import { Arrival } from "@/components/arrival";
import { PublicCompass, PublicDirector } from "@/components/public-reserve";
import { ReserveProductGallery } from "@/components/reserve-product-gallery";
import "../reserve-home.css";
import "../reserve-cinema-v2.css";
import "./public-reserve.css";
export const metadata = { title: "Legacy Reserve · Presence, Performance & Wellbeing", description: "Discover the Legacy Reserve house: men’s grooming, considered products and Vitalis health intelligence and longevity." };
export default function Discover() {
  return <main id="main" className="reserve-home public-reserve">
    <PublicDirector />
    <Arrival />
    <nav className="public-chapters" aria-label="Homepage chapters"><a href="#the-place">The house</a><a href="#grooming">Grooming</a><a href="#vitalis">Vitalis</a><a href="#the-collection">Collection</a><a href="#membership">Membership</a></nav>
    <section id="the-place" className="public-house public-scene" data-public-scene aria-labelledby="house-title">
      <div className="public-house-image public-camera" aria-hidden="true"><Image src="/images/cinematic/reserve-hall.webp" alt="" fill sizes="100vw" /></div>
      <div className="public-door public-door-left" aria-hidden="true" /><div className="public-door public-door-right" aria-hidden="true" />
      <div className="public-copy"><p className="experience-kicker">01 / THE HOUSE · LOUISIANA ROOTS</p><h2 id="house-title">A place to sharpen.<br /><em>A standard to live by.</em></h2><p>Legacy Reserve brings men’s grooming, considered products and a growing wellbeing experience into one house. Begin with what matters to you.</p><Link href="/visit" className="text-link">Discover the first house · Eunice ↗</Link></div>
      <small className="public-concept">CONCEPT ENVIRONMENT · THE HOUSE IS TAKING SHAPE</small>
    </section>
    <section id="grooming" className="public-grooming" aria-labelledby="grooming-title">
      <div className="public-section-heading"><p className="experience-kicker">02 / GROOMING & PERSONAL PRESENCE</p><h2 id="grooming-title">Craft in the chair.<br /><em>Discipline beyond it.</em></h2></div>
      <div className="public-people">
        <article className="public-person public-person-katie public-scene" data-public-scene><div className="public-person-image public-camera" aria-hidden="true"><Image src="/images/reserve-craft.webp" alt="" fill sizes="(max-width: 760px) 100vw, 50vw" /></div><div className="public-person-copy"><p className="experience-kicker">KATIE GUIDRY / FIX IT SHOP</p><h3>Personal attention.<br />A sharper finish.</h3><p>Men’s salon care, hair services and a visit shaped around your preferences.</p><Link href="/fix-it-shop" className="button button-outline">Meet Katie ↗</Link></div><small className="public-concept">CONCEPT IMAGERY</small></article>
        <article className="public-person public-person-neil public-scene" data-public-scene><div className="public-person-image public-camera" aria-hidden="true"><Image src="/images/neil/ritual-plinth.webp" alt="" fill sizes="(max-width: 760px) 100vw, 50vw" /></div><div className="public-person-copy"><p className="experience-kicker">NEIL STUTES / GENT ASCEND COLLECTIVE</p><h3>Own your presence.<br />Keep your standard.</h3><p>Grooming direction, hair and beard rituals, and considered products for the time between visits.</p><Link href="/gent-ascend" className="button button-outline">Explore Neil’s world ↗</Link></div><small className="public-concept">CONCEPT IMAGERY</small></article>
      </div>
    </section>
    <section id="vitalis" className="public-vitalis public-scene" data-public-scene aria-labelledby="vitalis-title">
      <div className="public-vitalis-sphere" aria-hidden="true"><div className="public-orbit public-orbit-one" /><div className="public-orbit public-orbit-two" /><div className="public-orbit public-orbit-three" /><div className="public-vitalis-core"><span>V</span></div><span className="public-signal public-signal-one">INTELLIGENCE</span><span className="public-signal public-signal-two">LONGEVITY</span><span className="public-signal public-signal-three">YOUR HORIZON</span></div>
      <div className="public-copy"><p className="experience-kicker">03 / LEGACY RESERVE VITALIS</p><h2 id="vitalis-title">More life.<br /><em>More intention.</em></h2><p className="public-vitalis-position">Advanced Health Intelligence & Longevity</p><p>A new division for understanding your wellbeing and navigating your next step. The private wellness pilot is available now. Diagnostics and clinical partnerships are being prepared.</p><div className="public-actions"><Link href="/vitalis" className="button button-gold">Discover Vitalis ↗</Link><Link href="/vitalis/journey" className="text-link">Start the wellness pilot ↗</Link></div><Link className="public-quiet-link" href="/vitalis#early-access">Register for future access ↗</Link></div>
    </section>
    <section id="the-collection" className="public-collection public-scene" data-public-scene aria-labelledby="collection-title"><div className="public-section-heading"><p className="experience-kicker">04 / THE LEGACY RESERVE COLLECTION</p><h2 id="collection-title">The ritual becomes yours.</h2><p>Grooming and wellbeing. Considered down to the daily detail.</p></div><ReserveProductGallery /><div className="public-actions"><Link href="/shop" className="button button-gold">Explore products & availability ↗</Link></div></section>
    <PublicCompass />
    <section id="membership" className="public-membership" aria-labelledby="membership-title"><p className="experience-kicker">05 / YOUR NEXT CHAPTER</p><h2 id="membership-title">Make room for<br /><em>a higher standard.</em></h2><p>Explore the membership vision, meet your Aethelios concierge, or begin with a visit. Each entrance tells you what is available and what comes next.</p><div className="public-actions"><Link href="/membership" className="button button-gold">Explore membership ↗</Link><Link href="/book" className="button button-outline">Explore appointments ↗</Link></div><div className="public-concierge"><span>AETHELIOS / YOUR DIGITAL CONCIERGE</span><p>Guidance through your Reserve: grooming priorities, available experiences and your next step.</p><Link href="/aethelios" className="text-link">Meet Aethelios ↗</Link></div></section>
  </main>;
}
