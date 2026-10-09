import { redirect } from "next/navigation";
import { publicUser } from "@/lib/auth";
export const dynamic = "force-dynamic";
export default async function Launch() {
  const actor = await publicUser();
  redirect(actor?.provider_id === "katie" && actor.role !== "client" ? "/studio/today" : "/fix-it-shop/app");
}
