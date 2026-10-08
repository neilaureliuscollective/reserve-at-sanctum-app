import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { brand } from "@/lib/brand";
import { founderWorlds, type FounderWorldId } from "@/lib/experience/founder-worlds";
import { FounderExplorer, FounderMotion } from "./founder-explorer";

export function FounderWorldSwitch({ current }: { current?: FounderWorldId }) {
  return <nav className="founder-world-switch" aria-label="Founder worlds"><Link href={founderWorlds.legacy.route} aria-current={current === "legacy" ? "page" : undefined}>Legacy Reserve</Link><Link href={founderWorlds.technology.route} aria-current={current === "technology" ? "page" : undefined}>Aethelios Technologies</Link></nav>;
}

export function FounderWorld({ world }: { world: FounderWorldId }) {
  const content = founderWorlds[world];
  const other = founderWorlds[world === "legacy" ? "technology" : "legacy"];
  return <main id="main" className="founder-world" data-founder-world={world}>
    <FounderMotion />
    <div className="founder-topline"><Link href="/founder" className="founder-back"><ArrowLeft size={14}/> NEIL STUTES / THE FOUNDER</Link><FounderWorldSwitch current={world}/></div>
    <section className="founder-arrival" aria-labelledby="founder-title">
      <div className="founder-arrival-environment" aria-hidden="true"><i/><i/><i/><div className="founder-arrival-grid"/></div>
      <div className="founder-arrival-copy"><p className="founder-label">NEIL STUTES / FOUNDER OF {content.name.toUpperCase()}</p><h1 id="founder-title">{content.headline[0]}<br/><em>{content.headline[1]}</em></h1><p className="founder-intro">{content.intro}</p><div className="founder-actions"><Link prefetch={false} href={content.primary.href} className="button button-gold">{content.primary.label}<ArrowUpRight size={16}/></Link><a className="founder-text-link" href="#origin">Explore the vision ↓</a></div></div>
      <div className="founder-portrait-stage"><div className="founder-portrait-frame" aria-hidden="true"/>{world === "legacy" ? <Image className="founder-background-crest" src={brand.official} alt="" width={360} height={360} sizes="(max-width: 700px) 150px, 290px"/> : <div className="founder-background-signal" aria-hidden="true"><i/><i/><i/><span>A</span></div>}<Image className="founder-portrait" src="/images/founder/neil-stutes-original.jpg" alt="Neil Stutes, founder of Legacy Reserve and Aethelios Technologies, seated in a green leather chair" width={1536} height={1536} sizes="(max-width: 700px) 100vw, 55vw" unoptimized preload/><span className="founder-portrait-caption">FOUNDER PORTRAIT / COMPOSED BRAND ENVIRONMENT</span></div>
      <div className="founder-arrival-signature"><span>{content.name.toUpperCase()}</span><span>THE FOUNDER’S VISION / 01</span></div>
    </section>
    <nav className="founder-chapters" aria-label="Founder chapters"><a href="#origin">01 / Origin</a><a href="#philosophy">02 / Principles</a><a href="#ecosystem">03 / {world === "legacy" ? "Ecosystem" : "Horizon"}</a><a href="#invitation">04 / Invitation</a></nav>
    <section id="origin" className="founder-origin" aria-labelledby="founder-origin-title"><div className="founder-origin-object" aria-hidden="true"><div/><span>{world === "legacy" ? "LR" : "A"}</span><small>{world === "legacy" ? "THE STANDARD" : "THE POSSIBILITY"}</small></div><div className="founder-origin-copy"><p className="founder-label">01 / THE ORIGIN</p><h2 id="founder-origin-title">{content.originTitle}</h2><p>{content.origin}</p><span className="founder-origin-note">{content.originNote}</span></div></section>
    <section id="philosophy" className="founder-principles" aria-labelledby="founder-principles-title"><header><p className="founder-label">02 / THE PRINCIPLES</p><h2 id="founder-principles-title">{world === "legacy" ? "A standard behind every decision." : "A purpose behind every system."}</h2></header><div>{content.principles.map((principle, index) => <article key={principle.title}><span>0{index + 1}</span><h3>{principle.title}</h3><p>{principle.copy}</p></article>)}</div></section>
    <FounderExplorer world={world} paths={content.paths}/>
    <section id="invitation" className="founder-invitation" aria-labelledby="founder-invitation-title"><p className="founder-label">04 / YOUR INVITATION</p><h2 id="founder-invitation-title">{content.invitation}</h2><p>{content.invitationCopy}</p><div className="founder-actions"><Link prefetch={false} href={content.primary.href} className="button button-gold">{content.primary.label}<ArrowUpRight size={16}/></Link><Link prefetch={false} href={content.secondary.href} className="founder-text-link">{content.secondary.label}<ArrowUpRight size={15}/></Link></div><small>{content.availability}</small></section>
    <section className="founder-bridge" aria-labelledby="founder-bridge-title"><div><p className="founder-label">ONE FOUNDER / TWO DISTINCT WORLDS</p><h2 id="founder-bridge-title">{content.bridgeTitle}</h2><p>{content.bridgeCopy}</p></div><Link href={other.route} className="founder-bridge-link"><span>ENTER THE OTHER WORLD</span><strong>{other.name}</strong><ArrowUpRight size={24}/></Link></section>
    <footer className="founder-signature"><span>NEIL STUTES</span><span>FOUNDER / LEGACY RESERVE + AETHELIOS TECHNOLOGIES</span><Link href="/discover">Return to Reserve ↗</Link></footer>
  </main>;
}
