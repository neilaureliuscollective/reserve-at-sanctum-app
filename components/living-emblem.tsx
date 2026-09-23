"use client";

import Image from "next/image";
import { Pause, Play } from "lucide-react";
import { useRef, useState } from "react";

const marks = {
  reserve: { src: "/images/reserve-petrol-official.webp", alt: "The Reserve at Sanctum official petrol and gold Louisiana crest", name: "The Reserve at Sanctum" },
  fix: { src: "/images/fix-it-official.jpg", alt: "Fix It Shop emblem", name: "Fix It Shop" },
  gent: { src: "/images/gent-ascend-official.jpg", alt: "GENT Ascend Collective emblem", name: "GENT Ascend Collective" },
} as const;

type Props = { brand: keyof typeof marks; className?: string; priority?: boolean; controls?: boolean; ambient?: boolean };

/** The supplied mark stays intact; the light, depth and orbit belong to its surrounding stage. */
export function LivingEmblem({ brand, className = "", priority = false, controls = false, ambient = true }: Props) {
  const [paused, setPaused] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const mark = marks[brand];

  function move(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || paused || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - .5;
    const y = (event.clientY - bounds.top) / bounds.height - .5;
    stage.current?.style.setProperty("--tilt-y", `${x * 5}deg`);
    stage.current?.style.setProperty("--tilt-x", `${-y * 5}deg`);
  }

  function reset() {
    stage.current?.style.setProperty("--tilt-y", "0deg");
    stage.current?.style.setProperty("--tilt-x", "0deg");
  }

  return (
    <div className={`living-emblem living-emblem--${brand} ${className}`} data-paused={paused || !ambient} onPointerMove={move} onPointerLeave={reset}>
      <div ref={stage} className="living-emblem__stage">
        <span className="living-emblem__aura" aria-hidden="true" />
        <span className="living-emblem__orbit" aria-hidden="true" />
        <span className="living-emblem__face">
          <Image src={mark.src} alt={mark.alt} fill priority={priority} sizes="(max-width: 650px) 85vw, (max-width: 1100px) 50vw, 640px" />
        </span>
        <span className="living-emblem__glint" aria-hidden="true" />
      </div>
      {controls && <button className="living-emblem__control" type="button" onClick={() => { setPaused(!paused); reset(); }} aria-label={`${paused ? "Play" : "Pause"} ${mark.name} emblem motion`} aria-pressed={paused}>
        {paused ? <Play size={13} /> : <Pause size={13} />} <span>{paused ? "PLAY MOTION" : "PAUSE MOTION"}</span>
      </button>}
    </div>
  );
}
