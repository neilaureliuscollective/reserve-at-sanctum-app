import { redirect } from "next/navigation";
import { publicUser } from "@/lib/auth";
export const dynamic = "force-dynamic";
export default async function Page() {
 const actor = await publicUser();
 redirect(actor?.role === "client" ? "/aethelios" : "/discover/aethelios");
}
