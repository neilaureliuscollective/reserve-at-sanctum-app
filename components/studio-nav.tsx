"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
