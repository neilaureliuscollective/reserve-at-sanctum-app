import Link from "next/link";
import styles from "./flagship.module.css";
import materials from "./materials.module.css";
export function PublicFooter() { return <footer className={`${styles.footer} ${materials.tokens}`}>
 <div><strong>LEGACY RESERVE</strong><p>Presence. Performance. Wellbeing.</p><small>A standard to return to.</small></div>
 <nav aria-label="Flagship footer"><Link prefetch={false} href="/shop">Collection</Link><Link prefetch={false} href="/discover/membership">Membership</Link><Link prefetch={false} href="/enter">Your account</Link><Link prefetch={false} href="/setup?help=1">Install help</Link><Link prefetch={false} href="/founder/legacy-reserve">The Founder</Link><Link prefetch={false} href="/fix-it-shop">Fix It Shop</Link></nav>
 <div className={styles.footerEnd}><span>ROOTED IN PURPOSE. BUILT FOR WHAT’S NEXT.</span><a href="#main">Back to the beginning ↑</a></div>
 </footer>; }
