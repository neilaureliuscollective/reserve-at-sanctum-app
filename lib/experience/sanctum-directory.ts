import type { Queryable } from "../db";
import { catalog } from "../booking";
import { listLocations } from "./locations";

export type SanctumService = { id: string; name: string; description: string; minutes: number; price: number };
export type SanctumProfessional = { id: string; name: string; services: SanctumService[] };
export async function sanctumDirectory(db: Queryable) {
  const locations = (await listLocations(db)).filter(location => location.id === "eunice" || (location.enabled && location.status === "operating"));
  return Promise.all(locations.map(async location => {
    const services = await catalog(db, location.id);
    const professionals: SanctumProfessional[] = [];
    for (const service of services) {
      let professional = professionals.find(person => person.id === service.provider_id);
      if (!professional) {
        professional = { id: service.provider_id, name: service.provider_name || "Reserve professional", services: [] };
        professionals.push(professional);
      }
      // Explicit public projection: no internal provider settings or private notes.
      professional.services.push({ id: service.id, name: service.name, description: service.description, minutes: service.minutes, price: service.price });
    }
    return { ...location, professionals };
  }));
}
export type SanctumDestination = Awaited<ReturnType<typeof sanctumDirectory>>[number];
