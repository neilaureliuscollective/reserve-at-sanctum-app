import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Arrival } from "@/components/arrival";
import { Worlds } from "@/components/worlds";

export default function Home() {
  return (
    <main id="main" className="reserve-home">
      <Arrival />
      <nav className="chapter-nav" aria-label="Explore the Reserve">
        <a href="#the-place"><span>01</span> The place <ArrowUpRight size={16} /></a>
        <a href="#worlds"><span>02</span> The two worlds <ArrowUpRight size={16} /></a>
        <a href="#our-story"><span>03</span> The people <ArrowUpRight size={16} /></a>
      </nav>
      <section id="the-place" className="section place-intro">
        <div className="chapter-label"><span className="eyebrow">THE RESERVE AT SANCTUM</span><span className="chapter-number">01 / THE PLACE</span></div>
        <div className="place-composition">
          <h2>A place to arrive.<br /><em>Room to become.</em></h2>
          <div className="place-copy">
            <p>A men’s sanctuary taking shape in Eunice, Louisiana. Where the care of a good salon visit meets a bigger vision for confidence, wellbeing, and community.</p>
            <p>Come for the craft. Find a little room to slow down, connect, and give yourself the attention you deserve.</p>
            <a href="#worlds" className="text-link">Find your place <ArrowUpRight size={18} /></a>
          </div>
        </div>
        <div className="place-footnote"><span>PERSONAL CARE</span><span>SHARED CONNECTION</span><span>LOUISIANA ROOTS</span></div>
      </section>
      <Worlds />
      <section className="reserve-interlude" aria-labelledby="interlude-title">
        <Image src="/images/arrival.webp" alt="Concept architecture framing a Louisiana live oak in warm morning light" fill sizes="100vw" />
        <div className="interlude-copy">
          <p className="eyebrow">A DIFFERENT PACE</p>
          <h2 id="interlude-title">Leave a little<br /><em>of the world outside.</em></h2>
          <p>A thoughtful space. A familiar face.<br />A moment that belongs to you.</p>
        </div>
        <span className="concept-caption">CONCEPT ARCHITECTURE</span>
      </section>
      <section id="our-story" className="section founders-section">
        <div className="chapter-label"><span className="eyebrow">ROOTED IN EUNICE</span><span className="chapter-number">03 / THE PEOPLE</span></div>
        <div className="founders-intro">
          <h2>Two perspectives.<br /><em>A shared belief.</em></h2>
          <p>The Reserve begins with Neil and Katie, and a simple belief: looking after yourself should feel personal. Together, we’re building a place that gives that belief a home.</p>
        </div>
        <div className="founders-grid">
          <article className="founder founder-katie">
            <p className="eyebrow">FIX IT SHOP</p>
            <h3>Katie<span>The craft. The care.</span></h3>
            <p>Katie cares deeply about the people in her chair. Her men’s salon brings personal attention and hands-on craft to The Reserve, with Fix It Shop’s own identity at its heart.</p>
            <Link href="/fix-it-shop" className="text-link">Step into Fix It Shop <ArrowUpRight size={18} /></Link>
          </article>
          <article className="founder founder-neil">
            <p className="eyebrow">AURELIUS COLLECTIVE</p>
            <h3>Neil<span>The vision. The possibility.</span></h3>
            <p>From grooming and products to a wider vision for wellbeing and legacy. Neil brings Aurelius Collective’s belief that caring for yourself can become part of a larger, more intentional life.</p>
            <Link href="/aurelius" className="text-link">Explore the Collective <ArrowUpRight size={18} /></Link>
          </article>
        </div>
      </section>
      <section className="reserve-invitation">
        <p className="eyebrow">FIX IT SHOP × AURELIUS COLLECTIVE</p>
        <h2>There’s room<br /><em>for you here.</em></h2>
        <Link href="/visit" className="button button-gold">Discover the Reserve <ArrowUpRight size={18} /></Link>
        <p className="invitation-location">EUNICE, LOUISIANA</p>
      </section>
    </main>
  );
}
