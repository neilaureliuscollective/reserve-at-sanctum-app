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
  ["/studio/content", "Content", PenLine],
  ["/studio/build", "Build Room", Hammer],
  ["/studio/clients", "Clients", UsersRound],
  ["/studio/memberships", "Membership", UsersRound],
  ["/studio/commerce", "Commerce", Settings2],
  ["/studio/operations", "Operations", Settings2],
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
      {rooms
        .filter(
          ([href]) =>
            !["/studio/memberships", "/studio/commerce"].includes(href) ||
            owner,
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
            <span>{label}</span>
          </Link>
        ))}
    </nav>
  );
}
