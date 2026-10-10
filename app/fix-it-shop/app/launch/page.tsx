import { redirect } from "next/navigation";
import { publicUser } from "@/lib/auth";
import { entryDestination } from "@/lib/experience/entry";
export const dynamic = "force-dynamic";
export default async function Launch() { redirect(entryDestination(await publicUser())); }
