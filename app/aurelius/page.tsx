import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, ArrowDown } from "lucide-react";

export const metadata = {
  title: "Aurelius Collective",
  description: "Neil’s vision for care, wellbeing, discipline and legacy. Discover Aurelius Collective’s broader purpose for men and women, and its place within The Reserve.",
};

export default function Page() {
  const destination = process.env.NEXT_PUBLIC_AURELIUS_URL;
  return (
    <main id="main" className="brand-page aurelius-world collective-world">
      <section className="collective-arrival" aria-labelledby="aurelius-title">
        <div className="collective-art">
          <Image src="/images/aurelius.webp" alt="Concept brand imagery: a bronze Atlas sculpture beside a journal and personal ritual objects" fill loading="eager" fetchPriority="high" sizes="100vw" />
        </div>
        <div className="collective-arrival-copy">
          <Link href="/" className="back-link"><ArrowLeft size={15} /> THE RESERVE AT SANCTUM</Link>
          <p className="eyebrow">INDIVIDUAL STRENGTH. SHARED ELEVATION.</p>
          <h1 id="aurelius-title">Aurelius<span>Collective</span></h1>
          <p className="collective-promise">A life built <em>with intention.</em></p>
          <p className="world-body">Care for yourself. Take responsibility for what you build. Leave something meaningful beyond yourself.</p>
          <a href="#aurelius-origin" className="text-link">Discover the story <ArrowDown size={18} /></a>
        </div>
        <div className="collective-arrival-foot"><span>CHARACTER / CARE / LEGACY</span><span>CONCEPT BRAND IMAGERY</span></div>
      </section>
      <nav className="world-index" aria-label="Explore Aurelius Collective">
        <a href="#aurelius-origin"><span>01</span> The roots</a>
        <a href="#aurelius-vision"><span>02</span> The wider vision</a>
        <a href="#aurelius-reserve"><span>03</span> A shared place</a>
      </nav>
      <section id="aurelius-origin" className="collective-origin world-section">
        <div className="origin-title"><p className="eyebrow">NEIL STUTES · THE ROOTS</p><h2>It began<br />with <em>care.</em></h2><span className="origin-rule" /></div>
        <div className="origin-story">
          <p className="origin-lead">A bottle. A daily ritual.<br />A bigger reason to care.</p>
          <p>Neil’s journey through Groomed Gent Co. began in grooming and products. It grew into a wider vision for confidence, men’s health, wellness, and the way we live.</p>
          <p>Aurelius Collective carries that purpose forward for men and women. Character, discipline, and care become part of the same conversation: what kind of life are you building, and who does it lift with you?</p>
          <p className="origin-credit">ROOTED IN GROOMING. GROWING TOWARD A LARGER LIFE.</p>
        </div>
      </section>
      <section id="aurelius-vision" className="collective-vision world-section">
        <div className="vision-heading"><p className="eyebrow">THE VISION TAKING SHAPE</p><h2>More connected.<br /><em>More considered.</em></h2><p className="world-body">Personal care, wellbeing, and a life with purpose. These are the ideas guiding what Neil is building.</p></div>
        <div className="vision-ledger">
          <article><span className="vision-number">01</span><div><p className="eyebrow">CARE</p><h3>How you look after yourself.</h3><p>Grooming, health, wellbeing, and the daily rituals that deserve your attention. A vision that considers the whole person.</p></div></article>
          <article><span className="vision-number">02</span><div><p className="eyebrow">DISCIPLINE</p><h3>How you build your life.</h3><p>Your habits, direction, and the responsibility you take for your growth. Intention made meaningful through everyday action.</p></div></article>
          <article><span className="vision-number">03</span><div><p className="eyebrow">LEGACY</p><h3>What you give beyond yourself.</h3><p>Relationships, community, and contribution. Personal growth with room for other people to rise alongside you.</p></div></article>
        </div>
        <p className="vision-status">Aurelius Collective is in development. This is the vision guiding the work; it is not a list of currently available services. Concept objects are not a purchasable catalog.</p>
      </section>
      <section id="aurelius-reserve" className="collective-reserve world-section">
        <p className="eyebrow">AURELIUS COLLECTIVE × FIX IT SHOP</p>
        <h2>A wider vision.<br /><em>A shared place to begin.</em></h2>
        <p>The Reserve is where Neil’s vision meets Katie’s personal salon craft in Eunice, Louisiana. Two independent brands, building a men’s sanctuary around a shared commitment to care.</p>
        <p>Aurelius’s broader purpose continues beyond this place, for men and women building lives with intention.</p>
        <div className="world-actions">
          {destination ? <a href={destination} className="button button-gold">Enter Aurelius Collective <ArrowUpRight size={18} /></a> : <Link href="/visit" className="button button-gold">Discover the Reserve <ArrowUpRight size={18} /></Link>}
          <Link href="/fix-it-shop" className="text-link">Meet the Fix It Shop world <ArrowUpRight size={18} /></Link>
        </div>
      </section>
      <nav className="world-continuation" aria-label="Continue exploring">
        <span>THE SHARED DESTINATION</span>
        <Link href="/" className="text-link">Return to the Reserve <ArrowUpRight size={18} /></Link>
      </nav>
    </main>
  );
}
