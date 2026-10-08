"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { productConcepts } from "@/lib/product-concepts";

/** Decorative architecture, never a patient record or simulated health result. */
export function VitalisObservatory({ compact = false }: { compact?: boolean }) {
  return <div className={`vitalis-observatory${compact ? " is-compact" : ""}`} aria-hidden="true">
    <div className="observatory-horizon" />
    <div className="observatory-axis"><i /><i /><i /></div>
    <div className="observatory-orbit orbit-meridian" /><div className="observatory-orbit orbit-equator" /><div className="observatory-orbit orbit-outer" />
    <div className="observatory-world"><div className="observatory-longitude" /><div className="observatory-latitude" /><span>V</span></div>
    <div className="observatory-plinth"><span>VITALIS</span></div>
    <div className="observatory-coordinate coordinate-one">HEALTH INTELLIGENCE</div><div className="observatory-coordinate coordinate-two">A LONGER HORIZON</div>
    <svg className="observatory-field" viewBox="0 0 600 600" fill="none"><path d="M30 410Q300 100 570 410M30 440Q300 180 570 440M30 470Q300 260 570 470M30 500Q300 340 570 500" stroke="currentColor" strokeWidth=".6"/><path d="M70 550 260 355M170 550 280 355M300 550V355M430 550 320 355M530 550 340 355" stroke="currentColor" strokeWidth=".6"/></svg>
  </div>;
}

export function PublicHouseScene() {
  return <section id="the-place" className="house-sequence public-scene" data-public-scene aria-labelledby="house-title">
    <div className="house-frame">
      <div className="house-environment" aria-hidden="true"><Image src="/images/cinematic/reserve-hall.webp" alt="" fill sizes="100vw" /><div className="house-depth-frame depth-one" /><div className="house-depth-frame depth-two" /><div className="house-depth-frame depth-three" /><div className="house-floor" /></div>
      <div className="house-shutter shutter-left" aria-hidden="true" /><div className="house-shutter shutter-right" aria-hidden="true" />
      <div className="house-story"><p className="experience-kicker">01 / THE HOUSE · LOUISIANA ROOTS</p><h2 id="house-title">Walk in with purpose.<br /><em>Leave with presence.</em></h2><p>Men’s grooming. Daily rituals. A longer view of wellbeing. Legacy Reserve brings them together, with a clear place to begin.</p><Link href="/visit" className="button button-outline">Explore the house · Eunice ↗</Link></div>
      <div className="house-foundations"><span><b>01</b> Grooming & presence</span><span><b>02</b> Health & wellbeing</span><span><b>03</b> Products & rituals</span></div>
      <small className="public-concept">ARCHITECTURAL CONCEPT · THE HOUSE IS TAKING SHAPE</small>
      <span className="scene-index" aria-hidden="true">THE HOUSE / 01</span>
    </div>
  </section>;
}

export function PublicVitalisScene() {
  return <section id="vitalis" className="vitalis-sequence public-scene" data-public-scene aria-labelledby="vitalis-title">
    <div className="vitalis-frame">
      <div className="vitalis-scene-heading"><p className="experience-kicker">03 / LEGACY RESERVE VITALIS</p><span className="public-status"><i /> FREE WELLNESS PILOT AVAILABLE</span></div>
      <div className="vitalis-scene-layout"><VitalisObservatory /><div className="public-copy"><p className="vitalis-scene-subtitle">ADVANCED HEALTH INTELLIGENCE & LONGEVITY</p><h2 id="vitalis-title">Your life.<br /><em>A longer horizon.</em></h2><p>Start with a rhythm you can keep. Sleep consistency, everyday movement and meal preparation. Build a private weekly practice inside your Reserve.</p><div className="public-actions"><Link href="/vitalis/journey" className="button button-gold">Start the free wellness pilot ↗</Link><Link href="/vitalis" className="text-link">Explore the Vitalis vision ↗</Link></div></div></div>
      <div className="vitalis-future"><span>THE NEXT HORIZON</span><p>Health intelligence · Diagnostics · Qualified clinical partnerships</p><Link href="/vitalis#early-access">Planned · Register your interest ↗</Link></div>
    </div>
  </section>;
}

export function PublicCollection() {
  const [active, setActive] = useState(0);
  const product = productConcepts[active];
  return <section id="the-collection" className="collection-sequence public-scene" data-public-scene aria-labelledby="collection-title">
    <header className="public-section-heading"><p className="experience-kicker">04 / THE LEGACY RESERVE COLLECTION</p><h2 id="collection-title">Your standard.<br /><em>Within reach.</em></h2><p>Purpose in the formula. Presence on the shelf. A ritual that belongs to you.</p></header>
    <div className="collection-theatre"><div className="collection-architecture" aria-hidden="true"><div className="collection-arch" /><div className="collection-arch arch-inner" /><div className="collection-light" /><div className="collection-pedestal" /></div><div className="collection-object" key={product.id}><Image src={product.src} alt={product.alt} fill sizes="(max-width: 760px) 60vw, 35vw" /></div><div className="collection-story" aria-live="polite" aria-atomic="true"><p className="experience-kicker">{product.family} / {String(active + 1).padStart(2, "0")}</p><h3>{product.name}</h3><p>{product.description}</p><small>PRODUCT CONCEPT · PACKAGING PREVIEW</small><Link href="/shop" className="text-link">Explore availability ↗</Link></div><div className="collection-controls" role="group" aria-label="Explore collection concepts">{productConcepts.map((item, index) => <button key={item.id} type="button" aria-pressed={active === index} onClick={() => setActive(index)} aria-label={`Show ${item.name}`}><span>{String(index + 1).padStart(2,"0")}</span><strong>{item.name}</strong></button>)}</div></div>
    <p className="collection-note">A first look. Final packaging, pricing and availability are introduced as each product becomes ready.</p>
  </section>;
}
