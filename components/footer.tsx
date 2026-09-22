import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div>
          <p className="eyebrow">EUNICE, LOUISIANA</p>
          <p className="footer-title">
            Rooted here.
            <br />
            <em>Built for more.</em>
          </p>
        </div>
        <div className="footer-links">
          <Link href="/fix-it-shop">
            Fix It Shop <ArrowUpRight size={16} />
          </Link>
          <Link href="/aurelius">
            Aurelius Collective <ArrowUpRight size={16} />
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
        <span>Fix It Shop × Aurelius Collective</span>
        <span>Private development preview</span>
      </div>
    </footer>
  );
}
