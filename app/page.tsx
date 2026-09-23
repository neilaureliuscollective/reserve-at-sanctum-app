import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Arrival } from "@/components/arrival";
import { Worlds } from "@/components/worlds";
import { ReserveCompass } from "@/components/reserve-compass";
import { ReserveScrollDirector } from "@/components/reserve-scroll-director";
import "./reserve-home.css";
import "./reserve-cinema.css";
import "./reserve-rehab.css";

export default function Home() {
  return (
    <main id="main" className="reserve-home reserve-story">
      <Arrival />
      <ReserveScrollDirector />
      <nav className="reserve-chapters" aria-label="Explore the Reserve">
        <a href="#the-place"><span>01</span> The place <ArrowUpRight size={16} /></a>
        <a href="#compass"><span>02</span> Your way in <ArrowUpRight size={16} /></a>
        <a href="#the-people"><span>03</span> The people <ArrowUpRight size={16} /></a>
        <a href="#worlds"><span>04</span> The two worlds <ArrowUpRight size={16} /></a>
      </nav>
      <section id="the-place" className="reserve-story-section reserve-premise" data-scene aria-labelledby="premise-title">
        <div className="story-meta"><span>01 / THE PLACE</span><span>A MEN’S SANCTUARY · EUNICE, LOUISIANA</span></div>
        <div className="premise-heading" data-reveal><h2 id="premise-title">More than<br /><em>the chair.</em></h2><p>A good cut changes how you leave. A place that knows you can change how you come back. That is the bigger picture we are building together.</p></div>
        <div className="premise-threshold" data-reveal>
          <div className="premise-threshold__image" role="img" aria-label="Concept architecture with a gold-lit Louisiana live oak beyond an obsidian and petrol stone arch" />
          <div className="premise-threshold__frame" aria-hidden="true" />
          <div className="premise-threshold__copy"><span>THROUGH THE THRESHOLD</span><p>The conversation.<br />The care.<br /><em>The place you return to.</em></p></div>
          <span className="premise-threshold__credit">CONCEPT IMAGERY · THE RESERVE IS TAKING SHAPE</span>
        </div>
        <p className="story-afterword">It starts with looking after yourself. It grows when you find a place to belong.</p>
      </section>
      <ReserveCompass />
      <section id="the-people" className="reserve-story-section people-story" data-scene aria-labelledby="people-title">
        <div className="story-meta"><span>03 / TWO PERSPECTIVES</span><span>DIFFERENT STRENGTHS · ONE SHARED STANDARD</span></div>
        <div className="people-intro" data-reveal><h2 id="people-title">The craft.<br /><em>The bigger picture.</em></h2><p>Two independent businesses. One belief that caring for a man should go deeper than the appointment.</p></div>
        <div className="people-cards">
          <Link href="/fix-it-shop" className="people-card people-katie" data-reveal><div className="people-image" aria-hidden="true" /><div className="people-copy"><span className="eyebrow">KATIE · FIX IT SHOP</span><h3>Know the man.<br /><em>Then refine the look.</em></h3><p>Katie’s men’s salon is built on attention to the person in her chair. The cut matters. So does the way you feel while you are there.</p><span className="people-link">Step into Fix It Shop <ArrowUpRight size={19} /></span><small>CONCEPT IMAGERY</small></div></Link>
          <Link href="/gent-ascend" className="people-card people-neil" data-reveal><div className="people-image" aria-hidden="true" /><div className="people-copy"><span className="eyebrow">NEIL · GENT ASCEND COLLECTIVE</span><h3>Carry the care<br /><em>into your life.</em></h3><p>Neil’s world brings grooming direction, personal rituals, and a living Blueprint into the time between visits.</p><span className="people-link">Enter GENT Ascend <ArrowUpRight size={19} /></span><small>CONCEPT IMAGERY</small></div></Link>
        </div>
      </section>
      <section className="reserve-union" data-scene aria-labelledby="union-title"><div className="union-architecture" aria-hidden="true"><span /><span /><span /></div><div className="union-content" data-reveal><p className="eyebrow">FIX IT SHOP × GENT ASCEND COLLECTIVE</p><h2 id="union-title">Separate strengths.<br /><em>One Reserve.</em></h2><p>Katie brings the craft and personal care of the chair. Neil brings the rituals and direction that carry forward. Together, we are giving those experiences a home in Eunice.</p><span>THE RESERVE AT SANCTUM · EUNICE, LOUISIANA</span></div></section>
      <Worlds />
      <section id="beyond" className="reserve-story-section visit-story" data-scene aria-labelledby="visit-title"><div className="story-meta"><span>05 / BEYOND THE VISIT</span><span>CARE THAT CARRIES FORWARD</span></div><div className="visit-layout"><div data-reveal><p className="eyebrow">THE RESERVE IS TAKING SHAPE</p><h2 id="visit-title">The visit ends.<br /><em>The care carries on.</em></h2><p>A thoughtful appointment is the beginning. Your preferences, your grooming direction, and the people who get to know you can make the next one even better.</p><div className="story-actions"><Link href="/chair" className="button button-gold">Explore Katie’s Chair <ArrowUpRight size={17} /></Link><Link href="/sanctum-mirror" className="text-link">Discover the Sanctum Mirror <ArrowUpRight size={17} /></Link></div></div><div className="visit-panel" data-reveal><span>YOUR NEXT CHAPTER</span><h3>Less starting over.<br />More moving forward.</h3><ul><li>Your preferences, with your permission</li><li>Your grooming priorities and Blueprint</li><li>One place to revisit your journey</li></ul><Link href="/my-sanctum">Open My Sanctum <ArrowUpRight size={17} /></Link></div></div></section>
      <section className="community-story" data-scene aria-labelledby="community-title"><div className="community-scene" role="img" aria-label="Concept image of an inland Louisiana town street in warm evening light" /><div className="community-copy" data-reveal><p className="eyebrow">ROOTED HERE · OPEN TO WHAT COMES NEXT</p><h2 id="community-title">You’ve got<br /><em>things to build.</em></h2><p>Men need places to show up, take care of themselves, and be part of something. The Reserve begins with grooming and a shared space. Community and wellness are part of the vision we are building toward.</p><span>CONCEPT IMAGERY · NOT A PHOTOGRAPH OF THE RESERVE OR EUNICE</span></div></section>
      <section id="eunice" className="reserve-story-section eunice-story" data-scene aria-labelledby="eunice-title"><div className="story-meta"><span>06 / OUR HOME</span><span>GROUNDED IN LOUISIANA</span></div><div data-reveal><h2 id="eunice-title">Eunice.<br /><em>Louisiana.</em></h2><p>Built from the character of a real place and the care of real people. This is where Katie and Neil are bringing their separate strengths together.</p></div><div className="eunice-facts"><span>LOCAL ROOTS</span><span>TWO INDEPENDENT BUSINESSES</span><span>ONE SHARED RESERVE</span></div></section>
      <section id="begin" className="reserve-story-section begin-story" data-scene aria-labelledby="begin-title"><div className="story-meta"><span>07 / YOUR FIRST STEP</span><span>THERE IS NO ONE WAY TO BEGIN</span></div><h2 id="begin-title" data-reveal>Where do<br /><em>you begin?</em></h2><div className="begin-grid"><Link href="/fix-it-shop" className="begin-card" data-reveal><span>01</span><h3>Enter the Shop</h3><p>Meet Katie, explore the care behind the cut, and make room for a better visit.</p><strong>Meet Fix It Shop <ArrowUpRight size={18} /></strong></Link><Link href="/gent-ascend" className="begin-card" data-reveal><span>02</span><h3>Enter Sanctum</h3><p>Find your grooming direction with Neil’s living Blueprint and a ritual built around you.</p><strong>Explore GENT Ascend <ArrowUpRight size={18} /></strong></Link><Link href="/visit" className="begin-card" data-reveal><span>03</span><h3>Join the Reserve</h3><p>See what is taking shape in Eunice and how these two independent worlds come together.</p><strong>Discover the place <ArrowUpRight size={18} /></strong></Link></div></section>
    </main>
  );
}
