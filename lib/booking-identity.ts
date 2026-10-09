import type { MetadataRoute } from "next";
import { safeDestination } from "./experience/entry";
export type BookingIdentity = {
  name: string;
  providerId: string;
  founder: string;
  base: string;
  book: string;
  visits: string;
  signin: string;
  manifest: string;
  theme: string;
};
export function providerIdentity(
  slug: string,
  providerId: string,
  name: string,
  professional: string,
  theme: string,
): BookingIdentity {
  const base = `/providers/${slug}/app`;
  return {
    name,
    providerId,
    founder: professional,
    base,
    book: base + "/book",
    visits: base + "/appointments",
    signin: base + "/signin",
    manifest: `/providers/${slug}/booking.webmanifest`,
    theme,
  };
}
export function identityDestination(
  identity: BookingIdentity,
  value?: string | null,
) {
  const url = new URL(safeDestination(value), "https://reserve.invalid");
  return url.pathname === identity.base ||
    url.pathname.startsWith(identity.base + "/")
    ? url.pathname + url.search + url.hash
    : identity.visits;
}
export function providerEntrance(next: string) {
  const path = new URL(safeDestination(next), "https://reserve.invalid")
    .pathname;
  const match = path.match(
    /^\/providers\/([a-z0-9][a-z0-9-]{1,58}[a-z0-9])(?:\/|$)/,
  );
  return match ? `/providers/${match[1]}/app/signin` : null;
}
export function recoveryDestination(value: unknown) {
  if (value === "/fix-it-shop/app/reset-password") return value;
  if (typeof value !== "string") return "/reset-password";
  const url = new URL(safeDestination(value), "https://reserve.invalid");
  return /^\/providers\/[a-z0-9][a-z0-9-]{1,58}[a-z0-9]\/app\/reset-password$/.test(
    url.pathname,
  )
    ? url.pathname
    : "/reset-password";
}
export function providerManifest(
  identity: BookingIdentity,
  icon: (size: number) => string,
): MetadataRoute.Manifest {
  return {
    id: identity.base,
    name: identity.name,
    short_name: identity.name.slice(0, 30),
    description: `Book and manage appointments with ${identity.founder}.`,
    start_url: identity.base,
    scope: identity.base.slice(0, -4) + "/",
    display: "standalone",
    background_color: "#070b10",
    theme_color: identity.theme,
    icons: [192, 512].map((size) => ({
      src: icon(size),
      sizes: `${size}x${size}`,
      type: "image/png",
      purpose: "any",
    })),
    shortcuts: [
      { name: "Book a visit", url: identity.book },
      { name: "My appointments", url: identity.visits },
    ],
  };
}
