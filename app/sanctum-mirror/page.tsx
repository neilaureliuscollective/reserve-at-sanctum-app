import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { isPreview } from "@/lib/db";
import { SanctumMirror } from "@/components/sanctum-mirror";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "The Sanctum Mirror",
  description: "Create a guided Reserve grooming intake and a starting Blueprint before your consultation.",
};

export default function Page() {
  return (
    <main id="main" className="mirror-page">
      <Link href="/gent-ascend" className="mirror-back"><ArrowLeft size={15} /> NEIL · GENT ASCEND COLLECTIVE</Link>
      <SanctumMirror preview={isPreview()} />
    </main>
  );
}
