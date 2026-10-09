import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Visits } from "@/components/visits";
import { isPreview } from "@/lib/db";
import { fixItBooking as brand } from "@/lib/fix-it-booking";
export const dynamic = "force-dynamic";
export const metadata = { title: "My appointments" };
export default async function Page() {
  const actor = await currentUser();
  if (!actor)
    redirect(brand.signin + "?next=" + encodeURIComponent(brand.visits));
  return (
    <main id="main" className="fix-it-content">
      <Visits actor={actor} preview={isPreview()} identity={brand} />
    </main>
  );
}
