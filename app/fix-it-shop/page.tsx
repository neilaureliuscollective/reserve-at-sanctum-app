import { fixItPublicBooking as booking } from "@/lib/fix-it-public-booking";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { KatieDirector, KatiePreferencePreview } from "@/components/katie-journey";
import { KatieBookingShortcut } from "@/components/katie-booking-shortcut";
import "./katie-cinema.css";
import "./sanctum-steel.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Katie Guidry · Founder & Owner of Fix It Shop",
  description: "Meet Katie Guidry, founder and owner of Fix It Shop. Explore her approach to men’s hair, published services, and a visit shaped around you.",
};

const chapters = [
  { number: "01 / THE ARRIVAL", title: <>Your time<br /><em>starts here.</em></>, body: "Settle in. Tell Katie where you want to go with your hair, or let her help find the direction. The visit starts with you.", image: "/images/katie/private-chair.webp", alt: "Illustrative concept of an empty private men’s salon chair" },
  { number: "02 / THE WORK", title: <>The difference<br /><em>is in the details.</em></>, body: "Shape, texture and a finish made to work beyond the chair. Katie brings professional care to the cut and attention to the man wearing it.", image: "/images/katie/craft-close.webp", alt: "Illustrative close view of hair cutting, with no identifiable client" },
  { number: "03 / THE RETURN", title: <>Leave ready<br /><em>for what’s next.</em></>, body: "A look that fits your life, and a little more clarity about how to keep it. Come back as yourself; Katie remembers what matters with your permission.", image: "/images/katie/departure.webp", alt: "Illustrative anonymous view of a man leaving a salon chair" },
];

