import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { MySanctum } from "@/components/my-sanctum";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your Reserve account" };

export default async function Page() {
  const actor = await currentUser();
  if (!actor) redirect("/signin?next=/my-sanctum");
  return <main id="main" className="my-sanctum-page"><MySanctum name={actor.name.split(" ·")[0]} /></main>;
}
