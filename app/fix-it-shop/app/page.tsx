import { hasCapability } from "@/lib/studio-permissions";
import { publicUser } from "@/lib/auth";
import { katieBranding } from "@/lib/katie-branding";
import { brandAsset } from "@/lib/provider-brand-display";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ArrowDown } from "lucide-react";
import { FixItNextVisit } from "@/components/fix-it-customer";
import { FixItVisitFilm, FixItAtmosphere } from "@/components/fix-it-home-scenes";
import { configured, database, isPreview } from "@/lib/db";
import { memberRead } from "@/lib/experience/member";
import { sanctumDirectory } from "@/lib/experience/sanctum-directory";
import { katieNativeBooking } from "@/lib/katie-launch";
import { FixItBookingFallback } from "@/components/fix-it-booking-fallback";
import { katieVisitPresentation } from "@/lib/experience/katie-world";
import { fixItBooking as brand } from "@/lib/fix-it-booking";
import "./home.css";
import { FounderFeature } from "@/components/founder-feature";

import { fixItSearchMetadata } from "@/lib/fix-it-search";
export const metadata = { ...fixItSearchMetadata("/fix-it-shop/app"), title: "Fix It Shop · Katie Guidry", description: "Katie Guidry’s independent men’s salon. Explore Fix It Shop and find the current booking calendar." };

export const dynamic = "force-dynamic";
export default async function Page() {
  const [profile, actor] = await Promise.all([katieBranding(), publicUser()]);
  const directory = configured() ? await memberRead(async () => sanctumDirectory(await database()), 2500) : { state: "ready" as const, data: [] };
  const visit = katieVisitPresentation(directory.data ?? [], directory.state === "unavailable", katieNativeBooking());
  const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
  const cover = profile.cover ? brandAsset(profile.cover) : "/images/katie/private-chair.webp";
  return <main id="main" className="fix-it-home">
    {isPreview() && <p className="fis-preview" role="note">Development preview · services, prices and accounts are illustrative.</p>}
    <section className="fis-entrance" aria-labelledby="fis-title">
      <div className="fis-entrance__environment"><Image src={cover} alt="" fill preload sizes="100vw" unoptimized={Boolean(profile.cover)} /><div className="fis-entrance__shade" /></div>
      <div className="fis-entrance__copy">
        <p className="fis-kicker">KATIE GUIDRY’S INDEPENDENT MEN’S SALON</p>
        <h1 id="fis-title">A little time.<br /><em>A lot of care.</em></h1>
        <p className="fis-lead">More than a place in your calendar. A visit with Katie, shaped around the person in her chair.</p>
        <div className="fis-actions"><Link className="button button-gold" href={visit.primary.href}>{visit.primary.label}<ArrowUpRight size={17} /></Link><a className="fis-link" href="#services">Explore services <ArrowDown size={15} /></a></div>
        <div className="fis-entrance__signature"><span>FIX IT SHOP</span><span>HER BUSINESS. HER STANDARD.</span></div>
      </div>
      <div className="fis-entrance__bottom"><a href="#katie">Step inside <ArrowDown size={15} /></a><small>{profile.cover ? "FIX IT SHOP" : "ILLUSTRATIVE SETTING · NOT THE FINISHED LOCATION"}</small></div>
    </section>
    {actor && <div className="fis-account">{actor.provider_id === "katie" && hasCapability(actor, "studio.read") ? <section className="fix-it-next"><div><p className="eyebrow">YOUR PRIVATE FIX IT SHOP STUDIO</p><h2>Your working day, ready.</h2><p>Open your calendar, client history, and availability.</p></div><Link className="button button-gold" href="/studio/today">Open my Studio ↗</Link></section> : <FixItNextVisit />}</div>}
    <FounderFeature />
    <section className="fis-standard fis-wrap" aria-label="Katie’s approach"><p className="fis-kicker">THE CARE BEHIND THE VISIT</p><div>{[
      ["01", "Listen first.", "A direction begins with you. What you like, what you would change, and how your hair fits into your life."],
      ["02", "Work with care.", "Attention to shape, texture and the details that make a look feel considered."],
      ["03", "Leave ready.", "A finish to take into your day, with a conversation about keeping it your own."],
    ].map(([number, title, body]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{body}</p></article>)}</div></section>
    <FixItVisitFilm />
    <section id="services" className="fis-services" aria-labelledby="menu-title" data-booking-state={visit.state}>
      <div className="fis-wrap"><header><div><p className="fis-kicker">03 / MAKE TIME FOR YOURSELF</p><h2 id="menu-title">Your visit.<br /><em>With Katie.</em></h2></div><p role="status">{visit.status}</p></header>
      {visit.locations.map(location => <div className="fis-location" key={location.id}><div className="fis-location__heading"><h3>{location.city}, {location.region}</h3><span>WITH KATIE GUIDRY</span></div><div className="fis-service-menu">{location.services.map((service, index) => <Link className="fix-it-service fis-service" key={service.id} href={brand.book + "?" + new URLSearchParams({ location: location.id, service: service.id })}><span className="fis-service__number">{String(index + 1).padStart(2, "0")}</span><div><h3>{service.name}</h3><p>{service.description}</p><span>{service.minutes} minutes · Personal time with Katie</span></div><strong>{money(service.price)}<small>Find a time <ArrowUpRight size={16} /></small></strong></Link>)}</div><p className="fis-location__details">{location.address || "Location details are being prepared."} · Appointment times use {location.timezone}.</p></div>)}
      {visit.state !== "open" && <FixItBookingFallback nativeCalendar={katieNativeBooking()} />}
      {visit.state === "open" && <p className="fis-menu-note">Choose a service to explore available times. Your appointment is reserved only after you confirm.</p>}</div>
    </section>
    <section className="fis-personal fis-wrap" aria-labelledby="fis-personal-title"><div><p className="fis-kicker">04 / ROOM TO BE YOURSELF</p><h2 id="fis-personal-title">Your time.<br /><em>Your pace.</em></h2><p>A conversation, a quiet moment, or a little of both. Explore how you would like your visit to feel.</p><p>The Chair lets you save your preferences and choose what to share with Katie.</p><Link href="/chair" className="fis-link">Prepare my visit in The Chair <ArrowUpRight size={16} /></Link></div><FixItAtmosphere /></section>
    <section className="fis-return" aria-labelledby="fis-return-title"><div className="fis-return__scene"><Image src="/images/katie/departure.webp" alt="Illustrative salon departure, not a photograph of Katie’s client or work" fill sizes="100vw" /></div><div className="fis-wrap fis-return__copy"><p className="fis-kicker">05 / UNTIL NEXT TIME</p><h2 id="fis-return-title">Your chair.<br /><em>One tap away.</em></h2><p>Keep your confirmed appointments together. Come back to manage a visit, find your next time, or add Fix It Shop to your phone.</p><div className="fis-actions"><Link className="button button-gold" href={brand.visits}>Open my appointments <ArrowUpRight size={17} /></Link><Link className="fis-link" href={brand.base + "/install"}>Add to my home screen <ArrowUpRight size={16} /></Link></div><small>ILLUSTRATIVE PROCESS IMAGERY · NOT KATIE OR HER CLIENTS</small></div></section>
  </main>;
}
