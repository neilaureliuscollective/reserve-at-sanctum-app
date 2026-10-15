import { database } from "@/lib/db";
import { businessEntrance } from "@/lib/business-workspace";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { entryDestination } from "@/lib/experience/entry";
export const dynamic = "force-dynamic";
export default async function Launch() { const actor = await currentUser(); redirect((actor && await businessEntrance(await database(),actor)) || entryDestination(actor)); }
