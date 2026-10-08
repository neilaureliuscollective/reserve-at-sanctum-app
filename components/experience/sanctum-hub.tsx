"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, MapPin, Clock, Scissors, ChevronRight } from "lucide-react";
import type { SanctumDestination } from "@/lib/experience/sanctum-directory";
const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
export function SanctumHub({ destinations, unavailable, initialLocation }: { destinations: SanctumDestination[]; unavailable: boolean; initialLocation?: string }) {
  const [houseId, setHouseId] = useState(destinations.find(destination => destination.id === initialLocation)?.id || destinations[0]?.id || "");
  const [professionalId, setProfessionalId] = useState("");
  const servicePanel = useRef<HTMLElement>(null);
  const house = destinations.find(destination => destination.id === houseId);
  const professional = house?.professionals.find(person => person.id === professionalId) || house?.professionals[0];
  const open = Boolean(house?.enabled && house?.booking_enabled && house.professionals.length);
  const chooseProfessional = (id: string) => {
    setProfessionalId(id);
    requestAnimationFrame(() => servicePanel.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }));
  };
  return <main id="main" className="sanctum-hub">
    <header className="sanctum-portal">
      <div className="sanctum-portal-copy"><p className="digital-label">SANCTUM / YOUR PHYSICAL WORLD</p><h1>Presence.<br/><em>In person.</em></h1><p>Your digital Reserve meets personal service. Choose your professional. Make space for yourself.</p>
        <a className="button button-gold" href="#professionals">{open ? "Choose your professional" : "Meet the professionals"}<ArrowUpRight size={17}/></a>
      </div>
      <figure><Image src="/images/cinematic/reserve-hall.webp" alt="Concept interior for a Legacy Reserve destination" fill sizes="(max-width:700px) 100vw, 50vw" priority/><figcaption>Sanctum concept environment</figcaption></figure>
    </header>
    <section className="sanctum-destination" aria-label="Sanctum destination">
      <div><MapPin size={18}/><span>{house ? `${house.city}, ${house.region}` : "Sanctum"}</span><span className="sanctum-status">{unavailable ? "Unable to refresh" : open ? "Appointments available" : "Booking in preparation"}</span></div>
      {destinations.length > 1 && <label>Destination<select value={houseId} onChange={event => { setHouseId(event.target.value); setProfessionalId(""); }}>{destinations.map(destination => <option key={destination.id} value={destination.id}>{destination.short_name}</option>)}</select></label>}
      {house?.address && <p>{house.address}</p>}
    </section>
    <section id="professionals" className="sanctum-professionals">
      <div className="sanctum-section-heading"><div><p className="digital-label">01 / THE PEOPLE</p><h2>Your standard. Their craft.</h2></div><p>{open ? "Choose a professional to see their published services." : "Explore the people and independent worlds within Sanctum."}</p></div>
      {unavailable ? <div className="sanctum-empty" role="status"><h3>The directory could not refresh.</h3><p>Check again before planning your visit.</p><Link className="button button-outline" href="/visit">Try again</Link></div> : open ? <div className="sanctum-professional-grid" role="group" aria-label="Choose your professional">{house!.professionals.map(person => <button key={person.id} aria-pressed={person.id === professional?.id} onClick={() => chooseProfessional(person.id)}><span className="sanctum-monogram" aria-hidden="true">{person.name.split(" ").map(part => part[0]).slice(0,2).join("")}</span><span><strong>{person.name}</strong><small>{person.services.length} published {person.services.length === 1 ? "service" : "services"}</small></span><ChevronRight size={18}/></button>)}</div> : <div className="sanctum-empty"><Scissors size={22}/><h3>A visit worth making time for.</h3><p>Public appointments open when the destination, professionals and service menu are published. Explore their worlds below while booking is being prepared.</p></div>}
    </section>
    {open && professional && <section ref={servicePanel} className="sanctum-services" aria-labelledby="sanctum-services-title"><p className="digital-label">02 / YOUR SERVICE</p><h2 id="sanctum-services-title">With {professional.name}.</h2><p className="sanctum-timezone"><Clock size={14}/>Appointment times use {house!.timezone}.</p><div>{professional.services.map(service => <Link key={service.id} href={`/book?location=${encodeURIComponent(house!.id)}&provider=${encodeURIComponent(professional.id)}&service=${encodeURIComponent(service.id)}`}><span><strong>{service.name}</strong><small>{service.description}</small></span><span>{service.minutes} min <b>{money(service.price)}</b></span><ArrowUpRight size={18}/></Link>)}</div><p className="reserve-field-note">Choose a service to view available times. Your appointment is saved only after you confirm.</p></section>}
    <section className="sanctum-independent" aria-label="Independent worlds at Sanctum"><div className="sanctum-section-heading"><div><p className="digital-label">THE WORLDS WITHIN</p><h2>Distinct identities.<br/>A shared standard.</h2></div></div><div className="sanctum-world-grid">
      <Link href="/fix-it-shop" className="sanctum-katie"><span className="sanctum-world-emblem" aria-hidden="true">F.</span><span className="digital-label">KATIE GUIDRY / FIX IT SHOP</span><h3>Craft. Care.<br/>Confidence.</h3><p>Meet Katie and explore her independent men’s salon world.</p><span className="text-link">Enter Fix It Shop <ArrowUpRight size={15}/></span></Link>
      <Link href="/gent-ascend" className="sanctum-gent"><span className="sanctum-world-emblem" aria-hidden="true">G.</span><span className="digital-label">NEIL STUTES / GENT ASCEND COLLECTIVE</span><h3>A world of<br/>your own.</h3><p>Explore Neil’s independent men’s grooming house.</p><span className="text-link">Enter GENT Ascend <ArrowUpRight size={15}/></span></Link>
    </div></section>
    <nav className="sanctum-visit-tools" aria-label="Your visit tools"><Link href="/chair">The Chair <span>Prepare your preferences</span><ArrowUpRight size={18}/></Link><Link prefetch={false} href="/my-visit">Your visit <span>View a saved appointment</span><ArrowUpRight size={18}/></Link></nav>
  </main>;
}
