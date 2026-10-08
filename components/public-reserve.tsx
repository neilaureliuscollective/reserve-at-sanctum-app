"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

const paths = [
  { name: "Grooming", title: "Leave with presence.", text: "Katie’s men’s salon craft. Neil’s grooming direction. Care in the chair and a ritual that carries beyond it.", image: "/images/reserve-craft.webp", href: "/fix-it-shop", action: "Meet Katie & Fix It Shop", color: "craft" },
  { name: "Vitalis", title: "Build a longer horizon.", text: "Advanced health intelligence and longevity. Start with the private wellness pilot; explore what is being prepared next.", image: "/images/cinematic/reserve-hall.webp", href: "/vitalis", action: "Discover Legacy Reserve Vitalis", color: "health" },
  { name: "Collection", title: "Carry the standard home.", text: "Considered grooming and wellbeing products. Explore the collection, with availability shown before you purchase.", image: "/images/cinematic/reserve-product-chamber.webp", href: "/shop", action: "Explore the collection", color: "collection" },
] as const;

export function PublicDirector() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".public-reserve");
    if (!root) return;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const scenes = [...root.querySelectorAll<HTMLElement>("[data-public-scene]")];
    let frame = 0;
    const update = () => {
      frame = 0;
      const still = media.matches || document.documentElement.dataset.reserveStill === "true";
      for (const scene of scenes) {
        const rect = scene.getBoundingClientRect();
        if (still) { scene.style.setProperty("--camera", "0"); continue; }
        if (rect.bottom < 0 || rect.top > innerHeight) continue;
        const progress = Math.max(-1, Math.min(1, (innerHeight / 2 - (rect.top + rect.height / 2)) / innerHeight));
        scene.style.setProperty("--camera", progress.toFixed(3));
      }
    };
    const request = () => { if (!frame) frame = requestAnimationFrame(update); };
    const observer = new MutationObserver(request);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-reserve-still"] });
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    media.addEventListener("change", request);
    update();
    return () => { observer.disconnect(); window.removeEventListener("scroll", request); window.removeEventListener("resize", request); media.removeEventListener("change", request); if (frame) cancelAnimationFrame(frame); };
  }, []);
  return null;
}

export function PublicCompass() {
  const [active, setActive] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const choice = paths[active];
  return <section id="your-way" className="public-compass" aria-labelledby="compass-heading">
    <div className="public-section-heading"><p className="experience-kicker">THE COMPASS / YOUR NEXT STEP</p><h2 id="compass-heading">Choose what brings you here.</h2></div>
    <div ref={stage} className={`public-compass-stage ${choice.color}`}>
      {paths.map((path, index) => <div key={path.name} className="public-compass-image" data-active={index === active} aria-hidden="true"><Image src={path.image} alt="" fill sizes="100vw" /></div>)}
      <div className="public-compass-rings" aria-hidden="true"><i /><i /><i /></div>
      <div className="public-compass-body">
        <div className="public-compass-controls" role="group" aria-label="Choose your direction">{paths.map((path, index) => <button key={path.name} type="button" aria-pressed={active === index} onClick={() => { setActive(index); const bounds = stage.current?.getBoundingClientRect(); if (bounds && (bounds.top < 70 || bounds.bottom > innerHeight)) stage.current?.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.reserveStill === "true" ? "instant" : "smooth" }); }}><span>0{index + 1}</span>{path.name}</button>)}</div>
        <div className="public-compass-result" aria-live="polite" aria-atomic="true"><p className="experience-kicker">LEGACY RESERVE / {choice.name.toUpperCase()}</p><h3>{choice.title}</h3><p>{choice.text}</p><Link className="button button-gold" href={choice.href}>{choice.action} ↗</Link></div>
      </div>
      <small className="public-concept">CONCEPT ENVIRONMENT</small>
    </div>
  </section>;
}
