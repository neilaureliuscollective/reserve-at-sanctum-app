'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef } from 'react';

const rooms = [
  { id: 'chair', label: 'Katie', identity: 'FIX IT SHOP · FOUNDER KATIE GUIDRY', title: 'Come sit down.', copy: 'Your cut. Your pace. A little room to be yourself.', image: '/images/katie/private-chair.webp', action: 'Get your chair ready', href: '/chair', explore: '/fix-it-shop', exploreLabel: 'Inside Fix It Shop' },
  { id: 'ritual', label: 'Neil', identity: 'LEGACY RESERVE · FOUNDER NEIL STUTES', title: 'Find your direction.', copy: 'Explore the purpose behind Presence, Performance, Vitalis and the wider ecosystem.', image: '/images/neil/mirror-desk.webp', action: 'Meet the founder', href: '/founder/legacy-reserve', explore: '/founder', exploreLabel: 'Inside Neil’s world' },
  { id: 'collection', label: 'Products', identity: 'LEGACY RESERVE · SHOP', title: 'Care between visits.', copy: 'Explore the product and packaging direction taking shape inside the house.', image: '/images/neil/ritual-plinth.webp', action: 'Open the Shop', href: '/shop', explore: '/book', exploreLabel: 'Make time for a visit' },
] as const;

/** Native choices preserve semantics; the root layout supplies no-script destinations. */
export function ReserveRooms() {
  const root = useRef<HTMLElement>(null);
  return <section ref={root} className="reserve-rooms" aria-labelledby="reserve-rooms-title">
    <div className="reserve-rooms__heading"><p className="experience-kicker">WITHIN THE HOUSE</p><h2 id="reserve-rooms-title">Where would you like to begin?</h2></div>
    <fieldset className="reserve-rooms__choices" onChange={() => root.current?.scrollIntoView({block: 'start', behavior: 'instant'})}>
      <legend className="sr-only">Choose a Legacy Reserve environment</legend>
      {rooms.map((room, index) => <label key={room.id}><input type="radio" name="reserve-room" value={room.id} defaultChecked={index === 0} /><span><small>0{index + 1}</small>{room.label}</span></label>)}
    </fieldset>
    <div className="reserve-rooms__stages">
      {rooms.map(room => <section key={room.id} className={`reserve-rooms__stage reserve-rooms__stage--${room.id}`} aria-label={room.identity}>
        <div className="reserve-rooms__art" aria-hidden="true"><Image src={room.image} alt="" fill sizes="(max-width: 760px) 100vw, 80vw" /></div>
        <div className="reserve-rooms__portal" aria-hidden="true" />
        <div className="reserve-rooms__copy"><p className="experience-kicker">{room.identity}</p><h3>{room.title}</h3><p>{room.copy}</p><Link href={room.href} className="button button-gold">{room.action} ↗</Link><Link href={room.explore} className="reserve-rooms__explore">{room.exploreLabel} ↗</Link><small>CONCEPT ENVIRONMENT · {room.id === 'collection' ? 'PRODUCTS NOT YET FOR SALE' : 'NOT THE FINISHED LOCATION'}</small></div>
      </section>)}
    </div>
  </section>;
}
