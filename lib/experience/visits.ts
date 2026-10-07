import type { Actor } from "../booking";
import { BookingError } from "../booking";
import type { Queryable, Row } from "../db";
import type { GroomingBlueprint } from "../grooming";

export type VisitSummary = Row & {
  id: string;
  provider_id: string;
  service_id: string;
  service_name: string;
  provider_name: string;
  starts_at: string | Date;
  ends_at: string | Date;
  status: string;
  rebook_available: boolean;
  location_id: string | null;
  location_name: string | null;
  location_timezone: string | null;
};
export type SavedDirection = Row & {
  blueprint: GroomingBlueprint;
  updated_at: string | Date;
};
const projection = `SELECT a.id,a.provider_id,a.service_id,a.location_id,l.short_name AS location_name,l.timezone AS location_timezone,a.starts_at,a.ends_at,a.status,
  s.name AS service_name,p.name AS provider_name,(s.enabled AND p.enabled AND s.provider_id=a.provider_id AND l.enabled AND l.booking_enabled AND EXISTS (SELECT 1 FROM reserve_provider_locations pl WHERE pl.provider_id=p.id AND pl.location_id=a.location_id)) AS rebook_available
  FROM reserve_appointments a JOIN reserve_services s ON s.id=a.service_id
  JOIN reserve_providers p ON p.id=a.provider_id LEFT JOIN reserve_locations l ON l.id=a.location_id`;

// Presentation adapter for the reviewed legacy schema. Never accept a browser client ID.
// Future tenant/customer scope must come from the operating-system authorization layer.
export async function readVisitContinuity(
  db: Queryable,
  actor: Actor,
  selectedId?: string,
  now = new Date(),
): Promise<{
  next: VisitSummary | null;
  previous: VisitSummary | null;
  selected: VisitSummary | null;
}> {
  if (actor.role !== "client")
    throw new BookingError(
      "Your client visits are available in your client account.",
      403,
    );
  const [nextRows, previousRows, selectedRows] = await Promise.all([
    db.query<VisitSummary>(
      `${projection} WHERE a.client_id=$1 AND a.status='confirmed' AND a.ends_at>$2 ORDER BY a.starts_at ASC LIMIT 1`,
      [actor.id, now],
    ),
    db.query<VisitSummary>(
      `${projection} WHERE a.client_id=$1 AND a.status IN ('confirmed','completed') AND a.ends_at<=$2 ORDER BY a.ends_at DESC LIMIT 1`,
      [actor.id, now],
    ),
    selectedId
      ? db.query<VisitSummary>(
          `${projection} WHERE a.client_id=$1 AND a.id=$2 LIMIT 1`,
          [actor.id, selectedId],
        )
      : Promise.resolve([]),
  ]);
  return {
    next: nextRows[0] ?? null,
    previous: previousRows[0] ?? null,
    selected: selectedRows[0] ?? null,
  };
}
export async function readSavedDirection(db: Queryable, actor: Actor) {
  if (actor.role !== "client")
    throw new BookingError("Client access is required.", 403);
  const rows = await db.query<SavedDirection>(
    "SELECT blueprint,updated_at FROM reserve_grooming_profiles WHERE user_id=$1 LIMIT 1",
    [actor.id],
  );
  return rows[0] ?? null;
}
export function visitStage(visit: VisitSummary, now = new Date()) {
  if (visit.status === "completed") return "completed";
  if (visit.status !== "confirmed") return "cancelled";
  if (new Date(visit.starts_at).getTime() > now.getTime()) return "before";
  if (new Date(visit.ends_at).getTime() > now.getTime()) return "during";
  return "elapsed";
}
export function rebookPath(visit: VisitSummary) {
  return visit.rebook_available
    ? `/book?service=${encodeURIComponent(visit.service_id)}&location=${encodeURIComponent(visit.location_id || "eunice")}`
    : "/book";
}
