import { VisitContext } from "@/components/experience/visit-context";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { KatieDirector, KatiePreferencePreview } from "@/components/katie-journey";
import "./katie-cinema.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Fix It Shop · Katie Guidry",
  description: "Step into Katie Guidry’s private men’s salon experience at Legacy Reserve — Eunice. Explore her approach, prepare The Chair, and find your visit.",
};

const chapters = [
  { number: "01 / THE ARRIVAL", title: <>Your time<br /><em>starts here.</em></>, body: "Settle in. Tell Katie where you want to go with your hair, or let her help find the direction. The visit starts with you.", image: "/images/katie/private-chair.webp", alt: "Illustrative concept of an empty private men’s salon chair" },
  { number: "02 / THE WORK", title: <>The difference<br /><em>is in the details.</em></>, body: "Shape, texture and a finish made to work beyond the chair. Katie brings professional care to the cut and attention to the man wearing it.", image: "/images/katie/craft-close.webp", alt: "Illustrative close view of hair cutting, with no identifiable client" },
  { number: "03 / THE RETURN", title: <>Leave ready<br /><em>for what’s next.</em></>, body: "A look that fits your life, and a little more clarity about how to keep it. Come back as yourself; Katie remembers what matters with your permission.", image: "/images/katie/departure.webp", alt: "Illustrative anonymous view of a man leaving a salon chair" },
];

export default async function Page() {
  return <main id="main" className="brand-page katie-cinema">
    <section className="katie-hero" aria-labelledby="katie-title">
      <Image src="/images/katie/private-chair.webp" alt="" fill priority sizes="100vw" className="katie-hero__image" />
      <div className="katie-hero__shade" aria-hidden="true" />
      <div className="katie-hero__content">
        <Link href="/home" className="katie-back"><ArrowLeft size={15} /> LEGACY RESERVE</Link>
        <div className="katie-hero__identity"><Image src="/images/cinematic/fix-it-seal.webp" alt="Fix It Shop emblem" width={94} height={94} /><span>FIX IT SHOP<br /><small>KATIE GUIDRY · MEN’S SALON</small></span></div>
        <p className="katie-kicker">A WORLD WITHIN LEGACY RESERVE — EUNICE</p>
        <h1 id="katie-title">It’s Never<br /><em>Just a Haircut.</em></h1>
        <p className="katie-hero__lead">A visit built around how you want to look, how you want to spend the time, and the life waiting when you leave.</p>
        <div className="katie-actions"><Link href="/chair" className="button button-gold">Get your chair ready <ArrowUpRight size={17} /></Link><Link href="/book" className="katie-link">Explore visits <ArrowUpRight size={17} /></Link></div>
        <VisitContext providerId="katie" compact />
        <a href="#experience" className="provider-explore">Explore Katie’s approach ↓</a>
      </div>
      <span className="katie-concept">VISUAL CONCEPT · NOT A PHOTOGRAPH OF THE FINISHED LOCATION</span>
      <span className="katie-hero__rail" aria-hidden="true">SCROLL TO ENTER / 01</span>
    </section>

    <KatieDirector />

    <section id="experience" className="katie-film" aria-label="A visit with Katie">
      <div className="katie-film__frame">
        {chapters.map((chapter, index) => <article className={"katie-film__chapter katie-film__chapter--" + (index + 1)} key={chapter.number}>
          <Image src={chapter.image} alt={chapter.alt} fill sizes="100vw" />
          <div className="katie-film__veil" aria-hidden="true" />
          <div className="katie-film__copy"><span className="katie-kicker">{chapter.number}</span><h2>{chapter.title}</h2><p>{chapter.body}</p>{index === 1 && <Link href="/chair" className="katie-link">Prepare The Chair <ArrowUpRight size={17} /></Link>}</div>
          <small className="katie-film__caption">ILLUSTRATIVE PROCESS IMAGERY · NOT KATIE OR HER CLIENTS</small>
        </article>)}
        <div className="katie-film__meter" aria-hidden="true"><i /><i /><i /></div>
      </div>
    </section>

    <section id="the-chair" className="katie-preference" aria-labelledby="preference-title">
      <div className="katie-preference__intro"><span className="katie-kicker">04 / THE CHAIR</span><h2 id="preference-title">Your visit.<br /><em>Your terms.</em></h2><p>Some men want to talk. Some want an hour to themselves. Katie makes space for both. The Chair lets you share your preferences before you arrive, and choose what she can remember.</p><Link href="/chair" className="button button-gold">Get my chair ready <ArrowUpRight size={17} /></Link></div>
      <KatiePreferencePreview />
    </section>

    <section id="visit" className="katie-visit" aria-labelledby="visit-title">
      <div className="katie-visit__image"><Image src="/images/fix-it.webp" alt="Illustrative concept of a private men’s salon suite" fill sizes="(max-width: 760px) 100vw, 50vw" /></div>
      <div className="katie-visit__copy"><span className="katie-kicker">05 / FIND YOUR VISIT</span><h2 id="visit-title">Good work.<br /><em>Good company.</em></h2><p>Katie’s world begins with men’s hair and personal attention. Tell her the direction you have in mind, or arrive ready to find one together.</p><div className="katie-visit__facts"><span>MEN’S HAIR</span><span>PERSONAL CONSULTATION</span><span>A FINISH FOR EVERYDAY LIFE</span></div><Link href="/book" className="button button-gold">Explore booking <ArrowUpRight size={17} /></Link><p className="katie-visit__status">Private preview: the current booking menu and prices are illustrative. Katie’s approved services will appear before booking opens.</p></div>
    </section>

    <section className="katie-discretion" aria-labelledby="discretion-title"><span className="katie-kicker">THE WAY KATIE WORKS</span><h2 id="discretion-title">The visit belongs<br /><em>to the person in the chair.</em></h2><p>That is why this page shows a concept of the experience instead of a gallery of clients. The imagery illustrates the setting and process; it does not claim to show Katie, her finished space, or her work.</p></section>

    <nav className="katie-outro" aria-label="Continue exploring"><Link href="/home" className="katie-link">Return to the Reserve <ArrowUpRight size={17} /></Link><Link href="/gent-ascend" className="katie-link">Explore Neil’s world <ArrowUpRight size={17} /></Link></nav>
  </main>;
}
