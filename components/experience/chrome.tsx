"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { brand } from "@/lib/brand";

import {
  customerDestinations,
  customerPrimary,
  destinationActive,
} from "@/lib/experience/customer-os";
import { MotionMode } from "./motion-mode";

export function ExperienceChrome({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  const path = usePathname();
  const arrival = path === "/";
  const work = path.startsWith("/studio");
  if (work) return <>{children}</>;
  const immersive = [
    "/home",
    "/vitalis",
    "/vitalis/membership",
    "/vitalis/journey",
    "/pathways",
    "/aethelios",
    "/visit",
    "/membership",
    "/book",
    "/shop",
    "/my-reserve",
    "/my-visit",
    "/chair",
    "/profile",
    "/sanctum-mirror",
    "/mirror",
  ].includes(path);
  return (
    <>
      {arrival && <MotionMode />}
      {!arrival && (
        <>
          <a className="skip" href="#main">
            Skip to content
          </a>
          <header className="experience-header">
            <Link prefetch={false} href="/home" className="experience-brand">
              <Image src={brand.mark} alt="" width={48} height={48} />
              <span>
                {brand.wordmark}
                <small>YOUR STANDARD. YOUR RESERVE.</small>
              </span>
            </Link>
            <nav aria-label="Legacy Reserve navigation">
              {customerPrimary.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={
                    destinationActive(path, item.href) ? "page" : undefined
                  }
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <Link
              href="/aethelios"
              className="concierge-launch"
              aria-label="Open Aethelios concierge"
            >
              Aethelios ↗
            </Link>
            <details
              className="experience-menu"
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.currentTarget.open = false;
                  event.currentTarget
                    .querySelector<HTMLElement>("summary")
                    ?.focus();
                }
              }}
              onClick={(event) => {
                if ((event.target as HTMLElement).closest("a"))
                  event.currentTarget.open = false;
              }}
            >
              <summary>Menu</summary>
              <nav aria-label="More destinations">
                <MotionMode />
                {customerDestinations.map((item) => (
                  <Link
                    key={`menu-${item.href}`}
                    href={item.href}
                    prefetch={
                      item.href === "/account" || item.href === "/my-reserve"
                        ? false
                        : undefined
                    }
                  >
                    {item.label}
                  </Link>
                ))}
                <Link href="/fix-it-shop">Fix It Shop</Link>
                <Link href="/gent-ascend">Gent Ascend Collective</Link>
                <Link prefetch={false} href="/my-visit">
                  Your visit
                </Link>
                <Link prefetch={false} href="/profile">
                  Your profile
                </Link>
                <Link href="/setup?help=1">Install help</Link>
                <Link prefetch={false} href="/signin">
                  Account sign-in
                </Link>
                <Link href="/?replay=1">Replay arrival</Link>
              </nav>
            </details>
          </header>
        </>
      )}
      {children}
      {!arrival && !work && !immersive && footer}
    </>
  );
}
