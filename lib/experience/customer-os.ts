export const customerPrimary = [
  { href: "/home", label: "Reserve" },
  { href: "/pathways", label: "Pathways" },
  { href: "/vitalis", label: "Vitalis" },
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
  { href: "/aethelios", label: "Aethelios" },
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
