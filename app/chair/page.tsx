import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { currentUser, hasSupabase } from "@/lib/auth";
import { isPreview } from "@/lib/db";
import { ChairExperience } from "@/components/chair-experience";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "The Chair",
  description:
    "Your cut. Your headspace. Your time. A personal check-in for Katie’s men’s cosmetology at The Reserve.",
};
export default async function Page() {
  const actor = await currentUser();
  return (
    <main id="main" className="chair-page">
      <Link href="/fix-it-shop" className="chair-back">
        <ArrowLeft size={16} /> BACK TO KATIE
      </Link>
      <ChairExperience
        user={actor ? { id: actor.id, name: actor.name } : null}
        preview={isPreview()}
        hosted={hasSupabase()}
      />
    </main>
  );
}
