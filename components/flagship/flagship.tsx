import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { productConcepts } from "@/lib/product-concepts";
import { Action } from "./action";
import { Direction } from "./direction";
import { PublicFooter } from "./public-footer";
import styles from "./flagship.module.css";
export function Flagship() {
 const signature=productConcepts[0];
 return <>
 <noscript><style>{`body:has(main[data-lr-flagship]) div[hidden]:has(> main[data-lr-flagship]) { display: block; } body:has(main[data-lr-flagship]) :is(.imperial-loading, .reserve-no-script, [data-lr-directions]) { display: none; }`}</style></noscript>
 <main id="main" data-lr-flagship className={styles.main}>
  <section className={styles.hero} aria-labelledby="flagship-title">
   <div className={styles.heroCopy}><p className={styles.eyebrow}>THE LEGACY RESERVE STANDARD</p><h1 id="flagship-title">Built for<br/><span>Presence.</span></h1><p className={styles.heroLead}>Refined essentials for a more intentional life.</p><p className={styles.heroDescription}>Products, personal routines and a longer view of wellbeing. Your presence. Your performance. Your Reserve.</p><div className={styles.actions}><Action href="/shop">Explore the Collection</Action><Action href="/enter" secondary>Enter Your Reserve</Action></div><p className={styles.heroFoot}>A PERSONAL ECOSYSTEM. WHEREVER YOU ARE.</p></div>
   <figure className={styles.heroScene}><Image src="/images/neil/ritual-plinth.webp" alt="Illustrative green and gold Legacy Reserve architectural environment" fill preload sizes="(max-width: 760px) 100vw, (max-width: 1440px) 48vw, 680px"/><div className={styles.heroSceneType} aria-hidden="true"><span>THE ART OF</span><strong>the daily ritual.</strong><i/></div><figcaption>ILLUSTRATIVE BRAND ENVIRONMENT</figcaption></figure>
  </section>
  <section className={styles.standard} aria-label="The Reserve standard">{[{n:"01",name:"Presence",text:"Care in how you show up."},{n:"02",name:"Discipline",text:"Purpose in what you repeat."},{n:"03",name:"Perspective",text:"A longer view of who you become."}].map(item=><div key={item.n}><span>{item.n}</span><h2>{item.name}</h2><p>{item.text}</p></div>)}</section>
  <section id="the-collection" className={styles.collection} aria-labelledby="collection-title">
   <header className={styles.sectionHead}><div><p className={styles.eyebrow}>01 / REFINED ESSENTIALS</p><h2 id="collection-title">A ritual.<br/><em>A signature.</em></h2></div><p>Explore the collection direction. Grooming, hydration and performance concepts shaped around your daily standard.</p></header>
   <div className={styles.signature}>
    <div className={styles.signatureImage}><span className={styles.imageIndex}>LEGACY RESERVE / SIGNATURE 01</span><Image src={signature.src} alt={signature.alt} fill sizes="(max-width: 760px) 70vw, 35vw"/><span className={styles.imageNote}>PREVIOUS PACKAGING CONCEPT</span></div>
    <div className={styles.signatureCopy}><p className={styles.eyebrow}>PRESENCE / HAIR & BEARD</p><h3>Virelis</h3><p className={styles.signatureLead}>The beginning of a daily standard.</p><p>Discover the signature hair and beard oil concept that started a larger vision for Legacy Reserve.</p><Action href="/shop/vitalis">Explore Virelis</Action><small>Former Vitalis packaging shown. Virelis is the hair & beard oil; Legacy Reserve Vitalis is the separate wellness world. Final packaging, pricing and availability are in preparation.</small></div>
   </div>
   <div className={styles.productGrid}>{productConcepts.slice(1,4).map(product=><Link prefetch={false} key={product.id} href={`/shop/${product.id}`} className={styles.product}><div className={styles.productImage}><Image src={product.src} alt={product.alt} fill sizes="(max-width: 760px) 80vw, 27vw"/></div><div className={styles.productName}><h3>{product.name}</h3><ArrowUpRight size={20} aria-hidden="true"/></div><p>{product.description}</p><small>PRODUCT CONCEPT · PACKAGING PREVIEW</small></Link>)}</div>
   <div className={styles.collectionEnd}><p>A first look. Explore current availability inside the Collection.</p><Action href="/shop" secondary>View the Collection</Action></div>
  </section>
  <section className={styles.philosophy} data-lr-theme="atmosphere" aria-labelledby="philosophy-title">
   <div className={styles.philosophyCopy}><p className={styles.eyebrow}>02 / THE LARGER VISION</p><h2 id="philosophy-title">It began<br/>with a bottle.<br/><em>It became<br/>a bigger vision.</em></h2><p>Legacy Reserve brings the essentials and the everyday practice into one personal ecosystem. Built around presence, performance and wellbeing.</p><Action href="/founder/legacy-reserve" secondary>Meet Neil Stutes, Founder</Action></div>
   <figure className={styles.founderImage}><Image src="/images/founder/neil-legacy-reserve-v2.webp" alt="AI-recreated Legacy Reserve portrait environment based on founder Neil Stutes’s reference photograph" fill sizes="(max-width: 760px) 100vw, 45vw"/><figcaption>FOUNDER PORTRAIT / AI-RECREATED ENVIRONMENT</figcaption></figure>
  </section>
  <section id="pathways" className={styles.reserve} aria-labelledby="reserve-title">
   <div className={styles.reserveCopy}><p className={styles.eyebrow}>03 / YOUR PERSONAL RESERVE</p><h2 id="reserve-title">The standard<br/>travels with you.</h2><p>Your Reserve is a private place to choose your direction, build your routines and return to what matters.</p><Link prefetch={false} href="/discover/aethelios" className={styles.conciergeLink} id="intelligence"><span>AETHELIOS / YOUR DIGITAL CONCIERGE</span><strong>A clearer next step.<ArrowUpRight size={22} aria-hidden="true"/></strong><p>Explore how Aethelios connects your direction with the Reserve tools.</p></Link></div><Direction/>
  </section>
  <section id="vitalis" className={styles.wellness} data-lr-theme="dark" aria-labelledby="wellness-title"><div><p className={styles.eyebrow}>04 / LEGACY RESERVE VITALIS</p><h2 id="wellness-title">Wellbeing.<br/><em>With a longer view.</em></h2></div><div><p>Start with sleep consistency, everyday movement or meal preparation. Set a weekly target. Keep a rhythm worth returning to.</p><p className={styles.wellnessStatus}>FREE WELLNESS PILOT AVAILABLE</p><div className={styles.actions}><Action href="/vitalis/journey">Start your free wellness rhythm</Action><Action href="/vitalis" secondary>Explore the Vitalis vision</Action></div><small>Health intelligence and qualified clinical connections are planned.</small></div></section>
  <section id="sanctum" className={styles.membership} aria-labelledby="membership-title"><div><p className={styles.eyebrow}>05 / BELONGING & CONNECTION</p><h2 id="membership-title">Make it<br/><em>your Reserve.</em></h2><p>Personal routines and the free Vitalis pilot are available. Paid digital membership is in preparation.</p><div className={styles.actions}><Action href="/enter">Enter Your Reserve</Action><Action href="/discover/membership" secondary>Explore membership</Action></div></div><div className={styles.experiences}><p className={styles.eyebrow}>THE OPTIONAL PHYSICAL WORLD</p><Link prefetch={false} href="/visit"><span><strong>Sanctum</strong><small>Explore destinations & published availability</small></span><ArrowUpRight size={22} aria-hidden="true"/></Link><Link prefetch={false} href="/fix-it-shop"><span><strong>Fix It Shop</strong><small>Katie Guidry’s independent men’s salon experience</small></span><ArrowUpRight size={22} aria-hidden="true"/></Link><p>Your digital Reserve begins wherever you are.</p></div></section>
 </main><PublicFooter/>
 </>;
}
