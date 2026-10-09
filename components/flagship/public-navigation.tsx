"use client";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { Menu, ArrowUpRight } from "lucide-react";
import { brand } from "@/lib/brand";
import { MotionMode } from "@/components/experience/motion-mode";
import styles from "./flagship.module.css";
const links = [{href:"/shop",label:"Collection"},{href:"/discover#pathways",label:"Your Reserve"},{href:"/vitalis",label:"Vitalis"},{href:"/discover/membership",label:"Membership"}];
export function PublicNavigation() {
  const menu = useRef<HTMLDetailsElement>(null);
  return <>
    <a href="#main" className={styles.skip}>Skip to content</a>
    <header className={styles.header}>
      <Link prefetch={false} href="/discover" className={styles.brand} aria-label="Legacy Reserve home"><Image src={brand.mark} alt="" width={40} height={40}/><span>LEGACY RESERVE<small>A STANDARD TO RETURN TO</small></span></Link>
      <nav className={styles.desktopNav} aria-label="Public navigation">{links.map(link => <Link prefetch={false} key={link.href} href={link.href}>{link.label}</Link>)}</nav>
      <div className={styles.navActions}><Link prefetch={false} href="/enter" className={styles.entrance}>Enter <ArrowUpRight size={16} aria-hidden="true"/></Link>
      <details ref={menu} className={styles.menu} onKeyDown={event=>{if(event.key==="Escape"){event.currentTarget.open=false;event.currentTarget.querySelector("summary")?.focus();}}} onClick={event=>{if((event.target as HTMLElement).closest("a") && menu.current) menu.current.open=false;}}>
        <summary aria-label="Open navigation menu"><Menu size={22} aria-hidden="true"/></summary>
        <nav aria-label="All public destinations">{links.map(link=><Link key={link.href} prefetch={false} href={link.href}>{link.label}<ArrowUpRight size={16} aria-hidden="true"/></Link>)}<Link prefetch={false} href="/founder/legacy-reserve">Meet the Founder</Link><Link prefetch={false} href="/visit">Sanctum destinations</Link><Link prefetch={false} href="/fix-it-shop">Fix It Shop · Katie Guidry</Link><Link prefetch={false} href="/setup?help=1">Install your Reserve</Link><Link prefetch={false} href="/signin">Sign in</Link><MotionMode/></nav>
      </details></div>
    </header>
  </>;
}