export default function Page() {
  return <main id="main" className="brand-page katie-cinema sanctum-steel">
    <nav className="steel-public-nav" aria-label="Fix It Shop destinations"><Link href="/fix-it-shop/app">FIX IT SHOP</Link><div><a href="#services">Services</a><a href={booking.href}>Appointments on GlossGenius</a><a className="button button-gold" href={booking.href}>{booking.label} <ArrowUpRight size={16}/></a></div></nav>
    <section className="katie-hero" aria-labelledby="katie-title">
      <Image src="/images/katie/private-chair.webp" alt="" fill preload unoptimized sizes="100vw" className="katie-hero__image" />
      <div className="katie-hero__shade" aria-hidden="true" />
      <div className="katie-hero__content">
        <Link href="/fix-it-shop/app" className="katie-back"><ArrowLeft size={15} /> BACK TO FIX IT SHOP</Link>
        <div className="katie-hero__identity"><Image src="/images/cinematic/fix-it-seal.webp" alt="Fix It Shop emblem" width={94} height={94} /><span>FIX IT SHOP<br /><small>MEN’S HAIR & PERSONAL CARE</small></span></div>
        <p className="katie-kicker">FOUNDER & OWNER OF FIX IT SHOP</p>
        <h1 id="katie-title">Katie<br /><em>Guidry.</em></h1>
        <p className="katie-hero__lead">Men’s hair. Personal attention. Her own standard.</p>
        <div className="katie-actions"><a href={booking.href} className="button button-gold">{booking.label}<ArrowUpRight size={17}/></a><a href="#founder" className="katie-link">Meet Katie’s approach <ArrowUpRight size={17}/></a></div><p className="katie-hero-status">Appointments & payments on GlossGenius</p>
        <a href="#experience" className="provider-explore">Explore Katie’s approach ↓</a>
      </div>
      <span className="katie-concept">VISUAL CONCEPT · NOT A PHOTOGRAPH OF THE FINISHED LOCATION</span>
      <span className="katie-hero__rail" aria-hidden="true">SCROLL TO ENTER / 01</span>
    </section>

    <KatieDirector />
    <KatieBookingShortcut href={booking.href} label={booking.label}/>
    <section id="founder" className="katie-founder" aria-labelledby="katie-founder-title"><div className="katie-founder-mark"><Image src="/images/approved/fix-it-shop.webp" alt="Fix It Shop’s gold and sapphire crest" width={480} height={480} sizes="(max-width: 700px) 65vw, 30vw" unoptimized/><span>AN INDEPENDENT BRAND / A PERSONAL STANDARD</span></div><div><p className="katie-kicker">01 / THE WOMAN BEHIND FIX IT SHOP</p><h2 id="katie-founder-title">Her business.<br/><em>Her way of caring.</em></h2><p>Fix It Shop is Katie Guidry’s independent men’s salon brand. As its founder and owner, she sets the standard for the experience: listen to the person, give the details their attention, and make the time feel personal.</p><div className="katie-founder-principles"><span>Listen first.</span><span>Work with care.</span><span>Leave ready.</span></div><Link href="/fix-it-shop/app/founder" className="katie-link">Discover her story <ArrowUpRight size={16}/></Link></div></section>

    <section id="experience" className="katie-film" aria-label="A visit with Katie">
      <div className="katie-film__frame">
        {chapters.map((chapter, index) => <article className={"katie-film__chapter katie-film__chapter--" + (index + 1)} key={chapter.number}>
          <Image src={chapter.image} alt={chapter.alt} fill sizes="100vw" unoptimized />
          <div className="katie-film__veil" aria-hidden="true" />
          <div className="katie-film__copy"><span className="katie-kicker">{chapter.number}</span><h2>{chapter.title}</h2><p>{chapter.body}</p>{index === 1 && <Link href="/chair" className="katie-link">Prepare The Chair <ArrowUpRight size={17} /></Link>}</div>
          <small className="katie-film__caption">ILLUSTRATIVE PROCESS IMAGERY · NOT KATIE OR HER CLIENTS</small>
        </article>)}
        <div className="katie-film__meter" aria-hidden="true"><i /><i /><i /></div>
      </div>
    </section>

    <section id="services" className="katie-services" aria-labelledby="katie-services-title"><header><p className="katie-kicker">03 / A VISIT WITH KATIE</p><h2 id="katie-services-title">Make time<br/><em>for yourself.</em></h2><p>{booking.status}</p></header><a href={booking.href} className="button button-gold">Services & booking on GlossGenius <ArrowUpRight size={16}/></a></section>

    <section id="the-chair" className="katie-preference" aria-labelledby="preference-title">
      <div className="katie-preference__intro"><span className="katie-kicker">04 / YOUR PERSONAL PREPARATION</span><h2 id="preference-title">Your visit.<br /><em>Your terms.</em></h2><p>Some men want to talk. Some want an hour to themselves. Katie makes space for both. The Chair lets you share your preferences before you arrive, and choose what she can remember.</p><Link href="/chair" className="button button-gold">Get my chair ready <ArrowUpRight size={17} /></Link></div>
      <KatiePreferencePreview />
    </section>

    <section id="visit" className="katie-arrival-details" aria-labelledby="visit-title"><div><p className="katie-kicker">05 / PLAN YOUR ARRIVAL</p><h2 id="visit-title">Fix It Shop.<br/><em>Your time with Katie.</em></h2><p>Katie’s independently operated men’s service business. Your service, your professional, your time.</p></div><div className="katie-location-details"><article><h3>Eunice, Louisiana</h3><p>Check the current location and arrival details with your appointment on GlossGenius.</p><a href={booking.href} className="button button-gold">Appointments on GlossGenius <ArrowUpRight size={16}/></a></article></div></section>

    <section className="katie-discretion" aria-labelledby="discretion-title"><span className="katie-kicker">THE WAY KATIE WORKS</span><h2 id="discretion-title">The visit belongs<br /><em>to the person in the chair.</em></h2><p>That is why this page shows a concept of the experience instead of a gallery of clients. The imagery illustrates the setting and process; it does not claim to show Katie, her finished space, or her work.</p></section>

    <nav className="katie-outro" aria-label="Continue exploring"><Link href="/fix-it-shop/app" className="katie-link">Open Fix It Shop <ArrowUpRight size={17} /></Link><Link href="/shop" className="katie-link">Legacy Reserve product collection <ArrowUpRight size={17} /></Link></nav>
  </main>;
}
