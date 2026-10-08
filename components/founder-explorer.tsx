"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { FounderPath, FounderWorldId } from "@/lib/experience/founder-worlds";

/** One local selection changes the architecture and its useful destination together. */
export function FounderExplorer({ world, paths }: { world: FounderWorldId; paths: readonly FounderPath[] }) {
  const [active, setActive] = useState(0);
  const root = useRef<HTMLElement>(null);
  const selected = paths[active];
  function choose(index: number) {
    setActive(index);
    if (window.matchMedia("(max-width: 700px)").matches) {
      root.current?.scrollIntoView({ block: "start", behavior: "instant" });
      requestAnimationFrame(() => {
        const action = root.current?.querySelector(".founder-path-detail .button")?.getBoundingClientRect();
        const dock = document.querySelector(".command-dock")?.getBoundingClientRect();
        const bottom = (dock?.top ?? innerHeight - 90) - 20;
        if (action && action.bottom > bottom) window.scrollBy({ top: action.bottom - bottom, behavior: "instant" });
      });
    }
  }
  return <section ref={root} id="ecosystem" className="founder-explorer" data-selection={selected.id} aria-labelledby="founder-explorer-title">
    <header className="founder-explorer-heading"><p className="founder-label">03 / {world === "legacy" ? "THE ECOSYSTEM" : "THE TECHNOLOGY HORIZON"}</p><h2 id="founder-explorer-title">{world === "legacy" ? "Choose your direction." : "Explore the possibilities."}</h2></header>
    <div className="founder-path-controls" role="group" aria-label={world === "legacy" ? "Explore the Legacy Reserve ecosystem" : "Explore Aethelios Technologies"}>
      {paths.map((path, index) => <button key={path.id} type="button" aria-pressed={index === active} aria-controls="founder-path-detail" onClick={() => choose(index)}><small>0{index + 1}</small>{path.label}</button>)}
    </div>
    <div className="founder-path-stage">
      <div className="founder-path-architecture" aria-hidden="true"><div className="founder-path-horizon"/><div className="founder-path-orbit orbit-one"/><div className="founder-path-orbit orbit-two"/><div className="founder-path-orbit orbit-three"/><div className="founder-path-axis"/><div className="founder-path-core"><span key={selected.id}>{selected.symbol}</span></div><div className="founder-path-floor"/></div>
      <div id="founder-path-detail" className="founder-path-detail" aria-live="polite" aria-atomic="true"><span className="founder-availability">{selected.status}</span><h3>{selected.title}</h3><p>{selected.copy}</p><Link prefetch={false} href={selected.href} className="button button-gold">{selected.action}<ArrowUpRight size={16}/></Link></div>
    </div>
    <noscript><p className="founder-still-links">Explore directly: {paths.map(path => <a key={path.id} href={path.href}>{path.label} ↗ </a>)}</p></noscript>
  </section>;
}

/** Decorative scroll depth never owns content visibility or scrolling. */
export function FounderMotion() {
  useEffect(() => {
    const stage = document.querySelector<HTMLElement>(".founder-world");
    if (!stage) return;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const update = () => {
      frame = 0;
      const still = media.matches || document.documentElement.dataset.reserveStill === "true";
      const progress = still ? 0 : Math.min(1, Math.max(0, -stage.getBoundingClientRect().top / Math.max(1, innerHeight)));
      stage.style.setProperty("--founder-depth", progress.toFixed(3));
    };
    const request = () => { if (!frame) frame = requestAnimationFrame(update); };
    const observer = new MutationObserver(request);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-reserve-still"] });
    update();
    window.addEventListener("scroll", request, { passive: true });
    media.addEventListener("change", request);
    return () => { observer.disconnect(); window.removeEventListener("scroll", request); media.removeEventListener("change", request); if (frame) cancelAnimationFrame(frame); };
  }, []);
  return null;
}
