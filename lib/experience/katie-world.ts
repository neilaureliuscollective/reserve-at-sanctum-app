import type { SanctumDestination } from "./sanctum-directory";
import { primaryLocation } from "./locations";

/** Public presentation only. Booking still validates publication and availability. */
export function katieVisitPresentation(destinations: SanctumDestination[], unavailable = false) {
  const published = destinations.filter(destination => destination.enabled && destination.booking_enabled)
    .flatMap(destination => {
      const professional = destination.professionals.find(person => person.id === "katie");
      return professional?.services.length ? [{ destination, services: professional.services }] : [];
    });
  const fallback = destinations.find(destination => destination.id === primaryLocation.id) ?? destinations[0];
  const state = unavailable ? "unavailable" : published.length ? "open" : "preparing";
  return {
    state,
    locations: unavailable ? [] : published.map(({ destination, services }) => ({
      id: destination.id, city: destination.city, region: destination.region,
      address: destination.address, timezone: destination.timezone,
      bookingHref: `/fix-it-shop/app/book?location=${encodeURIComponent(destination.id)}&provider=katie`,
      services: services.map(service => ({ id: service.id, name: service.name, description: service.description, minutes: service.minutes, price: service.price, href: `/fix-it-shop/app/book?location=${encodeURIComponent(destination.id)}&provider=katie&service=${encodeURIComponent(service.id)}` })),
    })),
    locationLabel: unavailable ? "Location details could not refresh" : `${fallback?.city ?? primaryLocation.city}, ${fallback?.region ?? primaryLocation.region}`,
    primary: state === "open"
      ? { label: "Book with Katie", href: `/fix-it-shop/app/book?location=${encodeURIComponent(published[0].destination.id)}&provider=katie` }
      : { label: state === "unavailable" ? "Check visit details" : "Explore Katie’s services", href: "#services" },
    status: state === "open" ? "Katie’s service menu is published. Choose a service to find a time."
      : state === "unavailable" ? "Booking details could not refresh. Check again before planning your visit."
        : "Booking is in preparation. Katie’s published services and appointment times will appear here when available.",
  };
}
