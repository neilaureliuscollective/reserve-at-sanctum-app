import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, ArrowLeft } from "lucide-react";
import { founderContent as f } from "@/lib/founder-content";
import { FounderPortrait } from "@/components/founder-feature";
import { FounderMotion } from "@/components/founder-motion";
import styles from "@/components/founder-story.module.css";

export const metadata: Metadata = {
  title: f.seo.title, description: f.seo.description,
  alternates: { canonical: f.storyHref },
  openGraph: { title: f.seo.title, description: f.seo.description, url: f.storyHref, type: "profile", firstName: "Katie", lastName: "Guidry", images: [{ url: f.portrait?.src ?? f.seo.socialImage, alt: f.portrait?.alt ?? "Fix It Shop’s approved emblem" }] },
  twitter: { card: "summary_large_image", title: f.seo.title, description: f.seo.description, images: [f.portrait?.src ?? f.seo.socialImage] },
};
export default function FounderPage() {
  const [intro, name, standard, service, invitation] = f.chapters;
  const origin = process.env.APP_ORIGIN || "https://www.reserveatsanctum.app";
  const schema = { "@context": "https://schema.org", "@type": "ProfilePage", url: new URL(f.storyHref, origin).href, mainEntity: { "@type": "Person", name: f.name, jobTitle: f.title, description: f.biography, ...(f.portrait ? { image: new URL(f.portrait.src, origin).href } : {}), worksFor: { "@type": "Organization", name: "Fix It Shop", url: new URL("/fix-it-shop/app", origin).href } } };
  return <main id="main" className={`${styles.world} ${styles.story}`}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }}/>
    <div className={styles.topline}><Link href="/fix-it-shop/app"><ArrowLeft size={14}/> BACK TO THE SHOP</Link><span>A PERSONAL STORY / FIX IT SHOP</span><FounderMotion/></div>
    <section id={intro.id} className={styles.hero} aria-labelledby="founder-title">
      <div className={styles.heroCopy}><p className={styles.eyebrow}>THE WOMAN BEHIND THE STANDARD</p><h1 id="founder-title">{f.name.split(" ")[0]}<br/><em>{f.name.split(" ").slice(1).join(" ")}.</em></h1><p className={styles.identity}>{f.title}<span>{f.service}</span></p><p className={styles.intro}>{intro.paragraphs[0]}</p><p className={styles.biography}>{f.biography}</p><a href="#the-name" className={styles.storyLink}>The story behind the name <span><ArrowDown size={19}/></span></a></div>
      <div className={styles.heroPicture}><FounderPortrait priority/><span className={styles.pictureIndex}>{f.location} / Founder & Owner</span></div>
      <div className={styles.heroFoot}><span>01 — THE FOUNDER</span><p>{intro.paragraphs[1]}</p></div>
    </section>
    <nav className={styles.chapters} aria-label="Founder story chapters">{f.chapters.map((chapter, index) => <a href={`#${chapter.id}`} key={chapter.id}><span>0{index + 1}</span>{chapter.label}</a>)}</nav>
    <section id={name.id} className={styles.bookChapter} aria-labelledby="name-title">
      <div className={styles.sectionHeading} data-reveal><p className={styles.eyebrow}>02 / THE STORY BEHIND THE NAME</p><h2 id="name-title">{name.headline.split(" more ")[0]}<br/><em>more {name.headline.split(" more ")[1]}</em></h2></div>
      <div className={styles.bookGrid}>
        <figure className={styles.bookStage} data-reveal>{f.bookPhotograph ? <Image src={f.bookPhotograph.src} alt={f.bookPhotograph.alt} fill sizes="(max-width: 720px) 90vw, 45vw" style={{objectPosition:f.bookPhotograph.position ?? "center"}}/> : <div className={styles.bookReservation}><span className={styles.bookDate}>A FAMILY KEEPSAKE / 1981</span><div className={styles.bookTitle}><span>THE BOOK BEHIND THE NAME</span><p>Mr. Bell’s<br/><em>Fixit Shop</em></p><small>Ronne Peltzman · Originally published 1981</small></div><span className={styles.bookReserved}>Reserved for a photograph of Katie’s treasured family copy.</span></div>}<figcaption>{f.bookPhotograph ? "Katie’s preserved family copy." : "Editorial placeholder · Not an image of the original book."}</figcaption></figure>
        <div className={styles.bookCopy} data-reveal><span className={styles.marginNote}>A NAME WITH A HISTORY</span>{name.paragraphs.map(p => <p key={p}>{p}</p>)}<div className={styles.bookConnection}><span>FROM A FAMILY BOOK TO A PERSONAL PURPOSE</span><p>The thing being cared for matters.<br/><em>The person matters more.</em></p></div></div>
      </div>
    </section>
    <section id={standard.id} className={styles.standard} aria-labelledby="standard-title"><div className={styles.standardTop} data-reveal><p className={styles.eyebrow}>03 / THE STANDARD</p><h2 id="standard-title">{standard.headline.split(". ")[0]}.<br/><em>{standard.headline.split(". ")[1]}</em></h2><div className={styles.standardBody}>{standard.paragraphs.map(p => <p key={p}>{p}</p>)}</div></div><div className={styles.principles} data-reveal>{[["01", "Precision", "Attention to shape, texture, and finish."],["02", "Respect", "Listen to the person. Make room for their pace."],["03", "Consistency", "Care that deserves to be part of your routine."]].map(([n,title,body]) => <div key={n}><span>{n}</span><h3>{title}</h3><p>{body}</p></div>)}</div></section>
    <section id={service.id} className={styles.service} aria-labelledby="service-title"><div className={styles.serviceInscription} data-reveal><span>UNITED STATES</span><strong>MARINE<br/>CORPS</strong><span>VETERAN / KATIE GUIDRY</span><i aria-hidden="true"/></div><div data-reveal><p className={styles.eyebrow}>04 / BUILT ON SERVICE</p><h2 id="service-title">{service.headline.split(". ").map((line,i) => <span key={line}>{i > 0 && <br/>}{i === 2 ? <em>{line}</em> : line + "."}</span>)}</h2>{service.paragraphs.map(p => <p key={p}>{p}</p>)}</div>{f.militaryPhotograph && <figure className={styles.militaryPhoto}><Image src={f.militaryPhotograph.src} alt={f.militaryPhotograph.alt} width={900} height={650} sizes="90vw"/></figure>}</section>
    <section id={invitation.id} className={styles.invitation} aria-labelledby="invitation-title">{f.alternativePortraits[0] && <div className={styles.closingPortrait}><FounderPortrait asset={f.alternativePortraits[0]}/></div>}<div className={styles.invitationMark} aria-hidden="true">KG.</div><div className={styles.invitationCopy} data-reveal><p className={styles.eyebrow}>05 / YOUR PERSONAL INVITATION</p><h2 id="invitation-title">{invitation.headline.split(". ")[0]}.<br/><em>{invitation.headline.split(". ")[1]}</em></h2><p>{invitation.paragraphs[0]}</p>{f.personalQuote && <blockquote><p>{f.personalQuote.text}</p><cite>{f.personalQuote.attribution}</cite></blockquote>}<Link href={f.bookingHref} className={styles.bookingLink}>Find your time with Katie <ArrowUpRight size={22}/></Link><small>Explore the current menu and available times. Confirm only when you’re ready.</small><div className={styles.signoff}><span>{f.name}</span><span>FOUNDER & OWNER / FIX IT SHOP</span></div></div></section>
    <div className={styles.endnote}><Link href="/fix-it-shop/app">Return to Fix It Shop <ArrowUpRight size={16}/></Link><a href="#katie">Back to the beginning ↑</a></div>
  </main>;
}
