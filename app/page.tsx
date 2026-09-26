import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Arrival } from "@/components/arrival";
import { JourneyDirector, ReserveWay } from "@/components/reserve-journey";
import { ReserveProductGallery } from "@/components/reserve-product-gallery";
import "./reserve-home.css";
import "./reserve-journey.css";

export default function Home() {
  return <main id="main" className="reserve-home reserve-story reserve-journey">
    <Arrival />
    <JourneyDirector />
    <section id="the-place" className="journey-threshold journey-scene" data-journey-scene aria-labelledby="threshold-title">
      <div className="journey-threshold__world" aria-hidden="true"><Image src="/images/reserve-threshold.webp" alt="" fill sizes="100vw" /></div>
      <div className="journey-threshold__near" aria-hidden="true" />
      <div className="journey-threshold__content">
        <p className="journey-index">01 / THE THRESHOLD <span>EUNICE, LOUISIANA</span></p>
        <h2 id="threshold-title">Leave the noise<br /><em>at the door.</em></h2>
        <p>There is a different pace inside. Time to be known, to take care of yourself, and to leave with a clearer sense of where you are going.</p>
        <a href="#worlds" className="journey-text-link">Step further in <ArrowUpRight size={19} /></a>
        <small>CONCEPT ENVIRONMENT · THE RESERVE IS TAKING SHAPE</small>
      </div>
    </section>
    <section id="worlds" className="journey-encounter journey-scene" data-journey-scene aria-labelledby="encounter-title">
      <div className="journey-encounter__opening">
        <p className="journey-index">02 / THE PEOPLE <span>TWO STRENGTHS · ONE PLACE</span></p>
        <h2 id="encounter-title">The person matters<br /><em>as much as the craft.</em></h2>
        <p>Fix It Shop and Gent Ascend Collective meet at the Reserve. Each has its own identity. Together, they give this place its purpose.</p>
      </div>
      <article className="journey-person journey-person--katie" aria-labelledby="katie-title">
        <div className="journey-person__scene" aria-hidden="true"><Image src="/images/reserve-craft.webp" alt="" fill sizes="100vw" /></div>
        <div className="journey-person__shade" aria-hidden="true" />
        <div className="journey-person__mark"><Image src="/images/approved/fix-it-shop.webp" alt="Fix It Shop official emblem" width={360} height={360} sizes="(max-width: 760px) 150px, 300px" /></div>
        <div className="journey-person__copy"><span>01 / KATIE GUIDRY · FIX IT SHOP</span><h3 id="katie-title">Care you can<br /><em>feel in the chair.</em></h3><p>Katie brings the attention and craft of a men’s salon professional. The cut matters. So does the person who returns.</p><Link href="/fix-it-shop" className="journey-text-link">Enter Fix It Shop <ArrowUpRight size={19} /></Link></div>
        <small>CONCEPT ENVIRONMENT</small>
      </article>
      <article className="journey-person journey-person--neil" aria-labelledby="neil-title">
        <div className="journey-person__scene" aria-hidden="true"><Image src="/images/reserve-ritual.webp" alt="" fill sizes="100vw" /></div>
        <div className="journey-person__shade" aria-hidden="true" />
        <div className="journey-person__mark"><Image src="/images/approved/gent-ascend-collective.webp" alt="Gent Ascend Collective official emblem" width={360} height={360} sizes="(max-width: 760px) 150px, 300px" /></div>
        <div className="journey-person__copy"><span>02 / NEIL STUTES · GENT ASCEND COLLECTIVE</span><h3 id="neil-title">A ritual that<br /><em>travels with you.</em></h3><p>Neil brings grooming direction and considered products into the time between visits. The experience extends beyond the room.</p><Link href="/gent-ascend" className="journey-text-link">Enter Gent Ascend <ArrowUpRight size={19} /></Link></div>
        <small>CONCEPT ENVIRONMENT</small>
      </article>
    </section>
    <ReserveWay />
    <section id="the-collection" className="journey-collection journey-scene" data-journey-scene aria-labelledby="collection-title">
      <div className="journey-collection__intro"><p className="journey-index">04 / WHAT YOU CARRY <span>LEGACY RESERVE</span></p><h2 id="collection-title">The care<br /><em>continues.</em></h2><p>Objects made for the everyday rituals that follow you home. A first look at the Legacy Reserve collection.</p></div>
      <ReserveProductGallery />
    </section>
    <section id="eunice" className="journey-home journey-scene" data-journey-scene aria-labelledby="eunice-title">
      <div className="journey-home__image" aria-hidden="true"><Image src="/images/reserve-eunice-concept.webp" alt="" fill sizes="100vw" /></div>
      <div className="journey-home__copy"><p className="journey-index">05 / OUR HOME <span>ROOTED IN LOUISIANA</span></p><h2 id="eunice-title">Eunice is<br /><em>where it begins.</em></h2><p>Katie and Neil are bringing their separate strengths together here. The Reserve begins with personal care and a shared place; community and wellness are part of the vision growing from it.</p><div className="journey-home__actions"><Link href="/visit" className="button button-gold">Discover the place <ArrowUpRight size={17} /></Link><Link href="/book" className="journey-text-link">Explore visits <ArrowUpRight size={19} /></Link></div><small>CONCEPT IMAGERY · NOT A PHOTOGRAPH OF THE RESERVE OR EUNICE</small></div>
    </section>
  </main>;
}
