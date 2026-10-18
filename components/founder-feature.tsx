import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { founderContent as founder, type FounderAsset } from "@/lib/founder-content";
import styles from "./founder-story.module.css";

export function FounderPortrait({ asset = founder.portrait, priority = false }: { asset?: FounderAsset | null; priority?: boolean }) {
  return <div className={styles.portrait} data-photograph={Boolean(asset)} style={asset ? { maxWidth: asset.width } : undefined}>
    {/* Preserve the complete approved composition and avoid recompressing its existing WebP. */}
    {asset ? <Image src={asset.src} alt={asset.alt} width={asset.width} height={asset.height} preload={priority} unoptimized /> : <div className={styles.reservation}><span className={styles.reservationNumber}>KG / 01</span><Image src="/images/cinematic/fix-it-seal.webp" alt="Fix It Shop’s approved blue and gold emblem" width={340} height={340} sizes="(max-width: 720px) 65vw, 30vw" /><div><span>THE PERSON BEHIND THE NAME</span><p>Katie Guidry</p><small>Portrait space reserved for Katie’s approved photograph.</small></div></div>}
    <span className={styles.imageRail} aria-hidden="true">FIX IT SHOP / A PERSONAL STANDARD</span>
  </div>;
}
export function FounderFeature() {
  return <section id="katie" className={`${styles.world} ${styles.feature}`} aria-labelledby="fis-founder-title">
    <div className={styles.featurePicture}><FounderPortrait /><span className={styles.pictureIndex}>01 / THE FOUNDER</span></div>
    <div className={styles.featureCopy}><p className={styles.eyebrow}>THE WOMAN BEHIND THE STANDARD</p><h2 id="fis-founder-title">{founder.name.split(" ")[0]}<br/><em>{founder.name.split(" ").slice(1).join(" ")}.</em></h2><p className={styles.identity}>Founder & Owner, Fix It Shop<span>{founder.service}</span></p><div className={styles.rule}/><p className={styles.intro}>A higher standard begins with the person behind it.</p><p>A treasured family book. A meaningful name. A personal approach to the care that goes into every visit.</p><a className={styles.storyLink} href={founder.storyHref}>Discover Her Story <span><ArrowUpRight size={22}/></span></a><span className={styles.location}>{founder.location} / Her business. Her standard.</span></div>
  </section>;
}
