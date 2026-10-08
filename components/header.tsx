"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { Menu, X, ArrowUpRight, UserRound } from "lucide-react";
import { brand } from "@/lib/brand";
export function Header() {
  const menuButton = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false),
    path = usePathname();
  return (
    <>
      <a href="#main" className="skip">
        Skip to content
      </a>
      <header className="site-header" onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpen(false);
          menuButton.current?.focus();
        }
      }}>
        <Link
          className="wordmark"
          href="/"
          onClick={() => setOpen(false)}
        >
          <Image className="wordmark-seal" src={brand.mark} width={58} height={58} alt="" sizes="58px" />
          <span>
            <small>LEGACY</small>
            <strong>RESERVE</strong>
          </span>
        </Link>
        <nav
          id="main-navigation"
          aria-label="Main navigation"
          className={open ? "nav-links is-open" : "nav-links"}
        >
          <Link href="/#worlds" onClick={() => setOpen(false)}>
            The experience
          </Link>
          <Link
            className={path === "/fix-it-shop" || path === "/chair" ? "active" : ""}
            aria-current={path === "/fix-it-shop" ? "page" : undefined}
            href="/fix-it-shop"
            onClick={() => setOpen(false)}
          >
            Fix It Shop
          </Link>
          <Link
            className={path.startsWith("/founder") ? "active" : ""}
            aria-current={path.startsWith("/founder") ? "page" : undefined}
            href="/founder"
            onClick={() => setOpen(false)}
          >
            The Founder
          </Link>
          <Link href="/visit" onClick={() => setOpen(false)}>
            Visit us
          </Link>
          <Link prefetch={false} href="/profile" className="mobile-account" onClick={() => setOpen(false)}>Your profile</Link>
        </nav>
        <div className="header-actions">
          <Link prefetch={false}
            href="/profile"
            className="account-link"
            aria-label="Open your profile"
          >
            <UserRound size={19} />
          </Link>
          <Link href="/book" className="button button-gold header-book">
            Book a visit <ArrowUpRight size={16} />
          </Link>
          <button
            ref={menuButton}
            aria-controls="main-navigation"
            className="menu-toggle icon-button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </header>
    </>
  );
}
