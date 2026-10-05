"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Compass,
  Hammer,
  UsersRound,
  Settings2,
} from "lucide-react";
const rooms = [
  ["/studio", "Today", Compass],
  ["/studio/schedule", "Schedule", CalendarDays],
  ["/studio/build", "Build Room", Hammer],
  ["/studio/clients", "Clients", UsersRound],
  ["/studio/operations", "Operations", Settings2],
] as const;
export function StudioNav({ owner }: { owner: boolean }) {
  const path = usePathname();
  return (
    <nav className="studio-nav" aria-label="Studio rooms">
      {rooms.map(([href, label, Icon]) => (
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
            {label === "Operations" && !owner ? "Availability" : label}
          </span>
        </Link>
      ))}
    </nav>
  );
}
