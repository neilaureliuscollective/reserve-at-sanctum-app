import { configured, database } from "@/lib/db";
import { failure } from "@/lib/http";
import { listLocations, locations } from "@/lib/experience/locations";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = configured()
      ? await listLocations(await database())
      : [...locations];
    return Response.json({
      locations: rows.map((location) => ({
        id: location.id,
        name: location.name,
        short_name: location.short_name,
        city: location.city,
        region: location.region,
        timezone: location.timezone,
        enabled: location.enabled,
        booking_enabled: location.booking_enabled,
        address: location.address,
        status: location.status,
        label: `Legacy Reserve — ${location.short_name}`,
      })),
    });
  } catch (error) {
    return failure(error);
  }
}
