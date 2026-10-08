import { useId } from "react";
import type { Priority } from "@aethelios/concierge-core";

/** Brand geometry only: no synthetic biometric scores, charts or personal data. */
export function DigitalInstrument({ world = "wellness", quiet = false }: { world?: Priority; quiet?: boolean }) {
  const gradient = useId();
  return <div className={`digital-instrument${quiet ? " is-quiet" : ""}`} data-world={world} aria-hidden="true">
    <div className="instrument-aura" /><div className="instrument-grid" />
    <div className="imperial-orbits"><i /><i /><i /></div>
    <div className="imperial-core"><span>{world === "wellness" ? "V" : world === "presence" ? "R" : "P"}</span></div>
    <svg className="instrument-vector" viewBox="0 0 600 600" fill="none">
      <defs><linearGradient id={gradient} x1="100" y1="80" x2="480" y2="540" gradientUnits="userSpaceOnUse"><stop stopColor="#f4dfb0"/><stop offset=".45" stopColor="#C4912F"/><stop offset="1" stopColor="#58401d"/></linearGradient></defs>
      <g stroke={`url(#${gradient})`}><circle cx="300" cy="300" r="232" strokeWidth=".7"/><circle cx="300" cy="300" r="211" strokeWidth=".5" strokeDasharray="1 9"/><path d="M68 300h35m394 0h35M300 68v35m0 394v35"/><path d="M135 135l25 25m280 280 25 25M465 135l-25 25M160 440l-25 25" strokeWidth=".6"/><ellipse className="vector-orbit vector-orbit-one" cx="300" cy="300" rx="205" ry="80"/><ellipse className="vector-orbit vector-orbit-two" cx="300" cy="300" rx="90" ry="205"/><path className="vector-performance" d="m165 360 82-80 55 40 131-154M388 166h45v45" strokeWidth="2"/><path className="vector-presence" d="M233 405V195h74c105 0 105 127 0 127h-74m83 0 67 83" strokeWidth="2"/><g className="vector-wellness"><path d="m214 200 86 210 86-210" strokeWidth="2"/><path d="M214 230h172M237 350h126" strokeWidth=".4"/></g></g>
      <g fill="#D9B568"><circle cx="300" cy="68" r="3"/><circle cx="532" cy="300" r="3"/><circle cx="135" cy="465" r="2"/></g>
    </svg>
    <div className="instrument-glass glass-front" /><div className="instrument-glass glass-back" />
    <div className="instrument-caption"><span>LEGACY RESERVE</span><strong>{world === "wellness" ? "VITALIS" : world.toUpperCase()}</strong><span>YOUR PERSONAL DIRECTION</span></div>
  </div>;
}
