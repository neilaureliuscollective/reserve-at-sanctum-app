import { squareConfig } from "./config";
import { squareFetch } from "./client";
import type { SquareBooking } from "./types";

export function squareBookingsStatus() {
  const config = squareConfig();
  return {
    channel: config.bookingsEnabled ? ("square" as const) : ("internal" as const),
    enabled: config.bookingsEnabled,
    note: config.bookingsEnabled
      ? "Square Bookings is enabled for this environment."
      : "Visits are booked through Legacy Reserve. Square Appointments is not connected.",
  };
}

export async function searchSquareAvailability(body: {
  startAt: string;
  endAt: string;
  locationId?: string;
  segmentFilters?: unknown[];
}) {
  if (!squareConfig().bookingsEnabled) {
    return { enabled: false as const, reason: "not_configured" as const };
  }
  return squareFetch<{ availabilities?: unknown[] }>("/v2/bookings/availability/search", {
    method: "POST",
    body: {
      query: {
        filter: {
          start_at_range: { start_at: body.startAt, end_at: body.endAt },
          location_id: body.locationId,
          segment_filters: body.segmentFilters,
        },
      },
    },
  });
}

export async function createSquareBooking(body: unknown, key?: string) {
  if (!squareConfig().bookingsEnabled) {
    return { enabled: false as const, reason: "not_configured" as const };
  }
  return squareFetch<{ booking?: SquareBooking }>("/v2/bookings", {
    method: "POST",
    body,
    idempotencyKey: key,
  });
}

export async function retrieveSquareBooking(id: string) {
  if (!squareConfig().bookingsEnabled) {
    return { enabled: false as const, reason: "not_configured" as const };
  }
  return squareFetch<{ booking?: SquareBooking }>(`/v2/bookings/${id}`);
}

export async function updateSquareBooking(id: string, body: unknown, key?: string) {
  if (!squareConfig().bookingsEnabled) {
    return { enabled: false as const, reason: "not_configured" as const };
  }
  return squareFetch<{ booking?: SquareBooking }>(`/v2/bookings/${id}`, {
    method: "PUT",
    body,
    idempotencyKey: key,
  });
}

export async function cancelSquareBooking(id: string, key?: string) {
  if (!squareConfig().bookingsEnabled) {
    return { enabled: false as const, reason: "not_configured" as const };
  }
  return squareFetch<{ booking?: SquareBooking }>(`/v2/bookings/${id}/cancel`, {
    method: "POST",
    body: {},
    idempotencyKey: key,
  });
}
