import { fixItCustomerAppHref } from "@/lib/fix-it-customer-app";
import { hasCapability } from "@/lib/studio-permissions";
import { publicUser } from "@/lib/auth";
import { katieBranding } from "@/lib/katie-branding";
import { brandAsset } from "@/lib/provider-brand-display";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ArrowDown } from "lucide-react";
import { fixItPublicBooking as booking } from "@/lib/fix-it-public-booking";
import { FixItVisitFilm, FixItAtmosphere } from "@/components/fix-it-home-scenes";
import { isPreview } from "@/lib/db";
import { fixItBooking as brand } from "@/lib/fix-it-booking";
import "./home.css";


export const dynamic = "force-dynamic";
export default async function Page() {
  const [profile, actor] = await Promise.all([katieBranding(), publicUser()]);
  const cover = profile.cover ? brandAsset(profile.cover) : "/images/katie/private-chair.webp";
  return <main id="main" className="fix-it-home">
    {isPreview() && <p className="fis-preview" role="note">Development preview · services, prices and accounts are illustrative.</p>}
    <section className="fis-entrance" aria-labelledby="fis-title">
      <div className="fis-entrance__environment"><Image src={cover} alt="" fill preload sizes="(max-width: 700px) 100vw, 62vw" unoptimized={Boolean(profile.cover)} /><div className="fis-entrance__shade" /></div>
      <div className="fis-entrance__copy">
        <p className="fis-kicker">KATIE GUIDRY’S INDEPENDENT MEN’S SALON</p>
        <h1 id="fis-title">A little time.<br /><em>A lot of care.</em></h1>
        <p className="fis-lead">More than a place in your calendar. A visit with Katie, shaped around the person in her chair.</p>
        <div className="fis-actions"><a className="button button-gold" href={booking.href} aria-label="Book now with Katie on GlossGenius">Book now with Katie<ArrowUpRight size={17} /></a><a className="fis-link" href="#services">Explore services <ArrowDown size={15} /></a></div>
        <div className="fis-entrance__signature"><span>FIX IT SHOP</span><span>HER BUSINESS. HER STANDARD.</span></div>
      </div>
      <div className="fis-entrance__bottom"><a href="#katie">Step inside <ArrowDown size={15} /></a><small>{profile.cover ? "FIX IT SHOP" : "ILLUSTRATIVE SETTING · NOT THE FINISHED LOCATION"}</small></div>
    </section>
    {actor?.provider_id === "katie" && hasCapability(actor, "studio.read") && <div className="fis-account"><section className="fix-it-next"><div><p className="eyebrow">YOUR PRIVATE FIX IT SHOP STUDIO</p><h2>Your working day, ready.</h2><p>Open your calendar, client history, and availability.</p></div><Link className="button button-gold" href="/studio/today">Open my Studio ↗</Link></section></div>}
    <section id="katie" className="fis-brand-story fis-wrap" aria-labelledby="fis-founder-title">
      <div className="fis-brand-story__material"><span className="fis-brand-story__index">01 / A PERSONAL STANDARD</span><Image src="/fix-it-shop-app/identity/hero-emblem-560.webp" alt="Fix It Shop’s approved emblem" width={560} height={560} sizes="(max-width: 700px) 75vw, 35vw"/><span className="fis-brand-story__inscription">HER BUSINESS. HER STANDARD.</span></div>
      <div className="fis-brand-story__copy"><p className="fis-kicker">THE WOMAN BEHIND THE STANDARD</p><h2 id="fis-founder-title">Personal care.<br/><em>By Katie.</em></h2><p className="fis-brand-story__intro">A higher standard begins with the person behind it.</p><p>Katie Guidry. Founder and owner, Marine veteran and cosmetologist. A treasured family book. A meaningful name. A personal approach to the care that goes into every visit.</p><a className="fis-link" href="/fix-it-shop/app/founder">Discover her story <ArrowUpRight size={18}/></a></div>
    </section>
    <section className="fis-standard fis-wrap" aria-label="Katie’s approach"><p className="fis-kicker">THE CARE BEHIND THE VISIT</p><div>{[
      ["01", "Listen first.", "A direction begins with you. What you like, what you would change, and how your hair fits into your life."],
      ["02", "Work with care.", "Attention to shape, texture and the details that make a look feel considered."],
      ["03", "Leave ready.", "A finish to take into your day, with a conversation about keeping it your own."],
    ].map(([number, title, body]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{body}</p></article>)}</div></section>
    <FixItVisitFilm />
    <section id="services" className="fis-services" aria-labelledby="menu-title">
      <div className="fis-wrap"><header><div><p className="fis-kicker">03 / MAKE TIME FOR YOURSELF</p><h2 id="menu-title">Your visit.<br /><em>With Katie.</em></h2></div><p>{booking.status}</p></header>
      <a className="button button-gold" href={booking.href}>Services & booking on GlossGenius <ArrowUpRight size={17} /></a></div>
    </section>
    <section className="fis-personal fis-wrap" aria-labelledby="fis-personal-title"><div><p className="fis-kicker">04 / ROOM TO BE YOURSELF</p><h2 id="fis-personal-title">Your time.<br /><em>Your pace.</em></h2><p>A conversation, a quiet moment, or a little of both. Explore how you would like your visit to feel.</p><p>The optional Visit guide includes a consultation card kept on this device. No account is needed, and the card is not sent to Katie.</p><a href={fixItCustomerAppHref + "#card"} className="fis-link">Prepare my consultation card <ArrowUpRight size={16} /></a></div><FixItAtmosphere /></section>
    <section className="fis-return" aria-labelledby="fis-return-title"><div className="fis-return__scene"><Image src="/images/katie/departure.webp" alt="Illustrative salon departure, not a photograph of Katie’s client or work" fill sizes="100vw" /></div><div className="fis-wrap fis-return__copy"><p className="fis-kicker">05 / UNTIL NEXT TIME</p><h2 id="fis-return-title">Your chair.<br /><em>One tap away.</em></h2><p>Book or manage your appointment on GlossGenius, or keep the Fix It Shop website on your phone.</p><div className="fis-actions"><a className="button button-gold" href={booking.href}>Appointments on GlossGenius <ArrowUpRight size={17} /></a><a className="fis-link" href={fixItCustomerAppHref + "#guide"}>Explore the Visit guide <ArrowUpRight size={16} /></a></div><small>ILLUSTRATIVE PROCESS IMAGERY · NOT KATIE OR HER CLIENTS</small></div></section>
  </main>;
}
