"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight } from "lucide-react";

export function KatieBookingShortcut({ href, label }: { href: string; label: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const hero = document.querySelector(".katie-hero");
    if (!hero) return;
    const services = document.querySelector("#services");
    let heroVisible = true, servicesVisible = false;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.target === hero) heroVisible = entry.isIntersecting;
        if (entry.target === services) servicesVisible = entry.isIntersecting;
      }
      setVisible(!heroVisible && !servicesVisible);
    });
    observer.observe(hero);
    if (services) observer.observe(services);
    return () => observer.disconnect();
  }, []);
  // Keep the viewport shortcut outside the page's cinematic containing blocks.
  return visible ? createPortal(<aside className="katie-booking-shortcut" aria-label="Katie’s visit shortcut"><a href={href}><span>FIX IT SHOP / KATIE GUIDRY</span><strong>{label}<ArrowUpRight size={16}/></strong></a></aside>, document.body) : null;
}
