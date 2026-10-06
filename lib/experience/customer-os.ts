export const customerDestinations = [
  { href: "/home", label: "Home" },
  { href: "/book", label: "Book" },
  { href: "/shop", label: "Shop" },
  { href: "/my-reserve", label: "My Reserve" },
  { href: "/chair", label: "The Chair" },
  { href: "/account", label: "Account" },
] as const;

export const customerPrimary = customerDestinations.slice(0, 4);
export const customerAccount = customerDestinations.slice(4);

export function destinationActive(path: string, href: string) {
  return path === href || path.startsWith(`${href}/`);
}
