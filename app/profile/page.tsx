import { AccountEntrance } from "@/components/experience/account-entrance";
import { currentUser } from "@/lib/auth";
import { MySanctum } from "@/components/my-sanctum";
export const dynamic = "force-dynamic";
export const metadata = { title: "Your profile" };
export default async function Profile() {
  const actor = await currentUser();
  if (!actor) return <AccountEntrance next="/profile" />;
  return (
    <main id="main" className="my-sanctum-page">
      <MySanctum userId={actor.id} name={actor.name.split(" ·")[0]} />
    </main>
  );
}
