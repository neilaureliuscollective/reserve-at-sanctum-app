import Link from "next/link";
import { Compass, HeartPulse, Sparkles, Landmark, ShoppingBag, ArrowUpRight } from "lucide-react";
import { surfaceClass } from "./imperial-surface";

const worlds = [
  { title: "Reserve", detail: "Your personal direction", href: "/pathways", icon: Compass },
  { title: "Vitalis", detail: "Wellbeing & longevity", href: "/vitalis", icon: HeartPulse },
  { title: "Aethelios", detail: "Your next useful step", href: "/concierge", icon: Sparkles },
  { title: "Sanctum", detail: "People, places & visits", href: "/visit", icon: Landmark },
  { title: "Collection", detail: "Carry the standard", href: "/shop", icon: ShoppingBag },
] as const;

export function ImperialWorlds() {
  return <nav className="imperial-worlds" aria-label="Your connected worlds">
    {worlds.map(({ title, detail, href, icon: Icon }, index) => <Link key={title} href={href} prefetch={false} className={surfaceClass("glass", "imperial-world")} data-world={title}>
      <span className="imperial-world-top"><Icon size={22} strokeWidth={1.3} /><small>0{index + 1}</small></span>
      <strong>{title}</strong><span>{detail}</span><ArrowUpRight className="imperial-world-arrow" size={16} aria-hidden="true" />
    </Link>)}
  </nav>;
}
