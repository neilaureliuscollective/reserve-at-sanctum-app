import { TaskEnvironment } from "@/components/experience/task-environment";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { currentUser } from "@/lib/auth";
import { SanctumMirror } from "@/components/sanctum-mirror";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "The Mirror",
  description: "Create your private Legacy Reserve Grooming Blueprint before your visit.",
};

export default async function Page() {
  const actor = await currentUser();
  return (
    <main id="main" className="mirror-page task-world task-world--mirror">
      <TaskEnvironment world="mirror" />
      <Link href="/founder/legacy-reserve" className="mirror-back"><ArrowLeft size={15} /> LEGACY RESERVE</Link>
      <SanctumMirror user={actor ? {id: actor.id} : null} />
    </main>
  );
}
