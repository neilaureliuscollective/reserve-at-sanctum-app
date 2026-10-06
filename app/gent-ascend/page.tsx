import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { GentDirector, GentCollection } from "@/components/gent-world-journey";
import "./gent-cinema.css";

export const metadata = {
  title: "GENT Ascend Collective · Legacy Reserve",
  description: "Enter Neil's grooming world at Legacy Reserve — Eunice: considered consultation, The Mirror, and the Legacy Reserve collection preview.",
};

const scenes = [
  { number: "01 / THE MIRROR", title: <>Look closer.<br /><em>Choose a direction.</em></>, body: "Start with what matters to you: hair, beard, skin, and the time you are willing to give them. The Mirror turns those priorities into a first Grooming Blueprint.", image: "/images/neil/mirror-desk.webp", alt: "Concept of a private grooming consultation desk and mirror" },
  { number: "02 / THE CONVERSATION", title: <>Make it yours.<br /><em>Make it workable.</em></>, body: "Neil brings grooming direction into the room. The right approach has to fit your day, your maintenance rhythm, and the man you are working to become.", image: "/images/neil/consultation-room.webp", alt: "Concept of a green and gold private consultation room" },
  { number: "03 / THE RITUAL", title: <>Take the work<br /><em>with you.</em></>, body: "A better routine continues after the visit. Considered products and repeatable habits help carry your direction into ordinary mornings.", image: "/images/reserve-ritual.webp", alt: "Illustrative concept of grooming tools and a daily ritual" },
];

export default function Page() {
  return <main id="main" className="gent-cinema">
    <section className="gent-gateway" aria-labelledby="gent-title">
      <Image src="/images/neil/consultation-room.webp" alt="" fill priority sizes="100vw" className="gent-gateway__art" />
      <div className="gent-gateway__shade" aria-hidden="true" />
      <div className="gent-gateway__copy">
        <Link href="/home" className="gent-back"><ArrowLeft size={15} /> LEGACY RESERVE</Link>
        <span className="gent-kicker">NEIL STUTES · GROOMING DIRECTION · EUNICE, LOUISIANA</span>
        <h1 id="gent-title">Know your direction.<br /><em>Carry it daily.</em></h1>
        <p>GENT Ascend connects a private conversation, a personal grooming Blueprint, and the rituals that continue beyond the room.</p>
        <div className="gent-gateway__actions"><Link href="/mirror" className="button button-gold">Begin the Mirror <ArrowUpRight size={17} /></Link><Link prefetch={false} href="/profile" className="gent-link">Your saved direction <ArrowUpRight size={17} /></Link></div>
        <a href="#the-journey" className="provider-explore">Explore Neil’s approach ↓</a>
      </div>
      <div className="gent-gateway__seal"><Image src="/images/cinematic/gent-ascend-seal.webp" alt="GENT Ascend Collective emblem" fill sizes="(max-width: 650px) 44vw, 30vw" /></div>
      <small className="gent-gateway__concept">CONCEPT ENVIRONMENT · NOT A PHOTOGRAPH OF THE FINISHED LOCATION</small>
    </section>

    <GentDirector />

    <section id="the-journey" className="gent-film" aria-label="The GENT Ascend journey">
      <div className="gent-film__frame">
        {scenes.map((scene, index) => <article key={scene.number} className={"gent-film__scene gent-film__scene--" + (index + 1)}>
          <Image src={scene.image} alt={scene.alt} fill sizes="100vw" />
          <div className="gent-film__shade" aria-hidden="true" />
          <div className="gent-film__copy"><span className="gent-kicker">{scene.number}</span><h2>{scene.title}</h2><p>{scene.body}</p>{index === 0 && <Link href="/mirror" className="gent-link">Enter the Mirror <ArrowUpRight size={17} /></Link>}</div>
          <small className="gent-film__concept">ILLUSTRATIVE CONCEPT · NOT AN ACTUAL CLIENT OR LOCATION</small>
        </article>)}
        <div className="gent-film__portal" aria-hidden="true"><i /><i /></div>
        <div className="gent-film__progress" aria-hidden="true"><i /><i /><i /></div>
      </div>
    </section>

    <section id="mirror" className="gent-blueprint" aria-labelledby="blueprint-title">
      <div className="gent-blueprint__visual" aria-hidden="true"><span className="gent-blueprint__arc" /><span className="gent-blueprint__line" /><span className="gent-blueprint__point gent-blueprint__point--one" /><span className="gent-blueprint__point gent-blueprint__point--two" /><span className="gent-blueprint__point gent-blueprint__point--three" /><div className="gent-blueprint__words"><span>HAIR</span><span>BEARD</span><span>SKIN</span><span>RITUAL</span></div></div>
      <div className="gent-blueprint__copy"><span className="gent-kicker">04 / THE MIRROR</span><h2 id="blueprint-title">A starting point<br /><em>that belongs to you.</em></h2><p>Use your stated priorities to make a first grooming Blueprint. No photographs are taken, retained, or analyzed. You choose whether to save the profile to your Legacy Reserve account.</p><Link href="/mirror" className="button button-gold">Build my Blueprint <ArrowUpRight size={17} /></Link></div>
    </section>

    <section id="collection" className="gent-collection" aria-labelledby="collection-title">
      <Image src="/images/neil/ritual-plinth.webp" alt="" fill sizes="100vw" className="gent-collection__environment" />
      <div className="gent-collection__shade" aria-hidden="true" />
      <div className="gent-collection__heading"><span className="gent-kicker">05 / LEGACY RESERVE · COLLECTION PREVIEW</span><h2 id="collection-title">The ritual<br /><em>travels with you.</em></h2></div>
      <GentCollection />
      <small className="gent-collection__concept">CONCEPT ENVIRONMENT · SUPPLIED PRODUCT PACKAGING MOCKUPS</small>
    </section>

    <section id="return" className="gent-return" aria-labelledby="return-title"><span className="gent-kicker">GENT ASCEND COLLECTIVE × LEGACY RESERVE</span><h2 id="return-title">The direction is personal.<br /><em>The place is shared.</em></h2><p>Begin with your Blueprint, then come into Legacy Reserve to explore how grooming direction, Katie’s craft, and the wider vision meet in Eunice — the first house.</p><div><Link href="/mirror" className="button button-gold">Begin the Mirror <ArrowUpRight size={17} /></Link><Link href="/visit" className="gent-link">Discover the house <ArrowUpRight size={17} /></Link></div></section>
  </main>;
}
