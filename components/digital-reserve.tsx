"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { digitalWorlds } from "@/lib/experience/digital-worlds";
import { DigitalInstrument } from "./digital-instrument";
import type { Priority } from "@aethelios/concierge-core";

export function DigitalWorldSelector({ initial = "wellness", member = false }: { initial?: Priority; member?: boolean }) {
  const [active, setActive] = useState(initial);
  const stage = useRef<HTMLDivElement>(null);
  const world = digitalWorlds.find(w => w.id === active)!;
  function select(id: Priority) {
    setActive(id);
    // Keep the selected destination in view on phones; never hijack document scrolling.
    requestAnimationFrame(() => {
      const bounds = stage.current?.getBoundingClientRect();
      if (bounds && (bounds.top < 0 || bounds.bottom > innerHeight - 36))
        stage.current?.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.reserveStill === "true" ? "instant" : "smooth" });
    });
  }
  return <div className="digital-selector" data-world={active} ref={stage}>
    <div className="digital-world-controls" role="group" aria-label="Choose your digital world">
      {digitalWorlds.map(w => <button key={w.id} type="button" aria-pressed={active === w.id} aria-controls="digital-world-preview" onClick={() => select(w.id)}><span>{w.index}</span>{w.label}<i aria-hidden="true">↗</i></button>)}
    </div>
    <div id="digital-world-preview" className="digital-world-preview">
      <DigitalInstrument world={active} />
      <div className="digital-world-copy" aria-live="polite" aria-atomic="true"><span className="digital-label">{member ? "EXPLORE YOUR DIRECTION" : "INTERACTIVE EXPERIENCE PREVIEW"}</span><h3>{world.headline}</h3><p>{world.description}</p><Link href={world.href} className="button button-gold">{world.action} ↗</Link></div>
    </div>
    <div className="digital-preview-routine"><span>{member ? "A FOUNDATION TO CONSIDER" : "ILLUSTRATIVE ROUTINE · YOUR SAVED CHOICES STAY PRIVATE"}</span><ol>{world.steps.map((step,i) => <li key={step}><b>{String(i+1).padStart(2,"0")}</b>{step}</li>)}</ol></div>
  </div>;
}

const examples = [
  { question: "Help me find my direction.", answer: "Start with what matters today: how you show up, your everyday capacity, or your wellbeing. Choose one priority and build a small routine you can keep.", href: "/pathways", action: "Explore your Pathways" },
  { question: "Where does Vitalis fit?", answer: "Vitalis is your wellbeing world inside Legacy Reserve. The free pilot lets you choose a wellness rhythm, set a weekly target and mark your days. Health intelligence and clinical connections are the next horizon.", href: "/vitalis", action: "Explore Vitalis" },
  { question: "Do I have to visit Sanctum?", answer: "Your digital Reserve travels with you. Build your routines and use the Vitalis pilot from wherever you are. Sanctum connects you with physical houses and grooming experiences when a visit fits your life.", href: "/discover/membership", action: "Explore your digital Reserve" },
];
export function AetheliosPreview() {
  const [active,setActive] = useState(0);
  return <div className="aethelios-preview"><div className="aethelios-preview-top"><span className="aethelios-signal" aria-hidden="true"/><span>AETHELIOS / EXAMPLE CONVERSATION</span><small>PUBLIC PREVIEW</small></div><div className="aethelios-prompts" role="group" aria-label="Explore Aethelios example conversations">{examples.map((e,i)=><button type="button" aria-pressed={i===active} onClick={()=>setActive(i)} key={e.question}>{e.question}</button>)}</div><div className="aethelios-example" aria-live="polite" aria-atomic="true"><p className="aethelios-you">{examples[active].question}</p><span>AETHELIOS</span><p>{examples[active].answer}</p><Link href={examples[active].href} className="text-link">{examples[active].action} ↗</Link></div><p className="digital-preview-note">Curated examples. Your private concierge opens in your customer account.</p></div>;
}
