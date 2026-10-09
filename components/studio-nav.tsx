"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  CalendarDays,
  Compass,
  Hammer,
  UsersRound,
  Settings2,
  PenLine,
} from "lucide-react";
const rooms = [
  ["/studio", "Command", Compass],
  ["/studio/schedule", "Schedule", CalendarDays],
  ["/studio/connections", "Connections", Settings2],
  ["/studio/websites", "Websites", PenLine],
  ["/studio/content", "Content", PenLine],
  ["/studio/build", "Build Room", Hammer],
  ["/studio/clients", "Clients", UsersRound],
  ["/studio/memberships", "Membership", UsersRound],
  ["/studio/vitalis", "Vitalis", Settings2],
  ["/studio/commerce", "Commerce", Settings2],
  ["/studio/operations", "Operations", Settings2],
  ["/studio/brands", "Brands", PenLine],
] as const;
export function StudioNav({ owner }: { owner: boolean }) {
  const path = usePathname();
  const nav = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = nav.current,
      active = node?.querySelector<HTMLElement>('[aria-current="page"]');
    if (node && active)
      node.scrollLeft =
        active.offsetLeft - (node.clientWidth - active.offsetWidth) / 2;
  }, [path]);
  return (
    <nav ref={nav} className="studio-nav" aria-label="Studio rooms">
      {owner && (
        <Link href="/discover">
          <span>View public website ↗</span>
        </Link>
      )}
      {rooms
        .filter(
          ([href]) =>
            owner ||
            [
              "/studio/schedule",
              "/studio/connections",
              "/studio/websites",
              "/studio/clients",
              "/studio/operations",
              "/studio/brands",
            ].includes(href),
        )
        .filter(
          ([href]) =>
            ![
              "/studio/memberships",
              "/studio/commerce",
              "/studio/vitalis",
            ].includes(href) || owner,
        )
        .map(([href, label, Icon]) => (
          <Link
            key={href}
            href={href}
            prefetch={false}
            aria-current={
              (href === "/studio" ? path === href : path.startsWith(href))
                ? "page"
                : undefined
            }
          >
            <Icon size={19} />
            <span>
              {!owner && href === "/studio/schedule"
                ? "Today"
                : !owner && href === "/studio/operations"
                  ? "Availability"
                  : label}
            </span>
          </Link>
        ))}
    </nav>
  );
}
