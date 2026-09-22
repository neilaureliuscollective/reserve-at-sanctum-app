"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { Menu, X, ArrowUpRight, UserRound } from "lucide-react";
export function Mark() {
  return (
    <svg viewBox="0 0 40 48" aria-hidden="true">
      <path
        d="M20 2 35 11v21L20 46 5 32V11Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path d="m20 9 3 12 9 3-9 3-3 12-3-12-9-3 9-3Z" fill="currentColor" />
    </svg>
  );
}
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
          aria-label="The Reserve at Sanctum home"
        >
          <Mark />
          <span>
            <small>THE</small>
            <strong>RESERVE</strong>
            <small>AT SANCTUM</small>
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
            className={path === "/fix-it-shop" ? "active" : ""}
            aria-current={path === "/fix-it-shop" ? "page" : undefined}
            href="/fix-it-shop"
            onClick={() => setOpen(false)}
          >
            Fix It Shop
          </Link>
          <Link
            className={path === "/aurelius" ? "active" : ""}
            aria-current={path === "/aurelius" ? "page" : undefined}
            href="/aurelius"
            onClick={() => setOpen(false)}
          >
            Aurelius Collective
          </Link>
          <Link href="/visit" onClick={() => setOpen(false)}>
            Visit us
          </Link>
          <Link href="/account" className="mobile-account" onClick={() => setOpen(false)}>Your visits</Link>
        </nav>
        <div className="header-actions">
          <Link
            href="/account"
            className="account-link"
            aria-label="Your visits"
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
