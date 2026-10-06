import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { brand } from "@/lib/brand";
import { locations, primaryLocation } from "@/lib/experience/locations";
export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="footer-provenance">
          <Image className="footer-crest" src={brand.mark} width={100} height={100} alt="" sizes="100px" />
          <div>
          <p className="eyebrow">{locationLine()}</p>
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
            GENT Ascend Collective <ArrowUpRight size={16} />
          </Link>
          <Link prefetch={false} href="/account">
            Your visits <ArrowUpRight size={16} />
          </Link>
          <Link prefetch={false} href="/studio">
            Studio access <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} {brand.legal}</span>
        <span>Fix It Shop × GENT Ascend Collective</span>
        <span>Private development preview</span>
      </div>
    </footer>
  );
}

function locationLine() {
  const operating = locations.filter((location) => location.status === "operating");
  return (operating[0] ?? primaryLocation).name.toUpperCase();
}
