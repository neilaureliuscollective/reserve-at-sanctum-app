import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="footer-provenance">
          <Image className="footer-crest" src="/images/reserve-petrol-official.webp" width={100} height={100} alt="" sizes="100px" />
          <div>
          <p className="eyebrow">EUNICE, LOUISIANA</p>
          <p className="footer-title">
            Rooted here.
            <br />
            <em>Built for more.</em>
          </p>
          </div>
        </div>
        <div className="footer-links">
          <Link href="/fix-it-shop">
            Fix It Shop <ArrowUpRight size={16} />
          </Link>
          <Link href="/gent-ascend">
            Neil’s Gent Ascend <ArrowUpRight size={16} />
          </Link>
          <Link href="/account">
            Your visits <ArrowUpRight size={16} />
          </Link>
          <Link href="/studio">
            Studio access <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} The Reserve at Sanctum</span>
        <span>Fix It Shop × GENT Ascend Collective</span>
        <span>Private development preview</span>
      </div>
    </footer>
  );
}
