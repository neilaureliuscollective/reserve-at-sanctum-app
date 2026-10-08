"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Compass, HeartPulse, Sparkles, Landmark, ShoppingBag, UserRound, ArrowUpRight } from "lucide-react";
import { brand } from "@/lib/brand";
import { customerPrimary, commandWorld } from "@/lib/experience/customer-os";
import { MotionMode } from "./motion-mode";

const icons = [Compass, HeartPulse, Sparkles, Landmark, ShoppingBag];
export function ExperienceChrome({ children, footer, status }: {
  children: React.ReactNode; footer: React.ReactNode; status: React.ReactNode;
}) {
  const path = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
  const [keyboard, setKeyboard] = useState(false);
  const world = commandWorld(path);
  useEffect(() => { if (menu.current) menu.current.open = false; }, [path]);
  useEffect(() => {
    const viewport = window.visualViewport;
    let restingHeight = viewport?.height || window.innerHeight;
    const update = () => {
      const editable = Boolean(document.activeElement?.matches("input, textarea, select"));
      const height = viewport?.height || window.innerHeight;
      if (!editable) restingHeight = height;
      setKeyboard(editable && restingHeight - height > 150);
    };
    viewport?.addEventListener("resize", update);
    window.addEventListener("focusout", update);
    return () => { viewport?.removeEventListener("resize", update); window.removeEventListener("focusout", update); };
  }, []);
  if (path.startsWith("/studio")) return <>{children}{status}</>;
  if (path === "/") return <><MotionMode />{children}</>;
  return <div className="reserve-app-shell" data-world={world} data-keyboard={keyboard}>
    <a className="skip" href="#main">Skip to content</a>
    <header className="experience-header command-masthead">
      <Link prefetch={false} href="/reserve" className="experience-brand">
        <Image src={brand.mark} alt="" width={42} height={42} />
        <span>{brand.wordmark}<small>YOUR PERSONAL ECOSYSTEM</small></span>
      </Link>
      <span className="command-current"><i aria-hidden="true" />{world}</span>
      <details ref={menu} className="experience-menu command-account"
        onKeyDown={event => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}
        onClick={event => { if ((event.target as HTMLElement).closest("a")) event.currentTarget.open = false; }}>
        <summary aria-label="Account and settings"><UserRound size={18} /><span>Account</span></summary>
        <nav aria-label="Account and destinations">
          <p className="digital-label">YOUR RESERVE</p>
          <Link href="/discover">View public homepage <ArrowUpRight size={14}/></Link>
          <Link prefetch={false} href="/enter">Your dashboard <ArrowUpRight size={14}/></Link>
          <Link href="/pathways">Pathways & routines</Link>
          <Link href="/profile">Profile & preferences</Link>
          <Link href="/membership">Membership</Link>
          <Link href="/account">Your appointments</Link>
          <Link href="/my-reserve">My Reserve</Link>
          <Link href="/chair">The Chair</Link>
          <Link href="/setup?help=1">Install the app</Link>
          <Link prefetch={false} href="/signin">Sign in</Link>
          <MotionMode />
          {status}
        </nav>
      </details>
    </header>
    <div className="command-content"><div className="imperial-world-transition" key={path}>{children}</div></div>
    {["/privacy", "/terms", "/setup"].includes(path) && footer}
    <nav className="command-dock" aria-label="Legacy Reserve navigation">
      {customerPrimary.map((item, index) => { const Icon = icons[index]; return <Link
        key={item.href} href={item.href} prefetch={false}
        className={item.label === "Aethelios" ? "command-concierge" : undefined}
        aria-current={world === item.label ? "page" : undefined}>
        <span className="command-icon"><Icon size={21} strokeWidth={1.5}/></span>
        <span>{item.label}</span>
      </Link>; })}
    </nav>
  </div>;
}
