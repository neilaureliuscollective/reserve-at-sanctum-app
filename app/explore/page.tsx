import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Arrival } from "@/components/arrival";
import { JourneyDirector, ReserveWay } from "@/components/reserve-journey";
import { ReserveProductGallery } from "@/components/reserve-product-gallery";
import "../reserve-home.css";
import "../reserve-cinema-v2.css";

export default function Home() {
  return <main id="main" className="reserve-home reserve-story reserve-cinema-v2">
    <Arrival />
    <JourneyDirector />

    <section id="the-place" className="film-stage film-threshold" data-film-stage="threshold" aria-labelledby="threshold-title">
      <div className="film-frame">
        <div className="film-threshold__outside" aria-hidden="true"><Image src="/images/reserve-threshold.webp" alt="" fill sizes="100vw" /></div>
        <div className="film-threshold__inside" aria-hidden="true"><Image src="/images/cinematic/reserve-hall.webp" alt="" fill sizes="100vw" /></div>
        <div className="film-threshold__door" aria-hidden="true"><i /><i /></div>
        <div className="film-threshold__copy"><span className="film-index">01 / THE THRESHOLD · EUNICE, LOUISIANA</span><h2 id="threshold-title">Leave the noise<br /><em>at the door.</em></h2><p>There is a different pace inside. Time to be known, to take care of yourself, and to leave with a clearer sense of where you are going.</p><a className="film-link" href="#worlds">Step further in <ArrowUpRight size={18} /></a></div>
        <div className="film-threshold__arrival"><span>THE RESERVE AT SANCTUM</span><p>Two independent worlds.<br />One place to return to.</p></div>
        <small className="film-concept">CONCEPT ENVIRONMENT · THE RESERVE IS TAKING SHAPE</small>
      </div>
    </section>

    <section id="worlds" className="film-stage film-encounter" data-film-stage="encounter" aria-label="Meet the people and their worlds">
      <div className="film-frame">
        <div className="film-encounter__hall" aria-hidden="true"><Image src="/images/cinematic/reserve-hall.webp" alt="" fill sizes="100vw" /></div>
        <div className="film-encounter__room film-encounter__room--craft" aria-hidden="true"><Image src="/images/reserve-craft.webp" alt="" fill sizes="100vw" /></div>
        <div className="film-encounter__room film-encounter__room--ritual" aria-hidden="true"><Image src="/images/reserve-ritual.webp" alt="" fill sizes="100vw" /></div>
        <div className="film-encounter__portal" aria-hidden="true"><i /><i /></div>
        <div className="film-encounter__intro"><span className="film-index">02 / THE PEOPLE</span><h2>The place comes<br /><em>to life through them.</em></h2><p>Katie and Neil bring separate strengths into one shared Reserve.</p></div>
        <article className="film-encounter__story film-encounter__story--craft" aria-labelledby="craft-title"><Image src="/images/cinematic/fix-it-seal.webp" width={112} height={112} sizes="112px" alt="Fix It Shop emblem" /><span className="film-index">KATIE GUIDRY · FIX IT SHOP</span><h3 id="craft-title">Care you can<br /><em>feel in the chair.</em></h3><p>Katie brings the attention and craft of a men’s salon professional. The cut matters. So does the person who returns.</p><Link className="film-link" href="/fix-it-shop">Enter Fix It Shop <ArrowUpRight size={18} /></Link></article>
        <article className="film-encounter__story film-encounter__story--ritual" aria-labelledby="ritual-title"><Image src="/images/cinematic/gent-ascend-seal.webp" width={112} height={112} sizes="112px" alt="Gent Ascend Collective emblem" /><span className="film-index">NEIL STUTES · GENT ASCEND COLLECTIVE</span><h3 id="ritual-title">A ritual that<br /><em>travels with you.</em></h3><p>Neil brings grooming direction and considered products into the time between visits.</p><Link className="film-link" href="/gent-ascend">Enter Gent Ascend <ArrowUpRight size={18} /></Link></article>
        <small className="film-concept">CONCEPT ENVIRONMENT · NOT A PHOTOGRAPH OF KATIE OR NEIL</small>
      </div>
    </section>

    <ReserveWay />

    <section id="the-collection" className="film-stage film-collection" data-film-stage="collection" aria-labelledby="collection-title">
      <div className="film-frame"><div className="film-collection__environment" aria-hidden="true"><Image src="/images/cinematic/reserve-product-chamber.webp" alt="" fill sizes="100vw" /></div><div className="film-collection__heading"><span className="film-index">04 / WHAT YOU CARRY · LEGACY RESERVE</span><h2 id="collection-title">The care<br /><em>continues.</em></h2></div><ReserveProductGallery /><small className="film-concept">CONCEPT ENVIRONMENT · PRODUCT PACKAGING PREVIEW</small></div>
    </section>

    <section id="eunice" className="film-stage film-home" data-film-stage="home" aria-labelledby="eunice-title"><div className="film-frame"><div className="film-home__image" aria-hidden="true"><Image src="/images/reserve-eunice-concept.webp" alt="" fill sizes="100vw" /></div><div className="film-home__arch" aria-hidden="true" /><div className="film-home__copy"><span className="film-index">05 / OUR HOME · EUNICE, LOUISIANA</span><h2 id="eunice-title">Rooted here.<br /><em>Growing forward.</em></h2><p>Katie and Neil are bringing their separate strengths together in Eunice. The Reserve begins with personal care and a shared place; community and wellness are part of the vision growing from it.</p><div className="film-home__actions"><Link href="/visit" className="button button-gold">Discover the place <ArrowUpRight size={17} /></Link><Link href="/book" className="film-link">Explore visits <ArrowUpRight size={18} /></Link></div></div><small className="film-concept">CONCEPT IMAGERY · NOT A PHOTOGRAPH OF THE RESERVE OR EUNICE</small></div></section>
  </main>;
}
