"use client";
import { usePathname } from "next/navigation";
export function StatusRibbon({ setup, checkout }: { setup: boolean; checkout: boolean }) {
  const path = usePathname();
  const digital = path.startsWith("/discover") || path === "/home" || path === "/pathways";
  return <aside className="preview-ribbon" aria-label="Legacy Reserve status">{setup ? "PRIVATE SETUP" : "PRIVATE PILOT"} <span>·</span> {digital ? "Personal tools available · Paid membership in preparation" : checkout ? "Appointments remain in pilot · Purchases require Shopify checkout" : "Appointments and payments are not yet live"}</aside>;
}
