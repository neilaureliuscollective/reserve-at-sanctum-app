"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { VitalisObservatory } from "./public-worlds";

const paths = [
  { name: "Grooming", title: "Sharpen your presence.", text: "Meet Katie’s men’s salon craft and Neil’s grooming world. A considered visit. A ritual beyond the chair.", href: "/discover#grooming", action: "Explore grooming & presence", color: "craft" },
  { name: "Vitalis", title: "Build a longer horizon.", text: "Begin with your free wellness rhythm. Explore the vision for health intelligence and longevity.", href: "/vitalis", action: "Discover Legacy Reserve Vitalis", color: "health" },
  { name: "Collection", title: "Carry the standard home.", text: "Explore considered grooming and wellbeing products, with availability shown before you purchase.", href: "/shop", action: "Explore the collection", color: "collection" },
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
      root.dataset.motion = still ? "still" : "active";
      for (const scene of scenes) {
        const rect = scene.getBoundingClientRect();
        if (still) { scene.style.setProperty("--camera", "0"); scene.style.setProperty("--journey", ".5"); continue; }
        if (rect.bottom < 0 || rect.top > innerHeight) continue;
        const progress = Math.max(-1, Math.min(1, (innerHeight / 2 - (rect.top + rect.height / 2)) / innerHeight));
        const journey = Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height - innerHeight)));
        scene.style.setProperty("--camera", progress.toFixed(3));
        scene.style.setProperty("--journey", journey.toFixed(3));
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
  function choose(index: number) {
    setActive(index);
    const bounds = stage.current?.getBoundingClientRect();
    if (bounds && (bounds.top < 12 || bounds.bottom > innerHeight - 20)) {
      stage.current?.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.reserveStill === "true" ? "instant" : "smooth" });
    }
  }
  return <section id="your-way" className="public-compass" aria-labelledby="compass-heading">
    <div className="public-section-heading"><p className="experience-kicker">THE COMPASS / YOUR NEXT STEP</p><h2 id="compass-heading">Your direction.<br /><em>Your entrance.</em></h2><p>Choose what brings you here. Your next step is right in front of you.</p></div>
    <div ref={stage} className={`public-compass-stage ${choice.color}`}>
      <div className="compass-environments" aria-hidden="true">
        <div className="compass-environment compass-craft" data-active={active === 0}><div className="compass-portal" /><div className="compass-craft-seal"><Image src="/images/cinematic/fix-it-seal.webp" alt="" fill sizes="(max-width: 760px) 42vw, 30vw" /></div><div className="compass-craft-light" /></div>
        <div className="compass-environment compass-health" data-active={active === 1}><VitalisObservatory compact /></div>
        <div className="compass-environment compass-collection" data-active={active === 2}><div className="compass-collection-plinth" /><Image src="/images/cinematic/obsidian-wash-cutout.webp" alt="" width={300} height={440} /></div>
      </div>
      <div className="public-compass-body">
        <div className="public-compass-controls" role="group" aria-label="Choose your direction">{paths.map((path, index) => <button key={path.name} type="button" aria-pressed={active === index} onClick={() => choose(index)}><span>0{index + 1}</span>{path.name}</button>)}</div>
        <div className="public-compass-result" aria-live="polite" aria-atomic="true"><p className="experience-kicker">LEGACY RESERVE / {choice.name.toUpperCase()}</p><h3>{choice.title}</h3><p>{choice.text}</p><Link className="button button-gold" href={choice.href}>{choice.action} ↗</Link></div>
      </div>
      <small className="public-concept">DESIGNED ENVIRONMENT · CHOOSE YOUR PATH</small>
    </div>
  </section>;
}
