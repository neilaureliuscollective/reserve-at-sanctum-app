"use client";

import Image from "next/image";
import { Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ramp = (n: number, start: number, end: number) => clamp((n - start) / (end - start));

export function GentDirector() {
  const [mode, setMode] = useState<"pending" | "motion" | "still">("pending");
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setReduced(query.matches);
      setMode(query.matches || localStorage.getItem("gent-world-still") === "true" ? "still" : "motion");
    };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (mode === "pending") return;
    const stage = document.querySelector<HTMLElement>(".gent-film");
    if (!stage) return;
    const scenes = [...stage.querySelectorAll<HTMLElement>(".gent-film__scene")];
    stage.dataset.motion = String(mode === "motion");
    if (mode === "still") {
      scenes.forEach(scene => { scene.inert = false; scene.removeAttribute("aria-hidden"); });
      ["--scene-1", "--scene-2", "--scene-3"].forEach(name => stage.style.removeProperty(name));
      return;
    }
    let frame = 0;
    let active = -1;
    const update = () => {
      frame = 0;
      const rect = stage.getBoundingClientRect();
      const p = clamp(-rect.top / Math.max(1, rect.height - window.innerHeight));
      const values = [1 - ramp(p, .16, .34), Math.min(ramp(p, .17, .36), 1 - ramp(p, .52, .70)), ramp(p, .53, .76)];
      values.forEach((value, index) => stage.style.setProperty("--scene-" + (index + 1), value.toFixed(4)));
      const firstGate = Math.min(ramp(p, .19, .27), 1 - ramp(p, .29, .38));
      const secondGate = Math.min(ramp(p, .54, .62), 1 - ramp(p, .64, .74));
      stage.style.setProperty("--gate", Math.max(firstGate, secondGate).toFixed(4));
      stage.style.setProperty("--camera", p.toFixed(4));
      const next = p < .28 ? 0 : p < .64 ? 1 : 2;
      if (next !== active) {
        active = next;
        scenes.forEach((scene, index) => { scene.inert = index !== next; scene.setAttribute("aria-hidden", String(index !== next)); });
        stage.dataset.active = String(next + 1);
      }
    };
    const request = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    return () => { window.removeEventListener("scroll", request); window.removeEventListener("resize", request); if (frame) cancelAnimationFrame(frame); };
  }, [mode]);

  const toggle = () => {
    if (reduced) return;
    const next = mode === "motion" ? "still" : "motion";
    localStorage.setItem("gent-world-still", String(next === "still"));
    setMode(next);
  };
  return <nav className="gent-nav" aria-label="Explore GENT Ascend"><div><a href="#the-journey">The journey</a><a href="#mirror">The Mirror</a><a href="#collection">The collection</a><a href="#return">The Reserve</a></div><button type="button" onClick={toggle} disabled={mode === "pending" || reduced} aria-pressed={mode === "still"} aria-label={mode === "motion" ? "Show the still view" : "Enable cinematic motion"}>{mode === "motion" ? <Pause size={13} /> : <Play size={13} />}<span>{mode === "motion" ? "STILL VIEW" : "MOTION OFF"}</span></button></nav>;
}

const products = [
  { name: "Vitalis", descriptor: "Hair & beard oil · Obsidian Vale", family: "GROOMING", src: "/images/cinematic/vitalis-cutout.webp" },
  { name: "Obsidian Wash", descriptor: "Body wash · Cedar Smoke", family: "GROOMING", src: "/images/cinematic/obsidian-wash-cutout.webp" },
  { name: "Obsidian Crème", descriptor: "Face moisturizer · Midnight Orchid", family: "GROOMING", src: "/images/cinematic/obsidian-creme-cutout.webp" },
  { name: "HYDROS", descriptor: "Hydration + electrolytes · Citrus Reserve", family: "BEYOND THE VISIT", src: "/images/cinematic/hydros-cutout.webp" },
  { name: "ASCEND", descriptor: "Pre-workout · Georgia Peach Rings", family: "BEYOND THE VISIT", src: "/images/cinematic/ascend-cutout.webp" },
] as const;

export function GentCollection() {
  const [active, setActive] = useState(0);
  const product = products[active];
  return <div className="gent-products">
    <div className="gent-products__copy" aria-live="polite" aria-atomic="true"><span>LEGACY RESERVE / {product.family}</span><h3>{product.name}</h3><p>{product.descriptor}</p><small>PACKAGING CONCEPT · COLLECTION PREVIEW</small></div>
    <div className="gent-products__object" key={product.src}><Image src={product.src} alt={"Legacy Reserve " + product.name + " concept package"} fill sizes="(max-width: 650px) 62vw, 33vw" /></div>
    <div className="gent-products__selector" role="group" aria-label="Explore Legacy Reserve concept packages">{products.map((item, index) => <button type="button" key={item.name} aria-pressed={active === index} onClick={() => setActive(index)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.name}</strong></button>)}</div>
    <p className="gent-products__note">A first look at supplied packaging concepts. Final products, pricing and availability will be introduced as they are ready.</p>
  </div>;
}
