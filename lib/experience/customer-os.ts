export const customerPrimary = [
  { href: "/reserve", label: "Reserve" },
  { href: "/vitalis", label: "Vitalis" },
  { href: "/concierge", label: "Aethelios" },
  { href: "/visit", label: "Sanctum" },
  { href: "/shop", label: "Collection" },
] as const;
export const publicPrimary = [
  { href: "/discover", label: "Home" },
  { href: "/discover#pathways", label: "Pathways" },
  { href: "/vitalis", label: "Vitalis" },
  { href: "/shop", label: "Collection" },
  { href: "/discover/membership", label: "Membership" },
] as const;
export const customerAccount = [
  { href: "/pathways", label: "Pathways" },
  { href: "/membership", label: "Membership" },
  { href: "/my-reserve", label: "My Reserve" },
  { href: "/book", label: "Book" },
  { href: "/chair", label: "The Chair" },
  { href: "/account", label: "Account" },
] as const;
export const customerDestinations = [...customerPrimary, ...customerAccount];
export function destinationActive(path: string, href: string) {
  return path === href || (href !== "/discover" && path.startsWith(`${href}/`));
}

/** Nested journeys keep their parent world selected in the command dock. */
export function commandWorld(path: string): typeof customerPrimary[number]["label"] {
  if (path === "/concierge" || path === "/aethelios" || path.startsWith("/discover/aethelios")) return "Aethelios";
  if (path === "/vitalis" || path.startsWith("/vitalis/")) return "Vitalis";
  if (path === "/shop" || path.startsWith("/shop/")) return "Collection";
  if (["/visit", "/book", "/chair", "/my-visit", "/fix-it-shop", "/gent-ascend", "/explore", "/sanctum-mirror", "/mirror"].some(root => path === root || path.startsWith(`${root}/`))) return "Sanctum";
  return "Reserve";
}
