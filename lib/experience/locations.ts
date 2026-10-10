import type { Queryable } from "../db";

export type LocationStatus = "operating" | "coming" | "planned";

export type ReserveLocation = {
  id: string;
  name: string;
  short_name: string;
  city: string;
  region: string;
  timezone: string;
  enabled: boolean;
  booking_enabled: boolean;
  address: string;
  status: LocationStatus;
  poster: string;
  crest: string;
};

// Presentation defaults. Database rows are authoritative when available.
export const locations: readonly ReserveLocation[] = [
  {
    id: "eunice",
    name: "Eunice, Louisiana",
    short_name: "Eunice",
    city: "Eunice",
    region: "Louisiana",
    timezone: "America/Chicago",
    enabled: false,
    booking_enabled: false,
    address: "",
    status: "planned",
    poster: "/images/cinematic/reserve-hall.webp",
    crest: "/brand/legacy-reserve/mark-gold.webp",
  },
  {
    id: "lafayette",
    name: "Lafayette, Louisiana",
    short_name: "Lafayette",
    city: "Lafayette",
    region: "Louisiana",
    timezone: "America/Chicago",
    enabled: false,
    booking_enabled: false,
    address: "",
    status: "planned",
    poster: "/images/cinematic/reserve-hall.webp",
    crest: "/brand/legacy-reserve/mark-gold.webp",
  },
  {
    id: "austin",
    name: "Austin, Texas",
    short_name: "Austin",
    city: "Austin",
    region: "Texas",
    timezone: "America/Chicago",
    enabled: false,
    booking_enabled: false,
    address: "",
    status: "planned",
    poster: "/images/cinematic/reserve-hall.webp",
    crest: "/brand/legacy-reserve/mark-gold.webp",
  },
  {
    id: "dallas",
    name: "Dallas, Texas",
    short_name: "Dallas",
    city: "Dallas",
    region: "Texas",
    timezone: "America/Chicago",
    enabled: false,
    booking_enabled: false,
    address: "",
    status: "planned",
    poster: "/images/cinematic/reserve-hall.webp",
    crest: "/brand/legacy-reserve/mark-gold.webp",
  },
] as const;

export const primaryLocation = locations[0];

/** @deprecated Use primaryLocation. Kept so existing imports keep compiling. */
export const eunice = {
  key: primaryLocation.id,
  name: primaryLocation.name,
  timezone: primaryLocation.timezone,
  poster: primaryLocation.poster,
  crest: primaryLocation.crest,
} as const;

export function getLocation(id: string | null | undefined) {
  return locations.find((location) => location.id === id) ?? primaryLocation;
}

export function locationDisplayName(id: string | null | undefined) {
  const location = getLocation(id);
  return `Fix It Shop — ${location.short_name}`;
}

function withPresentation(rows: ReserveLocation[]) {
  return rows.map((row) => {
    const fallback = getLocation(row.id);
    return {
      ...fallback,
      ...row,
      poster: fallback.poster,
      crest: fallback.crest,
    };
  });
}

export async function listLocations(db: Queryable) {
  const rows = await db.query<ReserveLocation>(
    "SELECT id,name,short_name,city,region,timezone,enabled,booking_enabled,COALESCE(address,'') AS address,status FROM reserve_locations ORDER BY enabled DESC,short_name",
  );
  return withPresentation(rows);
}

export async function bookingLocation(
  db: Queryable,
  id = primaryLocation.id,
  lock = false,
) {
  const [location] = await db.query<ReserveLocation>(
    `SELECT id,name,short_name,city,region,timezone,enabled,booking_enabled,COALESCE(address,'') AS address,status FROM reserve_locations WHERE id=$1 ${lock ? "FOR SHARE" : ""}`,
    [id],
  );
  if (!location || !location.enabled || !location.booking_enabled)
    throw new Error("This location is not accepting appointments.");
  return withPresentation([location])[0];
}
